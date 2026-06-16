import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { sendOTPThunk, verifyOTPThunk, resetPasswordThunk, clearError, resetOtpState } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '', confirm_password: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(30);

  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(resetOtpState());
    };
  }, [dispatch]);

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length > 5) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    if (pwd.length >= 8) score += 1; 
    if (score < 2) return { text: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
    if (score < 4) return { text: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' };
    return { text: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };
  const strength = getPasswordStrength(form.password);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!form.email) return toast.error('Please enter your email');

    const result = await dispatch(sendOTPThunk({ email: form.email, purpose: 'forgot-password' }));

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

    const result = await dispatch(verifyOTPThunk({ email: form.email, otp: otpValue, purpose: 'forgot-password' }));

    if (verifyOTPThunk.fulfilled.match(result)) {
      toast.success('OTP verified!');
      setStep(3);
    } else {
      toast.error(result.payload || 'Invalid OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters long');
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');

    const result = await dispatch(resetPasswordThunk({
      email: form.email,
      otp: otp.join(''),
      new_password: form.password
    }));

    if (resetPasswordThunk.fulfilled.match(result)) {
      toast.success('Password reset successfully!');
      setStep(4);
    } else {
      toast.error(result.payload || 'Failed to reset password');
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary opacity-10 rounded-full animate-pulse-ring" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary opacity-5 rounded-full animate-pulse" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <span className="text-2xl sm:text-3xl text-white">🔒</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Reset Password</h1>
          <p className="text-gray-400 mt-2 text-sm">Recover access to your account</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 relative min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 sm:p-8">
                <Link to="/login" className="absolute top-6 left-6 text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
                  <FiArrowLeft /> Back to Login
                </Link>
                <h2 className="text-2xl font-bold text-dark mb-2 mt-8">Forgot Password?</h2>
                <p className="text-muted mb-6">Enter your registered email address to receive an OTP.</p>

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

                  <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 h-12 mt-4">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 sm:p-8 flex flex-col items-center">
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
              <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 sm:p-8 flex flex-col justify-center">
                <button type="button" onClick={() => setStep(2)} className="absolute top-6 left-6 text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
                  <FiArrowLeft /> Back
                </button>
                <div className="inline-flex items-center gap-2 mb-2 mt-4 text-green-500 font-semibold">
                  <FiCheckCircle /> OTP Verified
                </div>
                <h2 className="text-2xl font-bold text-dark mb-6">Create New Password</h2>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="New Password (Min 8 chars)" 
                        required 
                        value={form.password} 
                        onChange={e => setForm({...form, password: e.target.value})} 
                        className="input-field pl-12 pr-12" 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary">
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Strength:</span>
                          <span className={`font-semibold ${strength.text === 'Weak' ? 'text-red-500' : strength.text === 'Medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                            {strength.text}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} ${strength.width} transition-all`} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Confirm New Password" 
                      required 
                      value={form.confirm_password} 
                      onChange={e => setForm({...form, confirm_password: e.target.value})} 
                      className="input-field pl-12 pr-12" 
                    />
                  </div>

                  <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6 h-12 flex justify-center items-center">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 sm:p-8 flex flex-col items-center justify-center">
                 <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <FiCheckCircle className="text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-dark text-center mb-2">Password Reset!</h2>
                <p className="text-muted text-center text-sm mb-8">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>

                <Link to="/login" className="w-full">
                  <button className="btn-primary w-full h-12">Return to Login</button>
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
