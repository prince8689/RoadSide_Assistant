import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { sendOTPThunk, verifyOTPThunk, loginThunk, clearError, resetOtpState } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(30);
  
  const dispatch = useDispatch();
  const { isLoading, otpSent, otpVerified } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  // Timer for OTP resend
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Reset state on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(resetOtpState());
    };
  }, [dispatch]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!form.email) return toast.error('Please enter your email');
    
    const result = await dispatch(sendOTPThunk({ email: form.email, purpose: 'login' }));
    
    if (sendOTPThunk.fulfilled.match(result)) {
      toast.success(result.payload.message || 'OTP sent successfully!');
      setStep(2);
      setTimer(30);
    } else {
      toast.error(result.payload || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) return toast.error('Please enter the complete OTP');

    const result = await dispatch(verifyOTPThunk({ email: form.email, otp: otpValue, purpose: 'login' }));
    
    if (verifyOTPThunk.fulfilled.match(result)) {
      toast.success('OTP verified!');
      setStep(3);
    } else {
      toast.error(result.payload || 'Invalid OTP');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
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
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-dark mb-2">Welcome back</h2>
                <p className="text-muted mb-6">Sign in to your account</p>

                <form onSubmit={handleSendOtp} className="space-y-5">
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

                  <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 h-12">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
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
            )}

            {step === 2 && (
              <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 p-6 sm:p-8 flex flex-col items-center">
                <button type="button" onClick={() => setStep(1)} className="absolute top-6 left-6 text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
                  <FiArrowLeft /> Back
                </button>

                <div className="w-16 h-16 bg-orange-100 text-primary rounded-full flex items-center justify-center mb-4 mt-6">
                  <FiMail className="text-3xl" />
                </div>
                <h2 className="text-2xl font-bold text-dark text-center mb-2">Verify OTP</h2>
                <p className="text-muted text-center text-sm mb-6">
                  Code sent to <span className="font-semibold text-dark">{form.email}</span>
                </p>

                <form onSubmit={handleVerifyOtp} className="w-full">
                  <div className="flex gap-2 sm:gap-3 justify-center mb-8">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      />
                    ))}
                  </div>

                  <button type="submit" disabled={isLoading || otp.join('').length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 h-12 mb-4">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify Code'}
                  </button>
                </form>

                <div className="text-center text-sm text-gray-500">
                  {timer > 0 ? (
                    <span>Resend OTP in {timer}s</span>
                  ) : (
                    <button type="button" onClick={handleSendOtp} disabled={isLoading} className="text-primary font-semibold hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 p-6 sm:p-8 flex flex-col items-center">
                 <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 mt-2">
                  <FiCheckCircle className="text-3xl" />
                </div>
                <h2 className="text-2xl font-bold text-dark text-center mb-2">Secure Login</h2>
                <p className="text-muted text-center text-sm mb-6">Enter your password to continue</p>

                <form onSubmit={handleLogin} className="w-full space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
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
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6 font-medium">
          Emergency? Call <span className="text-primary">1800-ROADHELP</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
