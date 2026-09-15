import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const packetId = body.packet_id;
    if (!packetId) {
      return new Response(JSON.stringify({ error: "packet_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch packet
    const { data: packet, error: pErr } = await admin
      .from("packets")
      .select("id, user_id, title, category")
      .eq("id", packetId)
      .single();

    if (pErr || !packet) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify user is trusted for this packet's owner
    const { data: trustedRow, error: tErr } = await admin
      .from("trusted_nominees")
      .select("id")
      .eq("user_id", packet.user_id)
      .eq("email", user.email)
      .maybeSingle();

    if (tErr || !trustedRow) {
      return new Response(JSON.stringify({ error: "You are not a trusted member for this packet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Create emergency request
    const voteDeadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const { data: request, error: rErr } = await admin
      .from("web_emergency_requests")
      .insert({
        packet_id: packetId,
        requester_email: user.email,
        status: "pending",
        vote_deadline: voteDeadline,
      })
      .select()
      .single();

    if (rErr || !request) {
      console.error("[request-emergency] insert failed:", rErr);
      return new Response(JSON.stringify({ error: rErr?.message || "Failed to create request" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Notify all trusted members (except requester)
    const { data: allTrusted } = await admin
      .from("trusted_nominees")
      .select("email, full_name")
      .eq("user_id", packet.user_id);

const voteUrl = `https://the-final-transfer-main.pages.dev/trusted/vote?requestId=${request.id}`;
    for (const member of (allTrusted || [])) {
      if (!member.email || member.email === user.email) continue;

      // In-app notification
      await admin.from("web_notifications").insert({
        user_email: member.email,
        title: "Emergency Access Requested",
        message: `${user.email} requested emergency access to "${packet.title}". Vote required.`,
        link: `/trusted/vote?requestId=${request.id}`,
      });

      // Email
     await sendTemplatedEmail(
  trustedEmail,
  "Emergency vote requested — The Final Transfer",
  {
    title: "Emergency Vote Requested",
    preheader: `${requesterEmail} requested emergency access to "${packet.title}".`,
    body: `
      <p><strong>${requesterEmail}</strong> has requested emergency access to the packet <strong>${packet.title}</strong>.</p>
      <p>As a Trusted Person, please review and cast your vote. If all Trusted Persons approve, the packet will be released to the nominee after a 6-hour window.</p>
    `,
    primaryCta: {
      label: "Vote Now",
      url: `${WEB_BASE_URL}/trusted/vote?requestId=${request.id}`,
    },
    footnote:
      "If you do not vote within the allowed window, the request will expire.",
    privacyNote:
      "Your vote is only visible in aggregate — individual votes are not disclosed to other Trusted Persons.",
  }
);
    }

    return new Response(JSON.stringify({ success: true, request_id: request.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[request-emergency] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});