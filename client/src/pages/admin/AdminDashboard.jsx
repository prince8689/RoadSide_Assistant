import useAuthStore from '../../store/authStore';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  
  return (
    <div className="min-h-screen bg-light">
      <nav className="bg-dark p-4 flex justify-between items-center text-white">
        <div className="text-xl font-bold text-primary">RoadAssist <span className="text-sm text-danger">Admin Panel</span></div>
        <div className="flex items-center gap-4">
          <span>{user?.full_name}</span>
          <button onClick={logout} className="text-sm bg-secondary px-3 py-1 rounded">Logout</button>
        </div>
      </nav>
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h1 className="text-4xl font-bold text-primary mb-4">Admin Dashboard</h1>
        <p className="text-xl text-muted bg-white p-6 rounded-2xl shadow-card">🚧 Coming Day 20</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
