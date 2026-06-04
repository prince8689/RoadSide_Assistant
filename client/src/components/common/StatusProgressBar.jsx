import { motion } from 'framer-motion';

const steps = [
  { key: 'pending',     label: 'Requested', icon: '📋' },
  { key: 'accepted',    label: 'Accepted',  icon: '✅' },
  { key: 'en_route',    label: 'On Way',    icon: '🚗' },
  { key: 'arrived',     label: 'Arrived',   icon: '📍' },
  { key: 'in_progress', label: 'Working',   icon: '🔧' },
  { key: 'completed',   label: 'Done',      icon: '🎉' },
];

const StatusProgressBar = ({ currentStatus }) => {
  const currentIndex = steps.findIndex(s => s.key === currentStatus);

  return (
    <div className="flex items-center justify-between w-full py-6 relative">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center flex-1 relative">
          
          {/* Circle */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{
              scale: index <= currentIndex ? 1.1 : 1,
              backgroundColor: index <= currentIndex ? '#FF6B35' : '#E9ECEF',
              color: index <= currentIndex ? '#FFFFFF' : '#6B7280'
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10 flex-shrink-0 shadow-sm transition-colors duration-300"
          >
            <span>{index <= currentIndex ? step.icon : index + 1}</span>
          </motion.div>

          {/* Label below */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold text-center w-16 text-dark mt-1">
            {step.label}
          </div>

          {/* Connecting line */}
          {index < steps.length - 1 && (
            <div className="flex-1 h-1.5 mx-1 bg-gray-200 relative overflow-hidden rounded-full">
              <motion.div
                initial={{ width: '0%' }}
                animate={{
                  width: index < currentIndex ? '100%' : '0%'
                }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="absolute top-0 left-0 h-full bg-primary"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatusProgressBar;
