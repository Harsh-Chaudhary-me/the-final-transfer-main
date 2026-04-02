import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, FileText, ChevronRight, Lock, 
  Clock, Download, User as UserIcon
} from 'lucide-react';

export default function Dashboard({ user, packets, assigned, onLogout }) {
  const [activeTab, setActiveTab] = useState('owned'); // owned, assigned
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen pb-20">
      <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 fixed top-0 w-full z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#FF6A00] font-bold text-xl">
            <Rocket className="w-6 h-6" />
            <span className="hidden sm:inline">Final Transfer</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-[#FF6A00] font-bold">
              {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon size={20} />}
            </div>
            <button onClick={onLogout} className="text-sm font-medium text-gray-500 hover:text-gray-800">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pt-24 px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* Tabs */}
        <div className="flex space-x-2 bg-gray-200/50 p-1.5 rounded-full w-fit mb-8">
          <button 
            onClick={() => setActiveTab('owned')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'owned' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Your Packets
          </button>
          <button 
            onClick={() => setActiveTab('assigned')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'assigned' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Assigned to You
          </button>
        </div>

        {activeTab === 'owned' ? (
          <OwnedPacketsView packets={packets} />
        ) : (
          <AssignedPacketsView assigned={assigned} />
        )}
      </main>
    </motion.div>
  );
}

function OwnedPacketsView({ packets }) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Mobile App Promo */}
      <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-bold text-xl mb-1">Take control anywhere</h3>
          <p className="text-orange-100 text-sm">Manage, edit, or delete your packets via The Final Transfer Mobile App.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button className="bg-black/20 hover:bg-black/30 backdrop-blur pb-1 px-4 py-2 rounded-xl flex items-center gap-2 transition">
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black text-[10px] font-bold">A</div>
            <div className="text-left leading-tight"><div className="text-[10px] text-gray-200">Download on the</div><div className="font-semibold text-sm">App Store</div></div>
          </button>
          <button className="bg-black/20 hover:bg-black/30 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2 transition">
            <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center text-black text-[10px] font-bold"><ChevronRight size={14}/></div>
            <div className="text-left leading-tight"><div className="text-[10px] text-gray-200">Get it on</div><div className="font-semibold text-sm">Google Play</div></div>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {packets.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center group cursor-pointer hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-[#FF6A00] transition-colors">
                <FileText size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{p.name}</h4>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  {p.status}
                </div>
              </div>
            </div>
            <ChevronRight className="text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignedPacketsView({ assigned }) {
  const [requestedId, setRequestedId] = useState(null);

  const handleRequestAccess = (id) => {
    setRequestedId(id);
    alert('Verification process started. Trusted members have been notified.');
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      {assigned.map(p => (
         <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <p className="text-sm font-medium text-[#FF6A00] mb-1">{p.ownerName}'s Packet</p>
              <h4 className="font-bold text-xl text-gray-900 mb-2">{p.name}</h4>
              
              {p.status === 'Pending Verification' && requestedId !== p.id && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Lock size={16} /> Locked until verified
                </div>
              )}
              {(p.status === 'Pending Verification' && requestedId === p.id) && (
                 <div className="flex items-center gap-2 text-sm text-[#FF9EA2] font-medium p-2 bg-red-50 rounded-xl w-fit">
                   <Clock size={16} className="animate-spin-slow" /> Verification in progress...
                 </div>
              )}
              {p.status === 'Emergency Verified' && (
                 <div className="mt-2">
                   <CountdownTimer />
                 </div>
              )}
              {p.status === 'Deceased Verified' && (
                 <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                   <Lock size={16} className="text-emerald-500"/> Folder is encrypted. Use format: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs text-black">firstname+contactnumber</code> to unlock.
                 </div>
              )}
            </div>
            
            <div className="shrink-0 flex items-center">
              {p.status === 'Pending Verification' && requestedId !== p.id && (
                <button 
                  onClick={() => handleRequestAccess(p.id)}
                  className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold border-2 border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 transition"
                >
                  Request Access
                </button>
              )}
              {p.status === 'Emergency Verified' && (
                <button disabled className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
                  <Download size={18} /> Download Locked
                </button>
              )}
              {p.status === 'Deceased Verified' && (
                <button className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-lg hover:shadow-orange-500/40 transition flex items-center justify-center gap-2">
                  <Download size={18} /> Download Folder
                </button>
              )}
               {(p.status === 'Pending Verification' && requestedId === p.id) && (
                <button disabled className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold bg-gray-50 text-gray-400 border border-gray-100">
                  Processing
                </button>
              )}
            </div>
         </div>
      ))}
    </div>
  );
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(6 * 60 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 10 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-3 bg-[#FF9EA2]/10 px-4 py-2.5 rounded-2xl border border-[#FF9EA2]/30 w-fit">
      <Clock size={20} className="text-[#FF9EA2]" />
      <div className="font-mono font-bold text-[#FF9EA2] tracking-wider text-lg">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="text-xs text-gray-500 ml-2 font-medium">Until Access Granted</div>
    </div>
  );
}
