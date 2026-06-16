import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Circle, DirectionsRenderer } from '@react-google-maps/api';
import { FiMapPin, FiNavigation, FiClock, FiDollarSign, FiCheck, FiX, FiActivity } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import useSocket from '../../../hooks/useSocket';
import useMechanicStore from '../../../store/mechanicStore';
import { getCurrentLocation, watchLocation, stopWatchingLocation } from '../../../utils/geolocation';
import { notifyNewRequest } from '../../../utils/browserNotifications';
import axiosInst from '../../../api/axios';
import PageTransition from '../../../components/common/PageTransition';
import { getSocket } from '../../../socket/socketClient';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '16px' };
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
};

const MechanicHomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const { emitLocationUpdate } = useSocket();
  
  const { profile, activeJobs, fetchActiveJobs, isAvailable, toggleAvailability } = useMechanicStore();
  const activeJob = activeJobs && activeJobs.length > 0 ? activeJobs[0] : null;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationInterval, setLocationInterval] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [countdown, setCountdown] = useState(20);
  const [directions, setDirections] = useState(null);
  const [isBlocked, setIsBlocked] = useState(profile?.is_blocked || false);
  
  const mapRef = useRef(null);

  // Check initial state
  useEffect(() => {
    fetchActiveJobs();
    // Assuming profile has is_available we could initialize isOnline, but 
    // it's safer to require manual opt-in on mount.
    
    const socket = getSocket();
    if (socket) {
      socket.on('request:new', handleIncomingRequest);
      socket.on('mechanic:blocked', (data) => {
        setIsBlocked(true);
        toast.error(data.message || 'Your account has been blocked.');
        if (isAvailable) toggleAvailability();
      });
      socket.on('user:share_location', (data) => {
        if (activeJob && activeJob.id === data.requestId) {
          toast.success("User shared exact location!");
          fetchActiveJobs(); // Refetch the active job to get updated coords
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('request:new', handleIncomingRequest);
        socket.off('mechanic:blocked');
        socket.off('user:share_location');
      }
    };
  }, []); // eslint-disable-line

  // Handle location tracking and socket status based on global isAvailable
  useEffect(() => {
    let currentWatchId = null;
    let currentInterval = null;

    const startTracking = async () => {
      try {
        const loc = await getCurrentLocation();
        setCurrentLocation(loc);
        
        currentWatchId = watchLocation(
          (pos) => setCurrentLocation(pos),
          (err) => console.error(`Location issue: ${err}`)
        );
        setWatchId(currentWatchId);

        const socket = getSocket();
        if (socket) socket.emit('mechanic:status-change', { status: 'available' });

        emitLocationUpdate(user.id, loc.lat, loc.lng, loc.accuracy);
        currentInterval = setInterval(() => {
          getCurrentLocation().then(pos => {
            emitLocationUpdate(user.id, pos.lat, pos.lng, pos.accuracy);
          }).catch(console.error);
        }, 10000);
        setLocationInterval(currentInterval);
      } catch (err) {
        console.error(err);
      }
    };

    const initFetch = async () => {
      try {
        const loc = await getCurrentLocation();
        setCurrentLocation(loc);
        emitLocationUpdate(user.id, loc.lat, loc.lng, loc.accuracy);
      } catch (e) {
        console.error('Initial location fetch failed', e);
      }
    };
    initFetch();

    if (isAvailable) {
      startTracking();
    } else {
      const socket = getSocket();
      if (socket) socket.emit('mechanic:status-change', { status: 'offline' });
    }

    return () => {
      if (currentWatchId) stopWatchingLocation(currentWatchId);
      if (currentInterval) clearInterval(currentInterval);
    };
  }, [isAvailable, user.id, emitLocationUpdate]);

  // Handle incoming request modal
  const handleIncomingRequest = (data) => {
    setIncomingRequest(data);
    setCountdown(20);
    notifyNewRequest(data.userName, data.serviceType, data.distance);
  };

  // Countdown timer for incoming request modal
  useEffect(() => {
    let timer;
    if (incomingRequest && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0 && incomingRequest) {
      // Just close the modal, do not decline the request automatically
      setIncomingRequest(null);
    }
    return () => clearInterval(timer);
  }, [incomingRequest, countdown]);

  // Handle Online Toggle
  const toggleOnlineStatus = async () => {
    const res = await toggleAvailability();
    if (res.success) {
      toast.success(isAvailable ? 'You are now offline' : 'You are now online and visible to users!', { icon: isAvailable ? '⚫' : '✅' });
    } else {
      toast.error('Failed to change status');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axiosInst.patch(`/requests/${requestId}/accept`);
      setIncomingRequest(null);
      toast.success('Job Accepted!');
      fetchActiveJobs(); // This will pull the job into state and show the Active Job Map
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept job');
      setIncomingRequest(null);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await axiosInst.patch(`/requests/${requestId}/reject`);
    } catch (err) { console.error(err); }
    setIncomingRequest(null);
  };

  const handleUpdateJobStatus = async (status) => {
    if (!activeJob) return;
    try {
      await axiosInst.put(`/requests/${activeJob.id}/status`, { status });
      toast.success(`Status updated to: ${status.replace('_', ' ')}`);
      fetchActiveJobs();
      
      const socket = getSocket();
      if (socket) {
        if (status === 'completed') socket.emit('mechanic:status-change', { status: 'available' });
        else socket.emit('mechanic:status-change', { status: 'busy' });
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Google Maps Directions for Active Job
  useEffect(() => {
    if (activeJob && currentLocation && activeJob.breakdown_lat && activeJob.breakdown_lng && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: currentLocation.lat, lng: currentLocation.lng },
          destination: { lat: parseFloat(activeJob.breakdown_lat), lng: parseFloat(activeJob.breakdown_lng) },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [activeJob, currentLocation]);

  const openNavigation = () => {
    if (activeJob) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${activeJob.breakdown_lat},${activeJob.breakdown_lng}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const requestExactLocation = () => {
    if (activeJob) {
      const socket = getSocket();
      if (socket) {
        socket.emit('mechanic:request_location', { requestId: activeJob.id });
        toast.success("Location request sent to user!");
      }
    }
  };

  return (
    <PageTransition>
      <div className="pb-24 max-w-lg mx-auto md:max-w-4xl space-y-6">
        
        {isBlocked ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center mt-10 shadow-sm">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              <FiX />
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Account Suspended</h2>
            <p className="text-red-700 max-w-md mx-auto mb-6">
              Your account has been temporarily blocked due to a high rate of ignored or declined requests. Please wait for an admin to review your account or contact support.
            </p>
            <a href="mailto:support@roadassist.com" className="btn-primary inline-flex items-center gap-2">
              Contact Support
            </a>
          </div>
        ) : (
          <>
            {/* Toggle Online/Offline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
              Status: 
              {isAvailable ? <span className="text-green-500 flex items-center gap-1"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span> Online</span> 
                        : <span className="text-gray-500 flex items-center gap-1"><div className="w-3 h-3 bg-gray-400 rounded-full"></div> Offline</span>}
            </h2>
            <p className="text-sm text-gray-500">
              {isAvailable ? "You are visible to users and can receive job requests." : "Go online to start receiving jobs in your area."}
            </p>
          </div>
          
          <button 
            onClick={toggleOnlineStatus}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none ${isAvailable ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <span className={`${isAvailable ? 'translate-x-11' : 'translate-x-1'} inline-block h-8 w-8 transform rounded-full bg-white transition-transform shadow-sm`} />
          </button>
        </div>

        {/* MAIN VIEW: Idle Map vs Active Job Map */}
        {!activeJob ? (
          /* Idle Map View */
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 h-[300px] relative">
            {!currentLocation ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FiMapPin size={32} className="mb-2 opacity-50" />
                <p>Location unavailable. Go online to view map.</p>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                options={mapOptions}
                center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                zoom={12}
              >
                <Marker 
                  position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    fillColor: isAvailable ? '#28A745' : '#6C757D',
                    fillOpacity: 1,
                    strokeWeight: 3,
                    strokeColor: '#FFFFFF',
                    scale: 8,
                  }}
                />
                <Circle
                  center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                  radius={profile?.service_radius_km ? profile.service_radius_km * 1000 : 10000} // Default 10km
                  options={{
                    fillColor: isAvailable ? '#28A745' : '#6C757D',
                    fillOpacity: 0.05,
                    strokeColor: isAvailable ? '#28A745' : '#6C757D',
                    strokeOpacity: 0.2,
                    strokeWeight: 1,
                  }}
                />
              </GoogleMap>
            )}
            {isAvailable && (
              <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-center text-sm font-medium text-green-700 shadow-sm border border-green-100">
                Scanning for nearby requests...
              </div>
            )}
          </div>
        ) : (
          /* Active Job Map and Controls */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
              <div className="h-[250px] relative">
                {currentLocation && activeJob.breakdown_lat ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    options={mapOptions}
                    center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                    zoom={13}
                  >
                    <Marker 
                      position={{ lat: parseFloat(activeJob.breakdown_lat), lng: parseFloat(activeJob.breakdown_lng) }}
                      icon={{
                        path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                        fillColor: '#007BFF', // User is blue
                        fillOpacity: 1, strokeWeight: 3, strokeColor: '#FFFFFF', scale: 8
                      }}
                    />
                    {directions && (
                      <DirectionsRenderer 
                        directions={directions}
                        options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#FF8A00', strokeWeight: 5 } }}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
                )}

                <button 
                  onClick={openNavigation}
                  className="absolute bottom-4 right-4 bg-white text-primary px-4 py-2 rounded-xl shadow-lg font-bold flex items-center gap-2 hover:bg-gray-50"
                >
                  <FiNavigation /> Navigate
                </button>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">{activeJob.service_type || 'Roadside Assistance'}</h3>
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <FiMapPin size={14} /> {activeJob.user_address || 'Customer Location'}
                    </p>
                  </div>
                  <div className="bg-orange-50 text-orange-700 font-bold px-3 py-1 rounded-lg">
                    {activeJob.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                {activeJob.description && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-700">
                    <strong>Issue:</strong> {activeJob.description}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={requestExactLocation} className="col-span-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 mb-2">
                    <FiMapPin size={18} /> Request Exact GPS Location
                  </button>
                  
                  {activeJob.status === 'accepted' && (
                    <button onClick={() => handleUpdateJobStatus('en_route')} className="col-span-2 bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl">
                      I'm On My Way
                    </button>
                  )}
                  {activeJob.status === 'en_route' && (
                    <button onClick={() => handleUpdateJobStatus('arrived')} className="col-span-2 bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl">
                      I've Arrived
                    </button>
                  )}
                  {activeJob.status === 'arrived' && (
                    <button onClick={() => handleUpdateJobStatus('in_progress')} className="col-span-2 bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl">
                      Start Job
                    </button>
                  )}
                  
                  {activeJob.status === 'awaiting_payment' && (
                    <div className="col-span-2 bg-orange-50 border border-orange-200 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      Waiting for Customer Payment...
                    </div>
                  )}

                  {activeJob.status === 'payment_verification' && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-bold text-blue-900 mb-2">Verify Online Payment</h4>
                      <p className="text-sm text-blue-700 mb-3">Customer has uploaded an online payment receipt. Please verify.</p>
                      {activeJob.payment_receipt_url && (
                        <a href={`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'}${activeJob.payment_receipt_url}`} target="_blank" rel="noreferrer" className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl mb-2">
                          View Receipt
                        </a>
                      )}
                      <button 
                        onClick={async () => {
                          try {
                            await axiosInst.post(`/requests/${activeJob.id}/verify-payment`);
                            toast.success('Payment verified! Job complete.');
                            fetchActiveJobs();
                          } catch (err) {
                            toast.error('Failed to verify payment');
                          }
                        }}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl"
                      >
                        Approve Payment & Complete Job
                      </button>
                    </div>
                  )}
                  {activeJob.status === 'completed' && (
                    <div className="col-span-2 bg-green-50 text-green-700 font-bold py-3 rounded-xl flex items-center justify-center">
                      Job Completed
                    </div>
                  )}

{activeJob.status === 'in_progress' && (
                    <button onClick={() => handleUpdateJobStatus('awaiting_payment')} className="col-span-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      <FiCheck size={20} /> Request Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Incoming Request Modal */}
      <AnimatePresence>
        {incomingRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-2xl overflow-hidden relative z-10 shadow-2xl"
            >
              <div className="bg-gradient-to-r from-orange-400 to-primary p-6 text-white text-center relative">
                <div className="absolute top-4 right-4 w-10 h-10 border-4 border-white/30 border-t-white rounded-full flex items-center justify-center text-sm font-bold">
                  {countdown}
                </div>
                <div className="w-16 h-16 bg-white text-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <FiActivity size={32} className="animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold">New Request!</h2>
                <p className="opacity-90">{incomingRequest.distance || '?'} km away</p>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Service Needed</div>
                  <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {incomingRequest.serviceType}
                  </div>
                  {incomingRequest.description && (
                    <div className="text-sm text-gray-600 mt-1">{incomingRequest.description}</div>
                  )}
                </div>

                {incomingRequest.userName && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Customer</div>
                    <div className="text-gray-900 font-medium">👤 {incomingRequest.userName}</div>
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Location Area</div>
                  <div className="text-gray-900 font-medium">📍 {incomingRequest.location?.address || 'Nearby Area'}</div>
                </div>

                {incomingRequest.userPhone && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Phone Number</div>
                    <div className="text-blue-600 font-medium">📞 {incomingRequest.userPhone}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIncomingRequest(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <FiX size={20} /> Close / Ignore
                  </button>
                  <button 
                    onClick={() => handleAcceptRequest(incomingRequest.requestId)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                  >
                    <FiCheck size={20} /> Accept
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default MechanicHomePage;
