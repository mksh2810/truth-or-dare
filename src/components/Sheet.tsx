import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative w-full max-w-[430px] bg-paper border-t-2 border-x-2 border-ink shadow-hard-lg rounded-t-2xl p-6 safe-bottom max-h-[85dvh] overflow-y-auto z-10"
          >
            {/* Grab handle indicator */}
            <div className="w-12 h-1.5 bg-ink/30 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-ink">
              {title && (
                <h3 className="font-display text-xl font-bold text-ink">
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-full border-2 border-ink bg-chit text-ink font-mono font-bold flex items-center justify-center btn-press text-xs"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
