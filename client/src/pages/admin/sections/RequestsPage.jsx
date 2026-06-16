import { useEffect, useState } from 'react';
import { FiFilter, FiSearch, FiMapPin, FiClock } from 'react-icons/fi';
import useAdminStore from '../../../store/adminStore';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import Pagination from '../../../components/admin/Pagination';
import Modal from '../../../components/admin/Modal';
import { getRequestDetails } from '../../../api/adminApi';

const RequestsPage = () => {
  const { requests, pagination, fetchRequests, isLoading } = useAdminStore();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedReq, setSelectedReq] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchRequests({ page, limit: 10, status: statusFilter });
  }, [page, statusFilter]);

  const columns = [
    { header: 'ID', accessor: 'id', render: (row) => <span className="text-xs font-mono text-gray-500">#{row.id.substring(0,6)}</span> },
    { 
      header: 'Service', 
      accessor: 'service',
      render: (row) => <span className="font-semibold text-dark">{row.service?.name}</span>
    },
    { 
      header: 'Customer', 
      accessor: 'user',
      render: (row) => (
        <div>
          <div className="font-medium text-sm text-dark">{row.user?.full_name}</div>
          <div className="text-xs text-gray-500">{row.vehicle?.make} {row.vehicle?.model}</div>
        </div>
      )
    },
    { 
      header: 'Mechanic', 
      accessor: 'mechanic',
      render: (row) => row.mechanic ? (
        <span className="text-sm">{row.mechanic?.user?.full_name}</span>
      ) : <span className="text-sm text-gray-400 italic">Unassigned</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    { 
      header: 'Amount', 
      accessor: 'price',
      render: (row) => <span className="font-bold">₹{row.final_price || '-'}</span>
    },
    { 
      header: 'Date', 
      accessor: 'date',
      render: (row) => <span className="text-sm text-gray-600">{new Date(row.created_at).toLocaleDateString()}</span>
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Service Requests</h1>
          <p className="text-sm text-gray-500">Monitor all breakdown requests and assignments.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-gray-200">
          <FiFilter className="text-gray-400 ml-2" />
          <select 
            className="bg-transparent text-sm focus:outline-none py-1 pr-2 text-dark font-medium cursor-pointer"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="en_route">En Route</option>
            <option value="arrived">Arrived</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="shadow-sm border border-gray-100 rounded-xl bg-white flex flex-col">
        <DataTable 
          columns={columns} 
          data={requests} 
          isLoading={isLoading} 
          onRowClick={async (row) => { 
            setSelectedReq(row); 
            setIsModalOpen(true); 
            try {
              const res = await getRequestDetails(row.id);
              setSelectedReq(res.data.request);
            } catch (err) {
              console.error(err);
            }
          }}
        />
        <Pagination currentPage={pagination.page || 1} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Request Details" size="lg">
        {selectedReq && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                  <span className="font-bold text-lg">{selectedReq.service?.name}</span>
                  <StatusBadge status={selectedReq.status} />
                </div>
                <div className="flex items-start gap-2">
                  <FiMapPin className="text-primary mt-1" />
                  <span className="text-sm font-medium text-dark">{selectedReq.address || 'GPS Location Only'}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-500 text-sm">Final Price</span>
                  <span className="text-xl font-bold text-primary">₹{selectedReq.final_price || '-'}</span>
                </div>
              </div>

              {/* Users Involved */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Customer</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">{selectedReq.user?.full_name?.charAt(0)}</div>
                    <div>
                      <div className="font-bold text-dark text-sm">{selectedReq.user?.full_name}</div>
                      <div className="text-xs text-gray-500">{selectedReq.user?.phone}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Assigned Mechanic</h4>
                  {selectedReq.mechanic ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">{selectedReq.mechanic?.user?.full_name?.charAt(0)}</div>
                      <div>
                        <div className="font-bold text-dark text-sm">{selectedReq.mechanic?.user?.full_name}</div>
                        <div className="text-xs text-gray-500">{selectedReq.mechanic?.user?.phone}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg text-center border border-dashed border-gray-200">
                      No mechanic assigned yet
                    </div>
                  )}
                </div>
              </div>

              {selectedReq.user_feedback && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mt-4">
                  <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">User Feedback (Failed Interaction)</h4>
                  <p className="text-sm text-orange-900 italic">"{selectedReq.user_feedback}"</p>
                </div>
              )}

              {/* Invoice Section */}
              {selectedReq.invoice && (
                <div className="bg-green-50 border border-green-100 p-5 rounded-xl mt-4 shadow-sm">
                  <h4 className="text-xs font-bold text-green-800 uppercase mb-3 border-b border-green-200 pb-2">Invoice Details</h4>
                  <div className="space-y-2 text-sm text-green-900">
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-700">Base Fare & Distance</span>
                      <span className="font-bold">₹{selectedReq.invoice.subtotal}</span>
                    </div>
                    {selectedReq.invoice.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-green-800 pl-3 py-0.5 opacity-90">
                        <span>• {item.item_name}</span>
                        <span>₹{item.amount}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1">
                      <span className="font-semibold text-green-700">Platform Fee</span>
                      <span className="font-bold">₹{selectedReq.invoice.platform_fee}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="font-semibold text-green-700">Tax</span>
                      <span className="font-bold">₹{selectedReq.invoice.tax_amount}</span>
                    </div>
                    <div className="pt-3 mt-2 border-t border-green-200 flex justify-between items-center font-black text-green-800 text-lg">
                      <span>Total Billed</span>
                      <span>₹{selectedReq.invoice.total_amount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
              <h4 className="text-sm font-bold text-dark mb-4 flex items-center gap-2"><FiClock /> Event Timeline</h4>
              <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                
                <div className="relative">
                  <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></div>
                  <p className="text-sm font-bold text-dark">Request Created</p>
                  <p className="text-xs text-gray-500">{new Date(selectedReq.created_at).toLocaleString()}</p>
                </div>
                
                {selectedReq.mechanic_id && (
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-orange-500 ring-4 ring-white"></div>
                    <p className="text-sm font-bold text-dark">Mechanic Assigned</p>
                    <p className="text-xs text-gray-500">System event</p>
                  </div>
                )}
                
                {selectedReq.status === 'completed' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-green-500 ring-4 ring-white"></div>
                    <p className="text-sm font-bold text-dark">Job Completed</p>
                    <p className="text-xs text-gray-500">System event</p>
                  </div>
                )}
                
                 {selectedReq.status === 'cancelled' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-red-500 ring-4 ring-white"></div>
                    <p className="text-sm font-bold text-dark">Job Cancelled</p>
                    <p className="text-xs text-gray-500">System event</p>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RequestsPage;
