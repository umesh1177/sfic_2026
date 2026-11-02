import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Check,
  X,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../services/api.js';
import { CleanlinessDrive } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface CleanlinessDrivesProps {
  lang: Language;
}

// Organization metadata map for realistic civic organizers
const ORGANIZER_DETAILS: Record<string, any> = {
  'drive-01': {
    org_name: 'Rotary Club of Navsari & NMC Ward 3',
    org_type: 'NGO & Municipal Joint Initiative',
    lead_person: 'Dr. Suresh Desai (Rotary President)',
    contact_phone: '+91 98251 40120',
    contact_email: 'drives@rotarynavsari.org',
    meeting_spot: 'Dudhiya Talao West Gate Fountain Plaza',
    reporting_time: '06:45 AM (Sunday)',
    gear_provided: ['Nitrile Heavy-Duty Gloves', 'Biodegradable Waste Bags', 'Reflective Safety Vest', 'Hydration & Refreshments'],
    karma_reward: 150
  },
  'drive-02': {
    org_name: 'Navsari Youth Green Brigade & Station Ward Cell',
    org_type: 'Citizen Action Group',
    lead_person: 'Pooja Patel (Youth Coordinator)',
    contact_phone: '+91 98251 60234',
    contact_email: 'action@navsariyounggreens.in',
    meeting_spot: 'Opposite Navsari Railway Station Auto Stand',
    reporting_time: '07:30 AM',
    gear_provided: ['Rubber Gloves', 'Trash Pickers', 'Recyclable Collection Sacks', 'Sanitizers & Snacks'],
    karma_reward: 120
  },
  'drive-03': {
    org_name: 'Lunsikui Citizens Welfare Association',
    org_type: 'Resident Welfare Association',
    lead_person: 'Hasmukh Shah (RWA Secretary)',
    contact_phone: '+91 98251 89110',
    contact_email: 'lunsikui.rwa@gmail.com',
    meeting_spot: 'Lunsikui Community Ground Pavilion',
    reporting_time: '07:00 AM',
    gear_provided: ['Gloves', 'Brooms', 'Collection Dustbins', 'Breakfast & Certificate'],
    karma_reward: 100
  }
};

