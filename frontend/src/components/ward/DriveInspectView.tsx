import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
  Check,
  Camera,
  Phone,
  Mail,
  Award,
  RefreshCw,
  UserCheck,
  UserX,
  FileCheck2,
  Sparkles,
  Scale,
  Wrench,
  CheckCheck,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { ActivityRegistration } from '../../types/index.js';
import { CertificateCard, DriveCertificateData } from '../common/CertificateCard.js';
import { TablePagination } from '../common/TablePagination.js';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface DriveInspectViewProps {
  activity: any;
  onBack: () => void;
  onActionCompleted: () => void;
}

export const DriveInspectView: React.FC<DriveInspectViewProps> = ({
  activity: initialActivity,
  onBack,
  onActionCompleted
}) => {
  const [activity, setActivity] = useState<any>(initialActivity);
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'certificates'>('details');
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<DriveCertificateData[]>([]);
  const [regPage, setRegPage] = useState<number>(1);
  const [certPage, setCertPage] = useState<number>(1);
  const tablePageSize = 6;
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const [reviewNotes, setReviewNotes] = useState<string>(
    'Verified before, during, and after photographic evidence submitted by the organization. Cleanliness drive completed to NMC standards.'
  );
  const [completing, setCompleting] = useState<boolean>(false);
  const [issuingCerts, setIssuingCerts] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [certOption, setCertOption] = useState<'all' | 'present_only'>('all');
  const [actionEvId, setActionEvId] = useState<string | null>(null);
  const [rejectingEvId, setRejectingEvId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<string>('');

  const isCompleted =
    activity.event_status === 'completed' || activity.evidence_status === 'verified_complete';

  const coords: [number, number] = [
    parseFloat(activity.latitude) || 20.9470,
    parseFloat(activity.longitude) || 72.9280
  ];

  const fetchDriveDetails = async () => {
    setLoadingData(true);
    try {
      const [regRes, evRes, certRes] = await Promise.all([
        api.getActivityRegistrations(activity.id).catch(() => ({ success: false, data: { registrations: [] } })),
        api.getActivityEvidence(activity.id).catch(() => ({ success: false, data: [] })),
        api.getDriveCertificates(activity.id).catch(() => ({ success: false, data: [] }))
      ]);

      if (regRes.success) {
        const regList = Array.isArray(regRes.data) ? regRes.data : (regRes.data?.registrations || []);
        setRegistrations(regList);
      }
      if (evRes.success && evRes.data) {
        setEvidenceList(evRes.data);
      }
      if (certRes.success && certRes.data) {
        setCertificates(certRes.data);
      }
    } catch (err) {
      console.error('Failed to load drive details:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDriveDetails();
  }, [activity.id]);

  const handleToggleAttendance = async (regId: string, nextStatus: 'present' | 'absent') => {
    try {
      await api.updateRegistrationAttendance(regId, nextStatus);
      setRegistrations(prev =>
        prev.map(r => (r.id === regId ? { ...r, attendance_status: nextStatus } : r))
      );
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update attendance.' });
    }
  };

  const handleMarkCompleteAndApprove = async () => {
    setCompleting(true);
    setActionMsg(null);
    try {
      const res = await api.completeOrganizationDrive(activity.id, reviewNotes.trim());
      setActivity((prev: any) => ({
        ...prev,
        event_status: 'completed',
        evidence_status: 'verified_complete'
      }));
      setActionMsg({
        type: 'success',
        text: res.message || 'Drive verified & marked complete! You can now issue QR-verified certificates in Tab 3.'
      });
      confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
      await fetchDriveDetails();
      onActionCompleted();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to mark drive complete.' });
    } finally {
      setCompleting(false);
    }
  };

  const handleVerifyEvidence = async (evidenceId: string, status: 'verified' | 'rejected', notes?: string) => {
    setActionEvId(evidenceId);
    setActionMsg(null);
    try {
      await api.verifyDriveEvidence(activity.id, evidenceId, status, notes);
      setEvidenceList(prev =>
        prev.map(ev =>
          ev.id === evidenceId
            ? { ...ev, verification_status: status, verification_notes: notes || null }
            : ev
        )
      );
      setActionMsg({
        type: 'success',
        text: `Evidence photo successfully marked as ${status.toUpperCase()}!`
      });
      setRejectingEvId(null);
      setRejectNote('');
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update evidence status.' });
    } finally {
      setActionEvId(null);
    }
  };

  const handleVerifyAllEvidence = async () => {
    setActionEvId('all');
    setActionMsg(null);
    try {
      const res = await api.verifyAllDriveEvidence(activity.id, 'verified');
      setEvidenceList(prev =>
        prev.map(ev => ({ ...ev, verification_status: 'verified' }))
      );
      setActionMsg({
        type: 'success',
        text: res.message || 'All evidence items marked as VERIFIED!'
      });
      confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to verify all evidence.' });
    } finally {
      setActionEvId(null);
    }
  };

  const handleIssueCertificates = async () => {
    setIssuingCerts(true);
    setActionMsg(null);
    try {
      const res = await api.issueDriveCertificates(activity.id, certOption);
      if (res.data && res.data.length > 0) {
        setCertificates(res.data);
      }
      setActionMsg({
        type: 'success',
        text: res.message || 'Official QR-verified certificates generated and sent to Community Head & volunteers!'
      });
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to issue certificates.' });
    } finally {
      setIssuingCerts(false);
    }
  };

  const presentCount = registrations.filter(r => r.attendance_status === 'present').length;
  const absentCount = registrations.filter(r => r.attendance_status === 'absent').length;
  const unmarkedCount = Math.max(0, registrations.length - presentCount - absentCount);
  const activeCert = certificates.find(c => c.id === selectedCertId) || certificates[0] || null;

  const getStageBadge = (stage: string) => {
    const s = String(stage || '').toLowerCase();
    if (s === 'after') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (s === 'during') return 'bg-sky-100 text-sky-900 border-sky-300';
    return 'bg-amber-100 text-amber-900 border-amber-300';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-extrabold text-[#095c54] bg-[#e6f4f1] hover:bg-[#d0ece6] transition py-2 px-3.5 rounded-xl shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200">
                Ward {activity.ward_number || 3} · Organization Drive
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : activity.evidence_status === 'submitted'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                {isCompleted
                  ? 'Verified Complete'
                  : activity.evidence_status === 'submitted'
                  ? 'Evidence Submitted — Review Ready'
                  : 'Active / Scheduled'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#0f2925] mt-1">
              {activity.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Organized by <strong className="text-[#0f2925]">{activity.community_name || 'Community Organization'}</strong>
              {activity.head_name ? ` · Head: ${activity.head_name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchDriveDetails}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh details"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => setActiveTab('evidence')}
              className="px-4 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Review Evidence &amp; Complete</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('certificates')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
            >
              <Award className="w-4 h-4" />
              <span>View / Issue Certificates ({certificates.length})</span>
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-600 hover:underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* 3 DEDICATED SUB-TABS */}
      <div className="mobile-tab-strip sm:grid sm:grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'details'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>1. Details &amp; Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evidence')}
          className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'evidence'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>2. Evidence ({evidenceList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('certificates')}
          className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'certificates'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>3. Certificates ({certificates.length})</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: DRIVE DETAILS & PRESENT / ABSENT ATTENDANCE ROSTER     */}
      {/* ================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Present / Absent / Total KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Registered</span>
              <p className="text-2xl font-black text-[#0f2925] mt-1">{registrations.length}</p>
              <span className="text-[11px] text-slate-500">Capacity: {activity.maximum_participants || 50}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Present Count
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{presentCount}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">Verified Participants</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" />
                Absent Count
              </span>
              <p className="text-2xl font-black text-rose-600 mt-1">{absentCount}</p>
              <span className="text-[11px] text-slate-500">{unmarkedCount} not yet marked</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Attendance Rate</span>
              <p className="text-2xl font-black text-[#095c54] mt-1">
                {registrations.length > 0 ? Math.round((presentCount / registrations.length) * 100) : 0}%
              </p>
              <span className="text-[11px] text-slate-500">Live field check-in</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Drive Information */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#0f2925] border-b border-slate-100 pb-3">
                Cleanliness Drive Specifications
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Schedule</span>
                  <p className="font-bold text-[#0f2925] flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
                    {activity.proposed_start_at
                      ? new Date(activity.proposed_start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Scheduled'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Location</span>
                  <p className="font-bold text-[#0f2925] flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                    <span className="truncate">{activity.address || activity.landmark || `Ward ${activity.ward_number || 3}`}</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Organization &amp; Head</span>
                  <p className="font-bold text-[#0f2925] mt-1">{activity.community_name || 'Community Group'}</p>
                  <p className="text-[11px] text-slate-500">{activity.head_name || 'Community Head'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact</span>
                  <p className="font-bold text-[#095c54] flex items-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {activity.community_phone || 'Registered on file'}
                  </p>
                  {activity.community_email && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                      <Mail className="w-3 h-3" />
                      {activity.community_email}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Description &amp; Objectives</span>
                <p className="text-slate-700 leading-relaxed">
                  {activity.detailed_description || activity.short_description || 'Civic cleanliness drive.'}
                </p>
              </div>

              {activity.linked_problem_title && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs">
                  <span className="text-[10px] font-black uppercase text-indigo-800 block">Linked Ward Problem</span>
                  <p className="font-bold text-indigo-950 mt-0.5">{activity.linked_problem_title}</p>
                </div>
              )}
            </div>

            {/* Map Location */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#0f2925]">
                Drive Site Location
              </h3>
              <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer center={coords} zoom={15} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={coords} icon={markerIcon}>
                    <Popup>
                      <strong>{activity.title}</strong>
                      <br />
                      {activity.address || `Ward ${activity.ward_number}`}
                    </Popup>
                  </Marker>
                  <Circle center={coords} radius={100} pathOptions={{ color: '#095c54', fillColor: '#095c54', fillOpacity: 0.12 }} />
                </MapContainer>
              </div>
              <p className="text-[11px] text-slate-500">
                GPS: {coords[0].toFixed(4)}° N, {coords[1].toFixed(4)}° E · Ward {activity.ward_number || 3}
              </p>
            </div>
          </div>

          {/* Volunteer Attendance Roster */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#0f2925] uppercase tracking-wider">
                  Participated Citizens &amp; Attendance Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Present: <strong className="text-emerald-700">{presentCount}</strong> · Absent: <strong className="text-rose-600">{absentCount}</strong> · Total: <strong>{registrations.length}</strong>
                </p>
              </div>
            </div>

            {registrations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-500">
                No citizen volunteers have registered for this drive yet.
              </div>
            ) : (
              <>
                {/* Mobile Volunteer Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  {registrations
                    .slice((regPage - 1) * tablePageSize, regPage * tablePageSize)
                    .map(reg => (
                    <div key={reg.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#0f2925] truncate">{reg.citizen_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{reg.citizen_phone || '—'} · {reg.registration_status}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(reg.id, 'present')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            reg.attendance_status === 'present' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(reg.id, 'absent')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            reg.attendance_status === 'absent' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                      <th className="py-2.5 px-3">Citizen Volunteer</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Registration Status</th>
                      <th className="py-2.5 px-3">Attendance</th>
                      <th className="py-2.5 px-3 text-right">Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrations
                    .slice((regPage - 1) * tablePageSize, regPage * tablePageSize)
                    .map(reg => (
                      <tr key={reg.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-bold text-[#0f2925]">{reg.citizen_name}</td>
                        <td className="py-3 px-3 text-slate-600">{reg.citizen_phone || '—'}</td>
                        <td className="py-3 px-3 capitalize text-slate-600">{reg.registration_status}</td>
                        <td className="py-3 px-3">
                          {reg.attendance_status === 'present' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                              Present
                            </span>
                          ) : reg.attendance_status === 'absent' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
                              Absent
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              Unmarked
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(reg.id, 'present')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                reg.attendance_status === 'present'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(reg.id, 'absent')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                reg.attendance_status === 'absent'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white mt-2">
                  <TablePagination
                    currentPage={regPage}
                    totalItems={registrations.length}
                    pageSize={tablePageSize}
                    onPageChange={setRegPage}
                    itemLabel="volunteers"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: EVIDENCE SUBMITTED BY COMMUNITY HEAD + APPROVE/COMPLETE */}
      {/* ================================================================= */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-[#0f2925] flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#095c54]" />
                  <span>Submitted Evidence History ({evidenceList.length} Upload{evidenceList.length === 1 ? '' : 's'})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological Before, During, and After photographic proof and impact details submitted by the Community Head.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!isCompleted && evidenceList.length > 0 && (
                  <button
                    type="button"
                    disabled={actionEvId === 'all'}
                    onClick={handleVerifyAllEvidence}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-200" />
                    <span>{actionEvId === 'all' ? 'Verifying All...' : 'Verify All Evidence'}</span>
                  </button>
                )}
                {isCompleted && (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5 self-start sm:self-auto">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Drive Verified &amp; Completed</span>
                  </span>
                )}
              </div>
            </div>

            {evidenceList.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <Camera className="w-9 h-9 text-slate-300 mx-auto" />
                <h4 className="text-sm font-extrabold text-slate-700">No Evidence Uploaded Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The Community Head has not yet uploaded field evidence photos. Once submitted from their Activity Management dashboard, every photo and review metric will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {evidenceList.map((ev, idx) => {
                  const stage = ev.evidence_type || ev.stage || 'before';
                  const meta = ev.review_metadata || {};
                  const hasMeta = Object.keys(meta).some(k => meta[k] !== undefined && meta[k] !== null && meta[k] !== '');

                  return (
                    <div
                      key={ev.id || idx}
                      className="rounded-2xl border border-slate-200 bg-[#f7f9f8] overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="px-4 py-3 bg-white border-b border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStageBadge(stage)}`}>
                              {String(stage).toUpperCase()} STAGE
                            </span>
                            {ev.verification_status === 'verified' || ev.submission_status === 'verified' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Verified
                              </span>
                            ) : ev.verification_status === 'rejected' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending Review
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ev.created_at
                              ? new Date(ev.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                              : 'Recorded'}
                          </span>
                        </div>

                        <div className="aspect-video bg-slate-100 overflow-hidden">
                          <img
                            src={ev.storage_path || ev.image_url}
                            alt={ev.caption || stage}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            <h4 className="text-xs font-extrabold text-[#0f2925]">{ev.caption || `${stage} Evidence`}</h4>
                            {ev.description && ev.description !== ev.caption && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ev.description}</p>
                            )}
                          </div>

                          {/* Structured After-Stage Review Details for Ward Officer */}
                          {hasMeta && (
                            <div className="p-3 rounded-xl bg-white border border-emerald-200/80 space-y-2 text-[11px]">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#095c54] flex items-center gap-1">
                                <FileCheck2 className="w-3.5 h-3.5" />
                                Ward Officer Review Metrics
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {meta.waste_collected_kg && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Waste Cleared</span>
                                    <strong className="text-[#0f2925]">{meta.waste_collected_kg} kg</strong>
                                  </div>
                                )}
                                {meta.actual_participants && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Volunteers Present</span>
                                    <strong className="text-[#0f2925]">{meta.actual_participants} Citizens</strong>
                                  </div>
                                )}
                                {meta.area_covered && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Area Covered</span>
                                    <strong className="text-[#0f2925]">{meta.area_covered}</strong>
                                  </div>
                                )}
                                {meta.disinfection_status && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Site Condition</span>
                                    <strong className="text-emerald-700">{meta.disinfection_status}</strong>
                                  </div>
                                )}
                              </div>
                              {meta.waste_disposal_details && (
                                <p className="text-slate-600 pt-1 border-t border-slate-100">
                                  <strong className="text-slate-800">Disposal: </strong>{meta.waste_disposal_details}
                                </p>
                              )}
                              {meta.equipment_used && (
                                <p className="text-slate-600">
                                  <strong className="text-slate-800">Equipment: </strong>
                                  {Array.isArray(meta.equipment_used) ? meta.equipment_used.join(', ') : meta.equipment_used}
                                </p>
                              )}
                              {meta.challenges_notes && (
                                <p className="text-slate-600">
                                  <strong className="text-slate-800">Notes / Follow-up: </strong>{meta.challenges_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Rejection Remarks Warning if rejected */}
                        {ev.verification_status === 'rejected' && ev.verification_notes && (
                          <div className="mx-4 mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-[10px] uppercase font-black text-rose-900">Rejection Reason:</strong>
                              <span>{ev.verification_notes}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Verify / Reject Action Footer */}
                      {!isCompleted && (
                        <div className="p-3 bg-white border-t border-slate-200/80">
                          {rejectingEvId === ev.id ? (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-black uppercase text-rose-900">
                                Specify Rejection Reason / Correction Required:
                              </label>
                              <input
                                type="text"
                                value={rejectNote}
                                onChange={e => setRejectNote(e.target.value)}
                                placeholder="e.g. Unclear site photo, waste not fully bagged, wrong spot..."
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-rose-300 outline-none focus:border-rose-600 bg-rose-50/30"
                              />
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => { setRejectingEvId(null); setRejectNote(''); }}
                                  className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={actionEvId === ev.id}
                                  onClick={() => handleVerifyEvidence(ev.id, 'rejected', rejectNote)}
                                  className="px-3.5 py-1 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
                                >
                                  Confirm Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-500 font-medium">
                                {ev.verification_status === 'verified'
                                  ? 'Status: Verified'
                                  : ev.verification_status === 'rejected'
                                  ? 'Status: Flagged for Correction'
                                  : 'Action Required:'}
                              </span>
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={actionEvId === ev.id}
                                  onClick={() => { setRejectingEvId(ev.id); setRejectNote(ev.verification_notes || ''); }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 ${
                                    ev.verification_status === 'rejected'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  }`}
                                  title="Reject or flag evidence with notes"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionEvId === ev.id}
                                  onClick={() => handleVerifyEvidence(ev.id, 'verified')}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 ${
                                    ev.verification_status === 'verified'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                  title="Verify evidence photo"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>{actionEvId === ev.id ? 'Saving...' : 'Verify'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mark Complete & Approve Section */}
            {!isCompleted && (
              <div className="p-5 rounded-2xl bg-[#f0f7f5] border border-[#cde6df] space-y-3">
                <div className="flex items-center gap-2 text-[#095c54]">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="text-sm font-black">Ward Officer Final Verification &amp; Completion Approval</h4>
                </div>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Enter official inspection remarks..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-[#095c54]"
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-slate-600">
                    Approving will move this drive to <strong>Complete Drive History</strong> and unlock QR Certificate issuance for all participants.
                  </p>
                  <button
                    type="button"
                    disabled={completing}
                    onClick={handleMarkCompleteAndApprove}
                    className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    {completing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                    <span>Mark as Complete &amp; Approve Drive</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: ISSUE QR-VERIFIED CERTIFICATES                         */}
      {/* ================================================================= */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-[#0f2925] flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Official NMC QR-Verified Cleanliness Certificates</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate unique QR-verified certificates for <strong>{activity.community_name || 'Community Head'}</strong> and all <strong>{presentCount > 0 ? presentCount : registrations.length} participated citizen{registrations.length === 1 ? '' : 's'}</strong>. Issued certificates appear automatically in their dashboards!
                </p>
              </div>

              <button
                type="button"
                disabled={!isCompleted || issuingCerts}
                onClick={handleIssueCertificates}
                className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition shrink-0 self-start md:self-auto"
              >
                {issuingCerts ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>
                  {certificates.length > 0
                    ? `Sync / Re-Issue Certificates (${certificates.length} Issued)`
                    : 'Generate & Issue Certificates'}
                </span>
              </button>
            </div>

            {/* Scope Selection Card before issuing */}
            {isCompleted && (
              <div className="p-4 rounded-2xl bg-[#f7fbf9] border border-[#cde6df] space-y-2.5">
                <label className="text-xs font-extrabold text-[#095c54] flex items-center gap-1.5 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Certificate Issuance Scope &amp; Eligibility:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition ${
                      certOption === 'all'
                        ? 'bg-white border-[#095c54] shadow-xs ring-1 ring-[#095c54]'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="certOption"
                      checked={certOption === 'all'}
                      onChange={() => setCertOption('all')}
                      className="mt-0.5 text-[#095c54] focus:ring-[#095c54]"
                    />
                    <div>
                      <span className="block text-xs font-black text-[#0f2925]">
                        Issue for All Enrolled Volunteers ({registrations.length})
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Present volunteers stamped <strong className="text-emerald-700">PRESENT</strong>; absent volunteers stamped <strong className="text-rose-700">ABSENT</strong>.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition ${
                      certOption === 'present_only'
                        ? 'bg-white border-[#095c54] shadow-xs ring-1 ring-[#095c54]'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="certOption"
                      checked={certOption === 'present_only'}
                      onChange={() => setCertOption('present_only')}
                      className="mt-0.5 text-[#095c54] focus:ring-[#095c54]"
                    />
                    <div>
                      <span className="block text-xs font-black text-[#0f2925]">
                        Issue Only for Present Volunteers ({presentCount > 0 ? presentCount : 1})
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Awards only confirmed volunteers who checked in (omits absent registrants).
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {!isCompleted && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Please verify evidence and mark this drive as Complete in Tab 2 before issuing official certificates.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('evidence')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold"
                >
                  Go to Evidence Tab
                </button>
              </div>
            )}

            {certificates.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {/* Mobile Issued Certificates Cards (< md) */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {certificates
                      .slice((certPage - 1) * tablePageSize, certPage * tablePageSize)
                      .map((cert, pageIdx) => {
                        const idx = (certPage - 1) * tablePageSize + pageIdx;
                        return (
                      <div key={cert.id || cert.certificate_code} className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-extrabold text-xs text-[#0f2925] truncate">{idx + 1}. {cert.recipient_name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-black text-[#095c54] bg-[#f0f7f5] px-1.5 py-0.5 rounded">
                              {cert.certificate_code}
                            </span>
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              {cert.recipient_role === 'community_head' ? 'Head' : 'Citizen'}
                            </span>
                            {cert.attendance_status === 'absent' ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                Absent
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {cert.recipient_role === 'community_head' ? 'Organizer' : 'Present'}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCertId(cert.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#095c54] text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-300" />
                          <span>View</span>
                        </button>
                      </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f7f9f8] border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Certificate Code</th>
                          <th className="py-3 px-4">Recipient Name</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Attendance</th>
                          <th className="py-3 px-4">Issued Date</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {certificates
                      .slice((certPage - 1) * tablePageSize, certPage * tablePageSize)
                      .map((cert, pageIdx) => {
                        const idx = (certPage - 1) * tablePageSize + pageIdx;
                        return (
                          <tr key={cert.id || cert.certificate_code} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] font-black text-[#095c54] bg-[#f0f7f5] border border-[#cde6df] px-2.5 py-1 rounded-lg">
                                {cert.certificate_code}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-extrabold text-[#0f2925]">{cert.recipient_name}</p>
                              {cert.community_name && (
                                <p className="text-[11px] text-slate-500">{cert.community_name}</p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                  cert.recipient_role === 'community_head'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {cert.recipient_role === 'community_head' ? 'Community Head' : 'Citizen Volunteer'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {cert.attendance_status === 'absent' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                  Absent
                                </span>
                              ) : cert.recipient_role === 'community_head' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                  Organizer
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Present
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {cert.issued_at
                                ? new Date(cert.issued_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : 'Today'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCertId(cert.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition"
                              >
                                <Award className="w-3.5 h-3.5 text-amber-300" />
                                <span>View Certificate</span>
                              </button>
                            </td>
                          </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={certPage}
                    totalItems={certificates.length}
                    pageSize={tablePageSize}
                    onPageChange={setCertPage}
                    itemLabel="certificates"
                  />
                </div>

                {/* Certificate Preview & Print Modal */}
                {selectedCertId && activeCert && (
                  <div
                    className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
                    onClick={() => setSelectedCertId(null)}
                  >
                    <div
                      className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-[#0f2925]">
                            Certificate Preview — {activeCert.recipient_name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {activeCert.certificate_code} · {activeCert.recipient_role === 'community_head' ? 'Community Head' : 'Participated Citizen'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCertId(null)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                          aria-label="Close certificate preview"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <CertificateCard certificate={activeCert} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              isCompleted && (
                <div className="p-10 text-center bg-[#f7f9f8] rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <Award className="w-10 h-10 text-amber-500 mx-auto" />
                  <h4 className="text-sm font-extrabold text-[#0f2925]">Ready to Generate Certificates</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click <strong>"Generate &amp; Issue Certificates to All Participants"</strong> above to generate unique QR-verified NMC certificates for the Community Head and every participated citizen.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
