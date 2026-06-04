import { useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { getMechanicReviews } from '../../../api/mechanicApi';
import useMechanicStore from '../../../store/mechanicStore';
import Loader from '../../../components/common/Loader';

const ReviewsPage = () => {
  const { profile, stats, fetchStats } = useMechanicStore();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    if (profile?.id) {
      getMechanicReviews(profile.id).then(res => {
        setReviews(res.data.data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [profile?.id]);

  if (loading) return <Loader text="Loading reviews..." />;

  // Calculate rating breakdown
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (breakdown[r.rating] !== undefined) {
      breakdown[r.rating]++;
    }
  });

  const totalReviews = reviews.length || 1; // prevent divide by 0

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-6">My Reviews</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Rating Summary */}
        <div className="bg-dark text-white p-6 rounded-2xl shadow-card flex flex-col items-center justify-center text-center">
          <h3 className="text-gray-400 font-semibold mb-2">Overall Rating</h3>
          <div className="text-6xl font-bold text-yellow-500 mb-2">{stats?.rating || '0.0'}</div>
          <div className="flex text-yellow-500 text-xl mb-2">
            {[1,2,3,4,5].map(i => <FiStar key={i} fill={i <= Math.round(stats?.rating || 0) ? "currentColor" : "none"} />)}
          </div>
          <p className="text-sm text-gray-300">Based on {reviews.length} reviews</p>
        </div>

        {/* Breakdown */}
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

      {/* Reviews List */}
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
    </div>
  );
};

export default ReviewsPage;
