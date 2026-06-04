import { useEffect, useState } from 'react';
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
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const mechanicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const ActiveJobPage = () => {
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [mechLoc, setMechLoc] = useState(null);
  const navigate = useNavigate();

  const fetchActiveJob = async () => {
    try {
      const res = await api.get('/mechanics/job/active');
      const job = res.data.data;
      if (job) {
        setActiveJob(job);
        setUserLoc([parseFloat(job.latitude), parseFloat(job.longitude)]);
      } else {
        setActiveJob(null);
      }
    } catch {
      setActiveJob(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveJob();
    const socket = getSocket();
    if (socket) {
      socket.on('request:status:updated', (data) => {
        if (activeJob && data.requestId === activeJob.id) {
          setActiveJob(prev => ({ ...prev, status: data.status }));
        }
      });
    }
    
    // Live location tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMechLoc([latitude, longitude]);
        if (socket) {
          socket.emit('mechanic:location:update', { latitude, longitude });
        }
      },
      (err) => console.log('Location error', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeJob?.id]);

  const handleUpdateStatus = async (status) => {
    try {
      await api.patch(`/mechanics/job/${activeJob.id}/status`, { status });
      setActiveJob({ ...activeJob, status });
      toast.success(`Job marked as ${status.replace('_', ' ')}`);
      if (status === 'completed') {
        navigate('/mechanic/home');
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading active job...</div>;

  if (!activeJob) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4 text-gray-300">🔧</div>
        <h2 className="text-2xl font-bold text-dark">No Active Job</h2>
        <p className="text-muted mt-2">You don't have any ongoing requests right now.</p>
        <button onClick={() => navigate('/mechanic/requests')} className="mt-6 btn-primary">Check New Requests</button>
      </div>
    );
  }

  const mapCenter = mechLoc || userLoc;

  return (
    <PageTransition>
      <div className="relative h-[calc(100vh-140px)] flex flex-col md:flex-row max-w-5xl mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Map Container */}
        <div className="h-[50vh] md:h-full w-full md:flex-1 relative z-10">
          {mapCenter && (
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={userLoc} icon={userIcon}><Popup>Customer Location</Popup></Marker>
              {mechLoc && <Marker position={mechLoc} icon={mechanicIcon}><Popup>Your Location</Popup></Marker>}
            </MapContainer>
          )}
        </div>

        {/* Info Card */}
        <div className="fixed bottom-[4.5rem] md:bottom-auto md:relative md:w-96 left-0 right-0 bg-white rounded-t-3xl md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none z-20 overflow-hidden flex flex-col md:h-full md:border-l md:border-gray-200">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-3 md:hidden"></div>
          
          <div className="bg-dark text-white p-5 md:rounded-none flex justify-between items-center">
            <h2 className="font-bold">Active Job</h2>
            <span className={`px-3 py-1 text-xs font-bold uppercase rounded bg-white text-dark`}>
              ● {activeJob.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold shadow-sm">
                  {activeJob.user?.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-dark text-lg">{activeJob.user?.full_name}</h3>
                  <a href={`tel:${activeJob.user?.phone}`} className="text-primary font-medium text-sm flex items-center gap-1 hover:underline">
                    <FiPhone /> {activeJob.user?.phone}
                  </a>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Service Required</p>
                <p className="font-semibold text-dark">{activeJob.service?.name}</p>
                
                <p className="text-xs font-bold text-gray-500 uppercase mt-3 mb-1">Vehicle Details</p>
                <p className="font-semibold text-dark">{activeJob.vehicle?.make} {activeJob.vehicle?.model} ({activeJob.vehicle?.year})</p>
                <p className="text-sm text-gray-600">{activeJob.vehicle?.license_plate}</p>
              </div>

              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium">
                <FiMapPin className="mt-0.5 flex-shrink-0" />
                <p>{activeJob.address || 'Location provided via GPS'}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              {activeJob.status === 'accepted' && (
                <button onClick={() => handleUpdateStatus('en_route')} className="btn-primary w-full flex justify-center items-center gap-2 py-3 shadow-md">
                  <FiNavigation /> Start Journey (En Route)
                </button>
              )}
              {activeJob.status === 'en_route' && (
                <button onClick={() => handleUpdateStatus('arrived')} className="btn-primary w-full flex justify-center items-center gap-2 py-3 shadow-md">
                  <FiMapPin /> Mark as Arrived
                </button>
              )}
              {activeJob.status === 'arrived' && (
                <button onClick={() => handleUpdateStatus('in_progress')} className="btn-primary w-full flex justify-center items-center gap-2 py-3 shadow-md">
                  <FiCheck /> Start Working
                </button>
              )}
              {activeJob.status === 'in_progress' && (
                <button onClick={() => handleUpdateStatus('completed')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl py-3 transition shadow-md flex justify-center items-center gap-2">
                  <FiCheck /> Complete Job
                </button>
              )}

              <a href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.latitude},${activeJob.longitude}`} target="_blank" rel="noreferrer" className="btn-outline w-full flex items-center justify-center gap-2 py-3">
                <FiNavigation /> Navigate on Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ActiveJobPage;
