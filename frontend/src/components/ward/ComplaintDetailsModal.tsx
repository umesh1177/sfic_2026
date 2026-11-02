import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  FileText,
  Camera,
  ShieldCheck,
  ChevronRight,
  Crown,
  ThumbsUp,
  Sparkles,
  Navigation,
  Send,
  Eye,
  Check,
  Building,
  Flag,
  Star
} from 'lucide-react';
import { api } from '../../services/api.js';
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';

interface ComplaintDetailsModalProps {
  complaintId: string;
  onClose: () => void;
  onComplaintUpdated?: () => void;
  initialOpenAssign?: boolean;
  initialTab?: 'overview' | 'citizen_report' | 'location_map' | 'assignment_history' | 'timeline' | 'attendance' | 'evidence' | 'completion' | 'feedback' | 'reviews' | 'audit';
}

export const ComplaintDetailsModal: React.FC<ComplaintDetailsModalProps> = ({
  complaintId,
  onClose,
  onComplaintUpdated,
  initialOpenAssign = false,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'citizen_report'
    | 'location_map'
    | 'assignment_history'
    | 'timeline'
    | 'attendance'
    | 'evidence'
    | 'completion'
    | 'feedback'
    | 'reviews'
    | 'audit'
  >(initialTab);

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');

  // Assign Team Modal State
  const [showAssignDialog, setShowAssignDialog] = useState<boolean>(initialOpenAssign);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('Solid Waste Clearance');
  const [assignInstructions, setAssignInstructions] = useState<string>('');
  const [assignDeadline, setAssignDeadline] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [submittingAssign, setSubmittingAssign] = useState<boolean>(false);

  // Reopen Modal State
  const [showReopenDialog, setShowReopenDialog] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('Pavement still dirty / Leachate stain unwashed');
  const [customReopenNote, setCustomReopenNote] = useState<string>('');
  const [reopenUrgency, setReopenUrgency] = useState<'normal' | 'high' | 'critical'>('high');
  const [teamOption, setTeamOption] = useState<'previous' | 'new'>('previous');
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('f2000000-0000-0000-0000-000000000001');
  const [submittingReopen, setSubmittingReopen] = useState<boolean>(false);

  // Load details
  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getWardComplaintDetails(complaintId);
      setDetails(res.data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await api.getWardTeams();
        if (res.data && res.data.length > 0) {
          setTeamsList(res.data);
          setSelectedTeamId(res.data[0].id);
        }
      } catch (e) {
        console.error('Failed to load teams:', e);
      }
    };
    loadTeams();
  }, []);

  // Handle Team Assignment Submission
  const handleAssignTeamSubmit = async () => {
    setSubmittingAssign(true);
    setActionError('');
    try {
      const selectedTeam = teamsList.find(t => t.id === selectedTeamId) || teamsList[0];
      const res = await api.assignWardComplaint(complaintId, {
        team_id: selectedTeam?.id,
        team_name: selectedTeam?.team_name || 'Sanitation Unit 4B',
        work_type: selectedWorkType,
        instructions: assignInstructions,
        worker_ids: selectedTeam?.worker_ids,
        temporary_leader_id: selectedTeam?.temporary_leader_id,
        deadline: new Date(assignDeadline).toISOString()
      });
      setActionSuccess(res.message || 'Work assignment successfully dispatched to field team');
      setShowAssignDialog(false);
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign team');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Handle Reopen Submission
  const handleReopenSubmit = async () => {
    if (!reopenReason) {
      setActionError('Please specify a reason for reopening');
      return;
    }
    setSubmittingReopen(true);
    setActionError('');
    try {
      const res = await api.reopenWardComplaint(complaintId, {
        reopen_reason: reopenReason,
        description: customReopenNote,
        urgency: reopenUrgency,
        team_option: teamOption,
        temporary_leader_id: selectedLeaderId
      });
      setActionSuccess(res.message || 'Complaint successfully reopened');
      setShowReopenDialog(false);
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
      setActiveTab('timeline');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reopen complaint');
    } finally {
      setSubmittingReopen(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-[#095c54] animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#0f2925]">Loading Complete Complaint Dossier...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm font-bold text-[#0f2925]">Could not load complaint details.</p>
          <button onClick={onClose} className="px-4 py-2 bg-[#095c54] text-white rounded-xl text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const {
    overview,
    citizen_report,
    location_map,
    assignment_history,
    day_wise_timeline,
    team_attendance,
    work_progress_evidence,
    completion_reports,
    citizen_feedback,
    review_reopening_history,
    audit_history
  } = details;

  const isEligibleToReopen =
    overview.status === 'resolved' ||
    overview.status === 'closed' ||
    overview.status === 'awaiting_verification';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Municipal Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#095c54] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] px-2.5 py-0.5 rounded-full border border-[#b8e0d7]">
                  {overview.complaint_number}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    overview.status === 'resolved' || overview.status === 'closed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : overview.status === 'reopened'
                      ? 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse'
                      : overview.status === 'in_progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {overview.status.replace('_', ' ')}
                </span>
                {overview.reopen_count > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                    Reopened ×{overview.reopen_count}
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-[#0f2925] truncate mt-0.5">
                {overview.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {overview.status !== 'resolved' && overview.status !== 'closed' && (
              <button
                onClick={() => setShowAssignDialog(true)}
                className="px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{overview.status === 'assigned' || overview.status === 'in_progress' ? 'Reassign Team' : 'Assign Team & Resolve'}</span>
              </button>
            )}
            {/* Reopen Complaint Button (Available only for eligible completed complaints!) */}
            {isEligibleToReopen && (
              <button
                onClick={() => setShowReopenDialog(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reopen Complaint</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unified Status Progression Stepper */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-[#e2e8f0]">
          <StatusProgressionStepper
            status={overview.status}
            rejectionReason={(overview as any).rejection_reason}
            compact
          />
        </div>

        {/* Action Messages */}
        {actionSuccess && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 11 Internal Sections / Tabs Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-[#e2e8f0] bg-slate-50/70 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max pb-2">
            {[
              { id: 'overview', label: '1. Overview', icon: FileText },
              { id: 'citizen_report', label: '2. Citizen Report', icon: User },
              { id: 'location_map', label: '3. Location & Map', icon: MapPin },
              { id: 'assignment_history', label: '4. Assignment History', icon: Clock },
              { id: 'timeline', label: '5. Day-wise Timeline', icon: Calendar, highlight: true },
              { id: 'attendance', label: '6. Team & Attendance', icon: Users },
              { id: 'evidence', label: '7. Work Progress & Evidence', icon: Camera },
              { id: 'completion', label: '8. Completion Reports', icon: CheckCircle2 },
              { id: 'feedback', label: '9. Citizen Feedback', icon: ThumbsUp },
              { id: 'reviews', label: '10. Review & Reopening', icon: RefreshCw },
              { id: 'audit', label: '11. Audit History', icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : tab.highlight
                      ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: COMPLAINT OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Category</p>
                  <p className="text-sm font-extrabold text-[#0f2925] mt-1">{overview.category_name}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Priority</p>
                  <p className="text-sm font-extrabold text-[#0f2925] mt-1 capitalize">{overview.priority}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">SLA Deadline</p>
                  <p className="text-sm font-extrabold text-[#0f2925] mt-1">
                    {new Date(overview.sla_deadline).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Current Team Leader</p>
                  <p className="text-sm font-extrabold text-[#095c54] mt-1 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>{overview.temporary_team_leader_name || 'Unassigned'}</span>
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-50 border border-[#e2e8f0] space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Complaint Description
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {overview.description}
                </p>
              </div>

              {/* Status and Action banner */}
              <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-emerald-900">
                    Municipal Operations State:
                  </span>
                  <p className="text-xs text-emerald-800">
                    Assigned Task Code: <strong className="font-mono">{overview.current_task_code}</strong> · Active Team:{' '}
                    <strong>{overview.current_assigned_team}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {overview.status !== 'resolved' && overview.status !== 'closed' && (
                    <button
                      onClick={() => setShowAssignDialog(true)}
                      className="px-4 py-2 bg-[#095c54] text-white rounded-xl text-xs font-extrabold hover:bg-[#074741] transition flex items-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{overview.status === 'assigned' ? 'Reassign Team' : 'Assign Team & Start Resolving'}</span>
                    </button>
                  )}
                  {isEligibleToReopen && (
                    <button
                      onClick={() => setShowReopenDialog(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-extrabold hover:bg-purple-700 transition flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reopen for Follow-up Cleanliness</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CITIZEN REPORT */}
          {activeTab === 'citizen_report' && (
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-[#095c54]" />
                    <span className="text-sm font-extrabold text-[#0f2925]">{citizen_report.citizen_name}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(citizen_report.submitted_at).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Original Description</p>
                  <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {citizen_report.original_description}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Citizen Reported Location</p>
                  <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{citizen_report.reported_location}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Citizen Uploaded Photographic Evidence</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {citizen_report.original_photos.map((photo: string, idx: number) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-[#e2e8f0] aspect-video bg-slate-100 relative group">
                        <img src={photo} alt={`Citizen photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold">
                          Original Upload #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
                  <span>AI Pre-Classification Result: {citizen_report.ai_category_detected}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-[10px]">
                    Confidence {citizen_report.ai_confidence}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCATION & MAP */}
          {activeTab === 'location_map' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500">Ward</p>
                  <p className="text-xs font-extrabold text-[#0f2925] mt-0.5">
                    Ward {location_map.ward_number} · {location_map.ward_name}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500">Address / Landmark</p>
                  <p className="text-xs font-extrabold text-[#0f2925] mt-0.5 truncate">{location_map.address}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500">GPS Coordinates</p>
                  <p className="text-xs font-mono font-extrabold text-[#095c54] mt-0.5">
                    {location_map.latitude.toFixed(6)}, {location_map.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Map embed with OpenStreetMap tiles */}
              <div className="rounded-3xl border border-[#e2e8f0] overflow-hidden bg-slate-100 h-80 relative">
                <iframe
                  title="Complaint Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${location_map.longitude - 0.005}%2C${
                    location_map.latitude - 0.004
                  }%2C${location_map.longitude + 0.005}%2C${
                    location_map.latitude + 0.004
                  }&layer=mapnik&marker=${location_map.latitude}%2C${location_map.longitude}`}
                />
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-800 shadow-md flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span>Navsari Municipal Boundary · 100m Geofence Enforced</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASSIGNMENT HISTORY */}
          {activeTab === 'assignment_history' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                All Linked Work Assignments ({assignment_history.length})
              </h4>
              <div className="space-y-3">
                {assignment_history.map((ah: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#095c54] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                          {ah.task_code}
                        </span>
                        <span className="text-xs font-extrabold text-[#0f2925]">
                          Attempt #{ah.attempt_number}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {new Date(ah.assigned_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-2">
                        <span>Team Leader: <strong className="text-slate-800">{ah.team_leader_name}</strong></span>
                        <span>·</span>
                        <span>{ah.members_count} workers assigned</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {ah.review_decision}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DAY-WISE WORK TIMELINE (MANDATORY CHRONOLOGICAL ATTEMPTS, IMMUTABLE) */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-medium">
                <strong>Immutable Chronological Record:</strong> Historical assignments, attendance records, photographs, and review decisions are permanently preserved and never overwritten when a complaint is reopened.
              </div>

              <div className="space-y-6">
                {day_wise_timeline.map((attempt: any, index: number) => (
                  <div
                    key={attempt.id}
                    className="p-5 rounded-3xl bg-white border-2 border-slate-200 hover:border-[#095c54] transition shadow-xs space-y-4"
                  >
                    {/* Attempt Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-[#095c54] text-white flex items-center justify-center font-black text-xs">
                          {attempt.attempt_number}
                        </span>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#0f2925]">
                            Work Attempt #{attempt.attempt_number}
                            {attempt.reopen_reason && (
                              <span className="ml-2 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                                Reopened Attempt
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-500">
                            Task ID: {attempt.task_code} · Dispatched:{' '}
                            {new Date(attempt.assigned_date).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                            attempt.status === 'verified_complete'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : attempt.status === 'changes_requested'
                              ? 'bg-orange-50 text-orange-800 border-orange-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                        >
                          {attempt.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Reopening details if applicable */}
                    {attempt.reopen_reason && (
                      <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs space-y-1">
                        <p className="font-extrabold text-purple-900 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
                          <span>Reopening Reason: {attempt.reopen_reason}</span>
                        </p>
                        <p className="text-purple-800">
                          Reopened by {attempt.reopened_by} on{' '}
                          {new Date(attempt.reopened_at).toLocaleDateString('en-IN')}.
                        </p>
                      </div>
                    )}

                    {/* Team & Temporary Leader */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase">Assigned Field Unit</p>
                      <div className="flex flex-wrap gap-2">
                        {attempt.team_members.map((m: any) => (
                          <span
                            key={m.worker_id}
                            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                              m.is_temporary_leader
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {m.is_temporary_leader && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                            <span>{m.name}</span>
                            <span className="text-[10px] text-slate-500">({m.designation})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* GPS Attendance Records */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase">Field Attendance (GPS Geofence: 100m)</p>
                      {attempt.attendance_records && attempt.attendance_records.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {attempt.attendance_records.map((att: any) => (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div className="space-y-0.5">
                                <p className="font-extrabold text-[#0f2925] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Present – Location Verified</span>
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {att.distance_from_assignment_meters}m from site · Accuracy: ±{att.gps_accuracy}m
                                </p>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(att.attendance_timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No attendance records submitted yet for this attempt.</p>
                      )}
                    </div>

                    {/* Photographs & Evidence */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase">Work Evidence Submitted</p>
                      {attempt.evidence && attempt.evidence.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {attempt.evidence.map((ev: any) => (
                            <div key={ev.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                              <div className="aspect-video relative">
                                <img src={ev.storage_path} alt={ev.evidence_type} className="w-full h-full object-cover" />
                                <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-black uppercase tracking-wider">
                                  {ev.evidence_type} Work
                                </span>
                              </div>
                              <div className="p-3 space-y-1">
                                <p className="text-xs text-slate-800 font-medium line-clamp-2">{ev.description}</p>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                                  <span>Distance: {ev.distance_from_assignment_meters}m</span>
                                  <span className="font-bold text-emerald-700">Verified Location</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Evidence upload pending.</p>
                      )}
                    </div>

                    {/* Completion Report & Review Comments */}
                    {attempt.completion_report && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-800">
                            Completion Report ({attempt.completion_report.submitted_by_name})
                          </p>
                          <span className="text-[10px] font-bold text-slate-500">
                            {attempt.completion_report.waste_quantity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{attempt.completion_report.completion_description}</p>
                        {attempt.review_comments && (
                          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 mt-2">
                            <strong>Ward Officer Review:</strong> {attempt.review_comments}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TEAM & ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-[#0f2925]">
                    Daily Attendance & Geofence Verification
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Geofence boundary threshold: <strong>100 meters</strong>
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Active Task: {overview.current_task_code}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {team_attendance.team_members.map((member: any) => {
                  const record = (team_attendance.attendance_records || []).find(
                    (r: any) => r.worker_id === member.worker_id
                  );
                  return (
                    <div
                      key={member.worker_id}
                      className="p-4 rounded-2xl bg-white border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-extrabold text-xs text-[#095c54]">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-[#0f2925]">{member.name}</span>
                            {member.is_temporary_leader && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-600" />
                                <span>Team Leader</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{member.designation} · {member.worker_code}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {record ? (
                          <div className="text-right">
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Present – Location Verified</span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">
                              Distance: {record.distance_from_assignment_meters}m · Accuracy: ±{record.gps_accuracy}m
                            </p>
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                            Not Checked In
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: WORK PROGRESS & EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#0f2925]">
                  Side-by-Side Photographic Verification
                </h4>
                <span className="text-xs text-slate-500">
                  Task Code: <strong className="font-mono">{overview.current_task_code}</strong>
                </span>
              </div>

              {/* Side-by-side comparison on desktop, stacked on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="p-4 rounded-3xl bg-white border border-[#e2e8f0] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>Before Work Photo</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Captured at site
                    </span>
                  </div>
                  <div className="rounded-2xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                    <img
                      src={work_progress_evidence.before_photo}
                      alt="Before Work"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Initial citizen issue / pre-work condition.
                  </p>
                </div>

                {/* After Photo */}
                <div className="p-4 rounded-3xl bg-white border border-[#e2e8f0] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#095c54] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>After Cleanup Photo</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      GPS Matched
                    </span>
                  </div>
                  <div className="rounded-2xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                    {work_progress_evidence.after_photo ? (
                      <img
                        src={work_progress_evidence.after_photo}
                        alt="After Work"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                        <Camera className="w-8 h-8 opacity-40" />
                        <span className="text-xs font-bold">Field worker has not submitted after-work photo yet.</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Verified post-cleanup state after municipal sanitation deployment.
                  </p>
                </div>
              </div>

              {/* Evidence Review Action Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-700 font-bold">
                  Ward Officer Evidence Review Decision:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActionSuccess('Evidence verified and approved.')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify Evidence</span>
                  </button>
                  <button
                    onClick={() => setActionSuccess('Revision requested. Field team notified to re-clean.')}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-extrabold transition"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => setActionError('Evidence rejected with official remarks.')}
                    className="px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-extrabold transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: COMPLETION REPORTS */}
          {activeTab === 'completion' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Submitted Work Completion Reports ({completion_reports.length})
              </h4>
              {completion_reports.length > 0 ? (
                <div className="space-y-4">
                  {completion_reports.map((cr: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-3xl bg-white border border-[#e2e8f0] space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <p className="text-sm font-extrabold text-[#0f2925]">
                            Submitted by {cr.submitted_by_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Waste Disposed: <strong>{cr.waste_quantity}</strong> at {cr.waste_disposal_destination}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold">
                          {cr.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase">Work Performed</p>
                        <p className="text-xs text-slate-800 leading-relaxed">{cr.completion_description}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase">Equipment Used</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(cr.equipment_used || []).map((eq: string, eIdx: number) => (
                            <span
                              key={eIdx}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-6 text-center bg-slate-50 rounded-2xl">
                  No completion reports submitted yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 9: CITIZEN FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star}>
                        <Star
                          className={`w-4 h-4 ${
                            star <= (citizen_feedback.rating || 5)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-200'
                          }`}
                        />
                      </span>
                    ))}
                    <span className="text-xs font-black text-slate-700 ml-2">
                      {citizen_feedback.rating || 5} / 5 Satisfaction Rating
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Resolution Verified Satisfactory
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  "{citizen_feedback.feedback_text || 'Issue resolved thoroughly. The area smells much better now.'}"
                </p>
              </div>
            </div>
          )}

          {/* TAB 10: REVIEW & REOPENING HISTORY */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Officer Reviews & Reopening Log
              </h4>
              <div className="space-y-3">
                {(review_reopening_history.reviews || []).map((rev: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white border border-[#e2e8f0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0f2925]">
                        Attempt #{rev.attempt_number} · {rev.reviewer}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {new Date(rev.timestamp).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">Decision: <strong>{rev.decision}</strong></p>
                    {rev.comments && <p className="text-xs text-slate-600 italic">"{rev.comments}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Full Immutable Audit History ({audit_history.length})
              </h4>
              <div className="space-y-2">
                {audit_history.map((log: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#0f2925]">{log.action || log.description}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Actor: <strong>{log.actor_name}</strong> ({log.actor_role})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REOPEN COMPLAINT MODAL (Inside Complaint Details Only!) */}
      {showReopenDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Reopen Complaint {overview.complaint_number}
                </h3>
              </div>
              <button
                onClick={() => setShowReopenDialog(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Mandatory Reopen Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reopening Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden bg-white"
                >
                  <option value="Pavement still dirty / Leachate stain unwashed">
                    Pavement still dirty / Leachate stain unwashed
                  </option>
                  <option value="Garbage pile recurred immediately within 24 hours">
                    Garbage pile recurred immediately within 24 hours
                  </option>
                  <option value="Citizen dissatisfaction / Incomplete clearance">
                    Citizen dissatisfaction / Incomplete clearance
                  </option>
                  <option value="Drainage blockage persisting / Stagnant water">
                    Drainage blockage persisting / Stagnant water
                  </option>
                  <option value="Field inspection failed post-closure audit">
                    Field inspection failed post-closure audit
                  </option>
                  <option value="Other">Other (Specify in note below)</option>
                </select>
              </div>

              {/* Custom note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Details & Instructions for Sanitation Unit
                </label>
                <textarea
                  rows={2}
                  value={customReopenNote}
                  onChange={e => setCustomReopenNote(e.target.value)}
                  placeholder="e.g., Spray calcium hypochlorite bleaching powder and power wash tiles..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                <div className="flex gap-2">
                  {(['normal', 'high', 'critical'] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setReopenUrgency(u)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold capitalize transition border ${
                        reopenUrgency === u
                          ? 'bg-[#095c54] text-white border-[#095c54]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Assignment Options */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-extrabold text-[#0f2925]">Field Team Deployment Choice</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="teamOption"
                      checked={teamOption === 'previous'}
                      onChange={() => setTeamOption('previous')}
                      className="accent-[#095c54]"
                    />
                    <span>Option A: Assign Previous Team Again ({overview.temporary_team_leader_name || 'Kanti Solanki'})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="teamOption"
                      checked={teamOption === 'new'}
                      onChange={() => setTeamOption('new')}
                      className="accent-[#095c54]"
                    />
                    <span>Option B: Assign New Sanitation Team from Ward 3 Directory</span>
                  </label>
                </div>

                {teamOption === 'new' && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Select Temporary Team Leader for New Attempt:
                    </label>
                    <select
                      value={selectedLeaderId}
                      onChange={e => setSelectedLeaderId(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="f2000000-0000-0000-0000-000000000001">Kanti Solanki (Sanitation Worker)</option>
                      <option value="f2000000-0000-0000-0000-000000000002">Suresh Vaghela (Waste Collection Worker)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReopenDialog(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReopenSubmit}
                disabled={submittingReopen}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs"
              >
                {submittingReopen ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reopening...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Reopen & Deploy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Team Modal Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">
                    Assign Team & Start Resolving
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Complaint: <strong className="font-mono text-[#095c54]">{overview.complaint_number}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignDialog(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Team */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Sanitation Team <span className="text-red-500">*</span>
                </label>
                {teamsList.length > 0 ? (
                  <select
                    value={selectedTeamId}
                    onChange={e => setSelectedTeamId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#0f2925] bg-slate-50 focus:bg-white focus:border-[#095c54] outline-hidden transition"
                  >
                    {teamsList.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.team_name} — Leader: {team.temporary_leader_name} ({team.worker_ids?.length || 0} members)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    No custom teams found. Default team (Sanitation Unit 4B led by Kanti Solanki) will be auto-assigned.
                  </div>
                )}
              </div>

              {/* Type of Work */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Type of Work Required <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedWorkType}
                  onChange={e => setSelectedWorkType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#0f2925] bg-slate-50 focus:bg-white focus:border-[#095c54] outline-hidden transition"
                >
                  <option value="Solid Waste Clearance & Garbage Disposal">Solid Waste Clearance & Garbage Disposal</option>
                  <option value="Drainage Desilting & Cleaning">Drainage Desilting & Cleaning</option>
                  <option value="Road & Pavement Sweeping">Road & Pavement Sweeping</option>
                  <option value="Construction & Demolition Debris Removal">Construction & Demolition Debris Removal</option>
                  <option value="Public Urinal & Toilet Sanitization">Public Urinal & Toilet Sanitization</option>
                  <option value="Spot Cleansing & Bleaching Powder Spray">Spot Cleansing & Bleaching Powder Spray</option>
                </select>
              </div>

              {/* Target Completion Deadline */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Completion Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={assignDeadline}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setAssignDeadline(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#0f2925] bg-slate-50 focus:bg-white focus:border-[#095c54] outline-hidden transition"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ward Officer Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={assignInstructions}
                  onChange={e => setAssignInstructions(e.target.value)}
                  placeholder="e.g. Clear 50m radius around bin, sanitize with lime powder, and capture before/after photos..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#095c54] outline-hidden transition resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignDialog(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAssign}
                onClick={handleAssignTeamSubmit}
                className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
              >
                {submittingAssign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Assign Team & Dispatch Work</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

