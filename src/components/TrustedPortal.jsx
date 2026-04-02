import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, CheckCircle2, ChevronRight, AlertCircle, Lock } from 'lucide-react';

export default function TrustedPortal({ onProceedToLegal, onBack }) {
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
