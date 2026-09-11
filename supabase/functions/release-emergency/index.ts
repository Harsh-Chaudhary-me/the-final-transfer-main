import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // 1. Find scheduled requests ready for release
    const { data: requests, error: rErr } = await admin
      .from("web_emergency_requests")
      .select("id, packet_id")
      .eq("status", "scheduled")
      .lte("release_at", now);

    if (rErr) throw rErr;
    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ success: true, released: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let releasedCount = 0;

    for (const req of requests) {
      // 2. Fetch packet with nominees
      const { data: packet } = await admin
        .from("packets")
        .select("id, title, nominees, user_id")
        .eq("id", req.packet_id)
        .single();

      if (!packet) continue;

      // 3. Update request status
      await admin.from("web_emergency_requests")
        .update({ status: "released" })
        .eq("id", req.id);

      // 4. Notify nominees
      let nominees = packet.nominees;
      if (typeof nominees === "string") {
        try { nominees = JSON.parse(nominees); } catch { nominees = []; }
      }
      if (!Array.isArray(nominees)) nominees = [];

      const downloadUrl = `http://localhost:5173/nominee/download?requestId=${req.id}`;

      for (const n of nominees) {
        const email = typeof n === "string" ? n : n?.email;
        if (!email) continue;

        await admin.from("web_notifications").insert({
          user_email: email,
          title: "Emergency Data Released",
          message: `The emergency packet "${packet.title}" has been released. You have 6 hours to download.`,
          link: `/nominee/download?requestId=${req.id}`,
        });

        await sendEmail(
          email,
          `[URGENT] Emergency Packet Released: ${packet.title}`,
          `
            <h2>Emergency Data Released</h2>
            <p>The emergency packet <strong>${packet.title}</strong> has been released to you.</p>
            <p><strong>You have 6 hours to download the files.</strong></p>
            <p><a href="${downloadUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Download Now</a></p>
          `
        );
      }

      releasedCount++;
    }

    return new Response(JSON.stringify({ success: true, released: releasedCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[release-emergency] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});