import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEB_BASE_URL =
  Deno.env.get("WEB_BASE_URL") ?? "https://the-final-transfer-main.pages.dev";

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
    const decision: "approve" | "reject" | undefined = body?.decision;
    const reason: string | undefined = body?.reason;

    if (!claimId) {
      return new Response(JSON.stringify({ error: "claim_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (decision !== "approve" && decision !== "reject") {
      return new Response(JSON.stringify({ error: "decision must be 'approve' | 'reject'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: claim, error: claimErr } = await admin
      .from("death_claims")
      .select("*")
      .eq("id", claimId)
      .maybeSingle();

    if (claimErr || !claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    // ---------------- REJECT ----------------
    if (decision === "reject") {
      await admin
        .from("death_claims")
        .update({
          status: "rejected",
          admin_notes: reason ?? null,
          reviewed_at: nowIso,
        })
        .eq("id", claim.id);

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
          console.error("[review-death-claim] reject email failed", e);
        }
      }

      return new Response(JSON.stringify({ ok: true, decision: "rejected" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------------- APPROVE ----------------
    if (claim.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Claim is not pending (status=${claim.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: packet, error: pErr } = await admin
      .from("packets")
      .select("id, title, nominees")
      .eq("id", claim.packet_id)
      .maybeSingle();
    if (pErr || !packet) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("web_emergency_requests")
      .insert({
        packet_id: packet.id,
        requester_email: claim.submitted_by_email,
        status: "scheduled",
        release_at: nowIso,
        vote_deadline: nowIso,
      })
      .select("id")
      .single();

    if (reqErr || !reqRow) {
      console.error("[review-death-claim] insert request:", reqErr);
      return new Response(JSON.stringify({ error: reqErr?.message || "Failed to create request" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let nominees: any[] = packet.nominees ?? [];
    if (typeof nominees === "string") {
      try { nominees = JSON.parse(nominees); } catch { nominees = []; }
    }
    if (!Array.isArray(nominees)) nominees = [];

    let notified = 0;
    const downloadLink = `${WEB_BASE_URL}/nominee/download?requestId=${reqRow.id}`;

    for (const n of nominees) {
      const email = typeof n === "string" ? n : n?.email;
      if (!email) continue;
      const lower = email.toLowerCase();

      await admin.from("web_notifications").insert({
        user_email: lower,
        title: "Data release authorized",
        message: `The claim for "${packet.title}" has been verified. You can now access the packet.`,
        link: `/nominee/download?requestId=${reqRow.id}`,
      });

      try {
        await sendTemplatedEmail(lower, "Your data is ready — The Final Transfer", {
          title: "Your data is ready",
          preheader: "The claim has been verified.",
          body: `
            <p>The death claim for the owner of <strong>${packet.title}</strong> has been verified by our support team.</p>
            <p>You can access the packet at any time using the link below.</p>
          `,
          primaryCta: { label: "Open Download Page", url: downloadLink },
          privacyNote:
            "This link is unique to you. Do not forward it to anyone else.",
        });
        notified++;
      } catch (e) {
        console.error("[review-death-claim] approve email failed for", lower, e);
      }
    }

    await admin
      .from("death_claims")
      .update({
        status: "approved",
        reviewed_at: nowIso,
        released_at: nowIso,
        release_request_id: reqRow.id,
      })
      .eq("id", claim.id);

    return new Response(
      JSON.stringify({ ok: true, decision: "approved", request_id: reqRow.id, notified }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[review-death-claim] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});