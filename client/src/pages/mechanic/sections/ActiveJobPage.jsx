import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import useMechanicStore from '../../../store/mechanicStore';
import { updateStatus, generateInvoice } from '../../../api/mechanicApi';
import { getSocket } from '../../../socket/socketClient';
import toast from 'react-hot-toast';
import { FiPhone, FiNavigation, FiMapPin, FiCheck } from 'react-icons/fi';
import PageTransition from '../../../components/common/PageTransition';
import axiosInst from '../../../api/axios';
const mapContainerStyle = { width: '100%', height: '100%' };
const mapOptions = { disableDefaultUI: true, zoomControl: true };

const ActiveJobPage = () => {
  const { activeJobs, fetchActiveJobs } = useMechanicStore();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [mechLoc, setMechLoc] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isBillingMode, setIsBillingMode] = useState(false);
  const [billItems, setBillItems] = useState([{ name: '', amount: '' }]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveJobs().finally(() => setLoading(false));
  }, []);

  const activeJob = activeJobs.find(j => j.id === selectedJobId) || activeJobs[0];

  useEffect(() => {
    if (activeJob) {
      if (selectedJobId !== activeJob.id) {
        setSelectedJobId(activeJob.id);
      }
      if (activeJob.breakdown_lat && activeJob.breakdown_lng) {
        setUserLoc({ lat: parseFloat(activeJob.breakdown_lat), lng: parseFloat(activeJob.breakdown_lng) });
      } else if (activeJob.user_lat && activeJob.user_lng) {
        setUserLoc({ lat: parseFloat(activeJob.user_lat), lng: parseFloat(activeJob.user_lng) });
      } else if (activeJob.latitude && activeJob.longitude) {
        setUserLoc({ lat: parseFloat(activeJob.latitude), lng: parseFloat(activeJob.longitude) });
      }
    } else {
      setUserLoc(null);
    }
  }, [activeJob, selectedJobId]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('request:status:updated', (data) => {
        fetchActiveJobs();
      });
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMechLoc({ lat: latitude, lng: longitude });
        if (socket) {
          socket.emit('mechanic:location:update', { latitude, longitude });
        }
      },
      (err) => console.log('Location error', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (socket) socket.off('request:status:updated');
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (userLoc && mechLoc && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: mechLoc,
          destination: userLoc,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            setDirections(null);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [userLoc, mechLoc]);

  const handleUpdateStatus = async (status) => {
    try {
      await updateStatus(activeJob.id, status);
      toast.success(`Job marked as ${status.replace('_', ' ')}`);
      await fetchActiveJobs();
      if (status === 'completed') {
        // If there are no more active jobs, redirect to home
        if (activeJobs.length <= 1) navigate('/mechanic/home');
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateBill = async () => {
    const validItems = billItems.filter(item => item.name && item.amount && !isNaN(item.amount));
    if (validItems.length === 0) return toast.error('Please add at least one valid item');
    
    setIsGenerating(true);
    try {
      await generateInvoice(activeJob.id, validItems);
      setIsBillingMode(false);
      toast.success('Bill generated and sent to user');
      fetchActiveJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isVerifying, setIsVerifying] = useState(false);
  const handleVerifyPayment = async () => {
    setIsVerifying(true);
    try {
      await axiosInst.post(`/requests/${activeJob.id}/verify-payment`);
      toast.success('Payment verified successfully!');
      fetchActiveJobs();
      navigate('/mechanic/history');
    } catch (err) {
      toast.error('Failed to verify payment');
    } finally {
      setIsVerifying(false);
    }
  };

  const [isRejecting, setIsRejecting] = useState(false);
  const handleRejectPayment = async () => {
    if (!window.confirm('Are you sure you want to reject this payment? The user will have to submit it again.')) return;
    setIsRejecting(true);
    try {
      await axiosInst.post(`/requests/${activeJob.id}/reject-payment`);
      toast.success('Payment rejected. User notified.');
      fetchActiveJobs();
    } catch (err) {
      toast.error('Failed to reject payment');
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading active jobs...</div>;

  if (activeJobs.length === 0) {
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
      <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-4">
        
        {/* Job Selector Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-3 overflow-y-auto">
          <h2 className="font-bold text-xl px-2">Active Jobs ({activeJobs.length})</h2>
          {activeJobs.map(job => (
            <div 
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${activeJob?.id === job.id ? 'border-primary bg-white shadow-md' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-dark">{job.user_name || job.user?.full_name || 'User'}</span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded-md font-bold text-gray-600 uppercase">
                  {job.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm font-medium text-primary mb-1">{job.category_name || job.service?.name}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <FiMapPin /> {job.breakdown_address || job.address || 'GPS Location'}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          
          {/* Map Container */}
          <div className="h-[40vh] md:h-full w-full md:flex-1 relative z-10 border-b md:border-b-0 md:border-r border-gray-200">
            {mapCenter && (
              <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={13} options={mapOptions}>
                {userLoc && !directions && <Marker position={userLoc} icon={{ path: window.google?.maps?.SymbolPath?.CIRCLE || 0, fillColor: '#007BFF', fillOpacity: 1, strokeWeight: 3, strokeColor: '#FFFFFF', scale: 8 }} />}
                {mechLoc && !directions && <Marker position={mechLoc} icon={{ path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', fillColor: '#FF8A00', fillOpacity: 1, strokeWeight: 2, strokeColor: '#FFFFFF', scale: 1.5 }} />}
                {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#FF8A00', strokeWeight: 5, strokeOpacity: 0.8 } }} />}
                {directions && mechLoc && <Marker position={mechLoc} icon={{ path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', fillColor: '#FF8A00', fillOpacity: 1, strokeWeight: 2, strokeColor: '#FFFFFF', scale: 1.5, zIndex: 99 }} />}
                {directions && userLoc && <Marker position={userLoc} icon={{ path: window.google?.maps?.SymbolPath?.CIRCLE || 0, fillColor: '#007BFF', fillOpacity: 1, strokeWeight: 3, strokeColor: '#FFFFFF', scale: 8, zIndex: 98 }} />}
              </GoogleMap>
            )}
          </div>

          {/* Info Card */}
          <div className="md:w-[350px] bg-white flex flex-col h-full overflow-y-auto">
            <div className="bg-dark text-white p-4 flex justify-between items-center sticky top-0 z-20">
              <h2 className="font-bold truncate">Job Details</h2>
            </div>

            {activeJob && (
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold shadow-sm">
                    {(activeJob.user_name || activeJob.user?.full_name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-dark text-lg">{activeJob.user_name || activeJob.user?.full_name}</h3>
                    {(activeJob.user_phone || activeJob.user?.phone) === 'Hidden by User' ? (
                      <span className="text-gray-500 font-medium text-sm flex items-center gap-1 italic">
                        <FiPhone /> Hidden by User
                      </span>
                    ) : (
                      <a href={`tel:${activeJob.user_phone || activeJob.user?.phone}`} className="text-primary font-medium text-sm flex items-center gap-1 hover:underline">
                        <FiPhone /> {activeJob.user_phone || activeJob.user?.phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Service Required</p>
                  <p className="font-semibold text-dark">{activeJob.category_name || activeJob.service?.name}</p>
                  
                  <p className="text-xs font-bold text-gray-500 uppercase mt-3 mb-1">Vehicle Details</p>
                  <p className="font-semibold text-dark">{activeJob.vehicle_make || activeJob.vehicle?.make} {activeJob.vehicle_model || activeJob.vehicle?.model} ({activeJob.vehicle_year || activeJob.vehicle?.year})</p>
                  <p className="text-sm text-gray-600">{activeJob.vehicle_license_plate || activeJob.vehicle?.license_plate}</p>
                </div>

                <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium">
                  <FiMapPin className="mt-0.5 flex-shrink-0" />
                  <p>{activeJob.breakdown_address || activeJob.address || 'Location provided via GPS'}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {activeJob.status === 'accepted' && (
                    <button onClick={() => handleUpdateStatus('en_route')} className="btn-primary w-full flex justify-center items-center gap-2 py-3 shadow-md">
                      <FiNavigation /> Start Journey
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
                  {activeJob.status === 'in_progress' && !isBillingMode && (
                    <button onClick={() => setIsBillingMode(true)} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl py-3 transition shadow-md flex justify-center items-center gap-2">
                      <FiCheck /> Generate Bill
                    </button>
                  )}
                  {activeJob.status === 'awaiting_payment' && !isBillingMode && (
                    <button onClick={() => setIsBillingMode(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-3 transition shadow-md flex justify-center items-center gap-2">
                      <FiCheck /> Regenerate Bill
                    </button>
                  )}

                  {isBillingMode && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
                      <h4 className="font-bold text-dark mb-3">Service Bill</h4>
                      {billItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input type="text" placeholder="Item" className="input-field flex-1 text-sm p-2" value={item.name} onChange={(e) => { const n = [...billItems]; n[idx].name = e.target.value; setBillItems(n); }} />
                          <input type="number" placeholder="₹" className="input-field w-20 text-sm p-2" value={item.amount} onChange={(e) => { const n = [...billItems]; n[idx].amount = e.target.value; setBillItems(n); }} />
                        </div>
                      ))}
                      <button onClick={() => setBillItems([...billItems, {name: '', amount: ''}])} className="text-primary text-sm font-bold mb-4 hover:underline">+ Add Item</button>
                      <div className="flex gap-2">
                        <button onClick={() => setIsBillingMode(false)} className="btn-outline flex-1 py-2 text-sm" disabled={isGenerating}>Cancel</button>
                        <button onClick={handleGenerateBill} disabled={isGenerating} className="btn-primary flex-1 py-2 text-sm">
                          {isGenerating ? 'Sending...' : 'Send Bill'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeJob.status === 'awaiting_payment' && !isBillingMode && (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 text-center font-bold text-sm">
                      ⏳ Waiting for payment...
                    </div>
                  )}

                  {activeJob.status === 'payment_verification' && (
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                      <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <span>🛡️</span> Payment Verification Required
                      </h4>
                      <p className="text-sm text-indigo-800 mb-4">
                        The user has submitted their payment via <strong>{activeJob.payment_method?.toUpperCase()}</strong>.
                      </p>
                      
                      {activeJob.payment_method === 'online' && activeJob.payment_receipt_url && (
                        <a href={`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'}${activeJob.payment_receipt_url}`} target="_blank" rel="noreferrer" className="block text-center text-sm font-bold text-blue-600 bg-white border border-blue-200 py-2 rounded-lg mb-4 hover:bg-blue-50 transition">
                          View Uploaded Receipt
                        </a>
                      )}

                      <div className="flex gap-2">
                        <button 
                          onClick={handleRejectPayment} 
                          disabled={isRejecting || isVerifying}
                          className="w-1/3 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition shadow-sm border border-red-200 flex justify-center items-center"
                        >
                          {isRejecting ? '...' : 'Reject'}
                        </button>
                        <button 
                          onClick={handleVerifyPayment} 
                          disabled={isVerifying || isRejecting}
                          className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-md flex justify-center items-center gap-2"
                        >
                          {isVerifying ? 'Verifying...' : 'Approve Payment'}
                        </button>
                      </div>
                    </div>
                  )}

                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.latitude || activeJob.breakdown_lat},${activeJob.longitude || activeJob.breakdown_lng}`} target="_blank" rel="noreferrer" className="btn-outline w-full flex items-center justify-center gap-2 py-3">
                    <FiNavigation /> Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ActiveJobPage;
