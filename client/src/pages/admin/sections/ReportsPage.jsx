import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getRequestsReport, getMechanicPerformance } from '../../../api/adminApi';

const COLORS = ['#FF6B35', '#1A1A2E', '#28A745', '#DC3545', '#8884d8'];

const ReportsPage = () => {
  const [reqData, setReqData] = useState([]);
  const [mechData, setMechData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRequestsReport(), getMechanicPerformance()])
      .then(([r1, r2]) => {
        setReqData(r1.data.data || []);
        setMechData(r2.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center animate-pulse">Generating Reports...</div>;

  // Transform data for charts if API returns raw counts
  // Assuming reqData is array of { status: 'completed', count: 120 }
  const barData = reqData.map(item => ({
    name: String(item.status).toUpperCase(),
    Requests: parseInt(item.count, 10)
  }));

  // Mocking Pie Data for Categories based on requests (if API doesn't provide exact structure yet)
  const pieData = [
    { name: 'Towing', value: 400 },
    { name: 'Battery', value: 300 },
    { name: 'Tire', value: 300 },
    { name: 'Fuel', value: 200 }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-dark">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Deep dive into platform metrics.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-dark mb-6">Requests By Status</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#666'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#666'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f5f5f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="Requests" fill="#FF6B35" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-lg font-bold text-dark mb-2 w-full text-left">Request Distribution</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Mechanics Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-dark">Top Performing Mechanics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                <th className="p-4 pl-6">Rank</th>
                <th className="p-4">Name</th>
                <th className="p-4">Completed Jobs</th>
                <th className="p-4">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mechData.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-gray-400">Not enough data to generate rankings.</td></tr>
              ) : (
                mechData.map((mech, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-6">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 text-gray-400'}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-dark">{mech.mechanic_name || 'Partner'}</td>
                    <td className="p-4 text-dark font-medium">{mech.completed_jobs} Jobs</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-yellow-500 font-bold">
                        ⭐ {parseFloat(mech.avg_rating || 0).toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
