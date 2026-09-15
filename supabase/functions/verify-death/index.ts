import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Auth: getUser via Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { packet_id } = body;
    if (!packet_id) {
      return new Response(JSON.stringify({ error: "packet_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Load packets row
    const { data: packet, error: pErr } = await admin
      .from("packets")
      .select("id, user_id, title, nominees")
      .eq("id", packet_id)
      .single();

    if (pErr || !packet) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Authorize: user.email must equal owner's user_profiles.email,
    //    OR user.email must match a trusted_nominees row with
    //    status='ACCEPTED' AND user_id=packet.user_id. Else 403.
    const { data: ownerProfile } = await admin
      .from("user_profiles")
      .select("email")
      .eq("id", packet.user_id)
      .maybeSingle();

    const ownerEmail = ownerProfile?.email;

    if (user.email !== ownerEmail) {
      const { data: trustedCheck } = await admin
        .from("trusted_nominees")
        .select("id")
        .eq("user_id", packet.user_id)
        .eq("email", user.email)
        .eq("status", "ACCEPTED")
        .maybeSingle();

      if (!trustedCheck) {
        return new Response(JSON.stringify({ error: "Forbidden: not authorized to verify death for this packet" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 4. Insert web_emergency_requests with status='death_verified'
    const { data: request, error: rErr } = await admin
      .from("web_emergency_requests")
      .insert({
        packet_id: packet_id,
        requester_email: user.email,
        status: "death_verified",
        release_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (rErr || !request) {
      console.error("[verify-death] insert failed:", rErr);
      return new Response(JSON.stringify({ error: rErr?.message || "Failed to create request" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. For each nominee in packet.nominees JSONB
    let nominees = packet.nominees;
    if (typeof nominees === "string") {
      try { nominees = JSON.parse(nominees); } catch { nominees = []; }
    }
    if (!Array.isArray(nominees)) nominees = [];

    let notifiedCount = 0;

    for (const n of nominees) {
      const email = typeof n === "string" ? n : n?.email;
      if (!email) continue;

      // raw = crypto.randomUUID() sans dashes + crypto.randomUUID() sans dashes
      const raw = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

      // hash = SHA-256 hex of raw
      const hashBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(raw)
      );
      const tokenHash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      // INSERT nominee_claim_tokens
      const { error: claimErr } = await admin
        .from("nominee_claim_tokens")
        .insert({
          request_id: request.id,
          email: email.toLowerCase(),
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (claimErr) {
        console.error("[verify-death] claim token insert failed:", claimErr);
        continue;
      }

      // INSERT web_notifications
      const { error: notifErr } = await admin.from("web_notifications").insert({
        user_email: email.toLowerCase(),
        title: "Data release authorized",
        message: "You can now claim your data.",
        link: `/nominee/claim?token=${raw}`,
      });

      if (notifErr) {
        console.error("[verify-death] notification insert failed:", notifErr);
      }

      // sendEmail
      const webBaseUrl = Deno.env.get("WEB_BASE_URL") ?? "";
      const downloadUrl = `${webBaseUrl}/nominee/claim?token=${raw}`;

      try {
        await sendEmail(
          email,
          "Take your data",
          `
            <h2>Data Release Authorized</h2>
            <p>The owner of "${packet.title}" has verified their passing.</p>
            <p>You can now claim your data using the link below.</p>
            <p><a href="${downloadUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Claim Your Data</a></p>
            <p>This link will remain valid until it is used or until it expires.</p>
          `
        );
        notifiedCount++;
      } catch (emailErr) {
        console.error("[verify-death] email send failed:", emailErr);
      }
    }

    // 6. return { ok: true, notified: N }
    return new Response(JSON.stringify({ ok: true, notified: notifiedCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[verify-death] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
