import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import { FaTools } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'user', // default
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  const { register, sendOtp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const otpRefs = useRef([]);

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
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.password || !form.confirm_password) {
      return toast.error('Please fill all fields');
    }
    if (form.phone.length !== 10) {
      return toast.error('Phone number must be exactly 10 digits');
    }
    if (form.password !== form.confirm_password) {
      return toast.error('Passwords do not match');
    }
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters long');
    }
    if (!agreed) {
      return toast.error('You must agree to the Terms & Conditions');
    }
    
    // Call API to send OTP
    const result = await sendOtp({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone
    });

    if (result.success) {
      toast.success(result.message);
      setStep(2);
    } else {
      toast.error(result.error);
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

  const handleRegister = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      return toast.error('Please enter the complete 6-digit OTP');
    }

    const result = await register({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: form.role,
      otp: otpValue
    });

    if (result.success) {
      toast.success('Account created successfully!');
      if (result.role === 'mechanic') navigate('/mechanic');
      else navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark to-secondary flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans">
      <div className="w-full max-w-xl">
        {/* Logo Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <span className="text-2xl sm:text-3xl text-white">🚗</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
            {step === 1 ? 'Join RoadAssist' : 'Verify Email'}
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            {step === 1 ? 'Create your account in seconds' : `We sent a code to ${form.email}`}
          </p>
        </div>

        {/* Card Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-5 animate-fade-in">
              <h2 className="text-2xl font-bold text-dark mb-2">Create Account</h2>
              <p className="text-muted mb-6">Choose your role to get started</p>

              {/* Role Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'user' })}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                    ${form.role === 'user' ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                >
                  <MdDirectionsCar className={`text-2xl ${form.role === 'user' ? 'text-primary' : 'text-gray-400'}`} />
                  <div className="text-sm font-semibold">Vehicle Owner</div>
                  <div className="text-xs text-muted text-center">I need roadside help</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'mechanic' })}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                    ${form.role === 'mechanic' ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                >
                  <FaTools className={`text-2xl ${form.role === 'mechanic' ? 'text-primary' : 'text-gray-400'}`} />
                  <div className="text-sm font-semibold">Service Partner</div>
                  <div className="text-xs text-muted text-center">I am a mechanic</div>
                </button>
              </div>

              {/* Full Name */}
              <div>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field pl-12"
                  />
                </div>
                <div className="relative">
                  <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="tel"
                    placeholder="Phone Number (10 digits)"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field pl-12"
                    maxLength="10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pl-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                
                {/* Strength indicator */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Password strength:</span>
                      <span className={`font-semibold ${strength.text === 'Weak' ? 'text-red-500' : strength.text === 'Medium' ? 'text-yellow-500' : 'text-green-500'}`}>{strength.text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className="input-field pl-12 pr-12"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms & Conditions</a>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6 animate-fade-in flex flex-col items-center">
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="absolute top-6 left-6 text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <FiArrowLeft /> Back
              </button>

              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-2 mt-4">
                <FiMail className="text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-dark text-center">Verify your email</h2>
              <p className="text-muted text-center max-w-sm">
                We have sent a 6-digit verification code to 
                <span className="font-semibold text-dark block mt-1">{form.email}</span>
              </p>

              <div className="flex gap-2 sm:gap-3 justify-center my-6">
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

              <button
                type="submit"
                disabled={isLoading || otp.join('').length !== 6}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheckCircle className="text-lg" /> Verify & Create Account
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Didn't receive the code?{' '}
                <button 
                  type="button" 
                  onClick={handleSendOtp} 
                  disabled={isLoading}
                  className="text-primary font-semibold hover:underline"
                >
                  Resend OTP
                </button>
              </p>
            </form>
          )}

          {step === 1 && (
            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
