import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplatedEmail } from "../_shared/email.ts";

console.log("[release-emergency] module loaded at", new Date().toISOString());

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
    console.log("[release-emergency] handler entered");

    // Optional cron-secret guard. If CRON_SECRET is set, require it.
    // If it's not set, allow the call (for manual testing from the dashboard).
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret) {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[release-emergency] rejected: bad/missing cron secret");
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // 1. Find all requests that are scheduled and due
    const { data: requests, error: rErr } = await admin
      .from("web_emergency_requests")
      .select("id, packet_id, status, release_at")
      .eq("status", "scheduled")
      .lte("release_at", now);

    if (rErr) {
      console.error("[release-emergency] select failed:", rErr);
      return new Response(JSON.stringify({ error: rErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!requests || requests.length === 0) {
      console.log("[release-emergency] nothing to release");
      return new Response(JSON.stringify({ success: true, released: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      "[release-emergency] found scheduled requests:",
      requests.length
    );

    let releasedCount = 0;

    for (const req of requests) {
      console.log("[release-emergency] processing request:", req.id);

      // 2. Load the packet with nominees
      const { data: packet, error: pErr } = await admin
        .from("packets")
        .select("id, title, nominees")
        .eq("id", req.packet_id)
        .maybeSingle();

      if (pErr || !packet) {
        console.error(
          "[release-emergency] packet not found for request",
          req.id,
          pErr
        );
        continue;
      }

      // 3. Flip request to released
      const { error: updErr } = await admin
        .from("web_emergency_requests")
        .update({ status: "released" })
        .eq("id", req.id)
        .eq("status", "scheduled"); // guard against double-fire

      if (updErr) {
        console.error(
          "[release-emergency] failed to update request",
          req.id,
          updErr
        );
        continue;
      }

      // 4. Parse nominees
      let nominees: any[] = packet.nominees ?? [];
      if (typeof nominees === "string") {
        try {
          nominees = JSON.parse(nominees);
        } catch {
          nominees = [];
        }
      }
      if (!Array.isArray(nominees)) nominees = [];

      const downloadLink = `${WEB_BASE_URL}/nominee/download?requestId=${req.id}`;

      // 5. Notify each nominee
      for (const n of nominees) {
        const email = typeof n === "string" ? n : n?.email;
        if (!email) continue;
        const emailLower = email.toLowerCase();

        // In-app notification
        await admin.from("web_notifications").insert({
          user_email: emailLower,
          title: "Data release authorized",
          message: `The emergency packet "${packet.title}" has been released. Your files are ready.`,
          link: `/nominee/download?requestId=${req.id}`,
        });

        // Email
        try {
          await sendTemplatedEmail(
            emailLower,
            "Emergency release authorized — The Final Transfer",
            {
              title: "Emergency Data Release",
              preheader: `Emergency access has been authorized for "${packet.title}".`,
              body: `
                <p>The Trusted Persons for <strong>${packet.title}</strong> have unanimously authorized emergency release of this packet.</p>
                <p>Your files are ready to download and remain available any time.</p>
              `,
              primaryCta: {
                label: "Open Download Page",
                url: downloadLink,
              },
              privacyNote:
                "If you were not expecting this, contact the packet owner or support.",
            }
          );
          console.log(
            "[release-emergency] notified nominee:",
            emailLower
          );
        } catch (emailErr: any) {
          console.error(
            "[release-emergency] nominee email failed for",
            emailLower,
            emailErr?.message
          );
        }
      }

      releasedCount++;
      console.log("[release-emergency] released request:", req.id);
    }

    console.log("[release-emergency] done. released:", releasedCount);

    return new Response(
      JSON.stringify({ success: true, released: releasedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[release-emergency] fatal:", err?.message);
    console.error("[release-emergency] fatal stack:", err?.stack);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});