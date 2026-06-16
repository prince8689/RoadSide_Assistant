import { useEffect, useState } from 'react';
import { FiDollarSign, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { getJobHistory } from '../../../api/mechanicApi';
import useMechanicStore from '../../../store/mechanicStore';
import Loader from '../../../components/common/Loader';

const EarningsPage = () => {
  const { stats, fetchStats } = useMechanicStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchStats();
    getJobHistory().then(res => {
      setHistory(res.data?.history || res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader text="Loading earnings..." />;

  const completedJobs = history.filter(job => job.status === 'completed');
  
  const filteredJobs = completedJobs.filter(job => {
    if (filter === 'All') return true;
    const jobDate = new Date(job.created_at);
    const now = new Date();
    if (filter === 'This Week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      return jobDate >= weekAgo;
    }
    if (filter === 'This Month') {
      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-6">My Earnings</h1>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-md">
          <h3 className="text-green-100 text-sm font-semibold mb-1">Total Earned</h3>
          <div className="text-3xl font-bold">₹{stats?.total_earnings || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-muted text-sm font-semibold mb-1">This Month</h3>
          <div className="text-3xl font-bold text-dark">₹{
            completedJobs
              .filter(j => new Date(j.created_at).getMonth() === new Date().getMonth())
              .reduce((sum, j) => sum + Number(j.final_price || 0), 0)
          }</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-muted text-sm font-semibold mb-1">Completed</h3>
          <div className="text-3xl font-bold text-dark">{stats?.completed_jobs || 0} Jobs</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-muted text-sm font-semibold mb-1">Avg / Job</h3>
          <div className="text-3xl font-bold text-dark">
            ₹{stats?.completed_jobs ? Math.round((stats?.total_earnings || 0) / stats.completed_jobs) : 0}
          </div>
        </div>
      </div>

      {/* Job History List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-dark">Job History</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['All', 'This Week', 'This Month'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  filter === f ? 'bg-white text-dark shadow-sm' : 'text-gray-500 hover:text-dark'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredJobs.length === 0 ? (
            <div className="p-12 text-center text-muted">No completed jobs found for this period.</div>
          ) : (
            filteredJobs.map(job => (
              <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl">
                    <FiCheckCircle />
                  </div>
                  <div>
                    <h4 className="font-bold text-dark">{job.service?.name}</h4>
                    <p className="text-sm text-dark">{job.user?.full_name} • {job.vehicle?.make}</p>
                    <p className="text-xs text-muted flex items-center gap-1 mt-1">
                      <FiCalendar /> {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full md:w-auto gap-8">
                  <div className="text-right">
                    <span className="text-sm text-muted block">Earned</span>
                    <span className="text-xl font-bold text-green-600">₹{job.final_price}</span>
                  </div>
                  {job.review && (
                    <div className="text-right">
                      <span className="text-sm text-muted block">Rating</span>
                      <span className="text-lg font-bold text-yellow-500">⭐ {job.review.rating}.0</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningsPage;
