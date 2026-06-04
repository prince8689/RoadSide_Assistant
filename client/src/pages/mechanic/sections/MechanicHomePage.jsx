import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiStar, FiTool, FiCheckCircle, FiDollarSign, FiMapPin } from 'react-icons/fi';
import useAuthStore from '../../../store/authStore';
import useMechanicStore from '../../../store/mechanicStore';
import { updateLocation } from '../../../api/mechanicApi';

const MechanicHomePage = () => {
  const { user } = useAuthStore();
  const { profile, stats, fetchStats, isAvailable } = useMechanicStore();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const toggleLocationSharing = () => {
    if (!sharing) {
      if (!navigator.geolocation) return toast.error('Geolocation not supported');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation(pos.coords.latitude, pos.coords.longitude)
            .then(() => {
              toast.success('Location updated successfully');
              setSharing(true);
            })
            .catch(() => toast.error('Failed to update location'));
        },
        () => toast.error('Could not get location')
      );
    } else {
      setSharing(false);
      toast.success('Location sharing stopped');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark">Welcome, {user?.full_name.split(' ')[0]}! 👋</h1>
        <p className="text-muted mt-1">{profile?.business_name || 'Complete your profile to get started'}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <FiStar className="text-3xl text-yellow-500 mb-2" />
          <span className="text-2xl font-bold text-dark">{stats?.rating || '0.0'}</span>
          <span className="text-sm text-muted">Rating</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <FiTool className="text-3xl text-blue-500 mb-2" />
          <span className="text-2xl font-bold text-dark">{stats?.total_jobs || 0}</span>
          <span className="text-sm text-muted">Total Jobs</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <FiCheckCircle className="text-3xl text-green-500 mb-2" />
          <span className="text-2xl font-bold text-dark">{stats?.completed_jobs || 0}</span>
          <span className="text-sm text-muted">Done</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <FiDollarSign className="text-3xl text-primary mb-2" />
          <span className="text-2xl font-bold text-dark">₹{stats?.total_earnings || 0}</span>
          <span className="text-sm text-muted">Earned</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions / Location */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
          <h3 className="text-lg font-bold text-dark">Quick Actions</h3>
          <button 
            onClick={toggleLocationSharing}
            disabled={!isAvailable}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              !isAvailable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
              sharing ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-primary text-white hover:bg-orange-600 shadow-md'
            }`}
          >
            <FiMapPin /> {sharing ? 'Location Sharing ON' : 'Share Current Location'}
          </button>
          {!isAvailable && <p className="text-xs text-muted text-center">You must be 'Available' to share location.</p>}
        </div>

        {/* Shortcuts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-bold text-dark">Dashboard Hub</h3>
          <button onClick={() => navigate('/mechanic/requests')} className="w-full btn-outline flex justify-between items-center bg-gray-50">
            <span>View New Requests</span>
            <span className="text-primary font-bold">→</span>
          </button>
          <button onClick={() => navigate('/mechanic/active-job')} className="w-full btn-outline flex justify-between items-center bg-gray-50 border-blue-200 text-blue-600">
            <span>Go to Active Job</span>
            <span className="font-bold">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MechanicHomePage;
