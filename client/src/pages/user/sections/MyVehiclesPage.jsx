import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MdDirectionsCar, MdEdit, MdDelete, MdStar, MdStarBorder, MdAdd } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../api/axios';

const MyVehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Selected Vehicle
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    vehicle_type: 'car',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    fuel_type: 'petrol',
    color: '',
    nickname: '',
    chassis_number: '',
    engine_number: '',
    insurance_expiry_date: ''
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/vehicles');
      const loadedVehicles = res?.data?.vehicles || [];
      setVehicles(Array.isArray(loadedVehicles) ? loadedVehicles : []);
    } catch (err) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/vehicles', formData);
      toast.success('Vehicle added successfully');
      setShowAddModal(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add vehicle');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/users/vehicles/${selectedVehicle.id}`, formData);
      toast.success('Vehicle updated successfully');
      setShowEditModal(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update vehicle');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/vehicles/${selectedVehicle.id}`);
      toast.success('Vehicle deleted successfully');
      setShowDeleteModal(false);
      fetchVehicles();
    } catch (err) {
      toast.error('Failed to delete vehicle');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.patch(`/users/vehicles/${id}/default`);
      toast.success('Default vehicle updated');
      fetchVehicles();
    } catch (err) {
      toast.error('Failed to set default vehicle');
    }
  };

  const openEditModal = (veh) => {
    setSelectedVehicle(veh);
    setFormData({
      vehicle_type: veh.vehicle_type || 'car',
      make: veh.make,
      model: veh.model,
      year: veh.year,
      license_plate: veh.license_plate,
      fuel_type: veh.fuel_type || 'petrol',
      color: veh.color || '',
      nickname: veh.nickname || '',
      chassis_number: veh.chassis_number || '',
      engine_number: veh.engine_number || '',
      insurance_expiry_date: veh.insurance_expiry_date ? veh.insurance_expiry_date.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setFormData({
      vehicle_type: 'car', make: '', model: '', year: new Date().getFullYear(), license_plate: '', fuel_type: 'petrol', color: '', nickname: '', chassis_number: '', engine_number: '', insurance_expiry_date: ''
    });
    setShowAddModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-dark">My Vehicles</h1>
          <p className="text-gray-500 text-sm">Manage your vehicles for quick roadside assistance</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2 px-6">
          <MdAdd size={20} /> Add Vehicle
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdDirectionsCar className="text-4xl text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-dark mb-2">No vehicles found</h3>
          <p className="text-gray-500 mb-6">Add your first vehicle to get started.</p>
          <button onClick={openAddModal} className="btn-outline px-8">Add Vehicle</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {vehicles.map(veh => (
              <motion.div
                key={veh.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white rounded-2xl p-6 border-2 transition-all relative
                  ${veh.is_default ? 'border-primary shadow-md' : 'border-gray-100 shadow-sm hover:border-orange-200'}
                `}
              >
                {veh.is_default && (
                  <div className="absolute -top-3 -right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <MdStar size={14} /> DEFAULT
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <MdDirectionsCar className={`text-3xl ${veh.is_default ? 'text-primary' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(veh)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100">
                      <MdEdit size={16} />
                    </button>
                    <button onClick={() => { setSelectedVehicle(veh); setShowDeleteModal(true); }} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100">
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-dark">{veh.nickname ? `"${veh.nickname}"` : `${veh.make} ${veh.model}`}</h3>
                  {veh.nickname && <p className="text-sm text-gray-500 font-bold">{veh.make} {veh.model}</p>}
                  <p className="text-gray-500 text-sm">{veh.year} • {veh.color || 'No color'} • {veh.fuel_type}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="bg-yellow-100 text-yellow-800 text-sm font-mono font-bold px-3 py-1 rounded border border-yellow-200 uppercase">
                    {veh.license_plate}
                  </div>
                  {!veh.is_default && (
                    <button onClick={() => handleSetDefault(veh.id)} className="text-sm text-gray-500 hover:text-primary font-semibold flex items-center gap-1">
                      <MdStarBorder /> Set Default
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-dark mb-6">{showAddModal ? 'Add New Vehicle' : 'Edit Vehicle'}</h2>
              <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Type</label>
                    <select className="input-field" value={formData.vehicle_type} onChange={e => setFormData({...formData, vehicle_type: e.target.value})}>
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
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nickname (Optional)</label>
                    <input className="input-field" placeholder="e.g. My Daily Driver" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Make</label>
                    <input className="input-field" required value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} placeholder="Toyota" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Model</label>
                    <input className="input-field" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Corolla" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Registration Number</label>
                    <input className="input-field uppercase" required value={formData.license_plate} onChange={e => setFormData({...formData, license_plate: e.target.value.toUpperCase()})} placeholder="DL01AB1234" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Purchase Year</label>
                    <input type="number" required min="1900" max={new Date().getFullYear() + 1} className="input-field" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fuel Type</label>
                    <select className="input-field" value={formData.fuel_type} onChange={e => setFormData({...formData, fuel_type: e.target.value})}>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="cng">CNG</option>
                      <option value="lpg">LPG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Color</label>
                    <input className="input-field" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="Silver" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Chassis Number</label>
                    <input className="input-field" value={formData.chassis_number} onChange={e => setFormData({...formData, chassis_number: e.target.value})} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Engine Number</label>
                    <input className="input-field" value={formData.engine_number} onChange={e => setFormData({...formData, engine_number: e.target.value})} placeholder="Optional" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Insurance Expiry Date</label>
                    <input type="date" className="input-field" value={formData.insurance_expiry_date} onChange={e => setFormData({...formData, insurance_expiry_date: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4 mt-6 border-t border-gray-100">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="flex-1 btn-outline">Cancel</button>
                  <button type="submit" className="flex-1 btn-primary">{showAddModal ? 'Add Vehicle' : 'Save Changes'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MdDelete className="text-3xl text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-dark mb-2">Delete Vehicle?</h2>
              <p className="text-gray-500 mb-6 text-sm">Are you sure you want to delete this vehicle? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 btn-outline">Cancel</button>
                <button onClick={handleDelete} className="flex-1 bg-red-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 transition">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MyVehiclesPage;
