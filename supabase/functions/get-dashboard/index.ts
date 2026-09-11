import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email not found in token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // === Query 1: Owned Packets ===
    const { data: ownedPackets, error: ownedErr } = await adminClient
      .from("packets")
      .select("id, title, category, created_at, nominees")
      .eq("user_id", userId);

    if (ownedErr) {
      console.error("[get-dashboard] owned packets error:", ownedErr);
      throw ownedErr;
    }

    // === Query 2: Trusted Packets ===
    const { data: trustedNomineesRows, error: trustedNomineesErr } = await adminClient
      .from("trusted_nominees")
      .select("*")
      .eq("email", userEmail);

    if (trustedNomineesErr) {
      console.error("[get-dashboard] trusted nominees error:", trustedNomineesErr);
      throw trustedNomineesErr;
    }

    const ownerIds = Array.from(
      new Set((trustedNomineesRows || []).map((r: any) => r.user_id).filter(Boolean))
    );

    let trustedPackets: any[] = [];
    if (ownerIds.length > 0) {
      const { data: tpData, error: tpErr } = await adminClient
        .from("packets")
        .select("id, title, category, created_at, user_id")
        .in("user_id", ownerIds);

      if (tpErr) {
        console.error("[get-dashboard] trusted packets error:", tpErr);
        throw tpErr;
      }

      // Fetch owner profiles for display
      const { data: ownerProfiles } = await adminClient
        .from("user_profiles")
        .select("id, email, full_name")
        .in("id", ownerIds);

      trustedPackets = (tpData || []).map((packet: any) => {
        const nomineeInfo = (trustedNomineesRows || []).find(
          (r: any) => r.user_id === packet.user_id
        );
        const owner = (ownerProfiles || []).find(
          (o: any) => o.id === packet.user_id
        );
        return {
          ...packet,
          trustedNominee: nomineeInfo,
          owner_email: owner?.email || nomineeInfo?.email || "unknown",
          owner_name: owner?.full_name || "Unknown",
        };
      });
    }

    // === Query 3: Nominee Packets (JS-side filter, NO JSONB operator) ===
    const { data: allPackets, error: allErr } = await adminClient
      .from("packets")
      .select("id, title, category, created_at, user_id, nominees");

    if (allErr) {
      console.error("[get-dashboard] all packets error:", allErr);
      throw allErr;
    }

    const normalizedEmail = userEmail.toLowerCase();

    const nomineePackets = (allPackets || []).filter((p: any) => {
      let nominees = p.nominees;
      if (!nominees) return false;
      if (typeof nominees === "string") {
        try { nominees = JSON.parse(nominees); } catch { return false; }
      }
      if (!Array.isArray(nominees)) return false;
      return nominees.some((n: any) => {
        if (!n) return false;
        const e = typeof n === "string" ? n : (n.email || "");
        return String(e).toLowerCase() === normalizedEmail;
      });
    });

    // Check for released emergency requests
    let releasedRequests: any[] = [];
    if (nomineePackets.length > 0) {
      const packetIds = nomineePackets.map((p: any) => p.id);
      const { data: reqs } = await adminClient
        .from("web_emergency_requests")
        .select("id, packet_id, status, release_at")
        .in("packet_id", packetIds)
        .eq("status", "released");
      releasedRequests = reqs || [];
    }

    const nomineePacketsFinal = nomineePackets.map((p: any) => {
      const active = releasedRequests.find((r: any) => r.packet_id === p.id);
      return {
        id: p.id,
        title: p.title,
        category: p.category,
        created_at: p.created_at,
        user_id: p.user_id,
        downloadActive: !!active,
        download_active: !!active,
        requestId: active?.id || null,
      };
    });

    return new Response(
      JSON.stringify({
        ownedPackets: ownedPackets || [],
        trustedPackets: trustedPackets || [],
        nomineePackets: nomineePacketsFinal || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[get-dashboard] fatal:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});