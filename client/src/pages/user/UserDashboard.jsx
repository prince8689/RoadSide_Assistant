import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiList, FiUser, FiLogOut } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';
import NotificationBell from '../../components/common/NotificationBell';

// Sections
import HomePage from './sections/HomePage';
import RequestHelpPage from './sections/RequestHelpPage';
import TrackingPage from './sections/TrackingPage';
import MyRequestsPage from './sections/MyRequestsPage';

const UserDashboard = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize Socket.io listeners
  useSocket();

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: FiHome },
    { name: 'Get Help', path: '/dashboard/request', icon: FiAlertCircle, color: 'text-primary' },
    { name: 'My Requests', path: '/dashboard/requests', icon: FiList },
    { name: 'My Vehicles', path: '/dashboard/vehicles', icon: MdDirectionsCar },
    { name: 'Profile', path: '/dashboard/profile', icon: FiUser },
  ];

  return (
    <div className="min-h-screen bg-light flex flex-col">
      {/* Navbar */}
      <nav className="bg-dark p-4 flex justify-between items-center text-white sticky top-0 z-40">
        <div className="text-2xl font-bold text-primary flex items-center gap-2">
          <MdDirectionsCar className="text-white text-3xl" /> RoadAssist
        </div>
        <div className="flex items-center gap-6">
          <NotificationBell />
          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0)}
            </div>
            <span className="font-medium text-sm">{user?.full_name}</span>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:block flex-shrink-0">
          <div className="p-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm
                    ${isActive ? 'bg-orange-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-dark'}
                  `}
                >
                  <item.icon className={`text-xl ${item.color || (isActive ? 'text-primary' : 'text-gray-400')}`} />
                  {item.name}
                </Link>
              );
            })}
            <hr className="my-4 border-gray-100" />
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-danger hover:bg-red-50 transition-all font-medium text-sm"
            >
              <FiLogOut className="text-xl" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 mb-16 md:mb-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/request" element={<RequestHelpPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/requests" element={<MyRequestsPage />} />
            {/* Placeholders for vehicles and profile */}
            <Route path="/vehicles" element={<div>Vehicles Page Coming Soon</div>} />
            <Route path="/profile" element={<div>Profile Page Coming Soon</div>} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-40 pb-safe">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center gap-1 p-2 ${location.pathname === item.path ? 'text-primary' : 'text-gray-400'}`}
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
