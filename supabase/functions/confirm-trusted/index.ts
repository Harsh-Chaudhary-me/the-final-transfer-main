import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Validate required fields
    if (!token || typeof token !== "string" || token.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required field: token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!action || typeof action !== "string" || !["status", "accept", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required field: action (must be 'status' | 'accept' | 'reject')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the raw token using SHA-256
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

    // Check if invitation has expired
    if (row.invitation_expires_at) {
      const expiresAt = new Date(row.invitation_expires_at);
      const now = new Date();
      if (expiresAt < now) {
        return new Response(
          JSON.stringify({ status: "EXPIRED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ACTION: status - only read, never transition
    if (action === "status") {
      const { data: owner } = await adminClient.from("user_profiles")
        .select("email")
        .eq("id", row.user_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          status: row.status,
          owner_email: owner?.email ?? null,
          trusted_email: row.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: accept
    if (action === "accept") {
      // Idempotent: already accepted
      if (row.status === "ACCEPTED") {
        return new Response(
          JSON.stringify({ status: "ACCEPTED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only transition from PENDING
      if (row.status !== "PENDING") {
        return new Response(
          JSON.stringify({ status: row.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update status to ACCEPTED
      const { error: updateErr } = await adminClient
        .from("trusted_nominees")
        .update({ status: "ACCEPTED", accepted_at: "now()", updated_at: "now()" })
        .eq("id", row.id);

      if (updateErr) {
        console.error("[confirm-trusted] Update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to update trusted nominee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch owner email
      const { data: owner } = await adminClient.from("user_profiles")
        .select("email")
        .eq("id", row.user_id)
        .maybeSingle();

      // Insert notification for owner
      if (owner?.email) {
        const { error: notifErr } = await adminClient.from("web_notifications").insert({
          user_email: owner.email.toLowerCase(),
          title: "Trusted contact accepted",
          message: `${row.email} accepted your invitation.`,
          link: null,
        });

        if (notifErr) {
          console.warn("[confirm-trusted] Warning inserting notification:", notifErr);
        }
      }

      // Send email to owner (using shared email helper or direct fetch)
      if (owner?.email) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "TFT Project <onboarding@resend.dev>",
              to: [owner.email],
              subject: "Trusted contact accepted - The Final Transfer",
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
          } else {
            console.log("[confirm-trusted] Email sent to owner:", owner.email);
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

    // ACTION: reject
    if (action === "reject") {
      // Only transition from PENDING
      if (row.status !== "PENDING") {
        return new Response(
          JSON.stringify({ status: row.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update status to REJECTED
      const { error: updateErr } = await adminClient
        .from("trusted_nominees")
        .update({ status: "REJECTED", rejected_at: "now()", updated_at: "now()"})
        .eq("id", row.id);

      if (updateErr) {
        console.error("[confirm-trusted] Update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to update trusted nominee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Notify owner: "X declined to be your trusted contact."
      // Note: email notification is logged but not auto-sent to avoid
      // unintended consumption; the system records the rejection.
      console.log("[confirm-trusted] Trusted contact rejected by:", row.email);

      return new Response(
        JSON.stringify({ status: "REJECTED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Should not reach here, but safety net
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