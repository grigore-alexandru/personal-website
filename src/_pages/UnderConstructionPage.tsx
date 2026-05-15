import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';

export default function UnderConstructionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="inline-block mb-8"
        >
          <Wrench className="w-24 h-24 text-slate-400" />
        </motion.div>

        <h1 className="text-5xl font-bold text-slate-800 mb-4">
          Under Construction
        </h1>

        <p className="text-xl text-slate-600 mb-8">
          This page is currently being built. Check back soon for updates!
        </p>

        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-slate-400 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
