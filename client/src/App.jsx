import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMeThunk } from './store/authStore';
import { connectSocket } from './socket/socketClient';

// Lazy load with auto-retry on chunk load failure (handles Vercel re-deploys)
const lazyWithRetry = (importFn) => {
  return lazy(() =>
    importFn().catch(() => {
      // If chunk fails to load (new deploy), reload page once
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', 'true');
        window.location.reload();
        return { default: () => null }; // Return empty component while reloading
      }
      sessionStorage.removeItem('chunk_reload');
      // If already reloaded once, just re-throw
      return importFn();
    })
  );
};

const UserDashboard = lazyWithRetry(() => import('./pages/user/UserDashboard'));
const MechanicDashboard = lazyWithRetry(() => import('./pages/mechanic/MechanicDashboard'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import PaymentPage from './pages/user/PaymentPage';
import InvoicePage from './pages/user/InvoicePage';
import NotFound from './components/common/NotFound';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';
import GoogleMapsProvider from './components/maps/GoogleMapsProvider';
import AIChatbot from './components/chat/AIChatbot';

function App() {
  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // On app load, verify token
  useEffect(() => {
    if (token && !user) {
      dispatch(getMeThunk());
    }
  }, [token, dispatch, user]);

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
    <ErrorBoundary>
      <GoogleMapsProvider>
        <Router>
          <ScrollToTop />
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
                <Route path="/forgot-password" element={
                  token ? <Navigate to={getHomePath()} /> : <ForgotPasswordPage />
                } />

                {/* User routes */}
                <Route path="/payment/:invoiceId" element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <PaymentPage />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/invoice/:requestId" element={
                  <ProtectedRoute allowedRoles={['user', 'mechanic', 'admin']}>
                    <InvoicePage />
                  </ProtectedRoute>
                } />
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
              
              <AIChatbot />
            </Suspense>
          </div>
        </Router>
      </GoogleMapsProvider>
    </ErrorBoundary>
  );
}

export default App;
