import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Shield, Clock, Lock, FileText, UploadCloud, 
  CheckCircle2, AlertCircle, ChevronRight, X, User, ShieldCheck,
  Mail, Phone, FileDigit, Download, Activity, Zap, Users
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_PACKETS = [
  { id: 1, name: "Financial Vault", status: "Active", type: "Created" },
  { id: 2, name: "Crypto Keys", status: "Active", type: "Created" },
];

const MOCK_ASSIGNED = [
  { id: 101, ownerName: "John Doe", name: "Emergency Instructions", status: "Pending Verification" },
  { id: 102, ownerName: "Jane Smith", name: "Life Insurance", status: "Emergency Verified", timerStart: Date.now() },
  { id: 103, ownerName: "Robert C.", name: "Digital Memories", status: "Deceased Verified" },
];

export default function App() {
  const [currentView, setCurrentView] = useState('splash'); // splash, landing, dashboard, trusted, legal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  // For dashboard prototype
  const [assignedPackets, setAssignedPackets] = useState(MOCK_ASSIGNED);

  useEffect(() => {
    if (currentView === 'splash') {
      const timer = setTimeout(() => {
        setCurrentView('landing');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const handleLogin = (e) => {
    e.preventDefault();
    setUser({ name: "Alex Test" });
    setIsLoginModalOpen(false);
    setCurrentView('dashboard');
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[#FDF9F1] text-gray-800 font-sans selection:bg-[#FF8C00] selection:text-white">
      <AnimatePresence mode="wait">
        {currentView === 'splash' && <SplashScreen key="splash" />}
        {currentView === 'landing' && (
          <LandingPage 
            key="landing" 
            onLoginClick={() => setIsLoginModalOpen(true)}
            onSignUpClick={() => setIsSignUpModalOpen(true)}
            onDemoTrusted={() => navigateTo('trusted')}
          />
        )}
        {currentView === 'dashboard' && (
           <Dashboard 
             key="dashboard" 
             user={user} 
             packets={MOCK_PACKETS}
             assigned={assignedPackets}
             onLogout={() => { setUser(null); navigateTo('landing'); }}
           />
        )}
        {currentView === 'trusted' && (
           <TrustedPortal 
             key="trusted" 
             onProceedToLegal={() => navigateTo('legal')}
             onBack={() => navigateTo('landing')}
           />
        )}
        {currentView === 'legal' && (
           <LegalUploadPage 
             key="legal" 
             onBack={() => navigateTo('landing')}
           />
        )}
      </AnimatePresence>

      {/* Auth Modals */}
      <AuthModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        title="Welcome Back" 
        onSubmit={handleLogin}
        isSignUp={false}
      />
      <AuthModal 
        isOpen={isSignUpModalOpen} 
        onClose={() => setIsSignUpModalOpen(false)} 
        title="Create Account" 
        onSubmit={handleLogin}
        isSignUp={true}
      />
    </div>
  );
}

// --- COMPONENTS ---

function SplashScreen() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 2000); // text morphs
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div 
      className="fixed inset-0 bg-[#FDF9F1] flex flex-col items-center justify-center overflow-hidden z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute w-4 h-4 bg-gradient-to-br from-[#FF8C00] to-[#FF6A00] rounded-full"
        initial={{ scale: 0 }}
        animate={{ scale: step >= 1 ? 150 : 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ x: -100, y: 100, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Rocket size={64} className="text-white mb-6" />
        </motion.div>
        
        <div className="h-20 flex items-center justify-center font-bold text-center text-white px-6">
          <AnimatePresence mode="wait">
            {step < 2 ? (
              <motion.h1 
                key="t1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-4xl md:text-5xl"
              >
                The Final Transfer
              </motion.h1>
            ) : (
              <motion.h2
                key="t2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl md:text-3xl font-medium tracking-wide"
              >
                Better 5 years earlier<br/>than 5 minutes later.
              </motion.h2>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function LandingPage({ onLoginClick, onSignUpClick, onDemoTrusted }) {
  return (
    <div className="bg-[#FDF9F1] min-h-screen font-sans selection:bg-[#FF8C00] selection:text-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-[#FDF9F1]/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#FF8C00] font-bold text-xl">
            <Shield className="w-6 h-6" />
            <span className="text-gray-900">The Final Transfer</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition">How It Works</a>
            <a href="#security" className="hover:text-gray-900 transition">Security</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLoginClick} className="px-5 py-2 rounded-full font-medium text-gray-700 hover:bg-gray-100 transition">Sign In</button>
            <button onClick={onSignUpClick} className="px-6 py-2.5 rounded-full font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105 transition-all">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-orange-400/10 to-pink-400/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF8C00] to-[#FF6A00] rounded-3xl shadow-xl shadow-orange-500/20 flex items-center justify-center mb-8 rotate-3">
              <Shield className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight leading-[1.1] max-w-4xl">
              Protect your digital wealth before it becomes <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C00] to-[#FF6A00]">digital dust.</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
              The Final Transfer ensures your cryptocurrency, passwords, and precious memories reach your loved ones safely—without relying on single points of failure.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button onClick={onSignUpClick} className="px-8 py-4 rounded-full text-lg font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-xl shadow-orange-500/30 hover:scale-105 transition-all">
                Create Your Vault
              </button>
              <a href="#how-it-works" className="px-8 py-4 rounded-full text-lg font-bold bg-white text-gray-800 border-2 border-gray-200 shadow-sm hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                See How It Works
              </a>
              <button onClick={onDemoTrusted} className="px-8 py-4 rounded-full text-lg font-bold bg-white text-gray-800 border-2 border-gray-200 shadow-sm hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF9EA2]" />
                Demo Verification
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-24 px-6 bg-white border-y border-gray-100 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-sm font-bold tracking-widest text-[#FF8C00] uppercase mb-4 block">Core Features</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Built for Trust, Designed for Peace</h2>
            <p className="text-xl text-gray-600">Every feature is engineered to protect what matters most—your digital legacy and your peace of mind.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Lock, title: "Zero-Knowledge Vaults", desc: "Data is encrypted on your device before it leaves. We never possess the keys to read your files." },
              { icon: Activity, title: "Heartbeat Protocol", desc: "A gentle breathing pulse that monitors your activity. We ping your devices, not a disruptive countdown clock." },
              { icon: Users, title: "Lazarus Verification", desc: "Multi-signature consensus from trusted verifiers prevents false triggers and accidental releases." },
              { icon: FileDigit, title: "Granular Packets", desc: "Sort your digital life into private packets. Give the lawyer the will, and your spouse the photos." },
              { icon: Zap, title: "Emergency Rapid Release", desc: "For urgent scenarios, bypass standard wait times, mathematically subject to a strict 6-hour veto window." },
              { icon: Clock, title: "Configurable Grace Periods", desc: "Set your own timelines and check-in intervals tailored to your specific travel plans or lifestyle." }
            ].map((Feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-[#FDF9F1] p-8 rounded-3xl border border-orange-50/50 hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm text-[#FF8C00]">
                  <Feature.icon size={26} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{Feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{Feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works (Stepper) */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-24">
             <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Four Pillars of Digital Legacy Security</h2>
             <p className="text-xl text-gray-600">A failsafe process ensuring certainty in an uncertain world.</p>
          </div>

          <div className="space-y-24 relative before:absolute before:inset-0 before:ml-[28px] md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-orange-100 before:via-[#FF8C00] before:to-orange-100">
            {[
              {
                num: "01", title: "Client-Side Encryption", desc: "We never see your data.",
                detail: "Everything you upload is locked with AES-256 military-grade encryption in your browser. The keys strictly reside with your nominees.",
                visual: <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 font-mono text-center flex flex-col gap-3"><div className="text-gray-400 text-sm">"seed phrase: alpha..."</div><div className="text-[#FF8C00] animate-pulse"><Lock className="inline mr-2"/> Encrypting...</div><div className="text-xs text-gray-300 break-all">e2c569be17396eca2a2e3...</div></div>
              },
              {
                num: "02", title: "Organize Your Digital Life", desc: "Drag-and-drop organization.",
                detail: "Create specific packets for legal documents, crypto wallets, and personal letters. Assign them individually to different trusted nominees.",
                visual: <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3"><div className="flex bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300"><FileText className="text-gray-400 mr-3"/> Crypto Instructions</div><div className="flex bg-orange-50 p-3 rounded-xl border border-[#FF8C00]/30 shadow-sm"><FileText className="text-[#FF8C00] mr-3"/> Family Memories</div></div>
              },
              {
                num: "03", title: "Human Verification", desc: "No false positives.",
                detail: "When the heartbeat protocol stops, we require a 2/3 consensus from your predefined trusted contacts (e.g., Spouse, Attorney, Close Friend) before initiating the final transfer.",
                visual: <div className="flex items-center justify-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100"><div className="text-center"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle2/></div><span className="text-xs font-bold text-gray-600">Spouse</span></div><div className="text-center"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle2/></div><span className="text-xs font-bold text-gray-600">Attorney</span></div><div className="text-center opacity-40"><div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2"><Clock/></div><span className="text-xs font-bold text-gray-600">Friend</span></div></div>
              },
              {
                num: "04", title: "Emergency Release", desc: "When Every Second Counts.",
                detail: "If an emergency request is triggered by a verification partner, a strict 6-hour veto window begins. If you do not cancel it, the data is immediately released.",
                visual: <div className="bg-[#FF9EA2]/10 p-6 rounded-3xl border border-[#FF9EA2]/30 flex flex-col items-center justify-center"><AlertCircle className="text-[#FF9EA2] mb-3 w-8 h-8"/><div className="font-mono text-2xl font-bold text-[#FF9EA2]">05:59:59</div><div className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-wide">Veto Window Active</div></div>
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group border-t-0`}
              >
                {/* Number node */}
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white border-4 border-[#FDF9F1] shadow-md text-[#FF8C00] font-bold text-lg absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10">
                  {step.num}
                </div>
                
                {/* Content Box */}
                <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] ml-auto md:ml-0 md:group-odd:pl-16 md:group-even:pr-16">
                  <span className="block text-[#FF8C00] font-bold text-sm mb-2 uppercase tracking-wide">{step.desc}</span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">{step.detail}</p>
                  <div className="rounded-3xl overflow-hidden">
                    {step.visual}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-white border-t border-gray-100 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50 pointer-events-none" />
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center relative z-10 bg-white p-12 md:p-20 rounded-[3rem] shadow-2xl shadow-orange-900/5 ring-1 ring-gray-100"
         >
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Don't Leave Your Legacy to Chance</h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Every day, millions of dollars and countless precious memories are lost forever. Secure your digital legacy in less than 5 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
               <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                 <CheckCircle2 className="text-[#FF8C00] w-4 h-4"/> Zero-knowledge encryption
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                 <CheckCircle2 className="text-[#FF8C00] w-4 h-4"/> Multi-signature verification
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                 <CheckCircle2 className="text-[#FF8C00] w-4 h-4"/> Emergency rapid release
               </div>
            </div>

            <button onClick={onSignUpClick} className="px-10 py-5 rounded-full text-xl font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-xl shadow-orange-500/30 hover:scale-105 transition-all">
              Start Your Vault Today
            </button>
         </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-16 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
           <div className="col-span-2">
             <div className="flex items-center gap-2 text-[#FF8C00] font-bold text-2xl mb-4">
                <Shield className="w-8 h-8" />
                <span className="text-gray-900">The Final Transfer</span>
             </div>
             <p className="text-gray-500 max-w-sm">
                Cryptographically secure legacy management. Better 5 years earlier than 5 minutes later.
             </p>
           </div>
           
           <div>
             <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-sm">Product</h4>
             <ul className="space-y-4 text-gray-600 font-medium">
               <li><a href="#" className="hover:text-[#FF8C00] transition">Features</a></li>
               <li><a href="#" className="hover:text-[#FF8C00] transition">Security</a></li>
               <li><a href="#" className="hover:text-[#FF8C00] transition">Legal Portals</a></li>
             </ul>
           </div>

           <div>
             <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-sm">Legal</h4>
             <ul className="space-y-4 text-gray-600 font-medium">
               <li><a href="#" className="hover:text-[#FF8C00] transition">Privacy Policy</a></li>
               <li><a href="#" className="hover:text-[#FF8C00] transition">Terms of Service</a></li>
               <li><a href="#" className="hover:text-[#FF8C00] transition">Encryption Details</a></li>
             </ul>
           </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm font-medium">
          <p>© 2026 The Final Transfer. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
             <a href="#" className="hover:text-gray-900 transition">Twitter</a>
             <a href="#" className="hover:text-gray-900 transition">GitHub</a>
             <a href="#" className="hover:text-gray-900 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthModal({ isOpen, onClose, title, onSubmit, isSignUp }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800"><X size={24}/></button>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-500 mb-8">{isSignUp ? "Join thousands securing their legacy." : "Welcome back. Please enter your details."}</p>
        
        <form onSubmit={onSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none" placeholder="John Doe" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OTP Verification</label>
            <div className="relative flex gap-2">
              <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none font-mono tracking-widest text-center" placeholder="123456" maxLength={6} />
              <button type="button" className="px-6 rounded-2xl bg-orange-50 text-[#FF6A00] font-medium whitespace-nowrap hover:bg-orange-100">Send OTP</button>
            </div>
          </div>
          
          <button type="submit" className="w-full py-4 mt-4 rounded-full font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98]">
            {isSignUp ? "Complete Sign Up" : "Login Securely"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function Dashboard({ user, packets, assigned, onLogout }) {
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
              {user?.name.charAt(0)}
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
    // Mocking verification process start
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
              
              {/* Dynamic Status UI */}
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
  const [timeLeft, setTimeLeft] = useState(6 * 60 * 60); // 6 hours prototype

  useEffect(() => {
    // Speeding up timer slightly for prototype demo
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

function TrustedPortal({ onProceedToLegal, onBack }) {
  const [selection, setSelection] = useState(null);

  const handleSelection = (type) => {
    setSelection(type);
    if (type === 'pass_away') {
      setTimeout(() => onProceedToLegal(), 1500);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col">
       <header className="py-6 px-6 text-center shrink-0">
          <div className="inline-flex items-center justify-center gap-2 text-[#FF6A00] font-bold text-xl cursor-pointer" onClick={onBack}>
            <Rocket className="w-6 h-6" />
            <span>Final Transfer</span>
          </div>
       </header>

       <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20 max-w-2xl mx-auto w-full">
         <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 w-full text-center">
             <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-3xl font-bold text-[#FF6A00] mx-auto mb-6">
                JD
             </div>
             <h2 className="text-2xl font-bold mb-8">What is the current status of John Doe?</h2>
             
             <div className="flex flex-col gap-4">
                <button 
                  onClick={() => handleSelection('safe')}
                  className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${selection === 'safe' ? 'border-[#FF6A00] bg-orange-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={20}/></div>
                    <div className="text-left"><p className="font-bold text-lg">Safe & Fine</p><p className="text-xs text-gray-500">It's a false alarm.</p></div>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-gray-500" />
                </button>

                <button 
                  onClick={() => handleSelection('emergency')}
                  className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between group flex-wrap ${selection === 'emergency' ? 'border-[#FF9EA2] bg-red-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-10 h-10 bg-[#FF9EA2]/20 rounded-full flex items-center justify-center text-[#FF9EA2]"><AlertCircle size={20}/></div>
                    <div className="text-left"><p className="font-bold text-lg">Emergency</p><p className="text-xs text-gray-500">Hospitalized, unreachable, etc.</p></div>
                  </div>
                  {selection === 'emergency' && (
                     <div className="w-full mt-4 animate-in fade-in zoom-in-95">
                        <select className="w-full bg-white border border-[#FF9EA2]/40 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#FF9EA2]">
                          <option>Select Option...</option>
                          <option>Hospitalized</option>
                          <option>Accident</option>
                          <option>Trip / Out of Reach</option>
                          <option>Other</option>
                        </select>
                        <button className="w-full mt-3 py-3 rounded-xl bg-[#FF9EA2] text-white font-bold hover:bg-[#ff868b] transition">Submit Emergency Status</button>
                     </div>
                  )}
                </button>

                <button 
                  onClick={() => handleSelection('pass_away')}
                  className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${selection === 'pass_away' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700"><Lock size={20}/></div>
                    <div className="text-left"><p className="font-bold text-lg">Passed Away</p><p className="text-xs text-gray-500">Initiate final transfer protocols.</p></div>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-gray-500" />
                </button>
             </div>

             {selection === 'safe' && (
               <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in slide-in-from-bottom-2">
                 <p className="text-sm font-medium text-emerald-800">Majority marked Safe. Access denied to nominees. Please call your friend to check in on them!</p>
               </div>
             )}
         </div>
       </main>
    </motion.div>
  );
}

function LegalUploadPage({ onBack }) {
  const [step, setStep] = useState(1);
  const [fileUploaded, setFileUploaded] = useState(false);

  const handleUpload = () => {
    setFileUploaded(true);
    setStep(2);
    setTimeout(() => setStep(3), 3000); // Simulate verification
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full"><X size={20}/></button>
          <div className="flex items-center gap-2 text-[#FF6A00] font-bold">
            <Rocket className="w-5 h-5" />
            <span>Final Transfer • Legal Portal</span>
          </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
         <div className="mb-12">
            <h1 className="text-3xl font-extrabold mb-4">Support & Legal Procedure</h1>
            <p className="text-gray-600 max-w-2xl text-lg">
              To release John Doe's final packets to their nominees, we require official legal documentation. This ensures strict security and complies with final transfer protocols.
            </p>
         </div>

         {/* Stepper */}
         <div className="flex flex-col md:flex-row gap-4 mb-12">
            {[
              { id: 1, title: 'Upload Documents', desc: 'Death Certificate, Legal ID' },
              { id: 2, title: 'Source Verification', desc: 'Our team verifies with issuer' },
              { id: 3, title: 'Packets Released', desc: 'Nominees gain secure access' }
            ].map((s) => (
               <div key={s.id} className={`flex-1 p-5 rounded-2xl border-2 transition-all ${step >= s.id ? (step === s.id && s.id !== 3 ? 'border-[#FF8C00] bg-orange-50' : 'border-emerald-500 bg-emerald-50/30') : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                     <span className={`text-sm font-bold ${step >= s.id ? (step === s.id && s.id !== 3 ? 'text-[#FF8C00]' : 'text-emerald-600') : 'text-gray-400'}`}>Step {s.id}</span>
                     {step > s.id && <CheckCircle2 size={18} className="text-emerald-500" />}
                  </div>
                  <h4 className="font-bold text-lg mb-1">{s.title}</h4>
                  <p className="text-xs text-gray-500">{s.desc}</p>
               </div>
            ))}
         </div>

         {/* Upload Zone */}
         {step === 1 && (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer group" onClick={handleUpload}>
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform text-[#FF8C00]">
                 <UploadCloud size={32} />
               </div>
               <h3 className="text-xl font-bold mb-2">Click to Upload Documents</h3>
               <p className="text-gray-500 text-sm mb-6">PDF, JPEG, or PNG up to 10MB</p>
               <div className="inline-flex gap-2">
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-medium border border-gray-200 shadow-sm text-gray-600 flex items-center gap-1"><FileDigit size={12}/> Death Certificate</span>
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-medium border border-gray-200 shadow-sm text-gray-600 flex items-center gap-1"><User size={12}/> Nominee ID</span>
               </div>
            </div>
         )}

         {step === 2 && (
            <div className="text-center py-20 px-6 rounded-3xl bg-orange-50/50 border border-orange-100">
               <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-200 border-t-[#FF8C00] animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-[#FF8C00]"><ShieldCheck size={28}/></div>
               </div>
               <h3 className="text-2xl font-bold mb-2">Verifying Documents</h3>
               <p className="text-gray-600">Our legal team is verifying the uploaded certificate with the issuing authority. This typically takes 24-48 hours...</p>
            </div>
         )}

         {step === 3 && (
            <div className="text-center py-20 px-6 rounded-3xl bg-emerald-50/50 border border-emerald-100">
               <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                 <CheckCircle2 size={40} />
               </div>
               <h3 className="text-2xl font-bold mb-2">Verification Complete</h3>
               <p className="text-gray-600 mb-8 max-w-md mx-auto">The final transfer has been authorized. Encrypted packets have been released to the designated nominees.</p>
               <button onClick={onBack} className="px-8 py-3 rounded-full text-sm font-bold bg-white border border-gray-200 shadow-sm hover:shadow-md transition">Return Home</button>
            </div>
         )}
      </main>
    </motion.div>
  );
}
