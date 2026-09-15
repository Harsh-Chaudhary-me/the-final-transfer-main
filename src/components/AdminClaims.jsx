import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AdminClaims() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('tft_admin_key') || '');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [reason, setReason] = useState({});

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('death_claims')
        .select('id, packet_id, submitted_by_email, submitter_relationship, deceased_full_name, date_of_death, certificate_url, status, admin_notes, created_at, released_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      setClaims(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClaims(); }, []);

  const saveKey = () => {
    localStorage.setItem('tft_admin_key', adminKey);
    alert('Admin key saved locally.');
  };

  const getCertificateUrl = async (path) => {
    const { data } = await supabase.storage
      .from('death-certificates')
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const approve = async (claim) => {
    if (!adminKey) return alert('Paste your ADMIN_API_KEY first.');
    if (!window.confirm(`Approve claim for "${claim.deceased_full_name}" and release the packet?`)) return;
    setBusy(claim.id);
    try {
      // 1. Mark approved in DB (client-side update is fine for admin table)
      const { error: upErr } = await supabase
        .from('death_claims')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', claim.id);
      if (upErr) throw upErr;

      // 2. Call the release function
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-death-claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminKey}`,
          },
          body: JSON.stringify({ claim_id: claim.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      alert(`✅ Released. ${data.notified} nominee(s) notified.`);
      loadClaims();
    } catch (e) {
      alert(`❌ ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (claim) => {
    if (!adminKey) return alert('Paste your ADMIN_API_KEY first.');
    const r = reason[claim.id] || '';
    if (!window.confirm(`Reject claim for "${claim.deceased_full_name}"?`)) return;
    setBusy(claim.id);
    try {
      const { error: upErr } = await supabase
        .from('death_claims')
        .update({ status: 'rejected', admin_notes: r, reviewed_at: new Date().toISOString() })
        .eq('id', claim.id);
      if (upErr) throw upErr;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reject-death-claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminKey}`,
          },
          body: JSON.stringify({ claim_id: claim.id, reason: r }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      alert('Claim rejected. Submitter notified.');
      loadClaims();
    } catch (e) {
      alert(`❌ ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const viewCert = async (path) => {
    const url = await getCertificateUrl(path);
    if (url) window.open(url, '_blank');
    else alert('Could not generate link.');
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
          <button onClick={saveKey} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
            Save
          </button>
          <button onClick={loadClaims} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold">
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading claims…</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {!loading && claims.length === 0 && (
          <p className="text-gray-500">No claims submitted yet.</p>
        )}

        <div className="space-y-4">
          {claims.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  c.status === 'pending' ? 'bg-amber-100 text-amber-800'
                  : c.status === 'approved' ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
                }`}>
                  {c.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>

              <p className="font-semibold text-gray-900 mb-1">{c.deceased_full_name || '—'}</p>
              <p className="text-sm text-gray-600">Submitted by: {c.submitted_by_email}</p>
              <p className="text-sm text-gray-600">Relationship: {c.submitter_relationship || '—'}</p>
              <p className="text-sm text-gray-600">Date of death: {c.date_of_death || '—'}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => viewCert(c.certificate_url)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                >
                  View certificate
                </button>
              </div>

              {c.status === 'pending' && (
                <div className="mt-4 space-y-2">
                  <input
                    value={reason[c.id] || ''}
                    onChange={(e) => setReason((r) => ({ ...r, [c.id]: e.target.value }))}
                    placeholder="Rejection reason (optional, sent to submitter)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={busy === c.id}
                      onClick={() => approve(c)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> Approve & Release
                    </button>
                    <button
                      disabled={busy === c.id}
                      onClick={() => reject(c)}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}