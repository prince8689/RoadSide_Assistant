import { useState } from 'react';
import Modal from '../admin/Modal';
import { toast } from 'react-hot-toast';
import { submitComplaint } from '../../api/userApi';
import { FiAlertCircle, FiUploadCloud } from 'react-icons/fi';

const COMPLAINT_CATEGORIES = [
  { value: 'fraud', label: 'Fraud / Scam' },
  { value: 'overcharging', label: 'Overcharging' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'misbehavior', label: 'Misbehavior' },
  { value: 'fake_service', label: 'Fake Service' },
  { value: 'threatening_behavior', label: 'Threatening Behavior' },
  { value: 'vehicle_damage', label: 'Vehicle Damage' },
  { value: 'payment_issue', label: 'Payment Issue' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'other', label: 'Other' },
];

const SubmitComplaintModal = ({ isOpen, onClose, request }) => {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitComplaint({
        mechanic_id: request.mechanic_id,
        request_id: request.id,
        category,
        description,
        evidence_urls: [] // Mocking evidence upload for now
      });
      toast.success('Complaint submitted successfully');
      setCategory('');
      setDescription('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    }
    setIsSubmitting(false);
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report an Issue" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100 mb-4">
          <FiAlertCircle className="mt-0.5 flex-shrink-0" />
          <p>You are reporting an issue against mechanic <strong>{request.mechanic?.full_name || 'Assigned Mechanic'}</strong>. False reports may result in account penalties.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-dark mb-1">Issue Category *</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary bg-gray-50"
            required
          >
            <option value="">Select a category</option>
            {COMPLAINT_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-dark mb-1">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary bg-gray-50 h-32"
            placeholder="Please provide detailed information about what happened..."
            required
            minLength={10}
            maxLength={1000}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-bold text-dark mb-1">Upload Evidence (Optional)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
            <FiUploadCloud className="text-3xl mb-2" />
            <span className="text-sm">Click to upload photos or videos</span>
            <span className="text-xs mt-1 text-gray-400">(Feature coming soon)</span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </Modal>
  );
};

export default SubmitComplaintModal;
