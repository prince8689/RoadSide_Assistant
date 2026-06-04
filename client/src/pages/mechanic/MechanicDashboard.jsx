import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiList, FiZap, FiDollarSign, FiStar, FiUser, FiLogOut, FiCheckCircle } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import useAuthStore from '../../store/authStore';
import useMechanicStore from '../../store/mechanicStore';
import useSocket from '../../hooks/useSocket';
import NotificationBell from '../../components/common/NotificationBell';

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
  
  useSocket(); // Sockets listen to events

  useEffect(() => {
    fetchProfile();
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/mechanic', icon: FiHome },
    { name: 'New Requests', path: '/mechanic/requests', icon: FiList },
    { name: 'Active Job', path: '/mechanic/active-job', icon: FiZap, color: 'text-primary' },
    { name: 'Earnings', path: '/mechanic/earnings', icon: FiDollarSign },
    { name: 'Reviews', path: '/mechanic/reviews', icon: FiStar },
    { name: 'Profile', path: '/mechanic/profile', icon: FiUser },
  ];

  const handleToggle = async () => {
    if (!profile) return alert('Please complete your profile first.');
    if (!profile.is_verified) return alert('Your profile is pending admin verification.');
    await toggleAvailability();
  };

  return (
    <div className="min-h-screen bg-light flex flex-col">
      {/* Navbar */}
      <nav className="bg-dark p-4 flex justify-between items-center text-white sticky top-0 z-40 shadow-sm">
        <div className="text-xl md:text-2xl font-bold text-primary flex items-center gap-2">
          <MdDirectionsCar className="text-white text-3xl" /> 
          <span className="hidden md:inline">RoadAssist Pro</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={handleToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-semibold
              ${isAvailable ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-400'}
            `}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            {isAvailable ? 'Available ▼' : 'Offline ▼'}
          </button>
          <NotificationBell />
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm overflow-hidden">
            <img src={`https://ui-avatars.com/api/?name=${user?.full_name}&background=16213E&color=fff`} alt="Avatar" />
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-dark border-r border-gray-800 hidden md:flex flex-col flex-shrink-0 text-gray-300">
          <div className="p-6 space-y-2 flex-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/mechanic' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm
                    ${isActive ? 'bg-secondary text-primary' : 'hover:bg-gray-800 hover:text-white'}
                  `}
                >
                  <item.icon className={`text-xl ${item.color || (isActive ? 'text-primary' : 'text-gray-400')}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="p-6 border-t border-gray-800">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-danger hover:bg-red-500/10 hover:text-red-400 transition-all font-medium text-sm"
            >
              <FiLogOut className="text-xl" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 mb-16 md:mb-0">
          {!profile && !isLoading && location.pathname !== '/mechanic/profile' && (
             <div className="bg-orange-100 border-l-4 border-primary text-orange-700 p-4 mb-6 rounded shadow-sm">
               <strong>Profile Incomplete:</strong> Please complete your profile to start accepting requests. <Link to="/mechanic/profile" className="underline font-bold">Complete Profile</Link>
             </div>
          )}
          {profile && !profile.is_verified && location.pathname !== '/mechanic/profile' && (
             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded shadow-sm">
               <strong>Pending Verification:</strong> Your profile is currently under review by an admin. You cannot receive requests yet.
             </div>
          )}
          <Routes>
            <Route path="/" element={<MechanicHomePage />} />
            <Route path="/requests" element={<NewRequestsPage />} />
            <Route path="/active-job" element={<ActiveJobPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/profile" element={<MechanicProfilePage />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark border-t border-gray-800 flex justify-around p-3 z-40 pb-safe text-gray-300">
        {navItems.slice(0, 5).map((item) => (
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

export default MechanicDashboard;
