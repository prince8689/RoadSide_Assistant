import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiTool, FiList, FiFolder, FiPieChart, FiSettings, FiLogOut, FiBell } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useAdminStore from '../../store/adminStore';
import useSocket from '../../hooks/useSocket';

// Sections
import AdminHomePage from './sections/AdminHomePage';
import UsersPage from './sections/UsersPage';
import MechanicsPage from './sections/MechanicsPage';
import RequestsPage from './sections/RequestsPage';
import CategoriesPage from './sections/CategoriesPage';
import ReportsPage from './sections/ReportsPage';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const { stats, fetchStats } = useAdminStore();
  const location = useLocation();
  const navigate = useNavigate();

  useSocket(); // Start listening to admin sockets

  useEffect(() => {
    fetchStats();
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: FiHome },
    { name: 'Users', path: '/admin/users', icon: FiUsers },
    { name: 'Mechanics', path: '/admin/mechanics', icon: FiTool },
    { name: 'Requests', path: '/admin/requests', icon: FiList },
    { name: 'Categories', path: '/admin/categories', icon: FiFolder },
    { name: 'Reports', path: '/admin/reports', icon: FiPieChart },
    { name: 'Settings', path: '/admin/settings', icon: FiSettings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="bg-dark text-white px-6 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-white p-2 rounded-lg">
            <FiTool className="text-xl" />
          </div>
          <span className="font-bold text-xl tracking-wide">RoadAssist <span className="text-primary font-normal">Admin</span></span>
        </div>
        <div className="flex items-center gap-5">
          <button className="relative text-gray-400 hover:text-white transition-colors">
            <FiBell className="text-xl" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-dark"></span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user?.full_name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold overflow-hidden border border-gray-600">
              <img src={`https://ui-avatars.com/api/?name=${user?.full_name}&background=16213E&color=fff`} alt="Admin" />
            </div>
            <button onClick={logout} className="ml-2 text-gray-400 hover:text-red-400 transition-colors" title="Logout">
              <FiLogOut className="text-lg" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-dark text-gray-400 flex flex-col flex-shrink-0 border-r border-gray-800 overflow-y-auto">
          <div className="p-4 space-y-1 flex-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-primary text-white shadow-md' : 'hover:bg-secondary hover:text-white'
                  }`}
                >
                  <item.icon className={`text-lg ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Live Stats Widget */}
          <div className="p-6 m-4 bg-secondary rounded-2xl border border-gray-700">
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
        </aside>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Routes>
            <Route path="/" element={<AdminHomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/mechanics" element={<MechanicsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<div className="text-muted">Settings placeholder</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
