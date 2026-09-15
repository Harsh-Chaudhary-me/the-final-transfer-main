import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { requestId, vote } = body;
    if (!requestId || !["yes", "no"].includes(vote)) {
      return new Response(
        JSON.stringify({ error: "requestId and vote (yes/no) required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch request
    const { data: request, error: rErr } = await admin
      .from("web_emergency_requests")
      .select("id, packet_id, status, requester_email")
      .eq("id", requestId)
      .single();

    if (rErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Request already ${request.status}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Fetch packet
    const { data: packet } = await admin
      .from("packets")
      .select("id, user_id, title")
      .eq("id", request.packet_id)
      .single();

    if (!packet) {
      return new Response(JSON.stringify({ error: "Packet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify caller is trusted for this owner
    const { data: trustedRow } = await admin
      .from("trusted_nominees")
      .select("id")
      .eq("user_id", packet.user_id)
      .eq("email", user.email)
      .maybeSingle();

    if (!trustedRow) {
      return new Response(
        JSON.stringify({ error: "Not a trusted member" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Refuse if already voted
    const { data: existingVote } = await admin
      .from("web_emergency_votes")
      .select("id, vote")
      .eq("request_id", requestId)
      .eq("voter_email", user.email)
      .maybeSingle();

    if (existingVote) {
      return new Response(
        JSON.stringify({
          error: "Already voted",
          your_vote: existingVote.vote,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Insert the vote
    const { error: vErr } = await admin.from("web_emergency_votes").insert({
      request_id: requestId,
      voter_email: user.email,
      vote,
    });

    if (vErr) {
      return new Response(JSON.stringify({ error: vErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Tally
    const { data: allTrusted } = await admin
      .from("trusted_nominees")
      .select("email")
      .eq("user_id", packet.user_id)
      .eq("status", "ACCEPTED");

    const { data: allVotes } = await admin
      .from("web_emergency_votes")
      .select("voter_email, vote")
      .eq("request_id", requestId);

 const trustedEmails = (allTrusted || [])
  .map((t: any) => t.email?.toLowerCase())
  .filter(Boolean);

const requesterEmail = request.requester_email?.toLowerCase();

// Voters who need to vote = all trusted EXCEPT the requester
const requiredVoters = trustedEmails.filter(
  (e: string) => e !== requesterEmail
);

const votesMap = new Map(
  (allVotes || []).map((v: any) => [v.voter_email?.toLowerCase(), v.vote])
);

const anyNo = (allVotes || []).some((v: any) => v.vote === "no");
const allVoted = requiredVoters.every((e: string) => votesMap.has(e));

    // 7. Update request status
    if (anyNo) {
      // --- Lock the request ---
      await admin
        .from("web_emergency_requests")
        .update({ status: "locked" })
        .eq("id", requestId);

      // --- Notify all accepted trusted + the requester (in-app only) ---
      const notifySet = new Set<string>();
      for (const e of trustedEmails) {
        if (e) notifySet.add(e);
      }
      const requester = request.requester_email?.toLowerCase();
      if (requester) notifySet.add(requester);

      const whoVotedNo = user.email.toLowerCase();
      const title = "Emergency request was not approved";
      const message = `${whoVotedNo} declined the emergency request for "${packet.title}". Please discuss with the other trusted contacts before making a new request.`;

      for (const email of notifySet) {
        await admin.from("web_notifications").insert({
          user_email: email,
          title,
          message,
          link: null,
        });
      }
    } else if (allVoted) {
      // --- All yes: schedule release 6 hours from now ---
      const releaseAt = new Date(
        // Date.now() + 6 * 60 * 60 * 1000
        Date.now() + 3 * 60 * 1000
      ).toISOString();

      await admin
        .from("web_emergency_requests")
        .update({ status: "scheduled", release_at: releaseAt })
        .eq("id", requestId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        your_vote: vote,
        all_voted: allVoted,
        any_no: anyNo,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[vote-emergency] fatal:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});