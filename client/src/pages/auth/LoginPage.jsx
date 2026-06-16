import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk, clearError } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Reset state on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email) return toast.error('Please enter your email');
    if (!form.password) return toast.error('Please enter your password');

    const result = await dispatch(loginThunk({ email: form.email, password: form.password }));
    
    if (loginThunk.fulfilled.match(result)) {
      toast.success('Welcome back!');
      const user = result.payload.user || result.payload.data?.user;
      if (user?.role === 'admin') navigate('/admin');
      else if (user?.role === 'mechanic') navigate('/mechanic');
      else navigate('/dashboard');
    } else {
      toast.error(result.payload || 'Login failed');
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary opacity-10 rounded-full animate-pulse-ring" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary opacity-5 rounded-full animate-pulse" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        {/* Logo Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <span className="text-2xl sm:text-3xl text-white">🚗</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">RoadAssist</h1>
          <p className="text-gray-400 mt-2 text-sm">Welcome back to the platform</p>
        </div>

        {/* Card Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 relative min-h-[400px]">
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <h2 className="text-2xl font-bold text-dark mb-2">Welcome back</h2>
                <p className="text-muted mb-6">Sign in to your account</p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="input-field pl-12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Password</label>
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">Forgot Password?</Link>
                    </div>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="input-field pl-12 pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 h-12">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Login'}
                  </button>
                </form>

                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="px-4 text-sm text-muted">New here?</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <Link to="/register" className="block w-full">
                  <button type="button" className="btn-outline w-full h-12">Create Account</button>
                </Link>
              </motion.div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6 font-medium">
          Emergency? Call <span className="text-primary">1800-ROADHELP</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
