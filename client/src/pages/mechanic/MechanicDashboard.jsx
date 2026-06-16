import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FiHome, FiTool, FiList, FiSettings, FiLogOut, FiMenu, FiX, FiCheckCircle, FiDollarSign, FiStar, FiClock, FiXCircle } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { logoutThunk } from '../../store/authStore';
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
import MechanicServicesPage from './sections/MechanicServicesPage';

const MechanicDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutThunk());
  const { profile, isAvailable, toggleAvailability, fetchProfile, isLoading } = useMechanicStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  useSocket(); // Sockets listen to events

  useEffect(() => {
    fetchProfile();
    if (!user || user.role !== 'mechanic') navigate('/login');
  }, [user, navigate, fetchProfile]);

  const navItems = [
    { name: 'Dashboard', path: '/mechanic/home', icon: FiHome },
    { name: 'New Requests', path: '/mechanic/requests', icon: FiList },
    { name: 'Active Job', path: '/mechanic/job', icon: FiTool },
    { name: 'Services Pricing', path: '/mechanic/services', icon: FiDollarSign },
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

  const isSuspended = user?.suspension_end_date && new Date(user.suspension_end_date) > new Date();
  const isBanned = user?.is_banned;
  const isRestricted = isBanned || isSuspended;

  const handleToggle = async () => {
    if (isRestricted) return alert('Your account is restricted. You cannot go online.');
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

      <aside className={`hidden md:flex flex-col w-64 bg-dark min-h-screen fixed left-0 top-0 z-30 shadow-2xl transition-transform duration-300 ${isDesktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

      <main className={`flex-1 min-h-screen pt-16 md:pt-0 pb-20 md:pb-0 relative transition-all duration-300 ${isDesktopSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <header className="hidden md:flex justify-between items-center p-6 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} 
              className="text-gray-600 hover:text-dark text-2xl p-1 focus:outline-none"
            >
              <FiMenu />
            </button>
            <h2 className="text-xl font-bold text-dark">Partner Portal</h2>
          </div>
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
          {profile && !profile.is_verified && profile.rejection_reason && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
              <div className="text-red-500 mt-0.5"><FiX size={20} /></div>
              <div>
                <h3 className="font-bold text-red-800">Verification Rejected</h3>
                <p className="text-sm text-red-700 mt-1">
                  Your mechanic application was rejected for the following reason: <br />
                  <strong className="block mt-2 bg-white/50 p-2 rounded border border-red-100">{profile.rejection_reason}</strong>
                </p>
                <p className="text-xs text-red-600 mt-2">Please update your profile details and contact support to re-apply.</p>
              </div>
            </div>
          )}

          {!profile && !isLoading && location.pathname !== '/mechanic/profile' && (
             <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded shadow-sm">
               <strong>Profile Incomplete:</strong> Please complete your profile to start accepting requests.
             </div>
          )}
          
          {profile && !profile.is_verified && location.pathname !== '/mechanic/profile' ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-8 mb-6 rounded-xl shadow-sm text-center">
               <FiClock className="mx-auto text-5xl text-yellow-500 mb-4" />
               <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
               <p>Your profile is currently under review by an administrator. You will be able to access the dashboard and accept requests once your account is verified.</p>
               <button onClick={() => navigate('/mechanic/profile')} className="mt-6 bg-yellow-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-yellow-600 transition-colors">Go to Profile</button>
            </div>
          ) : isRestricted ? (
            <div className="bg-red-50 border-l-4 border-red-600 text-red-800 p-8 mb-6 rounded-xl shadow-sm text-center max-w-2xl mx-auto mt-10">
               <FiXCircle className="mx-auto text-6xl text-red-600 mb-4" />
               <h2 className="text-3xl font-bold mb-3">{isBanned ? 'Account Permanently Banned' : 'Account Suspended'}</h2>
               <p className="text-lg">
                 {isBanned 
                  ? 'Your account has been permanently disabled due to severe or repeated violations of our community guidelines.'
                  : `Your account is temporarily suspended due to a violation of our policies. You will regain access on ${new Date(user.suspension_end_date).toLocaleString()}.`}
               </p>
               <div className="mt-6 p-4 bg-white rounded-lg border border-red-100 text-sm">
                  <p>If you believe this was an error, please contact support.</p>
               </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="home" replace />} />
              <Route path="/home" element={<MechanicHomePage />} />
              <Route path="/requests" element={<NewRequestsPage />} />
              <Route path="/job" element={<ActiveJobPage />} />
              <Route path="/services" element={<MechanicServicesPage />} />
              <Route path="/earnings" element={<EarningsPage />} />
              <Route path="/history" element={<ReviewsPage />} />
              <Route path="/profile" element={<MechanicProfilePage />} />
            </Routes>
          )}
        </div>
      </main>
      
      <MobileNav items={mobileNavItems} />
    </div>
  );
};

export default MechanicDashboard;
