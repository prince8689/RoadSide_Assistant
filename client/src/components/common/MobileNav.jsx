import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

// Bottom navigation bar for mobile
// Only visible on screens < 768px (md:hidden)

const MobileNav = ({ items }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-dark border-t border-white/10 z-50 md:hidden"
    >
      <div className="flex items-center justify-around py-2 px-4 pb-safe-area">
        {items.map((item) => {
          const isActive = location.pathname.includes(item.path) || location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 relative"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.2 : 1,
                  color: isActive ? '#FF6B35' : '#6C757D'
                }}
                className="text-2xl"
              >
                {item.icon}
              </motion.div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabMobile"
                  className="absolute top-0 w-8 h-1 bg-primary rounded-b-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MobileNav;
