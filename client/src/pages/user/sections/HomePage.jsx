import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import { MdHardware, MdRvHookup, MdBatteryChargingFull, MdTireRepair, MdLocalGasStation, MdMoreHoriz, MdArrowForward } from 'react-icons/md';
import useAuthStore from '../../../store/authStore';
import useRequestStore from '../../../store/requestStore';

const HomePage = () => {
  const { user } = useAuthStore();
  const { activeRequest, requests, fetchActiveRequest, fetchMyRequests } = useRequestStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveRequest();
    fetchMyRequests();
  }, []);

  const services = [
    { name: 'Breakdown', icon: MdHardware, color: 'text-orange-500', bg: 'bg-orange-100' },
    { name: 'Towing', icon: MdRvHookup, color: 'text-blue-500', bg: 'bg-blue-100' },
    { name: 'Battery', icon: MdBatteryChargingFull, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    { name: 'Tire Issue', icon: MdTireRepair, color: 'text-gray-700', bg: 'bg-gray-200' },
    { name: 'Fuel', icon: MdLocalGasStation, color: 'text-green-500', bg: 'bg-green-100' },
    { name: 'More', icon: MdMoreHoriz, color: 'text-purple-500', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark">Good Morning, {user?.full_name.split(' ')[0]}! 👋</h1>
        <p className="text-muted mt-1">Your vehicle protection starts here.</p>
      </div>

      {/* SOS Button */}
      <div className="bg-white p-6 rounded-2xl shadow-card text-center border-l-4 border-primary">
        <h2 className="text-lg font-bold text-dark mb-4">Emergency on the road?</h2>
        <button
          onClick={() => navigate('/dashboard/request')}
          className="w-full bg-primary text-white font-bold text-xl py-5 rounded-2xl shadow-lg hover:bg-orange-600 transition-all hover:scale-[1.02] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          <span className="relative z-10 flex items-center justify-center gap-2">
            🚨 REQUEST EMERGENCY HELP
          </span>
        </button>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="text-lg font-bold text-dark mb-4">Our Services</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {services.map((svc) => (
            <button key={svc.name} onClick={() => navigate('/dashboard/request')} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${svc.bg} flex items-center justify-center`}>
                <svc.icon className={`text-2xl ${svc.color}`} />
              </div>
              <span className="text-sm font-medium text-dark">{svc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Request Widget */}
      {activeRequest && (
        <div className="bg-white p-6 rounded-2xl shadow-card border-l-4 border-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-dark">Active Service Request</h3>
            <span className={`badge-${activeRequest.status}`}>{activeRequest.status.toUpperCase()}</span>
          </div>
          <p className="text-muted mb-4">Mechanic is currently assigned and working on your request.</p>
          <button onClick={() => navigate('/dashboard/tracking')} className="btn-outline w-full flex items-center justify-center gap-2">
            Track Live Status <MdArrowForward />
          </button>
        </div>
      )}

      {/* Recent Requests */}
      {requests.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-dark">Recent Requests</h3>
            <Link to="/dashboard/requests" className="text-primary text-sm font-medium hover:underline">View All</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {requests.slice(0, 3).map(req => (
              <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-dark">{req.service?.name || 'Service'}</span>
                  <span className={`badge-${req.status}`}>{req.status}</span>
                </div>
                <div className="text-xs text-muted flex items-center gap-1">
                  <FiClock /> {new Date(req.created_at).toLocaleDateString()}
                </div>
                <div className="mt-2 text-sm text-dark font-medium">₹{req.estimated_price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
