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
  MessageSquare,
  RefreshCw,
  UserCheck,
  UserX,
  Flame
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'upcoming' | 'registered' | 'completed'>('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Selected Drive for Full-Page View (Not a modal!)
  const [selectedDrive, setSelectedDrive] = useState<CleanlinessDrive | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'organizer' | 'attendance'>('info');

  // Citizen Question & Official Replies state
  const [citizenQuestion, setCitizenQuestion] = useState<string>('');
  const [askingQuestion, setAskingQuestion] = useState<boolean>(false);
  const [questionSentMessage, setQuestionSentMessage] = useState<string>('');
  const [driveQuestions, setDriveQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  const fetchDriveQuestions = async (driveId: string) => {
    setLoadingQuestions(true);
    try {
      const res = await api.getDriveQuestions(driveId);
      setDriveQuestions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDriveQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (selectedDrive?.id) {
      fetchDriveQuestions(selectedDrive.id);
    } else {
      setDriveQuestions([]);
    }
  }, [selectedDrive?.id]);

  // Attendance state
  const [verifyingAttendance, setVerifyingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string>('');
  const [attendanceError, setAttendanceError] = useState<string>('');
  const [distanceFromDrive, setDistanceFromDrive] = useState<number | null>(null);

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

  const handleRegister = async (driveId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.registerForDrive(driveId);
      setActionSuccess(res.message);
      if (selectedDrive && selectedDrive.id === driveId) {
        setSelectedDrive({
          ...selectedDrive,
          is_registered: true,
          registered_volunteers_count: selectedDrive.registered_volunteers_count + 1
        });
      }
      setDrives(prev => prev.map(d => d.id === driveId ? { ...d, is_registered: true, registered_volunteers_count: d.registered_volunteers_count + 1 } : d));
      await fetchDrives();
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
      if (selectedDrive && selectedDrive.id === driveId) {
        setSelectedDrive({
          ...selectedDrive,
          is_registered: false,
          registered_volunteers_count: Math.max(0, selectedDrive.registered_volunteers_count - 1)
        });
      }
      setDrives(prev => prev.map(d => d.id === driveId ? { ...d, is_registered: false, registered_volunteers_count: Math.max(0, d.registered_volunteers_count - 1) } : d));
      await fetchDrives();
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
      setQuestionSentMessage('Your question has been sent directly to the Community Head! Check below once they reply.');
      setCitizenQuestion('');
      await fetchDriveQuestions(selectedDrive.id);
      setTimeout(() => setQuestionSentMessage(''), 4000);
    } catch (err: any) {
      alert(`Error submitting question: ${err.message}`);
    } finally {
      setAskingQuestion(false);
    }
  };

  // Live Location Verification & Attendance Marker
  const handleMarkAttendance = () => {
    if (!selectedDrive) return;
    setAttendanceError('');
    setAttendanceMessage('');
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
              `⚠️ Location Verification Failed: You are currently ${Math.round(
                distanceMeters
              )}m away from the drive location (${selectedDrive.location_name}). You must be within ${MAX_DISTANCE_METERS}m of the assembly site to mark attendance.`
            );
            setVerifyingAttendance(false);
            return;
          }

          // Within 150m! Proceed with recording attendance
          const res = await api.markCitizenDriveAttendance(selectedDrive.id, userLat, userLng);
          setAttendanceMessage(res.message || '✓ Attendance verified and officially recorded!');
          setSelectedDrive({
            ...selectedDrive,
            attendance_status: 'present',
            attended: true
          });
          fetchDrives();
        } catch (err: any) {
          setAttendanceError(err.message || 'Failed to verify attendance');
        } finally {
          setVerifyingAttendance(false);
        }
      },
      err => {
        setVerifyingAttendance(false);
        setAttendanceError(`GPS Error (${err.message}). Please allow location access to verify attendance.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getDriveLifecycleStatus = (d: CleanlinessDrive): 'running' | 'upcoming' | 'completed' => {
    const now = new Date();
    const start = new Date(d.start_time);
    const end = new Date(d.end_time);
    if (d.status === 'completed' || (d as any).status === 'completed' || now > end) return 'completed';
    if (d.status === 'ongoing' || (d as any).status === 'in_progress' || (now >= start && now <= end)) return 'running';
    return 'upcoming';
  };

  const isRegistrationClosed = (d: CleanlinessDrive): boolean => {
    const now = new Date();
    const regDeadline = d.registration_deadline ? new Date(d.registration_deadline) : new Date(d.start_time);
    return (
      (d as any).registration_status === 'closed' ||
      (d as any).registration_status === 'not_open' ||
      d.status === 'completed' ||
      now > regDeadline ||
      (d.max_volunteers > 0 && d.registered_volunteers_count >= d.max_volunteers)
    );
  };

  const filtered = drives.filter(d => {
    const lifeStatus = getDriveLifecycleStatus(d);
    if (statusFilter === 'running' && lifeStatus !== 'running') return false;
    if (statusFilter === 'upcoming' && lifeStatus !== 'upcoming') return false;
    if (statusFilter === 'completed' && lifeStatus !== 'completed') return false;
    if (statusFilter === 'registered' && !d.is_registered) return false;

    if (selectedWard !== 'all' && !d.ward_name.includes(selectedWard)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.location_name.toLowerCase().includes(q);
    }
    return true;
  });

  // Check if scheduled date has arrived for attendance unlocking
  const isDriveDateArrived = (startTimeStr: string) => {
    try {
      const driveDate = new Date(startTimeStr);
      const today = new Date();
      // Set to midnight for date-level comparison
      driveDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return today.getTime() >= driveDate.getTime();
    } catch {
      return false;
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

    const isDateUnlocked = isDriveDateArrived(selectedDrive.start_time);
    const isAttended = selectedDrive.attendance_status === 'present' || selectedDrive.attended;

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
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${selectedDrive.status === 'completed'
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
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-400" />
                {activeOrganizer.org_name}
              </span>
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
                  {new Date(selectedDrive.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
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
                  Registered volunteers earn official participation status upon verification
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedDrive.is_registered ? (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2.5 rounded-2xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5 border border-emerald-300">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Registered Volunteer</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelRegistration(selectedDrive.id)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (selectedDrive as any).registration_status === 'closed' ||
                (selectedDrive as any).registration_status === 'not_open' ||
                selectedDrive.status === 'completed' ||
                (selectedDrive.max_volunteers > 0 && selectedDrive.registered_volunteers_count >= selectedDrive.max_volunteers) ? (
                <div className="px-5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-500" />
                  <span>
                    {selectedDrive.status === 'completed'
                      ? 'Drive Completed'
                      : selectedDrive.registered_volunteers_count >= selectedDrive.max_volunteers
                        ? `Registration Full (${selectedDrive.registered_volunteers_count}/${selectedDrive.max_volunteers})`
                        : 'Registration Closed by Organizer'}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRegister(selectedDrive.id)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-[#095c54] hover:bg-[#074741] shadow-lg shadow-[#095c54]/20 transition flex items-center justify-center gap-2"
                >
                  <span>Confirm & Register as Volunteer</span>
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
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${activeTab === 'info'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-[#64748b] hover:bg-slate-100'
              }`}
          >
            <Info className="w-4 h-4" />
            <span>Drive Overview & Kit</span>
          </button>

          <button
            onClick={() => setActiveTab('organizer')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${activeTab === 'organizer'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-[#64748b] hover:bg-slate-100'
              }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Organizer Info & Q&A</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${activeTab === 'attendance'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-[#64748b] hover:bg-slate-100'
              }`}
          >
            {selectedDrive.requires_attendance === false || selectedDrive.is_nmc_official_drive === true ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : !selectedDrive.is_registered ? (
              <Lock className="w-4 h-4 text-slate-400" />
            ) : isDateUnlocked ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-500" />
            )}
            <span>
              {selectedDrive.requires_attendance === false || selectedDrive.is_nmc_official_drive === true
                ? 'Rally Attendance (Waived)'
                : 'Volunteer Attendance'}
            </span>
            {!selectedDrive.is_registered ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-extrabold hidden sm:inline">
                Registered Only
              </span>
            ) : !isDateUnlocked ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold hidden sm:inline">
                Locked
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

                {questionSentMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{questionSentMessage}</span>
                  </div>
                )}

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
              </div>

              {/* Citizen Questions & Official Community Head Replies */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-[#0f2925] uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#095c54]" />
                    <span>Questions &amp; Official Organizer Replies ({driveQuestions.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => fetchDriveQuestions(selectedDrive.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingQuestions ? 'animate-spin text-[#095c54]' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingQuestions ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-semibold">
                    Loading questions &amp; replies...
                  </div>
                ) : driveQuestions.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                    No questions asked yet for this drive. Have a doubt? Ask the Community Head above!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {driveQuestions.map((q: any) => {
                      const replyText = q.response_text || q.response?.response_text;
                      const replyAuthor = q.responder_name || q.response?.responder_name || 'Community Head';
                      const replyTime = q.answered_at || q.response?.created_at;
                      const isAnswered = q.status === 'answered' || Boolean(replyText);

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-[#095c54]">
                                  {q.citizen_name || 'Citizen Volunteer'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {q.created_at ? new Date(q.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-900 mt-1">
                                Q: {q.question_text}
                              </p>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${isAnswered
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                            >
                              {isAnswered ? 'Answered' : 'Awaiting Reply'}
                            </span>
                          </div>

                          {replyText ? (
                            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Official Reply · {replyAuthor}</span>
                                </span>
                                {replyTime && (
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    {new Date(replyTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                {replyText}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">
                              Sent to the Community Head — official answer will appear here shortly.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Volunteer Attendance (Accessible ONLY to registered volunteers on drive date) */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {selectedDrive.requires_attendance === false || selectedDrive.is_nmc_official_drive === true ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 bg-emerald-50/40 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-[#095c54] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-[#095c54] bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Public Awareness Rally
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#0f2925] mt-2">
                    🏛️ Official NMC Civic Rally &amp; Public Campaign
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    This is an official public awareness march &amp; civic rally organized by Navsari Municipal Corporation.
                    <strong> No duty attendance check-in or GPS coordinate logging is required</strong> — all citizens, families, and volunteer groups are welcome to participate freely!
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-emerald-200 text-xs text-emerald-950 font-bold inline-block">
                  📍 Route / Assembly: {selectedDrive.location_name}
                </div>
              </div>
            ) : !selectedDrive.is_registered ? (
              // LOCKED: CITIZEN HAS NOT REGISTERED FOR THIS DRIVE
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0f2925]">
                    Attendance Restricted: Registered Volunteers Only
                  </h3>
                  <p className="text-xs text-[#64748b] max-w-md mx-auto mt-1 leading-relaxed">
                    You cannot access the volunteer attendance check-in because you have not registered for this drive. Attendance is exclusively accessible to confirmed registered volunteers on event day.
                  </p>
                </div>

                {!isRegistrationClosed(selectedDrive) ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleRegister(selectedDrive.id)}
                      className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-[#095c54] hover:bg-[#074741] transition shadow-md inline-flex items-center gap-2"
                    >
                      <span>Register as Volunteer Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Registration Closed for this Drive</span>
                  </div>
                )}
              </div>
            ) : !isDateUnlocked ? (
              // LOCKED: REGISTERED VOLUNTEER BUT EVENT DATE HAS NOT ARRIVED
              <div className="bg-white p-8 rounded-3xl border border-amber-200 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0f2925]">
                    Attendance Tab is Locked Until Event Day
                  </h3>
                  <p className="text-xs text-[#64748b] max-w-md mx-auto mt-1 leading-relaxed">
                    Registered volunteers can only access attendance check-in strictly on the day of the drive (
                    <strong className="text-[#095c54]">
                      {new Date(selectedDrive.start_time).toLocaleDateString([], {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </strong>
                    ).
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2 text-xs">
                  <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-amber-700" />
                    <span>How Attendance Works on Event Day:</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-amber-800 text-[11px]">
                    <li>Arrive in person at the assembly location ({activeOrganizer.meeting_spot}).</li>
                    <li>Open this tab on your mobile device.</li>
                    <li>Click <strong>"Verify Live GPS & Mark Attendance"</strong>.</li>
                    <li>Your device coordinates are validated against the venue (must be within 150 meters).</li>
                    <li>Receive official NMC Drive Certificate upon verification!</li>
                  </ol>
                </div>
              </div>
            ) : isAttended ? (
              // ALREADY PRESENT / VERIFIED STATE
              <div className="bg-white p-8 rounded-3xl border border-emerald-200 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-900">
                    Attendance Verified & Recorded!
                  </h3>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1 leading-relaxed">
                    You have successfully checked in for this cleanliness drive. Thank you for your active civic participation!
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 border border-emerald-300 text-xs font-black text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Official Attendance Recorded: PRESENT (GPS Verified)</span>
                </div>
              </div>
            ) : (selectedDrive.status === 'completed' || new Date() > new Date(selectedDrive.end_time)) ? (
              // DRIVE COMPLETED BUT NOT ATTENDED: AUTOMATICALLY MARKED ABSENT
              <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
                  <UserX className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900">
                    Drive Concluded — Marked Absent
                  </h3>
                  <p className="text-xs text-rose-700 max-w-md mx-auto mt-1 leading-relaxed">
                    This cleanliness drive has completed. You were registered as a volunteer, but live GPS check-in was not recorded during event hours. Your participation status has been automatically recorded as <strong>Absent</strong>.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-black text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Attendance Status: ABSENT</span>
                </div>
              </div>
            ) : (
              // UNLOCKED: DRIVE DATE ARRIVED, PROCEED TO VERIFY GPS LOCATION
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Event Day Active — Check-in Open</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#095c54]">
                    Mark Volunteer Attendance via GPS
                  </h3>
                  <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                    To prevent fraudulent check-ins and ensure authenticity, attendance is validated against your live GPS location. You must be physically present within 150 meters of the drive locus.
                  </p>
                </div>

                {/* Target Venue Card */}
                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2">
                  <div className="text-xs font-black text-[#0f2925] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#095c54]" />
                    <span>Assigned Venue Locus:</span>
                  </div>
                  <p className="text-xs text-[#1e293b] font-semibold">
                    {selectedDrive.location_name}
                  </p>
                  <p className="text-[11px] text-[#64748b]">
                    Ward: <strong>{selectedDrive.ward_name}</strong> | Maximum Geofence Radius: <strong>150 meters</strong>
                  </p>
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
                        onClick={() => handleRegister(selectedDrive.id)}
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
                      <span>{verifyingAttendance ? 'Verifying GPS Location...' : 'Verify Live Location & Mark Attendance'}</span>
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

      {/* Drive Status Filter Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Drives', count: drives.length },
          { id: 'running', label: 'Running Now', count: drives.filter(d => getDriveLifecycleStatus(d) === 'running').length },
          { id: 'upcoming', label: 'Upcoming', count: drives.filter(d => getDriveLifecycleStatus(d) === 'upcoming').length },
          { id: 'registered', label: 'Registered', count: drives.filter(d => d.is_registered).length },
          { id: 'completed', label: 'Completed', count: drives.filter(d => getDriveLifecycleStatus(d) === 'completed').length }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${statusFilter === tab.id
              ? 'bg-[#095c54] text-white border-[#095c54] shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {tab.id === 'running' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-[#64748b]">{t.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] text-xs text-[#64748b]">{t.empty}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const percentFilled = Math.min(100, Math.round((d.registered_volunteers_count / d.max_volunteers) * 100));
            const lifeStatus = getDriveLifecycleStatus(d);
            const regClosed = isRegistrationClosed(d);

            return (
              <div
                key={d.id}
                className="rounded-3xl border border-[#e2e8f0] bg-white shadow-xs hover:shadow-md hover:border-[#b8e0d7] transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-100">
                    <img src={d.banner_url} alt={d.title} className="w-full h-full object-cover" />

                    {/* Top Left: Drive Lifecycle & Registered Status Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {lifeStatus === 'running' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-xs flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          Running Now
                        </span>
                      )}
                      {lifeStatus === 'upcoming' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-600 text-white shadow-xs">
                          Upcoming
                        </span>
                      )}
                      {lifeStatus === 'completed' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-700 text-white shadow-xs">
                          Completed
                        </span>
                      )}
                      {d.is_registered && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                          Registered
                        </span>
                      )}
                      {(d.is_nmc_official_drive || d.requires_attendance === false) && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-xs">
                          🏛️ NMC Rally
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

                    {/* Registration Status Indicator */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-bold text-slate-500">
                        Registration:
                      </span>
                      {regClosed ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-rose-500" />
                          <span>{lifeStatus === 'completed' ? 'Drive Concluded' : 'Registration Closed'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Registration Open</span>
                        </span>
                      )}
                    </div>

                    {/* Volunteer Progress Bar */}
                    <div className="pt-1">
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

                {/* Card Action: View Details or Register */}
                <div className="p-4 sm:p-5 pt-0">
                  {d.is_registered ? (
                    <div className="space-y-2">
                      <div className="w-full py-2 rounded-xl bg-[#ecfdf5] text-[#047857] text-xs font-extrabold flex items-center justify-center gap-1.5 border border-[#a7f3d0]">
                        <Check className="w-3.5 h-3.5" /> Registered Volunteer
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
                  ) : regClosed ? (
                    <div className="space-y-2">
                      <div className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lifeStatus === 'completed' ? 'Drive Concluded' : 'Registration Closed'}</span>
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
                    <button
                      onClick={() => {
                        setSelectedDrive(d);
                        setActiveTab('info');
                      }}
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
    </div>
  );
};
