import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

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

    const body = await req.json().catch(() => ({}));
    const claimId: string | undefined = body?.claim_id;
    const reason: string | undefined = body?.reason;

    if (!claimId) {
      return new Response(JSON.stringify({ error: "claim_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: claim } = await admin
      .from("death_claims")
      .select("id, packet_id, submitted_by_email, status")
      .eq("id", claimId)
      .maybeSingle();
    if (!claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claim.status !== "rejected") {
      return new Response(
        JSON.stringify({ error: `Claim is not rejected (status=${claim.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const submitter = claim.submitted_by_email?.toLowerCase();
    if (submitter) {
      await admin.from("web_notifications").insert({
        user_email: submitter,
        title: "Claim review result",
        message: `Your claim could not be approved at this time.${reason ? ` Reason: ${reason}` : ""}`,
        link: null,
      });

      try {
        await sendTemplatedEmail(
  submitter,
  "Claim review result — The Final Transfer",
  {
    title: "Claim Review Result",
    preheader: "Your submission could not be approved.",
    body: `
      <p>After reviewing the documentation you submitted, our team was unable to approve this claim at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>If you believe this is in error, you may reply with additional documentation.</p>
    `,
    privacyNote:
      "This notice is informational only. No further action is required unless you wish to appeal.",
  }
);
      } catch (e) {
        console.error("[reject-death-claim] email failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[reject-death-claim] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});