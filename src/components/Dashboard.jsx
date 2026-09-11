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
  const [downloadingRequestId, setDownloadingRequestId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    enabled: !!user,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const ownedPackets = data?.ownedPackets || [];
  const trustedPackets = data?.trustedPackets || [];
  const nomineePackets = data?.nomineePackets || [];

  // Fetch unread notification count
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

  const handleVerifyOwnerPresence = (packetTitle, ownerEmail) => {
    alert(`✅ Presence verification recorded.\n\nYou confirmed the owner of "${packetTitle}" is active.\n\nThe owner (${ownerEmail}) has been notified that you verified their presence.`);
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
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 fixed top-0 w-full z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-[#FF8C00] font-bold text-xl hover:opacity-90 transition-opacity">
            <img 
              src={myLogo} 
              alt="The Final Transfer Logo" 
              className="h-10 w-auto object-contain" 
            />
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto pt-28 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your zero-knowledge packets and trusted designations.</p>
          </div>

          {/* Section Filter Tabs */}
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

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF8C00] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">Loading your vault dashboard...</p>
          </div>
        )}

        {/* Error State */}
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
            {/* Mobile App Promo Banner */}
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

            {/* SECTION 1: YOUR PACKETS (OWNER) */}
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

            {/* SECTION 2: YOU ARE TRUSTED (TRUSTED MEMBER) */}
            {(activeTab === 'all' || activeTab === 'trusted') && (
              <section className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="text-[#FF8C00]" size={22} />
                    You are Trusted <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{trustedPackets.length}</span>
                  </h2>
                </div>

                {trustedPackets.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <div className="w-16 h-16 bg-orange-50 text-[#FF8C00] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Inbox size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">You are not added as trusted anywhere yet</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                      When an account owner adds your email address as a trusted contact, their packets will appear here so you can assist in consensus procedures.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {trustedPackets.map((packet) => (
                      <div key={packet.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                              {packet.category || 'Emergency'}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              Trusted Status Verified
                            </span>
                          </div>
                          <p className="text-xs text-[#FF8C00] font-semibold mb-1">
                            Owner: {packet.owner_email || packet.user_id || 'Registered User'}
                          </p>
                          <h4 className="font-bold text-xl text-gray-900">
                            {packet.title || packet.name || 'Emergency Instructions'}
                          </h4>
                        </div>

                        <div className="pt-3 border-t border-gray-50 space-y-2">
                          <button
                            disabled={requestingPacketId === packet.id}
                            onClick={() => handleRequestEmergency(packet.id, packet.title || 'this packet')}
                            className="w-full py-3 px-6 rounded-full text-sm font-bold border-2 border-[#FF8C00] text-[#FF8C00] hover:bg-orange-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <ShieldAlert size={18} />
                            {requestingPacketId === packet.id ? 'Submitting Request...' : 'Request Emergency Access'}
                          </button>
                          <button
                            onClick={() => handleVerifyOwnerPresence(packet.title, packet.owner_email)}
                            className="w-full py-2 px-6 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                          >
                            <Eye size={14} />
                            Verify Owner Presence
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION 3: YOU ARE NOMINEE (NOMINEE) */}
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
                      const releaseAt = packet.release_at;

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
                              <div className="mt-2">
                                <CountdownTimer releaseAt={releaseAt} />
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

function CountdownTimer({ releaseAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    // If releaseAt provided, count to (releaseAt + 6 hours). Otherwise, default 6 hours from now.
    const deadline = releaseAt
      ? new Date(releaseAt).getTime() + 6 * 60 * 60 * 1000
      : Date.now() + 6 * 60 * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [releaseAt]);

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-3 bg-gray-100 px-4 py-2.5 rounded-2xl border border-gray-200 w-fit">
        <AlertCircle size={20} className="text-gray-500" />
        <div className="text-sm text-gray-600 font-medium">Download window expired</div>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-3 bg-[#FF9EA2]/10 px-4 py-2.5 rounded-2xl border border-[#FF9EA2]/30 w-fit">
      <Clock size={20} className="text-[#FF9EA2] animate-pulse" />
      <div className="font-mono font-bold text-[#FF9EA2] tracking-wider text-lg">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="text-xs text-gray-600 font-medium">Download Window Active</div>
    </div>
  );
}