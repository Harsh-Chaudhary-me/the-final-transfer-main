import { motion } from 'framer-motion';
import myLogo from '../assets/logo.svg';
import {
  Shield, ShieldCheck, Lock, Activity, Users, FileDigit,
  Zap, Clock, FileText, CheckCircle2, AlertCircle,
  Server, Key, EyeOff, ArrowRight, ShieldAlert,
  Wallet, Landmark, Instagram, Mail, Gavel, Siren
} from 'lucide-react';

export default function LandingPage({ onLoginClick, onSignUpClick }) {
  return (
    <div className="bg-[#FDF9F1] min-h-screen font-sans selection:bg-[#FF8C00] selection:text-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-[#FDF9F1]/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* <div className="flex items-center gap-2 text-[#FF8C00] font-bold text-xl">
            <Shield className="w-6 h-6" />
            <span className="text-gray-900">The Final Transfer</span>
          </div> */}
          {/* Changed <div> to <a> and added href="/" */}
          <a href="/" className="flex items-center gap-2 text-[#FF8C00] font-bold text-xl hover:opacity-90 transition-opacity cursor-pointer">
            <img
              src={myLogo}
              alt="The Final Transfer Logo"
              className="h-10 w-auto object-contain"
            />
          </a>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-24 relative"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl -z-10 animate-[pulse_3s_ease-in-out_infinite]" />
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block py-1 px-3 rounded-full bg-orange-100/80 text-[#FF8C00] text-xs font-bold tracking-widest uppercase mb-4 ring-1 ring-orange-200"
            >
              The Methodology
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C00] to-[#FF6A00]">Four Pillars</span> of Digital Legacy Security
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A failsafe process ensuring certainty in an uncertain world.
            </p>
          </motion.div>

          <div className="space-y-24 relative before:absolute before:inset-0 before:ml-[28px] md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-orange-100 before:via-[#FF8C00] before:to-orange-100">
            {/* Animated Light Beam on the Timeline
            <motion.div 
               animate={{ y: ["0%", "100%", "0%"] }} 
               transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
               className="absolute top-0 left-[28px] md:left-1/2 -ml-[1.5px] md:-ml-[2px] w-1.5 md:w-2 h-24 bg-white rounded-full shadow-[0_0_20px_8px_rgba(255,140,0,0.6)] z-0" 
            /> */}

            {[
              {
                num: "01", title: "Client-Side Encryption", desc: "We never see your data.",
                detail: "Everything you upload is locked with AES-256 military-grade encryption in your browser. The keys strictly reside with your nominees.",
                visual: (
                  <motion.div whileHover={{ scale: 1.02, y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 font-mono text-center flex flex-col gap-3 relative overflow-hidden group-hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 blur-3xl rounded-full" />
                    <div className="text-gray-400 text-sm">"seed phrase: alpha..."</div>
                    <motion.div
                      animate={{ color: ["#FF8C00", "#FF6A00", "#FF8C00"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-[#FF8C00] font-bold z-10 flex items-center justify-center gap-2"
                    >
                      <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                        <Lock size={18} />
                      </motion.div>
                      Encrypting...
                    </motion.div>
                    <div className="text-xs text-gray-300 break-all">e2c569be17396eca2a2e3...</div>
                  </motion.div>
                )
              },
              {
                num: "02", title: "Organize Your Digital Life", desc: "Drag-and-drop organization.",
                detail: "Create specific packets for legal documents, crypto wallets, and personal letters. Assign them individually to different trusted nominees.",
                visual: (
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative h-[140px] group-hover:shadow-lg transition-all overflow-hidden flex flex-col justify-center items-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50" />

                    {/* Removed motion.div and animation props - just a standard div now */}
                    <div className="flex items-center w-[90%] sm:w-[80%] bg-white p-2.5 rounded-xl border border-dashed border-gray-300 shadow-sm backdrop-blur-sm relative z-10">
                      <FileText className="text-gray-400 mr-3 w-4 h-4" />
                      <span className="text-sm font-medium text-gray-600">Crypto Instructions</span>
                    </div>

                    {/* Removed motion.div and animation props - just a standard div now */}
                    <div className="flex items-center w-[90%] sm:w-[80%] ml-4 sm:ml-8 mt-2 bg-gradient-to-r from-orange-50 to-white p-2.5 rounded-xl border border-[#FF8C00]/30 shadow-md backdrop-blur-sm relative z-20">
                      <FileText className="text-[#FF8C00] mr-3 w-4 h-4" />
                      <span className="text-sm font-bold text-gray-800">Family Memories</span>
                    </div>
                  </motion.div>
                )
              },
              {
                num: "03", title: "Human Verification", desc: "No false positives.",
                detail: "When the heartbeat protocol stops, we require a 2/3 consensus from your predefined trusted contacts (e.g., Spouse, Attorney, Close Friend) before initiating the final transfer.",
                visual: (
                  <motion.div whileHover={{ scale: 1.02 }} className="flex justify-center items-center gap-3 sm:gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-[140px] group-hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-50/20 via-transparent to-transparent pointer-events-none" />
                    <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center relative z-10 w-16">
                      <motion.div
                        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring" }}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 relative"
                      >
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-emerald-400 rounded-full blur-[6px] -z-10" />
                        <CheckCircle2 size={18} />
                      </motion.div>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-600">Spouse</span>
                    </motion.div>
                    <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center relative z-10 w-16">
                      <motion.div
                        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", delay: 0.1 }}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 relative"
                      >
                        <CheckCircle2 size={18} />
                      </motion.div>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-600">Attorney</span>
                    </motion.div>
                    <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center opacity-40 relative z-10 w-16">
                      <motion.div
                        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", delay: 0.2 }}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2"
                      >
                        <Clock size={18} />
                      </motion.div>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-600">Friend</span>
                    </motion.div>
                  </motion.div>
                )
              },
              {
                num: "04", title: "Emergency Release", desc: "When Every Second Counts.",
                detail: "If an emergency request is triggered by a verification partner, a strict 6-hour veto window begins. If you do not cancel it, the data is immediately released.",
                visual: (
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-white to-[#FF9EA2]/10 p-6 rounded-3xl border border-[#FF9EA2]/30 flex flex-col items-center justify-center relative overflow-hidden group-hover:shadow-[0_4px_20px_rgba(255,158,162,0.2)] transition-shadow h-[140px]">
                    <motion.div animate={{ opacity: [0.1, 0.25, 0.1], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-red-400 rounded-full blur-[20px] pointer-events-none" />
                    <div className="absolute inset-2 border-[2px] border-dashed border-red-300/30 rounded-2xl pointer-events-none" />

                    <div className="flex items-center justify-center gap-3 relative z-10 mb-1">
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                        <AlertCircle className="text-[#FF9EA2] w-6 h-6" />
                      </motion.div>
                      <div className="font-mono text-2xl font-bold text-[#FF9EA2] tracking-wider drop-shadow-sm">05:59:59</div>
                    </div>
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[10px] sm:text-xs font-bold text-red-500/80 mt-1 uppercase tracking-widest relative z-10 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                      Veto Window Active
                    </motion.div>
                  </motion.div>
                )
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40, y: 0 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group border-t-0`}
              >
                {/* Number node */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-white border-4 border-[#FDF9F1] shadow-[0_0_15px_rgba(255,140,0,0.15)] text-[#FF8C00] font-bold text-lg absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10 overflow-hidden group-hover:shadow-[0_0_25px_rgba(255,140,0,0.4)] group-hover:border-orange-50 transition-all duration-300"
                >
                  <motion.div animate={{ opacity: [0, 0.1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }} className="absolute inset-0 bg-orange-500" />
                  <span className="relative z-10">{step.num}</span>
                </motion.div>

                {/* Content Box */}
                <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] ml-auto md:ml-0 md:group-odd:pl-16 md:group-even:pr-16">
                  <span className="block text-[#FF8C00] font-bold text-sm mb-2 uppercase tracking-wide group-hover:text-orange-600 transition-colors">{step.desc}</span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-5 text-sm sm:text-base">{step.detail}</p>
                  <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
                  >
                    {step.visual}
                  </motion.div>
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
              <CheckCircle2 className="text-[#FF8C00] w-4 h-4" /> Zero-knowledge encryption
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <CheckCircle2 className="text-[#FF8C00] w-4 h-4" /> Multi-signature verification
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <CheckCircle2 className="text-[#FF8C00] w-4 h-4" /> Emergency rapid release
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
