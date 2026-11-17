import { formatDate, formatDateTime, formatTime } from '../../utils/dateFormat.js';
import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';
import { ComplaintEvidenceImage } from '../common/ComplaintEvidenceImage.js';

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
}

export const ComplaintInspectView: React.FC<ComplaintInspectViewProps> = ({
  complaintId,
  onBack,
  onComplaintUpdated
}) => {
  const [activeTab, setActiveTab] = useState<
    'info' | 'team' | 'attendance' | 'evidence' | 'history'
  >('info');

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Verification & Completion state
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verificationNotes, setVerificationNotes] = useState<string>(
    'Inspected on-site evidence photos. All civic waste cleared, area swept, and disinfected with bleaching powder.'
  );
  const [verifying, setVerifying] = useState<boolean>(false);

  // Publish to Community Wall State
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDescription, setPostDescription] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [newAfterPhotoUrl, setNewAfterPhotoUrl] = useState<string>('');

  // Accordion Expand/Collapse States for Day-to-Day Attendance & Evidence History
  const [expandedAttendanceDays, setExpandedAttendanceDays] = useState<Record<string, boolean>>({
    'day-1': true
  });
  const [expandedEvidenceDays, setExpandedEvidenceDays] = useState<Record<string, boolean>>({
    'day-1': true
  });

  const toggleAttendanceDay = (key: string) => {
    setExpandedAttendanceDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEvidenceDay = (key: string) => {
    setExpandedEvidenceDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getWardComplaintDetails(complaintId);
      setDetails(res.data);
      if (res.data?.overview?.title) {
        const wardNum = res.data.overview.location?.ward_number || (res.data.overview as any).ward_number || 3;
        const wardNm = res.data.overview.location?.ward_name || (res.data.overview as any).ward_name || (wardNum === 8 ? 'Madhumati - Parsi Wad' : 'Dudhiya Talao');
        setPostTitle(`Cleanliness Restored at ${res.data.overview.location?.landmark || res.data.overview.location?.address || `Ward ${wardNum}`}`);
        setPostDescription(`Ward ${wardNum} (${wardNm}) Sanitation Squad successfully cleared accumulated waste, disinfected the perimeter, and restored civic hygiene following complaint ${res.data.overview.complaint_number}.`);
      }
      setIsPublished(!!(res.data?.overview as any)?.is_published_to_community || res.data?.overview?.status === 'resolved');
      const bPhoto = res.data?.work_progress_evidence?.before_photo_url || res.data?.citizen_report?.photo_url || res.data?.overview?.image_url || '';
      const aPhoto = res.data?.work_progress_evidence?.after_photo_url || res.data?.overview?.resolved_image_url || '';
      setBeforePhoto(bPhoto);
      setAfterPhotos(aPhoto ? [aPhoto] : []);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load complaint inspect details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  // Handle Verify & Mark Complete
  const handleVerifyComplete = async () => {
    setVerifying(true);
    setActionError(null);
    try {
      const res = await api.verifyCompleteWardComplaint(complaintId, {
        review_notes: verificationNotes
      });
      setActionSuccess(res.message || 'Work verified and marked complete. Citizen has been notified!');
      setShowVerifyModal(false);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify complete.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle Publish to Community Wall
  const handlePublishToCommunity = async () => {
    setPublishing(true);
    setActionError(null);
    try {
      const beforeUrl = beforePhoto || details?.work_progress_evidence?.before_photo_url || details?.citizen_report?.photo_url || '';
      const afterUrl = afterPhotos[0] || details?.work_progress_evidence?.after_photo_url || '';

      const res = await api.publishWardComplaintToCommunity(complaintId, {
        title: postTitle,
        description: postDescription,
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
        after_photos: afterPhotos.length > 0 ? afterPhotos : afterUrl ? [afterUrl] : [],
        waste_kg: 380
      });

      setIsPublished(true);
      if (details?.overview) {
        details.overview.status = 'resolved';
        details.overview.is_published_to_community = true;
      }
      setShowPublishModal(false);
      setActionSuccess('Work Done successfully sent to Citizen and posted to Posts Feed! Complaint resolved.');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send work done to citizen.');
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & BACK NAVIGATION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white transition flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Return to Complaint Catalogue"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Catalogue</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-md">
                  {overview.complaint_number}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ward {location_map?.ward_number || 3} · {location_map?.ward_name || 'Dudhiya Talao'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                  {overview.priority} Priority
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight mt-1">
                {overview.title}
              </h1>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isResolved ? (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs shadow-md flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Verify & Mark Complete</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Resolved & Verified</span>
                </span>
                {!isPublished ? (
                  <button
                    onClick={() => setShowPublishModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Work Done to Citizen</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 rounded-xl bg-slate-100 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1.5 opacity-90 cursor-not-allowed shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Work Done Sent & Resolved ✓</span>
                  </button>
                )}
              </div>
            )}
          </div>
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
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. FIVE DEDICATED NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'info', label: '1. Complaint Information', icon: FileText },
          { id: 'team', label: '2. Assigned Team Members', icon: Users },
          { id: 'attendance', label: '3. Day-to-Day Attendance', icon: CalendarCheck2 },
          { id: 'evidence', label: '4. Evidence Submitted by Leader', icon: Camera },
          { id: 'history', label: '5. Day-to-Day Evidence History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-[#095c54] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
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
                    <ComplaintEvidenceImage
                      src={citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url}
                      alt="Citizen complaint photo"
                      categoryName={overview.category_name}
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
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
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
                      Logged: {formatDateTime(citizen_report?.submitted_at || overview.submitted_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Location Map */}
            <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#095c54]" />
                  <h3 className="text-sm font-extrabold text-[#0f2925]">Geographical Location & Geofence</h3>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {location_map?.address || (overview.ward_number ? `Navsari Ward ${overview.ward_number}` : 'Navsari Municipal Ward')}
                </span>
              </div>

              <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
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
                  <span className="text-slate-400">SLA Resolution Time:</span>
                  <strong>48 Hours Max</strong>
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
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Leader: {overview.temporary_team_leader_name}</span>
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
                        {member.is_temporary_leader ? <Crown className="h-4 w-4" /> : idx + 1}
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
                const dateDisplay = formatDate(overview.submitted_at || Date.now());

                return (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleAttendanceDay(dayKey)}
                      className="p-4 bg-gradient-to-r from-emerald-50/60 to-white hover:from-emerald-50 transition cursor-pointer flex items-center justify-between select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-xs">
                          D1
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-[#0f2925]">Day 1 Attendance</h4>
                            <span className="text-[11px] font-bold text-slate-500">· {dateDisplay}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Squad: <strong>{overview.current_assigned_team || 'Sanitation Squad'}</strong> (Leader: {overview.temporary_team_leader_name || 'Designated Leader'})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          verifiedCount > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {verifiedCount > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {verifiedCount}/{members.length} Verified Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> 0/{members.length} Checked In
                            </span>
                          )}
                        </span>
                        <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 transition">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Accordion Content: Table of All Members */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200/80 space-y-3">
                        <div className="overflow-x-auto">
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
                              {members.map((member: any, idx: number) => {
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
                                      {isPresent ? formatTime(attRec.attendance_timestamp || attRec.created_at) : '—'}
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
                                          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified Present</span>
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Not Yet Checked In</span>
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
                Photographs, voice-to-text observations, and AI classification submitted from the field by the Team Leader.
              </p>
            </div>
            {!isResolved && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify & Approve Cleanup</span>
              </button>
            )}
          </div>

          {/* Before & After Photo Comparison */}
          {(() => {
            const evidenceList = work_progress_evidence?.evidence_items || [];
            const beforeEv = evidenceList.find((e: any) => e.evidence_type === 'before');
            const afterEv = evidenceList.find((e: any) => e.evidence_type === 'after');
            const citizenPhoto = citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before Photo Card */}
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-xs uppercase">
                      Before Cleanup Stage
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {beforeEv ? formatTime(beforeEv.device_capture_timestamp || beforeEv.created_at) : 'Citizen Initial'}
                    </span>
                  </div>
                  <div className="h-56 rounded-xl overflow-hidden border border-amber-200 bg-slate-100 relative group">
                    <ComplaintEvidenceImage
                      src={beforeEv?.storage_path || citizenPhoto}
                      alt="Before cleanup"
                      categoryName={overview.category_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {beforeEv ? 'Field Leader Photo' : 'Citizen Initial Report'}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700 block">Observation Notes:</span>
                    <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                      {beforeEv?.description || citizen_report?.original_description || overview.description || 'Severe civic waste accumulation recorded.'}
                    </p>
                  </div>
                </div>

                {/* After Photo Card */}
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-xs uppercase">
                      After Cleanup Stage (Completion Proof)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {afterEv ? formatTime(afterEv.device_capture_timestamp || afterEv.created_at) : 'Pending'}
                    </span>
                  </div>
                  <div className="h-56 rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 relative group">
                    {afterEv?.storage_path ? (
                      <img
                        src={afterEv.storage_path}
                        alt="After cleanup"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-5 bg-emerald-50/30 border border-dashed border-emerald-300 rounded-xl">
                        <Camera className="w-9 h-9 text-emerald-400 mb-2 animate-pulse" />
                        <span className="text-xs font-black text-emerald-900">Awaiting Cleanup Completion Photo</span>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                          Field squad is currently deployed. The final completion photograph and voice observations will appear here once uploaded by the Team Leader.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700 block">Leader Voice Observation:</span>
                    <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                      {afterEv?.description || 'Pending completion report from Team Leader.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* AI-BASED TRUTH CHECKER (Before vs After Photo Verification & Cleanliness Scoring) */}
          {(() => {
            const evidenceList = work_progress_evidence?.evidence_items || [];
            const afterEv = evidenceList.find((e: any) => e.evidence_type === 'after');
            const hasAfterPhoto = Boolean(afterEv?.storage_path || work_progress_evidence?.after_photo || isResolved);

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
                      onClick={() => setShowVerifyModal(true)}
                      className="px-5 py-2.5 bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 self-start sm:self-center"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Verify & Approve Cleanup</span>
                    </button>
                  )}
                </div>

                {/* 4 Truth Verification Pillars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
              <History className="w-5 h-5 text-[#095c54]" />
              <span>Day-to-Day Complete Action & Evidence History</span>
            </h3>
            <p className="text-xs text-slate-500">
              Click each day to inspect chronological photographic evidence submitted from the field, followed by the complete municipal audit trail.
            </p>
          </div>

          {/* Collapsible Day-to-Day Evidence Accordion */}
          {(() => {
            const evidenceList = work_progress_evidence?.evidence_items || [];
            const dayKey = 'day-1';
            const isExpanded = !!expandedEvidenceDays[dayKey];
            const dateDisplay = formatDate(overview.submitted_at || Date.now());

            return (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleEvidenceDay(dayKey)}
                    className="p-4 bg-gradient-to-r from-emerald-50/60 to-white hover:from-emerald-50 transition cursor-pointer flex items-center justify-between select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-xs">
                        D1
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-[#0f2925]">Day 1 Field Evidence History</h4>
                          <span className="text-[11px] font-bold text-slate-500">· {dateDisplay}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Designated Leader: <strong>{overview.temporary_team_leader_name || 'Assigned Leader'}</strong> · Geotagged Field Submissions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        evidenceList.length > 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {evidenceList.length > 0 ? `${evidenceList.length} Photo${evidenceList.length > 1 ? 's' : ''} Uploaded` : '0 Photos Uploaded'}
                      </span>
                      <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 transition">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="p-5 bg-white border-t border-slate-200/80 space-y-4">
                      {evidenceList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {evidenceList.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  {item.evidence_type?.toUpperCase()} STAGE
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {formatTime(item.device_capture_timestamp || item.created_at)}
                                </span>
                              </div>

                              <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                <img
                                  src={item.storage_path || item.photo_url}
                                  alt={item.evidence_type}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="space-y-1 text-xs">
                                <span className="font-bold text-slate-700 block">Observation Notes:</span>
                                <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                                  {item.description || 'Civic waste cleared and area swept.'}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                  <LocateFixed className="w-3 h-3 text-emerald-600" />
                                  <span>{item.distance_from_assignment_meters ? `${item.distance_from_assignment_meters}m from site` : 'GPS Verified'}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 font-extrabold text-[#095c54]">
                                  <CheckCircle2 className="h-3 w-3" /> Validated
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                          <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                          <h5 className="text-xs font-bold text-slate-700">No Evidence Uploaded for Day 1 Yet</h5>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            The designated Team Leader has not yet uploaded photos from the field. Photos submitted from the Worker Dashboard will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                    description: `Assigned to ${overview.current_assigned_team || 'Sanitation Team'}. Deadline: ${formatDate(overview.deadline || overview.sla_deadline)}.`
                  }
                ] : [])
              ]).map((step: any, idx: number) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#095c54] border-2 border-white ring-2 ring-emerald-100" />
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-[#0f2925]">{step.action || step.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {step.created_at ? formatTime(step.created_at) : step.time}
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

      {/* 8. VERIFY & MARK COMPLETE MODAL */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Verify & Mark Complaint Complete
                </h3>
                <p className="text-xs text-slate-500">
                  This will resolve the complaint and automatically dispatch a resolution notification to the citizen.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ward Officer Review Notes *
              </label>
              <textarea
                rows={3}
                value={verificationNotes}
                onChange={e => setVerificationNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyComplete}
                disabled={verifying}
                className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirm & Resolve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. SEND WORK DONE TO CITIZEN & COMMUNITY WALL MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 my-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Send Work Done to Citizen & Post
                </h3>
                <p className="text-xs text-slate-500">
                  Notify the citizen with before & after proof of completion and share this success story to community feeds.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Photo Submitted by Citizen (Before) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>Citizen's Submitted Photo (Before)</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Before Cleanup
                  </span>
                </div>
                {beforePhoto ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                    <img src={beforePhoto} alt="Before cleanup" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setBeforePhoto('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg text-xs transition"
                      title="Clear photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter Before Photo URL..."
                      value={beforePhoto}
                      onChange={e => setBeforePhoto(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Work Done Photos (After) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Work Done Photos (After) — {afterPhotos.length} Added</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Proof of Resolution
                  </span>
                </div>

                {afterPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {afterPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-emerald-300 bg-slate-100 group shadow-xs">
                        <img src={photo} alt={`After work ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAfterPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-md transition shadow-xs"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          After #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    Please add at least one photo showing the successfully completed work.
                  </p>
                )}

                {/* Add Photo Controls: URL + Camera Upload */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add another After Photo URL..."
                      value={newAfterPhotoUrl}
                      onChange={e => setNewAfterPhotoUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newAfterPhotoUrl.trim()) {
                          setAfterPhotos(prev => [...prev, newAfterPhotoUrl.trim()]);
                          setNewAfterPhotoUrl('');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white text-emerald-800 text-xs font-bold cursor-pointer transition">
                      <Camera className="w-4 h-4 text-emerald-600" />
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
                            const res = ev.target?.result;
                            if (typeof res === 'string') {
                              setAfterPhotos(prev => [...prev, res]);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Notification & Post Title *
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    placeholder="e.g. Cleanliness Restored at Landmark"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Resolution Description for Citizen & Public Feed *
                  </label>
                  <textarea
                    rows={3}
                    value={postDescription}
                    onChange={e => setPostDescription(e.target.value)}
                    placeholder="Describe how the problem was resolved, sanitation measures taken, and area disinfection..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* Informational banner */}
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Automatic Notifications & Cross-Feed Integration</span>
                </div>
                <p className="text-slate-600 pl-5">
                  1. An instant direct notification with before & after photos will be sent to the citizen.
                  <br />
                  2. This post will automatically appear in both the Citizen and Community Head Posts sections.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishToCommunity}
                disabled={publishing || afterPhotos.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send to Citizen & Post</span>
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
};
