import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  MessageSquare,
  Camera,
  Check,
  UserCheck,
  UserX,
  Download,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Upload,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Clock,
  FileCheck2,
  MapPin
} from 'lucide-react';
import { ActivityRegistration, ActivityQuestion, ActivityEvidence } from '../../types/index.js';
import { api } from '../../services/api.js';
import { checkTextForAbuse } from '../../utils/moderation.js';

interface DriveOperationsTabsProps {
  driveId: string;
  driveTitle: string;
  driveStartTime?: string;
  driveMeetingPoint?: string;
  driveGears?: string[];
  maxCapacity?: number;
  communityId?: string;
  isJointDrive?: boolean;
  evidenceStatus?: string;
  evidenceReviewComments?: string;
  initialSubTab?: 'attendance' | 'questions' | 'evidence';
  // Optional capacity controls (used for Community Head-created drives)
  showCapacityControls?: boolean;
  registrationStatus?: string;
  onUpdateCapacity?: (newLimit: number) => Promise<void>;
  onToggleRegistration?: () => Promise<void>;
  onEvidenceSubmitted?: () => void;
}

export const DriveOperationsTabs: React.FC<DriveOperationsTabsProps> = ({
  driveId,
  driveTitle,
  driveStartTime,
  driveMeetingPoint,
  driveGears = [],
  maxCapacity = 50,
  communityId,
  isJointDrive = false,
  evidenceStatus: propEvidenceStatus,
  evidenceReviewComments,
  initialSubTab = 'attendance',
  showCapacityControls = false,
  registrationStatus,
  onUpdateCapacity,
  onToggleRegistration,
  onEvidenceSubmitted
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'questions' | 'evidence'>(initialSubTab);

  // Data state
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [evidenceList, setEvidenceList] = useState<ActivityEvidence[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Attendance filter (for joint drives: default to My Community so each Community Head verifies their own team)
  const [teamFilter, setTeamFilter] = useState<'all' | 'mine'>(isJointDrive ? 'mine' : 'all');
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<string | null>(null);

  // Optional capacity controls
  const [capacityInput, setCapacityInput] = useState<number>(maxCapacity);
  const [savingCapacity, setSavingCapacity] = useState<boolean>(false);

  // Q&A state
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [sendingAnswerId, setSendingAnswerId] = useState<string | null>(null);

  // Evidence state
  const [stage, setStage] = useState<'before' | 'during' | 'after'>('after');
  const [caption, setCaption] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [aiPhotoStatus, setAiPhotoStatus] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [localEvidenceStatus, setLocalEvidenceStatus] = useState<string | undefined>(propEvidenceStatus);

  // Voice dictation
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'en-IN' | 'gu-IN' | 'hi-IN'>('en-IN');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setLocalEvidenceStatus(propEvidenceStatus);
  }, [propEvidenceStatus]);

  useEffect(() => {
    setCapacityInput(maxCapacity);
  }, [maxCapacity]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner(prev => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const loadAllCountsAndTab = async () => {
    setLoading(true);
    try {
      const [regRes, qRes, evRes] = await Promise.all([
        api.getActivityRegistrations(driveId, 1, 100).catch(() => ({ success: false, data: [] as any })),
        api.getCommunityQuestions({ activity_id: driveId }).catch(() => ({ success: false, data: [] as ActivityQuestion[] })),
        api.getActivityEvidence(driveId).catch(() => ({ success: false, data: [] as ActivityEvidence[] }))
      ]);

      const regRaw = (regRes as any)?.data;
      const regList: ActivityRegistration[] = Array.isArray(regRaw)
        ? regRaw
        : Array.isArray(regRaw?.registrations)
        ? regRaw.registrations
        : [];
      setRegistrations(regList);

      const qList: ActivityQuestion[] = Array.isArray((qRes as any)?.data) ? (qRes as any).data : [];
      setQuestions(qList);

      const evList: ActivityEvidence[] = Array.isArray((evRes as any)?.data) ? (evRes as any).data : [];
      setEvidenceList(evList);
    } catch (err) {
      console.warn('Failed to load drive operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCountsAndTab();
  }, [driveId]);

  // =========================================================================
  // 1. ATTENDANCE HANDLERS
  // =========================================================================
  const handleSetAttendance = async (regId: string, nextStatus: 'present' | 'absent') => {
    setUpdatingAttendanceId(regId);
    try {
      await api.updateRegistrationAttendance(regId, nextStatus);
      setRegistrations(prev =>
        prev.map(r => (r.id === regId ? { ...r, attendance_status: nextStatus } : r))
      );
      showNotice('success', `Volunteer attendance marked as ${nextStatus === 'present' ? 'PRESENT' : 'ABSENT'}.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update attendance.');
    } finally {
      setUpdatingAttendanceId(null);
    }
  };

  const handleCapacitySave = async () => {
    if (!onUpdateCapacity) return;
    if (capacityInput < 1) {
      showNotice('error', 'Capacity limit must be at least 1 volunteer.');
      return;
    }
    setSavingCapacity(true);
    try {
      await onUpdateCapacity(capacityInput);
      showNotice('success', `Max volunteer limit updated to ${capacityInput}.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update capacity.');
    } finally {
      setSavingCapacity(false);
    }
  };

  // =========================================================================
  // 2. Q&A HANDLERS
  // =========================================================================
  const handleAiSuggest = async (q: ActivityQuestion) => {
    setAiLoadingId(q.id);
    try {
      let suggested = '';
      try {
        const res = await api.generateAiQuestionSuggestion(q.id);
        suggested = res.data?.suggested_answer || '';
      } catch {
        // Fallback contextual answer
        const timeStr = driveStartTime
          ? new Date(driveStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
          : 'the scheduled time';
        const gearText = driveGears.length > 0 ? ` Recommended gears: ${driveGears.join(', ')}.` : '';
        suggested = `Namaste ${q.citizen_name || 'Citizen'}! Thank you for asking about "${driveTitle}". Please gather at ${driveMeetingPoint || 'the designated meeting point'} on ${timeStr}.${gearText} Our coordinators will assist you on site.`;
      }
      setAnswerDrafts(prev => ({ ...prev, [q.id]: suggested }));
      showNotice('success', 'AI answer suggestion drafted. Review or edit below before sending.');
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleSendAnswer = async (qId: string) => {
    const answer = (answerDrafts[qId] || '').trim();
    if (!answer) {
      showNotice('error', 'Please enter a response before sending.');
      return;
    }
    const abuse = checkTextForAbuse(answer);
    if (!abuse.isSafe) {
      showNotice('error', `Inappropriate content detected (${abuse.detectedWord || abuse.reason}).`);
      return;
    }

    setSendingAnswerId(qId);
    try {
      await api.respondToQuestion(qId, answer);
      setQuestions(prev =>
        prev.map(q =>
          q.id === qId
            ? {
                ...q,
                status: 'answered',
                response_text: answer,
                answered_at: new Date().toISOString(),
                response: {
                  id: `resp-${Date.now()}`,
                  question_id: qId,
                  responder_id: 'community-head',
                  responder_name: 'Community Head',
                  response_text: answer,
                  ai_assisted: false,
                  created_at: new Date().toISOString()
                }
              }
            : q
        )
      );
      setAnswerDrafts(prev => ({ ...prev, [qId]: '' }));
      showNotice('success', 'Official answer sent to citizen!');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to send answer.');
    } finally {
      setSendingAnswerId(null);
    }
  };

  // =========================================================================
  // 3. EVIDENCE UPLOAD & OFFICER REVIEW REQUEST HANDLERS
  // =========================================================================
  const toggleVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showNotice('error', 'Voice dictation is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) setCaption(transcript.trim());
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handlePhotoSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotice('error', 'Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async e => {
      const b64 = e.target?.result as string;
      setImagePreview(b64);
      setAiPhotoStatus('Validating photo quality with AI...');
      try {
        const res = await api.aiCheckEvidenceQuality(b64);
        if (res.data?.passes_quality) {
          setAiPhotoStatus(`✓ Verified by AI: Genuine cleanliness drive photo`);
        } else {
          setAiPhotoStatus('✓ Photo attached and ready for upload');
        }
      } catch {
        setAiPhotoStatus('✓ Photo attached and ready for upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadEvidence = async () => {
    if (!imagePreview) {
      showNotice('error', 'Please capture or choose a photograph first.');
      return;
    }
    if (!caption.trim()) {
      showNotice('error', 'Please enter a description for this evidence photograph.');
      return;
    }
    const abuse = checkTextForAbuse(caption);
    if (!abuse.isSafe) {
      showNotice('error', `Inappropriate description detected (${abuse.detectedWord || abuse.reason}).`);
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadActivityEvidence(driveId, {
        image_url: imagePreview,
        stage,
        caption: caption.trim()
      });

      const created: ActivityEvidence = res.data || {
        id: `ev-${Date.now()}`,
        activity_id: driveId,
        evidence_type: stage,
        stage,
        storage_path: imagePreview,
        image_url: imagePreview,
        caption: caption.trim(),
        submission_status: 'draft',
        created_at: new Date().toISOString()
      };

      setEvidenceList(prev => [created, ...prev]);
      setImagePreview('');
      setCaption('');
      setAiPhotoStatus('');
      showNotice('success', 'Evidence photograph uploaded! Upload more or submit to Ward Officer for review.');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to upload evidence.');
    } finally {
      setUploading(false);
    }
  };

  const handleRequestOfficerReview = async () => {
    if (evidenceList.length === 0) {
      showNotice('error', 'Please upload at least one evidence photo of the completed work before requesting Officer review.');
      return;
    }

    setSubmittingReview(true);
    try {
      const notesText =
        reviewNotes.trim() ||
        `Completed cleanliness drive "${driveTitle}". ${presentCount} of ${registrations.length} volunteers attended. ${evidenceList.length} evidence photo(s) uploaded for Ward Officer verification.`;
      const res = await api.submitActivityEvidence(driveId, notesText);
      setLocalEvidenceStatus('submitted');
      setEvidenceList(prev => prev.map(e => ({ ...e, submission_status: 'submitted' })));
      setReviewNotes('');
      showNotice(
        'success',
        res.message || 'Evidence submitted! Review request has been sent to the Ward Officer.'
      );
      if (onEvidenceSubmitted) onEvidenceSubmitted();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to submit evidence for review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const displayedRegistrations =
    isJointDrive && teamFilter === 'mine' && communityId
      ? registrations.filter(r => !r.community_id || r.community_id === communityId)
      : registrations;

  const presentCount = displayedRegistrations.filter(r => r.attendance_status === 'present').length;
  const pendingCheckinsCount = displayedRegistrations.filter(r => r.attendance_status === 'pending_verification').length;
  const myPendingCheckinsCount = registrations.filter(
    r => r.attendance_status === 'pending_verification' && (!isJointDrive || !r.community_id || !communityId || r.community_id === communityId)
  ).length;
  const unansweredCount = questions.filter(q => q.status !== 'answered' && q.status !== 'closed').length;
  const isCapacityFull = registrations.length >= capacityInput;

  const isEvidenceSubmitted = localEvidenceStatus === 'submitted';
  const isEvidenceVerified = localEvidenceStatus === 'verified_complete' || localEvidenceStatus === 'ward_verified';
  const isEvidenceChangesRequested = localEvidenceStatus === 'changes_requested' || localEvidenceStatus === 'rejected';

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Horizontal Tab Bar */}
      <div className="bg-[#f8faf9] px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-[#095c54] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Attendance</span>
            {myPendingCheckinsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-amber-400 text-slate-900 font-black animate-pulse">
                {myPendingCheckinsCount} Pending
              </span>
            )}
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {presentCount}/{displayedRegistrations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'questions'
                ? 'bg-[#095c54] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Citizen Q&amp;A</span>
            {unansweredCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'questions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {questions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'bg-[#095c54] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Evidence Submission</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'evidence' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {evidenceList.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadAllCountsAndTab}
          disabled={loading}
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#095c54] transition shrink-0"
          title="Refresh drive data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
        </button>
      </div>

      {/* Inline Status Notice */}
      {statusBanner && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* TAB 1: ATTENDANCE & VOLUNTEERS */}
      {activeTab === 'attendance' && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Optional Capacity Controls (Community Head-created drives) */}
          {showCapacityControls && (
            <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700">Max Volunteer Limit:</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={capacityInput}
                  onChange={e => setCapacityInput(Number(e.target.value) || 1)}
                  className="w-20 px-2.5 py-1 rounded-xl border border-slate-300 text-xs font-black text-slate-900 outline-none focus:border-[#095c54]"
                />
                <button
                  type="button"
                  onClick={handleCapacitySave}
                  disabled={savingCapacity}
                  className="px-3 py-1 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-[#074741] transition"
                >
                  {savingCapacity ? 'Saving...' : 'Set Limit'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onToggleRegistration && (
                  <button
                    type="button"
                    onClick={onToggleRegistration}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      registrationStatus === 'closed' || isCapacityFull
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {registrationStatus === 'closed' || isCapacityFull ? 'Open Registration' : 'Close Registration'}
                  </button>
                )}

                <a
                  href={api.getRegistrationCsvUrl(driveId)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </a>
              </div>
            </div>
          )}

          {/* Attendance Summary Bar */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-700">
                  Citizen Attendance: <strong className="text-[#095c54]">{presentCount} Present</strong> / {displayedRegistrations.length} Enrolled
                </span>
                {isJointDrive && communityId && (
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTeamFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        teamFilter === 'all' ? 'bg-white text-[#095c54] shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      All Teams
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamFilter('mine')}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        teamFilter === 'mine' ? 'bg-white text-[#095c54] shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      My Community
                    </button>
                  </div>
                )}
              </div>

              {!showCapacityControls && (
                <a
                  href={api.getRegistrationCsvUrl(driveId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-[#095c54] hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Attendance CSV</span>
                </a>
              )}
            </div>

            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${displayedRegistrations.length > 0 ? Math.min(100, (presentCount / displayedRegistrations.length) * 100) : 0}%`
                }}
              />
            </div>
          </div>

          {/* Pending Geo-Tagged Check-Ins Alert Banner */}
          {pendingCheckinsCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-900">
                  📍 {pendingCheckinsCount} Citizen Geo-Tagged Check-In{pendingCheckinsCount === 1 ? '' : 's'} Awaiting Your Final Verification
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  These citizens checked in near the drive spot via GPS, but are <strong>not marked Present yet</strong>. Click <strong>Approve &amp; Mark Present</strong> below to confirm their final attendance so they qualify for the Completion Certificate.
                </p>
              </div>
            </div>
          )}

          {/* Registered Citizens List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 flex justify-between">
              <span>Registered Citizens ({displayedRegistrations.length})</span>
              <span className="text-slate-500">Final Attendance Confirmation</span>
            </div>

            {displayedRegistrations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No citizens have registered for {isJointDrive && teamFilter === 'mine' ? 'your community team in ' : ''}this drive yet. Once citizens enroll and submit geo-tagged check-ins, you can verify their final attendance here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {displayedRegistrations.map(reg => {
                  const isPresent = reg.attendance_status === 'present';
                  const isAbsent = reg.attendance_status === 'absent';
                  const isPendingCheckin = reg.attendance_status === 'pending_verification';
                  const isBusy = updatingAttendanceId === reg.id;
                  const canManageThisVolunteer =
                    !isJointDrive || !reg.community_id || !communityId || reg.community_id === communityId;

                  return (
                    <div
                      key={reg.id}
                      className={`p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs transition ${
                        isPendingCheckin ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPendingCheckin
                              ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400'
                              : isAbsent
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-[#e6f4f1] text-[#095c54]'
                          }`}
                        >
                          {(reg.citizen_name || 'CV').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-900 truncate">{reg.citizen_name || 'Citizen Volunteer'}</p>
                            {reg.community_name && (
                              <span className="px-2 py-0.2 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                                {reg.community_name}
                              </span>
                            )}
                            {isPendingCheckin && (
                              <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Geo-Tagged Check-In Pending
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {reg.citizen_phone || 'Verified Citizen'} · Reg #{reg.registration_number || '001'}
                          </p>
                          {(reg.checkin_distance_meters !== undefined || reg.checkin_latitude !== undefined) && (
                            <p className="text-[10px] font-bold text-teal-800 flex items-center gap-1 flex-wrap">
                              <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                              <span>
                                GPS Verified: {reg.checkin_distance_meters ?? 0}m from drive spot
                                {reg.checkin_latitude !== undefined && reg.checkin_longitude !== undefined
                                  ? ` (${reg.checkin_latitude.toFixed(4)}, ${reg.checkin_longitude.toFixed(4)})`
                                  : ''}
                                {reg.checkin_at
                                  ? ` · ${new Date(reg.checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : ''}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!canManageThisVolunteer ? (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                            Managed by {reg.community_name || 'Partner Community'}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSetAttendance(reg.id, 'present')}
                              className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : isPendingCheckin
                                  ? 'bg-[#095c54] text-white hover:bg-[#074741] shadow-sm ring-2 ring-emerald-200 font-black'
                                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
                              }`}
                            >
                              {isPresent ? <Check className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              <span>{isPendingCheckin ? 'Approve & Mark Present' : 'Present'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSetAttendance(reg.id, 'absent')}
                              className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200'
                              }`}
                            >
                              <UserX className="w-3 h-3" />
                              <span>{isPendingCheckin ? 'Reject' : 'Absent'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-200 text-[10px] font-semibold text-slate-500">
              ℹ️ Only citizens verified and marked <strong>Present</strong> by their respective Community Head receive the Official Drive Completion Certificate &amp; Civic Karma points.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CITIZEN Q&A */}
      {activeTab === 'questions' && (
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Citizen Questions ({questions.length})
            </h4>
            <span className="text-[11px] text-slate-500 font-semibold">
              AI-Assisted Community Head Replies
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
              No questions asked by citizens for this drive yet. When citizens ask questions on the Cleanliness Drives page, they will appear here for your reply.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {questions.map(q => {
                const replyText = q.response_text || q.response?.response_text;
                const isAnswered = q.status === 'answered' || Boolean(replyText);

                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-extrabold text-[#095c54]">
                          {q.citizen_name || 'Citizen'}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          {new Date(q.created_at).toLocaleString()}
                        </span>
                        <p className="text-xs text-slate-900 font-semibold mt-1">
                          &ldquo;{q.question_text}&rdquo;
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          isAnswered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isAnswered ? 'Answered' : 'Pending'}
                      </span>
                    </div>

                    {isAnswered ? (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Official Community Response:</span>
                        </p>
                        <p className="text-slate-800 leading-relaxed">{replyText}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-600">Your Answer:</label>
                          <button
                            type="button"
                            onClick={() => handleAiSuggest(q)}
                            disabled={aiLoadingId === q.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-[#095c54] border border-teal-200 text-[11px] font-bold hover:bg-teal-100 transition disabled:opacity-50"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span>{aiLoadingId === q.id ? 'Drafting...' : 'AI Suggest Answer'}</span>
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          value={answerDrafts[q.id] || ''}
                          onChange={e => setAnswerDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Type your response to this citizen..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#095c54]"
                        />

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSendAnswer(q.id)}
                            disabled={sendingAnswerId === q.id}
                            className="px-3.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendingAnswerId === q.id ? 'Sending...' : 'Send Answer'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EVIDENCE SUBMISSION & WARD OFFICER REVIEW REQUEST */}
      {activeTab === 'evidence' && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Current Review Status Banner */}
          {isEvidenceVerified && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-emerald-900">Completed Work Verified by Ward Officer!</p>
                <p className="text-emerald-800 mt-0.5">
                  {evidenceReviewComments || 'Your cleanliness drive evidence has been officially verified and marked complete.'}
                </p>
              </div>
            </div>
          )}

          {isEvidenceSubmitted && !isEvidenceVerified && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-indigo-900">Submitted · Awaiting Ward Officer Review</p>
                <p className="text-indigo-800 mt-0.5">
                  Your completion evidence packet has been sent to the Ward Officer for official verification. You can still attach additional photos if needed.
                </p>
              </div>
            </div>
          )}

          {isEvidenceChangesRequested && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-900">Officer Requested Additional Evidence / Changes</p>
                <p className="text-amber-800 mt-0.5">
                  {evidenceReviewComments || 'Please upload clearer before/after photographs and resubmit for Ward Officer review.'}
                </p>
              </div>
            </div>
          )}

          {/* Upload Form */}
          {!isEvidenceVerified && (
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#095c54]" />
                  <span>Upload Completed Work Evidence Photo</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-500">Before · During · After</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Stage *</label>
                  <select
                    value={stage}
                    onChange={e => setStage(e.target.value as 'before' | 'during' | 'after')}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-[#095c54]"
                  >
                    <option value="before">Before Cleanup</option>
                    <option value="during">During Drive</option>
                    <option value="after">After Completed Work</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Capture / Upload Photo *</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handlePhotoSelected(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#095c54] file:text-white hover:file:bg-[#074741] file:cursor-pointer"
                  />
                </div>
              </div>

              {imagePreview && (
                <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">Photo Selected</p>
                    <p className="text-emerald-700 font-semibold">{aiPhotoStatus || '✓ Ready to upload'}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-slate-700">Work Description / Caption *</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={speechLang}
                      onChange={e => setSpeechLang(e.target.value as any)}
                      className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5"
                    >
                      <option value="en-IN">EN</option>
                      <option value="gu-IN">ગુજ</option>
                      <option value="hi-IN">हिं</option>
                    </select>
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-50 text-[#095c54] border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span>{isListening ? 'Listening...' : 'Voice'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Describe the completed cleanup work, waste collected, and area condition..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadEvidence}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Evidence Photo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Evidence Photos Gallery */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-800">
              Uploaded Evidence Photos ({evidenceList.length})
            </h4>

            {evidenceList.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                No evidence photos uploaded yet. Upload before/during/after photos of the cleanliness drive, then request Ward Officer review below.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {evidenceList.map(ev => {
                  const evStage = ev.stage || ev.evidence_type || 'after';
                  const evImg = ev.image_url || ev.storage_path || '';
                  return (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs space-y-1.5 pb-2"
                    >
                      <div className="relative h-32 bg-slate-100">
                        <img src={evImg} alt={ev.caption || 'Evidence'} className="w-full h-full object-cover" />
                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white shadow-2xs ${
                            evStage === 'before'
                              ? 'bg-amber-600'
                              : evStage === 'during'
                              ? 'bg-blue-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {evStage}
                        </span>
                      </div>
                      <div className="px-2.5 text-xs space-y-0.5">
                        <p className="text-slate-800 font-semibold line-clamp-2">{ev.caption}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(ev.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Request Ward Officer Review Action Box */}
          {!isEvidenceVerified && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 space-y-3">
              <div className="flex items-start gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Request Ward Officer Work Review
                  </h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Once attendance is marked and completed work photos are uploaded, send this drive to the Ward Officer for official inspection and completion approval.
                  </p>
                </div>
              </div>

              <textarea
                rows={2}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Optional completion summary for Ward Officer (e.g. Approx. 250 kg segregated waste cleared by 18 volunteers)..."
                className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-xs text-slate-900 outline-none focus:border-indigo-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-indigo-900">
                  Summary: {presentCount} present volunteers · {evidenceList.length} evidence photo(s)
                </span>
                <button
                  type="button"
                  onClick={handleRequestOfficerReview}
                  disabled={submittingReview || evidenceList.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {submittingReview
                      ? 'Sending Review Request...'
                      : isEvidenceSubmitted
                      ? 'Resubmit Evidence & Request Officer Review'
                      : 'Submit Evidence & Request Ward Officer Review'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

