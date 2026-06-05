import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { FiPhoneCall, FiX, FiCheckCircle, FiClock, FiMapPin, FiNavigation } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  fetchActiveRequestThunk, 
  cancelRequestThunk,
  updateNearbyMechanicLocation 
} from '../../../store/requestStore';
import useSocket from '../../../hooks/useSocket';
import { calculateDistance } from '../../../utils/geolocation';
import axiosInst from '../../../api/axios';
import PageTransition from '../../../components/common/PageTransition';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] }
  ]
};

const STEPS = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed'];
const STEP_LABELS = ['Requested', 'Accepted', 'En Route', 'Arrived', 'In Progress', 'Completed'];

const TrackingPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { watchMechanic, stopWatchingMechanic } = useSocket();
  
  const { activeRequest, mechanicLocation, userLocation } = useSelector(state => state.request);
  const { user } = useSelector(state => state.auth);

  const [mechanicDetails, setMechanicDetails] = useState(null);
  const [directions, setDirections] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const mapRef = useRef(null);

  // Load Request
  useEffect(() => {
    dispatch(fetchActiveRequestThunk());
  }, [dispatch]);

  // Load Mechanic details & start tracking
  useEffect(() => {
    if (activeRequest && activeRequest.mechanic_id) {
      // Fetch mechanic details
      axiosInst.get(`/search/mechanic/${activeRequest.mechanic_id}`)
        .then(res => setMechanicDetails(res.data.data.mechanic))
        .catch(err => console.error(err));

      // Start socket tracking
      watchMechanic(activeRequest.mechanic_id, activeRequest.id, (location) => {
        dispatch(updateNearbyMechanicLocation({ 
          mechanicId: activeRequest.mechanic_id, 
          ...location 
        }));
      });
    }

    return () => {
      if (activeRequest) stopWatchingMechanic(activeRequest.id);
    };
  }, [activeRequest?.mechanic_id, activeRequest?.id, watchMechanic, stopWatchingMechanic, dispatch]);

  // Routing and ETA calculation
  useEffect(() => {
    if (activeRequest && mechanicLocation && userLocation && window.google) {
      // Calculate direct distance
      const dist = calculateDistance(
        mechanicLocation.lat, mechanicLocation.lng, 
        userLocation.lat, userLocation.lng
      );
      setDistance(dist);
      setEta(Math.ceil((dist / 30) * 60)); // 30km/h average speed

      // Calculate Google Maps Route every 30 seconds or on first load
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: { lat: mechanicLocation.lat, lng: mechanicLocation.lng },
          destination: { lat: userLocation.lat, lng: userLocation.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            if (result.routes[0]?.legs[0]) {
              const leg = result.routes[0].legs[0];
              setEta(Math.ceil(leg.duration.value / 60));
              setDistance(parseFloat(leg.distance.text));
            }
          }
        }
      );
    }
  }, [mechanicLocation, userLocation, activeRequest]);

  // Fit bounds when map or directions load
  useEffect(() => {
    if (mapRef.current && userLocation && mechanicLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
      bounds.extend({ lat: mechanicLocation.lat, lng: mechanicLocation.lng });
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 300, left: 50, right: 50 });
    }
  }, [mapRef.current, userLocation, mechanicLocation, directions]);

  const handleCancel = async () => {
    try {
      await dispatch(cancelRequestThunk({ 
        requestId: activeRequest.id, 
        reason: 'User cancelled from tracking page' 
      })).unwrap();
      toast.success('Request cancelled successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err || 'Failed to cancel request');
    }
  };

  const handleSubmitReview = async () => {
    try {
      await axiosInst.post('/reviews', {
        request_id: activeRequest.id,
        mechanic_id: activeRequest.mechanic_id,
        rating: reviewScore,
        comment: reviewText
      });
      toast.success('Review submitted successfully!');
      dispatch(fetchActiveRequestThunk()); // Refresh state
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to submit review');
    }
  };

  if (!activeRequest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500">Loading tracking details...</p>
      </div>
    );
  }

  // If completed
  if (activeRequest.status === 'completed') {
    return (
      <PageTransition>
        <div className="max-w-md mx-auto pt-8 px-4 text-center">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Service Completed! 🎉</h2>
          <p className="text-gray-600 mb-8">Your roadside assistance has been completed successfully.</p>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 text-left">
            <h3 className="font-bold text-lg mb-4">Rate {mechanicDetails?.name || 'your mechanic'}</h3>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setReviewScore(star)}
                  className={`text-4xl transition-colors ${reviewScore >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-primary/50"
              rows="3"
              placeholder="Leave a comment (optional)..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            ></textarea>
            
            <button 
              onClick={handleSubmitReview}
              className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Submit Review & Return Home
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 font-medium hover:text-gray-800"
          >
            Skip for now
          </button>
        </div>
      </PageTransition>
    );
  }

  const currentStepIndex = STEPS.indexOf(activeRequest.status);

  return (
    <PageTransition>
      <div className="fixed inset-0 top-16 md:relative md:top-0 md:h-[calc(100vh-100px)] flex flex-col md:max-w-4xl md:mx-auto bg-gray-100 md:rounded-2xl overflow-hidden shadow-sm md:border border-gray-200 md:mt-4">
        
        {/* Progress Bar Header */}
        <div className="bg-white px-4 py-3 shadow-sm z-10 shrink-0">
          <div className="flex justify-between items-end mb-2">
            <h2 className="font-bold text-gray-900">Service Status</h2>
            <div className="text-primary font-bold text-sm bg-orange-50 px-2 py-1 rounded-md">
              {STEP_LABELS[currentStepIndex]}
            </div>
          </div>
          
          <div className="relative pt-4 pb-2">
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
            <div className="absolute top-5 left-0 h-1 bg-primary rounded-full -z-10 transition-all duration-500" 
                 style={{ width: `${(Math.max(currentStepIndex, 0) / (STEPS.length - 1)) * 100}%` }}></div>
            
            <div className="flex justify-between relative">
              {STEPS.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step} className="flex flex-col items-center group relative">
                    <div className={`w-3 h-3 rounded-full transition-colors ${
                      isCurrent ? 'bg-white border-4 border-primary scale-150' 
                      : isActive ? 'bg-primary' : 'bg-gray-300'
                    }`} />
                    {/* Tooltip for desktop */}
                    <span className="absolute top-4 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none md:block hidden">
                      {STEP_LABELS[index]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-gray-200">
          {(!userLocation || (!mechanicLocation && currentStepIndex > 0)) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500 font-medium animate-pulse">Establishing Live Connection...</p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              options={mapOptions}
              onLoad={map => mapRef.current = map}
            >
              {/* User Location */}
              {userLocation && (
                <Marker 
                  position={{ lat: userLocation.lat, lng: userLocation.lng }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#007BFF',
                    fillOpacity: 1,
                    strokeWeight: 3,
                    strokeColor: '#FFFFFF',
                    scale: 8,
                  }}
                  zIndex={1}
                />
              )}

              {/* Mechanic Location (Animated via continuous updates) */}
              {mechanicLocation && (
                <Marker 
                  position={{ lat: mechanicLocation.lat, lng: mechanicLocation.lng }}
                  icon={{
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                    fillColor: '#FF8A00',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                    scale: 1.5,
                    anchor: new window.google.maps.Point(12, 24)
                  }}
                  zIndex={2}
                />
              )}

              {/* Route line */}
              {directions && (
                <DirectionsRenderer 
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: '#FF8A00',
                      strokeWeight: 5,
                      strokeOpacity: 0.8
                    }
                  }}
                />
              )}
            </GoogleMap>
          )}

          {/* Floating Recentering Button */}
          <button 
            onClick={() => {
              if (mapRef.current && userLocation && mechanicLocation) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
                bounds.extend({ lat: mechanicLocation.lat, lng: mechanicLocation.lng });
                mapRef.current.fitBounds(bounds, { top: 50, bottom: 300, left: 50, right: 50 });
              }
            }}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-primary transition-colors"
          >
            <FiNavigation size={18} />
          </button>
        </div>

        {/* Bottom Sheet Details */}
        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-5 pb-8 relative z-20 shrink-0">
          
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
          
          {mechanicDetails ? (
            <div className="flex gap-4 items-center mb-5">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
                {mechanicDetails.name ? mechanicDetails.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{mechanicDetails.name}</h3>
                <div className="text-yellow-500 text-sm font-medium">★ {parseFloat(mechanicDetails.average_rating || 5).toFixed(1)}</div>
                <div className="text-gray-500 text-sm mt-1">{mechanicDetails.specializations?.[0] || 'Roadside Assistant'}</div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 items-center mb-5 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-500 shadow-sm">
                <FiClock size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">ETA</div>
                <div className="font-bold text-gray-900">{eta !== null ? `~${eta} mins` : '--'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm">
                <FiMapPin size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Distance</div>
                <div className="font-bold text-gray-900">{distance !== null ? `${distance} km` : '--'}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {mechanicDetails && (
              <a 
                href={`tel:${mechanicDetails.phone}`}
                className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg shadow-md shadow-green-500/20"
              >
                <FiPhoneCall size={20} /> Call Mechanic
              </a>
            )}
            
            <button 
              onClick={() => setShowCancelConfirm(true)}
              disabled={['arrived', 'in_progress', 'completed'].includes(activeRequest.status)}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCancelConfirm(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <FiX size={24} />
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-900">Cancel Request?</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Are you sure you want to cancel? If the mechanic is already on their way, cancellation fees may apply.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition-colors"
                >
                  No, Keep it
                </button>
                <button 
                  onClick={handleCancel}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-red-500/20"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default TrackingPage;
