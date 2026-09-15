import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Parse body
    const body = await req.json();
    const { token } = body;
    if (!token || typeof token !== "string" || token.trim() === "") {
      return new Response(JSON.stringify({ error: "Missing or invalid required field: token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. hash = SHA-256 hex of token
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token.trim())
    );
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 3. SELECT nominee_claim_tokens WHERE token_hash=hash AND used=false AND expires_at > now()
    const { data: claim, error: claimErr } = await admin
      .from("nominee_claim_tokens")
      .select("id, request_id, email, token_hash, expires_at, used")
      .eq("token_hash", hash)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (claimErr || !claim) {
      return new Response(JSON.stringify({ error: "invalid or expired" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. UPDATE used=true
    await admin.from("nominee_claim_tokens").update({ used: true }).eq("id", claim.id);

    // 5. Load web_emergency_requests row by request_id
    const { data: request } = await admin
      .from("web_emergency_requests")
      .select("id, packet_id, status")
      .eq("id", claim.request_id)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Load packets row { title, files, nominees }
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

    // 7. Sign each file (same logic as get-download-url): 6h TTL each
    let files = packet.files;
    if (typeof files === "string") {
      try { files = JSON.parse(files); } catch { files = []; }
    }
    if (!Array.isArray(files)) files = [];

    const signedUrls = [];
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

    return new Response(JSON.stringify({
      success: true,
      packet_title: packet.title,
      files: signedUrls,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[claim-nominee] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
