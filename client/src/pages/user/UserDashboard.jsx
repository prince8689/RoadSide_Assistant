import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiList, FiSettings, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCarSide } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { logoutThunk } from '../../store/authStore';
import NotificationBell from '../../components/common/NotificationBell';
import MobileNav from '../../components/common/MobileNav';

// Sections
import HomePage from './sections/HomePage';
import RequestHelpPage from './sections/RequestHelpPage';
import TrackingPage from './sections/TrackingPage';
import MyRequestsPage from './sections/MyRequestsPage';
import MyVehiclesPage from './sections/MyVehiclesPage';
import UserProfilePage from './sections/UserProfilePage';

const UserDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutThunk());
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

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

  const SidebarContent = ({ collapsed = false }) => (
    <>
      <div className={`p-6 mb-6 flex items-center overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'gap-2'}`}>
        <span className="text-primary text-3xl">🚗</span>
        {!collapsed && <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold text-white">RoadAssist</motion.h2>}
      </div>
      
      <div className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : undefined}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${collapsed ? 'justify-center px-0' : 'px-4'} ${
                isActive 
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="text-xl shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          );
        })}
      </div>
      <div className="p-4 pb-24 md:pb-4 border-t border-gray-800 md:border-none">
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center py-3 rounded-xl text-gray-400 hover:text-danger hover:bg-red-500/10 transition-all font-medium text-sm ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}
        >
          <FiLogOut className="text-xl shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Logout</span>}
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

      <aside className={`hidden md:flex flex-col bg-dark min-h-screen fixed left-0 top-0 z-30 shadow-2xl transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent collapsed={isSidebarCollapsed} />
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

      <main className={`flex-1 min-h-screen pt-16 md:pt-0 pb-20 md:pb-0 relative transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <header className="hidden md:flex justify-between items-center p-6 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4 text-dark">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <FiMenu />
            </button>
            <div>
              <h2 className="text-xl font-bold">Welcome back!</h2>
              <p className="text-sm text-gray-500">Need help? 24×7 Unique Toll-Free Helpline "1033" for road users on National Highways</p>
            </div>
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
            <Route path="/" element={<Navigate to="home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/request" element={<RequestHelpPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/requests" element={<MyRequestsPage />} />
            <Route path="/vehicles" element={<MyVehiclesPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
          </Routes>
        </div>
      </main>
      
      <MobileNav items={mobileNavItems} />
    </div>
  );
};

export default UserDashboard;
