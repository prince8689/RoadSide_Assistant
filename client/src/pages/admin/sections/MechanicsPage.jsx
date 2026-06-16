import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiEye, FiTool, FiStar } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useAdminStore from '../../../store/adminStore';
import { verifyMechanic, enforceMechanicAction } from '../../../api/adminApi';
import { getMechanicReviews } from '../../../api/mechanicApi';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import Modal from '../../../components/admin/Modal';

const MechanicsPage = () => {
  const { pendingMechanics, fetchPendingMechanics, fetchUsers, users, isLoading } = useAdminStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedMech, setSelectedMech] = useState(null);
  
  // Rejection state
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // Enforcement state
  const [isEnforceOpen, setIsEnforceOpen] = useState(false);
  const [enforceAction, setEnforceAction] = useState('warning');
  const [enforceReason, setEnforceReason] = useState('');
  const [enforceDays, setEnforceDays] = useState(7);

  // Reviews state
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [mechanicReviews, setMechanicReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingMechanics();
    } else {
      fetchUsers({ role: 'mechanic', limit: 50 });
    }
  }, [activeTab]);

  const handleVerify = async (id, isApproved, reason = '') => {
    try {
      await verifyMechanic(id, { is_verified: isApproved, rejection_reason: reason });
      toast.success(isApproved ? 'Mechanic verified successfully' : 'Mechanic application rejected');
      setIsRejectOpen(false);
      setRejectReason('');
      fetchPendingMechanics();
    } catch (err) {
      toast.error('Failed to update mechanic status');
    }
  };

  const handleEnforce = async () => {
    try {
      await enforceMechanicAction(selectedMech.id, { 
        action_type: enforceAction, 
        reason: enforceReason,
        suspension_days: enforceAction === 'suspension' ? enforceDays : undefined
      });
      toast.success(`Action ${enforceAction} applied successfully`);
      setIsEnforceOpen(false);
      setEnforceReason('');
      fetchUsers({ role: 'mechanic', limit: 50 });
    } catch (err) {
      toast.error('Failed to apply enforcement');
    }
  };

  const fetchReviews = async (mechanicId) => {
    setIsReviewsOpen(true);
    setIsLoadingReviews(true);
    try {
      const res = await getMechanicReviews(mechanicId);
      const fetchedData = res.data?.data || res.data;
      const reviewsArray = fetchedData.reviews || (Array.isArray(fetchedData) ? fetchedData : []);
      setMechanicReviews(reviewsArray);
    } catch (err) {
      toast.error('Failed to fetch reviews');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const pendingColumns = [
    {
      header: 'Mechanic Info',
      accessor: 'info',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl">
            <FiTool />
          </div>
          <div>
            <div className="font-bold text-dark">{row.business_name || 'Independent Mechanic'}</div>
            <div className="text-xs text-gray-500">{row.full_name} • {row.phone}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Experience', 
      accessor: 'experience',
      render: (row) => `${row.experience_years} Years`
    },
    {
      header: 'Documents',
      accessor: 'docs',
      render: (row) => {
        let docs = [];
        try { docs = typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents; } catch(e) {}
        const aadhar = Array.isArray(docs) ? docs.find(d => d.type === 'aadhar')?.number : docs?.aadhar_number;
        const dl = Array.isArray(docs) ? docs.find(d => d.type === 'license')?.number : docs?.license_number;
        return (
          <div className="text-xs text-gray-500">
            <div>AADHAR: <span className="font-medium text-dark">{aadhar || 'N/A'}</span></div>
            <div>DL: <span className="font-medium text-dark">{dl || 'N/A'}</span></div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleVerify(row.id, true)}
            className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded hover:bg-green-200 transition flex items-center gap-1"
          >
            <FiCheck /> VERIFY
          </button>
          <button 
            onClick={() => { setSelectedMech(row); setIsRejectOpen(true); }}
            className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 rounded hover:bg-red-200 transition flex items-center gap-1"
          >
            <FiX /> REJECT
          </button>
        </div>
      )
    }
  ];

  const allColumns = [
    {
      header: 'Mechanic',
      accessor: 'name',
      render: (row) => (
        <div className="font-semibold text-dark">{row.full_name}</div>
      )
    },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.is_active ? 'true' : 'false'} />
          {row.mechanic_profile?.is_blocked && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold w-fit">BLOCKED</span>
          )}
        </div>
      )
    },
    {
      header: 'Trust / Strikes',
      accessor: 'trust',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-dark">Trust: {row.mechanic_profile?.trust_score ?? 100}/100</div>
          <div className="text-red-500">Strikes: {row.mechanic_profile?.total_strikes ?? 0}</div>
        </div>
      )
    },
    {
      header: 'Request Stats',
      accessor: 'req_stats',
      render: (row) => (
        <div className="text-xs">
          <div className="text-gray-500">Recv: {row.mechanic_profile?.total_requests_received || 0}</div>
          <div className="text-green-600 font-bold">Acc: {row.mechanic_profile?.total_requests_accepted || 0}</div>
          <div className="text-red-600 font-bold">Rej: {row.mechanic_profile?.total_requests_rejected || 0}</div>
        </div>
      )
    },
    { 
      header: 'Joined', 
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => { setSelectedMech(row); fetchReviews(row.id); }}
            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition flex items-center gap-1"
          >
            <FiEye /> REVIEWS
          </button>
          <button 
            onClick={() => { setSelectedMech(row); setIsEnforceOpen(true); }}
            className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 rounded hover:bg-red-200 transition"
          >
            ENFORCE
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-dark">Mechanics Management</h1>
          <p className="text-sm text-gray-500">Approve new mechanic applications and manage existing ones.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-dark'}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending Verification ({pendingMechanics.length})
        </button>
        <button
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-dark'}`}
          onClick={() => setActiveTab('all')}
        >
          All Mechanics
        </button>
      </div>

      <div className="shadow-sm border border-gray-100 rounded-xl bg-white">
        {activeTab === 'pending' ? (
          <DataTable columns={pendingColumns} data={pendingMechanics} isLoading={isLoading} />
        ) : (
          <DataTable columns={allColumns} data={users} isLoading={isLoading} />
        )}
      </div>

      {/* Reject Modal */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Reject Mechanic Application" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Please provide a reason for rejecting <strong>{selectedMech?.business_name}</strong>'s application.</p>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
            rows="3"
            placeholder="e.g. Invalid DL number..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          ></textarea>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsRejectOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">Cancel</button>
            <button 
              onClick={() => handleVerify(selectedMech.id, false, rejectReason)}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Enforcement Modal */}
      <Modal isOpen={isEnforceOpen} onClose={() => setIsEnforceOpen(false)} title="Enforce Action on Mechanic" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select an action to enforce on <strong>{selectedMech?.full_name}</strong>.</p>
          
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Action Type</label>
            <select 
              value={enforceAction}
              onChange={(e) => setEnforceAction(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-primary"
            >
              <option value="warning">Issue Warning (-5 Trust)</option>
              <option value="suspension">Suspend Account (-15 Trust)</option>
              <option value="ban">Permanent Ban</option>
              <option value="reactivation">Reactivate / Remove Ban</option>
              <option value="unblock">Unblock from Auto-Block</option>
            </select>
          </div>

          {enforceAction === 'suspension' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Suspension Days</label>
              <input 
                type="number" 
                min="1" max="365"
                value={enforceDays}
                onChange={(e) => setEnforceDays(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Reason (Visible in Logs)</label>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              rows="3"
              placeholder="e.g. Constant overcharging..."
              value={enforceReason}
              onChange={(e) => setEnforceReason(e.target.value)}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsEnforceOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">Cancel</button>
            <button 
              onClick={handleEnforce}
              disabled={!enforceReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
            >
              Apply Action
            </button>
          </div>
        </div>
      </Modal>

      {/* Reviews Modal */}
      <Modal isOpen={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} title={`Reviews for ${selectedMech?.full_name}`} size="md">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoadingReviews ? (
            <div className="text-center py-4 text-gray-500">Loading reviews...</div>
          ) : mechanicReviews.length === 0 ? (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-xl">No reviews found for this mechanic.</div>
          ) : (
            mechanicReviews.map(review => (
              <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-dark text-sm">{review.user?.full_name || 'User'}</h4>
                    <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex text-yellow-500 text-sm">
                    {[1,2,3,4,5].map(i => <FiStar key={i} fill={i <= review.rating ? "currentColor" : "none"} />)}
                  </div>
                </div>
                <p className="text-sm text-gray-700 italic">"{review.comment || 'No comment provided'}"</p>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end pt-4 border-t mt-4 border-gray-100">
          <button onClick={() => setIsReviewsOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default MechanicsPage;
