import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-ink text-paper font-mono text-xs font-bold rounded-btn border-2 border-white shadow-hard flex items-center gap-2 max-w-[340px] text-center"
        >
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
