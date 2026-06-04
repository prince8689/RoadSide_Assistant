import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import { FiPhone, FiCheck, FiMapPin, FiNavigation } from 'react-icons/fi';
import api from '../../../api/axios';
import { getSocket } from '../../../socket/socketClient';
import PageTransition from '../../../components/common/PageTransition';

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const mechanicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const ActiveJobPage = () => {
  const [activeJob, setActiveJob] = useState(null);
  const [mechLoc, setMechLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const locationInterval = useRef(null);
  const navigate = useNavigate();

  const fetchActive = async () => {
    try {
      const res = await api.get('/requests/active-job');
      setActiveJob(res.data.data);
    } catch { setActiveJob(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  // Location sharing logic
  useEffect(() => {
    if (!activeJob) return;
    const socket = getSocket();
    
    // Send location every 5 seconds if accepted, en_route or arrived
    if (['accepted', 'en_route', 'arrived'].includes(activeJob.status)) {
      if (navigator.geolocation) {
        locationInterval.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setMechLoc({ lat, lng });
            if (socket) {
              socket.emit('mechanic:location:update', { lat, lng, requestId: activeJob.id });
            }
          });
        }, 5000);
      }
    }
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, [activeJob?.status, activeJob?.id]);

  const handleUpdateStatus = async (status) => {
    try {
      await api.patch(`/requests/${activeJob.id}/status`, { status });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      fetchActive();
      if (status === 'completed') {
        toast.success('Great job! Job completed successfully.');
        navigate('/mechanic');
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (!activeJob) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-dark">No Active Job</h2>
        <p className="text-muted mt-2 mb-6">You don't have any ongoing service right now.</p>
        <button onClick={() => navigate('/mechanic/requests')} className="btn-primary">View New Requests</button>
      </div>
    );
  }

  const userLoc = { lat: activeJob.location.coordinates[1], lng: activeJob.location.coordinates[0] };
  const mapCenter = mechLoc || userLoc;

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-140px)] relative max-w-5xl mx-auto">
        <div className="bg-dark p-4 rounded-t-2xl text-white flex justify-between items-center z-10">
        <h2 className="font-bold">Active Job</h2>
        <span className={`px-3 py-1 text-xs font-bold uppercase rounded bg-white text-dark`}>
          ● {activeJob.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex-1 bg-gray-200 relative z-0">
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={userLoc} icon={userIcon}><Popup>Customer Location</Popup></Marker>
          {mechLoc && <Marker position={mechLoc} icon={mechanicIcon}><Popup>Your Location</Popup></Marker>}
        </MapContainer>
      </div>

      <div className="bg-white p-6 rounded-b-2xl shadow-card z-10 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="space-y-2 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold">
              {activeJob.user?.full_name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-dark text-lg">{activeJob.user?.full_name}</h3>
              <a href={`tel:${activeJob.user?.phone}`} className="text-primary font-medium text-sm flex items-center gap-1">
                <FiPhone /> {activeJob.user?.phone}
              </a>
            </div>
          </div>
          <div className="text-sm mt-3 pl-15 space-y-1">
            <p className="font-semibold text-dark">{activeJob.vehicle?.make} {activeJob.vehicle?.model} • {activeJob.vehicle?.license_plate}</p>
            <p className="text-muted flex items-center gap-1"><FiMapPin className="text-gray-400" /> {activeJob.address || 'Map Location'}</p>
            <p className="font-bold text-primary mt-1">Estimated: ₹{activeJob.estimated_price}</p>
          </div>
        </div>

        <div className="flex flex-col w-full md:w-64 gap-3">
          {activeJob.status === 'accepted' && (
            <button onClick={() => handleUpdateStatus('en_route')} className="btn-primary w-full flex items-center justify-center gap-2">
              <FiNavigation /> I'm On My Way
            </button>
          )}
          {activeJob.status === 'en_route' && (
            <button onClick={() => handleUpdateStatus('arrived')} className="btn-primary w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600">
              <FiMapPin /> I've Arrived
            </button>
          )}
          {activeJob.status === 'arrived' && (
            <button onClick={() => handleUpdateStatus('in_progress')} className="btn-primary w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600">
              <FiTool /> Start Work
            </button>
          )}
          {activeJob.status === 'in_progress' && (
            <button onClick={() => handleUpdateStatus('completed')} className="btn-primary w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600">
              <FiCheck /> Mark Complete
            </button>
          )}
          <a href={`tel:${activeJob.user?.phone}`} className="btn-outline w-full flex items-center justify-center gap-2 py-3">
            <FiPhone /> Call Customer
          </a>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default ActiveJobPage;
