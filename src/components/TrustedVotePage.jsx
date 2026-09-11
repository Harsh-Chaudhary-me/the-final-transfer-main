import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function TrustedVotePage({ user, onBack, onLoginClick }) {
  const requestId = new URLSearchParams(window.location.search).get("requestId");

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [voted, setVoted] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError("Missing requestId in URL");
      setLoading(false);
      return;
    }
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
       onLoginClick?.();
        return;
      }

      const { data, error } = await supabase
        .from("web_emergency_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (vote) => {
    setSubmitting(true);
    setError("");
    try {
      const { data, error } = await supabase.functions.invoke("vote-emergency", {
        body: { requestId, vote },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setVoted({ vote, result: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!request) return <div className="p-8 text-center">Request not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Emergency Access Vote</h1>

      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm text-gray-600">Requested by</p>
          <p className="font-medium">{request.requester_email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Status</p>
          <p className="font-medium capitalize">{request.status}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Vote deadline</p>
          <p className="font-medium">
            {request.vote_deadline ? new Date(request.vote_deadline).toLocaleString() : "—"}
          </p>
        </div>

        {request.status === "pending" && !voted && (
          <div className="pt-4 border-t">
            <p className="text-sm mb-4">
              Do you approve releasing this emergency packet to the nominee?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => castVote("yes")}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
              >
                {submitting ? "..." : "Yes, release"}
              </button>
              <button
                onClick={() => castVote("no")}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
              >
                {submitting ? "..." : "No, don't release"}
              </button>
            </div>
          </div>
        )}

        {voted && (
          <div className="pt-4 border-t">
            {voted.result?.any_no ? (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                <p className="font-semibold">Request locked.</p>
                <p className="text-sm">Someone voted No. Owner has been notified.</p>
              </div>
            ) : voted.result?.all_voted ? (
              <div className="p-4 bg-green-50 text-green-800 rounded-lg">
                <p className="font-semibold">All votes received. Release scheduled.</p>
                <p className="text-sm">Files will be sent to the nominee in 6 hours.</p>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
                <p className="font-semibold">Your vote ({voted.vote}) is recorded.</p>
                <p className="text-sm">Waiting for other trusted members to vote.</p>
              </div>
            )}
          </div>
        )}

        {request.status !== "pending" && !voted && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-700">
              This request is <strong>{request.status}</strong>. No further action needed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}