import { motion } from 'framer-motion';

const EmptyState = ({ icon, title, description, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="text-6xl mb-4 text-gray-300">{icon}</div>
    <h3 className="text-xl font-bold text-dark mb-2">{title}</h3>
    <p className="text-muted max-w-sm mb-6">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="btn-primary px-8"
      >
        {action.label}
      </button>
    )}
  </motion.div>
);

export default EmptyState;
