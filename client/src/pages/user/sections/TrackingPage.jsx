import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import { FiPhone, FiXCircle, FiStar } from 'react-icons/fi';
import useRequestStore from '../../../store/requestStore';
import { cancelRequest, getLastLocation } from '../../../api/requestApi';
import { getSocket } from '../../../socket/socketClient';

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const mechanicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const TrackingPage = () => {
  const { activeRequest, mechanicLocation, fetchActiveRequest, updateMechanicLocation } = useRequestStore();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchActiveRequest();
  }, []);

  useEffect(() => {
    if (!activeRequest) return;
    
    // Auto redirect to review if completed
    if (activeRequest.status === 'completed') {
      toast.success('Service completed!');
      navigate('/dashboard/requests'); // Or review page
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('room:join', `request_${activeRequest.id}`);
    }

    // Fetch initial mechanic location if assigned
    if (activeRequest.mechanic_id) {
      getLastLocation(activeRequest.mechanic_id).then(res => {
        if (res.data?.data) {
          updateMechanicLocation({ 
            lat: res.data.data.coordinates[1], 
            lng: res.data.data.coordinates[0] 
          });
        }
      }).catch(() => {});
    }

    return () => {
      if (socket) socket.emit('room:leave', `request_${activeRequest.id}`);
    };
  }, [activeRequest?.id, activeRequest?.status, activeRequest?.mechanic_id]);

  if (!activeRequest) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold text-dark">No Active Request</h2>
        <p className="text-muted mt-2 mb-6">You don't have any active service requests right now.</p>
        <button onClick={() => navigate('/dashboard/request')} className="btn-primary">Request Help Now</button>
      </div>
    );
  }

  const statuses = ['pending', 'accepted', 'en_route', 'arrived', 'completed'];
  const currentStatusIndex = statuses.indexOf(activeRequest.status);
  const userLoc = { 
    lat: activeRequest.location.coordinates[1], 
    lng: activeRequest.location.coordinates[0] 
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    setCancelling(true);
    try {
      await cancelRequest(activeRequest.id, 'User cancelled from tracking page');
      toast.success('Request cancelled successfully');
      fetchActiveRequest();
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to cancel request');
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in relative">
      {/* Status Bar */}
      <div className="bg-white p-6 rounded-t-2xl shadow-sm z-10">
        <h2 className="text-xl font-bold text-dark mb-4">Request Status</h2>
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500" 
            style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
          ></div>
          
          {statuses.map((status, idx) => {
            const isCompleted = idx <= currentStatusIndex;
            return (
              <div key={status} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isCompleted ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-transparent'}
                `}>
                  ✓
                </div>
                <span className={`text-[10px] font-bold uppercase ${isCompleted ? 'text-primary' : 'text-gray-400'}`}>
                  {status.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 bg-gray-100 relative z-0">
        <MapContainer center={userLoc} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={userLoc} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
          {mechanicLocation && (
            <Marker position={mechanicLocation} icon={mechanicIcon}>
              <Popup>Mechanic Location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Mechanic Info / Controls (Bottom Sheet style) */}
      <div className="bg-white p-6 rounded-b-2xl shadow-card z-10 flex flex-col md:flex-row justify-between items-center gap-4">
        {activeRequest.mechanic ? (
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden">
              <img src="https://ui-avatars.com/api/?name=Mechanic&background=random" alt="Mechanic" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-dark text-lg">{activeRequest.mechanic.user?.full_name || 'Mechanic Assigned'}</h3>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="flex items-center text-yellow-500"><FiStar className="mr-1" /> {activeRequest.mechanic.rating}</span>
                <span>•</span>
                <span className={`badge-${activeRequest.status}`}>{activeRequest.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-14 h-14 rounded-full border-4 border-gray-200 border-t-primary animate-spin"></div>
            <div>
              <h3 className="font-bold text-dark text-lg">Finding Nearby Mechanic...</h3>
              <p className="text-sm text-muted">Please wait while we assign the best partner.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full md:w-auto">
          {(activeRequest.status === 'pending' || activeRequest.status === 'accepted') && (
            <button 
              onClick={handleCancel} 
              disabled={cancelling}
              className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-danger bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 transition"
            >
              <FiXCircle /> {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          {activeRequest.mechanic && (
            <a 
              href={`tel:${activeRequest.mechanic.user?.phone}`}
              className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2 transition"
            >
              <FiPhone /> Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
