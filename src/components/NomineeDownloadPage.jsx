import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Download, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export default function NomineeDownloadPage({ user, onBack, onLoginClick }) {
  const requestId = new URLSearchParams(window.location.search).get("requestId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(null);
  const [files, setFiles] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError("Missing requestId");
      setLoading(false);
      return;
    }
    init();
  }, [requestId]);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        onLoginClick?.();
        setLoading(false);
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

  const download = async () => {
  setDownloading(true);
  setError("");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please log in again.");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-download-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ requestId }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    setFiles(data.files || []);
    if (data.files?.[0]?.url) {
      window.open(data.files[0].url, "_blank");
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setDownloading(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF9F1] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF8C00] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="min-h-screen bg-[#FDF9F1] flex items-center justify-center px-4">
        <div className="max-w-lg bg-white rounded-2xl p-8 shadow-lg border border-red-100 text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Could not load</h2>
          <p className="text-sm text-gray-600 break-all">{error}</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#FDF9F1] flex items-center justify-center px-4">
        <div className="max-w-lg bg-white rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-lg font-semibold mb-1">Request not found</h2>
          <p className="text-sm text-gray-600">
            This download link is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Release gate — accept "released" always, or "scheduled" once release_at has passed.
  // (release-emergency cron flips "scheduled" → "released" every 5 min, but we don't
  // want to make the nominee wait for the cron cycle.)
  const now = Date.now();
  const releaseTime = request.release_at ? new Date(request.release_at).getTime() : null;
  const isScheduledAndDue =
    request.status === "scheduled" && releaseTime !== null && releaseTime <= now;
  const isReleased = request.status === "released" || isScheduledAndDue;

  return (
    <div className="min-h-screen bg-[#FDF9F1] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          Emergency Data Access
        </h1>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          {!isReleased && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl">
              <p className="font-semibold mb-1">Not yet released</p>
              <p className="text-sm">
                Current status: <span className="font-mono">{request.status}</span>
              </p>
              {request.release_at && (
                <p className="text-xs mt-2 text-yellow-700">
                  Scheduled to release at{" "}
                  {new Date(request.release_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {isReleased && (
            <>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900">
                    Available to download
                  </p>
                  <p className="text-xs text-emerald-800">
                    Your files are ready. You can access them any time.
                  </p>
                </div>
              </div>

              <button
                onClick={download}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white py-3.5 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.01] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                {downloading ? "Preparing download…" : "Download Files"}
              </button>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {files.length > 0 && (
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Files</p>
                  {files.map((f, i) => (
                    <a
                      key={i}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#FF8C00] hover:underline"
                    >
                      <FileText size={14} />
                      {f.name}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}