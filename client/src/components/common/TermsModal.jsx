import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

const TermsModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          />

          {/* Modal Container to handle centering without transform conflicts */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
            >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-dark">Terms & Conditions</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <FiX />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 text-gray-600 space-y-4 text-sm leading-relaxed">
              <p>
                <strong>Welcome to RoadAssist!</strong> By registering as a User or Mechanic, you agree to comply with and be bound by the following terms and conditions.
              </p>
              
              <h3 className="text-dark font-bold text-base mt-6">1. User Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must provide accurate location and vehicle details when requesting assistance.</li>
                <li>You agree to pay the final calculated price upon completion of the service.</li>
                <li>Cancellations made after a mechanic has been dispatched may incur a cancellation fee.</li>
              </ul>

              <h3 className="text-dark font-bold text-base mt-6">2. Mechanic Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must maintain valid identification, licenses, and expertise as claimed during registration.</li>
                <li>You agree to provide professional and prompt service to all assigned users.</li>
                <li>You must update your status ("En Route", "Arrived", "Completed") accurately in the app.</li>
              </ul>

              <h3 className="text-dark font-bold text-base mt-6">3. Platform Fees & Payments</h3>
              <p>
                RoadAssist acts as a facilitator between users and mechanics. All payments made through the platform are secure. Mechanics will receive their payouts minus the agreed platform commission fee.
              </p>

              <h3 className="text-dark font-bold text-base mt-6">4. Liability</h3>
              <p>
                RoadAssist is not directly responsible for any physical damages caused to the vehicle during repair. However, we ensure all mechanics are background-checked and highly rated. In case of disputes, our support team will mediate.
              </p>
              
              <h3 className="text-dark font-bold text-base mt-6">5. Account Termination</h3>
              <p>
                We reserve the right to suspend or terminate any account (User or Mechanic) without prior notice if we detect fraudulent activity, continuous poor ratings, or violation of these terms.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={onClose}
                className="btn-primary py-2 px-6"
              >
                I Understand
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TermsModal;
