import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MdHardware, MdRvHookup, MdBatteryChargingFull, MdTireRepair, MdLocalGasStation, MdMoreHoriz, MdCheckCircle, MdDirectionsCar, MdLocationOn } from 'react-icons/md';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getServiceCategories, createRequest } from '../../../api/requestApi';
import { getMyVehicles } from '../../../api/userApi';
import { useSelector, useDispatch } from 'react-redux';
import { fetchActiveRequestThunk, createServiceRequestThunk } from '../../../store/requestStore';
import { getUserLocation } from '../../../utils/geolocation';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} /> : null;
};

const RequestHelpPage = () => {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { activeRequest } = useSelector(state => state.request);
  const fetchActiveRequest = () => dispatch(fetchActiveRequestThunk());

  useEffect(() => {
    // If user already has an active request, redirect to tracking
    if (activeRequest) {
      navigate('/dashboard/tracking');
    }
    
    // Load categories and vehicles
    const loadData = async () => {
      try {
        const [catsRes, vehsRes] = await Promise.all([getServiceCategories(), getMyVehicles()]);
        setCategories(catsRes.data.data || []);
        setVehicles(vehsRes.data.data || []);
        
        // Get user current location with new helper
        const loc = await getUserLocation();
        setLocation({ lat: loc.lat, lng: loc.lng });
        setAddress('Current Location'); // Placeholder
      } catch (err) {
        toast.error('Failed to load required data');
      }
    };
    loadData();
  }, [activeRequest, navigate]);

  const handleNext = () => {
    if (step === 1 && !selectedService) return toast.error('Please select a service');
    if (step === 2 && !selectedVehicle) return toast.error('Please select a vehicle');
    if (step === 3 && !location) return toast.error('Please confirm your location');
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (loading) return; // Prevent double submit
    setLoading(true);
    try {
      await createRequest({
        service_id: selectedService.id,
        vehicle_id: selectedVehicle.id,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        address,
        description
      });
      toast.success('Request submitted successfully!');
      fetchActiveRequest(); // Refresh store
      navigate('/dashboard/tracking');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const serviceIcons = { Breakdown: MdHardware, Towing: MdRvHookup, Battery: MdBatteryChargingFull, Tire: MdTireRepair, Fuel: MdLocalGasStation };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-card p-6 animate-fade-in">
      {/* Progress Header */}
      <div className="flex justify-between items-center mb-8">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= num ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
              {num}
            </div>
            {num < 4 && <div className={`w-16 h-1 mx-2 ${step > num ? 'bg-primary' : 'bg-gray-100'}`} />}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* Step 1: Service */}
        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="text-2xl font-bold text-dark mb-6">What do you need help with?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map(cat => {
                const Icon = serviceIcons[cat.name.split(' ')[0]] || MdMoreHoriz;
                const isSelected = selectedService?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedService(cat)}
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-3 transition-all relative
                      ${isSelected ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-orange-200'}
                    `}
                  >
                    {isSelected && <MdCheckCircle className="absolute top-2 right-2 text-primary text-xl" />}
                    <Icon className={`text-4xl ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="font-semibold text-dark">{cat.name}</span>
                    <span className="text-xs text-muted">Est. ₹{cat.base_price}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Vehicle */}
        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="text-2xl font-bold text-dark mb-6">Which vehicle needs help?</h2>
            {vehicles.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl">
                <p className="text-muted mb-4">You haven't added any vehicles yet.</p>
                {/* Note: In a real app, this would open an add vehicle modal */}
                <button className="btn-outline">Add Vehicle Now</button>
              </div>
            ) : (
              <div className="space-y-4">
                {vehicles.map(veh => (
                  <button
                    key={veh.id}
                    onClick={() => setSelectedVehicle(veh)}
                    className={`w-full p-4 border-2 rounded-xl flex items-center justify-between transition-all
                      ${selectedVehicle?.id === veh.id ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-orange-200'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <MdDirectionsCar className="text-2xl text-gray-500" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-dark">{veh.make} {veh.model} ({veh.year})</h4>
                        <p className="text-sm text-muted">{veh.license_plate} • {veh.color}</p>
                      </div>
                    </div>
                    {selectedVehicle?.id === veh.id && <MdCheckCircle className="text-primary text-2xl" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="animate-slide-up space-y-4">
            <h2 className="text-2xl font-bold text-dark mb-2">Where are you?</h2>
            <p className="text-muted text-sm mb-4">Pinpoint your exact location on the map.</p>
            
            <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200">
              {location && (
                <MapContainer center={location} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMarker position={location} setPosition={setLocation} />
                </MapContainer>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Landmark / Address</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Near Metro Station Gate 2"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Description (Optional)</label>
              <textarea 
                className="input-field min-h-[80px]" 
                placeholder="Any specific details about the issue..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="animate-slide-up space-y-6">
            <h2 className="text-2xl font-bold text-dark mb-4">Confirm Request</h2>
            
            <div className="bg-gray-50 p-6 rounded-xl space-y-4 border border-gray-100">
              <div className="flex justify-between pb-4 border-b border-gray-200">
                <span className="text-muted">Service Type</span>
                <span className="font-bold text-dark">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-gray-200">
                <span className="text-muted">Vehicle</span>
                <span className="font-bold text-dark">{selectedVehicle?.make} {selectedVehicle?.model}</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-gray-200">
                <span className="text-muted">Address</span>
                <span className="font-bold text-dark text-right max-w-[200px]">{address || 'Current Map Location'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-lg font-bold text-dark">Estimated Cost</span>
                <span className="text-xl font-bold text-primary">₹{selectedService?.base_price}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
        {step > 1 ? (
          <button onClick={handleBack} className="btn-outline px-8" disabled={loading}>Back</button>
        ) : <div />}
        
        {step < 4 ? (
          <button onClick={handleNext} className="btn-primary px-10">Next</button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="btn-primary px-10 flex items-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm & Request'}
          </button>
        )}
      </div>
    </div>
  );
};

export default RequestHelpPage;
