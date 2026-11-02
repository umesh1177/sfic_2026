import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Phone,
  Calendar,
  MapPin,
  Globe,
  Award,
  QrCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

interface WorkerProfileViewProps {
  profile: WorkerProfile | null;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const WorkerProfileView: React.FC<WorkerProfileViewProps> = ({
  profile,
  lang,
  setLang
}) => {
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    setSavedMsg(`Language updated to ${newLang === 'gu' ? 'ગુજરાતી' : newLang === 'hi' ? 'हिन्दी' : 'English'}`);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Official Municipal ID Card Banner (Citizen Dashboard Style) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#095c54] to-[#10b981] flex items-center justify-center font-extrabold text-2xl text-white shadow-md shrink-0">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'WR'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight">{profile?.full_name || 'Sanitation Worker'}</h2>
              <span className="bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                {profile?.worker_code || 'NMC-WRK'}
              </span>
            </div>
            <p className="text-[#64748b] text-sm mt-0.5 font-medium">{profile?.designation_name || 'Sanitation Worker'}</p>
            <p className="text-xs text-[#047857] mt-1 flex items-center gap-1 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Navsari Municipal Corporation · Verified Field Personnel</span>
            </p>
          </div>
        </div>

        {/* Quick ID Badge Chip */}
        <div className="bg-[#f8faf9] border border-[#e2e8f0] p-3 rounded-2xl flex items-center gap-3 shrink-0">
          <QrCode className="w-10 h-10 text-[#095c54]" />
          <div className="text-xs">
            <span className="text-[#64748b] block font-medium">Service ID:</span>
            <span className="font-mono font-bold text-[#0f2925] block mt-0.5">{profile?.worker_code || 'NMC-WRK'}</span>
            <span className="text-[#047857] block text-[10px] font-bold">Valid 2026-2027</span>
          </div>
        </div>
      </div>

      {/* 2. Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
          <h3 className="text-base font-black text-[#0f2925] border-b border-[#e2e8f0] pb-3">
            Worker Credentials & Service Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Assigned Municipal Ward:</span>
              <span className="font-black text-[#0f2925] block mt-1 text-sm">
                Ward {profile?.ward_number || 3} {profile?.ward_name ? `- ${profile.ward_name}` : ''}
              </span>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Employment Status:</span>
              <span className="font-black text-[#0f2925] block mt-1 text-sm capitalize">
                {profile?.employment_status || 'Permanent'}
              </span>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Registered Mobile Phone:</span>
              <span className="font-mono font-black text-[#0f2925] block mt-1 text-sm">
                {profile?.phone || 'Not provided'}
              </span>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Emergency Contact:</span>
              <span className="font-black text-[#0f2925] block mt-1 text-sm">
                {profile?.emergency_contact_name
                  ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || ''})`
                  : 'NMC Staff Operations (+91 98251 00000)'}
              </span>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Date of Joining:</span>
              <span className="font-black text-[#0f2925] block mt-1 text-sm">
                {profile?.joining_date || '2026-01-01'} ({profile?.experience_years ? `${profile.experience_years} Years Experience` : 'Active Service'})
              </span>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Sanitary Zone:</span>
              <span className="font-black text-[#0f2925] block mt-1 text-sm">
                Navsari Municipal Corporation
              </span>
            </div>
          </div>

          {/* Certified Skills */}
          <div>
            <h4 className="text-xs font-black text-[#0f2925] uppercase tracking-wider mb-2.5">
              Certified Technical & Safety Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {(profile?.skills && profile.skills.length > 0
                ? profile.skills
                : ['Municipal Sanitation', 'Solid Waste Collection', 'Civic Cleanliness']
              ).map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]"
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Language Preference Deck */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
          <h3 className="text-base font-black text-[#0f2925] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#095c54]" />
            <span>Language Preference</span>
          </h3>
          <p className="text-xs text-[#64748b]">
            Choose your preferred language for task instructions, voice readouts, and municipal notifications.
          </p>

          <div className="space-y-2 pt-2">
            {[
              { code: 'gu', label: 'ગુજરાતી (Gujarati)', note: 'પ્રાદેશિક ભાષા' },
              { code: 'hi', label: 'हिन्दी (Hindi)', note: 'राष्ट्रभाषा' },
              { code: 'en', label: 'English (English)', note: 'Standard official' }
            ].map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLanguageChange(l.code as Language)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  lang === l.code
                    ? 'bg-[#e6f4f1] border-[#095c54] ring-2 ring-[#095c54]/20'
                    : 'bg-[#f8faf9] border-[#e2e8f0] hover:bg-slate-100'
                }`}
              >
                <div>
                  <span className="font-black text-xs text-[#0f2925] block">{l.label}</span>
                  <span className="text-[11px] text-[#64748b]">{l.note}</span>
                </div>
                {lang === l.code && <CheckCircle2 className="w-4 h-4 text-[#095c54]" />}
              </button>
            ))}
          </div>

          {savedMsg && (
            <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] rounded-2xl text-xs font-bold">
              {savedMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

