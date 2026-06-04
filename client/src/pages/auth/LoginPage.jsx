import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import useAuthStore from '../../store/authStore';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error('Please fill all fields');
    }
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      if (result.role === 'mechanic') navigate('/mechanic');
      else if (result.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark
                    flex items-center justify-center p-4">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary opacity-10
                        rounded-full animate-pulse-ring" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary opacity-5
                        rounded-full animate-pulse" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <span className="text-2xl sm:text-3xl text-white">🚗</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">RoadAssist</h1>
          <p className="text-gray-400 mt-2 text-sm">Welcome back to the platform</p>
        </div>

        {/* Card Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-dark mb-2">Welcome back</h2>
          <p className="text-muted mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2
                                   text-gray-400 text-lg" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-12"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2
                                   text-gray-400 text-lg" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-primary transition-colors"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent
                                rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-4 text-sm text-muted">New here?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link to="/register">
            <button className="btn-outline w-full">Create Account</button>
          </Link>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Emergency? Call{' '}
          <span className="text-primary font-semibold">1800-ROADHELP</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
