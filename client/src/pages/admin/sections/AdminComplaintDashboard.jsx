import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiShield, FiXCircle, FiSearch, FiEye, FiActivity } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { getComplaints, updateComplaintStatus, getDashboardStats, getSafetyAlerts } from '../../../api/adminApi';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import Modal from '../../../components/admin/Modal';

const AdminComplaintDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, statsRes, alertsRes] = await Promise.all([
        getComplaints({ status: statusFilter }),
        getDashboardStats(),
        getSafetyAlerts()
      ]);
      setComplaints(compRes.data.data || []);
      setStats(statsRes.data.data);
      setSafetyAlerts(alertsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch complaint data');
    }
    setIsLoading(false);
  };

  const handleUpdateStatus = async (status) => {
    try {
      await updateComplaintStatus(selectedComplaint.id, { status, admin_notes: adminNotes });
      toast.success(`Complaint marked as ${status}`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const columns = [
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => <span className="uppercase font-bold text-xs">{row.category.replace('_', ' ')}</span>
    },
    {
      header: 'User',
      accessor: 'user',
      render: (row) => <div className="text-sm">{row.user_name}</div>
    },
    {
      header: 'Mechanic',
      accessor: 'mechanic',
      render: (row) => <div className="text-sm font-semibold">{row.mechanic_name}</div>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        let color = 'bg-gray-100 text-gray-700';
        if (row.status === 'pending') color = 'bg-yellow-100 text-yellow-700';
        if (row.status === 'under_investigation') color = 'bg-blue-100 text-blue-700';
        if (row.status === 'resolved') color = 'bg-green-100 text-green-700';
        if (row.status === 'rejected') color = 'bg-red-100 text-red-700';
        return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${color}`}>{row.status.replace('_', ' ')}</span>;
      }
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <button 
          onClick={() => { setSelectedComplaint(row); setAdminNotes(row.admin_notes || ''); setIsModalOpen(true); }}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
        >
          <FiEye />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-dark flex items-center gap-2"><FiShield className="text-primary"/> Trust & Safety Center</h1>
        <p className="text-sm text-gray-500">Manage complaints, fraud detection, and safety alerts.</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium">Open Complaints</div>
            <div className="text-3xl font-bold text-dark mt-1">{stats.open_complaints}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
            <div className="text-red-500 text-sm font-medium flex items-center gap-1"><FiAlertTriangle /> Fraud / Safety</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{parseInt(stats.fraud_complaints) + parseInt(stats.harassment_complaints)}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium">Suspended Mechanics</div>
            <div className="text-3xl font-bold text-orange-500 mt-1">{stats.suspended_mechanics}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium">Banned Mechanics</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{stats.banned_mechanics}</div>
          </div>
        </div>
      )}

      {/* Safety Alerts Banner */}
      {safetyAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-red-800 font-bold flex items-center gap-2 mb-3"><FiAlertTriangle /> Active Safety Alerts ({safetyAlerts.length})</h3>
          <div className="space-y-2">
            {safetyAlerts.map(alert => (
              <div key={alert.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center border border-red-100">
                <div>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase mr-2">{alert.category.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-dark">Against: {alert.mechanic_name}</span>
                </div>
                <button onClick={() => setStatusFilter('pending')} className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-dark text-lg">All Complaints</h3>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <DataTable columns={columns} data={complaints} isLoading={isLoading} />
      </div>

      {/* Complaint Details Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Complaint Details" size="lg">
        {selectedComplaint && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Category</div>
                <div className="font-semibold">{selectedComplaint.category.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Status</div>
                <div className="font-semibold uppercase text-primary">{selectedComplaint.status.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Submitted By</div>
                <div>{selectedComplaint.user_name} ({selectedComplaint.user_email})</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Against Mechanic</div>
                <div className="text-red-600 font-medium">{selectedComplaint.mechanic_name} ({selectedComplaint.mechanic_email})</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">User Description</div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                {selectedComplaint.description}
              </div>
            </div>

            {selectedComplaint.evidence_urls && selectedComplaint.evidence_urls.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold mb-2">Evidence</div>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedComplaint.evidence_urls.map((url, i) => (
                    <img key={i} src={url} alt="Evidence" className="h-24 w-24 object-cover rounded border" />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Admin Investigation Notes</div>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes from your investigation..."
                className="w-full p-3 border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-primary h-24"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={() => handleUpdateStatus('rejected')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 text-sm"
              >
                Reject (Invalid)
              </button>
              <button 
                onClick={() => handleUpdateStatus('under_investigation')}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 text-sm"
              >
                Mark Investigating
              </button>
              <button 
                onClick={() => handleUpdateStatus('resolved')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 text-sm"
              >
                Resolve & Apply Strike
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminComplaintDashboard;
