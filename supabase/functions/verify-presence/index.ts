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
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ownerEmail: string | undefined = body?.owner_email;
    if (!ownerEmail) {
      return new Response(JSON.stringify({ error: "owner_email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const callerEmail = user.email.toLowerCase();

    // Owner must exist
    const { data: ownerProf } = await admin
      .from("user_profiles")
      .select("id, email")
      .ilike("email", ownerEmail)
      .maybeSingle();
    if (!ownerProf?.id) {
      return new Response(JSON.stringify({ error: "Owner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller must be ACCEPTED trusted for that owner
    const { data: trust } = await admin
      .from("trusted_nominees")
      .select("id")
      .eq("user_id", ownerProf.id)
      .eq("email", callerEmail)
      .eq("status", "ACCEPTED")
      .maybeSingle();
    if (!trust) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify the owner (in-app only — no email here)
    await admin.from("web_notifications").insert({
      user_email: ownerProf.email?.toLowerCase() ?? ownerEmail.toLowerCase(),
      title: "Presence verified",
      message: `${callerEmail} confirmed you are active and well.`,
      link: null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[verify-presence] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});