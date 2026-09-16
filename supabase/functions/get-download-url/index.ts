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
    const { data: request, error: reqErr } = await admin
      .from("web_emergency_requests")
      .select("id, packet_id, status, release_at")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr) {
      console.error("[get-download-url] request query error:", reqErr);
      return new Response(
        JSON.stringify({ error: `Request query failed: ${reqErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Release gate — released always; scheduled only if release_at <= now
    const now = Date.now();
    const releaseTime = request.release_at ? new Date(request.release_at).getTime() : null;

    const isReleased = request.status === "released";
    const isScheduledAndDue =
      request.status === "scheduled" && releaseTime !== null && releaseTime <= now;

    if (!isReleased && !isScheduledAndDue) {
      return new Response(JSON.stringify({ error: "Not released yet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch packet from the DATABASE (not the storage bucket)
    const { data: packet, error: packetErr } = await admin
      .from("packets")
      .select("id, title, files, nominees, user_id")
      .eq("id", request.packet_id)
      .maybeSingle();

    console.log("[get-download-url] packet lookup:", {
      packetId: request.packet_id,
      found: !!packet,
      error: packetErr?.message,
    });

    if (packetErr) {
      console.error("[get-download-url] packet query error:", packetErr);
      return new Response(
        JSON.stringify({ error: `Packet query failed: ${packetErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("[get-download-url] files to sign:", JSON.stringify(files));

    // 6. Sign each file from the correct bucket
    const signedUrls: any[] = [];
    for (const f of files) {
      let path: string | null = null;

      if (typeof f === "string") {
        path = f;
      } else if (f?.path && typeof f.path === "string") {
        path = f.path;
      } else if (f?.name) {
        // Construct full path if only the filename is present
        path = `${packet.user_id}/${packet.id}/${f.name}`;
      }

      if (!path) continue;

      console.log("[get-download-url] signing path:", path);

      const { data: signed, error: signErr } = await admin.storage
        .from("user-files")
        .createSignedUrl(path, 21600);

      if (signErr) {
        console.error("[get-download-url] sign error for", path, signErr);
        continue;
      }

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
    console.error("[get-download-url] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});