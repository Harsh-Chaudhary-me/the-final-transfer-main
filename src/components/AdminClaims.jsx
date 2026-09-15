import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AdminClaims() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('tft_admin_key') || '');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [reasons, setReasons] = useState({});

  const apiBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const loadClaims = async () => {
    if (!adminKey) {
      setError('Paste your ADMIN_API_KEY first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/list-death-claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load claims');
      setClaims(data.claims || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveKey = () => {
    localStorage.setItem('tft_admin_key', adminKey);
    loadClaims();
  };

  const review = async (claim, decision) => {
  const reason = reasons[claim.id] || '';

  // Find all sibling pending claims from the same submitter.
  // "Sibling" = same submitted_by_email AND status='pending'.
  // Approving/rejecting one applies to all — the owner is one person,
  // and their packets release together.
  const siblings = claims.filter(
    (c) =>
      c.status === 'pending' &&
      c.submitted_by_email.toLowerCase() ===
        claim.submitted_by_email.toLowerCase()
  );

  const count = siblings.length;
  const confirmMsg =
    decision === 'approve'
      ? `Approve claim for "${claim.deceased_full_name}"?\n\n` +
        `This will release ${count} packet${count !== 1 ? 's' : ''} for ` +
        `${claim.submitted_by_email} and notify all nominees.`
      : `Reject claim for "${claim.deceased_full_name}"?\n\n` +
        `This will reject ${count} packet${count !== 1 ? 's' : ''} for ` +
        `${claim.submitted_by_email}.`;

  if (!window.confirm(confirmMsg)) return;

  setBusy(claim.id);
  try {
    let approved = 0;
    let rejected = 0;
    let totalNotified = 0;
    const failures = [];

    for (const c of siblings) {
      const res = await fetch(`${apiBase}/review-death-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ claim_id: c.id, decision, reason }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        failures.push(`${c.id.slice(0, 8)}: ${data.error || res.status}`);
        continue;
      }

      if (decision === 'approve') {
        approved++;
        totalNotified += data.notified ?? 0;
      } else {
        rejected++;
      }
    }

    if (failures.length) {
      alert(
        `⚠️ Some claims could not be processed:\n\n${failures.join('\n')}\n\n` +
          (decision === 'approve'
            ? `Approved: ${approved}, notified: ${totalNotified}`
            : `Rejected: ${rejected}`)
      );
    } else {
      alert(
        decision === 'approve'
          ? `✅ Approved ${approved} packet(s). ${totalNotified} nominee(s) notified.`
          : `✅ Rejected ${rejected} packet(s). Submitter notified.`
      );
    }
    loadClaims();
  } catch (e) {
    alert(`❌ ${e.message}`);
  } finally {
    setBusy(null);
  }
};

  return (
    <div className="min-h-screen bg-[#FDF9F1] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Death Claim Review</h1>
        <p className="text-gray-500 text-sm mb-6">
          Admin-only. Paste your ADMIN_API_KEY below — it is stored in your browser only.
        </p>

        <div className="bg-white rounded-2xl p-4 mb-6 flex gap-3 items-center">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="ADMIN_API_KEY"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm"
          />
          <button
            onClick={saveKey}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            Save & Refresh
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading claims…</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-2 items-center">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {!loading && !error && claims.length === 0 && adminKey && (
          <p className="text-gray-500">No claims submitted yet.</p>
        )}

        <div className="space-y-4">
          {claims.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    c.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : c.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {c.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>

              <p className="font-semibold text-gray-900 mb-1">
                {c.deceased_full_name || '—'}
              </p>
              <p className="text-sm text-gray-600">
                Submitted by: {c.submitted_by_email}
              </p>
              <p className="text-sm text-gray-600">
                Relationship: {c.submitter_relationship || '—'}
              </p>
              <p className="text-sm text-gray-600">
                Date of death: {c.date_of_death || '—'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.certificate_signed_url ? (
                  <a
                    href={c.certificate_signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                  >
                    View certificate
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No certificate</span>
                )}
              </div>

              {c.status === 'pending' && (
                <div className="mt-4 space-y-2">
                  <input
                    value={reasons[c.id] || ''}
                    onChange={(e) =>
                      setReasons((r) => ({ ...r, [c.id]: e.target.value }))
                    }
                    placeholder="Rejection reason (optional, sent to submitter)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={busy === c.id}
                      onClick={() => review(c, 'approve')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> Approve & Release
                    </button>
                    <button
                      disabled={busy === c.id}
                      onClick={() => review(c, 'reject')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              )}

              {c.status === 'approved' && c.released_at && (
                <p className="mt-3 text-xs text-emerald-700">
                  Released {new Date(c.released_at).toLocaleString()}
                </p>
              )}

              {c.status === 'rejected' && c.admin_notes && (
                <p className="mt-3 text-xs text-red-700">
                  Reason: {c.admin_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}