import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiTool, FiList, FiFolder, FiPieChart, FiSettings, FiLogOut, FiBell, FiMenu, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { logoutThunk } from '../../store/authStore';
import useAdminStore from '../../store/adminStore';
import useSocket from '../../hooks/useSocket';
import NotificationBell from '../../components/common/NotificationBell';
import MobileNav from '../../components/common/MobileNav';

// Sections
import AdminHomePage from './sections/AdminHomePage';
import UsersPage from './sections/UsersPage';
import MechanicsPage from './sections/MechanicsPage';
import RequestsPage from './sections/RequestsPage';
import CategoriesPage from './sections/CategoriesPage';
import ReportsPage from './sections/ReportsPage';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutThunk());
  const { stats, fetchStats } = useAdminStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useSocket(); // Start listening to admin sockets

  useEffect(() => {
    fetchStats();
    if (!user || user.role !== 'admin') navigate('/login');
  }, [user, navigate, fetchStats]);

  const navItems = [
    { name: 'Dashboard', path: '/admin/home', icon: FiHome },
    { name: 'Users', path: '/admin/users', icon: FiUsers },
    { name: 'Mechanics', path: '/admin/mechanics', icon: FiTool },
    { name: 'Requests', path: '/admin/requests', icon: FiList },
    { name: 'Categories', path: '/admin/categories', icon: FiFolder },
    { name: 'Reports', path: '/admin/reports', icon: FiPieChart },
  ];

  const mobileNavItems = [
    { path: '/admin/home',      icon: <FiHome />, label: 'Home' },
    { path: '/admin/users',     icon: <FiUsers />, label: 'Users' },
    { path: '/admin/requests',  icon: <FiList />, label: 'Requests' },
    { path: '/admin/mechanics', icon: <FiTool />, label: 'Mechanics' },
    { path: '/admin/reports',   icon: <FiPieChart />, label: 'Reports' },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 mb-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-primary text-3xl">🛡️</span> AdminPanel
        </h2>
      </div>
      
      <div className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path) || (item.path === '/admin/home' && location.pathname === '/admin');
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

        {/* Live Stats Widget */}
        <div className="mt-8 p-4 bg-secondary rounded-2xl border border-gray-700">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live System
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Online Users</span>
              <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{stats?.online_users || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Active Jobs</span>
              <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{stats?.active_jobs || 0}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm"
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
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="mr-3 text-white text-2xl p-1"
        >
          <FiMenu />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">🛡️</span>
          <span className="text-white font-bold text-lg">AdminPanel</span>
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
            <h2 className="text-xl font-bold">Admin Portal</h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-md">
                {user?.full_name?.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-dark">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<AdminHomePage />} />
            <Route path="/home" element={<AdminHomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/mechanics" element={<MechanicsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </div>
      </main>
      <MobileNav items={mobileNavItems} />
    </div>
  );
};

export default AdminDashboard;
