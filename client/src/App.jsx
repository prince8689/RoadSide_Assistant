import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import useAuthStore from './store/authStore';
import { connectSocket } from './socket/socketClient';

// Lazy load dashboards
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const MechanicDashboard = lazy(() => import('./pages/mechanic/MechanicDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFound from './components/common/NotFound';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  const { token, user } = useAuthStore();

  // Connect socket when logged in
  useEffect(() => {
    if (token) connectSocket(token);
  }, [token]);

  // Redirect based on role
  const getHomePath = () => {
    if (!user) return '/login';
    if (user.role === 'mechanic') return '/mechanic';
    if (user.role === 'admin') return '/admin';
    return '/dashboard';
  };

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#28A745', secondary: '#fff' } },
          error: { iconTheme: { primary: '#DC3545', secondary: '#fff' } },
        }}
      />
      <div className="font-sans min-h-screen bg-light">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-light">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              token ? <Navigate to={getHomePath()} /> : <LoginPage />
            } />
            <Route path="/register" element={
              token ? <Navigate to={getHomePath()} /> : <RegisterPage />
            } />

            {/* User routes */}
            <Route path="/dashboard/*" element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            } />

            {/* Mechanic routes */}
            <Route path="/mechanic/*" element={
              <ProtectedRoute allowedRoles={['mechanic']}>
                <MechanicDashboard />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to={getHomePath()} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
