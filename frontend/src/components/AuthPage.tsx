import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  User,
  MapPin,
  Check,
  Building,
  Globe,
  Wrench,
  Users,
  MessageSquare,
  Copy,
  X,
  Upload,
  FileCheck2
} from 'lucide-react';
import { SwachhSetuLogo } from './SwachhSetuLogo.js';
import { api } from '../services/api.js';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface AuthPageProps {
  onSuccess: (profile: Profile, isFirstLogin?: boolean) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  lang,
  onLanguageChange
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [signupType, setSignupType] = useState<'citizen' | 'community'>('citizen');
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);

  // Community Self-Registration Form State
  const [commName, setCommName] = useState('');
  const [commOrgType, setCommOrgType] = useState('Resident Welfare Association');
  const [commHeadName, setCommHeadName] = useState('');
  const [commPhone, setCommPhone] = useState('');
  const [commEmail, setCommEmail] = useState('');
  const [commUsername, setCommUsername] = useState('');
  const [commUsernameStatus, setCommUsernameStatus] = useState<{ checking?: boolean; available?: boolean; message?: string } | null>(null);
  const [citizenUsername, setCitizenUsername] = useState('');
  const [citizenUsernameStatus, setCitizenUsernameStatus] = useState<{ checking?: boolean; available?: boolean; message?: string } | null>(null);
  const [commPassword, setCommPassword] = useState('');
  const [commWardNumber, setCommWardNumber] = useState<number>(3);
  const [commLocality, setCommLocality] = useState('');
  const [commAddress, setCommAddress] = useState('');
  const [commDescription, setCommDescription] = useState('');
  const [commDocUrl, setCommDocUrl] = useState('');
  const [commDocName, setCommDocName] = useState('');
  const [commSubmittedInfo, setCommSubmittedInfo] = useState<{ name: string; ward: number } | null>(null);

  const handleCommDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommDocName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setCommDocUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!commName.trim() || !commHeadName.trim() || !commPhone.trim() || !commPassword.trim()) {
      setErrorMessage('Organization name, Community Head name, mobile number, and password are required.');
      return;
    }
    if (commPassword.trim().length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (!commDocUrl) {
      setErrorMessage('Please upload an organization registration certificate or official document for Ward Officer verification.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerCommunity({
        community_name: commName.trim(),
        organisation_type: commOrgType,
        head_name: commHeadName.trim(),
        phone: commPhone.trim(),
        email: commEmail.trim() || undefined,
        username: commUsername.trim() || undefined,
        password: commPassword.trim(),
        ward_number: commWardNumber,
        locality: commLocality.trim() || undefined,
        address: commAddress.trim() || undefined,
        description: commDescription.trim() || undefined,
        verification_document_url: commDocUrl,
        verification_document_name: commDocName || 'Verification Certificate'
      });
      setCommSubmittedInfo({ name: commName.trim(), ward: commWardNumber });
      setSuccessMessage(res.message || 'Community registration submitted for Ward Officer approval.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Community registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Common inputs
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredLang, setPreferredLang] = useState<Language>(lang);
  const [locality, setLocality] = useState('Dudhiya Talao');
  const [consentTerms, setConsentTerms] = useState(true);

  // OTP State
  const [sessionId, setSessionId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  // SMS Messages State (Citizen receives OTP in Messages section)
  interface SmsMessage {
    id: string;
    sender: string;
    senderName: string;
    body: string;
    otpCode: string;
    timestamp: string;
    isRead: boolean;
  }
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [showSmsToast, setShowSmsToast] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Refresh CAPTCHA challenge
  const generateNewCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 2;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaInput('');
    setCaptchaPassed(false);
  };

  useEffect(() => {
    generateNewCaptcha();
  }, [mode]);

  // Handle OTP countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus next OTP box
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value;
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

  // Quick Demo Login
  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9876543210', 'Navsari@2026', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Community Head Login
  const handleQuickDemoCommunityHeadLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9825100099', 'Navsari@2026', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo Community Head login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Worker (Temporary Team Leader - Kanti Solanki) Login
  const handleQuickDemoWorkerLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9825120001', 'Navsari@2026', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo Worker login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Worker (Suresh Vaghela) Login
  const handleQuickDemoWorker2Login = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9825120002', 'Navsari@2026', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo Worker login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Ward Officer (Ramesh Patel - Chief Sanitary Inspector, Ward 3) Login
  const handleQuickDemoWardOfficerLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9825130003', 'Navsari@2026', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo Ward Officer login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Ward 8 Officer (Cyrus Contractor - Ward 8) Login
  const handleQuickDemoWard8OfficerLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9825130008', 'Navsari@2026', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo Ward 8 Officer login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo NMC Central Executive Admin Login
  const handleQuickDemoAdminLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login('9825199999', 'Admin@123', 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo NMC Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  // 1. Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!phone || phone.trim().length < 3) {
      setErrorMessage('Please enter your mobile number, username, or worker code');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password');
      return;
    }

    // Verify Captcha
    if (!captchaPassed) {
      if (parseInt(captchaInput, 10) === captchaNum1 + captchaNum2) {
        setCaptchaPassed(true);
      } else {
        setErrorMessage('Security calculation is incorrect. Please try again.');
        generateNewCaptcha();
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.login(phone, password, 'captcha-verified-token');
      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials or mobile number not registered.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Signup Step 1: Send OTP
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!phone || phone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!consentTerms) {
      setErrorMessage('You must accept the terms and privacy policy to continue');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signupSendOtp(phone, consentTerms);
      setSessionId(res.data.session_id);
      setCountdown(res.data.expires_in_seconds || 120);
      const receivedOtp = res.data._dev_otp_code || '582914';
      setDevOtpCode(receivedOtp);

      const newSms: SmsMessage = {
        id: `sms-${Date.now()}`,
        sender: 'VM-NMCGOV',
        senderName: 'Govt. of Gujarat · Navsari Municipal Corporation',
        body: `${receivedOtp} is your official verification OTP for Swachh Setu Citizen Registration on Navsari Municipal Corporation portal. Valid for 5 minutes. Do not share this OTP with anyone for security purposes. - NMC SWACHHATA`,
        otpCode: receivedOtp,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isRead: false
      };
      setMessages(prev => [newSms, ...prev]);
      setShowSmsToast(true);

      setSignupStep(2);
      setSuccessMessage(`OTP sent via SMS to +91 ${res.data.mobile_masked || phone}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Signup Step 2: Verify OTP
  const handleVerifySignupOtp = async () => {
    setErrorMessage('');
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signupVerifyOtp(sessionId, fullOtp);
      setVerificationToken(res.data.verification_token);
      setSignupStep(3);
      setSuccessMessage('Mobile number verified successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateUniqueUsername = async (
    val: string,
    setter: React.Dispatch<React.SetStateAction<{ checking?: boolean; available?: boolean; message?: string } | null>>
  ) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setter(null);
      return;
    }
    if (/\s/.test(trimmed)) {
      setter({ available: false, message: 'Username cannot contain spaces.' });
      return;
    }
    setter({ checking: true });
    try {
      const res = await api.checkUsername(trimmed);
      setter({ available: res.available, message: res.available ? 'Username is available' : (res.message || res.error || 'Username already taken') });
    } catch {
      setter(null);
    }
  };

  // 4. Submit Signup Step 3: Complete Profile
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (citizenUsername.trim() && citizenUsernameStatus?.available === false) {
      setErrorMessage(citizenUsernameStatus.message || 'Please choose a unique username');
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
        username: citizenUsername.trim() || undefined,
        password: password,
        confirm_password: confirmPassword,
        preferred_language: preferredLang,
        locality: locality
      });

      localStorage.setItem('clean_navsari_token', res.data.token);
      onSuccess(res.data.profile, true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f6f4] via-[#f8faf9] to-[#e6f4f1] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar with Language Selector */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SwachhSetuLogo size="sm" showText={true} />
        </div>

        <div className="flex items-center gap-2">
          {/* Messages Section Button */}
          <button
            type="button"
            onClick={() => setIsMessagesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] text-xs font-extrabold text-[#095c54] shadow-2xs hover:bg-[#e6f4f1] transition relative"
            title="Open Messages section"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#095c54]" />
            <span>Messages</span>
            {messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                {messages.length}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-[#e2e8f0]">
            <Globe className="w-3.5 h-3.5 text-[#095c54] ml-1.5" />
            <select
              value={lang}
              onChange={e => onLanguageChange(e.target.value as Language)}
              className="text-xs font-bold text-[#095c54] bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="en">English</option>
              <option value="gu">ગુજરાતી</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="max-w-md w-full mx-auto my-6 bg-white rounded-3xl shadow-xl border border-[#e2e8f0] overflow-hidden">
        {/* Header Tabs: Login vs Sign Up */}
        <div className="grid grid-cols-2 border-b border-[#e2e8f0] bg-[#f8faf9]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`py-3.5 text-xs sm:text-sm font-extrabold text-center transition ${
              mode === 'login'
                ? 'bg-white text-[#095c54] border-b-2 border-[#095c54] shadow-sm'
                : 'text-[#64748b] hover:text-[#095c54]'
            }`}
          >
            Citizen Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setSignupStep(1);
              setErrorMessage('');
            }}
            className={`py-3.5 text-xs sm:text-sm font-extrabold text-center transition ${
              mode === 'signup'
                ? 'bg-white text-[#095c54] border-b-2 border-[#095c54] shadow-sm'
                : 'text-[#64748b] hover:text-[#095c54]'
            }`}
          >
            New Registration
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {/* Status Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-xs font-bold text-[#dc2626] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-bold text-[#047857] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#10b981]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW A: CITIZEN LOGIN                                    */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-5">
                <h2 className="text-xl font-extrabold text-[#095c54]">
                  Welcome to Swachh Setu
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Sign in with Mobile Number, Username, or Worker Code
                </p>
              </div>

              {/* Mobile Number / Username / Worker Code */}
              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1.5 flex items-center justify-between">
                  <span>Username / Mobile Number</span>
                  <span className="text-[10px] text-[#64748b] font-normal">Phone, Worker Code, or Email</span>
                </label>
                <div className="flex items-center rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] focus-within:ring-2 focus-within:ring-[#095c54]/10 bg-white overflow-hidden transition">
                  <span className="px-3 py-2.5 text-xs font-extrabold text-[#095c54] bg-[#f8faf9] border-r border-[#e2e8f0]">
                    {/^\d+$/.test(phone.trim()) && phone.trim().length <= 10 ? '🇮🇳 +91' : '👤 ID'}
                  </span>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="e.g. 9825120005, WRK-2026-003, or username"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm font-semibold text-[#0f2925] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0f2925]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep(1);
                      setErrorMessage('');
                    }}
                    className="text-[11px] font-extrabold text-[#095c54] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] focus-within:ring-2 focus-within:ring-[#095c54]/10 bg-white overflow-hidden transition">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 text-sm font-semibold text-[#0f2925] outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#095c54]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Visual CAPTCHA Security Verification */}
              <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#0f2925] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#095c54]" />
                    Security Check
                  </span>
                  <button
                    type="button"
                    onClick={generateNewCaptcha}
                    className="text-[11px] text-[#095c54] hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#b8e0d7] font-black text-sm text-[#095c54] tracking-widest select-none shadow-sm">
                    {captchaNum1} + {captchaNum2} = ?
                  </div>
                  <input
                    type="number"
                    placeholder="Answer"
                    value={captchaInput}
                    onChange={e => {
                      setCaptchaInput(e.target.value);
                      if (parseInt(e.target.value, 10) === captchaNum1 + captchaNum2) {
                        setCaptchaPassed(true);
                        setErrorMessage('');
                      } else {
                        setCaptchaPassed(false);
                      }
                    }}
                    className={`w-28 px-3 py-1.5 rounded-xl border text-sm font-bold text-center outline-none ${
                      captchaPassed
                        ? 'border-[#10b981] bg-[#ecfdf5] text-[#047857]'
                        : 'border-[#e2e8f0] focus:border-[#095c54]'
                    }`}
                  />
                  {captchaPassed && (
                    <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />
                  )}
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Logins: Clean, Modern, Citizen Style */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-[#e6f4f1] border border-[#b8e0d7] text-xs font-black text-[#095c54] transition flex items-center justify-between shadow-xs group touch-press"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#095c54]" />
                    <span>Citizen Demo (Umesh Pal)</span>
                  </div>
                  <span className="text-[10px] bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] px-2 py-0.5 rounded-full font-bold">
                    9876543210
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoCommunityHeadLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-[#e6f4f1] border border-[#b8e0d7] text-xs font-black text-[#095c54] transition flex items-center justify-between shadow-xs group touch-press"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#095c54]" />
                    <span>Community Head Demo (Rajesh Varma)</span>
                  </div>
                  <span className="text-[10px] bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] px-2 py-0.5 rounded-full font-bold">
                    9825100099
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoWorkerLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-[#e6f4f1] border border-[#b8e0d7] text-xs font-black text-[#095c54] transition flex items-center justify-between shadow-xs group touch-press"
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#095c54]" />
                    <span>Field Worker / Team Leader (Kanti Solanki)</span>
                  </div>
                  <span className="text-[10px] bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] px-2 py-0.5 rounded-full font-bold">
                    9825120001
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoWorker2Login}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-[#e6f4f1] border border-[#b8e0d7] text-xs font-black text-[#095c54] transition flex items-center justify-between shadow-xs group touch-press"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#095c54]" />
                    <span>Sanitation Worker Demo (Suresh Vaghela)</span>
                  </div>
                  <span className="text-[10px] bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] px-2 py-0.5 rounded-full font-bold">
                    9825120002
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoWardOfficerLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#6ee7b7] text-xs font-black text-[#065f46] transition flex items-center justify-between shadow-xs group touch-press"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#065f46]" />
                    <span>Ward 3 Officer Demo (Ramesh Patel · Ward 3)</span>
                  </div>
                  <span className="text-[10px] bg-white border border-[#a7f3d0] text-[#065f46] px-2 py-0.5 rounded-full font-bold">
                    9825130003
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoWard8OfficerLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-[#f0fdf4] hover:bg-[#dcfce7] border border-[#86efac] text-xs font-black text-[#166534] transition flex items-center justify-between shadow-xs group"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#166534]" />
                    <span>Ward 8 Officer Demo (Cyrus Contractor · Ward 8)</span>
                  </div>
                  <span className="text-[10px] bg-white border border-[#86efac] text-[#166534] px-2 py-0.5 rounded-full font-bold">
                    9825130008
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoAdminLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#095c54] to-[#043e39] text-white hover:opacity-95 text-xs font-black transition flex items-center justify-between shadow-xs group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>NMC Admin Demo (Navsari Municipal Executive)</span>
                  </div>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                    9825199999
                  </span>
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-[#64748b]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setSignupStep(1);
                      setErrorMessage('');
                    }}
                    className="font-extrabold text-[#095c54] hover:underline"
                  >
                    Sign Up Free
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* VIEW B: CITIZEN & COMMUNITY SIGN UP                      */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <div className="space-y-4">
              {/* Account Type Toggle: Citizen vs Community / Organization */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setSignupType('citizen');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    signupType === 'citizen'
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Citizen Sign Up</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupType('community');
                    setCommSubmittedInfo(null);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    signupType === 'community'
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Community Sign Up</span>
                </button>
              </div>

              {/* COMMUNITY SELF-REGISTRATION FORM */}
              {signupType === 'community' && (
                commSubmittedInfo ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#095c54] text-white flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                    </div>
                    <h3 className="text-base font-black text-[#0f2925]">
                      Sent for Ward {commSubmittedInfo.ward} Officer Approval
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong>{commSubmittedInfo.name}</strong> has been submitted along with your verification certificate. Once the Ward {commSubmittedInfo.ward} Officer approves your organization, you can sign in to your Community Head Dashboard.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setCommSubmittedInfo(null);
                        setErrorMessage('');
                      }}
                      className="w-full btn-primary-custom py-2.5 text-xs font-extrabold rounded-xl"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterCommunity} className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                    <div className="text-center">
                      <h2 className="text-lg font-extrabold text-[#095c54]">
                        Community / Organization Registration
                      </h2>
                      <p className="text-[11px] text-[#64748b] mt-0.5">
                        Register your NGO, RWA, or civic group. Ward Officer approval is required before login.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Organization Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Green Navsari Welfare Trust"
                          value={commName}
                          onChange={e => setCommName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Organization Type *</label>
                        <select
                          value={commOrgType}
                          onChange={e => setCommOrgType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold bg-white outline-none focus:border-[#095c54]"
                        >
                          <option value="Resident Welfare Association">Resident Welfare Association</option>
                          <option value="NGO / Charitable Trust">NGO / Charitable Trust</option>
                          <option value="Youth Club / College NSS">Youth Club / College NSS</option>
                          <option value="Market / Traders Association">Market / Traders Association</option>
                          <option value="Religious / Cultural Trust">Religious / Cultural Trust</option>
                          <option value="Corporate CSR Group">Corporate CSR Group</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Community Head Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Full name of head/coordinator"
                          value={commHeadName}
                          onChange={e => setCommHeadName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit mobile"
                          value={commPhone}
                          onChange={e => setCommPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Official Email</label>
                        <input
                          type="email"
                          placeholder="contact@organization.org"
                          value={commEmail}
                          onChange={e => setCommEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Select Municipal Ward *</label>
                        <select
                          value={commWardNumber}
                          onChange={e => setCommWardNumber(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-bold bg-white outline-none focus:border-[#095c54]"
                        >
                          {[
                            { n: 1, name: 'Ward 1 - Lunsikui / Tower Road' },
                            { n: 2, name: 'Ward 2 - Station Road / Fuwara' },
                            { n: 3, name: 'Ward 3 - Dudhiya Talao / Ashapuri' },
                            { n: 4, name: 'Ward 4 - Kaliawadi / Sayaji Road' },
                            { n: 5, name: 'Ward 5 - Jalalpore Road / Shanta Devi' },
                            { n: 6, name: 'Ward 6 - Vijalpore North / Eru' },
                            { n: 7, name: 'Ward 7 - Vijalpore South / GIDC' },
                            { n: 8, name: 'Ward 8 - Madhumati / Parsi Wad' },
                            { n: 9, name: 'Ward 9 - Sandhkuva / Junathana' },
                            { n: 10, name: 'Ward 10 - Chhapra Road / Vejalpore' },
                            { n: 11, name: 'Ward 11 - Vansda Road / Italva' },
                            { n: 12, name: 'Ward 12 - Mahuva Highway / Chikhli' },
                            { n: 13, name: 'Ward 13 - Dandi Coastal Corridor' }
                          ].map(w => (
                            <option key={w.n} value={w.n}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Login Username (unique)</label>
                        <input
                          type="text"
                          placeholder="e.g. green_navsari"
                          value={commUsername}
                          onChange={e => {
                            setCommUsername(e.target.value);
                            setCommUsernameStatus(null);
                          }}
                          onBlur={e => validateUniqueUsername(e.target.value, setCommUsernameStatus)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                            commUsernameStatus?.available === false
                              ? 'border-rose-400 focus:border-rose-500'
                              : commUsernameStatus?.available === true
                              ? 'border-emerald-400 focus:border-emerald-600'
                              : 'border-[#e2e8f0] focus:border-[#095c54]'
                          }`}
                        />
                        {commUsernameStatus && !commUsernameStatus.checking && (
                          <p
                            className={`text-[10px] font-bold mt-1 ${
                              commUsernameStatus.available ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {commUsernameStatus.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Create Password *</label>
                        <input
                          type="password"
                          required
                          placeholder="Min 6 characters"
                          value={commPassword}
                          onChange={e => setCommPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Locality / Area</label>
                        <input
                          type="text"
                          placeholder="e.g. Dudhiya Talao"
                          value={commLocality}
                          onChange={e => setCommLocality(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#0f2925] mb-1">Office Address</label>
                        <input
                          type="text"
                          placeholder="Full street address"
                          value={commAddress}
                          onChange={e => setCommAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold outline-none focus:border-[#095c54]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#0f2925] mb-1">About Your Organization</label>
                      <textarea
                        rows={2}
                        placeholder="Brief description of your organization's community activities..."
                        value={commDescription}
                        onChange={e => setCommDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium outline-none focus:border-[#095c54] resize-none"
                      />
                    </div>

                    {/* Verification Certificate / Registration Document Upload */}
                    <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-dashed border-[#095c54]/40 space-y-2">
                      <label className="block text-[11px] font-extrabold text-[#095c54]">
                        Upload Organization Registration Certificate / Proof Document *
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Upload NGO trust certificate, RWA registration letter, or institutional ID (Image / PDF) for Ward Officer verification.
                      </p>
                      <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-[#095c54] text-xs font-bold text-[#095c54] cursor-pointer transition">
                        {commDocUrl ? <FileCheck2 className="w-4 h-4 text-emerald-600" /> : <Upload className="w-4 h-4" />}
                        <span className="truncate">{commDocName ? `Uploaded: ${commDocName}` : 'Choose Certificate / Document File'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleCommDocUpload}
                        />
                      </label>
                      {commDocUrl && commDocUrl.startsWith('data:image') && (
                        <img src={commDocUrl} alt="Certificate preview" className="h-24 w-full object-cover rounded-xl border border-slate-200" />
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full btn-primary-custom py-3 text-xs sm:text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Submit Community Registration for Approval'}
                    </button>

                    <div className="text-center pt-1">
                      <p className="text-xs text-[#64748b]">
                        Already registered?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setMode('login');
                            setErrorMessage('');
                          }}
                          className="font-extrabold text-[#095c54] hover:underline"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </form>
                )
              )}

              {/* CITIZEN SIGN UP FLOW */}
              {signupType === 'citizen' && (
              <div>
              {/* Step 1: Mobile & Consent */}
              {signupStep === 1 && (
                <form onSubmit={handleSendSignupOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Citizen Registration
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Enter your mobile number to receive a verification OTP
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex items-center rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] bg-white overflow-hidden transition">
                      <span className="px-3 py-2.5 text-xs font-extrabold text-[#095c54] bg-[#f8faf9] border-r border-[#e2e8f0]">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="98765 43210"
                        value={phone}
                        onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 10 && val.startsWith('91')) val = val.slice(2);
                      if (val.length > 10 && val.startsWith('0')) val = val.slice(1);
                      setPhone(val.slice(0, 10));
                    }}
                        className="flex-1 px-3 py-2.5 text-sm font-semibold text-[#0f2925] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-[#64748b] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={e => setConsentTerms(e.target.checked)}
                      className="mt-0.5 rounded text-[#095c54] focus:ring-0"
                    />
                    <span>
                      I agree to the Navsari Municipal Corporation terms of civic service and privacy guidelines.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send 6-Digit OTP'}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-[#64748b]">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setErrorMessage('');
                        }}
                        className="font-extrabold text-[#095c54] hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {signupStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Verify OTP
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Enter the 6-digit code sent to +91 {phone.slice(0, 2)}******{phone.slice(-2)}
                    </p>
                  </div>

                  {/* Messages Section Notification Banner */}
                  <div className="p-3 rounded-2xl bg-[#e6f4f1] border border-[#99f6e4] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <MessageSquare className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="font-black text-[#0f2925] truncate">OTP Sent to Messages</p>
                        <p className="text-[11px] text-[#0d9488] font-bold truncate">Check your Messages section</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMessagesOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition shrink-0 shadow-xs flex items-center gap-1 active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Messages</span>
                      {messages.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* 6-Digit OTP Inputs */}
                  <div className="flex justify-center gap-2 sm:gap-2.5 my-3">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => {
                          otpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        className="w-10 sm:w-11 h-12 text-center text-lg font-black rounded-xl border border-[#e2e8f0] focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/10 outline-none transition bg-white"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
                    <span>
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Did not receive code?'}
                    </span>
                    <button
                      type="button"
                      disabled={countdown > 0 || loading}
                      onClick={handleSendSignupOtp}
                      className="font-extrabold text-[#095c54] disabled:opacity-50 hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifySignupOtp}
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="text-xs text-[#64748b] hover:text-[#095c54]"
                    >
                      Change Mobile Number
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Complete Profile */}
              {signupStep === 3 && (
                <form onSubmit={handleCompleteProfile} className="space-y-3.5">
                  <div className="text-center mb-3">
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Complete Your Profile
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Set up your name and login password
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-[#e2e8f0] text-sm font-semibold outline-none focus:border-[#095c54]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Unique Username <span className="text-[10px] font-normal text-slate-400">(optional, must be unique)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ramesh_patel"
                      value={citizenUsername}
                      onChange={e => {
                        setCitizenUsername(e.target.value);
                        setCitizenUsernameStatus(null);
                      }}
                      onBlur={e => validateUniqueUsername(e.target.value, setCitizenUsernameStatus)}
                      className={`w-full px-3 py-2.5 rounded-2xl border text-sm font-semibold outline-none ${
                        citizenUsernameStatus?.available === false
                          ? 'border-rose-400 focus:border-rose-500'
                          : citizenUsernameStatus?.available === true
                          ? 'border-emerald-400 focus:border-emerald-600'
                          : 'border-[#e2e8f0] focus:border-[#095c54]'
                      }`}
                    />
                    {citizenUsernameStatus && !citizenUsernameStatus.checking && (
                      <p
                        className={`text-[11px] font-bold mt-1 ${
                          citizenUsernameStatus.available ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {citizenUsernameStatus.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Create Password (Min 8 characters)
                    </label>
                    <input
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-[#e2e8f0] text-sm font-semibold outline-none focus:border-[#095c54]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-[#e2e8f0] text-sm font-semibold outline-none focus:border-[#095c54]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1">
                      Preferred Language
                    </label>
                    <select
                      value={preferredLang}
                      onChange={e => setPreferredLang(e.target.value as Language)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-[#e2e8f0] text-sm font-semibold outline-none focus:border-[#095c54] bg-white"
                    >
                      <option value="en">English</option>
                      <option value="gu">ગુજરાતી (Gujarati)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition mt-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Create Account & Start'}
                  </button>
                </form>
              )}
              </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW C: FORGOT PASSWORD                                  */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-extrabold text-[#095c54]">
                  Reset Password
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  We'll verify your registered mobile number via OTP
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="flex items-center rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] bg-white overflow-hidden transition">
                  <span className="px-3 py-2.5 text-xs font-extrabold text-[#095c54] bg-[#f8faf9] border-r border-[#e2e8f0]">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={16}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('91') && val.length > 10) val = val.slice(2);
                      else if (val.startsWith('0') && val.length > 10) val = val.slice(1);
                      setPhone(val.slice(0, 10));
                    }}
                    className="flex-1 px-3 py-2.5 text-sm font-semibold text-[#0f2925] outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await api.forgotPasswordSendOtp(phone);
                    setSuccessMessage('Password reset OTP sent to your registered number');
                    setMode('login');
                  } catch (err: any) {
                    setErrorMessage(err.message || 'Mobile number not found');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || phone.length < 10}
                className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
              >
                Send Reset Code
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="text-xs font-bold text-[#095c54] hover:underline"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-xs text-[#64748b]">
        Smart India Hackathon PS000089 · Navsari Municipal Corporation, Gujarat
      </div>

      {/* ── REALISTIC SMS NOTIFICATION BANNER (Top Slide-in) ── */}
      {showSmsToast && messages.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-3 animate-in slide-in-from-top-4 duration-300">
          <div
            onClick={() => {
              setIsMessagesOpen(true);
              setShowSmsToast(false);
            }}
            className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-300 shadow-2xl flex items-start gap-3 cursor-pointer hover:border-[#095c54] transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#0f2925] flex items-center gap-1.5">
                  <span>VM-NMCGOV</span>
                  <span className="text-[10px] font-extrabold text-[#0d9488] bg-[#e6f4f1] px-1.5 py-0.2 rounded">SMS</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Just now</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-1 line-clamp-2">
                {messages[0].body}
              </p>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-black text-[#095c54] group-hover:underline flex items-center gap-1">
                  Tap to view in Messages section →
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowSmsToast(false);
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES SECTION MODAL (SMS Inbox Simulator) ── */}
      {isMessagesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Phone SMS App Header */}
            <div className="p-4 bg-gradient-to-r from-[#095c54] to-[#0c7066] text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    <span>Messages</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-400/30 text-emerald-100 uppercase tracking-wider">
                      SMS Inbox
                    </span>
                  </h3>
                  <p className="text-[10px] text-emerald-100 font-medium mt-0.5">
                    SIM 1 · +91 {phone || '98765 43210'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMessagesOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-[#f8faf9]">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-sm text-[#0f2925]">No Messages Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    When you click "Send 6-Digit OTP" on the registration page, your official SMS verification will arrive in this Messages section.
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[#0f2925] tracking-wide">{msg.sender}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ Verified Govt Sender
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-mono">
                      {msg.body}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500">OTP Code:</span>
                        <span className="font-mono text-sm font-black text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2 py-0.5 rounded-md tracking-wider">
                          {msg.otpCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.otpCode);
                            setCopiedId(msg.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const arr = msg.otpCode.split('');
                            setOtpDigits(arr);
                            setIsMessagesOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                        >
                          <span>Auto-Fill</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Navsari Municipal SMS Gateway</span>
              <button
                type="button"
                onClick={() => setIsMessagesOpen(false)}
                className="font-black text-[#095c54] hover:underline"
              >
                Back to Registration →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
