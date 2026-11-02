import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Lock,
  Volume2,
  Type,
  SunMoon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api.js';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface MyProfileProps {
  user: Profile | null;
  onUpdateUser: (profile: Profile) => void;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const MyProfile: React.FC<MyProfileProps> = ({
  user,
  onUpdateUser,
  onLogout,
  lang,
  setLang,
  onOpenAuth
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [locality, setLocality] = useState(user?.locality || '');
  const [address, setAddress] = useState(user?.address || '');

  // Accessibility state
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  // Password Change
  const [showPassModal, setShowPassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const t = translations[lang];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.updateProfile({
        full_name: fullName,
        email,
        locality,
        address
      });
      onUpdateUser(res.data);
      setActionSuccess('Profile details saved successfully!');
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    if (next) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  };

  const handleReadProfileAloud = () => {
    if ('speechSynthesis' in window && user) {
      window.speechSynthesis.cancel();
      const text = `Citizen profile: ${user.full_name}. Phone: ${user.phone}. Locality: ${user.locality || 'Navsari'}. Role: Citizen.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-[#e2e8f0] text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#e6f4f1] text-[#095c54] flex items-center justify-center mx-auto text-2xl">
          <User className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-base text-[#0f2925]">
          Sign in to view your profile
        </h3>
        <p className="text-xs text-[#64748b]">
          Manage your personal settings, language preference, and mobile verification details.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="w-full btn-primary-custom py-2.5 text-xs font-bold"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-[#e6f4f1] shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#095c54] text-white flex items-center justify-center font-black text-2xl shadow-sm">
              {user.full_name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54]">
                {user.full_name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ecfdf5] text-[#10b981]">
                Verified Citizen
              </span>
            </div>
            <p className="text-xs text-[#64748b] mt-0.5 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {user.phone}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          onClick={handleReadProfileAloud}
          className="btn-outline-custom px-3 py-2 text-xs font-bold"
        >
          <Volume2 className="w-4 h-4 text-[#095c54]" />
          <span>Read Aloud</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#ecfdf5] text-[#10b981] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-[#fee2e2] text-[#dc2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-[#095c54] uppercase tracking-wider">
          Personal Details
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#0f2925] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2925] mb-1">Registered Phone</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled
                  value={user.phone}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => alert('Changing registered mobile number requires SMS OTP verification. Please contact municipal desk or log in with new number.')}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#095c54] hover:underline whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2925] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="optional@example.com"
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2925] mb-1">Locality / Ward</label>
              <input
                type="text"
                value={locality}
                onChange={e => setLocality(e.target.value)}
                placeholder="e.g. Dudhiya Talao, Ward 3"
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f2925] mb-1">Address Details</label>
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Residential street and building address..."
              className="w-full p-2.5 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex sm:justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto btn-primary-custom px-5 py-2.5 text-xs font-bold touch-press"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Language Preferences */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-3">
        <h3 className="font-extrabold text-sm text-[#095c54] uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-4 h-4" /> Preferred Language / ભાષા / भाषा
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { code: 'en' as Language, label: 'English', desc: 'Default Interface' },
            { code: 'gu' as Language, label: 'ગુજરાતી', desc: 'સ્થાનિક ભાષા' },
            { code: 'hi' as Language, label: 'हिन्दी', desc: 'राष्ट्र भाषा' }
          ].map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                api.updatePreferences(l.code);
              }}
              className={`p-3 rounded-2xl border text-left transition ${
                lang === l.code
                  ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                  : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
              }`}
            >
              <div className="font-extrabold text-xs">{l.label}</div>
              <div className="text-[10px] text-[#64748b]">{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-3">
        <h3 className="font-extrabold text-sm text-[#095c54] uppercase tracking-wider">
          Accessibility & Visual Comfort
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* High Contrast Mode */}
          <div className="p-3.5 rounded-2xl border border-[#e2e8f0] flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-[#0f2925] block">High Contrast Mode</span>
              <span className="text-[11px] text-[#64748b]">Dark high-contrast background</span>
            </div>
            <button
              type="button"
              onClick={handleToggleHighContrast}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                highContrast ? 'bg-[#095c54]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  highContrast ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Read Aloud Helper */}
          <div className="p-3.5 rounded-2xl border border-[#e2e8f0] flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-[#0f2925] block">Screen Reader Ready</span>
              <span className="text-[11px] text-[#64748b]">Uses Indian TTS voices</span>
            </div>
            <button
              type="button"
              onClick={() => handleReadProfileAloud()}
              className="p-2 rounded-xl bg-[#e6f4f1] text-[#095c54] font-bold text-xs"
            >
              Test Voice
            </button>
          </div>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#fee2e2]/40 border border-[#fecaca] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-extrabold text-xs text-[#dc2626]">Sign Out of My Clean Navsari</h4>
          <p className="text-[11px] text-[#64748b]">Clears active session token on this device.</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#dc2626] text-white text-xs font-bold hover:bg-[#b91c1c] transition flex items-center justify-center gap-1.5 touch-press"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );
};
