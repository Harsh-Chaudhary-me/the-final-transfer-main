import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { requestId } = body;
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch request
    const { data: request } = await admin
      .from("web_emergency_requests")
      .select("id, packet_id, status, release_at")
      .eq("id", requestId)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "released") {
      return new Response(JSON.stringify({ error: "Not released yet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check 6-hour window
    const releaseTime = new Date(request.release_at).getTime();
    const now = Date.now();
    const windowEnd = releaseTime + 6 * 60 * 60 * 1000;
    if (now > windowEnd) {
      return new Response(JSON.stringify({ error: "Download window expired" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch packet with files
    const { data: packet } = await admin
      .from("packets")
      .select("id, title, files, nominees")
      .eq("id", request.packet_id)
      .single();

    if (!packet) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify user is nominee
    let nominees = packet.nominees;
    if (typeof nominees === "string") {
      try { nominees = JSON.parse(nominees); } catch { nominees = []; }
    }
    if (!Array.isArray(nominees)) nominees = [];

    const isNominee = nominees.some((n: any) => {
      const e = typeof n === "string" ? n : (n?.email || "");
      return String(e).toLowerCase() === user.email.toLowerCase();
    });

    if (!isNominee) {
      return new Response(JSON.stringify({ error: "Not a nominee for this packet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Parse files
    let files = packet.files;
    if (typeof files === "string") {
      try { files = JSON.parse(files); } catch { files = []; }
    }
    if (!Array.isArray(files)) files = [];

    // 6. Generate signed URLs (6-hour expiry)
    const signedUrls: any[] = [];
    for (const f of files) {
      const path = typeof f === "string" ? f : (f?.path || f?.name);
      if (!path) continue;

      const { data: signed } = await admin.storage
        .from("packets")
        .createSignedUrl(path, 21600); // 6 hours

      if (signed?.signedUrl) {
        signedUrls.push({
          name: typeof f === "object" ? (f.name || path) : path,
          url: signed.signedUrl,
        });
      }
    }

    const expiresAt = new Date(windowEnd).toISOString();

    return new Response(JSON.stringify({
      success: true,
      packet_title: packet.title,
      files: signedUrls,
      expires_at: expiresAt,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[get-download-url] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});