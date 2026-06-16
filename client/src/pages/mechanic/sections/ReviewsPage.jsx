import { useEffect, useState } from 'react';
import { FiStar, FiClock, FiCheckCircle, FiXCircle, FiUser } from 'react-icons/fi';
import { getMechanicReviews, getJobHistory } from '../../../api/mechanicApi';
import useMechanicStore from '../../../store/mechanicStore';
import Loader from '../../../components/common/Loader';

const ReviewsPage = () => {
  const { profile, stats, fetchStats } = useMechanicStore();
  const [reviews, setReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    fetchStats();
    if (profile) {
      const mechanicId = profile.user_id || profile.id;
      if (mechanicId) {
        Promise.all([
          getMechanicReviews(mechanicId).catch(() => ({ data: [] })),
          getJobHistory().catch(() => ({ data: { data: [] } }))
        ]).then(([reviewsRes, historyRes]) => {
          const reviewsData = reviewsRes.data?.data || reviewsRes.data;
          const historyData = historyRes.data?.data || historyRes.data || [];
          setReviews(reviewsData?.reviews || (Array.isArray(reviewsData) ? reviewsData : []));
          setHistory(Array.isArray(historyData) ? historyData : []);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [profile, fetchStats]);

  if (loading) return <Loader text="Loading data..." />;

  // Calculate rating breakdown
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
  });
  const totalReviews = reviews.length || 1;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-6">Service History & Reviews</h1>

      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'history'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-dark'
          }`}
        >
          Service History
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'reviews'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-dark'
          }`}
        >
          My Reviews
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-muted">
              No service history available yet.
            </div>
          ) : (
            history.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl text-gray-500 overflow-hidden">
                    {job.user_profile_picture ? (
                      <img src={job.user_profile_picture} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-dark text-lg">{job.user_name || 'Unknown User'}</h4>
                    <p className="text-sm text-muted">{job.category_name} - {job.vehicle_make} {job.vehicle_model}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(job.created_at).toLocaleDateString()} at {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-2xl font-bold text-dark">
                    ₹{job.final_price || '0'}
                  </div>
                  {job.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <FiCheckCircle /> Completed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                      <FiXCircle /> Cancelled
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-dark text-white p-6 rounded-2xl shadow-card flex flex-col items-center justify-center text-center">
              <h3 className="text-gray-400 font-semibold mb-2">Overall Rating</h3>
              <div className="text-6xl font-bold text-yellow-500 mb-2">{stats?.rating || '0.0'}</div>
              <div className="flex text-yellow-500 text-xl mb-2">
                {[1,2,3,4,5].map(i => <FiStar key={i} fill={i <= Math.round(stats?.rating || 0) ? "currentColor" : "none"} />)}
              </div>
              <p className="text-sm text-gray-300">Based on {reviews.length} reviews</p>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center gap-3">
              {[5, 4, 3, 2, 1].map(star => {
                const count = breakdown[star];
                const percent = (count / totalReviews) * 100;
                return (
                  <div key={star} className="flex items-center gap-4">
                    <span className="font-bold text-dark w-6">{star}★</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="text-sm font-semibold text-muted w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-muted">
                No reviews yet. Complete jobs to earn ratings!
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                        {review.user?.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-dark">{review.user?.full_name}</h4>
                        <p className="text-xs text-muted">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex text-yellow-500">
                      {[1,2,3,4,5].map(i => <FiStar key={i} fill={i <= review.rating ? "currentColor" : "none"} size={14} />)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl mt-4 relative">
                    <span className="absolute -top-3 left-4 text-4xl text-gray-200 font-serif">"</span>
                    <p className="text-dark relative z-10 italic">{review.comment || 'No written feedback provided.'}</p>
                  </div>
                  <div className="mt-3 text-xs text-primary font-semibold">
                    Service: {review.request?.service?.name || 'Roadside Assistance'}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewsPage;
