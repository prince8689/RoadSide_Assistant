import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axiosInst from '../../api/axios';
import { FiX, FiStar } from 'react-icons/fi';

const ReviewModal = ({ isOpen, onClose, request }) => {
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const handleSubmitReview = async () => {
    if (reviewScore < 1 || reviewScore > 5) return toast.error('Please select a valid rating');
    setSubmitting(true);
    try {
      await axiosInst.post('/reviews', {
        request_id: request.id,
        mechanic_id: request.mechanic_id,
        rating: reviewScore,
        comment: reviewText
      });
      toast.success('Review submitted successfully!');
      onClose();
      setReviewScore(5);
      setReviewText('');
    } catch (err) {
      if (err.response?.data?.message?.includes('already reviewed')) {
        toast.error('You have already reviewed this service');
      } else {
        toast.error('Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-2 transition-colors"
        >
          <FiX size={20} />
        </button>

        <div className="text-center mb-8 mt-4">
          <h2 className="text-2xl font-bold text-dark mb-2">Rate Your Experience</h2>
          <p className="text-gray-500">How was the service provided by {request.mechanic_name || 'the mechanic'}?</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setReviewScore(star)}
              className={`text-4xl transition-all hover:scale-110 ${reviewScore >= star ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200'}`}
            >
              ★
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-dark mb-2">Add a comment (optional)</label>
          <textarea
            className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-700 focus:border-primary focus:ring-0 transition-colors resize-none"
            rows="3"
            placeholder="Tell us what you liked or what could be improved..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          ></textarea>
        </div>

        <button 
          className="w-full btn-primary py-4 text-lg font-bold rounded-2xl shadow-lg hover:shadow-orange-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleSubmitReview}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default ReviewModal;
