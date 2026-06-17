import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  MdHardware, MdRvHookup, MdBatteryChargingFull, 
  MdTireRepair, MdLocalGasStation, MdMoreHoriz, 
  MdCheckCircle, MdDirectionsCar, MdLocationOn,
  MdWarning
} from 'react-icons/md';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';

import api from '../../../api/axios';
import { createRequest } from '../../../api/requestApi';
import { getMyVehicles } from '../../../api/userApi';
import { useSelector, useDispatch } from 'react-redux';
import { fetchActiveRequestThunk, fetchNearbyMechanicsThunk } from '../../../store/requestStore';
import { getCurrentLocation, getAddressFromCoords } from '../../../utils/geolocation';
import { getSocket } from '../../../socket/socketClient';

const mapContainerStyle = { width: '100%', height: '100%' };
const mapOptions = { disableDefaultUI: true, zoomControl: true };

const steps = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Vehicle' },
  { id: 3, label: 'Location' },
  { id: 4, label: 'Mechanics' }
];

const RequestHelpPage = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state || {};
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mechanicsPreview, setMechanicsPreview] = useState([]);
  const [searchRadius, setSearchRadius] = useState(5);

  // Form State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [showMechanicModal, setShowMechanicModal] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [sharePhone, setSharePhone] = useState(false);

  // Add Vehicle State
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_type: 'car', make: '', model: '', year: new Date().getFullYear(), license_plate: '', fuel_type: 'petrol', color: '', nickname: '', chassis_number: '', engine_number: '', insurance_expiry_date: ''
  });

  const { activeRequest } = useSelector(state => state.request);
  const fetchActiveRequest = () => dispatch(fetchActiveRequestThunk());

  useEffect(() => {
    if (activeRequest && !['completed', 'cancelled', 'pending'].includes(activeRequest.status)) {
      navigate('/dashboard/tracking');
    }
    
    const loadData = async () => {
      try {
        const [catsRes, vehsRes] = await Promise.all([
          api.get('/services'), 
          getMyVehicles()
        ]);
        
        console.log('Services Response:', catsRes);
        console.log('Vehicles Response:', vehsRes);

        // Axios interceptor returns response.data directly.
        // catsRes is { success: true, data: { categories: [] } }
        const loadedCategories = catsRes?.data?.categories || [];
        console.log('Mapped Services:', loadedCategories);
        setCategories(loadedCategories);
        
        const myVehicles = vehsRes?.data?.vehicles || [];
        setVehicles(Array.isArray(myVehicles) ? myVehicles : []);
        
        if (myVehicles.length === 0) setShowAddVehicle(true);
        else {
          const def = myVehicles.find(v => v.is_default);
          if (def) setSelectedVehicle(def);
        }

        // Preselect service if passed from Home or AI Chatbot
        if (locationState.preselectedService) {
          const preCat = loadedCategories.find(c => c.type === locationState.preselectedService);
          if (preCat) setSelectedService(preCat);
        } else if (locationState.categoryId) {
          const preCat = loadedCategories.find(c => c.id === locationState.categoryId);
          if (preCat) {
            setSelectedService(preCat);
            if (locationState.selectedMechanicId) {
              setStep(2); // Auto-skip service selection if mechanic is already selected
            }
          }
        }
      } catch (err) {
        console.error('Data Loading Error:', err);
        const errObj = {
          url: err.config?.url,
          status: err.response?.status,
          body: err.response?.data,
          message: err.message
        };
        console.log('Detailed Error:', JSON.stringify(errObj, null, 2));
        toast.error(`Failed to load data: ${err.message}`);
        
        // FALLBACK REQUIREMENT
        setCategories([
          { id: 'fb1', name: 'Flat Tyre', type: 'tire', base_price: 300 },
          { id: 'fb2', name: 'Battery Jump Start', type: 'battery', base_price: 400 },
          { id: 'fb3', name: 'Fuel Delivery', type: 'fuel', base_price: 200 },
          { id: 'fb4', name: 'Towing Service', type: 'towing', base_price: 1500 },
          { id: 'fb5', name: 'Engine Breakdown', type: 'breakdown', base_price: 500 },
          { id: 'fb6', name: 'Accident Assistance', type: 'accident', base_price: 2000 }
        ]);
      }
    };
    loadData();
  }, [activeRequest, navigate]);

  const requestLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setLocation({ lat: loc.lat, lng: loc.lng });
      setAddress('Detecting address...');
      
      // Load nearby mechanics for step 4
      dispatch(fetchNearbyMechanicsThunk({ lat: loc.lat, lng: loc.lng, radius: searchRadius }))
        .unwrap()
        .then(res => setMechanicsPreview(res || []));

      // Use Geocoder
      const addressString = await getAddressFromCoords(loc.lat, loc.lng);
      setAddress(addressString);
    } catch (err) {
      toast.error('Location access denied. Please drag the map or type address.');
      // Default Delhi
      setLocation({ lat: 28.6139, lng: 77.2090 });
    }
  };

  useEffect(() => {
    if (step === 3 && !location) {
      requestLocation();
    }
  }, [step]);

  // Auto-refresh mechanic list on Step 4 via socket + polling
  const refreshMechanics = useCallback(() => {
    if (location) {
      dispatch(fetchNearbyMechanicsThunk({ lat: location.lat, lng: location.lng, radius: searchRadius }))
        .unwrap()
        .then(res => setMechanicsPreview(res || []))
        .catch(() => {});
    }
  }, [location, searchRadius, dispatch]);

  useEffect(() => {
    if (step !== 4 || !location) return;

    // Listen for mechanic:available socket event
    const socket = getSocket();
    const handleMechanicAvailable = () => {
      refreshMechanics();
    };

    if (socket) {
      socket.on('mechanic:available', handleMechanicAvailable);
      socket.on('mechanic:status-change', handleMechanicAvailable);
    }

    // Also poll every 15 seconds as a fallback
    const pollInterval = setInterval(refreshMechanics, 15000);

    return () => {
      if (socket) {
        socket.off('mechanic:available', handleMechanicAvailable);
        socket.off('mechanic:status-change', handleMechanicAvailable);
      }
      clearInterval(pollInterval);
    };
  }, [step, location, refreshMechanics]);

  const handleNext = () => {
    if (step === 1 && !selectedService) return toast.error('Please select a service type');
    if (step === 2 && !selectedVehicle && !showAddVehicle) return toast.error('Please select or add your vehicle');
    if (step === 3 && (!location || !address.trim())) return toast.error('Please confirm your location');
    
    if (step === 3 && locationState.selectedMechanicId) {
      // If a mechanic was pre-selected from the map, directly submit instead of going to step 4
      return handleSubmit(locationState.selectedMechanicId);
    }
    
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleIncreaseRadius = (newRadius) => {
    setSearchRadius(newRadius);
    if (location) {
      dispatch(fetchNearbyMechanicsThunk({ lat: location.lat, lng: location.lng, radius: newRadius }))
        .unwrap()
        .then(res => setMechanicsPreview(res || []));
    }
  };

  const handleSaveVehicle = async () => {
    try {
      setLoading(true);
      
      // Auto-fill hidden required fields
      const payload = { ...newVehicle };
      if (!payload.model) payload.model = 'Unknown';
      if (!payload.license_plate) payload.license_plate = `TEMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      if (!payload.year) payload.year = new Date().getFullYear();

      const res = await api.post('/users/vehicles', payload);
      const created = res.data?.vehicle || res.data;
      setVehicles([created, ...vehicles]);
      setSelectedVehicle(created);
      setShowAddVehicle(false);
      toast.success('Vehicle added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (mechanicId) => {
    if (selectedService?.name?.toLowerCase().includes('other')) {
      const confirmed = window.confirm("Alert: Please call the mechanic and confirm if they provide the specific service you need before booking.\n\nDo you want to proceed with booking?");
      if (!confirmed) return;
    }

    if (loading) return;
    setLoading(true);
    try {
      await createRequest({
        category_id: selectedService.id,
        vehicle_id: selectedVehicle.id,
        mechanic_id: mechanicId,
        breakdown_lat: location.lat,
        breakdown_lng: location.lng,
        breakdown_address: address,
        description: description || undefined,
        shareLocation,
        sharePhone
      });
      toast.success('Request sent! Mechanic notified.');
      fetchActiveRequest();
      navigate('/dashboard/tracking');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const serviceIcons = { Breakdown: MdHardware, Towing: MdRvHookup, Battery: MdBatteryChargingFull, Tire: MdTireRepair, Fuel: MdLocalGasStation, Accident: MdWarning, Emergency: MdMoreHoriz };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* STEP INDICATOR */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between relative z-10">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          
          {steps.map((s, idx) => {
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all relative ${
                  isCompleted ? 'bg-primary text-white' : 
                  isCurrent ? 'bg-primary text-white ring-4 ring-primary/20 scale-110' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? <MdCheckCircle size={18} /> : s.id}
                </div>
                <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-primary' : 'text-gray-500'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP CONTENT */}
      <div className="bg-white rounded-2xl shadow-card p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* STEP 1: SERVICE */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-dark mb-2">What do you need help with?</h2>
                <p className="text-sm text-gray-500 mb-6 font-medium">24×7 Unique Toll-Free Helpline "1033" for road users on National Highways</p>
                
                {/* TEMPORARY DEBUG PANEL */}
                {import.meta.env.DEV && categories.length === 0 && (
                  <div className="bg-red-50 text-red-600 p-4 mb-4 rounded-lg text-sm font-mono overflow-auto">
                    Services Loaded: {categories.length}
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map(cat => {
                    // Match icon heuristically
                    let Icon = MdMoreHoriz;
                    if (cat.name.includes('Tire') || cat.name.includes('Tyre')) Icon = MdTireRepair;
                    else if (cat.name.includes('Battery') || cat.name.includes('Jump')) Icon = MdBatteryChargingFull;
                    else if (cat.name.includes('Engine') || cat.name.includes('Breakdown')) Icon = MdHardware;
                    else if (cat.name.includes('Fuel')) Icon = MdLocalGasStation;
                    else if (cat.name.includes('Tow')) Icon = MdRvHookup;
                    else if (cat.name.includes('Accident')) Icon = MdWarning;

                    const isSelected = selectedService?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedService(cat)}
                        className={`p-5 border-2 rounded-xl flex flex-col items-center text-center gap-3 transition-all relative
                          ${isSelected ? 'border-primary bg-orange-50 scale-[1.02]' : 'border-gray-100 hover:border-orange-200 hover:shadow-md'}
                        `}
                      >
                        {isSelected && <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-0.5"><MdCheckCircle size={20} /></div>}
                        <Icon className={`text-5xl ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                        <span className="font-bold text-dark text-sm">{cat.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: VEHICLE */}
            {step === 2 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-dark">Which vehicle needs help?</h2>
                  {!showAddVehicle && (
                    <button onClick={() => setShowAddVehicle(true)} className="text-primary font-bold text-sm hover:underline">
                      + Add New
                    </button>
                  )}
                </div>

                {showAddVehicle ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-dark">Add New Vehicle</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Vehicle Type</label>
                        <select className="input-field" value={newVehicle.vehicle_type} onChange={e => setNewVehicle({...newVehicle, vehicle_type: e.target.value})}>
                          <optgroup label="Two Wheeler">
                            <option value="motorcycle">Motorcycle</option>
                            <option value="scooter">Scooter</option>
                            <option value="moped">Moped</option>
                            <option value="sports_bike">Sports Bike</option>
                            <option value="cruiser_bike">Cruiser Bike</option>
                            <option value="electric_bike">Electric Bike</option>
                            <option value="electric_scooter">Electric Scooter</option>
                          </optgroup>
                          <optgroup label="Cars">
                            <option value="hatchback">Hatchback</option>
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                            <option value="muv">MUV</option>
                            <option value="coupe">Coupe</option>
                            <option value="convertible">Convertible</option>
                            <option value="luxury_car">Luxury Car</option>
                            <option value="electric_car">Electric Car</option>
                            <option value="hybrid_car">Hybrid Car</option>
                            <option value="car">Car (Other)</option>
                          </optgroup>
                          <optgroup label="Commercial">
                            <option value="pickup_truck">Pickup Truck</option>
                            <option value="mini_truck">Mini Truck</option>
                            <option value="truck">Truck</option>
                            <option value="lorry">Lorry</option>
                            <option value="tempo">Tempo</option>
                            <option value="delivery_van">Delivery Van</option>
                          </optgroup>
                          <optgroup label="Passenger Transport">
                            <option value="auto_rickshaw">Auto Rickshaw</option>
                            <option value="e_rickshaw">E-Rickshaw</option>
                            <option value="taxi">Taxi</option>
                            <option value="cab">Cab</option>
                            <option value="bus">Bus</option>
                            <option value="mini_bus">Mini Bus</option>
                          </optgroup>
                          <optgroup label="Heavy Vehicles">
                            <option value="tractor">Tractor</option>
                            <option value="crane">Crane</option>
                            <option value="jcb">JCB</option>
                            <option value="excavator">Excavator</option>
                            <option value="dumper">Dumper</option>
                            <option value="road_roller">Road Roller</option>
                          </optgroup>
                          <optgroup label="Emergency">
                            <option value="ambulance">Ambulance</option>
                            <option value="fire_vehicle">Fire Vehicle</option>
                          </optgroup>
                          <optgroup label="Others">
                            <option value="bicycle">Bicycle</option>
                            <option value="caravan">Caravan</option>
                            <option value="rv">RV</option>
                            <option value="other">Other</option>
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nickname (Optional)</label>
                        <input className="input-field" placeholder="e.g. My Daily Driver" value={newVehicle.nickname} onChange={e => setNewVehicle({...newVehicle, nickname: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Brand/Make</label>
                        <input className="input-field" placeholder="e.g. Honda" value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Model (Optional)</label>
                        <input className="input-field" placeholder="e.g. City" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Fuel Type</label>
                        <select className="input-field" value={newVehicle.fuel_type} onChange={e => setNewVehicle({...newVehicle, fuel_type: e.target.value})}>
                          <option value="petrol">Petrol</option>
                          <option value="diesel">Diesel</option>
                          <option value="electric">Electric</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="cng">CNG</option>
                          <option value="lpg">LPG</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                      {vehicles.length > 0 && <button className="btn-outline py-2 px-4" onClick={() => setShowAddVehicle(false)}>Cancel</button>}
                      <button className="btn-primary py-2 px-6" onClick={handleSaveVehicle} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Vehicle'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vehicles.map(veh => {
                      const isSelected = selectedVehicle?.id === veh.id;
                      return (
                        <button
                          key={veh.id}
                          onClick={() => setSelectedVehicle(veh)}
                          className={`w-full p-4 border-2 rounded-xl flex items-center justify-between transition-all
                            ${isSelected ? 'border-primary bg-orange-50 scale-[1.02]' : 'border-gray-100 hover:border-orange-200'}
                          `}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center">
                              <MdDirectionsCar className={`text-3xl ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                            </div>
                            <div className="text-left">
                              <h4 className="font-bold text-dark text-lg">{veh.make} {veh.model}</h4>
                              <p className="text-sm text-gray-500">{veh.color || 'Unknown color'} • {veh.year} • {veh.fuel_type}</p>
                              <div className="mt-1 bg-yellow-100 text-yellow-800 text-xs font-mono font-bold px-2 py-0.5 rounded border border-yellow-200 inline-block uppercase">
                                {veh.license_plate}
                              </div>
                            </div>
                          </div>
                          {isSelected && <MdCheckCircle className="text-primary text-3xl" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: LOCATION */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-dark mb-2">Where are you right now?</h2>
                
                <button 
                  onClick={requestLocation}
                  className="w-full bg-orange-50 text-primary border border-orange-200 hover:bg-orange-100 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <MdLocationOn size={20} /> Detect My Current Location
                </button>
                
                <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
                  {location ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={location}
                      zoom={16}
                      options={mapOptions}
                      onClick={async (e) => {
                        const newLat = e.latLng.lat();
                        const newLng = e.latLng.lng();
                        setLocation({ lat: newLat, lng: newLng });
                        const addr = await getAddressFromCoords(newLat, newLng);
                        setAddress(addr);
                      }}
                    >
                      <Marker 
                        position={location}
                        draggable={true}
                        onDragEnd={async (e) => {
                          const newLat = e.latLng.lat();
                          const newLng = e.latLng.lng();
                          setLocation({ lat: newLat, lng: newLng });
                          const addr = await getAddressFromCoords(newLat, newLng);
                          setAddress(addr);
                        }}
                        icon={{
                          path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                          fillColor: '#FF8A00',
                          fillOpacity: 1,
                          strokeWeight: 3,
                          strokeColor: '#FFFFFF',
                          scale: 10,
                        }}
                      />
                    </GoogleMap>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400">
                      Loading map...
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-1">📍 Address:</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Enter your exact location..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark mb-1">📝 Describe the problem (optional):</label>
                    <textarea 
                      className="input-field min-h-[80px]" 
                      maxLength={500}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Any specific details about the issue... (Max 500 chars)"
                    />
                  </div>

                  {/* Privacy Preferences in Step 3 */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-2">
                    <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wider mb-3">Privacy Preferences</h3>
                    <label className="flex items-center justify-between mb-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📍</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">Share Live Location</p>
                          <p className="text-xs text-gray-500">Helps mechanic find you easily</p>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${shareLocation ? 'bg-primary' : 'bg-gray-300'}`}>
                        <input type="checkbox" className="hidden" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} />
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${shareLocation ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📞</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">Share Phone Number</p>
                          <p className="text-xs text-gray-500">Allows direct calls from mechanic</p>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${sharePhone ? 'bg-primary' : 'bg-gray-300'}`}>
                        <input type="checkbox" className="hidden" checked={sharePhone} onChange={(e) => setSharePhone(e.target.checked)} />
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${sharePhone ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: MECHANICS LIST */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-dark mb-1">Select a Mechanic</h2>
                    <p className="text-gray-500 text-sm">Compare prices and contact them to finalize.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Radius:</span>
                    <select 
                      className="bg-gray-50 border border-gray-200 text-sm rounded-lg focus:ring-primary focus:border-primary block p-1.5 font-bold outline-none"
                      value={searchRadius}
                      onChange={(e) => handleIncreaseRadius(Number(e.target.value))}
                    >
                      <option value={2}>2 km</option>
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={25}>25 km</option>
                      <option value={50}>50 km</option>
                    </select>
                  </div>
                </div>
                
                {mechanicsPreview.length === 0 ? (
                  <div className="text-center p-10 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-center mb-3">
                      <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-700">Searching for mechanics...</h3>
                    <p className="text-sm text-gray-500 mt-1">Looking for available mechanics nearby.</p>
                    <p className="text-xs text-green-600 mt-3 font-semibold flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Live — new mechanics will appear automatically
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {mechanicsPreview.map(m => {
                      const isOtherService = selectedService?.name?.toLowerCase().includes('other');
                      const mPrice = m.pricing?.[selectedService?.id];
                      const priceText = isOtherService ? 'Price on Call' : (mPrice 
                        ? `₹${mPrice.min_price} - ₹${mPrice.max_price}` 
                        : `₹${selectedService?.base_price}`);
                      
                      return (
                        <div key={m.mechanic_id} className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-primary/50 transition-all shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                              <img 
                                src={m.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=FF8A00&color=fff`} 
                                alt={m.name} 
                                className="w-14 h-14 rounded-full object-cover border border-gray-100"
                              />
                              <div>
                                <h3 className="font-bold text-dark text-lg">
                                  <span className="text-xs font-normal text-gray-400 mr-2 uppercase tracking-wide">Shop Name:</span> 
                                  {m.business_name || 'NIL'}
                                </h3>
                                <p className="text-sm text-gray-500">{m.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="flex items-center gap-1 text-sm font-bold text-yellow-500">
                                    ⭐ {parseFloat(m.average_rating || 0).toFixed(1)} <span className="text-gray-400 text-xs font-normal">({m.total_jobs} jobs)</span>
                                  </span>
                                  <span className="text-xs font-bold text-gray-400">•</span>
                                  <span className="text-sm font-bold text-primary">{m.distanceText || `${m.distance_km} km`}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="bg-orange-50 text-orange-800 px-3 py-1 rounded-lg font-bold text-sm border border-orange-100">
                                {priceText}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex gap-2">
                            <a href={`tel:${m.phone}`} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2 rounded-lg text-sm flex items-center justify-center border border-gray-200 transition-colors">
                              📞 Call
                            </a>
                            <button 
                              onClick={() => {
                                setSelectedMechanic(m);
                                setShowMechanicModal(true);
                              }}
                              className="flex-1 bg-primary text-white hover:bg-orange-600 font-bold py-2 rounded-lg text-sm flex items-center justify-center transition-colors"
                            >
                              👁 View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="flex gap-4">
        {step > 1 && (
          <button 
            onClick={handleBack} 
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
            disabled={loading}
          >
            ← Back
          </button>
        )}
        
        {step < 4 && (
          <button 
            onClick={handleNext} 
            disabled={loading}
            className="flex-[2] bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-orange-600 transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
              (step === 3 && locationState.selectedMechanicId) ? '🚨 CONFIRM BOOKING' : 'Next →'
            )}
          </button>
        )}
      </div>

      {/* MECHANIC DETAIL MODAL */}
      <AnimatePresence>
        {showMechanicModal && selectedMechanic && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 pb-8 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setShowMechanicModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10"
            >
              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <img 
                      src={selectedMechanic.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMechanic.name)}&background=FF8A00&color=fff`} 
                      alt={selectedMechanic.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-dark">
                        <span className="text-sm font-normal text-gray-400 mr-2 uppercase tracking-wide">Shop Name:</span>
                        {selectedMechanic.business_name || 'NIL'}
                      </h2>
                      <p className="text-sm font-semibold text-gray-500">{selectedMechanic.experience_years} Years Exp.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">Rating</p>
                    <p className="font-bold text-lg text-dark flex items-center gap-1">
                      ⭐ {parseFloat(selectedMechanic.average_rating || 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">Distance</p>
                    <p className="font-bold text-lg text-dark">{selectedMechanic.distanceText || `${selectedMechanic.distance_km} km`}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wider mb-2">Service Pricing</h3>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <p className="text-dark font-bold mb-1">{selectedService?.name}</p>
                    {selectedService?.name?.toLowerCase().includes('other') ? (
                      <p className="text-primary font-bold text-sm mt-2">
                        Please discuss and finalize the price with the mechanic over the call.
                      </p>
                    ) : (
                      <>
                        <p className="text-primary font-bold text-lg">
                          {selectedMechanic.pricing?.[selectedService?.id] 
                            ? `₹${selectedMechanic.pricing[selectedService.id].min_price} - ₹${selectedMechanic.pricing[selectedService.id].max_price}` 
                            : `₹${selectedService?.base_price} (Base Price)`}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Final price will be discussed and agreed upon over the call.</p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wider mb-2">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMechanic.specializations?.map(spec => (
                      <span key={spec} className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200">
                        {spec.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mb-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wider mb-3">Privacy Preferences</h3>
                  <label className="flex items-center justify-between mb-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📍</span>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Share Live Location</p>
                        <p className="text-xs text-gray-500">Helps mechanic find you easily</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${shareLocation ? 'bg-primary' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="hidden" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} />
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${shareLocation ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📞</span>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Share Phone Number</p>
                        <p className="text-xs text-gray-500">Allows direct calls from mechanic</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${sharePhone ? 'bg-primary' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="hidden" checked={sharePhone} onChange={(e) => setSharePhone(e.target.checked)} />
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${sharePhone ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>

              </div>

              <div className="p-4 border-t border-gray-100 bg-white grid gap-3">
                <a href={`tel:${selectedMechanic.phone}`} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl text-center flex justify-center items-center gap-2 transition-colors">
                  📞 Call Mechanic ({selectedMechanic.phone})
                </a>
                <button 
                  onClick={() => handleSubmit(selectedMechanic.user_id)}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 flex justify-center items-center gap-2 transition-colors"
                >
                  {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🚨 CONFIRM BOOKING'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RequestHelpPage;
