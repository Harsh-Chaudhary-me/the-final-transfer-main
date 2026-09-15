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
    const authHeader = req.headers.get("Authorization") ?? "";
    const adminKey = Deno.env.get("ADMIN_API_KEY") ?? "";
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: claims, error: claimsErr } = await admin
      .from("death_claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (claimsErr) {
      console.error("[list-death-claims] select:", claimsErr);
      return new Response(JSON.stringify({ error: claimsErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each claim, mint a short-lived signed URL to its certificate
    const enriched = await Promise.all(
      (claims ?? []).map(async (c) => {
        let certificate_signed_url: string | null = null;
        if (c.certificate_url) {
          const { data: signed } = await admin.storage
            .from("death-certificates")
            .createSignedUrl(c.certificate_url, 3600); // 1 hour
          certificate_signed_url = signed?.signedUrl ?? null;
        }
        return { ...c, certificate_signed_url };
      })
    );

    return new Response(JSON.stringify({ claims: enriched }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[list-death-claims] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});