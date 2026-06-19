import { useState, useEffect } from 'react';
import { getFinancialStats, getAdminSettings, updateAdminSettings } from '../../../api/adminApi';
import { FiDollarSign, FiTrendingUp, FiActivity, FiPieChart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import PageTransition from '../../../components/common/PageTransition';

const FinancialsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({ platform_fee_value: '', tax_percentage: '' });
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, settingsRes] = await Promise.all([
        getFinancialStats(),
        getAdminSettings()
      ]);
      setStats(statsRes.data.data || statsRes.data);
      if (settingsRes.data?.settings) {
        setSettings({
          platform_fee_value: settingsRes.data.settings.platform_fee_value,
          tax_percentage: settingsRes.data.settings.tax_percentage
        });
      }
    } catch (error) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setUpdatingSettings(true);
    try {
      await updateAdminSettings({
        platform_fee_value: Number(settings.platform_fee_value),
        tax_percentage: Number(settings.tax_percentage),
        platform_fee_type: 'flat'
      });
      toast.success('Billing settings updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading financials...</div>;
  }

  const { overall, monthly } = stats;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Financial Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Track revenue, taxes, and mechanic payouts.</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl">
              <FiDollarSign />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-dark">₹{overall?.total_revenue || 0}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center text-xl">
              <FiTrendingUp />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Platform Earnings</p>
              <h3 className="text-2xl font-bold text-dark">₹{overall?.platform_earnings || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center text-xl">
              <FiActivity />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Mechanic Earnings</p>
              <h3 className="text-2xl font-bold text-dark">₹{overall?.mechanic_earnings || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xl">
              <FiPieChart />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Tax Collected</p>
              <h3 className="text-2xl font-bold text-dark">₹{overall?.tax_collected || 0}</h3>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown and Recent Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
            <h2 className="text-lg font-bold text-dark mb-4">Monthly Platform Earnings</h2>
            {monthly && monthly.length > 0 ? (
              <div className="space-y-3">
                {monthly.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{m.month}</span>
                    <span className="font-bold text-green-600">₹{m.platform_earnings}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No monthly data available yet.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <h2 className="text-lg font-bold text-dark mb-4">Recent Invoices Generated</h2>
            {stats.recent_invoices && stats.recent_invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="p-3 text-sm font-semibold text-gray-500">ID</th>
                      <th className="p-3 text-sm font-semibold text-gray-500">User</th>
                      <th className="p-3 text-sm font-semibold text-gray-500">Mechanic</th>
                      <th className="p-3 text-sm font-semibold text-gray-500">Amount</th>
                      <th className="p-3 text-sm font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-600">#{inv.id.substring(0, 8)}</td>
                        <td className="p-3 font-medium text-dark">{inv.user_name}</td>
                        <td className="p-3 text-gray-600">{inv.mechanic_name || 'N/A'}</td>
                        <td className="p-3 font-bold text-dark">₹{inv.total_amount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                            inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No invoices generated yet.</p>
            )}
          </div>
        </div>
        {/* Settings Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-bold text-dark mb-4">Invoice Billing Settings</h2>
          <form onSubmit={handleUpdateSettings} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field pl-8 w-full border border-gray-300 rounded-lg p-2"
                  value={settings.platform_fee_value}
                  onChange={(e) => setSettings({...settings, platform_fee_value: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Tax Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="input-field w-full border border-gray-300 rounded-lg p-2 pr-8"
                  value={settings.tax_percentage}
                  onChange={(e) => setSettings({...settings, tax_percentage: e.target.value})}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={updatingSettings}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {updatingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageTransition>
  );
};

export default FinancialsPage;
