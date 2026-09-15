import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEB_BASE_URL =
  Deno.env.get("WEB_BASE_URL") ?? "https://the-final-transfer-main.pages.dev";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Auth the caller
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const packetId: string | undefined = body?.packet_id;
    if (!packetId) {
      return new Response(JSON.stringify({ error: "packet_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const callerEmail = user.email.toLowerCase();

    // 1. Load packet
    const { data: packet, error: packetErr } = await admin
      .from("packets")
      .select("id, user_id, title, category")
      .eq("id", packetId)
      .maybeSingle();

    if (packetErr || !packet) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Only emergency packets support emergency access
    if (packet.category !== "emergency") {
      return new Response(
        JSON.stringify({ error: "Not an emergency packet" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Caller must be an ACCEPTED trusted for this owner
    const { data: myTrust } = await admin
      .from("trusted_nominees")
      .select("id")
      .eq("user_id", packet.user_id)
      .eq("email", callerEmail)
      .eq("status", "ACCEPTED")
      .maybeSingle();

    if (!myTrust) {
      return new Response(
        JSON.stringify({ error: "Not an accepted trusted contact" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Refuse if there's already a pending/scheduled request for this packet
    const { data: existing } = await admin
      .from("web_emergency_requests")
      .select("id, status")
      .eq("packet_id", packet.id)
      .in("status", ["pending", "scheduled"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          request_id: existing.id,
          message: "A request is already in progress",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Create the request
    //    vote_deadline = now + 6h (the voting window)
    //    release_at stays null until all trusted vote yes
    const voteDeadline = new Date(
      Date.now() + 6 * 60 * 60 * 1000
    ).toISOString();

    const { data: request, error: reqErr } = await admin
      .from("web_emergency_requests")
      .insert({
        packet_id: packet.id,
        requester_email: callerEmail,
        status: "pending",
        vote_deadline: voteDeadline,
      })
      .select("id")
      .single();

    if (reqErr || !request) {
      console.error("[request-emergency] insert:", reqErr);
      return new Response(
        JSON.stringify({ error: reqErr?.message || "Failed to create request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Get all ACCEPTED trusted for this owner (except the requester)
    const { data: allTrusted } = await admin
      .from("trusted_nominees")
      .select("email")
      .eq("user_id", packet.user_id)
      .eq("status", "ACCEPTED");

    const recipients = (allTrusted ?? [])
      .map((t: any) => t.email?.toLowerCase())
      .filter((e: string | undefined): e is string => !!e && e !== callerEmail);

    const voteLink = `${WEB_BASE_URL}/trusted/vote?requestId=${request.id}`;

    // 7. Notify each voter — in-app + email
    for (const trustedEmail of recipients) {
      await admin.from("web_notifications").insert({
        user_email: trustedEmail,
        title: "Emergency vote requested",
        message: `${callerEmail} requested emergency access to "${packet.title}". Please review and vote.`,
        link: `/trusted/vote?requestId=${request.id}`,
      });

      try {
        await sendTemplatedEmail(
          trustedEmail,
          "Emergency vote requested — The Final Transfer",
          {
            title: "Emergency Vote Requested",
            preheader: `${callerEmail} requested emergency access to "${packet.title}".`,
            body: `
              <p><strong>${callerEmail}</strong> has requested emergency access to the packet <strong>${packet.title}</strong>.</p>
              <p>As a Trusted Person, please review and cast your vote. If all Trusted Persons approve, the packet will be released to the nominee after a short window.</p>
            `,
            primaryCta: {
              label: "Vote Now",
              url: voteLink,
            },
            footnote:
              "If the vote is not completed before the deadline, the request will expire.",
            privacyNote:
              "Your vote is only visible in aggregate — individual votes are not disclosed to other Trusted Persons.",
          }
        );
      } catch (emailErr) {
        console.error(
          "[request-emergency] email failed for",
          trustedEmail,
          emailErr
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id: request.id,
        notified: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[request-emergency] fatal:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});