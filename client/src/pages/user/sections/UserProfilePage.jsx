import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  MdPerson, MdLock, MdContactEmergency, 
  MdNotifications, MdWarning, MdCheckCircle 
} from 'react-icons/md';
import { useSelector, useDispatch } from 'react-redux';
import { getMeThunk, logoutThunk } from '../../../store/authStore';
import api from '../../../api/axios';

const UserProfilePage = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Data states
  const [personalInfo, setPersonalInfo] = useState({ full_name: '', phone: '', address: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [emergencyContact, setEmergencyContact] = useState({ contact_name: '', relationship: '', phone: '' });
  const [preferences, setPreferences] = useState({ 
    request_updates: true, mechanic_alerts: true, service_completed: true, promotions: false 
  });

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        full_name: user.full_name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactRes, prefRes] = await Promise.all([
          api.get('/users/emergency-contact'),
          api.get('/users/preferences')
        ]);
        if (contactRes.data?.contact) setEmergencyContact(contactRes.data.contact);
        if (prefRes.data?.preferences) setPreferences(prefRes.data.preferences);
      } catch (err) {
        // Silently fail if not found
      }
    };
    fetchData();
  }, []);

  // Calculate completion
  useEffect(() => {
    let score = 0;
    if (personalInfo.full_name) score += 20;
    if (personalInfo.phone) score += 20;
    if (personalInfo.address) score += 20;
    if (emergencyContact.contact_name && emergencyContact.phone) score += 40;
    setProfileCompletion(score);
  }, [personalInfo, emergencyContact]);

  const handleUpdatePersonal = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/users/profile', personalInfo);
      dispatch(getMeThunk());
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmergency = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/users/emergency-contact', emergencyContact);
      toast.success('Emergency contact updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    try {
      await api.patch('/users/preferences', newPrefs);
      toast.success('Preferences updated');
    } catch (err) {
      toast.error('Failed to update preferences');
      setPreferences(preferences); // revert
    }
  };

  const tabs = [
    { id: 'personal', icon: MdPerson, label: 'Personal Info' },
    { id: 'security', icon: MdLock, label: 'Security' },
    { id: 'emergency', icon: MdContactEmergency, label: 'Emergency Contact' },
    { id: 'preferences', icon: MdNotifications, label: 'Notifications' },
    { id: 'danger', icon: MdWarning, label: 'Danger Zone' },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 space-y-4">
        {/* Profile Completion Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
            <span className="text-2xl font-bold text-primary">{user?.full_name?.charAt(0)}</span>
          </div>
          <h3 className="font-bold text-dark">{user?.full_name}</h3>
          <p className="text-xs text-gray-500 mb-4">{user?.email}</p>
          
          <div className="text-left">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-gray-700">Profile Completion</span>
              <span className="font-bold text-primary">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${profileCompletion === 100 ? 'bg-green-500' : 'bg-primary'}`} 
                style={{ width: `${profileCompletion}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 transition-all text-left text-sm font-semibold
                  ${isActive ? 'bg-primary/5 text-primary border-r-4 border-primary' : 'text-gray-600 hover:bg-gray-50'}
                  ${tab.id === 'danger' ? 'hover:text-red-600 hover:bg-red-50' : ''}
                `}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px]">
        
        {/* PERSONAL INFO */}
        {activeTab === 'personal' && (
          <div className="animate-fade-in max-w-xl">
            <h2 className="text-2xl font-bold text-dark mb-6">Personal Information</h2>
            <form onSubmit={handleUpdatePersonal} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input className="input-field" value={personalInfo.full_name} onChange={e => setPersonalInfo({...personalInfo, full_name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email (Cannot be changed)</label>
                <input className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" value={user?.email} disabled />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                <input className="input-field" value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} placeholder="10-digit number" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                <textarea className="input-field min-h-[80px]" value={personalInfo.address} onChange={e => setPersonalInfo({...personalInfo, address: e.target.value})} placeholder="Your full address..." />
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-4">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div className="animate-fade-in max-w-xl">
            <h2 className="text-2xl font-bold text-dark mb-6">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                <input type="password" required className="input-field" value={passwords.currentPassword} onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                <input type="password" required className="input-field" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} placeholder="Min 8 chars, 1 uppercase, 1 special char" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" required className="input-field" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-4">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* EMERGENCY CONTACT */}
        {activeTab === 'emergency' && (
          <div className="animate-fade-in max-w-xl">
            <h2 className="text-2xl font-bold text-dark mb-2">Emergency Contact</h2>
            <p className="text-gray-500 text-sm mb-6">We will notify this contact if you request emergency roadside assistance.</p>
            <form onSubmit={handleUpdateEmergency} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contact Name</label>
                <input className="input-field" required value={emergencyContact.contact_name} onChange={e => setEmergencyContact({...emergencyContact, contact_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Relationship</label>
                <input className="input-field" placeholder="e.g. Spouse, Parent, Friend" value={emergencyContact.relationship} onChange={e => setEmergencyContact({...emergencyContact, relationship: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                <input className="input-field" required placeholder="10-digit number" value={emergencyContact.phone} onChange={e => setEmergencyContact({...emergencyContact, phone: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-4">
                {loading ? 'Saving...' : 'Save Emergency Contact'}
              </button>
            </form>
          </div>
        )}

        {/* NOTIFICATION PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="animate-fade-in max-w-xl">
            <h2 className="text-2xl font-bold text-dark mb-6">Notification Preferences</h2>
            <div className="space-y-6">
              {[
                { key: 'request_updates', label: 'Service Request Updates', desc: 'Get notified when a mechanic accepts or completes your request.' },
                { key: 'mechanic_alerts', label: 'Mechanic Arrival Alerts', desc: 'Get SMS/Push alerts when the mechanic is nearby.' },
                { key: 'service_completed', label: 'Service Completion', desc: 'Receive invoice and feedback requests.' },
                { key: 'promotions', label: 'Offers & Promotions', desc: 'Receive occasional discounts and offers.' }
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-dark text-sm">{pref.label}</h4>
                    <p className="text-xs text-gray-500">{pref.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={preferences[pref.key]}
                      onChange={(e) => handleUpdatePreferences(pref.key, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {activeTab === 'danger' && (
          <div className="animate-fade-in max-w-xl">
            <h2 className="text-2xl font-bold text-red-600 mb-6">Danger Zone</h2>
            
            <div className="border-2 border-red-100 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-dark mb-2">Log out of all devices</h3>
              <p className="text-sm text-gray-500 mb-4">This will clear your current session and require you to log in again.</p>
              <button onClick={() => dispatch(logoutThunk())} className="btn-outline border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-6">
                Log Out Now
              </button>
            </div>

            <div className="border-2 border-red-100 rounded-xl p-5">
              <h3 className="font-bold text-dark mb-2">Delete Account</h3>
              <p className="text-sm text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
              <button onClick={() => toast.error('Please contact support to delete your account')} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition">
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
