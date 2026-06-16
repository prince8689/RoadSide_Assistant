import React, { useState, useEffect } from 'react';
import { getMyServices, updateMyServices, createServiceCategory } from '../../../api/mechanicApi';
import { toast } from 'react-hot-toast';
import { MdSave, MdCheckCircle, MdOutlineMiscellaneousServices } from 'react-icons/md';
import { FiPlus, FiX } from 'react-icons/fi';

const MechanicServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [addingService, setAddingService] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await getMyServices();
      setServices(res.data?.services || res.services || []);
    } catch (error) {
      toast.error('Failed to load services pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim()) {
      return toast.error('Service name is required');
    }
    try {
      setAddingService(true);
      await createServiceCategory({
        name: newServiceName,
        base_price: newServicePrice ? Number(newServicePrice) : 0
      });
      toast.success('Custom service added successfully');
      setShowAddModal(false);
      setNewServiceName('');
      setNewServicePrice('');
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add custom service');
    } finally {
      setAddingService(false);
    }
  };

  const handleToggle = (categoryId) => {
    setServices((prev) =>
      prev.map((s) => (s.category_id === categoryId ? { ...s, is_enabled: !s.is_enabled } : s))
    );
  };

  const handlePriceChange = (categoryId, field, value) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.category_id === categoryId) {
          return { ...s, [field]: value === '' ? '' : Number(value) };
        }
        return s;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Validate
      for (const s of services) {
        if (s.is_enabled && (s.min_price === '' || s.max_price === '')) {
          toast.error(`Please set valid prices for ${s.name}`);
          return;
        }
        if (s.is_enabled && Number(s.min_price) > Number(s.max_price)) {
          toast.error(`Min price cannot be greater than max price for ${s.name}`);
          return;
        }
      }
      
      await updateMyServices(services);
      toast.success('Services pricing updated successfully!');
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-10 text-gray-500">Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <MdOutlineMiscellaneousServices className="text-primary text-3xl" />
            Service Pricing Management
          </h2>
          <p className="text-gray-500 mt-1">Configure which services you offer and set your custom price ranges.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-50 hover:bg-orange-100 text-primary font-bold py-3 px-6 rounded-xl flex items-center gap-2 border border-orange-200 transition-colors"
          >
            <FiPlus size={20} />
            <span className="hidden sm:inline">Add Custom Service</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/30"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MdSave size={20} />}
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
            <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div 
            key={service.category_id} 
            className={`bg-white rounded-xl border-2 transition-all p-5 ${service.is_enabled ? 'border-primary shadow-sm' : 'border-gray-200 opacity-70'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-dark text-lg flex items-center gap-2">
                  {service.name}
                  {service.is_enabled && <MdCheckCircle className="text-green-500 text-sm" />}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Platform Base Price: ₹{service.base_price}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={service.is_enabled}
                  onChange={() => handleToggle(service.category_id)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className={`grid grid-cols-2 gap-4 transition-all ${service.is_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Min Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field bg-gray-50"
                  value={service.min_price}
                  onChange={(e) => handlePriceChange(service.category_id, 'min_price', e.target.value)}
                  placeholder={service.base_price}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Max Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field bg-gray-50"
                  value={service.max_price}
                  onChange={(e) => handlePriceChange(service.category_id, 'max_price', e.target.value)}
                  placeholder={service.base_price}
                />
              </div>
            </div>
            
            {service.is_enabled && Number(service.min_price) > Number(service.max_price) && (
              <p className="text-xs text-red-500 mt-2 font-medium">⚠️ Min price cannot exceed Max price.</p>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-dark">Add Custom Service</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Service Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  placeholder="e.g. Car Wash"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Base Price (₹) - Optional</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newServicePrice}
                  onChange={e => setNewServicePrice(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 btn-outline py-2">Cancel</button>
              <button onClick={handleAddService} disabled={addingService} className="flex-1 btn-primary py-2">
                {addingService ? 'Adding...' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MechanicServicesPage;
