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
  FileCheck,
  FileText,
  CheckCircle,
  ExternalLink,
  File,
  Clock
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
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);

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

  // Registration Role Selection
  const [registrationRole, setRegistrationRole] = useState<'citizen' | 'community_head'>('citizen');

  // Community Head Registration fields
  const [communityName, setCommunityName] = useState('');
  const [organisationType, setOrganisationType] = useState('Resident Welfare Association');
  const [communityWard, setCommunityWard] = useState<number>(3);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState('application/pdf');
  const [communitySubmitted, setCommunitySubmitted] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);

  // SMS Messages State (Citizen receives OTP in Messages section)
  interface SmsMessage {
    id: string;
    phone?: string;
    sender: string;
    senderName: string;
    body: string;
    otpCode?: string;
    password?: string;
    type?: string;
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

  // Poll / fetch SMS messages
  const fetchSmsMessages = async () => {
    try {
      const res = await api.getSimulatedSmsMessages(phone);
      if (res.data && res.data.length > 0) {
        setMessages(res.data);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchSmsMessages();
    const interval = setInterval(fetchSmsMessages, 4000);
    return () => clearInterval(interval);
  }, [phone, isMessagesOpen]);

  // Handle Document Upload for Community Head Verification
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentFile(file);
    setDocumentName(file.name);
    setDocumentType(file.type || 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => {
      setDocumentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleDocument = () => {
    setDocumentName('Gujarat_Societies_Reg_Cert_2026.pdf');
    setDocumentType('application/pdf');
    setDocumentUrl('https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=800&q=80');
    if (!communityName) {
      setCommunityName('Ashapuri Heights Resident Welfare Association');
    }
    setSuccessMessage('Sample verification document loaded for demonstration!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Submit Community Head Registration for Ward Officer Approval
  const handleSubmitCommunityRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name as Community Head');
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!communityName.trim()) {
      setErrorMessage('Please enter your community / society / organisation name');
      return;
    }
    if (!documentName && !documentUrl) {
      setErrorMessage('Please upload a valid document (Registration Certificate / Society Trust Deed / Letterhead) to verify your community');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitCommunityRegistrationRequest({
        full_name: fullName.trim(),
        phone: phone.trim(),
        community_name: communityName.trim(),
        organisation_type: organisationType,
        ward_number: communityWard,
        locality: locality,
        document_name: documentName,
        document_url: documentUrl,
        document_type: documentType,
        notes: `Submitted by ${fullName} for Ward ${communityWard}`
      });

      setSubmittedRequest(res.data);
      setCommunitySubmitted(true);
      setSuccessMessage('Your registration request has been sent to higher authorities for approval.');

      const confirmationSms: SmsMessage = {
        id: `sms-${Date.now()}`,
        phone: phone,
        sender: 'VM-NMCGOV',
        senderName: 'Govt. of Gujarat · Navsari Municipal Corporation',
        body: `Navsari Municipal Corporation: Your Community Head registration request for "${communityName.trim()}" has been submitted to Ward Officer (Ward ${communityWard}) for document verification. Reference: ${res.data.request_code}. You will receive your login password via SMS upon approval.`,
        otpCode: '',
        type: 'submission',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isRead: false
      };
      setMessages(prev => [confirmationSms, ...prev]);
      setShowSmsToast(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit community registration request');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Signup Step 1: Send OTP
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
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
        phone: phone,
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

  // 4. Submit Signup Step 3: Complete Profile
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
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

  // --- FORGOT / RESET PASSWORD HANDLERS ---
  const handleForgotSendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (phone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPasswordSendOtp(phone);
      if (res.success && res.data) {
        setSessionId(res.data.session_id);
        if (res.data._dev_otp_code) {
          setDevOtpCode(res.data._dev_otp_code);
        }
        setOtpDigits(['', '', '', '', '', '']);
        setCountdown(60);
        setForgotStep(2);
        setSuccessMessage(`Security OTP dispatched via SMS to +91 ${phone}.`);
        await fetchSmsMessages();
      } else {
        setErrorMessage(res.message || 'Mobile number verification failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Mobile number not found in database');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async () => {
    setErrorMessage('');
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPasswordVerifyOtp(sessionId, fullOtp);
      if (res.success && res.data) {
        setVerificationToken(res.data.reset_token);
        setPassword('');
        setConfirmPassword('');
        setForgotStep(3);
        setSuccessMessage('OTP verified! Please create and confirm your new password.');
      } else {
        setErrorMessage(res.message || 'Invalid OTP code');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter the newly set password to confirm.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPasswordReset(verificationToken, password, confirmPassword);
      if (res.success) {
        setSuccessMessage('Password reset successfully! You can now log in with your new password.');
        setMode('login');
        setForgotStep(1);
        setConfirmPassword('');
        await fetchSmsMessages();
      } else {
        setErrorMessage(res.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please try again.');
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
          {/* VIEW B: SIGN UP (CITIZEN OR COMMUNITY HEAD)               */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <div>
              {/* SUBMISSION CONFIRMATION FOR COMMUNITY HEAD */}
              {communitySubmitted ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#095c54] flex items-center justify-center mx-auto mb-2 border border-emerald-200 shadow-sm">
                      <ShieldCheck className="w-8 h-8 text-[#095c54]" />
                    </div>
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Registration Request Sent
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5 font-medium">
                      Navsari Municipal Corporation · Ward Approval Queue
                    </p>
                  </div>

                  {/* Prominent Success Highlight requested by user */}
                  <div className="p-4 rounded-2xl bg-[#ecfdf5] border-2 border-[#10b981] shadow-xs">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#047857] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-[#047857]">
                          Your registration request has been sent to higher authorities for approval.
                        </h4>
                        <p className="text-xs text-[#065f46] mt-1 leading-relaxed">
                          Your community verification documents are currently under official review by the <strong>Ward {communityWard} Officer</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Request Receipt Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-bold">Reference Number:</span>
                      <span className="font-mono font-black text-[#095c54] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {submittedRequest?.request_code || 'REQ-COMM-2026-PENDING'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Applicant Head:</span>
                      <span className="font-black text-slate-800">{fullName}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Mobile Device:</span>
                      <span className="font-bold text-slate-800">+91 {phone}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Community / Society:</span>
                      <span className="font-extrabold text-[#095c54]">{communityName}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Target Ward:</span>
                      <span className="font-bold text-slate-800">Ward {communityWard} (Navsari)</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-bold">Verification Document:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{documentName}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Review Status:</span>
                      <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                        Pending Ward Officer Approval
                      </span>
                    </div>
                  </div>

                  {/* Informative Guidance */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                    💡 <strong>What happens next?</strong> After the Ward Officer verifies your uploaded document and approves your community, an official SMS containing your <strong>assigned login password</strong> will be sent to your device (+91 {phone}). You can view this message anytime in the <strong>Messages</strong> inbox above.
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsMessagesOpen(true)}
                      className="w-full py-2.5 px-3 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-300" />
                      <span>Check SMS Messages Inbox ({messages.length})</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setErrorMessage('');
                        }}
                        className="py-2.5 px-3 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition text-center"
                      >
                        Go to Login
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCommunitySubmitted(false);
                          setSubmittedRequest(null);
                          setDocumentName('');
                          setDocumentUrl('');
                          setCommunityName('');
                        }}
                        className="py-2.5 px-3 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition text-center"
                      >
                        New Registration
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 1: Initial Registration Form */
                signupStep === 1 && (
                  <form
                    onSubmit={registrationRole === 'citizen' ? handleSendSignupOtp : handleSubmitCommunityRegistration}
                    className="space-y-3.5"
                  >
                    <div className="text-center mb-3">
                      <h2 className="text-xl font-extrabold text-[#095c54]">
                        Create an Account
                      </h2>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        Register as an individual Citizen or as an authorized Community Head
                      </p>
                    </div>

                    {/* Field 1: Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#0f2925] mb-1">
                        Full Name *
                      </label>
                      <div className="flex items-center rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] bg-white overflow-hidden transition">
                        <span className="px-3 py-2 text-xs font-bold text-slate-400 bg-[#f8faf9] border-r border-[#e2e8f0]">
                          <User className="w-4 h-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Patel / Jitendra Shah"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm font-semibold text-[#0f2925] outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Field 2: Mobile Number */}
                    <div>
                      <label className="block text-xs font-bold text-[#0f2925] mb-1">
                        Mobile Number *
                      </label>
                      <div className="flex items-center rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] bg-white overflow-hidden transition">
                        <span className="px-3 py-2 text-xs font-extrabold text-[#095c54] bg-[#f8faf9] border-r border-[#e2e8f0]">
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
                          className="flex-1 px-3 py-2 text-sm font-semibold text-[#0f2925] outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Field 3: Register As Options (Citizen vs Community Head) */}
                    <div>
                      <label className="block text-xs font-bold text-[#0f2925] mb-1.5 flex items-center justify-between">
                        <span>Register As: *</span>
                        <span className="text-[10px] text-[#095c54] font-extrabold">Choose Your Role</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Option A: Citizen */}
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationRole('citizen');
                            setErrorMessage('');
                          }}
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                            registrationRole === 'citizen'
                              ? 'border-[#095c54] bg-[#e6f4f1]/50 ring-2 ring-[#095c54]/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="p-1.5 rounded-xl bg-emerald-100 text-[#095c54]">
                              <User className="w-4 h-4" />
                            </span>
                            {registrationRole === 'citizen' && (
                              <CheckCircle2 className="w-4 h-4 text-[#095c54]" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">Citizen</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              Instant OTP registration for individuals
                            </div>
                          </div>
                        </button>

                        {/* Option B: Community Head */}
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationRole('community_head');
                            setErrorMessage('');
                          }}
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                            registrationRole === 'community_head'
                              ? 'border-[#095c54] bg-[#e6f4f1]/50 ring-2 ring-[#095c54]/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="p-1.5 rounded-xl bg-teal-100 text-[#095c54]">
                              <Building className="w-4 h-4" />
                            </span>
                            {registrationRole === 'community_head' && (
                              <CheckCircle2 className="w-4 h-4 text-[#095c54]" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">Community Head</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              Society / RWA / NGO (Requires verification)
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* ======================================================== */}
                    {/* CONDITIONAL EXTRA FIELDS FOR COMMUNITY HEAD              */}
                    {/* ======================================================== */}
                    {registrationRole === 'community_head' && (
                      <div className="space-y-3 p-3.5 bg-gradient-to-br from-[#f8faf9] to-[#f0f6f4] rounded-2xl border border-[#b8e0d7] animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#095c54] border-b border-[#b8e0d7] pb-2">
                          <ShieldCheck className="w-4 h-4 text-[#095c54]" />
                          <span>Community Verification Details</span>
                        </div>

                        {/* Community / Society / NGO Name */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Community / Society / NGO Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Navsari Green Warriors RWA / Ashapuri Society"
                            value={communityName}
                            onChange={e => setCommunityName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#095c54] bg-white"
                            required
                          />
                        </div>

                        {/* Organisation Type & Target Ward */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                              Entity Type
                            </label>
                            <select
                              value={organisationType}
                              onChange={e => setOrganisationType(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#095c54] bg-white"
                            >
                              <option value="Resident Welfare Association">RWA</option>
                              <option value="Environmental NGO">Environmental NGO</option>
                              <option value="Youth Club / Mandal">Youth Mandal</option>
                              <option value="Housing Society">Housing Society</option>
                              <option value="Market Traders Association">Traders Association</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 mb-1">
                              Ward Jurisdiction *
                            </label>
                            <select
                              value={communityWard}
                              onChange={e => setCommunityWard(Number(e.target.value))}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#095c54] bg-white"
                            >
                              <option value={3}>Ward 3 - Dudhiya Talao</option>
                              <option value={8}>Ward 8 - Madhumati</option>
                              <option value={1}>Ward 1 - Tower Road</option>
                              <option value={2}>Ward 2 - Junathana</option>
                              <option value={4}>Ward 4 - Station Road</option>
                              <option value={5}>Ward 5 - Kabilpore</option>
                              <option value={6}>Ward 6 - Vejalpore</option>
                              <option value={7}>Ward 7 - Chhapra Road</option>
                            </select>
                          </div>
                        </div>

                        {/* Verification Document Upload Field (KEY USER REQUIREMENT) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-800">
                              Upload Verification Document *
                            </label>
                            <button
                              type="button"
                              onClick={handleUseSampleDocument}
                              className="text-[10px] font-extrabold text-[#095c54] hover:underline flex items-center gap-0.5"
                            >
                              <Sparkles className="w-3 h-3 text-[#095c54]" />
                              <span>Load Sample Certificate</span>
                            </button>
                          </div>

                          {/* Upload Box */}
                          {!documentName ? (
                            <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-[#095c54]/30 hover:border-[#095c54] rounded-2xl cursor-pointer bg-white transition group">
                              <Upload className="w-6 h-6 text-[#095c54] group-hover:scale-110 transition" />
                              <span className="text-xs font-bold text-slate-700 mt-1">
                                Click or drag to upload certificate
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Society Reg Certificate, Trust Deed, or Official Letterhead (PDF/PNG/JPG)
                              </span>
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/jpg"
                                onChange={handleDocumentUpload}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#095c54] flex items-center justify-center shrink-0">
                                  <FileCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-800 truncate">
                                    {documentName}
                                  </p>
                                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Ready for Ward Officer Review
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {documentUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setShowDocPreview(!showDocPreview)}
                                    className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700"
                                  >
                                    {showDocPreview ? 'Hide' : 'Preview'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDocumentFile(null);
                                    setDocumentName('');
                                    setDocumentUrl('');
                                  }}
                                  className="px-2 py-1 rounded-lg border border-red-200 hover:bg-red-50 text-[10px] font-bold text-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Inline Document Preview */}
                          {showDocPreview && documentUrl && (
                            <div className="mt-2 p-2 bg-slate-900 rounded-xl border border-slate-700">
                              <div className="flex items-center justify-between text-white text-[10px] px-1 pb-1">
                                <span>Document Preview: {documentName}</span>
                                <button
                                  type="button"
                                  onClick={() => setShowDocPreview(false)}
                                  className="text-slate-400 hover:text-white"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="rounded-lg overflow-hidden max-h-40 flex items-center justify-center bg-black/40">
                                <img
                                  src={documentUrl}
                                  alt="Certificate Preview"
                                  className="max-h-40 w-auto object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notice for Community Head routing to Ward Officer */}
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-[11px] text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-extrabold">Ward Officer Verification:</span> Registration requests are routed to the <strong>Ward {communityWard} Officer</strong> for verification. Once approved, your login password will be dispatched to your phone.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Terms Agreement Checkbox */}
                    <label className="flex items-start gap-2.5 text-xs text-[#64748b] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={consentTerms}
                        onChange={e => setConsentTerms(e.target.checked)}
                        className="mt-0.5 rounded text-[#095c54] focus:ring-0"
                      />
                      <span>
                        I agree to Navsari Municipal Corporation terms of civic service & verification policies.
                      </span>
                    </label>

                    {/* Submit Button (Dynamic based on selected role) */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : registrationRole === 'citizen' ? (
                        'Continue & Send 6-Digit OTP'
                      ) : (
                        'Register as Community Head (Send for Approval)'
                      )}
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
                )
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

          {/* ======================================================== */}
          {/* VIEW C: FORGOT & RESET PASSWORD (3-STEP VERIFICATION)   */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {/* Step 1: Enter Registered Mobile Number */}
              {forgotStep === 1 && (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleForgotSendOtp();
                  }}
                  className="space-y-4"
                >
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Reset Password
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Enter your registered Indian mobile number to verify your account
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
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length < 10}
                    className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify Number & Send OTP'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-xs font-bold text-[#095c54] hover:underline"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Enter & Verify 6-digit OTP */}
              {forgotStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Enter Verification OTP
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Enter the 6-digit security code sent via SMS to +91 {phone.slice(0, 2)}******{phone.slice(-2)}
                    </p>
                  </div>

                  {/* Dev Auto-Fill Banner */}
                  {devOtpCode && (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Dev OTP: <strong>{devOtpCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = devOtpCode.split('').slice(0, 6);
                          setOtpDigits(digits);
                        }}
                        className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 transition"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  {/* Messages Section Notification Banner */}
                  <div className="p-3 rounded-2xl bg-[#e6f4f1] border border-[#99f6e4] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <MessageSquare className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="font-black text-[#0f2925] truncate">OTP Sent to Messages</p>
                        <p className="text-[11px] text-[#0d9488] font-bold truncate">Check simulated SMS inbox</p>
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
                      onClick={handleForgotSendOtp}
                      className="font-extrabold text-[#095c54] disabled:opacity-50 hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotVerifyOtp}
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify OTP & Continue'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setErrorMessage('');
                      }}
                      className="text-xs text-[#64748b] hover:text-[#095c54]"
                    >
                      ← Change Mobile Number
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Set New Password & Confirm Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleForgotResetPassword} className="space-y-4">
                  <div className="text-center mb-3">
                    <h2 className="text-xl font-extrabold text-[#095c54]">
                      Set New Password
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Create and confirm your newly set account password
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                      New Password (Min. 8 characters) *
                    </label>
                    <div className="relative rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] focus-within:ring-2 focus-within:ring-[#095c54]/10 bg-white overflow-hidden transition">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter at least 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-semibold text-[#0f2925] outline-none pr-10"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative rounded-2xl border border-[#e2e8f0] focus-within:border-[#095c54] focus-within:ring-2 focus-within:ring-[#095c54]/10 bg-white overflow-hidden transition">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-semibold text-[#0f2925] outline-none pr-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Password requirements indicators */}
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${password && confirmPassword && password === confirmPassword ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" />
                      <span>Passwords match</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || password.length < 8 || password !== confirmPassword}
                    className="w-full btn-primary-custom py-3 text-sm font-extrabold rounded-2xl shadow-lg disabled:opacity-60 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save New Password & Continue to Login'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage('');
                      }}
                      className="text-xs font-bold text-[#64748b] hover:text-[#095c54]"
                    >
                      Cancel & Back to Login
                    </button>
                  </div>
                </form>
              )}
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

                    {msg.password ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-900">Login Password:</span>
                          <span className="font-mono text-xs font-black text-[#095c54] bg-white border border-[#a7f3d0] px-2 py-0.5 rounded-md tracking-wider">
                            {msg.password}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.password!);
                              setCopiedId(msg.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1"
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
                              setMode('login');
                              if (msg.phone) {
                                setPhone(msg.phone.replace(/\D/g, '').slice(-10));
                              }
                              setPassword(msg.password!);
                              setIsMessagesOpen(false);
                              setSuccessMessage('Credentials auto-filled! Please solve security math challenge to sign in.');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                          >
                            <span>Sign In With Credentials →</span>
                          </button>
                        </div>
                      </div>
                    ) : msg.otpCode ? (
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
                              navigator.clipboard.writeText(msg.otpCode || '');
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
                              const arr = (msg.otpCode || '').split('');
                              setOtpDigits(arr);
                              setIsMessagesOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                          >
                            <span>Auto-Fill</span>
                          </button>
                        </div>
                      </div>
                    ) : null}
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
