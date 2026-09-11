import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function NomineeDownloadPage({ user, onBack, onLoginClick }) {
  const requestId = new URLSearchParams(window.location.search).get("requestId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(null);
  const [files, setFiles] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError("Missing requestId");
      setLoading(false);
      return;
    }
    init();
  }, [requestId]);

  useEffect(() => {
    if (!request?.release_at) return;
    const endTime = new Date(request.release_at).getTime() + 6 * 60 * 60 * 1000;
    const tick = () => {
      const remaining = endTime - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [request]);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { onLoginClick?.(); return; }

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

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      const { data, error } = await supabase.functions.invoke("get-download-url", {
        body: { requestId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setFiles(data.files || []);
      // Auto-open first file
      if (data.files?.[0]?.url) {
        window.open(data.files[0].url, "_blank");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error && !request) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!request) return <div className="p-8 text-center">Request not found.</div>;

  const isReleased = request.status === "released";
  const isExpired = timeLeft !== null && timeLeft <= 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Emergency Data Access</h1>

      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        {!isReleased && (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
            <p className="font-semibold">Not yet released.</p>
            <p className="text-sm">Current status: {request.status}</p>
          </div>
        )}

        {isReleased && (
          <>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">Download window closes in</p>
              <p className="text-2xl font-bold text-red-900">{formatTime(timeLeft)}</p>
            </div>

            {!isExpired && (
              <button
                onClick={download}
                disabled={downloading}
                className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white py-3 rounded-lg font-medium"
              >
                {downloading ? "Preparing download..." : "Download Files"}
              </button>
            )}

            {isExpired && (
              <div className="p-4 bg-gray-100 text-gray-700 rounded-lg text-center">
                Download window has expired.
              </div>
            )}

            {files.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">Files:</p>
                {files.map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline text-sm"
                  >
                    {f.name}
                  </a>
                ))}
              </div>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}