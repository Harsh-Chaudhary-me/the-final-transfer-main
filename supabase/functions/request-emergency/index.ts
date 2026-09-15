import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplatedEmail } from "../_shared/email.ts";

console.log("[request-emergency] module loaded at", new Date().toISOString());

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
    console.log("[request-emergency] handler entered");

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

    const { data: packet, error: packetErr } = await admin
      .from("packets")
      .select("id, user_id, title, category")
      .eq("id", packetId)
      .maybeSingle();

    if (packetErr || !packet) {
      console.log("[request-emergency] packet not found:", packetId, packetErr);
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (packet.category !== "emergency") {
      return new Response(
        JSON.stringify({ error: "Not an emergency packet" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: myTrust } = await admin
      .from("trusted_nominees")
      .select("id")
      .eq("user_id", packet.user_id)
      .eq("email", callerEmail)
      .eq("status", "ACCEPTED")
      .maybeSingle();

    if (!myTrust) {
      console.log("[request-emergency] not an accepted trusted:", callerEmail);
      return new Response(
        JSON.stringify({ error: "Not an accepted trusted contact" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existing } = await admin
      .from("web_emergency_requests")
      .select("id, status")
      .eq("packet_id", packet.id)
      .in("status", ["pending", "scheduled"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(
        "[request-emergency] existing request in progress:",
        existing.id
      );
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
      console.error("[request-emergency] insert failed:", reqErr);
      return new Response(
        JSON.stringify({ error: reqErr?.message || "Failed to create request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[request-emergency] created request:", request.id);

    const { data: allTrusted } = await admin
      .from("trusted_nominees")
      .select("email, status")
      .eq("user_id", packet.user_id)
      .eq("status", "ACCEPTED");

    console.log(
      "[request-emergency] allTrusted raw:",
      JSON.stringify(allTrusted)
    );

    const recipients = (allTrusted ?? [])
      .map((t: any) => t.email?.toLowerCase())
      .filter(
        (e: string | undefined): e is string => !!e && e !== callerEmail
      );

    console.log(
      "[request-emergency] computed recipients:",
      JSON.stringify(recipients),
      "caller:",
      callerEmail
    );

    const voteLink = `${WEB_BASE_URL}/trusted/vote?requestId=${request.id}`;

    for (const trustedEmail of recipients) {
      console.log(
        "[request-emergency] attempting send to:",
        trustedEmail
      );

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

        console.log(
          "[request-emergency] send succeeded for:",
          trustedEmail
        );
      } catch (emailErr: any) {
        console.error(
          "[request-emergency] send FAILED for:",
          trustedEmail
        );
        console.error(
          "[request-emergency] error message:",
          emailErr?.message
        );
        console.error(
          "[request-emergency] error stack:",
          emailErr?.stack
        );
        console.error(
          "[request-emergency] full error:",
          String(emailErr)
        );
      }
    }

    console.log(
      "[request-emergency] done. notified:",
      recipients.length
    );

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
    console.error("[request-emergency] fatal:", err?.message);
    console.error("[request-emergency] fatal stack:", err?.stack);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});