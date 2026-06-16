import { useEffect, useState } from 'react';
import { FiClock, FiMapPin, FiTruck, FiTool, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMyRequestsThunk } from '../../../store/requestStore';
import Loader from '../../../components/common/Loader';
import SubmitComplaintModal from '../../../components/user/SubmitComplaintModal';
import ReviewModal from '../../../components/user/ReviewModal';
import PaymentModal from '../../../components/user/PaymentModal';

const MyRequestsPage = () => {
  const dispatch = useDispatch();
  const { requests, isLoading } = useSelector(state => state.request);
  const fetchMyRequests = () => dispatch(fetchMyRequestsThunk());
  const [filter, setFilter] = useState('All');
  
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [selectedRequestForComplaint, setSelectedRequestForComplaint] = useState(null);
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState(null);

  const [expandedRequestId, setExpandedRequestId] = useState(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  if (isLoading) return <Loader text="Loading your requests..." />;

  const filteredRequests = (requests || []).filter(req => {
    if (filter === 'All') return true;
    if (filter === 'Active') return !['completed', 'cancelled'].includes(req.status);
    return req.status === filter.toLowerCase();
  });

  const toggleDetails = (id) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-dark mb-6">My Requests</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Active', 'Completed', 'Cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2 rounded-full font-semibold text-sm transition-all whitespace-nowrap
              ${filter === f ? 'bg-dark text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}
            `}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTool className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-dark mb-2">No Requests Found</h3>
            <p className="text-muted">You have no {filter !== 'All' ? filter.toLowerCase() : ''} service requests.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col gap-4">
              
              {/* Main Card Content */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 text-primary rounded-xl flex items-center justify-center text-xl">
                      <FiTruck />
                    </div>
                    <div>
                      <h3 className="font-bold text-dark">{req.service?.name || 'Roadside Assistance'}</h3>
                      <p className="text-xs text-muted font-medium flex items-center gap-1">
                        <FiClock /> {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="pl-13 space-y-1">
                    <p className="text-sm text-dark font-medium">{req.vehicle?.make} {req.vehicle?.model} • {req.vehicle?.license_plate}</p>
                    <p className="text-sm text-muted flex items-center gap-1">
                      <FiMapPin className="text-primary flex-shrink-0" /> 
                      <span className="truncate max-w-[200px] md:max-w-md inline-block">{req.address || 'Map Location'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <div className="flex flex-col md:items-end gap-1 mb-4 md:mb-0 w-full">
                    <span className={`badge-${req.status} self-start md:self-end`}>{req.status.toUpperCase()}</span>
                    <span className="text-lg font-bold text-dark mt-2">₹{parseFloat(req.invoice_amount || req.final_price || req.category_base_price || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => toggleDetails(req.id)}
                      className="flex-1 md:flex-none btn-outline py-2 px-4 text-sm bg-gray-50 flex items-center justify-center gap-1"
                    >
                      {expandedRequestId === req.id ? 'Hide Details' : 'View Details'}
                      {expandedRequestId === req.id ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    {(req.status === 'completed' || req.status === 'awaiting_payment' || req.status === 'payment_verification') && (
                      <button 
                        onClick={() => window.location.href = `/dashboard/invoice/${req.id}`}
                        className="flex-1 md:flex-none btn-primary py-2 px-4 text-sm bg-orange-500 hover:bg-orange-600 border-orange-500"
                      >
                        View Invoice
                      </button>
                    )}
                    {req.status === 'awaiting_payment' && (
                      <button 
                        onClick={() => { setSelectedRequestForPayment(req); setIsPaymentModalOpen(true); }}
                        className="flex-1 md:flex-none btn-primary py-2 px-4 text-sm bg-green-600 hover:bg-green-700 border-green-600 animate-pulse"
                      >
                        💳 Pay Now
                      </button>
                    )}
                    {req.status === 'completed' && (
                      <>
                        <button 
                          onClick={() => { setSelectedRequestForReview(req); setIsReviewModalOpen(true); }}
                          className="flex-1 md:flex-none btn-primary py-2 px-4 text-sm"
                        >
                          Leave Review
                        </button>
                        <button 
                          onClick={() => { setSelectedRequestForComplaint(req); setIsComplaintModalOpen(true); }}
                          className="flex-1 md:flex-none py-2 px-4 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          Report Issue
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details Section */}
              {expandedRequestId === req.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-dark mb-3 uppercase tracking-wide text-primary">Request Information</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-dark"><strong className="text-muted mr-2">Request ID:</strong> #{req.id}</p>
                      {req.description && <p className="text-sm text-dark"><strong className="text-muted mr-2">Issue Description:</strong> {req.description}</p>}
                      <p className="text-sm text-dark"><strong className="text-muted mr-2">Last Updated:</strong> {new Date(req.updated_at || req.created_at).toLocaleString()}</p>
                      {req.cancel_reason && <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2"><strong className="mr-1">Cancellation Reason:</strong> {req.cancel_reason}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-dark mb-3 uppercase tracking-wide text-primary">Mechanic Details</h4>
                    <div className="space-y-2">
                      {(req.mechanic_name || req.mechanic) ? (
                        <>
                          <p className="text-sm text-dark"><strong className="text-muted mr-2">Name:</strong> {req.mechanic_name || req.mechanic?.name || req.mechanic?.user?.name || 'N/A'}</p>
                          <p className="text-sm text-dark"><strong className="text-muted mr-2">Phone:</strong> {req.mechanic_phone || req.mechanic?.phone || req.mechanic?.user?.phone || 'N/A'}</p>
                          {req.mechanic_lat && req.mechanic_lng && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${req.mechanic_lat},${req.mechanic_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                            >
                              <FiMapPin /> View Mechanic Shop Location
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted italic bg-white p-2 rounded border border-dashed border-gray-200">No mechanic assigned yet</p>
                      )}
                      
                      {req.payment_status && (
                        <div className="mt-4">
                           <p className="text-sm text-dark flex items-center gap-2">
                             <strong className="text-muted">Payment Status:</strong> 
                             <span className={`px-2 py-1 text-xs rounded-md font-semibold ${
                               req.payment_status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' :
                               req.payment_status?.toLowerCase() === 'cancelled' ? 'bg-gray-200 text-gray-700 line-through' :
                               'bg-yellow-100 text-yellow-700'
                             }`}>
                               {req.payment_status}
                             </span>
                           </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      <SubmitComplaintModal 
        isOpen={isComplaintModalOpen} 
        onClose={() => { setIsComplaintModalOpen(false); setSelectedRequestForComplaint(null); }} 
        request={selectedRequestForComplaint}
      />

      {isReviewModalOpen && selectedRequestForReview && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          request={selectedRequestForReview}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={() => {
            setIsReviewModalOpen(false);
            fetchMyRequests();
          }}
        />
      )}

      {isPaymentModalOpen && selectedRequestForPayment && (
        <PaymentModal
          requestId={selectedRequestForPayment.id}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            fetchMyRequests();
          }}
        />
      )}
    </div>
  );
};

export default MyRequestsPage;
