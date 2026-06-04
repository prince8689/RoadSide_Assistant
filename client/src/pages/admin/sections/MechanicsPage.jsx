import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiEye, FiTool } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useAdminStore from '../../../store/adminStore';
import { verifyMechanic } from '../../../api/adminApi';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import Modal from '../../../components/admin/Modal';

const MechanicsPage = () => {
  const { pendingMechanics, fetchPendingMechanics, fetchUsers, users, isLoading } = useAdminStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedMech, setSelectedMech] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingMechanics();
    } else {
      fetchUsers({ role: 'mechanic', limit: 50 });
    }
  }, [activeTab]);

  const handleVerify = async (id, isApproved, reason = '') => {
    try {
      await verifyMechanic(id, { is_approved: isApproved, notes: reason });
      toast.success(isApproved ? 'Mechanic verified successfully' : 'Mechanic application rejected');
      setIsRejectOpen(false);
      setRejectReason('');
      fetchPendingMechanics();
    } catch (err) {
      toast.error('Failed to update mechanic status');
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
            <div className="font-bold text-dark">{row.business_name}</div>
            <div className="text-xs text-gray-500">{row.user?.full_name} • {row.user?.phone}</div>
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
      render: (row) => (
        <div className="text-xs text-gray-500">
          <div>DL: {row.documents?.license_number || 'N/A'}</div>
          <div>AADHAR: {row.documents?.aadhar_number || 'N/A'}</div>
        </div>
      )
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
      render: (row) => <StatusBadge status={row.is_active ? 'true' : 'false'} />
    },
    { 
      header: 'Joined', 
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
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
    </div>
  );
};

export default MechanicsPage;
