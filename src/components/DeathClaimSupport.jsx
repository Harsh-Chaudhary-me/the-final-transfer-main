import React, { useState } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DeathClaimSupport() {
  const params = new URLSearchParams(window.location.search);
  const ownerEmail = params.get('owner_email') || '';
  const packetIds = (params.get('packet_ids') || '').split(',').filter(Boolean);

  const [form, setForm] = useState({
    relationship: 'trusted contact',
    deceasedFullName: '',
    deceasedDob: '',
    dateOfDeath: '',
    placeOfDeath: '',
    causeOfDeath: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.deceasedFullName || !form.dateOfDeath) {
      setError('Please fill the required fields.');
      return;
    }
    if (!file) {
      setError('Please attach a death certificate or equivalent document.');
      return;
    }
    if (!packetIds.length) {
      setError('No packets specified in this claim.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in to submit this form.');

      // Upload certificate
      const ext = file.name.split('.').pop();
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('death-certificates')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error('Upload failed: ' + upErr.message);

      // Call edge function
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-death-claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            owner_email: ownerEmail,
            packet_ids: packetIds,
            certificate_path: path,
            relationship: form.relationship,
            deceasedFullName: form.deceasedFullName,
            deceasedDob: form.deceasedDob,
            dateOfDeath: form.dateOfDeath,
            placeOfDeath: form.placeOfDeath,
            causeOfDeath: form.causeOfDeath,
            notes: form.notes,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#FDF9F1] flex items-center justify-center px-4">
        <div className="max-w-lg bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
          <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Claim submitted</h1>
          <p className="text-gray-600">
            Your report has been received. A verification team will review the
            documents you uploaded. Nominees will be notified only if the claim
            is approved.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            You will receive an email update once the review is complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF9F1] px-4 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-2">Owner Status Support Form</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Report regarding: <strong>{ownerEmail}</strong>
          <br />
          Packets: {packetIds.length}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900">
          Please provide accurate information and a supporting document. False
          claims are subject to legal action.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Your relationship to the owner" required>
            <input
              value={form.relationship}
              onChange={(e) => update('relationship', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </Field>

          <Field label="Full legal name of the deceased" required>
            <input
              value={form.deceasedFullName}
              onChange={(e) => update('deceasedFullName', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of birth">
              <input
                type="date"
                value={form.deceasedDob}
                onChange={(e) => update('deceasedDob', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="Date of death" required>
              <input
                type="date"
                value={form.dateOfDeath}
                onChange={(e) => update('dateOfDeath', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </Field>
          </div>

          <Field label="Place of death">
            <input
              value={form.placeOfDeath}
              onChange={(e) => update('placeOfDeath', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </Field>

          <Field label="Additional notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </Field>

          <Field label="Supporting document" required>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload death certificate, obituary, or official record (PDF / JPG /
              PNG, max 10 MB).
            </p>
          </Field>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Claim for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}