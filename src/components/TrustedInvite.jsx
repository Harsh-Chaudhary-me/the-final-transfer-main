import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function TrustedInvite() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const intent = params.get('intent') || 'accept';

  const [phase, setPhase] = useState('loading');
  const [meta, setMeta] = useState({ owner_email: null, trusted_email: null });
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!token) {
      setPhase('INVALID');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-trusted`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, action: 'status' }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPhase(data?.status || 'INVALID');
        } else {
          setPhase(data.status || 'INVALID');
          setMeta({
            owner_email: data.owner_email ?? null,
            trusted_email: data.trusted_email ?? null,
          });
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

  const act = async (action) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-trusted`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      setPhase(data?.status || 'INVALID');
      setMeta((m) => ({
        owner_email: data.owner_email ?? m.owner_email,
        trusted_email: data.trusted_email ?? m.trusted_email,
      }));
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF9F1] flex items-center justify-center px-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Trusted Contact Invitation
        </h1>

        {phase === 'loading' && (
          <p className="text-gray-600">Checking invitation…</p>
        )}

        {phase === 'PENDING' && (
          <>
            <p className="text-gray-700 mb-1">
              <strong>{meta.owner_email || 'Someone'}</strong> has added you as a
              trusted contact.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Accepting means you'll be asked to help verify emergency requests
              and the owner's well-being. You'll never see the packet contents.
            </p>
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => act('accept')}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition ${
                  intent === 'accept'
                    ? 'bg-[#FF8C00] hover:bg-[#e67e00]'
                    : 'bg-[#FF8C00]/70 hover:bg-[#FF8C00]'
                } disabled:opacity-50`}
              >
                {busy ? 'Working…' : 'Accept'}
              </button>
              <button
                disabled={busy}
                onClick={() => act('reject')}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${
                  intent === 'reject'
                    ? 'border-red-400 text-red-600 bg-red-50 hover:bg-red-100'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {busy ? 'Working…' : 'Reject'}
              </button>
            </div>
          </>
        )}

        {phase === 'ACCEPTED' && (
          <>
            <p className="text-green-700 font-semibold mb-2">
              You're confirmed.
            </p>
            <p className="text-gray-600">
              You can close this tab. The owner has been notified.
            </p>
          </>
        )}

        {phase === 'REJECTED' && (
          <>
            <p className="text-gray-800 font-semibold mb-2">
              You declined this invitation.
            </p>
            <p className="text-gray-600">
              The owner has been notified. No further action is needed.
            </p>
          </>
        )}

        {phase === 'EXPIRED' && (
          <>
            <p className="text-amber-700 font-semibold mb-2">
              This invitation has expired.
            </p>
            <p className="text-gray-600">
              Ask the owner to send you a new invite from the app.
            </p>
          </>
        )}

        {phase === 'INVALID' && (
          <>
            <p className="text-red-700 font-semibold mb-2">
              This link is invalid or has already been used.
            </p>
            <p className="text-gray-600">
              If you believe this is a mistake, ask the owner to re-send the
              invite.
            </p>
          </>
        )}

        {errorMsg && (
          <p className="mt-4 text-xs text-red-500 break-all">{errorMsg}</p>
        )}
      </motion.div>
    </div>
  );
}