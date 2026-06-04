import { motion } from 'framer-motion';

const VerificationBanner = ({ isVerified }) => {
  if (isVerified) {
    return (
      <motion.div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 shadow-sm">
        ✅ Verified Mechanic — You can receive service requests
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3 shadow-sm"
    >
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="font-semibold text-yellow-800">
          Account Pending Verification
        </p>
        <p className="text-sm text-yellow-600">
          Admin will verify your profile. You will be notified once verified.
        </p>
      </div>
    </motion.div>
  );
};

export default VerificationBanner;
