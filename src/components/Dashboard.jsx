import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import myLogo from '../assets/logo.svg';
import { supabase } from '../supabase';
import {
  FileText, ChevronRight, Lock,
  Clock, Download, User as UserIcon, Shield,
  ShieldAlert, CheckCircle2, AlertCircle, PlusCircle, UserCheck, Inbox,
  Bell, Eye
} from 'lucide-react';

async function fetchDashboard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/get-dashboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load dashboard data');
  }

  return res.json();
}

export default function Dashboard({ user, onLogout, onNavigate }) {
  const [activeTab, setActiveTab] = useState('all');
  const [requestingPacketId, setRequestingPacketId] = useState(null);
  const [confirmingPacketId, setConfirmingPacketId] = useState(null);
  const [downloadingRequestId, setDownloadingRequestId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    enabled: !!user,
    refetchInterval: 30000,
  });

  const ownedPackets = data?.ownedPackets || [];
  const trustedPackets = data?.trustedPackets || [];
  const nomineePackets = data?.nomineePackets || [];

  useEffect(() => {
    if (!user?.email) return;
    const loadUnread = async () => {
      const { count } = await supabase
        .from('web_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', user.email)
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    loadUnread();
  }, [user?.email]);

  const handleRequestEmergency = async (packetId, packetTitle) => {
    if (!window.confirm(
      `Are you sure you want to request emergency access to "${packetTitle}"?\n\nAll trusted members will be notified and asked to vote. If all approve, the packet will be released to the nominee after a 6-hour window.`
    )) return;

    setRequestingPacketId(packetId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication session expired');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/request-emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packet_id: packetId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to request emergency access');

      alert(`✅ Emergency verification request submitted!\n\nRequest ID: ${result.request_id}\n\nAll trusted members have been notified via email.`);
      refetch();
    } catch (err) {
      alert(`❌ ${err.message || 'An error occurred while requesting emergency access.'}`);
    } finally {
      setRequestingPacketId(null);
    }
  };

 const handleConfirmOwnerStatus = async (ownerEmail, packets) => {
  const packetCount = packets.length;
  const firstTitle = packets[0]?.title || 'their packets';

  const ok = window.confirm(
    `Report ${ownerEmail} as unreachable?\n\n` +
    `This will release ${packetCount} packet${packetCount !== 1 ? 's' : ''} ` +
    `(starting with "${firstTitle}") and notify all nominees.\n\n` +
    `Only proceed if you are confident something has happened to the owner.`
  );
  if (!ok) return;

  setConfirmingOwnerId(ownerEmail);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Authentication session expired');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/confirm-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ owner_email: ownerEmail }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to confirm owner status');
    }

    alert(
      `✅ Owner status recorded for ${ownerEmail}.\n\n` +
      `${result.packets_affected ?? packetCount} packet(s) released.\n` +
      `${result.notified ?? 0} nominee(s) notified.`
    );
    refetch();
  } catch (err) {
    alert(`❌ ${err.message || 'An error occurred while recording status.'}`);
  } finally {
    setConfirmingOwnerId(null);
  }
};

  const handleVerifyOwnerPresence = async (ownerEmail) => {
  const ok = window.confirm(
    `Confirm that ${ownerEmail} is active and reachable?\n\n` +
    `This records a positive presence check. The owner will be notified.`
  );
  if (!ok) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Authentication session expired');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/verify-presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ owner_email: ownerEmail }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to record presence');

    alert(`✅ Presence verified for ${ownerEmail}.`);
  } catch (err) {
    alert(`❌ ${err.message || 'Could not record presence check.'}`);
  }
};
  const handleDownloadData = async (requestId) => {
    if (!requestId) {
      alert('❌ No active emergency request found for this packet.');
      return;
    }
    setDownloadingRequestId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication session expired');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/get-download-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to generate download URL');

      if (result.files && result.files.length > 0) {
        result.files.forEach((f) => {
          const url = f.url || f.signedUrl;
          if (url) window.open(url, '_blank');
        });
      } else {
        alert('No downloadable files found for this packet.');
      }
    } catch (err) {
      alert(`❌ ${err.message || 'Error generating download link.'}`);
    } finally {
      setDownloadingRequestId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-[#FDF9F1] text-gray-800 pb-20 selection:bg-[#FF8C00] selection:text-white">
      <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 fixed top-0 w-full z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-[#FF8C00] font-bold text-xl hover:opacity-90 transition-opacity">
            <img src={myLogo} alt="The Final Transfer Logo" className="h-10 w-auto object-contain" />
          </a>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate?.('notifications')}
              className="relative p-2 rounded-full hover:bg-gray-100 transition"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <div className="w-7 h-7 bg-gradient-to-tr from-[#FF8C00] to-[#FF6A00] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon size={16} />}
              </div>
              <span className="hidden sm:inline font-semibold">{user?.email}</span>
            </div>
            <button onClick={onLogout} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto pt-28 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your zero-knowledge packets and trusted designations.</p>
          </div>

          <div className="flex space-x-1.5 bg-gray-200/60 p-1.5 rounded-full w-fit">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'owned', label: 'Your Packets' },
              { id: 'trusted', label: 'You are Trusted' },
              { id: 'nominee', label: 'You are Nominee' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF8C00] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">Loading your vault dashboard...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl mb-8 flex justify-between items-center">
            <div>
              <h4 className="font-bold mb-1">Failed to fetch dashboard data</h4>
              <p className="text-sm">{error.message}</p>
            </div>
            <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-700 transition">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-orange-500/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-orange-200 block mb-1">The Final Transfer Vault</span>
                <h3 className="font-bold text-2xl mb-1">Take control anywhere</h3>
                <p className="text-orange-100 text-sm max-w-xl">Create, encrypt, or edit your packets securely via The Final Transfer Mobile App.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button className="bg-black/20 hover:bg-black/30 backdrop-blur px-4 py-2.5 rounded-2xl flex items-center gap-2 transition text-left">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black text-xs font-bold">A</div>
                  <div className="leading-tight"><div className="text-[10px] text-gray-200 font-medium">Download on</div><div className="font-bold text-xs">App Store</div></div>
                </button>
                <button className="bg-black/20 hover:bg-black/30 backdrop-blur px-4 py-2.5 rounded-2xl flex items-center gap-2 transition text-left">
                  <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-black text-xs font-bold"><ChevronRight size={14}/></div>
                  <div className="leading-tight"><div className="text-[10px] text-gray-200 font-medium">Get it on</div><div className="font-bold text-xs">Google Play</div></div>
                </button>
              </div>
            </div>

            {/* SECTION 1: YOUR PACKETS (OWNER) — unchanged */}
            {(activeTab === 'all' || activeTab === 'owned') && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="text-[#FF8C00]" size={22} />
                    Your Packets <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{ownedPackets.length}</span>
                  </h2>
                </div>

                {ownedPackets.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <div className="w-16 h-16 bg-orange-50 text-[#FF8C00] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <PlusCircle size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Create packet in app</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                      You haven't created any packets yet. Use the mobile app to set up zero-knowledge encrypted vaults for your digital assets.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ownedPackets.map((packet) => {
                      const nomineeCount = Array.isArray(packet.nominees)
                        ? packet.nominees.length
                        : typeof packet.nominees === 'object' && packet.nominees !== null
                        ? Object.keys(packet.nominees).length
                        : 0;

                      return (
                        <div key={packet.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-xs font-bold px-3 py-1 bg-orange-50 text-[#FF8C00] rounded-full border border-orange-100 uppercase tracking-wider">
                                {packet.category || 'General'}
                              </span>
                              <span className="text-[11px] text-gray-400 font-medium">
                                {packet.created_at ? new Date(packet.created_at).toLocaleDateString() : 'Recent'}
                              </span>
                            </div>
                            <h4 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-[#FF8C00] transition-colors">
                              {packet.title || packet.name || 'Untitled Packet'}
                            </h4>
                          </div>

                          <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500 mt-4">
                            <span className="flex items-center gap-1.5 font-medium text-gray-600">
                              <UserCheck size={16} className="text-gray-400" />
                              {nomineeCount} Nominee{nomineeCount !== 1 ? 's' : ''} Assigned
                            </span>
                            <span className="text-emerald-600 bg-emerald-50 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

          {/* SECTION 2: YOU ARE TRUSTED — GROUPED BY OWNER */}
{(activeTab === 'all' || activeTab === 'trusted') && (
  <section className="space-y-4 pt-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Shield className="text-[#FF8C00]" size={22} />
        You are Trusted{' '}
        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
          {trustedPackets.length}
        </span>
      </h2>
    </div>

    {trustedPackets.length === 0 ? (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-orange-50 text-[#FF8C00] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Inbox size={32} />
        </div>
        <h3 className="font-bold text-lg text-gray-900 mb-1">
          You are not added as trusted anywhere yet
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          When an account owner adds your email address as a trusted contact,
          their packets will appear here so you can assist in consensus
          procedures.
        </p>
      </div>
    ) : (
      <div className="grid sm:grid-cols-2 gap-4">
        {Object.entries(
          trustedPackets.reduce((acc, p) => {
            const key = p.owner_email || p.user_id || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
          }, {})
        ).map(([ownerKey, packets]) => {
          const emergencyPackets = packets.filter((p) => p.category === 'emergency');
          const anyEmergencyBusy = packets.some(
            (p) => requestingPacketId === p.id
          );
          const confirmBusy =
            confirmingOwnerId === ownerKey;
          return (
            <div
              key={ownerKey}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {packets.length} packet{packets.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Trusted Status Verified
                  </span>
                </div>
                <p className="text-xs text-[#FF8C00] font-semibold mb-2">
                  Owner: {ownerKey}
                </p>

                <ul className="space-y-1 mb-4">
                  {packets.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 text-sm text-gray-800"
                    >
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="font-medium truncate">
                        {p.title || p.name || 'Untitled Packet'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          p.category === 'emergency'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.category || 'normal'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-gray-50 space-y-2">
                {emergencyPackets.length > 0 && (
                  <button
                    disabled={anyEmergencyBusy}
                    onClick={() =>
                      handleRequestEmergency(
                        emergencyPackets[0].id,
                        emergencyPackets[0].title || 'this packet'
                      )
                    }
                    className="w-full py-3 px-6 rounded-full text-sm font-bold border-2 border-[#FF8C00] text-[#FF8C00] hover:bg-orange-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShieldAlert size={18} />
                    {anyEmergencyBusy
                      ? 'Submitting Request...'
                      : 'Request Emergency Access'}
                  </button>
                )}

                <button
                  onClick={() => handleVerifyOwnerPresence(ownerKey)}
                  className="w-full py-2 px-6 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <Eye size={14} />
                  Verify Owner Presence
                </button>

                <button
                  disabled={confirmBusy}
                  onClick={() => handleConfirmOwnerStatus(ownerKey, packets)}
                  title="Report the owner as unreachable"
                  className="w-full py-3 px-6 rounded-full text-sm font-bold border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  {confirmBusy ? 'Submitting...' : 'Confirm Owner Status'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
)}

            {/* SECTION 3: YOU ARE NOMINEE — countdown fixed */}
            {(activeTab === 'all' || activeTab === 'nominee') && (
              <section className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <UserCheck className="text-[#FF8C00]" size={22} />
                    You are Nominee <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{nomineePackets.length}</span>
                  </h2>
                </div>

                {nomineePackets.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">No action needed</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                      You are not currently designated as a nominee for any active packets.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nomineePackets.map((packet) => {
                      const isReleased = packet.downloadActive || packet.download_active;
                      const requestId = packet.requestId || packet.request_id;

                      return (
                        <div key={packet.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-[#FF8C00] uppercase tracking-wider">Nominee Vault</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs font-medium text-gray-500">{packet.category || 'Encrypted Data'}</span>
                            </div>
                            <h4 className="font-bold text-xl text-gray-900 mb-2">
                              {packet.title || packet.name || 'Assigned Digital Packet'}
                            </h4>

                            {!isReleased ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-2xl w-fit border border-gray-100">
                                <Lock size={16} className="text-gray-400" />
                                <span className="font-medium">No action needed</span> — Encrypted until emergency release consensus
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200 w-fit">
                                <CheckCircle2 size={20} className="text-emerald-600" />
                                <div className="text-sm text-emerald-800 font-semibold">
                                  Available to download
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0">
                            {!isReleased ? (
                              <button disabled className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
                                <Lock size={16} /> Locked
                              </button>
                            ) : (
                              <button
                                disabled={downloadingRequestId === requestId}
                                onClick={() => handleDownloadData(requestId)}
                                className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                <Download size={18} />
                                {downloadingRequestId === requestId ? 'Generating Link...' : 'Download Data'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </motion.div>
  );
}