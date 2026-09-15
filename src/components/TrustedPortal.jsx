import { useState } from "react";
import { supabase } from "../supabase";

export default function TrustedPortal({ trustedPackets = [], onRefresh }) {
  const [loadingId, setLoadingId] = useState(null);        // emergency request in flight
  const [confirmingId, setConfirmingId] = useState(null);   // owner-status confirm in flight
  const [message, setMessage] = useState("");

  const requestEmergency = async (packetId, title) => {
    setLoadingId(packetId);
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("request-emergency", {
        body: { packet_id: packetId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMessage(`✅ Emergency access requested for "${title}". All trusted members notified.`);
      onRefresh?.();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const confirmOwnerStatus = async (packet) => {
    const ok = window.confirm(
      `Report the owner of "${packet.title}" as unreachable?\n\n` +
      `This will notify all nominees of this packet and start the data release. ` +
      `Only proceed if you are confident something has happened to the owner.`
    );
    if (!ok) return;

    setConfirmingId(packet.id);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in again.");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-status`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ packet_id: packet.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to confirm status");
      setMessage(
        `✅ Owner status recorded for "${packet.title}". ` +
          `${data.notified ?? 0} nominee(s) have been notified.`
      );
      onRefresh?.();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setConfirmingId(null);
    }
  };

  if (!trustedPackets.length) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
        <p className="font-medium">You are not added as trusted anywhere yet.</p>
        <p className="text-sm mt-1">
          When someone adds you as trusted, their packets will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">{message}</div>
      )}

      {trustedPackets.map((p) => (
        <div key={p.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="font-semibold text-lg">{p.title}</h3>
              <p className="text-sm text-gray-600">
                Owner: <span className="font-medium">{p.owner_email}</span>
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {p.category}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Added {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              {p.category === "emergency" && (
                <button
                  onClick={() => requestEmergency(p.id, p.title)}
                  disabled={loadingId === p.id}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium"
                >
                  {loadingId === p.id ? "Requesting..." : "Request Emergency Access"}
                </button>
              )}

              <button
                onClick={() => confirmOwnerStatus(p)}
                disabled={confirmingId === p.id}
                title="Report the owner as unreachable"
                className="border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-medium"
              >
                {confirmingId === p.id ? "Submitting..." : "Confirm Owner Status"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}