import { motion, AnimatePresence } from 'framer-motion';

const ConfirmDialog = ({ isOpen, title, message, confirmText, confirmColor, onConfirm, onCancel }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
        />
        {/* Dialog */}
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md pointer-events-auto"
          >
            <h3 className="text-xl font-bold text-dark mb-2">{title}</h3>
            <p className="text-muted mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="btn-outline px-6">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`btn-primary px-6 ${confirmColor || 'bg-red-500 hover:bg-red-600'}`}
              >
                {confirmText || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

export default ConfirmDialog;
