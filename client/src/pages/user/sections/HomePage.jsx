import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiMapPin, FiClock, FiAlertCircle, FiChevronRight, FiNavigation } from 'react-icons/fi';
import { MdHardware, MdRvHookup, MdBatteryChargingFull, MdTireRepair, MdLocalGasStation, MdMoreHoriz } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  fetchActiveRequestThunk, 
  fetchNearbyMechanicsThunk, 
  updateUserLocationThunk,
  setUserLocation,
  setSelectedMechanic
} from '../../../store/requestStore';
import { getCurrentLocation } from '../../../utils/geolocation';

import NearbyMechanicsMap from '../../../components/maps/NearbyMechanicsMap';
import MechanicCard from '../../../components/maps/MechanicCard';
import MechanicDetailModal from '../../../components/maps/MechanicDetailModal';
import PageTransition from '../../../components/common/PageTransition';

const services = [
  { id: 'jumpstart', name: 'Battery Jump', icon: MdBatteryChargingFull, type: 'Battery' },
  { id: 'flattyre', name: 'Flat Tyre', icon: MdTireRepair, type: 'Tyre Service' },
  { id: 'fuel', name: 'Fuel Delivery', icon: MdLocalGasStation, type: 'General Maintenance' },
  { id: 'engine', name: 'Breakdown', icon: MdHardware, type: 'Engine Repair' },
  { id: 'tow', name: 'Towing', icon: MdRvHookup, type: 'Towing' },
  { id: 'other', name: 'General Help', icon: MdMoreHoriz, type: 'General Maintenance' }
];

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { user } = useSelector((state) => state.auth);
  const { 
    activeRequest, 
    nearbyMechanics, 
    userLocation, 
    selectedMechanic,
    isLoadingNearby 
  } = useSelector((state) => state.request);

  const [locationError, setLocationError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Nearest'); // Nearest, Top Rated

  useEffect(() => {
    dispatch(fetchActiveRequestThunk());
    
    // Initial location fetch
    requestLocation();

    // Set interval to refresh nearby mechanics if we have location
    const interval = setInterval(() => {
      if (userLocation) {
        dispatch(fetchNearbyMechanicsThunk({ 
          lat: userLocation.lat, 
          lng: userLocation.lng,
          radius: 15
        }));
      }
    }, 5 * 60 * 1000); // 5 mins

    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (userLocation) {
      dispatch(fetchNearbyMechanicsThunk({ 
        lat: userLocation.lat, 
        lng: userLocation.lng,
        radius: 15
      }));
    }
  }, [userLocation, dispatch]);

  const requestLocation = async () => {
    setLocationError(null);
    try {
      const coords = await getCurrentLocation();
      dispatch(setUserLocation(coords));
      dispatch(updateUserLocationThunk(coords));
    } catch (err) {
      setLocationError(err);
    }
  };

  const handleMechanicSelect = (mechanic) => {
    dispatch(setSelectedMechanic(mechanic));
    if (mechanic) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleRequestHelp = (mechanic) => {
    setIsModalOpen(false);
    navigate('/dashboard/request', { state: { selectedMechanicId: mechanic.mechanic_id } });
  };

  const handleServiceClick = (serviceType) => {
    navigate('/dashboard/request', { state: { preselectedService: serviceType } });
  };

  // Sort mechanics
  const sortedMechanics = [...nearbyMechanics].sort((a, b) => {
    if (sortBy === 'Top Rated') return parseFloat(b.average_rating) - parseFloat(a.average_rating);
    return parseFloat(a.distance_km) - parseFloat(b.distance_km); // Nearest default
  });

  const avgArrival = nearbyMechanics.length > 0 
    ? Math.round(nearbyMechanics.reduce((acc, m) => acc + parseInt(m.estimatedArrival || 10), 0) / nearbyMechanics.length)
    : '--';

  return (
    <PageTransition>
      <div className="pb-24 max-w-lg mx-auto md:max-w-4xl space-y-6">
        
        {/* Header greeting */}
        <div className="flex justify-between items-end px-1 pt-2">
          <div>
            <p className="text-gray-500 text-sm">Hello,</p>
            <h1 className="text-2xl font-bold text-gray-900">{user?.name?.split(' ')[0] || 'Driver'} 👋</h1>
          </div>
        </div>

        {/* Section 1: Location Banner */}
        <AnimatePresence>
          {!userLocation && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between"
            >
              <div className="flex items-center gap-3 text-orange-800">
                <FiMapPin size={24} className="shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Location Access Required</h3>
                  <p className="text-xs opacity-90">{locationError || "Enable location to find mechanics near you."}</p>
                </div>
              </div>
              <button 
                onClick={requestLocation}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap w-full sm:w-auto hover:bg-orange-600 transition"
              >
                Allow Location
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 6: Active Request Card (Moved up for priority) */}
        {activeRequest && !['completed', 'cancelled'].includes(activeRequest.status) && (
          <div 
            onClick={() => navigate('/dashboard/tracking')}
            className="bg-gradient-to-r from-primary to-orange-400 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all relative overflow-hidden"
          >
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <FiNavigation size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  {activeRequest.status.replace('_', ' ')}
                </div>
              </div>
              <h3 className="font-bold text-xl mb-1">Your mechanic is on the way!</h3>
              <p className="text-white/80 text-sm mb-4">Click to view live tracking</p>
              
              <button className="bg-white text-primary w-full py-2.5 rounded-xl font-bold flex justify-between items-center px-4 hover:bg-gray-50 transition-colors">
                Track Now <FiChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* Section 2: Quick Stats */}
        {userLocation && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="text-primary font-bold text-xl mb-1">{nearbyMechanics.length}</div>
              <div className="text-xs text-gray-500 font-medium">Nearby<br/>Mechanics</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="text-green-600 font-bold text-xl mb-1">{avgArrival}m</div>
              <div className="text-xs text-gray-500 font-medium">Avg.<br/>Arrival</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="text-blue-600 font-bold text-xl mb-1 flex items-center justify-center"><FiClock size={20} /></div>
              <div className="text-xs text-gray-500 font-medium">24/7<br/>Available</div>
            </div>
          </div>
        )}

        {/* Section 5: Quick Service Buttons */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">What do you need?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.type)}
                className="bg-white border border-gray-100 hover:border-primary/30 hover:shadow-md hover:text-primary transition-all rounded-xl p-4 flex flex-col items-center text-center gap-2 group"
              >
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white text-primary transition-colors">
                  <service.icon size={24} />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">{service.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Map View */}
        <div className="pt-2">
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-lg font-bold text-gray-900">Map View</h2>
            {isLoadingNearby && <span className="text-xs text-primary animate-pulse flex items-center gap-1"><FiAlertCircle /> Updating...</span>}
          </div>
          <NearbyMechanicsMap 
            userLocation={userLocation}
            mechanics={nearbyMechanics}
            onMechanicSelect={handleMechanicSelect}
            selectedMechanic={selectedMechanic}
            height="350px"
          />
        </div>

        {/* Section 4: Mechanics List */}
        {userLocation && (
          <div className="pt-2">
            <div className="flex justify-between items-center mb-4 px-1">
              <h2 className="text-lg font-bold text-gray-900">Mechanics Near You</h2>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['Nearest', 'Top Rated'].map(sort => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      sortBy === sort ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingNearby && nearbyMechanics.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse flex gap-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      <div className="flex gap-2 mt-3">
                        <div className="h-8 bg-gray-200 rounded w-10"></div>
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : nearbyMechanics.length > 0 ? (
              <div className="space-y-3">
                {sortedMechanics.slice(0, 5).map(mechanic => (
                  <MechanicCard 
                    key={mechanic.mechanic_id || mechanic.id}
                    mechanic={mechanic}
                    onViewProfile={handleMechanicSelect}
                    onRequestHelp={handleRequestHelp}
                    isSelected={selectedMechanic?.mechanic_id === mechanic.mechanic_id}
                  />
                ))}
                
                {nearbyMechanics.length > 5 && (
                  <button className="w-full py-3 text-sm font-bold text-primary bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors">
                    See All {nearbyMechanics.length} Mechanics
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <FiAlertCircle size={24} />
                </div>
                <h3 className="font-bold text-gray-700">No mechanics found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                  We couldn't find any available mechanics in your area right now. Please try again later.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      <MechanicDetailModal 
        mechanic={selectedMechanic}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRequestHelp={handleRequestHelp}
      />
    </PageTransition>
  );
};

export default HomePage;
