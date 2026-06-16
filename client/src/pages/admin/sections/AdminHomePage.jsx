import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiTool, FiCheckCircle, FiList, FiZap, FiClock, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useAdminStore from '../../../store/adminStore';
import StatsCard from '../../../components/admin/StatsCard';
import StatusBadge from '../../../components/admin/StatusBadge';
import PageTransition from '../../../components/common/PageTransition';

const AdminHomePage = () => {
  const { stats, fetchStats, pendingMechanics, fetchPendingMechanics, requests, fetchRequests } = useAdminStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchPendingMechanics();
    fetchRequests({ limit: 5 }); // recent 5
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-dark">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time statistics and system alerts.</p>
      </div>

      {pendingMechanics.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
              <FiAlertTriangle className="text-lg" />
            </div>
            <div>
              <h3 className="font-bold text-yellow-800">Pending Verifications</h3>
              <p className="text-sm text-yellow-700">{pendingMechanics.length} mechanics are waiting for profile approval.</p>
            </div>
          </div>
          <button onClick={() => navigate('/admin/mechanics')} className="px-4 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-700 transition">
            Review Now &rarr;
          </button>
        </div>
      )}

      {/* Stats Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={stats?.total_users || 0} icon={FiUsers} color="blue" trend={stats?.users_trend || 0} />
        <StatsCard title="Total Mechanics" value={stats?.total_mechanics || 0} icon={FiTool} color="orange" trend={stats?.mechanics_trend || 0} />
        <StatsCard title="Verified Mechanics" value={stats?.verified_mechanics || 0} icon={FiCheckCircle} color="green" />
        <StatsCard title="Pending Verify" value={stats?.pending_mechanics || pendingMechanics.length || 0} icon={FiClock} color="purple" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Requests" value={stats?.total_requests || 0} icon={FiList} color="blue" trend={stats?.requests_trend || 0} />
        <StatsCard title="Active Jobs" value={stats?.active_jobs || 0} icon={FiZap} color="orange" />
        <StatsCard title="Total Earnings" value={`₹${stats?.total_earnings || 0}`} icon={FiCheckCircle} color="green" trend={stats?.earnings_trend || 0} />
        <StatsCard title="Avg Rating" value={`${stats?.avg_rating || '0.0'} ⭐`} icon={FiClock} color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-bold text-dark flex items-center gap-2"><FiList className="text-primary" /> Recent Requests</h2>
            <button onClick={() => navigate('/admin/requests')} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View All <FiArrowRight />
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase bg-gray-50/30">
                  <th className="p-4 font-semibold">Service</th>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No recent requests</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-sm font-medium text-dark">{req.service?.name || 'Service'}</td>
                      <td className="p-4 text-sm text-gray-600">{req.user?.full_name}</td>
                      <td className="p-4 text-sm"><StatusBadge status={req.status} /></td>
                      <td className="p-4 text-sm font-bold text-dark text-right">₹{req.final_price || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-dark flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Activity</h2>
          </div>
          <div className="p-5 space-y-4 flex-1">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-500 mt-1"><FiUsers size={14} /></div>
              <div>
                <p className="text-sm font-bold text-dark">System Online</p>
                <p className="text-xs text-gray-500">{stats?.online_users || 0} users currently connected via WebSockets.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-orange-500 mt-1"><FiZap size={14} /></div>
              <div>
                <p className="text-sm font-bold text-dark">Jobs In Progress</p>
                <p className="text-xs text-gray-500">{stats?.active_jobs || 0} mechanics are currently en route or working.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </PageTransition>
  );
};

export default AdminHomePage;
