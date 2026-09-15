import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function NomineeClaim() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [packetTitle, setPacketTitle] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No claim token provided.");
      setLoading(false);
      return;
    }
    claim();
  }, [token]);

  const claim = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("claim-nominee", {
        body: { token },
      });

      if (fetchError) throw new Error(fetchError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.success) {
        setFiles(data.files || []);
        setPacketTitle(data.packet_title || "Your Packet");
      }
    } catch (err) {
      setError(err.message || "Failed to claim your data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">This link is invalid or has already been used.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Claim Your Data</h1>
      <p className="text-gray-600 mb-6">
        You are authorized to download the files for: <strong>{packetTitle}</strong>
      </p>

      {files.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
          <p>No files found for this claim.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white border rounded-xl">
              <span className="font-medium">{f.name}</span>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#FF8C00] hover:bg-[#e67e00] text-white text-sm font-medium rounded-lg transition"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
