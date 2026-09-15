import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export default function NomineeClaim() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [phase, setPhase] = useState('loading');
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!token) {
      setPhase('INVALID');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-nominee`,
          {
            method: 'POST',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPhase('INVALID');
          setErrorMsg(data?.error || null);
        } else {
          setFiles(data.files || []);
          setTitle(data.packet_title || null);
          setPhase('READY');
        }
      } catch (e) {
        if (!cancelled) {
          setPhase('INVALID');
          setErrorMsg(e.message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#FDF9F1] flex items-center justify-center px-4 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
      >
        {phase === 'loading' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Loading your data…</h1>
            <p className="text-gray-600">Verifying your claim link.</p>
          </>
        )}

        {phase === 'INVALID' && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="text-red-600" />
              <h1 className="text-2xl font-bold text-red-700">Link invalid or expired</h1>
            </div>
            <p className="text-gray-600">
              This claim link has already been used, has expired, or is incorrect.
              Ask the packet owner's trusted contacts to re-issue it.
            </p>
            {errorMsg && (
              <p className="mt-3 text-xs text-red-500 break-all">{errorMsg}</p>
            )}
          </>
        )}

        {phase === 'READY' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="text-emerald-600" size={28} />
              <h1 className="text-2xl font-bold">Your data is ready</h1>
            </div>
            {title && (
              <p className="text-gray-700 mb-6">
                Packet: <strong>{title}</strong>
              </p>
            )}
            {files.length === 0 ? (
              <p className="text-gray-500">No files were attached to this packet.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="text-gray-400 shrink-0" size={18} />
                      <span className="font-medium text-gray-800 truncate">
                        {f.name}
                      </span>
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 px-4 py-2 rounded-lg bg-[#FF8C00] text-white text-sm font-semibold hover:bg-[#e67e00] transition flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-xs text-gray-500">
              Download links expire after a few hours for security. If a link
              stops working, re-open this page to get fresh ones.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}