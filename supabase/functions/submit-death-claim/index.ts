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
    const {
      owner_email,
      packet_ids,
      certificate_path,
      relationship,
      deceasedFullName,
      deceasedDob,
      dateOfDeath,
      placeOfDeath,
      causeOfDeath,
      notes,
    } = body;

    if (!Array.isArray(packet_ids) || packet_ids.length === 0) {
      return new Response(JSON.stringify({ error: "packet_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!certificate_path) {
      return new Response(JSON.stringify({ error: "certificate_path required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const callerEmail = user.email.toLowerCase();

    // Authorize: caller must be ACCEPTED trusted for the first packet's owner
    const { data: firstPacket } = await admin
      .from("packets")
      .select("id, user_id")
      .eq("id", packet_ids[0])
      .maybeSingle();
    if (!firstPacket) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: trust } = await admin
      .from("trusted_nominees")
      .select("id")
      .eq("user_id", firstPacket.user_id)
      .eq("email", callerEmail)
      .eq("status", "ACCEPTED")
      .maybeSingle();
    if (!trust) {
      return new Response(
        JSON.stringify({ error: "Not an accepted trusted contact for this owner" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = packet_ids.map((pid: string) => ({
      packet_id: pid,
      submitted_by_email: callerEmail,
      submitter_relationship: relationship || null,
      deceased_full_name: deceasedFullName || null,
      deceased_dob: deceasedDob || null,
      date_of_death: dateOfDeath || null,
      place_of_death: placeOfDeath || null,
      cause_of_death: causeOfDeath || null,
      certificate_url: certificate_path,
      additional_notes: notes || null,
      status: "pending",
    }));

    const { error: insertErr } = await admin.from("death_claims").insert(rows);
    if (insertErr) {
      console.error("[submit-death-claim] insert:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[submit-death-claim] fatal:", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});