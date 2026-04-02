import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, X, CheckCircle2, UploadCloud, FileDigit, User, ShieldCheck } from 'lucide-react';

export default function LegalUploadPage({ onBack }) {
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
            </div>
         )}
      </main>
    </motion.div>
  );
}
