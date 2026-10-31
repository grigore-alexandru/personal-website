'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalBehavior } from '@/hooks/useModalBehavior';

/**
 * Bottom sheet on the phone (drag the handle down to close), centred dialog from 768 px.
 * Portalled to <body> so the sticky, blurred header can't trap it.
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const controls = useDragControls();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useModalBehavior(open, onClose);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full md:max-w-lg max-h-[88dvh] md:max-h-[85vh] flex flex-col rounded-t-3xl md:rounded-2xl bg-white shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="flex-shrink-0 flex items-center justify-center pt-2.5 pb-1 cursor-grab touch-none md:hidden" onPointerDown={(e) => controls.start(e)}>
              <span className="h-1.5 w-10 rounded-full bg-neutral-300" />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide"
              className="absolute right-3 top-3 z-10 w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm"
            >
              <X size={18} />
            </button>
            <div className="overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
