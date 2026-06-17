import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { MdDirectionsCar } from 'react-icons/md';
import { FaTools } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { sendOTPThunk, verifyOTPThunk, registerThunk, clearError, resetOtpState } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import TermsModal from '../../components/common/TermsModal';
import { checkEmail } from '../../api/authApi';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm_password: '', role: 'user',
    // Mechanic details
    experience_years: '1-2', specializations: [], service_radius: 5, aadhar_number: ''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [timer, setTimer] = useState(30);

  // New states for error handling, duplicate email check, and success screen
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  const specOptions = ['Engine Repair', 'Tyre Service', 'Battery', 'Electrical', 'AC Repair', 'Towing', 'Body Work', 'General Maintenance'];

  useEffect(() => {
    let interval;
    if (step === 3 && timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
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

  // Check email exists before sending OTP
  const handleEmailBlur = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;
    try {
      setIsCheckingEmail(true);
      setEmailExists(false);
      setAuthError(null);
      const res = await checkEmail(form.email);
      if (res.data?.data?.exists || res.data?.exists) {
        setEmailExists(true);
      }
    } catch (err) {
      console.error('Email check failed', err);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Step 2 -> 3 (Send OTP)
  const handleSendOtp = async (e) => {
    if(e) e.preventDefault();
    if (emailExists) return;
    if (!form.full_name || !form.email || !form.phone) return toast.error('Please fill all basic info');
    if (form.phone.replace('+91', '').length !== 10) return toast.error('Phone must be 10 digits');
    
    const phoneWithCode = form.phone.startsWith('+91') ? form.phone : `+91${form.phone}`;
    setForm({...form, phone: phoneWithCode});

    const result = await dispatch(sendOTPThunk({ email: form.email, purpose: 'register', full_name: form.full_name, phone: phoneWithCode }));
    if (sendOTPThunk.fulfilled.match(result)) {
      toast.success(result.payload.message || 'OTP sent successfully!');
      setStep(3);
      setTimer(30);
    } else {
      toast.error(result.payload || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value !== '' && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  // Step 3 -> 4 (Verify OTP)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) return toast.error('Please enter complete OTP');
    
    const result = await dispatch(verifyOTPThunk({ email: form.email, otp: otpValue, purpose: 'register' }));
    if (verifyOTPThunk.fulfilled.match(result)) {
      toast.success('Email verified!');
      setStep(4);
    } else {
      toast.error(result.payload || 'Invalid OTP');
    }
  };

  // Step 4 -> 5 or Submit (Password Setup)
  const handlePasswordSetup = (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters long');
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');
    if (!agreed) return toast.error('You must agree to Terms & Conditions');
    
    if (form.role === 'mechanic') setStep(5);
    else submitRegistration();
  };

  // Submit Final
  const submitRegistration = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    
    let expYears = 0;
    if (form.experience_years === '1-2') expYears = 1;
    else if (form.experience_years === '3-5') expYears = 3;
    else if (form.experience_years === '5-10') expYears = 5;
    else if (form.experience_years === '10+') expYears = 10;
    else expYears = parseInt(form.experience_years) || 0;

    const payload = {
      ...form,
      otp: otpValue,
      experience_years: expYears,
      documents: [{ type: 'aadhar', number: form.aadhar_number, verified: false }]
    };

    const result = await dispatch(registerThunk(payload));

    if (registerThunk.fulfilled.match(result)) {
      setAuthError(null);
      setIsRegistered(true);
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } else {
      const errorMsg = result.payload || 'Registration failed';
      setAuthError(errorMsg);
      // Let the user stay on the form to see the specific error
    }
  };

  const toggleSpec = (spec) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec) 
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const pageVariants = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark to-secondary flex items-center justify-center p-4 sm:p-6 overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary opacity-10 rounded-full animate-pulse-ring" />
      </div>

      <div className="w-full max-w-xl mx-4 sm:mx-auto z-10 relative">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden min-h-[500px] relative">
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-100 w-full absolute top-0 left-0">
            <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(step / (form.role === 'mechanic' ? 5 : 4)) * 100}%` }} />
          </div>

          <AnimatePresence mode="wait">
            
            {/* STEP 1: ROLE SELECTION */}
            {step === 1 && !isRegistered && !authError?.toLowerCase().includes('already registered') && (
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <span className="text-4xl">👋</span>
                  <h2 className="text-2xl font-bold text-dark mt-2">Welcome to RoadAssist</h2>
                  <p className="text-muted">How would you like to join us?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => { setForm({ ...form, role: 'user' }); setTimeout(() => setStep(2), 300); }}
                    className={`cursor-pointer border-2 rounded-2xl p-6 text-center transition-all hover:border-primary hover:bg-orange-50 ${form.role === 'user' ? 'border-primary bg-orange-50 ring-2 ring-primary ring-opacity-50' : 'border-gray-200'}`}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                      <FiUser className="text-2xl text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">I need help</h3>
                    <p className="text-sm text-gray-500 mt-2">Request roadside help anytime, anywhere</p>
                  </div>
                  
                  <div 
                    onClick={() => { setForm({ ...form, role: 'mechanic' }); setTimeout(() => setStep(2), 300); }}
                    className={`cursor-pointer border-2 rounded-2xl p-6 text-center transition-all hover:border-primary hover:bg-orange-50 ${form.role === 'mechanic' ? 'border-primary bg-orange-50 ring-2 ring-primary ring-opacity-50' : 'border-gray-200'}`}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                      <FaTools className="text-2xl text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">I'm a Mechanic</h3>
                    <p className="text-sm text-gray-500 mt-2">Earn by helping people nearby</p>
                  </div>
                </div>
                
                <p className="text-center text-sm text-gray-600 mt-8">
                  Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
                </p>
              </motion.div>
            )}

            {/* STEP 2: BASIC INFO */}
            {step === 2 && !isRegistered && !authError?.toLowerCase().includes('already registered') && (
              <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col justify-center">
                <button type="button" onClick={() => setStep(1)} className="absolute top-6 left-6 text-gray-400 hover:text-primary flex items-center gap-1 text-sm font-medium"><FiArrowLeft/> Back</button>
                <h2 className="text-2xl font-bold text-dark mb-2 mt-4">Basic Information</h2>
                <p className="text-muted mb-6">Tell us a bit about yourself</p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input type="text" placeholder="Full Name" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="input-field pl-12" />
                  </div>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input type="email" placeholder="Email Address" required value={form.email} onChange={e => {setForm({...form, email: e.target.value}); setEmailExists(false); setAuthError(null);}} onBlur={handleEmailBlur} className={`input-field pl-12 ${emailExists ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : ''}`} />
                    {isCheckingEmail && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                  </div>
                  {emailExists && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm mt-1 px-1">
                      <span className="text-red-500 font-medium">This email is already registered.</span>
                      <Link to="/login" className="text-primary font-bold hover:underline ml-2">Go to Login &rarr;</Link>
                    </motion.div>
                  )}
                  <div className="relative flex">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 font-medium">+91</span>
                    <input type="tel" placeholder="Phone Number" required maxLength="10" value={form.phone.replace('+91', '')} onChange={e => setForm({...form, phone: e.target.value})} className="input-field rounded-l-none pl-4" />
                  </div>
                  <button type="submit" disabled={isLoading || emailExists || isCheckingEmail} className="btn-primary w-full mt-4 h-12 flex justify-center items-center">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: OTP VERIFICATION */}
            {step === 3 && !isRegistered && !authError?.toLowerCase().includes('already registered') && (
              <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col items-center justify-center">
                <button type="button" onClick={() => setStep(2)} className="absolute top-6 left-6 text-gray-400 hover:text-primary flex items-center gap-1 text-sm font-medium"><FiArrowLeft/> Back</button>
                <div className="w-16 h-16 bg-orange-100 text-primary rounded-full flex items-center justify-center mb-4">
                  <FiMail className="text-3xl" />
                </div>
                <h2 className="text-2xl font-bold text-dark text-center mb-2">Verify Email</h2>
                <p className="text-muted text-center text-sm mb-6">Code sent to <span className="font-semibold text-dark">{form.email}</span></p>

                <form onSubmit={handleVerifyOtp} className="w-full">
                  <div className="flex gap-2 sm:gap-3 justify-center mb-8">
                    {otp.map((digit, index) => (
                      <input key={index} ref={el => otpRefs.current[index] = el} type="text" maxLength="1" value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                    ))}
                  </div>
                  <button type="submit" disabled={isLoading || otp.join('').length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 h-12 mb-4">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify Code'}
                  </button>
                </form>
                <div className="text-center text-sm text-gray-500">
                  {timer > 0 ? <span>Resend OTP in {timer}s</span> : <button type="button" onClick={handleSendOtp} disabled={isLoading} className="text-primary font-semibold hover:underline">Resend OTP</button>}
                </div>
              </motion.div>
            )}

            {/* STEP 4: PASSWORD SETUP */}
            {step === 4 && !isRegistered && !authError?.toLowerCase().includes('already registered') && (
              <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col justify-center">
                <button type="button" onClick={() => setStep(3)} className="absolute top-6 left-6 text-gray-400 hover:text-primary flex items-center gap-1 text-sm font-medium"><FiArrowLeft/> Back</button>
                <div className="inline-flex items-center gap-2 mb-2 mt-4 text-green-500 font-semibold"><FiCheckCircle /> Email Verified</div>
                <h2 className="text-2xl font-bold text-dark mb-6">Secure your account</h2>

                <form onSubmit={handlePasswordSetup} className="space-y-4">
                  <div>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="Password (Min 8 chars)" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field pl-12 pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"><FiEye /></button>
                    </div>
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Strength:</span><span className={`font-semibold ${strength.text === 'Weak' ? 'text-red-500' : strength.text === 'Medium' ? 'text-yellow-500' : 'text-green-500'}`}>{strength.text}</span></div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${strength.color} ${strength.width} transition-all`} /></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Confirm Password" required value={form.confirm_password} onChange={e => setForm({...form, confirm_password: e.target.value})} className="input-field pl-12 pr-12" />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4 text-primary rounded focus:ring-primary" />
                    <label htmlFor="terms" className="text-sm text-gray-600">I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline">Terms & Conditions</button></label>
                  </div>

                  {authError && !authError.toLowerCase().includes('already registered') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm mb-4">
                      {authError}
                    </motion.div>
                  )}

                  <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6 h-12 flex justify-center items-center">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (form.role === 'mechanic' ? 'Continue to Profile' : 'Complete Registration')}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 5: MECHANIC DETAILS (Only for Mechanics) */}
            {step === 5 && form.role === 'mechanic' && !isRegistered && !authError?.toLowerCase().includes('already registered') && (
              <motion.div key="step5" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col justify-center overflow-y-auto">
                <button type="button" onClick={() => setStep(4)} className="absolute top-6 left-6 text-gray-400 hover:text-primary flex items-center gap-1 text-sm font-medium"><FiArrowLeft/> Back</button>
                <h2 className="text-2xl font-bold text-dark mb-2 mt-6">Professional Profile</h2>
                <p className="text-muted mb-6">Complete your mechanic details</p>

                <form onSubmit={submitRegistration} className="space-y-5 pb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Experience</label>
                    <select value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} className="input-field">
                      <option value="1-2">1-2 Years</option>
                      <option value="3-5">3-5 Years</option>
                      <option value="5-10">5-10 Years</option>
                      <option value="10+">10+ Years</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Service Radius: {form.service_radius} km</label>
                    <input type="range" min="1" max="20" value={form.service_radius} onChange={e => setForm({...form, service_radius: e.target.value})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1km</span><span>20km</span></div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Specializations</label>
                    <div className="grid grid-cols-2 gap-2">
                      {specOptions.map(spec => (
                        <div key={spec} onClick={() => toggleSpec(spec)} className={`px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${form.specializations.includes(spec) ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-700 hover:border-primary'}`}>
                          {spec}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Aadhar Number</label>
                    <input type="text" placeholder="12-digit Aadhar (for verification)" required minLength="12" maxLength="12" value={form.aadhar_number} onChange={e => setForm({...form, aadhar_number: e.target.value})} className="input-field" />
                  </div>

                  {authError && !authError.toLowerCase().includes('already registered') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm mb-4">
                      {authError}
                    </motion.div>
                  )}

                  <button type="submit" disabled={isLoading} className="btn-primary w-full h-12 flex justify-center items-center mt-4">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Complete Registration'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ERROR VIEW: ALREADY REGISTERED (409) */}
            {authError && authError.toLowerCase().includes('already registered') && !isRegistered && (
              <motion.div key="stepError" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-md">
                  <span className="text-4xl">😅</span>
                </div>
                <h2 className="text-2xl font-bold text-dark mb-3">Looks like you're already registered!</h2>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                  The email or phone number you provided is already linked to an account.
                </p>
                
                <Link to="/login" className="w-full">
                  <button type="button" className="btn-primary w-full h-12 text-lg">
                    Go to Login &rarr;
                  </button>
                </Link>
                <button type="button" onClick={() => { setAuthError(null); setStep(2); }} className="mt-4 text-sm font-semibold text-gray-500 hover:text-dark">
                  Use a different email
                </button>
              </motion.div>
            )}

            {/* SUCCESS VIEW */}
            {isRegistered && (
              <motion.div key="stepSuccess" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-md">
                  <FiCheckCircle className="text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-dark mb-3">Registration Successful! 🎉</h2>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                  Your account has been created successfully. You can now log in to the platform.
                </p>
                
                <Link to="/login" className="w-full">
                  <button type="button" className="btn-primary w-full h-12 text-lg">
                    Go to Login &rarr;
                  </button>
                </Link>
                <p className="text-xs text-gray-400 mt-4">
                  Redirecting automatically in a few seconds...
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};

export default RegisterPage;
