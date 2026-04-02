import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';

export default function SplashScreen() {
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
