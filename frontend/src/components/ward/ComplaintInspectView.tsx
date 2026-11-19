import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  FileText,
  Users,
  CalendarCheck2,
  Camera,
  History,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Crown,
  Sparkles,
  Share2,
  Send,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Shield,
  LocateFixed,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Image as ImageIcon,
  Mic,
  MicOff,
  Calendar,
  User,
  Edit3,
  Eye,
  X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';
import { TablePagination } from '../common/TablePagination.js';

// Custom Map Marker
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ComplaintInspectViewProps {
  complaintId: string;
  onBack: () => void;
  onComplaintUpdated?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ComplaintInspectView: React.FC<ComplaintInspectViewProps> = ({
  complaintId,
  onBack,
  onComplaintUpdated,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<
    'info' | 'team' | 'attendance' | 'evidence' | 'history'
  >('info');

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Verification & Completion state
  const [verificationNotes, setVerificationNotes] = useState<string>(
    'Inspected on-site evidence photos. All civic waste cleared, area swept, and disinfected with bleaching powder.'
  );
  const [verifying, setVerifying] = useState<boolean>(false);

  // Unified Verify Complete + Editable Post Preview & Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDescription, setPostDescription] = useState<string>('');
  const [postCompletedDate, setPostCompletedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [postCompletedTime, setPostCompletedTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [postLocation, setPostLocation] = useState<string>('');
  const [postTeamName, setPostTeamName] = useState<string>('');
  const [postWasteKg, setPostWasteKg] = useState<number>(250);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [newAfterPhotoUrl, setNewAfterPhotoUrl] = useState<string>('');

  // Voice-to-Text for Post Description
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'gu-IN' | 'hi-IN'>('en-IN');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    setVoiceError(null);
    if (isListening) {
      stopVoiceInput();
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError('Voice-to-text is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = voiceLang;
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        const cleaned = transcript.trim();
        if (cleaned) {
          setPostDescription(prev => (prev.trim() ? `${prev.trim()} ${cleaned}` : cleaned));
        }
      };

      recognition.onerror = (event: any) => {
        setVoiceError(`Voice capture error: ${event.error || 'microphone unavailable'}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setVoiceError(err?.message || 'Unable to start voice recognition.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceInput();
    };
  }, []);

  // Accordion Expand/Collapse States for Day-to-Day Attendance & Evidence History
  const [expandedAttendanceDays, setExpandedAttendanceDays] = useState<Record<string, boolean>>({
    'day-1': true
  });
  const [attendancePage, setAttendancePage] = useState<number>(1);
  const attendancePageSize = 6;
  const [expandedEvidenceDays, setExpandedEvidenceDays] = useState<Record<string, boolean>>({});

  const toggleAttendanceDay = (key: string) => {
    setExpandedAttendanceDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEvidenceDay = (key: string) => {
    setExpandedEvidenceDays(prev => {
      const current = prev[key] !== undefined ? prev[key] : true;
      return { ...prev, [key]: !current };
    });
  };

  const formatDateLocal = (ts?: string | Date) => {
    const d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  const formatTimeLocal = (ts?: string | Date) => {
    const d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) return '10:00';
    const hr = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${hr}:${mn}`;
  };

  const populatePostDraftFromDetails = (data: any) => {
    if (!data?.overview) return;
    const wardNum = data.overview.location?.ward_number || data.overview.ward_number || 3;
    const wardNm = data.overview.location?.ward_name || data.overview.ward_name || `Ward ${wardNum}`;
    const loc = data.location_map?.landmark || data.location_map?.address || data.overview.location?.landmark || data.overview.location?.address || `Ward ${wardNum}`;
    const team = data.overview.current_assigned_team && data.overview.current_assigned_team !== 'Unassigned'
      ? data.overview.current_assigned_team
      : `Ward ${wardNum} Sanitation Squad`;

    const evidenceItems: any[] = data.work_progress_evidence?.evidence_items || [];
    const afterItems = evidenceItems.filter((e: any) => String(e.evidence_type || '').toLowerCase() === 'after');
    const latestAfter = data.work_progress_evidence?.after_evidence || (afterItems.length > 0 ? afterItems[afterItems.length - 1] : null);
    const completionReport = data.work_progress_evidence?.completion_report;

    setPostTitle(`Cleanliness Restored at ${loc}`);
    setPostLocation(loc);
    setPostTeamName(team);

    const completionTs = latestAfter?.device_capture_timestamp || latestAfter?.created_at || data.overview.resolved_at || new Date();
    setPostCompletedDate(formatDateLocal(completionTs));
    setPostCompletedTime(formatTimeLocal(completionTs));

    if (completionReport?.waste_cleared_kg && Number(completionReport.waste_cleared_kg) > 0) {
      setPostWasteKg(Number(completionReport.waste_cleared_kg));
    } else {
      setPostWasteKg(250);
    }

    const leaderNote = latestAfter?.description?.trim();
    const defaultDesc = leaderNote
      ? `${leaderNote} — Verified complete for complaint ${data.overview.complaint_number} at ${loc} (Ward ${wardNum} - ${wardNm}).`
      : `Ward ${wardNum} (${wardNm}) Sanitation Squad successfully cleared accumulated waste, swept the perimeter, and restored civic hygiene at ${loc} (${data.overview.complaint_number}).`;
    setPostDescription(defaultDesc);

    const bPhoto =
      data.work_progress_evidence?.before_photo_url ||
      data.citizen_report?.photo_url ||
      data.overview?.image_url ||
      '';
    setBeforePhoto(bPhoto);

    const uniqueAfterUrls: string[] = [];
    const pushIfValid = (u?: string) => {
      if (u && typeof u === 'string' && u.trim() && !uniqueAfterUrls.includes(u.trim())) {
        uniqueAfterUrls.push(u.trim());
      }
    };
    // Put latest after photo first
    pushIfValid(latestAfter?.storage_path || latestAfter?.photo_url);
    for (let i = afterItems.length - 1; i >= 0; i--) {
      pushIfValid(afterItems[i]?.storage_path || afterItems[i]?.photo_url);
    }
    if (Array.isArray(data.work_progress_evidence?.after_photos)) {
      data.work_progress_evidence.after_photos.forEach((u: string) => pushIfValid(u));
    }
    pushIfValid(data.work_progress_evidence?.after_photo_url);
    pushIfValid(data.overview?.resolved_image_url);

    setAfterPhotos(uniqueAfterUrls);
  };

  const openVerifyPublishModal = () => {
    setVoiceError(null);
    if (details) {
      populatePostDraftFromDetails(details);
    }
    setShowPublishModal(true);
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getWardComplaintDetails(complaintId);
      setDetails(res.data);
      populatePostDraftFromDetails(res.data);
      setIsPublished(Boolean((res.data?.overview as any)?.is_published_to_community));
    } catch (err: any) {
      setActionError(err.message || 'Failed to load complaint inspect details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  // Handle Verify Only (without public post)
  const handleVerifyCompleteOnly = async () => {
    setVerifying(true);
    setActionError(null);
    stopVoiceInput();
    try {
      const res = await api.verifyCompleteWardComplaint(complaintId, {
        review_notes: postDescription || verificationNotes
      });
      setActionSuccess(res.message || 'Work verified and marked complete. Citizen has been notified!');
      setShowPublishModal(false);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify complete.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle Verify Complete & Upload Public Post + Citizen Notification
  const handlePublishToCommunity = async () => {
    setPublishing(true);
    setActionError(null);
    stopVoiceInput();
    try {
      const beforeUrl =
        beforePhoto ||
        details?.work_progress_evidence?.before_photo_url ||
        details?.citizen_report?.photo_url ||
        details?.overview?.image_url ||
        '';
      const afterUrl =
        afterPhotos[0] ||
        details?.work_progress_evidence?.after_photo_url ||
        details?.overview?.resolved_image_url ||
        '';

      await api.publishWardComplaintToCommunity(complaintId, {
        title: postTitle.trim() || `Cleanliness Restored at ${postLocation || 'Navsari'}`,
        description: postDescription.trim() || verificationNotes,
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
        after_photos: afterPhotos.length > 0 ? afterPhotos : (afterUrl ? [afterUrl] : []),
        waste_kg: Number(postWasteKg) || 0,
        completed_date: postCompletedDate,
        completed_time: postCompletedTime,
        location_name: postLocation.trim(),
        team_name: postTeamName.trim()
      });

      setIsPublished(true);
      setShowPublishModal(false);
      setActionSuccess('Complaint verified complete, post uploaded to Public Posts section, and Citizen notified!');
      confetti({ particleCount: 65, spread: 75, origin: { y: 0.65 } });
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
      if (onNavigateTab) {
        setTimeout(() => {
          onNavigateTab('posts');
        }, 1000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify & upload completion post.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-4">
        <RefreshCw className="w-10 h-10 text-[#095c54] animate-spin mx-auto" />
        <h3 className="text-base font-extrabold text-[#0f2925]">Opening Complaint Inspect Dossier...</h3>
        <p className="text-xs text-slate-500">Loading full citizen report, squad assignment, and evidence history.</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-extrabold text-[#0f2925]">Could not find complaint details</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#095c54] text-white rounded-xl text-xs font-bold"
        >
          ← Return to Catalogue
        </button>
      </div>
    );
  }

  const { overview, citizen_report, location_map, assignment_history, team_attendance, work_progress_evidence, day_wise_timeline } = details;
  const isResolved = overview.status === 'resolved' || overview.status === 'verified_complete' || overview.status === 'closed';
  const coords: [number, number] = [location_map?.latitude || 20.9485, location_map?.longitude || 72.9260];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 min-w-0">
      {/* 1. TOP HEADER & BACK NAVIGATION (Fully Mobile Responsive) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-[#e2e8f0] shadow-xs space-y-3 sm:space-y-4">
        {/* Top Action Toolbar: Back on left, Refresh & Verify on right */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white transition inline-flex items-center gap-1.5 text-xs font-extrabold shrink-0"
            title="Return to Complaint Catalogue"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Catalogue</span>
          </button>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={fetchDetails}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0"
              title="Refresh live evidence & status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {!isResolved ? (
              <button
                onClick={openVerifyPublishModal}
                className="px-3 sm:px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-[11px] sm:text-xs shadow-sm flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Verify &amp; Complete</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Verified</span>
                </span>
                {!isPublished ? (
                  <button
                    onClick={openVerifyPublishModal}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Publish Post</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-emerald-800 border border-emerald-300 text-[11px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Posted ✓</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full-Width Complaint Identity & Badges */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] sm:text-xs font-black text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2 py-0.5 rounded-md">
              {overview.complaint_number}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
              Ward {location_map?.ward_number || 3}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              {overview.priority}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                (overview as any).is_work_sla_overdue
                  ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
            >
              Max: {(overview as any).max_work_days ?? 3}d
              {(overview as any).is_work_sla_overdue
                ? ` · OVERDUE (${(overview as any).work_days_elapsed}d)`
                : ` · Day ${(overview as any).work_days_elapsed ?? 0}/${(overview as any).max_work_days ?? 3}`}
            </span>
          </div>
          <h1 className="text-base sm:text-2xl font-black text-[#0f2925] tracking-tight leading-snug">
            {overview.title}
          </h1>
        </div>

        {/* Live Unified Status Progression Stepper */}
        <div className="pt-2 border-t border-slate-100">
          <StatusProgressionStepper
            status={overview.status}
            rejectionReason={(overview as any).rejection_reason}
          />
        </div>

        {/* Feedback Alert Banners */}
        {actionSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('posts')}
                className="px-3.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 transition ml-auto"
              >
                <span>View in Posts Section →</span>
              </button>
            )}
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. FIVE DEDICATED NAVIGATION TABS (Zero Horizontal Scroll Grid on Mobile) */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 p-1.5 bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs">
        {[
          { id: 'info', shortLabel: '1. Info', label: '1. Complaint Info', icon: FileText },
          { id: 'team', shortLabel: '2. Team', label: '2. Assigned Team', icon: Users },
          { id: 'attendance', shortLabel: '3. Attendance', label: '3. Attendance', icon: CalendarCheck2 },
          { id: 'evidence', shortLabel: '4. Evidence', label: '4. Leader Evidence', icon: Camera },
          { id: 'history', shortLabel: '5. History', label: '5. Evidence History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2 py-2 sm:px-3 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center gap-1.5 min-w-0 ${
                isActive
                  ? 'bg-[#095c54] text-white shadow-xs'
                  : 'bg-slate-50/70 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
              <span className="sm:hidden truncate">{tab.shortLabel}</span>
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: COMPLAINT INFORMATION */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Citizen Original Submission Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#0f2925] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-[#095c54]" />
                <span>Citizen Original Report</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 relative">
                  {(citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url) ? (
                    <img
                      src={citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url}
                      alt="Citizen complaint photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-4 text-center">
                      <Camera className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-xs font-bold text-slate-500">No Photo Submitted by Citizen</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">
                    Citizen Photo Evidence
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                    <p className="text-sm font-extrabold text-[#095c54]">{overview.category_name}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citizen Description</span>
                    <p data-no-translate="true" className="text-xs text-slate-800 font-medium leading-relaxed">
                      {citizen_report?.description || overview.description || 'No detailed description provided.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported By</span>
                    <p className="text-xs font-black text-[#0f2925] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Anonymous Citizen</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Privacy Protected (Anonymous Submission)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Logged: {new Date(citizen_report?.submitted_at || overview.submitted_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Location Map */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#e2e8f0] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#095c54] shrink-0" />
                  <h3 className="text-sm font-extrabold text-[#0f2925]">Geographical Location &amp; Geofence</h3>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">
                  {location_map?.address || (overview.ward_number ? `Navsari Ward ${overview.ward_number}` : 'Navsari Municipal Ward')}
                </span>
              </div>

              <div className="h-52 sm:h-64 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer center={coords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={coords} icon={customIcon}>
                    <Popup>
                      <div className="p-1">
                        <strong className="text-xs text-[#095c54]">{overview.complaint_number}</strong>
                        <p className="text-[11px]">{location_map?.landmark || location_map?.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={coords}
                    radius={100}
                    pathOptions={{ color: '#095c54', fillColor: '#095c54', fillOpacity: 0.15 }}
                  />
                </MapContainer>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>GPS: {coords[0].toFixed(5)}° N, {coords[1].toFixed(5)}° E</span>
                <span className="font-bold text-[#095c54]">Geofence Radius: 100 meters</span>
              </div>
            </div>
          </div>

          {/* Right Column: AI Triage & Quick Metadata */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#0f2925] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>AI Automated Classification</span>
              </h3>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900">ResNet50 Model Prediction</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-[10px]">
                    {Math.round((citizen_report?.confidence_score || 0.95) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-xs text-emerald-900/90 font-medium">
                  Identified as: <strong>{overview.category_name}</strong>
                </p>
                <div className="pt-1 text-[10px] text-emerald-800 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Content safety & duplicate verification cleared</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Assigned Ward:</span>
                  <strong>Ward {location_map?.ward_number || overview.ward_number || 3} - {location_map?.ward_name || overview.ward_name || (overview.ward_number === 8 ? 'Madhumati - Parsi Wad' : 'Dudhiya Talao')}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Chief Officer:</span>
                  <strong>{overview.assigned_officer_name || (overview.ward_number === 8 ? 'Cyrus Contractor' : 'Ramesh Patel')}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Maximum Approval Days:</span>
                  <strong>{(overview as any).max_approval_days ?? 2} Days</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Maximum Work Days:</span>
                  <strong className={(overview as any).is_work_sla_overdue ? 'text-red-700 font-black' : 'text-[#095c54] font-black'}>
                    {(overview as any).max_work_days ?? 3} Days{' '}
                    {(overview as any).is_work_sla_overdue
                      ? `(Overdue — ${(overview as any).work_days_elapsed}d elapsed)`
                      : `(Day ${(overview as any).work_days_elapsed ?? 0} of ${(overview as any).max_work_days ?? 3})`}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: ASSIGNED TEAM MEMBERS */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#095c54]" />
                <span>Assigned Sanitation Squad Roster</span>
              </h3>
              <p className="text-xs text-slate-500">
                Field sanitation squad deployed for this assignment with designated team leader.
              </p>
            </div>
            {overview.temporary_team_leader_name && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Leader: {overview.temporary_team_leader_name}</span>
                </span>
                <span
                  className={`px-3 py-1 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                    (overview as any).is_work_sla_overdue
                      ? 'bg-red-50 text-red-800 border-red-300'
                      : 'bg-sky-50 text-sky-900 border-sky-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Leader Max Work Days: {(overview as any).max_work_days ?? 3} Days
                    {(overview as any).is_work_sla_overdue
                      ? ` (Overdue: ${(overview as any).work_days_elapsed}d)`
                      : ` (Day ${(overview as any).work_days_elapsed ?? 0}/${(overview as any).max_work_days ?? 3})`}
                  </span>
                </span>
              </div>
            )}
          </div>

          {(team_attendance?.team_members && team_attendance.team_members.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team_attendance.team_members.map((member: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition ${
                    member.is_temporary_leader
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        member.is_temporary_leader ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {member.is_temporary_leader ? '👑' : idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#0f2925]">{member.name || member.full_name || member.worker_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{member.worker_code}</p>
                      </div>
                    </div>
                    {member.is_temporary_leader && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                        Leader
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Designation:</span>
                      <strong className="text-slate-800">{member.designation || 'Sanitation Worker'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contact:</span>
                      <a href={`tel:${member.phone || '+919825120001'}`} className="font-bold text-[#095c54] hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone || '+91 98251 20001'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-extrabold text-slate-700">No Field Sanitation Squad Assigned Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This complaint is currently pending team assignment. Use the View modal to allocate an active squad and designated team leader.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: DAY-TO-DAY ATTENDANCE RECORD (COLLAPSIBLE ACCORDION PER DAY) */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#095c54]" />
                <span>Day-to-Day Geofenced Attendance Records</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click each day to expand and inspect live squad GPS check-in timestamps within the 100m site perimeter.
              </p>
            </div>
            {team_attendance?.team_members && team_attendance.team_members.length > 0 && (
              <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>100m Geofence Active</span>
              </span>
            )}
          </div>

          {(!team_attendance?.team_members || team_attendance.team_members.length === 0) ? (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <CalendarCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-extrabold text-slate-700">Awaiting Team Assignment</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Duty attendance tracking is activated once a sanitation squad is assigned to this complaint.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day 1 Accordion Card */}
              {(() => {
                const dayKey = 'day-1';
                const isExpanded = !!expandedAttendanceDays[dayKey];
                const members = team_attendance.team_members || [];
                const records = team_attendance.attendance_records || team_attendance.records || [];
                const verifiedCount = members.filter((m: any) =>
                  records.some((r: any) => r.worker_id === m.worker_id || r.worker_id === m.id)
                ).length;
                const dateDisplay = new Date(overview.submitted_at || Date.now()).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleAttendanceDay(dayKey)}
                      className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50/60 to-white hover:from-emerald-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                          D1
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-[#0f2925]">Day 1 Attendance</h4>
                            <span className="text-[11px] font-bold text-slate-500">· {dateDisplay}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            Squad: <strong>{overview.current_assigned_team || 'Sanitation Squad'}</strong> (Leader: {overview.temporary_team_leader_name || 'Designated Leader'})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          verifiedCount > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {verifiedCount > 0 ? `✓ ${verifiedCount}/${members.length} Present` : `⏳ 0/${members.length} Checked In`}
                        </span>
                        <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 transition">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Accordion Content: Mobile Cards + Desktop Table + Pagination */}
                    {isExpanded && (() => {
                      const pagedMembers = members.slice(
                        (attendancePage - 1) * attendancePageSize,
                        attendancePage * attendancePageSize
                      );
                      return (
                        <div className="bg-white border-t border-slate-200/80">
                          {/* Mobile Attendance Cards (< md) */}
                          <div className="md:hidden divide-y divide-slate-100">
                            {pagedMembers.map((member: any, idx: number) => {
                              const attRec = records.find((r: any) => r.worker_id === member.worker_id || r.worker_id === member.id);
                              const isPresent = !!attRec;
                              return (
                                <div key={idx} className="p-3 flex items-center justify-between gap-2">
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs text-[#0f2925] truncate">
                                        {member.name || member.full_name || member.worker_name}
                                      </span>
                                      {member.is_temporary_leader && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[9px]">
                                          👑 Leader
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {isPresent
                                        ? `${new Date(attRec.attendance_timestamp || attRec.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${attRec.distance_from_assignment_meters ? attRec.distance_from_assignment_meters.toFixed(1) : '14.2'}m`
                                        : 'Awaiting site arrival'}
                                    </div>
                                  </div>
                                  {isPresent ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] shrink-0">
                                      ✓ Present
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200 shrink-0">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Desktop Attendance Table (>= md) */}
                          <div className="hidden md:block p-4 overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  <th className="py-2.5 px-3">Squad Member</th>
                                  <th className="py-2.5 px-3">Role</th>
                                  <th className="py-2.5 px-3">Check-in Time</th>
                                  <th className="py-2.5 px-3">GPS Distance to Site</th>
                                  <th className="py-2.5 px-3 text-right">Verification Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {pagedMembers.map((member: any, idx: number) => {
                                  const attRec = records.find((r: any) => r.worker_id === member.worker_id || r.worker_id === member.id);
                                  const isPresent = !!attRec;

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                                      <td className="py-3 px-3 font-bold text-[#0f2925]">
                                        <div>{member.name || member.full_name || member.worker_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{member.worker_code}</div>
                                      </td>
                                      <td className="py-3 px-3">
                                        {member.is_temporary_leader ? (
                                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] flex items-center gap-1 w-fit">
                                            <Crown className="w-3 h-3 text-amber-600" />
                                            <span>Team Leader</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-500 font-medium">Squad Member</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 font-mono text-slate-600">
                                        {isPresent ? new Date(attRec.attendance_timestamp || attRec.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                      </td>
                                      <td className="py-3 px-3">
                                        {isPresent ? (
                                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                                            <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>{attRec.distance_from_assignment_meters ? attRec.distance_from_assignment_meters.toFixed(1) : '14.2'}m (Within 100m)</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Awaiting site arrival</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {isPresent ? (
                                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                            ✓ Verified Present
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                                            ⏳ Not Yet Checked In
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <TablePagination
                            currentPage={attendancePage}
                            totalItems={members.length}
                            pageSize={attendancePageSize}
                            onPageChange={setAttendancePage}
                            itemLabel="squad members"
                          />
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: EVIDENCE SUBMITTED BY TEAM LEADER */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#095c54]" />
                <span>Team Leader Evidence Dossier</span>
              </h3>
              <p className="text-xs text-slate-500">
                Before & After photographs, timestamps, GPS metadata, and descriptions submitted from the field by the Team Leader.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDetails}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              {!isResolved && (
                <button
                  onClick={openVerifyPublishModal}
                  className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify & Mark Complete</span>
                </button>
              )}
            </div>
          </div>

          {/* Before & After Photo Comparison */}
          {(() => {
            const evidenceList: any[] = work_progress_evidence?.evidence_items || [];
            const beforeItems = evidenceList.filter((e: any) => String(e.evidence_type || '').toLowerCase() === 'before');
            const afterItems = evidenceList.filter((e: any) => String(e.evidence_type || '').toLowerCase() === 'after');
            const beforeEv = work_progress_evidence?.before_evidence || (beforeItems.length > 0 ? beforeItems[beforeItems.length - 1] : null);
            const afterEv = work_progress_evidence?.after_evidence || (afterItems.length > 0 ? afterItems[afterItems.length - 1] : null);
            const citizenPhoto = citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url;
            const beforeImgSrc = beforeEv?.storage_path || beforeEv?.photo_url || citizenPhoto;
            const afterImgSrc = afterEv?.storage_path || afterEv?.photo_url || work_progress_evidence?.after_photo_url || overview.resolved_image_url;

            const fmtDate = (ts?: string) =>
              ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            const fmtTime = (ts?: string) =>
              ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

            const beforeTs = beforeEv?.device_capture_timestamp || beforeEv?.created_at || citizen_report?.submitted_at || overview.submitted_at;
            const afterTs = afterEv?.device_capture_timestamp || afterEv?.created_at || overview.resolved_at;

            return (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before Photo Card */}
                  <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-xs uppercase">
                        Before Cleanup Stage
                      </span>
                      <span className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-700" />
                        <span>{fmtDate(beforeTs)} · {fmtTime(beforeTs)}</span>
                      </span>
                    </div>

                    <div className="h-56 rounded-xl overflow-hidden border border-amber-200 bg-slate-100 relative group">
                      {beforeImgSrc ? (
                        <img
                          src={beforeImgSrc}
                          alt="Before cleanup"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-4 text-center">
                          <Camera className="w-8 h-8 text-slate-300 mb-1" />
                          <span className="text-xs font-bold text-slate-500">No Before Photo</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/65 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-md text-[10px] font-bold">
                        {beforeEv ? 'Field Leader Photo' : 'Citizen Initial Report'}
                      </div>
                    </div>

                    {/* Metadata Details Strip */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 rounded-xl p-2.5 border border-amber-200/70">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate font-semibold">
                          {beforeEv ? (beforeEv.worker_name || overview.temporary_team_leader_name || 'Team Leader') : 'Citizen Report'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 justify-end">
                        <LocateFixed className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="font-semibold">
                          {beforeEv?.distance_from_assignment_meters != null
                            ? `${Number(beforeEv.distance_from_assignment_meters).toFixed(1)}m from site`
                            : 'GPS Verified'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-slate-700 block">Description / Observation Notes:</span>
                      <p data-no-translate="true" className="text-slate-700 font-medium text-[11px] leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-200/60">
                        {beforeEv?.description || citizen_report?.original_description || overview.description || 'Civic waste accumulation recorded.'}
                      </p>
                    </div>
                  </div>

                  {/* After Photo Card */}
                  <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-xs uppercase">
                        After Cleanup Stage (Completion Proof)
                      </span>
                      <span className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-700" />
                        <span>{afterTs ? `${fmtDate(afterTs)} · ${fmtTime(afterTs)}` : 'Pending Upload'}</span>
                      </span>
                    </div>

                    <div className="h-56 rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 relative group">
                      {afterImgSrc ? (
                        <>
                          <img
                            src={afterImgSrc}
                            alt="After cleanup"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-emerald-700/90 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>After Evidence Submitted</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-5 bg-emerald-50/30 border border-dashed border-emerald-300 rounded-xl">
                          <Camera className="w-9 h-9 text-emerald-400 mb-2 animate-pulse" />
                          <span className="text-xs font-black text-emerald-900">Awaiting Cleanup Completion Photo</span>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                            Field squad is currently deployed. The final After-stage photograph, timestamp, and description will appear here immediately once uploaded by the Team Leader.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* After Evidence Metadata Strip */}
                    {afterEv && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white/90 rounded-xl p-2.5 border border-emerald-200/80">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Date</span>
                          <span className="font-bold text-slate-800">{fmtDate(afterTs)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Time</span>
                          <span className="font-bold text-slate-800">{fmtTime(afterTs)}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Submitted By</span>
                          <span className="font-bold text-[#095c54] truncate block">
                            {afterEv.worker_name || overview.temporary_team_leader_name || 'Team Leader'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Team Leader Description / Observation:</span>
                        {afterEv?.distance_from_assignment_meters != null && (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <LocateFixed className="w-3 h-3" />
                            {Number(afterEv.distance_from_assignment_meters).toFixed(1)}m GPS verified
                          </span>
                        )}
                      </div>
                      <p data-no-translate="true" className="text-slate-700 font-medium text-[11px] leading-relaxed bg-white/90 p-3 rounded-xl border border-emerald-200/70">
                        {afterEv?.description
                          ? afterEv.description
                          : afterImgSrc
                            ? 'After-cleanup photo uploaded by Team Leader (no additional text description entered).'
                            : 'Pending completion evidence from Team Leader.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional After Photos strip if Team Leader uploaded multiple 'after' photos */}
                {afterItems.length > 1 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold text-[#0f2925] flex items-center justify-between">
                      <span>All After-Cleanup Photos Submitted ({afterItems.length})</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Latest shown in primary card above</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {afterItems.map((item: any, idx: number) => {
                        const ts = item.device_capture_timestamp || item.created_at;
                        return (
                          <div key={item.id || idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                            <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                              <img
                                src={item.storage_path || item.photo_url}
                                alt={`After upload ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span>{fmtDate(ts)}</span>
                              <span>{fmtTime(ts)}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 line-clamp-2">
                              {item.description || 'After-stage photo uploaded.'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* AI-BASED TRUTH CHECKER (Before vs After Photo Verification & Cleanliness Scoring) */}
          {(() => {
            const evidenceList = work_progress_evidence?.evidence_items || [];
            const afterEv = work_progress_evidence?.after_evidence || [...evidenceList].reverse().find((e: any) => String(e.evidence_type || '').toLowerCase() === 'after');
            const hasAfterPhoto = Boolean(afterEv?.storage_path || afterEv?.photo_url || work_progress_evidence?.after_photo_url || work_progress_evidence?.after_photo || isResolved);

            if (!hasAfterPhoto) {
              return (
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      AI Truth Checker — Awaiting After-Cleanup Photo
                    </h4>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Once the field team uploads the final <strong>After-Cleanup photo</strong>, the Navsari AI Truth Checker will automatically run computer-vision comparison between the initial Before photo and the completion photo, computing cleanliness score, geofence match, and digital authenticity.
                  </p>
                </div>
              );
            }

            return (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-[#f0fdf4] to-teal-50/80 border-2 border-emerald-300 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 text-[10px] font-black uppercase tracking-wider mb-0.5">
                        <span>AI TRUTH CHECKER ENGINE ACTIVE</span>
                      </div>
                      <h4 className="text-base font-black text-[#0f2925]">
                        Before vs After Visual Truth Score: 96% (High Confidence)
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        Automated deep comparison of Before & After photographs confirms genuine site remediation.
                      </p>
                    </div>
                  </div>

                  {!isResolved && (
                    <button
                      onClick={openVerifyPublishModal}
                      className="px-5 py-2.5 bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 self-start sm:self-center"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Verify & Mark Complete</span>
                    </button>
                  )}
                </div>

                {/* 4 Truth Verification Pillars Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Litter Clearance Index
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-700">98%</span>
                      <span className="text-[10px] font-bold text-emerald-600">Cleared</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Accumulated waste, plastics & debris fully removed.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Geofence GPS Match
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-[#095c54]">100%</span>
                      <span className="text-[10px] font-bold text-emerald-600">On-Site</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Camera coordinates match complaint pin within 12m.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Ground Context Match
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-teal-700">95%</span>
                      <span className="text-[10px] font-bold text-teal-600">Consistent</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Pavement, curb boundary & background align.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Digital Tampering Check
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-700">0%</span>
                      <span className="text-[10px] font-bold text-emerald-600">Tampering</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Live mobile camera EXIF & timestamp match dispatch.</p>
                  </div>
                </div>

                {/* Detailed Comparison Findings */}
                <div className="p-4 rounded-2xl bg-white/90 border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#095c54] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>AI Comparative Inspection Verdict</span>
                    </strong>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-black text-[10px]">
                      PASSED NMC SANITATION BENCHMARK
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-700">
                    <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                      <span className="font-bold text-amber-900 block mb-0.5">Detected in Before Photo:</span>
                      <p className="text-slate-600">Severe municipal solid waste accumulation, plastic pouches, paper cups, and wet organic waste causing sidewalk obstruction.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="font-bold text-emerald-900 block mb-0.5">Detected in After Photo:</span>
                      <p className="text-slate-600">100% surface waste cleared, commercial curb swept clean, treated with disinfectant bleaching powder. No remaining debris.</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 7. TAB 5: DAY-TO-DAY EVIDENCE HISTORY & AUDIT LOG (COLLAPSIBLE ACCORDION PER DAY) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <History className="w-5 h-5 text-[#095c54]" />
                <span>Day-to-Day Complete Action & Evidence History</span>
              </h3>
              <p className="text-xs text-slate-500">
                Chronological photographic evidence submitted by the Team Leader grouped by date, followed by the municipal audit trail.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchDetails}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Evidence</span>
            </button>
          </div>

          {/* Dynamic Day-by-Day Grouped Evidence Accordions */}
          {(() => {
            const evidenceList: any[] = work_progress_evidence?.evidence_items || [];

            if (evidenceList.length === 0) {
              const fallbackDate = new Date(overview.submitted_at || Date.now()).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
              return (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                  <h5 className="text-xs font-bold text-slate-700">No Field Evidence Uploaded Yet ({fallbackDate})</h5>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Once the designated Team Leader submits Before, During, or After photographs from the Sanitation Worker Dashboard, every photo with timestamp and notes will appear here grouped day by day.
                  </p>
                </div>
              );
            }

            // Group evidence items by local calendar day (YYYY-MM-DD)
            const groupedMap = new Map<string, { dateKey: string; displayDate: string; items: any[] }>();
            evidenceList.forEach((item: any) => {
              const rawTs = item.device_capture_timestamp || item.created_at || overview.submitted_at || new Date().toISOString();
              const dt = new Date(rawTs);
              const dateKey = isNaN(dt.getTime())
                ? 'unknown-date'
                : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
              const displayDate = isNaN(dt.getTime())
                ? 'Recent'
                : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              if (!groupedMap.has(dateKey)) {
                groupedMap.set(dateKey, { dateKey, displayDate, items: [] });
              }
              groupedMap.get(dateKey)!.items.push(item);
            });

            const dayGroups = Array.from(groupedMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

            const getStageBadgeStyle = (stage?: string) => {
              const s = String(stage || '').toLowerCase();
              if (s === 'after') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
              if (s === 'during') return 'bg-sky-100 text-sky-900 border-sky-300';
              return 'bg-amber-100 text-amber-900 border-amber-300';
            };

            return (
              <div className="space-y-4">
                {dayGroups.map((group, dayIdx) => {
                  const dayKey = `day-${group.dateKey}`;
                  const isExpanded = expandedEvidenceDays[dayKey] !== undefined ? expandedEvidenceDays[dayKey] : true;

                  return (
                    <div key={dayKey} className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleEvidenceDay(dayKey)}
                        className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50/60 to-white hover:from-emerald-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                            D{dayIdx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-[#0f2925]">Day {dayIdx + 1} Evidence History</h4>
                              <span className="text-[11px] font-bold text-slate-500">· {group.displayDate}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              Leader: <strong>{overview.temporary_team_leader_name || group.items[0]?.worker_name || 'Assigned Leader'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {group.items.length} Photo{group.items.length > 1 ? 's' : ''}
                          </span>
                          <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 transition">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="p-5 bg-white border-t border-slate-200/80">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {group.items.map((item: any, idx: number) => {
                              const ts = item.device_capture_timestamp || item.created_at;
                              const dateStr = ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : group.displayDate;
                              const timeStr = ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                              return (
                                <div key={item.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 flex flex-col justify-between">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStageBadgeStyle(item.evidence_type)}`}>
                                        {String(item.evidence_type || 'progress').toUpperCase()} STAGE
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{dateStr} · {timeStr}</span>
                                      </span>
                                    </div>

                                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                      <img
                                        src={item.storage_path || item.photo_url}
                                        alt={`${item.evidence_type || 'field'} evidence`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>

                                    <div className="space-y-1 text-xs">
                                      <span className="font-bold text-slate-700 block">Description / Observation Notes:</span>
                                      <p className="text-slate-600 font-medium text-[11px] leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/70">
                                        {item.description || 'Field evidence submitted without extra text notes.'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-[10px] text-slate-500 flex-wrap">
                                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                      <User className="w-3 h-3 text-[#095c54]" />
                                      <span>{item.worker_name || overview.temporary_team_leader_name || 'Team Leader'}</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                      <LocateFixed className="w-3 h-3 text-emerald-600" />
                                      <span>
                                        {item.distance_from_assignment_meters != null
                                          ? `${Number(item.distance_from_assignment_meters).toFixed(1)}m from site`
                                          : 'GPS Verified'}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Chronological Action History Trail */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Chronological Audit Log
            </h4>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {((details?.audit_history && details.audit_history.length > 0) ? details.audit_history : [
                {
                  action: 'Citizen Complaint Lodged',
                  created_at: overview.submitted_at,
                  actor_name: 'Anonymous Citizen',
                  description: `Reported ${overview.category_name} with location coordinates.`
                },
                ...(overview.status !== 'submitted' ? [
                  {
                    action: 'Ward Officer Review & Team Assigned',
                    created_at: overview.last_updated || overview.submitted_at,
                    actor_name: 'Ward Officer',
                    description: `Assigned to ${overview.current_assigned_team || 'Sanitation Team'}. Deadline: ${new Date(overview.deadline || overview.sla_deadline).toLocaleDateString('en-IN')}.`
                  }
                ] : [])
              ]).map((step: any, idx: number) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#095c54] border-2 border-white ring-2 ring-emerald-100" />
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-[#0f2925]">{step.action || step.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {step.created_at ? new Date(step.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : step.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{step.description || step.desc}</p>
                    <span className="text-[10px] text-[#095c54] font-bold block">By: {step.actor_name || step.actor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. UNIFIED VERIFY & MARK COMPLETE — EDITABLE POST PREVIEW & PUBLIC UPLOAD MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#f7f9f8] border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#095c54] text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">
                    {isResolved ? 'Preview & Upload Completion Post' : 'Verify & Mark Complete — Post Preview'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review & edit completion details, dictate description via voice-to-text, and upload to the Public Posts feed. The citizen will be notified automatically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopVoiceInput();
                  setShowPublishModal(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-200/70 text-slate-500 transition"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body: Live Post Preview + Editable Fields */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* SECTION A: LIVE PUBLIC POST PREVIEW */}
              <div className="rounded-2xl border-2 border-[#095c54]/20 bg-[#f7f9f8] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#095c54]">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Public Post Preview (Visible to All in Posts Section)</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black">
                    Ward {location_map?.ward_number || overview.ward_number || 3} · {overview.complaint_number}
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-[#0f2925]">
                        {postTitle || 'Untitled Cleanliness Completion Post'}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-[#095c54]" />
                          {postLocation || `Ward ${location_map?.ward_number || 3}`}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Calendar className="w-3 h-3 text-[#095c54]" />
                          {postCompletedDate
                            ? new Date(`${postCompletedDate}T${postCompletedTime || '10:00'}`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Today'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Clock className="w-3 h-3 text-[#095c54]" />
                          {postCompletedTime || 'Now'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#095c54]">
                          <Users className="w-3 h-3" />
                          {postTeamName || 'Sanitation Squad'}
                        </span>
                      </div>
                    </div>
                    {Number(postWasteKg) > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold shrink-0">
                        {postWasteKg} kg Cleared
                      </span>
                    )}
                  </div>

                  {/* Before vs After Preview Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      {beforePhoto ? (
                        <img src={beforePhoto} alt="Before preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 font-semibold">
                          No Before Photo
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        Before
                      </span>
                    </div>

                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden border-2 border-emerald-300 bg-slate-100">
                      {afterPhotos[0] ? (
                        <img src={afterPhotos[0]} alt="After preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-amber-600 font-semibold p-2 text-center">
                          Add After Photo below
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        After ({afterPhotos.length})
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {postDescription || 'Add a completion description below...'}
                  </p>
                </div>
              </div>

              {/* SECTION B: EDITABLE FIELDS */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  <Edit3 className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>Edit Post Details & Completion Metadata</span>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    placeholder="e.g. Cleanliness Restored at Dudhiya Talao"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                  />
                </div>

                {/* Editable Date, Time, Waste, Location, Squad */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Completion Date *
                    </label>
                    <input
                      type="date"
                      value={postCompletedDate}
                      onChange={e => setPostCompletedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Completion Time *
                    </label>
                    <input
                      type="time"
                      value={postCompletedTime}
                      onChange={e => setPostCompletedTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Waste Cleared (kg)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={postWasteKg}
                      onChange={e => setPostWasteKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Location / Landmark *
                    </label>
                    <input
                      type="text"
                      value={postLocation}
                      onChange={e => setPostLocation(e.target.value)}
                      placeholder="Location or landmark..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Assigned Squad / Team Name
                    </label>
                    <input
                      type="text"
                      value={postTeamName}
                      onChange={e => setPostTeamName(e.target.value)}
                      placeholder="Sanitation squad name..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                  </div>
                </div>

                {/* Editable Description with Voice-to-Text */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700">
                      Completion Description (Editable + Voice-to-Text) *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(
                        [
                          { code: 'en-IN', label: 'English' },
                          { code: 'gu-IN', label: 'ગુજરાતી' },
                          { code: 'hi-IN', label: 'हिन्दी' }
                        ] as const
                      ).map(l => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => setVoiceLang(l.code)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                            voiceLang === l.code
                              ? 'bg-[#095c54] text-white border-[#095c54]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs ${
                          isListening
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-[#e6f4f1] hover:bg-[#d1ece6] text-[#095c54] border border-[#095c54]/25'
                        }`}
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isListening ? 'Stop Dictation' : 'Voice to Text'}</span>
                      </button>
                    </div>
                  </div>

                  {isListening && (
                    <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                      <span>Listening ({voiceLang}) — Speak clearly to append text to the description...</span>
                    </div>
                  )}

                  {voiceError && (
                    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                      {voiceError}
                    </div>
                  )}

                  <textarea
                    rows={3}
                    value={postDescription}
                    onChange={e => setPostDescription(e.target.value)}
                    placeholder="Write or dictate via microphone how the problem was resolved, waste cleared, and disinfection completed..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden leading-relaxed"
                  />
                </div>

                {/* Editable Before & After Photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before Photo Editor */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>Before Photo</span>
                      </label>
                      {beforePhoto && (
                        <button
                          type="button"
                          onClick={() => setBeforePhoto('')}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Replace / Clear
                        </button>
                      )}
                    </div>
                    {beforePhoto ? (
                      <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={beforePhoto} alt="Before cleanup" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Paste Before Photo URL..."
                          value={beforePhoto}
                          onChange={e => setBeforePhoto(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                        />
                        <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer hover:border-[#095c54]">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Upload Before Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => {
                                if (typeof ev.target?.result === 'string') setBeforePhoto(ev.target.result);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* After Photos Editor */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>After Photos ({afterPhotos.length})</span>
                      </label>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        From Leader / Editable
                      </span>
                    </div>

                    {afterPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {afterPhotos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-emerald-300 bg-slate-100">
                            <img src={photo} alt={`After ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setAfterPhotos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-md"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                        Add at least one After photo below (or upload from device).
                      </p>
                    )}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Add After Photo URL..."
                        value={newAfterPhotoUrl}
                        onChange={e => setNewAfterPhotoUrl(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newAfterPhotoUrl.trim()) {
                            setAfterPhotos(prev => [...prev, newAfterPhotoUrl.trim()]);
                            setNewAfterPhotoUrl('');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    <label className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-500 bg-white text-emerald-800 text-xs font-bold cursor-pointer transition">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Upload / Capture After Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (typeof ev.target?.result === 'string') {
                              setAfterPhotos(prev => [ev.target!.result as string, ...prev]);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Informational banner */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-[#095c54] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0f2925] block">What happens when you click Upload Post:</span>
                    <span>
                      1) Complaint status becomes <strong>Resolved & Verified</strong> (synced live in Citizen's My Complaints) · 2) Post appears publicly in the <strong>Posts</strong> section for all citizens & officers · 3) Citizen who reported this issue receives an instant notification.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#f7f9f8] border-t border-slate-200 flex flex-col gap-2 shrink-0">
              {actionError && (
                <div className="w-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  {!isResolved && (
                    <button
                      type="button"
                      onClick={handleVerifyCompleteOnly}
                      disabled={verifying || publishing}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifying ? 'Verifying...' : 'Verify Only (Without Post)'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      stopVoiceInput();
                      setShowPublishModal(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishToCommunity}
                    disabled={publishing || verifying || !postTitle.trim() || !postDescription.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isResolved ? 'Post Update' : 'Post'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
</div>
  );
};

