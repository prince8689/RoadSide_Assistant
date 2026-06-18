import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useMechanicStore from '../../../store/mechanicStore';
import { createMechanicProfile, updateMechanicProfile } from '../../../api/mechanicApi';

import { useNavigate } from 'react-router-dom';

const MechanicProfilePage = () => {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useMechanicStore();
  const [form, setForm] = useState({
    business_name: '',
    experience_years: '',
    specializations: [],
    license_number: '',
    aadhar_number: '',
    phone: '',
    working_hours_start: '09:00',
    working_hours_end: '17:00'
  });
  const [submitting, setSubmitting] = useState(false);
  const [customSpec, setCustomSpec] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        business_name: profile.business_name || '',
        experience_years: profile.experience_years || '',
        specializations: profile.specializations || [],
        license_number: profile.documents?.license_number || '',
        aadhar_number: profile.documents?.aadhar_number || '',
        phone: profile.phone || '',
        working_hours_start: profile.working_hours_start || '09:00',
        working_hours_end: profile.working_hours_end || '17:00'
      });
    }
  }, [profile]);

  const servicesList = [
    'Breakdown Repair', 'Towing', 'Battery Jump-start', 'Flat Tire Repair', 'Fuel Delivery',
    'Lockout Service', 'Engine Diagnostics', 'AC Repair', 'Brake Service', 'Oil Change', 'Key Replacement',
    'Transmission Repair', 'Suspension Service', 'Exhaust System', 'Wheel Alignment', 'Tire Balancing',
    'Electrical System', 'Clutch Repair', 'Cooling System'
  ];

  const handleCheckbox = (service) => {
    setForm(prev => {
      const specs = prev.specializations.includes(service)
        ? prev.specializations.filter(s => s !== service)
        : [...prev.specializations, service];
      return { ...prev, specializations: specs };
    });
  };

  const handleAddCustomSpec = () => {
    if (customSpec.trim() && !form.specializations.includes(customSpec.trim())) {
      setForm(prev => ({ ...prev, specializations: [...prev.specializations, customSpec.trim()] }));
      setCustomSpec('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submit

    if (!form.business_name || !form.experience_years || form.specializations.length === 0) {
      return toast.error('Please fill required fields and select at least one specialization');
    }
    
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name,
        business_name: form.business_name,
        experience_years: parseInt(form.experience_years),
        specializations: form.specializations,
        phone: form.phone,
        documents: {
          license_number: form.license_number,
          aadhar_number: form.aadhar_number
        },
        working_hours_start: form.working_hours_start,
        working_hours_end: form.working_hours_end
      };

      if (profile) {
        await updateMechanicProfile(payload);
        toast.success('Profile updated successfully!');
      } else {
        await createMechanicProfile(payload);
        toast.success('Profile created successfully!');
      }
      await fetchProfile();
      navigate('/mechanic/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {!profile && (
        <div className="bg-dark text-white p-8 rounded-2xl shadow-card mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">COMPLETE YOUR PROFILE</h1>
          <p className="text-gray-400">Set up your business details to start receiving service requests.</p>
        </div>
      )}

      {profile && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-dark">My Profile</h1>
          
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${profile.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {profile.is_verified ? '✓ Verified Partner' : '⏳ Verification Pending'}
            </span>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
              Trust Score: {profile.trust_score ?? 100}/100
            </span>
            {profile.total_strikes > 0 && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700">
                Strikes: {profile.total_strikes}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Full Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Ramesh Kumar"
                value={form.full_name || ''}
                onChange={e => setForm({...form, full_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Business/Shop Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Ramesh Auto Works"
                value={form.business_name}
                onChange={e => setForm({...form, business_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Experience (Years) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 5"
                min="0"
                value={form.experience_years}
                onChange={e => setForm({...form, experience_years: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Mobile Number *</label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Available From (Start Time)</label>
              <input
                type="time"
                className="input-field"
                value={form.working_hours_start}
                onChange={e => setForm({...form, working_hours_start: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Available To (End Time)</label>
              <input
                type="time"
                className="input-field"
                value={form.working_hours_end}
                onChange={e => setForm({...form, working_hours_end: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark mb-3">Specializations * (Select at least one)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {servicesList.map(srv => (
                <label key={srv} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.specializations.includes(srv) ? 'bg-orange-50 border-primary' : 'bg-white border-gray-200 hover:border-orange-200'
                }`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    checked={form.specializations.includes(srv)}
                    onChange={() => handleCheckbox(srv)}
                  />
                  <span className="text-sm font-medium text-dark">{srv}</span>
                </label>
              ))}
              {form.specializations.filter(s => !servicesList.includes(s)).map(srv => (
                <label key={srv} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-orange-50 border-primary">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    checked={true}
                    onChange={() => handleCheckbox(srv)}
                  />
                  <span className="text-sm font-medium text-dark">{srv}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2 max-w-md">
              <input 
                type="text" 
                className="input-field flex-1" 
                placeholder="Add your own custom specialization..." 
                value={customSpec} 
                onChange={e => setCustomSpec(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSpec())}
              />
              <button 
                type="button" 
                onClick={handleAddCustomSpec} 
                className="bg-dark text-white px-6 rounded-xl font-semibold hover:bg-black transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-dark mb-4">Verification Documents</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">Driving License Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. DL-1420110012345"
                  value={form.license_number}
                  onChange={e => setForm({...form, license_number: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">Aadhar Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 1234 5678 9012"
                  value={form.aadhar_number}
                  onChange={e => setForm({...form, aadhar_number: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full md:w-auto px-10 flex items-center justify-center gap-2"
            >
              {submitting ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MechanicProfilePage;
