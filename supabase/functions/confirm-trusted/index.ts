import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

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
    let body: { token?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token } = body;
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing required field: token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Token is trusted_nominees.id
    const { data: nominee, error: nomineeErr } = await adminClient
      .from("trusted_nominees")
      .select("*")
      .eq("id", token)
      .maybeSingle();

    if (nomineeErr || !nominee) {
      console.error("[confirm-trusted] Error finding trusted nominee:", nomineeErr);
      return new Response(
        JSON.stringify({ error: "Invalid token or trusted nominee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerId = nominee.owner_id || nominee.user_id;
    const nomineeName = nominee.name || nominee.email || "A trusted contact";
    const nomineeEmail = nominee.email || "";

    if (!ownerId) {
      return new Response(
        JSON.stringify({ error: "Owner ID not associated with this record" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Insert notification into web_notifications for the owner
    const { error: notifErr } = await adminClient.from("web_notifications").insert([
      {
        user_id: ownerId,
        title: "Trusted Contact Confirmed",
        message: `${nomineeName} (${nomineeEmail}) has confirmed their status as your trusted contact.`,
        type: "trusted_confirmation",
        created_at: new Date().toISOString(),
      },
    ]);

    if (notifErr) {
      console.warn("[confirm-trusted] Warning inserting notification:", notifErr);
    }

    // 2. Fetch owner's email & send email via shared email helper
    let ownerEmail: string | null = nominee.owner_email || null;

    if (!ownerEmail) {
      try {
        const { data: ownerUser } = await adminClient.auth.admin.getUserById(ownerId);
        if (ownerUser?.user?.email) {
          ownerEmail = ownerUser.user.email;
        }
      } catch (err) {
        console.warn("[confirm-trusted] Could not fetch owner email from auth.admin:", err);
      }
    }

    if (ownerEmail) {
      const subject = "Trusted Contact Confirmed - The Final Transfer";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #FF8C00; margin-top: 0;">Trusted Contact Confirmation</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.5;">Hello,</p>
          <p style="color: #333333; font-size: 16px; line-height: 1.5;">
            <strong>${nomineeName}</strong> (${nomineeEmail}) has successfully confirmed their status as a trusted contact for your account on <strong>The Final Transfer</strong>.
          </p>
          <p style="color: #666666; font-size: 14px; line-height: 1.5;">
            No further action is required. They will now be able to assist in verification procedures when requested.
          </p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #888888; text-align: center;">
            &copy; 2026 The Final Transfer &bull; Secure Digital Legacy Management
          </p>
        </div>
      `;

      try {
        await sendEmail(ownerEmail, subject, html);
        console.log(`[confirm-trusted] Email sent to owner (${ownerEmail})`);
      } catch (emailErr) {
        console.error("[confirm-trusted] Failed to send email to owner:", emailErr);
      }
    } else {
      console.warn("[confirm-trusted] Owner email not found; skipped sending email.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trusted member status confirmed and owner notified.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("[confirm-trusted] Server error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
