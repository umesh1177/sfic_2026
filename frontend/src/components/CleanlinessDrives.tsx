import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Check,
  Building,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  Lock,
  Navigation,
  AlertCircle,
  HelpCircle,
  Share2,
  FileText,
  X
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

// Calculate distance between two lat/lng pairs in meters using Haversine formula
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const CleanlinessDrives: React.FC<CleanlinessDrivesProps> = ({ lang }) => {
  const [drives, setDrives] = useState<CleanlinessDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [driveFilter, setDriveFilter] = useState<'all' | 'joint' | 'single'>('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Selected Drive for Full-Page View (Not a modal!)
  const [selectedDrive, setSelectedDrive] = useState<CleanlinessDrive | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'organizer' | 'attendance'>('info');

  // Citizen Question state
  const [citizenQuestion, setCitizenQuestion] = useState<string>('');
  const [askingQuestion, setAskingQuestion] = useState<boolean>(false);
  const [questionSentMessage, setQuestionSentMessage] = useState<string>('');

  // Attendance state
  const [verifyingAttendance, setVerifyingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string>('');
  const [attendanceError, setAttendanceError] = useState<string>('');
  const [distanceFromDrive, setDistanceFromDrive] = useState<number | null>(null);

  // Joint Drive Community Team Selection Modal
  const [jointModalDrive, setJointModalDrive] = useState<CleanlinessDrive | null>(null);
  const [selectedTeamCommId, setSelectedTeamCommId] = useState<string>('');
  const [selectedTeamCommName, setSelectedTeamCommName] = useState<string>('');

  const t = translations[lang];

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await api.getDrives();
      setDrives(res.data);
      if (selectedDrive) {
        const updated = res.data.find(d => d.id === selectedDrive.id);
        if (updated) setSelectedDrive(updated);
      }
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const initiateRegistration = (drive: CleanlinessDrive) => {
    setActionError('');
    setActionSuccess('');
    if (drive.is_joint || (drive.co_organisers && drive.co_organisers.length > 1)) {
      setJointModalDrive(drive);
      const teams = drive.assigned_communities && drive.assigned_communities.length > 0
        ? drive.assigned_communities
        : (drive.co_organisers || []).map((name, i) => ({
            id: `ac-${i}`,
            community_id: `c-${i}`,
            community_name: name,
            head_name: undefined
          }));
      if (teams.length > 0) {
        setSelectedTeamCommId(teams[0].community_id);
        setSelectedTeamCommName(teams[0].community_name);
      }
    } else {
      handleRegister(drive.id);
    }
  };

  const handleRegister = async (driveId: string, commId?: string, commName?: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.registerForDrive(driveId, commId, commName);
      setActionSuccess(res.message);
      setJointModalDrive(null);
      fetchDrives();
      if (selectedDrive && selectedDrive.id === driveId) {
        setSelectedDrive({
          ...selectedDrive,
          is_registered: true,
          registered_community_id: commId,
          registered_community_name: commName,
          registered_volunteers_count: selectedDrive.registered_volunteers_count + 1
        });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to register for drive');
    }
  };

  const handleCancelRegistration = async (driveId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.cancelDriveRegistration(driveId);
      setActionSuccess(res.message);
      fetchDrives();
      if (selectedDrive && selectedDrive.id === driveId) {
        setSelectedDrive({
          ...selectedDrive,
          is_registered: false,
          registered_volunteers_count: Math.max(0, selectedDrive.registered_volunteers_count - 1)
        });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel registration');
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

  // Live Geo-Tagged Location Verification & Dummy Attendance Submission (Between Start & End Time ONLY)
  const handleMarkAttendance = () => {
    if (!selectedDrive) return;
    setAttendanceError('');
    setAttendanceMessage('');

    const windowState = getAttendanceWindowState(selectedDrive.start_time, selectedDrive.end_time);
    if (windowState === 'before_start') {
      setAttendanceError(
        `Attendance check-in is locked until the drive starts at ${new Date(selectedDrive.start_time).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short'
        })}.`
      );
      return;
    }
    if (windowState === 'after_end') {
      setAttendanceError(
        `Attendance check-in window closed at ${new Date(selectedDrive.end_time).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short'
        })}.`
      );
      return;
    }

    setVerifyingAttendance(true);

    if (!navigator.geolocation) {
      setAttendanceError('Geolocation is not supported by your browser or device.');
      setVerifyingAttendance(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          // Target coordinates of the drive
          const driveLat = selectedDrive.latitude || 20.9470;
          const driveLng = selectedDrive.longitude || 72.9280;

          const distanceMeters = calculateDistanceMeters(userLat, userLng, driveLat, driveLng);
          setDistanceFromDrive(Math.round(distanceMeters));

          // Maximum allowed distance is 150 meters
          const MAX_DISTANCE_METERS = 150;

          if (distanceMeters > MAX_DISTANCE_METERS) {
            setAttendanceError(
              `⚠️ Geo-Tag Verification Failed: You are currently ${Math.round(
                distanceMeters
              )}m away from the drive spot (${selectedDrive.location_name}). You must be within ${MAX_DISTANCE_METERS}m of the cleanliness drive site to mark attendance.`
            );
            setVerifyingAttendance(false);
            return;
          }

          // Within 150m & active drive window! Submit geo-tagged dummy check-in to respective Community Head
          const res = await api.markCitizenDriveAttendance(selectedDrive.id, userLat, userLng);
          setAttendanceMessage(
            res.message ||
              '📍 Geo-tagged check-in submitted! Your attendance has been sent to your Community Head for final verification.'
          );
          setSelectedDrive({
            ...selectedDrive,
            attendance_status: res.data?.attendance_status || 'pending_verification',
            attended: res.data?.attendance_status === 'present',
            checkin_latitude: userLat,
            checkin_longitude: userLng,
            checkin_distance_meters: Math.round(distanceMeters),
            checkin_at: new Date().toISOString()
          });
          fetchDrives();
        } catch (err: any) {
          setAttendanceError(err.message || 'Failed to submit geo-tagged check-in.');
        } finally {
          setVerifyingAttendance(false);
        }
      },
      err => {
        setVerifyingAttendance(false);
        setAttendanceError(`GPS Error (${err.message}). Please allow location access to verify your geo-tagged position.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const filtered = drives.filter(d => {
    if (driveFilter === 'joint' && !d.is_joint) return false;
    if (driveFilter === 'single' && d.is_joint) return false;
    if (selectedWard !== 'all' && !d.ward_name.includes(selectedWard)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.location_name.toLowerCase().includes(q) ||
        (d.organiser_name && d.organiser_name.toLowerCase().includes(q)) ||
        (d.co_organisers && d.co_organisers.some(co => co.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  // Strict time-window check: Attendance option is ONLY enabled between start_time and end_time of the drive
  const getAttendanceWindowState = (startTimeStr?: string, endTimeStr?: string): 'before_start' | 'active' | 'after_end' => {
    try {
      const nowMs = Date.now();
      const startMs = startTimeStr ? new Date(startTimeStr).getTime() : NaN;
      const endMs = endTimeStr ? new Date(endTimeStr).getTime() : NaN;
      if (!isNaN(startMs) && nowMs < startMs) return 'before_start';
      if (!isNaN(endMs) && nowMs > endMs) return 'after_end';
      return 'active';
    } catch {
      return 'before_start';
    }
  };

  // =========================================================================
  // FULL PAGE VIEW FOR SELECTED DRIVE (NO MODAL POPUP!)
  // =========================================================================
  if (selectedDrive) {
    const activeOrganizer =
      ORGANIZER_DETAILS[selectedDrive.id] || {
        org_name: selectedDrive.organiser_name || 'Navsari Civic Action Team',
        org_type: 'Community Cleanliness Initiative',
        lead_person: 'Ward Community Coordinator',
        contact_phone: '+91 98251 00001',
        contact_email: 'community@clean-navsari.gov.in',
        meeting_spot: selectedDrive.location_name || 'Navsari Municipal Assembly Plaza',
        reporting_time: '07:00 AM',
        gear_provided: ['Nitrile Heavy-Duty Gloves', 'Biodegradable Waste Bags', 'Reflective Safety Vest', 'Hydration & Refreshments'],
        karma_reward: 150
      };

    const attendanceWindow = getAttendanceWindowState(selectedDrive.start_time, selectedDrive.end_time);
    const isWindowActive = attendanceWindow === 'active';
    const isAttended = selectedDrive.attendance_status === 'present';
    const isPendingVerification = selectedDrive.attendance_status === 'pending_verification';

    return (
      <div className="space-y-5 animate-fadeIn pb-16">
        {/* Navigation Breadcrumb */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-xs flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedDrive(null);
              setActiveTab('info');
              setAttendanceMessage('');
              setAttendanceError('');
            }}
            className="flex items-center gap-2 text-xs font-black text-[#095c54] hover:text-[#063f3a] transition py-1 px-3 rounded-2xl bg-[#e6f4f1] hover:bg-[#d0ece6]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cleanliness Drives</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#095c54] text-white">
              {selectedDrive.ward_name}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                selectedDrive.status === 'completed'
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {selectedDrive.status}
            </span>
          </div>
        </div>

        {/* Global Action Messages */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-bold text-[#047857] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-[#047857] font-black text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-xs font-bold text-[#dc2626] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#dc2626]" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-[#dc2626] font-black text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Full Page Hero Banner Card */}
        <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="relative aspect-[21/9] sm:aspect-[24/8] bg-slate-100 w-full overflow-hidden">
            <img
              src={selectedDrive.banner_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'}
              alt={selectedDrive.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 sm:p-8">
              {selectedDrive.is_joint ? (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs inline-flex items-center gap-1.5 self-start mb-2">
                  <Users className="w-3.5 h-3.5" />
                  Joint Community Drive · {selectedDrive.co_organisers?.join(' & ') || selectedDrive.organiser_name}
                </span>
              ) : (
                <span className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-teal-400" />
                  {selectedDrive.organiser_name || activeOrganizer.org_name}
                </span>
              )}
              <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                {selectedDrive.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-white/90 mt-2">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-300" />
                  {selectedDrive.location_name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-300" />
                  {new Date(selectedDrive.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(selectedDrive.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedDrive.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-300" />
                  {selectedDrive.registered_volunteers_count} / {selectedDrive.max_volunteers} Volunteers Enrolled
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Ribbon */}
          <div className="p-4 sm:p-6 bg-[#f8faf9] border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#095c54]/10 flex items-center justify-center text-[#095c54]">
                <Sparkles className="w-5 h-5 text-[#095c54]" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-[#0f2925]">
                  Civic Volunteer Participation
                </div>
                <div className="text-[11px] text-[#64748b]">
                  Registered volunteers earn +150 Civic Karma upon attendance verification
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedDrive.is_registered ? (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2.5 rounded-2xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5 border border-emerald-300">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Registered Volunteer {selectedDrive.registered_community_name ? `(${selectedDrive.registered_community_name})` : ''}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelRegistration(selectedDrive.id)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => initiateRegistration(selectedDrive)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-[#095c54] hover:bg-[#074741] shadow-lg shadow-[#095c54]/20 transition flex items-center justify-center gap-2"
                >
                  <span>Take Part in Drive · Register as Volunteer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex border-b border-[#e2e8f0] bg-white rounded-2xl p-1.5 shadow-xs gap-1.5">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === 'info'
                ? 'bg-[#095c54] text-white shadow-sm'
                : 'text-[#64748b] hover:bg-slate-100'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Drive Overview & Kit</span>
          </button>

          <button
            onClick={() => setActiveTab('organizer')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === 'organizer'
                ? 'bg-[#095c54] text-white shadow-sm'
                : 'text-[#64748b] hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Organizer Info & Q&A</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === 'attendance'
                ? 'bg-[#095c54] text-white shadow-sm'
                : 'text-[#64748b] hover:bg-slate-100'
            }`}
          >
            {isAttended ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : isPendingVerification ? (
              <Clock className="w-4 h-4 text-amber-400" />
            ) : isWindowActive ? (
              <Navigation className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-500" />
            )}
            <span>Volunteer Attendance</span>
            {isPendingVerification ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold hidden sm:inline">
                Pending Approval
              </span>
            ) : !isWindowActive && !isAttended ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold hidden sm:inline">
                {attendanceWindow === 'after_end' ? 'Closed' : 'Locked'}
              </span>
            ) : null}
          </button>
        </div>

        {/* Tab 1: Drive Overview & Kit */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
              <h3 className="text-base font-black text-[#095c54]">
                About This Cleanliness Drive
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {selectedDrive.description}
              </p>

              {/* Officer's Action Plan */}
              {selectedDrive.action_plan && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Officer's Recommended Action Plan</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {selectedDrive.action_plan}
                  </p>
                </div>
              )}

              {/* Instructions for Participating Citizens */}
              {selectedDrive.citizen_instructions && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Instructions for Participating Citizens</span>
                  </div>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed whitespace-pre-line bg-white/80 p-3 rounded-xl border border-amber-100">
                    {selectedDrive.citizen_instructions}
                  </p>
                </div>
              )}

              {/* Necessary Gears & Safety Equipment */}
              {selectedDrive.necessary_gears && selectedDrive.necessary_gears.length > 0 && (
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-900">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Necessary Volunteer Gears & Equipment</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedDrive.necessary_gears.map((gear, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-xs font-bold text-teal-950 shadow-2xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        {gear}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Joint Collaboration Community Organizers & Quota Status */}
              {selectedDrive.is_joint && (selectedDrive.co_organisers || selectedDrive.assigned_communities) && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-900 uppercase tracking-wider">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Joint Community Drive Collaboration</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Quota: {selectedDrive.max_volunteers_per_community || 25} vols / community
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900 font-medium">
                    Approved by the Ward Officer as a joint initiative organized collectively by:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(() => {
                      const commList = selectedDrive.assigned_communities && selectedDrive.assigned_communities.length > 0
                        ? selectedDrive.assigned_communities
                        : (selectedDrive.co_organisers || []).map((c, i) => ({
                            id: `ac-${i}`,
                            community_id: `c-${i}`,
                            community_name: c,
                            head_name: undefined
                          }));
                      return commList.map((team, idx) => {
                        const count = selectedDrive.community_volunteer_counts?.[team.community_id] || 0;
                        const maxCount = selectedDrive.max_volunteers_per_community || 25;
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-white border border-indigo-200 flex items-center justify-between text-xs shadow-2xs">
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <div>
                                <span className="font-bold text-indigo-950 block">{team.community_name}</span>
                                {team.head_name && <span className="text-[10px] text-slate-500">Lead: {team.head_name}</span>}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                              {count} / {maxCount} vols
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#095c54]">
                    <MapPin className="w-4 h-4" />
                    <span>Assembly & Meeting Venue</span>
                  </div>
                  <p className="text-xs text-[#1e293b] font-semibold">
                    {activeOrganizer.meeting_spot}
                  </p>
                  <p className="text-[11px] text-[#64748b]">
                    Reporting Time: <strong className="text-[#095c54]">{activeOrganizer.reporting_time}</strong>
                  </p>
                  {selectedDrive.latitude && selectedDrive.longitude && (
                    <div className="text-[10px] font-mono text-[#64748b] pt-1">
                      Geo-coordinates: {selectedDrive.latitude.toFixed(4)}, {selectedDrive.longitude.toFixed(4)}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#f0f6f4] border border-[#b8e0d7] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#095c54]">
                    <Clock className="w-4 h-4" />
                    <span>Schedule & Timeline</span>
                  </div>
                  <div className="text-xs text-[#1e293b] space-y-1">
                    <div>
                      <span className="text-[#64748b]">Commencement: </span>
                      <strong className="text-[#0f2925]">
                        {new Date(selectedDrive.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Conclusion: </span>
                      <strong className="text-[#0f2925]">
                        {new Date(selectedDrive.end_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gear Provided */}
              <div className="pt-2">
                <h4 className="text-xs font-black text-[#0f2925] mb-2">
                  Sanitation Gear Provided on Site:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeOrganizer.gear_provided.map((gear: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] text-xs font-semibold text-[#0f2925] shadow-xs flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {gear}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Organizer Info & Q&A */}
        {activeTab === 'organizer' && (
          <div className="space-y-4">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
              <h3 className="text-base font-black text-[#095c54]">
                Community Leadership & Contacts
              </h3>

              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-[#0f2925]">
                      {activeOrganizer.org_name}
                    </h4>
                    <p className="text-xs text-[#64748b]">{activeOrganizer.org_type}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#e6f4f1] text-[#095c54]">
                    Verified Organizer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#94a3b8] font-bold block">Designated Lead</span>
                    <span className="font-bold text-[#0f2925]">{activeOrganizer.lead_person}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94a3b8] font-bold block">Contact Helpline</span>
                    <span className="font-bold text-[#095c54]">{activeOrganizer.contact_phone}</span>
                  </div>
                </div>
              </div>

              {/* Have a Question / Community Head Direct Inquiry */}
              <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-[#095c54]">
                    <HelpCircle className="w-4 h-4 text-[#095c54]" />
                    <span>Ask a Question to the Community Head</span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-white px-2.5 py-0.5 rounded-full border border-teal-200">
                    Direct Inquiry
                  </span>
                </div>

                {questionSentMessage ? (
                  <div className="p-3.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{questionSentMessage}</span>
                  </div>
                ) : (
                  <form onSubmit={handleAskQuestion} className="space-y-2.5">
                    <input
                      type="text"
                      value={citizenQuestion}
                      onChange={e => setCitizenQuestion(e.target.value)}
                      placeholder="e.g. Will refreshments or certificate be provided? What is the meeting landmark?"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 focus:border-[#095c54] text-xs bg-white text-slate-900 outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={askingQuestion || !citizenQuestion.trim()}
                        className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-bold hover:bg-[#074741] transition disabled:opacity-50"
                      >
                        {askingQuestion ? 'Submitting Question...' : 'Submit Question'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Volunteer Attendance (Strictly enabled ONLY between start_time and end_time, with 2-step Community Head verification) */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {isAttended ? (
              // 1. FINAL PRESENT STATE (Approved by Community Head)
              <div className="bg-white p-8 rounded-3xl border-2 border-emerald-300 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-900">
                    Final Attendance Confirmed — Marked PRESENT!
                  </h3>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1 leading-relaxed">
                    Your Community Head has verified your participation and officially recorded your attendance as <strong>PRESENT</strong> in the database.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-100 border border-amber-300 text-xs font-black text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Eligible for Official NMC Completion Certificate &amp; Civic Karma Points</span>
                </div>
              </div>
            ) : isPendingVerification ? (
              // 2. DUMMY / PENDING CHECK-IN STATE (Awaiting respective Community Head's final approval)
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-amber-300 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black mb-2">
                    <Navigation className="w-3.5 h-3.5 text-amber-700" />
                    <span>Geo-Tagged Check-In Sent · Pending Community Head Verification</span>
                  </span>
                  <h3 className="text-base font-black text-[#0f2925]">
                    Awaiting Final Attendance Approval
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Your geo-tagged check-in has been forwarded to{' '}
                    <strong className="text-[#095c54]">
                      {selectedDrive.registered_community_name || selectedDrive.organiser_name || 'your Community Head'}
                    </strong>
                    . You are <strong>not marked Present yet</strong> — once your Community Head verifies and marks your final attendance, your status will turn <strong>PRESENT</strong> and qualify you for the Completion Certificate.
                  </p>
                </div>

                {(selectedDrive.checkin_latitude !== undefined || selectedDrive.checkin_distance_meters !== undefined) && (
                  <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p className="font-black text-slate-900 flex items-center justify-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                      <span>Recorded Geo-Tag Details</span>
                    </p>
                    {selectedDrive.checkin_distance_meters !== undefined && (
                      <p>
                        Distance from drive spot: <strong className="text-emerald-700">{selectedDrive.checkin_distance_meters} meters</strong> (Within 150m geofence)
                      </p>
                    )}
                    {selectedDrive.checkin_latitude !== undefined && selectedDrive.checkin_longitude !== undefined && (
                      <p className="font-mono text-[11px] text-slate-500">
                        GPS: {selectedDrive.checkin_latitude.toFixed(5)}, {selectedDrive.checkin_longitude.toFixed(5)}
                      </p>
                    )}
                    {selectedDrive.checkin_at && (
                      <p className="text-[11px] text-slate-500">
                        Submitted at: {new Date(selectedDrive.checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : !isWindowActive ? (
              // 3. LOCKED / CLOSED STATE (Outside exact start_time to end_time window)
              <div className="bg-white p-8 rounded-3xl border border-amber-200 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0f2925]">
                    {attendanceWindow === 'after_end'
                      ? 'Attendance Window Has Closed'
                      : 'Attendance Check-In is Locked'}
                  </h3>
                  <p className="text-xs text-[#64748b] max-w-md mx-auto mt-1 leading-relaxed">
                    {attendanceWindow === 'after_end' ? (
                      <>
                        Self check-in closed when the drive ended on{' '}
                        <strong className="text-rose-700">
                          {new Date(selectedDrive.end_time).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </strong>
                        .
                      </>
                    ) : (
                      <>
                        Self attendance is strictly enabled <strong>only between the start and end time</strong> of this drive:{' '}
                        <strong className="text-[#095c54]">
                          {new Date(selectedDrive.start_time).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}{' '}
                          to{' '}
                          {new Date(selectedDrive.end_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2 text-xs">
                  <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-amber-700" />
                    <span>How 2-Step Geo-Tagged Attendance Works:</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-amber-800 text-[11px]">
                    <li>Arrive physically at the drive location ({activeOrganizer.meeting_spot}) between the start and end time.</li>
                    <li>Click <strong>"Verify Live GPS &amp; Submit Check-In"</strong> (must be within <strong>150 meters</strong> of the drive spot).</li>
                    <li>Your geo-tagged check-in is sent to your respective <strong>Community Head</strong> for verification.</li>
                    <li>Once the Community Head marks your final attendance as <strong>Present</strong>, you qualify for the official <strong>Completion Certificate</strong> &amp; Civic Karma points!</li>
                  </ol>
                </div>
              </div>
            ) : (
              // 4. ACTIVE WINDOW (now >= start_time && now <= end_time): PROCEED WITH GEO-TAGGED CHECK-IN
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Drive Live Now — Geo-Tagged Check-In Open</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#095c54]">
                    Submit Geo-Tagged Volunteer Check-In
                  </h3>
                  <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                    Your live GPS coordinates are verified to ensure you are within <strong>150 meters</strong> of the cleanliness drive spot. Your check-in will then be sent to your respective Community Head for final <strong>Present</strong> confirmation.
                  </p>
                </div>

                {/* Target Venue & Active Window Card */}
                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2">
                  <div className="text-xs font-black text-[#0f2925] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#095c54]" />
                    <span>Assigned Drive Spot &amp; Active Window:</span>
                  </div>
                  <p className="text-xs text-[#1e2925] font-semibold">
                    {selectedDrive.location_name}
                  </p>
                  <p className="text-[11px] text-[#64748b]">
                    Ward: <strong>{selectedDrive.ward_name}</strong> | Allowed Geofence: <strong>≤ 150 meters</strong> | Closes at:{' '}
                    <strong>{new Date(selectedDrive.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </p>
                  {selectedDrive.registered_community_name && (
                    <p className="text-[11px] text-indigo-800 font-bold">
                      Verifying Community Head: <strong>{selectedDrive.registered_community_name}</strong>
                    </p>
                  )}
                </div>

                {/* Status Messages */}
                {attendanceMessage && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{attendanceMessage}</span>
                  </div>
                )}

                {attendanceError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-xs font-bold text-red-900 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span>{attendanceError}</span>
                      {distanceFromDrive !== null && (
                        <p className="text-[11px] text-red-700">
                          Detected Distance: <strong>{distanceFromDrive} meters</strong> (Allowed: ≤ 150m).
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  {!selectedDrive.is_registered ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                      <p className="font-bold">
                        ⚠️ Please register as a volunteer for this drive before marking your attendance.
                      </p>
                      <button
                        onClick={() => initiateRegistration(selectedDrive)}
                        className="btn-primary-custom py-2 px-4 text-xs font-bold rounded-xl"
                      >
                        Register for this Drive
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={verifyingAttendance}
                      onClick={handleMarkAttendance}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#095c54] text-white text-xs font-black hover:bg-[#074741] shadow-lg shadow-[#095c54]/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>
                        {verifyingAttendance
                          ? 'Verifying Geo-Tagged GPS Location...'
                          : 'Verify Live GPS & Submit Check-In'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN DRIVES LIST OVERVIEW (GRID VIEW)
  // =========================================================================
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

        {/* Search & Ward Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'gu' ? 'ડ્રાઇવ શોધો...' : lang === 'hi' ? 'ड्राइव खोजें...' : 'Search drives, areas, or organizers...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none bg-[#f8faf9]"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs (All / Joint Community / Single Community) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDriveFilter('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 ${
            driveFilter === 'all'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>All Cleanliness Drives</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${driveFilter === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>
            {drives.length}
          </span>
        </button>

        <button
          onClick={() => setDriveFilter('joint')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 ${
            driveFilter === 'joint'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>🤝 Joint Community Drives</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${driveFilter === 'joint' ? 'bg-white/20' : 'bg-slate-100'}`}>
            {drives.filter(d => d.is_joint).length}
          </span>
        </button>

        <button
          onClick={() => setDriveFilter('single')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 ${
            driveFilter === 'single'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-teal-300" />
          <span>🏛️ Single Community Drives</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${driveFilter === 'single' ? 'bg-white/20' : 'bg-slate-100'}`}>
            {drives.filter(d => !d.is_joint).length}
          </span>
        </button>
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
                className="rounded-3xl border border-[#e2e8f0] bg-white shadow-xs hover:shadow-md hover:border-[#b8e0d7] transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-100">
                    <img src={d.banner_url} alt={d.title} className="w-full h-full object-cover" />
                    
                    {/* Top Left Badge: Joint vs Single Community Drive */}
                    <div className="absolute top-3 left-3">
                      {d.is_joint ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                          <Users className="w-3 h-3" /> Joint Community Drive
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-800 text-white shadow-xs flex items-center gap-1">
                          <Building className="w-3 h-3" /> Community Drive
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#095c54] text-white shadow-xs">
                        {d.ward_name}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-2.5">
                    <h3 className="font-extrabold text-sm text-[#095c54] leading-snug">
                      {d.title}
                    </h3>

                    {/* Organizer / Joint Collaboration line */}
                    {d.is_joint && d.co_organisers && d.co_organisers.length > 0 ? (
                      <div className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">Joint: {d.co_organisers.join(' + ')}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Organized by {d.organiser_name}</span>
                      </div>
                    )}

                    <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>

                    {/* Officer Action Plan preview if present */}
                    {d.action_plan && (
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-950 font-medium line-clamp-2">
                        📋 <strong>Action Plan:</strong> {d.action_plan}
                      </div>
                    )}

                    {/* Community Citizen Instructions preview */}
                    {d.citizen_instructions && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 font-medium line-clamp-2">
                        📋 <strong>Instructions:</strong> {d.citizen_instructions}
                      </div>
                    )}

                    {/* Necessary Volunteer Gears preview */}
                    {d.necessary_gears && d.necessary_gears.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Necessary Gears:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {d.necessary_gears.map((g, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-100">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-[#64748b] space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                        <span className="truncate">{d.location_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                        <span>
                          {new Date(d.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(d.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {new Date(d.end_time || d.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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

                {/* Card Action: Take Part in Drive / View Details */}
                <div className="p-4 sm:p-5 pt-0">
                  {d.is_registered ? (
                    <div className="space-y-2">
                      <div className="w-full py-2.5 rounded-xl bg-[#ecfdf5] text-[#047857] text-xs font-extrabold flex items-center justify-center gap-1.5 border border-[#a7f3d0]">
                        <Check className="w-3.5 h-3.5" /> Registered Volunteer {d.registered_community_name ? `with ${d.registered_community_name}` : ''}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDrive(d);
                          setActiveTab('info');
                        }}
                        className="w-full py-2 rounded-xl text-xs font-bold text-[#095c54] hover:bg-[#e6f4f1] transition border border-[#b8e0d7] touch-press flex items-center justify-center gap-1.5"
                      >
                        <span>{t.view_details}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => initiateRegistration(d)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-[#095c54] hover:bg-[#074741] shadow-sm transition flex items-center justify-center gap-1.5 touch-press"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Take Part in Drive</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDrive(d);
                          setActiveTab('info');
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                        title="View Full Details"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. JOINT DRIVE COMMUNITY SELECTION MODAL */}
      {jointModalDrive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Collaborative Joint Drive · Ward {jointModalDrive.ward_name || ''}
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  Choose Your Community Team
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {jointModalDrive.title}
                </p>
              </div>
              <button
                onClick={() => setJointModalDrive(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation */}
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 leading-relaxed">
              <strong className="block mb-0.5 text-teal-950 font-bold">Pick the community team you wish to volunteer with:</strong>
              This cleanliness drive is jointly hosted by multiple communities. Each community team has a quota of up to <strong>{jointModalDrive.max_volunteers_per_community || 25} volunteers</strong>. Select your preferred team:
            </div>

            {actionError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Community Teams List */}
            <div className="space-y-2.5">
              {(() => {
                const teams = jointModalDrive.assigned_communities && jointModalDrive.assigned_communities.length > 0
                  ? jointModalDrive.assigned_communities
                  : (jointModalDrive.co_organisers || []).map((name, i) => ({
                      id: `ac-${i}`,
                      community_id: `c-${i}`,
                      community_name: name,
                      head_name: undefined
                    }));

                const maxPerComm = jointModalDrive.max_volunteers_per_community || 25;

                return teams.map((team, idx) => {
                  const registeredCount = jointModalDrive.community_volunteer_counts?.[team.community_id] || 0;
                  const isFull = registeredCount >= maxPerComm;
                  const isSelected = selectedTeamCommId === team.community_id;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!isFull) {
                          setSelectedTeamCommId(team.community_id);
                          setSelectedTeamCommName(team.community_name);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isFull
                          ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                            isSelected
                              ? 'border-[#095c54] bg-[#095c54]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-[#095c54]" />
                            {team.community_name}
                          </h4>
                          {team.head_name && (
                            <p className="text-[11px] text-slate-500">
                              Led by {team.head_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isFull ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                            Team Full ({registeredCount}/{maxPerComm})
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                            {registeredCount} / {maxPerComm} spots
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setJointModalDrive(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTeamCommId}
                onClick={() => {
                  if (selectedTeamCommId && jointModalDrive) {
                    handleRegister(jointModalDrive.id, selectedTeamCommId, selectedTeamCommName);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#095c54] text-white font-bold text-xs sm:text-sm hover:bg-[#074741] transition disabled:opacity-50 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirm Registration with {selectedTeamCommName || 'Team'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
