import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiTool, FiList, FiSettings, FiLogOut, FiMenu, FiX, FiCheckCircle, FiDollarSign, FiStar } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useMechanicStore from '../../store/mechanicStore';
import useSocket from '../../hooks/useSocket';
import NotificationBell from '../../components/common/NotificationBell';
import MobileNav from '../../components/common/MobileNav';

// Sections
import MechanicHomePage from './sections/MechanicHomePage';
import NewRequestsPage from './sections/NewRequestsPage';
import ActiveJobPage from './sections/ActiveJobPage';
import EarningsPage from './sections/EarningsPage';
import ReviewsPage from './sections/ReviewsPage';
import MechanicProfilePage from './sections/MechanicProfilePage';

const MechanicDashboard = () => {
  const { user, logout } = useAuthStore();
  const { profile, isAvailable, toggleAvailability, fetchProfile, isLoading } = useMechanicStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useSocket(); // Sockets listen to events

  useEffect(() => {
    fetchProfile();
    if (!user || user.role !== 'mechanic') navigate('/login');
  }, [user, navigate, fetchProfile]);

  const navItems = [
    { name: 'Dashboard', path: '/mechanic/home', icon: FiHome },
    { name: 'New Requests', path: '/mechanic/requests', icon: FiList },
    { name: 'Active Job', path: '/mechanic/job', icon: FiTool },
    { name: 'Service History', path: '/mechanic/history', icon: FiCheckCircle },
    { name: 'Earnings', path: '/mechanic/earnings', icon: FiDollarSign },
    { name: 'Profile', path: '/mechanic/profile', icon: FiSettings },
  ];

  const mobileNavItems = [
    { path: '/mechanic/home',     icon: <FiHome />, label: 'Home' },
    { path: '/mechanic/requests', icon: <FiList />, label: 'Requests' },
    { path: '/mechanic/job',      icon: <FiTool />, label: 'Active' },
    { path: '/mechanic/history', icon: <FiCheckCircle />, label: 'History' },
    { path: '/mechanic/profile',  icon: <FiSettings />, label: 'Profile' },
  ];

  const handleToggle = async () => {
    if (!profile) return alert('Please complete your profile first.');
    if (!profile.is_verified) return alert('Your profile is pending admin verification.');
    await toggleAvailability();
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MdDirectionsCar className="text-primary text-3xl" /> MechanicPanel
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
      <div className="p-6 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
        >
          <FiLogOut className="text-xl" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-light font-sans flex flex-col md:flex-row">
      <nav className="fixed top-0 left-0 right-0 bg-dark z-30 h-16 flex items-center px-4 md:hidden border-b border-gray-800">
        <button onClick={() => setIsSidebarOpen(true)} className="mr-3 text-white text-2xl p-1">
          <FiMenu />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white font-bold text-lg">MechanicPanel</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleToggle} className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></button>
          <NotificationBell />
        </div>
      </nav>

      <aside className="hidden md:flex flex-col w-64 bg-dark min-h-screen fixed left-0 top-0 z-30 shadow-2xl">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed left-0 top-0 bottom-0 w-72 bg-dark z-50 md:hidden flex flex-col shadow-2xl">
              <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2">
                <FiX className="text-2xl" />
              </button>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-h-screen pt-16 md:pt-0 md:ml-64 pb-20 md:pb-0 relative">
        <header className="hidden md:flex justify-between items-center p-6 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <h2 className="text-xl font-bold text-dark">Partner Portal</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-semibold ${isAvailable ? 'bg-green-500/20 border-green-500 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-600'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {isAvailable ? 'Available' : 'Offline'}
            </button>
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">{user?.full_name?.charAt(0)}</div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {!profile && !isLoading && location.pathname !== '/mechanic/profile' && (
             <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded shadow-sm">
               <strong>Profile Incomplete:</strong> Please complete your profile to start accepting requests.
             </div>
          )}
          <Routes>
            <Route path="/home" element={<MechanicHomePage />} />
            <Route path="/requests" element={<NewRequestsPage />} />
            <Route path="/job" element={<ActiveJobPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/history" element={<ReviewsPage />} />
            <Route path="/profile" element={<MechanicProfilePage />} />
          </Routes>
        </div>
      </main>
      
      <MobileNav items={mobileNavItems} />
    </div>
  );
};

export default MechanicDashboard;
