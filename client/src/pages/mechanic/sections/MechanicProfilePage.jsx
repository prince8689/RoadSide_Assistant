import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useMechanicStore from '../../../store/mechanicStore';
import { createMechanicProfile, updateMechanicProfile } from '../../../api/mechanicApi';

const MechanicProfilePage = () => {
  const { profile, fetchProfile } = useMechanicStore();
  const [form, setForm] = useState({
    business_name: '',
    experience_years: '',
    specializations: [],
    license_number: '',
    aadhar_number: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name || '',
        experience_years: profile.experience_years || '',
        specializations: profile.specializations || [],
        license_number: profile.documents?.license_number || '',
        aadhar_number: profile.documents?.aadhar_number || ''
      });
    }
  }, [profile]);

  const servicesList = ['Breakdown Repair', 'Towing', 'Battery Jump-start', 'Flat Tire Repair', 'Fuel Delivery'];

  const handleCheckbox = (service) => {
    setForm(prev => {
      const specs = prev.specializations.includes(service)
        ? prev.specializations.filter(s => s !== service)
        : [...prev.specializations, service];
      return { ...prev, specializations: specs };
    });
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
        business_name: form.business_name,
        experience_years: parseInt(form.experience_years),
        specializations: form.specializations,
        documents: {
          license_number: form.license_number,
          aadhar_number: form.aadhar_number
        }
      };

      if (profile) {
        await updateMechanicProfile(payload);
        toast.success('Profile updated successfully!');
      } else {
        await createMechanicProfile(payload);
        toast.success('Profile submitted! Pending verification.');
      }
      await fetchProfile();
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-dark">My Profile</h1>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${profile.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {profile.is_verified ? '✓ Verified Partner' : '⏳ Verification Pending'}
          </span>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid md:grid-cols-2 gap-6">
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
              {submitting ? 'Saving...' : (profile ? 'Update Profile' : 'Submit Profile for Verification')}
            </button>
            {!profile && (
              <p className="text-xs text-muted mt-3 flex items-center gap-1">
                ⚠️ Your profile will be reviewed by an admin. You can receive requests only after verification.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MechanicProfilePage;
