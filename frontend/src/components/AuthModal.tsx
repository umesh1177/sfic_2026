import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  User,
  MapPin,
  Check
} from 'lucide-react';
import { api } from '../services/api.js';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: Profile, isFirstLogin?: boolean) => void;
  initialMode?: 'login' | 'signup';
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  lang
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [signupStep, setSignupStep] = useState<1 | 2 | 3 | 4>(1);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);

  // Common inputs
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredLang, setPreferredLang] = useState<Language>(lang);
  const [locality, setLocality] = useState('Dudhiya Talao');
  const [email, setEmail] = useState('');
  const [consentTerms, setConsentTerms] = useState(true);

  // OTP State
  const [sessionId, setSessionId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  // CAPTCHA State
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [captchaNum1, setCaptchaNum1] = useState(4);
  const [captchaNum2, setCaptchaNum2] = useState(7);
  const [captchaInput, setCaptchaInput] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const t = translations[lang];

  useEffect(() => {
    setMode(initialMode);
    setSignupStep(1);
    setForgotStep(1);
    setErrorMessage('');
    setSuccessMessage('');
    resetCaptcha();
  }, [initialMode, isOpen]);

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const resetCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 2;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaInput('');
    setCaptchaPassed(false);
  };

  const handleVerifyCaptcha = (val: string) => {
    setCaptchaInput(val);
    if (parseInt(val, 10) === captchaNum1 + captchaNum2) {
      setCaptchaPassed(true);
      setErrorMessage('');
    } else {
      setCaptchaPassed(false);
    }
  };

  // OTP inputs handling
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      otpInputRefs.current[Math.min(5, pasted.length)]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value.replace(/\D/g, '');
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // --- SIGNUP FLOW HANDLERS ---
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (phone.replace(/\D/g, '').length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!consentTerms) {
      setErrorMessage('You must agree to the Terms of Service & Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signupSendOtp(phone, consentTerms);
      setSessionId(res.data.session_id);
      setCountdown(res.data.expires_in_seconds || 120);
      if (res.data._dev_otp_code) {
        setDevOtpCode(res.data._dev_otp_code);
      }
      setSignupStep(2);
      setSuccessMessage(`OTP sent via SMS to ${res.data.mobile_masked}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP received');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signupVerifyOtp(sessionId, fullOtp);
      setVerificationToken(res.data.verification_token);
      setSignupStep(3);
      setSuccessMessage('Mobile verified! Please set up your password and profile.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signupCompleteProfile({
        verification_token: verificationToken,
        full_name: fullName,
        password,
        confirm_password: confirmPassword,
        preferred_language: preferredLang,
        email,
        locality
      });

      localStorage.setItem('clean_navsari_token', res.data.token);
      // Navigate to step 4 (Onboarding experience)
      setSignupStep(4);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    api.getMe().then(res => {
      onSuccess(res.data.profile, true);
      onClose();
    }).catch(() => onClose());
  };

  // --- LOGIN FLOW HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!captchaPassed) {
      setErrorMessage('Please solve the security CAPTCHA verification challenge');
      return;
    }

    setLoading(true);
    try {
      const captchaToken = 'challenge_pass_' + captchaInput;
      const res = await api.login(phone, password, captchaToken);
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD HANDLERS ---
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await api.forgotPasswordSendOtp(phone);
      setSessionId(res.data.session_id);
      if (res.data._dev_otp_code) setDevOtpCode(res.data._dev_otp_code);
      setForgotStep(2);
      setSuccessMessage('Password reset OTP sent to registered number');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    setLoading(true);
    try {
      const res = await api.forgotPasswordVerifyOtp(sessionId, fullOtp);
      setVerificationToken(res.data.reset_token);
      setForgotStep(3);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.forgotPasswordReset(verificationToken, password, confirmPassword);
      setSuccessMessage('Password updated! You can now log in.');
      setMode('login');
      resetCaptcha();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-[#095c54] via-[#0d6e65] to-[#10b981] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {mode === 'signup'
                  ? 'Citizen Registration'
                  : mode === 'forgot'
                  ? 'Reset Password'
                  : 'Citizen Login'}
              </h3>
              <p className="text-[11px] text-[#e6f4f1] font-medium">
                My Clean Navsari · NMC Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#fee2e2] text-[#dc2626] text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#ecfdf5] text-[#10b981] text-xs font-bold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dev Mode OTP helper callout for Hackathon Judges */}
          {devOtpCode && (
            <div className="mb-4 p-2.5 rounded-xl bg-[#fef3c7] border border-[#fde68a] text-[#b45309] text-xs font-medium flex items-center justify-between">
              <span>Demo SMS OTP Code: <strong className="text-sm font-extrabold">{devOtpCode}</strong></span>
              <button
                type="button"
                onClick={() => {
                  const arr = devOtpCode.split('');
                  setOtpDigits(arr);
                }}
                className="px-2 py-1 rounded bg-[#b45309] text-white text-[10px] font-bold"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* FLOW A: CITIZEN SIGNUP                                  */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <div>
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-5">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                        signupStep === s
                          ? 'bg-[#095c54] text-white ring-4 ring-[#e6f4f1]'
                          : signupStep > s
                          ? 'bg-[#10b981] text-white'
                          : 'bg-slate-100 text-[#64748b]'
                      }`}
                    >
                      {signupStep > s ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < 4 && (
                      <div
                        className={`h-1 flex-1 mx-1.5 rounded-full ${
                          signupStep > s ? 'bg-[#10b981]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Mobile Number */}
              {signupStep === 1 && (
                <form onSubmit={handleSendSignupOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                      Enter Mobile Number <span className="text-[#dc2626]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 rounded-xl border border-[#e2e8f0] bg-slate-50 text-xs font-extrabold text-[#095c54] flex items-center gap-1">
                        🇮🇳 <span>+91</span>
                      </div>
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 text-[#64748b] absolute left-3 top-3" />
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e2e8f0] text-sm font-semibold focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/15 outline-none"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-1">
                      Your mobile number is the primary identifier. No email required.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={consentTerms}
                      onChange={e => setConsentTerms(e.target.checked)}
                      className="mt-0.5 accent-[#095c54] rounded cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-[#64748b] cursor-pointer">
                      I agree to the <strong className="text-[#095c54]">Terms of Service</strong> &{' '}
                      <strong className="text-[#095c54]">Privacy Policy</strong> of Navsari Municipal Corporation.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending SMS OTP...' : 'Send Verification OTP'}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs font-bold text-[#64748b] hover:text-[#095c54]"
                    >
                      Already have an account? <span className="text-[#095c54]">Log In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {signupStep === 2 && (
                <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                  <div className="text-center mb-2">
                    <span className="text-xs text-[#64748b]">
                      6-digit verification code sent to
                    </span>
                    <div className="font-extrabold text-sm text-[#095c54] mt-0.5">
                      +91 {phone.slice(0, 3)} XXXXX-{phone.slice(-4)}
                    </div>
                  </div>

                  {/* 6 OTP boxes */}
                  <div className="flex justify-between gap-2 max-w-xs mx-auto">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-black rounded-xl border border-[#e2e8f0] focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/20 outline-none transition"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs px-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="text-[#64748b] hover:underline"
                    >
                      Change Number
                    </button>
                    {countdown > 0 ? (
                      <span className="text-[#64748b]">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendSignupOtp}
                        className="font-bold text-[#095c54] hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Verifying OTP...' : 'Verify & Continue'}
                  </button>
                </form>
              )}

              {/* Step 3: Complete Citizen Profile */}
              {signupStep === 3 && (
                <form onSubmit={handleCompleteProfile} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Full Name <span className="text-[#dc2626]">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#64748b] absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Patel"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#0f2925] mb-1">
                        Password (Min 8) <span className="text-[#dc2626]">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0f2925] mb-1">
                        Confirm Password <span className="text-[#dc2626]">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Preferred Language
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { code: 'en' as Language, label: 'English' },
                        { code: 'gu' as Language, label: 'ગુજરાતી' },
                        { code: 'hi' as Language, label: 'हिन्दी' }
                      ].map(l => (
                        <button
                          type="button"
                          key={l.code}
                          onClick={() => setPreferredLang(l.code)}
                          className={`py-2 text-xs font-bold rounded-xl border transition ${
                            preferredLang === l.code
                              ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                              : 'border-[#e2e8f0] text-[#64748b]'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Locality / Navsari Ward (Optional)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#64748b] absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. Dudhiya Talao, Ward 3"
                        value={locality}
                        onChange={e => setLocality(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="citizen@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50 mt-2"
                  >
                    {loading ? 'Creating Citizen Profile...' : 'Complete Profile & Open App'}
                  </button>
                </form>
              )}

              {/* Step 4: First-time Onboarding Experience */}
              {signupStep === 4 && (
                <div className="text-center py-2 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#ecfdf5] text-[#10b981] flex items-center justify-center mx-auto shadow-inner">
                    <Sparkles className="w-8 h-8 text-[#10b981]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-[#095c54]">
                      Welcome to My Clean Navsari!
                    </h3>
                    <p className="text-xs text-[#64748b] mt-1 max-w-xs mx-auto">
                      You are now empowered as an official citizen watchdog for Navsari Municipal Corporation.
                    </p>
                  </div>

                  <div className="text-left bg-[#f0f6f4] p-3.5 rounded-2xl space-y-2.5 text-xs text-[#0f2925]">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#095c54]">1.</span>
                      <span><strong>Snap & Report:</strong> Take photos of overflowing bins or garbage heaps. AI predicts category and PostGIS locates your ward.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#095c54]">2.</span>
                      <span><strong>Track Live:</strong> Follow status from assignment to supervisor verification.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#095c54]">3.</span>
                      <span><strong>Join Drives:</strong> Volunteer in lakefront and beach cleanups to earn verified badges.</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFinishOnboarding}
                    className="w-full btn-primary-custom py-3 text-sm font-bold"
                  >
                    Go to Citizen Dashboard
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* FLOW B: CITIZEN LOGIN                                    */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                  Mobile Number <span className="text-[#dc2626]">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="px-3 py-2.5 rounded-xl border border-[#e2e8f0] bg-slate-50 text-xs font-extrabold text-[#095c54] flex items-center gap-1">
                    🇮🇳 <span>+91</span>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-[#64748b] absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="Enter registered mobile"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e2e8f0] text-sm font-semibold focus:border-[#095c54] outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#0f2925]">
                    Password <span className="text-[#dc2626]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] font-bold text-[#095c54] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748b] absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#e2e8f0] text-sm font-semibold focus:border-[#095c54] outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#64748b] hover:text-[#095c54]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA Security Verification Widget */}
              <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f2925] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#095c54]" />
                    Human Verification Challenge
                  </span>
                  <button
                    type="button"
                    onClick={resetCaptcha}
                    className="text-[11px] text-[#64748b] hover:text-[#095c54] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-[#b8e0d7] font-black text-sm text-[#095c54] select-none tracking-wider">
                    {captchaNum1} + {captchaNum2} = ?
                  </div>
                  <input
                    type="number"
                    placeholder="Answer"
                    value={captchaInput}
                    onChange={e => handleVerifyCaptcha(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-bold focus:border-[#095c54] outline-none"
                  />
                  {captchaPassed && (
                    <span className="text-xs font-extrabold text-[#10b981] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !captchaPassed}
                className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignupStep(1);
                  }}
                  className="text-xs font-bold text-[#64748b] hover:text-[#095c54]"
                >
                  New citizen? <span className="text-[#095c54]">Register Mobile Number</span>
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* FLOW C: FORGOT PASSWORD                                  */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <div>
              {forgotStep === 1 && (
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <p className="text-xs text-[#64748b]">
                    Enter your registered Indian mobile number. We will send an SMS OTP to reset your credentials.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 rounded-xl border border-[#e2e8f0] bg-slate-50 text-xs font-extrabold text-[#095c54]">
                        +91
                      </div>
                      <input
                        type="tel"
                        placeholder="10-digit mobile"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#e2e8f0] text-sm font-semibold focus:border-[#095c54] outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs font-bold text-[#64748b] hover:underline"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                  <div className="text-center mb-2">
                    <span className="text-xs text-[#64748b]">Enter OTP sent to +91 {phone}</span>
                  </div>

                  <div className="flex justify-between gap-2 max-w-xs mx-auto">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-black rounded-xl border border-[#e2e8f0] focus:border-[#095c54] outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={handleForgotResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      New Password (Min 8 chars)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary-custom py-3 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Updating Password...' : 'Save Password & Login'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