export const CleanlinessDrives: React.FC<CleanlinessDrivesProps> = ({ lang }) => {
  const [drives, setDrives] = useState<CleanlinessDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Selected Drive for Detail Modal (Organization & Registration)
  const [selectedDrive, setSelectedDrive] = useState<CleanlinessDrive | null>(null);
  const [citizenQuestion, setCitizenQuestion] = useState<string>('');
  const [askingQuestion, setAskingQuestion] = useState<boolean>(false);
  const [questionSentMessage, setQuestionSentMessage] = useState<string>('');

  const t = translations[lang];

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await api.getDrives();
      setDrives(res.data);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleRegister = async (driveId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.registerForDrive(driveId);
      setActionSuccess(res.message);
      fetchDrives();
      // Update selected drive in modal if open
      if (selectedDrive && selectedDrive.id === driveId) {
        setSelectedDrive({ ...selectedDrive, is_registered: true, registered_volunteers_count: selectedDrive.registered_volunteers_count + 1 });
      }
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCancelRegistration = async (driveId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.cancelDriveRegistration(driveId);
      setActionSuccess(res.message);
      fetchDrives();
      // Update selected drive in modal if open
      if (selectedDrive && selectedDrive.id === driveId) {
        setSelectedDrive({ ...selectedDrive, is_registered: false, registered_volunteers_count: Math.max(0, selectedDrive.registered_volunteers_count - 1) });
      }
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrive || !citizenQuestion.trim()) return;

    setAskingQuestion(true);
    setQuestionSentMessage('');
    try {
      await api.askActivityQuestion(selectedDrive.id, citizenQuestion.trim(), lang);
      setQuestionSentMessage('Your question has been sent directly to the Community Head! You will receive a notification once answered.');
      setCitizenQuestion('');
    } catch (err: any) {
      alert(`Error submitting question: ${err.message}`);
    } finally {
      setAskingQuestion(false);
    }
  };

  const filtered = drives.filter(d => {
    if (selectedWard !== 'all' && !d.ward_name.includes(selectedWard)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.location_name.toLowerCase().includes(q);
    }
    return true;
  });

  const activeOrganizer = selectedDrive ? (ORGANIZER_DETAILS[selectedDrive.id] || ORGANIZER_DETAILS['drive-01']) : null;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="pill-badge py-1 px-3 text-[11px]">
              <span className="badge-dot" />
              {t.app_subtitle}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] mt-1">
            {t.nav_drives}
          </h2>
          <p className="text-xs text-[#64748b]">
            {t.drives_desc}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={lang === 'gu' ? 'ડ્રાઇવ શોધો...' : lang === 'hi' ? 'ड्राइव खोजें...' : 'Search drives or wards...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none bg-[#f8faf9]"
          />
        </div>
      </div>

      {/* Status Messages */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-bold text-[#047857] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-[#047857] hover:underline font-black text-xs">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-xs font-bold text-[#dc2626] flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-[#dc2626] hover:underline font-black text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Drives Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-[#64748b]">{t.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] text-xs text-[#64748b]">{t.empty}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const percentFilled = Math.min(100, Math.round((d.registered_volunteers_count / d.max_volunteers) * 100));

            return (
              <div
                key={d.id}
                className="rounded-3xl border border-[#e2e8f0] bg-white shadow-sm hover:shadow-md hover:border-[#b8e0d7] transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-100">
                    <img src={d.banner_url} alt={d.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#095c54] text-white shadow-sm">
                        {d.ward_name}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-2.5">
                    <h3 className="font-extrabold text-sm text-[#095c54] leading-snug">
                      {d.title}
                    </h3>
                    <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>

                    <div className="text-xs text-[#64748b] space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                        <span className="truncate">{d.location_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                        <span>{new Date(d.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    {/* Volunteer Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#64748b] font-medium flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#095c54]" /> Volunteers
                        </span>
                        <span className="font-extrabold text-[#095c54]">
                          {d.registered_volunteers_count} / {d.max_volunteers} ({percentFilled}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#095c54] to-[#10b981] h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Card Action: View Details Button */}
                  <div className="p-4 sm:p-5 pt-0">
                    {d.is_registered ? (
                      <div className="space-y-2">
                        <div className="w-full py-2.5 rounded-xl bg-[#ecfdf5] text-[#047857] text-xs font-extrabold flex items-center justify-center gap-1.5 border border-[#a7f3d0]">
                          <Check className="w-3.5 h-3.5" /> {t.registered_badge}
                        </div>
                        <button
                          onClick={() => setSelectedDrive(d)}
                          className="w-full py-2 rounded-xl text-xs font-bold text-[#095c54] hover:bg-[#e6f4f1] transition border border-[#b8e0d7] touch-press"
                        >
                          {t.view_details} →
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedDrive(d)}
                        className="w-full btn-outline-custom py-2.5 text-xs font-extrabold text-[#095c54] border-[#b8e0d7] hover:bg-[#e6f4f1] transition flex items-center justify-center gap-1.5 touch-press"
                      >
                        <span>{t.register_btn}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAILED MODAL: ORGANIZER INFO & REGISTRATION BUTTON     */}
      {/* ======================================================== */}
      {selectedDrive && activeOrganizer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeInBackdrop"
          onClick={() => setSelectedDrive(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slideUpSheet sm:animate-scaleUp pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative aspect-video sm:aspect-[21/9] bg-slate-100">
              <img src={selectedDrive.banner_url} alt={selectedDrive.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedDrive(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#095c54] text-white shadow-md">
                  {selectedDrive.ward_name}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-black text-[#095c54]">
                  {selectedDrive.title}
                </h3>
                <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                  {selectedDrive.description}
                </p>
              </div>

              {/* Organizer Information Box */}
              <div className="p-4 rounded-2xl bg-[#f0f6f4] border border-[#b8e0d7] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#095c54]">
                  <Building className="w-4 h-4" />
                  <span>Organizing Agency Information</span>
                </div>
                <div className="text-xs font-bold text-[#0f2925]">
                  {activeOrganizer.org_name}
                </div>
                <div className="text-[11px] text-[#64748b]">
                  {activeOrganizer.org_type}
                </div>

                <div className="pt-2 border-t border-[#b8e0d7]/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#94a3b8] font-bold block">Coordinator</span>
                    <span className="font-bold text-[#0f2925]">{activeOrganizer.lead_person}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94a3b8] font-bold block">Contact Helpline</span>
                    <span className="font-bold text-[#095c54]">{activeOrganizer.contact_phone}</span>
                  </div>
                </div>
              </div>

              {/* Event Schedule & Assembly */}
              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2 text-xs">
                <div className="font-extrabold text-[#0f2925] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#095c54]" />
                  <span>Meeting & Assembly Point</span>
                </div>
                <p className="text-xs text-[#64748b]">
                  {activeOrganizer.meeting_spot}
                </p>
                <div className="text-[11px] font-bold text-[#095c54] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                  <span>Reporting Time: {activeOrganizer.reporting_time}</span>
                </div>
              </div>

              {/* Gear Provided */}
              <div>
                <span className="text-xs font-extrabold text-[#0f2925] block mb-1.5">
                  Gear & Kit Provided to Volunteers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeOrganizer.gear_provided.map((gear: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-white border border-[#e2e8f0] text-[11px] font-semibold text-[#0f2925] shadow-sm flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                      {gear}
                    </span>
                  ))}
                </div>
              </div>

              {/* Karma Rewards Notice */}
              <div className="p-3 rounded-xl bg-[#fef3c7] border border-[#fde68a] text-xs font-bold text-[#92400e] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d97706] shrink-0" />
                <span>Earn +{activeOrganizer.karma_reward} Civic Karma Points upon verified attendance.</span>
              </div>

              {/* Citizen Questions section to Community Head */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#095c54]">
                    <Info className="w-4 h-4" />
                    <span>Have a question about this drive?</span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                    Direct to Community Head
                  </span>
                </div>

                {questionSentMessage ? (
                  <div className="p-3 rounded-xl bg-emerald-100/80 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{questionSentMessage}</span>
                  </div>
                ) : (
                  <form onSubmit={handleAskQuestion} className="space-y-2">
                    <input
                      type="text"
                      value={citizenQuestion}
                      onChange={e => setCitizenQuestion(e.target.value)}
                      placeholder="e.g. Will drinking water be provided? Can kids participate?"
                      className="w-full px-3 py-2 rounded-xl border border-teal-300 focus:border-[#095c54] text-xs bg-white text-slate-900 outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={askingQuestion || !citizenQuestion.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-bold hover:bg-[#074741] transition disabled:opacity-50"
                      >
                        {askingQuestion ? 'Sending...' : 'Ask Community Head'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Modal Footer with Register Button */}
            <div className="p-4 sm:p-5 border-t border-[#e2e8f0] bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedDrive(null)}
                className="btn-outline-custom px-4 py-2.5 text-xs font-bold"
              >
                Close
              </button>

              {selectedDrive.is_registered ? (
                <button
                  type="button"
                  onClick={() => handleCancelRegistration(selectedDrive.id)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5] hover:bg-[#fecaca] transition"
                >
                  Cancel Registration
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRegister(selectedDrive.id)}
                  className="flex-1 btn-primary-custom py-2.5 text-xs font-extrabold rounded-2xl shadow-lg"
                >
                  Confirm & Register for this Drive
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
