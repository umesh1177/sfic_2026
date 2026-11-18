import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Globe,
  Shield,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { Language } from '../../i18n/translations.js';

interface CommunitySettingsProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const CommunitySettings: React.FC<CommunitySettingsProps> = ({
  lang,
  onLanguageChange
}) => {
  const [notifyQuestions, setNotifyQuestions] = useState<boolean>(true);
  const [notifyApprovals, setNotifyApprovals] = useState<boolean>(true);
  const [autoAcceptRegs, setAutoAcceptRegs] = useState<boolean>(true);
  const [emergencySms, setEmergencySms] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Community Head Administration Settings
        </h1>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Language & Localization */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-[#095c54]" />
            <h2 className="text-sm font-extrabold text-slate-900">Language & Regional Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'en', label: 'English', desc: 'Default administrative interface' },
              { id: 'gu', label: 'ગુજરાતી (Gujarati)', desc: 'Navsari municipal official language' },
              { id: 'hi', label: 'हिंदी (Hindi)', desc: 'National language' }
            ].map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLanguageChange(l.id as Language)}
                className={`p-4 rounded-2xl border text-left transition ${
                  lang === l.id
                    ? 'bg-teal-50/70 border-[#095c54] shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-extrabold text-slate-900">{l.label}</p>
                <p className="text-[11px] text-slate-500 mt-1">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Notification Preferences */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-[#095c54]" />
            <h2 className="text-sm font-extrabold text-slate-900">Notification Alerts</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">Citizen Inquiries & Questions</p>
                <p className="text-[11px] text-slate-500">Instant notification when a citizen asks a question about an upcoming drive</p>
              </div>
              <input
                type="checkbox"
                checked={notifyQuestions}
                onChange={e => setNotifyQuestions(e.target.checked)}
                className="w-4 h-4 rounded text-[#095c54] focus:ring-[#095c54]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">NMC Ward Officer Approval Updates</p>
                <p className="text-[11px] text-slate-500">Receive alerts when Ward 3 Inspector approves or requests edits on activities</p>
              </div>
              <input
                type="checkbox"
                checked={notifyApprovals}
                onChange={e => setNotifyApprovals(e.target.checked)}
                className="w-4 h-4 rounded text-[#095c54] focus:ring-[#095c54]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">Auto-Accept Volunteer Registrations</p>
                <p className="text-[11px] text-slate-500">Automatically confirm citizen spots while below maximum capacity limit</p>
              </div>
              <input
                type="checkbox"
                checked={autoAcceptRegs}
                onChange={e => setAutoAcceptRegs(e.target.checked)}
                className="w-4 h-4 rounded text-[#095c54] focus:ring-[#095c54]"
              />
            </label>
          </div>
        </div>

        {/* 3. Official Municipal Contacts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-[#095c54]" />
            <h2 className="text-sm font-extrabold text-slate-900">Designated NMC Liaison Officers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Ward 3 Sanitary Inspector</span>
              <p className="font-extrabold text-slate-900">Ramesh Patel</p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#095c54]" />
                +91 98251 10003
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">NMC Cleanliness Command Center</span>
              <p className="font-extrabold text-slate-900">Toll-Free Control Room</p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#095c54]" />
                1800-233-0194
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};

