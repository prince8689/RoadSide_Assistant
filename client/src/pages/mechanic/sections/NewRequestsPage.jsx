import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiMapPin, FiTruck, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useMechanicStore from '../../../store/mechanicStore';
import { acceptRequest, rejectRequest } from '../../../api/mechanicApi';

const NewRequestsPage = () => {
  const { availableRequests, fetchAvailableRequests, removeFromAvailable, isAvailable } = useMechanicStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableRequests();
  }, []);

  const handleAccept = async (id) => {
    try {
      await acceptRequest(id);
      toast.success('Request accepted successfully!');
      navigate('/mechanic/active-job');
    } catch (err) {
      toast.error('Failed to accept request. It might have been taken.');
      removeFromAvailable(id);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRequest(id);
      removeFromAvailable(id);
      toast.success('Request rejected');
    } catch (err) {
      removeFromAvailable(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">New Service Requests</h1>
        <div className="flex items-center gap-2 text-red-500 font-semibold text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Live
        </div>
      </div>

      {!isAvailable && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded shadow-sm">
          <strong>You are Offline:</strong> You will not receive any new requests. Toggle availability in the navbar.
        </div>
      )}

      <div className="space-y-4">
        {availableRequests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSearch className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-dark mb-2">No Requests Nearby</h3>
            <p className="text-muted">Stay available. We will notify you when someone needs help.</p>
          </div>
        ) : (
          availableRequests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-card border-l-4 border-primary animate-slide-up flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 text-primary rounded-xl flex items-center justify-center text-2xl">
                    <FiTruck />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark uppercase">{req.service?.name || 'Assistance'}</h3>
                    <p className="text-sm font-medium text-primary">{req.distance ? `${req.distance.toFixed(1)} km away` : 'Nearby'}</p>
                  </div>
                </div>

                <div className="pl-15 space-y-1">
                  <p className="text-sm text-dark font-medium">{req.vehicle?.make} {req.vehicle?.model} • {req.vehicle?.license_plate}</p>
                  <p className="text-sm text-muted flex items-center gap-1">
                    <FiMapPin className="text-gray-400 flex-shrink-0" /> 
                    <span className="truncate max-w-[250px] inline-block">{req.address || 'User Location'}</span>
                  </p>
                  <p className="text-xs text-muted">₹{req.estimated_price} estimated</p>
                  {req.description && <p className="text-sm text-gray-600 italic mt-2">"{req.description}"</p>}
                </div>
              </div>

              <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                <button onClick={() => handleAccept(req.id)} className="flex-1 btn-primary py-3 px-4 flex items-center justify-center gap-2 text-sm bg-green-500 hover:bg-green-600">
                  <FiCheck /> ACCEPT
                </button>
                <button onClick={() => handleReject(req.id)} className="flex-1 btn-outline py-3 px-4 flex items-center justify-center gap-2 text-sm border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-500 hover:text-red-500">
                  <FiX /> REJECT
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NewRequestsPage;
