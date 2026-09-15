import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? "TFT Project <onboarding@resend.dev>";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let body: { token?: string; action?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, action } = body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required field: token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!action || !["status", "accept", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'status' | 'accept' | 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the raw token
    let hash: string;
    try {
      const hashBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token.trim())
      );
      hash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (err) {
      console.error("[confirm-trusted] Hashing error:", err);
      return new Response(
        JSON.stringify({ error: "Internal hashing error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Query trusted_nominees by hashed token
    const { data: row, error: nomineeErr } = await adminClient
      .from("trusted_nominees")
      .select("id, user_id, email, full_name, status, invitation_expires_at")
      .eq("invitation_token_hash", hash)
      .maybeSingle();

    if (nomineeErr || !row) {
      return new Response(
        JSON.stringify({ status: "INVALID" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Expired?
    if (row.invitation_expires_at) {
      if (new Date(row.invitation_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ status: "EXPIRED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Load owner email once
    const { data: owner } = await adminClient
      .from("user_profiles")
      .select("email")
      .eq("id", row.user_id)
      .maybeSingle();
    const ownerEmail = owner?.email?.toLowerCase() ?? null;

    // ---------- ACTION: status (never transitions) ----------
    if (action === "status") {
      return new Response(
        JSON.stringify({
          status: row.status,
          owner_email: ownerEmail,
          trusted_email: row.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------- ACTION: accept ----------
    if (action === "accept") {
      if (row.status === "ACCEPTED") {
        return new Response(
          JSON.stringify({ status: "ACCEPTED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (row.status !== "PENDING") {
        return new Response(
          JSON.stringify({ status: row.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nowIso = new Date().toISOString();
      const { error: updateErr } = await adminClient
        .from("trusted_nominees")
        .update({ status: "ACCEPTED", accepted_at: nowIso, updated_at: nowIso })
        .eq("id", row.id)
        .eq("status", "PENDING");

      if (updateErr) {
        console.error("[confirm-trusted] Update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to update trusted nominee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (ownerEmail) {
        await adminClient.from("web_notifications").insert({
          user_email: ownerEmail,
          title: "Trusted contact accepted",
          message: `${row.email} accepted your invitation.`,
          link: null,
        });

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: EMAIL_FROM,
              to: [ownerEmail],
              subject: "Trusted contact accepted — The Final Transfer",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff;">
                  <h2 style="color: #FF8C00; margin-top: 0;">Trusted Contact Accepted</h2>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                    <strong>${row.email}</strong> has accepted your invitation to be a trusted contact on <strong>The Final Transfer</strong>.
                  </p>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                    They will now be able to assist in verification procedures when requested.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #888888; text-align: center;">
                    &copy; 2026 The Final Transfer &bull; Secure Digital Legacy Management
                  </p>
                </div>
              `,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error("[confirm-trusted] Email send failed:", errText);
          }
        } catch (emailErr) {
          console.error("[confirm-trusted] Email exception:", emailErr);
        }
      }

      return new Response(
        JSON.stringify({ status: "ACCEPTED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------- ACTION: reject ----------
    if (action === "reject") {
      if (row.status !== "PENDING") {
        return new Response(
          JSON.stringify({ status: row.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nowIso = new Date().toISOString();
      const { error: updateErr } = await adminClient
        .from("trusted_nominees")
        .update({ status: "REJECTED", rejected_at: nowIso, updated_at: nowIso })
        .eq("id", row.id)
        .eq("status", "PENDING");

      if (updateErr) {
        console.error("[confirm-trusted] Update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to update trusted nominee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Notify owner
      if (ownerEmail) {
        await adminClient.from("web_notifications").insert({
          user_email: ownerEmail,
          title: "Trusted contact declined",
          message: `${row.email} declined to be your trusted contact.`,
          link: null,
        });
      }

      return new Response(
        JSON.stringify({ status: "REJECTED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action specified" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[confirm-trusted] Server error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});