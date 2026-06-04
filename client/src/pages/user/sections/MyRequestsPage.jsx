import { useEffect, useState } from 'react';
import { FiClock, FiMapPin, FiTruck, FiTool } from 'react-icons/fi';
import useRequestStore from '../../../store/requestStore';
import Loader from '../../../components/common/Loader';

const MyRequestsPage = () => {
  const { requests, isLoading, fetchMyRequests } = useRequestStore();
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchMyRequests();
  }, []);

  if (isLoading) return <Loader text="Loading your requests..." />;

  const filteredRequests = requests.filter(req => {
    if (filter === 'All') return true;
    if (filter === 'Active') return !['completed', 'cancelled'].includes(req.status);
    return req.status === filter.toLowerCase();
  });

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
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
              
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
                  <span className="text-lg font-bold text-dark mt-2">₹{req.estimated_price}</span>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-none btn-outline py-2 px-4 text-sm bg-gray-50">View Details</button>
                  {req.status === 'completed' && (
                    <button className="flex-1 md:flex-none btn-primary py-2 px-4 text-sm">Leave Review</button>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyRequestsPage;
