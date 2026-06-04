import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiList, FiSettings, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCarSide } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import NotificationBell from '../../components/common/NotificationBell';
import MobileNav from '../../components/common/MobileNav';

// Sections
import HomePage from './sections/HomePage';
import RequestHelpPage from './sections/RequestHelpPage';
import TrackingPage from './sections/TrackingPage';
import MyRequestsPage from './sections/MyRequestsPage';

const UserDashboard = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const navItems = [
    { name: 'Home', path: '/dashboard/home', icon: FiHome },
    { name: 'Request Service', path: '/dashboard/request', icon: FiAlertCircle },
    { name: 'My Requests', path: '/dashboard/requests', icon: FiList },
    { name: 'Vehicles', path: '/dashboard/vehicles', icon: FaCarSide },
    { name: 'Profile', path: '/dashboard/profile', icon: FiSettings },
  ];

  const mobileNavItems = [
    { path: '/dashboard/home', icon: <FiHome />, label: 'Home' },
    { path: '/dashboard/request', icon: <FiAlertCircle />, label: 'Help' },
    { path: '/dashboard/requests', icon: <FiList />, label: 'Requests' },
    { path: '/dashboard/vehicles', icon: <FaCarSide />, label: 'Vehicles' },
    { path: '/dashboard/profile', icon: <FiSettings />, label: 'Profile' },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-primary text-3xl">🚗</span> RoadAssist
        </h2>
      </div>
      
      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="text-lg" />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="p-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-danger hover:bg-red-500/10 transition-all font-medium text-sm"
        >
          <FiLogOut className="text-lg" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-light font-sans flex flex-col md:flex-row">
      <nav className="fixed top-0 left-0 right-0 bg-dark z-30 h-16 flex items-center px-4 md:hidden border-b border-gray-800">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="mr-3 text-white text-2xl p-1"
        >
          <FiMenu />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">🚗</span>
          <span className="text-white font-bold text-lg">RoadAssist</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {user?.full_name?.charAt(0)}
          </div>
        </div>
      </nav>

      <aside className="hidden md:flex flex-col w-64 bg-dark min-h-screen fixed left-0 top-0 z-30 shadow-2xl">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-dark z-50 md:hidden flex flex-col shadow-2xl"
            >
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
              >
                <FiX className="text-2xl" />
              </button>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-h-screen pt-16 md:pt-0 md:ml-64 pb-20 md:pb-0 relative">
        <header className="hidden md:flex justify-between items-center p-6 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <div className="text-dark">
            <h2 className="text-xl font-bold">Welcome back!</h2>
            <p className="text-sm text-gray-500">Need help? We're just a click away.</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-md">
                {user?.full_name?.charAt(0)}
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-sm font-bold text-dark">{user?.full_name}</p>
                <p className="text-xs text-gray-500 cursor-pointer hover:text-primary">View Profile</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route path="/request" element={<RequestHelpPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/requests" element={<MyRequestsPage />} />
            <Route path="/vehicles" element={<div>Vehicles Page Coming Soon</div>} />
            <Route path="/profile" element={<div>Profile Page Coming Soon</div>} />
          </Routes>
          >
            <item.icon className="text-xl" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;
