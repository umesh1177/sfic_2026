import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Sparkles,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Send,
  Trash2,
  Eye,
  FileEdit,
  ArrowRight,
  Layers,
  Wand2,
  FileCheck,
  Ban,
  MessageSquare,
  Camera,
  Upload,
  Mic,
  MicOff,
  Bot,
  UserCheck,
  UserX,
  Download,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Crosshair,
  Scale,
  ClipboardCheck,
  Truck,
  Wrench,
  Sparkle,
  Award,
  Edit3
} from 'lucide-react';
import { CommunityActivity, ActivityRegistration, ActivityQuestion, ActivityEvidence, CommunityProblem } from '../../types/index.js';
import { api } from '../../services/api.js';
import { enqueueOfflineSubmission, isNetworkError } from '../../services/offlineSync.js';
import { MiniMapLocationPicker } from '../MiniMapLocationPicker.js';
import { checkTextForAbuse } from '../../utils/moderation.js';

interface ActivityManagementProps {
  activities: CommunityActivity[];
  onRefreshActivities: () => void;
  onSelectActivityForRegistrations?: (id: string) => void;
  onSelectActivityForEvidence?: (id: string) => void;
  onSelectActivityForApprovals?: (id: string) => void;
  initialOpenCreateWizard?: boolean;
  selectedActivityId?: string;
  onClearSelectedActivity?: () => void;
  initialSubTab?: 'registrations' | 'questions' | 'evidence';
  initialLinkedProblem?: CommunityProblem | null;
}

export const ActivityManagement: React.FC<ActivityManagementProps> = ({
  activities,
  onRefreshActivities,
  initialOpenCreateWizard = false,
  selectedActivityId: propSelectedActivityId,
  onClearSelectedActivity,
  initialSubTab = 'registrations',
  initialLinkedProblem = null
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewingActivityId, setViewingActivityId] = useState<string | null>(propSelectedActivityId || null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(initialOpenCreateWizard);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [communityProblems, setCommunityProblems] = useState<CommunityProblem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Sub-Tab per Activity Card
  const [activeSubTab, setActiveSubTab] = useState<Record<string, 'registrations' | 'questions' | 'evidence'>>({});

  // Sub-tab Data Dictionaries (Keyed by Activity ID)
  const [registrationsMap, setRegistrationsMap] = useState<Record<string, ActivityRegistration[]>>({});
  const [questionsMap, setQuestionsMap] = useState<Record<string, ActivityQuestion[]>>({});
  const [evidenceMap, setEvidenceMap] = useState<Record<string, ActivityEvidence[]>>({});
  const [loadingData, setLoadingData] = useState<Record<string, boolean>>({});

  // Capacity Limit Setting State
  const [capacityLimits, setCapacityLimits] = useState<Record<string, number>>({});
  const [savingCapacity, setSavingCapacity] = useState<Record<string, boolean>>({});

  // Citizen Q&A Responding State
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [aiGeneratingQuestion, setAiGeneratingQuestion] = useState<Record<string, boolean>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<Record<string, boolean>>({});

  // Evidence Upload State per Activity
  const [evidenceStage, setEvidenceStage] = useState<Record<string, 'before' | 'during' | 'after'>>({});
  const [evidenceCaption, setEvidenceCaption] = useState<Record<string, string>>({});
  const [evidenceImages, setEvidenceImages] = useState<Record<string, string[]>>({});
  const [evidenceAiStatus, setEvidenceAiStatus] = useState<Record<string, string>>({});
  const [uploadingEvidence, setUploadingEvidence] = useState<Record<string, boolean>>({});
  const [evidenceGps, setEvidenceGps] = useState<Record<string, { lat: number; lng: number; accuracy?: number }>>({});
  const [capturingGps, setCapturingGps] = useState<Record<string, boolean>>({});

  // Extended Ward Officer Review Fields for 'after' stage evidence
  const [afterReviewMeta, setAfterReviewMeta] = useState<
    Record<
      string,
      {
        waste_collected_kg: string;
        actual_participants: string;
        area_covered: string;
        waste_disposal_details: string;
        equipment_used: string;
        disinfection_status: string;
        challenges_notes: string;
      }
    >
  >({});

  // Live Camera Modal State (matching Sanitation Team Leader Dashboard)
  const [cameraActivityId, setCameraActivityId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getAfterMeta = (activityId: string) =>
    afterReviewMeta[activityId] || {
      waste_collected_kg: '',
      actual_participants: '',
      area_covered: '',
      waste_disposal_details: 'Segregated dry & wet waste handed to NMC collection vehicle',
      equipment_used: 'Brooms, Rubber Gloves, Heavy Duty Trash Bags, Masks',
      disinfection_status: 'Swept & Sanitized',
      challenges_notes: ''
    };

  const updateAfterMeta = (activityId: string, field: string, value: string) => {
    setAfterReviewMeta(prev => ({
      ...prev,
      [activityId]: {
        ...getAfterMeta(activityId),
        [field]: value
      }
    }));
  };

  const openLiveCamera = async (activityId: string) => {
    setCameraError(null);
    setCameraActivityId(activityId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError('Camera access unavailable on this device. Please use "Upload from Gallery" instead.');
    }
  };

  const closeLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActivityId(null);
    setCameraError(null);
  };

  const captureFromLiveCamera = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActivityId) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.85);
      const actId = cameraActivityId;
      setEvidenceImages(prev => ({
        ...prev,
        [actId]: [...(prev[actId] || []), b64]
      }));
      setEvidenceAiStatus(prev => ({ ...prev, [actId]: '✓ Live camera photo captured & added' }));
      closeLiveCamera();
    }
  };

  const captureEvidenceGps = (act: CommunityActivity) => {
    if (!navigator.geolocation) {
      setEvidenceGps(prev => ({
        ...prev,
        [act.id]: { lat: act.latitude || 20.9467, lng: act.longitude || 72.9279 }
      }));
      return;
    }
    setCapturingGps(prev => ({ ...prev, [act.id]: true }));
    navigator.geolocation.getCurrentPosition(
      pos => {
        setEvidenceGps(prev => ({
          ...prev,
          [act.id]: {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy)
          }
        }));
        setCapturingGps(prev => ({ ...prev, [act.id]: false }));
      },
      () => {
        setEvidenceGps(prev => ({
          ...prev,
          [act.id]: { lat: act.latitude || 20.9467, lng: act.longitude || 72.9279 }
        }));
        setCapturingGps(prev => ({ ...prev, [act.id]: false }));
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Unified status resolver matching Ward Officer Organization Drives
  const getDriveLifecycle = (act: CommunityActivity) => {
    const status = String(act.approval_status || 'draft').toLowerCase();
    const evStatus = String(act.evidence_status || '').toLowerCase();
    const evtStatus = String(act.event_status || '').toLowerCase();

    const isCompleted =
      evtStatus === 'completed' ||
      evStatus === 'verified_complete' ||
      evStatus === 'ward_verified';
    const isRejected = status === 'rejected';
    const isChangesRequested = status === 'changes_requested';
    const isApproved =
      !isRejected &&
      (status === 'approved' ||
        status === 'ward_approved' ||
        status === 'nmc_admin_approved' ||
        act.publication_status === 'published' ||
        isCompleted);
    const isPending =
      !isApproved &&
      !isRejected &&
      ['pending_officer_review', 'ward_review', 'nmc_admin_review', 'pending', 'submitted', 'changes_requested'].includes(status);
    const isDraft = !isApproved && !isPending && !isRejected;

    let label = 'Draft';
    let badgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
    let stepIndex = 1; // 1=Draft, 2=Pending Approval, 3=Approved/Active, 4=Evidence Submitted, 5=Verified Complete

    if (isCompleted) {
      label = 'Verified Complete';
      badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      stepIndex = 5;
    } else if (isRejected) {
      label = 'Rejected by Ward Officer';
      badgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
      stepIndex = 2;
    } else if (isChangesRequested) {
      label = 'Revision Requested';
      badgeClass = 'bg-orange-100 text-orange-800 border border-orange-300';
      stepIndex = 2;
    } else if (isApproved && evStatus === 'submitted') {
      label = 'Evidence Submitted · Awaiting Verification';
      badgeClass = 'bg-blue-100 text-blue-800 border border-blue-300';
      stepIndex = 4;
    } else if (isApproved) {
      label = evtStatus === 'ongoing' ? 'Approved · Drive Ongoing' : 'Approved & Active';
      badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      stepIndex = 3;
    } else if (isPending) {
      label = 'Pending Ward Approval';
      badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300';
      stepIndex = 2;
    }

    return { isApproved, isPending, isDraft, isCompleted, isRejected, isChangesRequested, label, badgeClass, stepIndex };
  };

  // Voice to Text Dictation State
  const [isListening, setIsListening] = useState<Record<string, boolean>>({});
  const [speechLang, setSpeechLang] = useState<'en-IN' | 'gu-IN' | 'hi-IN'>('en-IN');
  const recognitionRef = useRef<any>(null);

  // AI Description Assistant in Wizard
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Wizard Form State
  const [wizardForm, setWizardForm] = useState({
    title: '',
    activity_type: 'cleanliness_drive',
    short_description: '',
    detailed_description: '',
    volunteer_instructions: '',
    equipment_needed: ['Broom', 'Heavy Duty Garbage Bags', 'Rubber Gloves'],
    equipmentInput: '',
    proposed_start_at: '',
    proposed_end_at: '',
    target_area: '',
    meeting_point: '',
    latitude: 20.9467,
    longitude: 72.9279,
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    target_volunteers: 30,
    max_capacity: 500,
    auto_close_on_full: true,
    waitlist_allowed: true,
    save_as_draft: false
  });

  // Edit Approved Activity Modal State (Update start/end datetime & description fields only)
  const [editingApprovedAct, setEditingApprovedAct] = useState<CommunityActivity | null>(null);
  const [editApprovedForm, setEditApprovedForm] = useState({
    proposed_start_at: '',
    proposed_end_at: '',
    short_description: '',
    detailed_description: ''
  });
  const [submittingApprovedEdit, setSubmittingApprovedEdit] = useState<boolean>(false);
  const [approvedEditError, setApprovedEditError] = useState<string>('');

  const formatForDateTimeInput = (isoStr?: string): string => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toISTIso = (val: string): string => {
    if (!val) return '';
    if (val.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(val)) return val;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(val)) {
      return `${val.slice(0, 16)}:00+05:30`;
    }
    return new Date(val).toISOString();
  };

  const handleOpenEditModal = (act: CommunityActivity) => {
    setEditingApprovedAct(act);
    setApprovedEditError('');
    setEditApprovedForm({
      proposed_start_at: formatForDateTimeInput(act.proposed_start_at),
      proposed_end_at: formatForDateTimeInput(act.proposed_end_at),
      short_description: act.short_description || '',
      detailed_description: act.detailed_description || act.short_description || ''
    });
  };

  const handleSaveApprovedEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApprovedAct) return;
    if (!editApprovedForm.proposed_start_at) {
      setApprovedEditError('Start date & time is required');
      return;
    }
    if (!editApprovedForm.short_description.trim()) {
      setApprovedEditError('Short description is required');
      return;
    }

    setSubmittingApprovedEdit(true);
    setApprovedEditError('');
    try {
      await api.updateCommunityActivity(editingApprovedAct.id, {
        proposed_start_at: toISTIso(editApprovedForm.proposed_start_at),
        proposed_end_at: editApprovedForm.proposed_end_at ? toISTIso(editApprovedForm.proposed_end_at) : undefined,
        short_description: editApprovedForm.short_description.trim(),
        detailed_description: editApprovedForm.detailed_description.trim() || editApprovedForm.short_description.trim()
      });

      setEditingApprovedAct(null);
      setActionMessage({
        type: 'success',
        text: `Cleanliness Drive "${editingApprovedAct.title}" updated successfully!`
      });
      onRefreshActivities();
    } catch (err: any) {
      setApprovedEditError(err.message || 'Failed to update activity schedule & details');
    } finally {
      setSubmittingApprovedEdit(false);
    }
  };

  // Counts for each filter section (Completed drives move cleanly out of Approved Drives into Completed)
  const statusCounts = {
    all: activities.length,
    approved: activities.filter(a => {
      const lc = getDriveLifecycle(a);
      return lc.isApproved && !lc.isCompleted;
    }).length,
    pending: activities.filter(a => getDriveLifecycle(a).isPending).length,
    draft: activities.filter(a => getDriveLifecycle(a).isDraft).length,
    completed: activities.filter(a => getDriveLifecycle(a).isCompleted).length
  };

  // Filtered Activities with unified dynamic status matching
  const filteredActivities = activities.filter(act => {
    const lifecycle = getDriveLifecycle(act);

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'approved'
        ? lifecycle.isApproved && !lifecycle.isCompleted
        : filterStatus === 'pending'
        ? lifecycle.isPending
        : filterStatus === 'draft'
        ? lifecycle.isDraft
        : filterStatus === 'completed'
        ? lifecycle.isCompleted
        : true;

    const matchesSearch =
      searchQuery.trim() === '' ||
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.target_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.ward_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const viewingActivity = viewingActivityId
    ? activities.find(a => a.id === viewingActivityId) || null
    : null;

  const handleOpenActivityDetails = (act: CommunityActivity, subTab?: 'registrations' | 'questions' | 'evidence') => {
    const targetSubTab = subTab || activeSubTab[act.id] || 'registrations';
    setViewingActivityId(act.id);
    setActiveSubTab(prev => ({ ...prev, [act.id]: targetSubTab }));
    if (getDriveLifecycle(act).isApproved) {
      loadSubTabData(act.id, 'registrations');
      loadSubTabData(act.id, 'questions');
      loadSubTabData(act.id, 'evidence');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseActivityDetails = () => {
    setViewingActivityId(null);
    if (onClearSelectedActivity) {
      onClearSelectedActivity();
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.resolve(onRefreshActivities());
      if (viewingActivityId) {
        loadSubTabData(viewingActivityId, 'registrations');
        loadSubTabData(viewingActivityId, 'questions');
        loadSubTabData(viewingActivityId, 'evidence');
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  // Load real DB data for a specific activity & sub-tab (no static/mock fallbacks)
  const loadSubTabData = async (activityId: string, subTab: 'registrations' | 'questions' | 'evidence') => {
    setLoadingData(prev => ({ ...prev, [`${activityId}-${subTab}`]: true }));
    try {
      if (subTab === 'registrations') {
        const res = await api.getActivityRegistrations(activityId);
        const list = res.data?.registrations || (Array.isArray(res.data) ? res.data : []);
        setRegistrationsMap(prev => ({ ...prev, [activityId]: list }));
      } else if (subTab === 'questions') {
        const res = await api.getCommunityQuestions({ activity_id: activityId });
        const list = Array.isArray(res.data) ? res.data : [];
        setQuestionsMap(prev => ({ ...prev, [activityId]: list }));
      } else if (subTab === 'evidence') {
        const res = await api.getActivityEvidence(activityId);
        const list = Array.isArray(res.data) ? res.data : [];
        setEvidenceMap(prev => ({ ...prev, [activityId]: list }));
      }
    } catch (err: any) {
      console.warn(`Error loading ${subTab} for ${activityId}:`, err);
    } finally {
      setLoadingData(prev => ({ ...prev, [`${activityId}-${subTab}`]: false }));
    }
  };

  // Preload live data for approved activities so counts & rosters are immediately accurate
  useEffect(() => {
    const approvedIds = activities
      .filter(a => getDriveLifecycle(a).isApproved)
      .map(a => a.id);
    approvedIds.forEach(id => {
      if (!registrationsMap[id]) loadSubTabData(id, 'registrations');
      if (!evidenceMap[id]) loadSubTabData(id, 'evidence');
      if (!questionsMap[id]) loadSubTabData(id, 'questions');
    });
  }, [activities.map(a => `${a.id}:${a.approval_status}:${a.evidence_status}:${a.event_status}`).join('|')]);

  // Initialize selected card tabs on mount or explicit prop navigation (e.g. from Overview shortcut)
  useEffect(() => {
    if (propSelectedActivityId) {
      setViewingActivityId(propSelectedActivityId);
      setActiveSubTab(prev => ({ ...prev, [propSelectedActivityId]: initialSubTab }));
      loadSubTabData(propSelectedActivityId, initialSubTab);
    } else {
      setViewingActivityId(null);
    }
  }, [propSelectedActivityId, initialSubTab]);

  // Handle switching sub-tab on an activity card
  const handleSwitchSubTab = (activityId: string, tab: 'registrations' | 'questions' | 'evidence') => {
    setActiveSubTab(prev => ({ ...prev, [activityId]: tab }));
    loadSubTabData(activityId, tab);
  };

  // =========================================================================
  // 1. REGISTRATIONS & CAPACITY LIMIT LOGIC
  // =========================================================================
  const handleUpdateCapacityLimit = async (act: CommunityActivity) => {
    const currentDbLimit = Number((act as any).maximum_participants || act.max_capacity || 50);
    const newLimit = capacityLimits[act.id] !== undefined ? Number(capacityLimits[act.id]) : currentDbLimit;
    if (!newLimit || newLimit < 1) {
      setActionMessage({ type: 'error', text: 'Capacity limit must be at least 1 volunteer.' });
      return;
    }

    try {
      setSavingCapacity(prev => ({ ...prev, [act.id]: true }));
      await api.updateCommunityActivity(act.id, {
        maximum_participants: newLimit,
        max_capacity: newLimit
      } as any);
      setCapacityLimits(prev => {
        const next = { ...prev };
        delete next[act.id];
        return next;
      });
      setActionMessage({
        type: 'success',
        text: `Max registration limit saved to ${newLimit} volunteers. Registration will automatically close once ${newLimit} citizens enroll.`
      });
      onRefreshActivities();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update capacity limit.' });
    } finally {
      setSavingCapacity(prev => ({ ...prev, [act.id]: false }));
    }
  };

  const handleToggleRegistrationStatus = async (act: CommunityActivity) => {
    try {
      if (act.registration_status === 'open') {
        await api.closeActivityRegistration(act.id);
        setActionMessage({ type: 'success', text: 'Registrations are now CLOSED for citizens.' });
      } else {
        await api.openActivityRegistration(act.id);
        setActionMessage({ type: 'success', text: 'Registrations are now OPEN for citizens.' });
      }
      onRefreshActivities();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleToggleAttendance = async (activityId: string, regId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'present' ? 'absent' : 'present';
    try {
      await api.updateRegistrationAttendance(regId, nextStatus);
      setRegistrationsMap(prev => ({
        ...prev,
        [activityId]: (prev[activityId] || []).map(r =>
          r.id === regId ? { ...r, attendance_status: nextStatus } : r
        )
      }));
      setActionMessage({
        type: 'success',
        text: `Attendance marked: ${nextStatus === 'present' ? 'Present' : 'Absent'}`
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update attendance.' });
    }
  };

  // =========================================================================
  // 2. CITIZEN Q&A & AI CHATBOT SUGGESTION LOGIC
  // =========================================================================
  const handleAiSuggestAnswer = async (activity: CommunityActivity, question: ActivityQuestion) => {
    try {
      setAiGeneratingQuestion(prev => ({ ...prev, [question.id]: true }));
      // Generate intelligent contextual response using activity metadata
      const promptContext = `Cleanliness drive: "${activity.title}" at ${activity.target_area} on ${new Date(
        activity.proposed_start_at
      ).toLocaleDateString()}. Meeting point: ${activity.meeting_point}. Equipment: ${(
        activity.equipment_needed || []
      ).join(', ')}.`;

      let suggested = '';
      try {
        const res = await api.generateAiQuestionSuggestion(question.id);
        suggested = res.data?.suggested_answer || '';
      } catch {
        // Fallback intelligent civic chatbot answer
        suggested = `Namaste ${question.citizen_name}! Thank you for your question regarding "${activity.title}". The drive begins at ${new Date(
          activity.proposed_start_at
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} at ${activity.meeting_point}. All essential tools and safety gloves will be provided by NMC on site. We look forward to your active civic participation!`;
      }

      setQuestionAnswers(prev => ({ ...prev, [question.id]: suggested }));
      setActionMessage({
        type: 'success',
        text: 'AI Chatbot answer generated. Review or edit below and send.'
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Could not generate suggestion.' });
    } finally {
      setAiGeneratingQuestion(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const handleSendAnswer = async (activityId: string, questionId: string) => {
    const answer = questionAnswers[questionId];
    if (!answer || !answer.trim()) {
      setActionMessage({ type: 'error', text: 'Please write an answer before sending.' });
      return;
    }

    // Check for abusive content in answer
    const abuse = checkTextForAbuse(answer);
    if (!abuse.isSafe) {
      setActionMessage({
        type: 'error',
        text: `Cannot send: Inappropriate content detected (${abuse.detectedWord || abuse.reason}).`
      });
      return;
    }

    try {
      setSubmittingAnswer(prev => ({ ...prev, [questionId]: true }));
      await api.respondToQuestion(questionId, answer.trim());
      setQuestionsMap(prev => ({
        ...prev,
        [activityId]: (prev[activityId] || []).map(q =>
          q.id === questionId
            ? {
                ...q,
                status: 'answered',
                response_text: answer.trim(),
                answered_at: new Date().toISOString()
              }
            : q
        )
      }));
      setQuestionAnswers(prev => ({ ...prev, [questionId]: '' }));
      setActionMessage({ type: 'success', text: 'Official answer sent to citizen successfully!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit response.' });
    } finally {
      setSubmittingAnswer(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // =========================================================================
  // 3. EVIDENCE, VOICE-TO-TEXT & AI VALIDATION LOGIC
  // =========================================================================
  const toggleVoiceDictation = (activityId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setActionMessage({
        type: 'error',
        text: 'Voice recognition not supported in this browser. Please use Chrome or Edge.'
      });
      return;
    }

    if (isListening[activityId] && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(prev => ({ ...prev, [activityId]: false }));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(prev => ({ ...prev, [activityId]: true }));
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) {
          setEvidenceCaption(prev => ({ ...prev, [activityId]: transcript.trim() }));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(prev => ({ ...prev, [activityId]: false }));
      };

      recognition.onend = () => {
        setIsListening(prev => ({ ...prev, [activityId]: false }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(prev => ({ ...prev, [activityId]: false }));
    }
  };

  const handleEvidenceImagesSelected = (activityId: string, files: FileList | File[]) => {
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      setActionMessage({ type: 'error', text: 'Please select valid image files.' });
      return;
    }

    setEvidenceAiStatus(prev => ({
      ...prev,
      [activityId]: `Processing & validating ${fileList.length} photo${fileList.length > 1 ? 's' : ''}...`
    }));

    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = async e => {
        const b64 = e.target?.result as string;
        if (b64) {
          setEvidenceImages(prev => ({
            ...prev,
            [activityId]: [...(prev[activityId] || []), b64]
          }));
        }
      };
      reader.readAsDataURL(file);
    });

    setEvidenceAiStatus(prev => ({
      ...prev,
      [activityId]: `✓ ${fileList.length} photo${fileList.length > 1 ? 's' : ''} added & ready for submission`
    }));
  };

  const handleRemoveEvidenceImage = (activityId: string, index: number) => {
    setEvidenceImages(prev => ({
      ...prev,
      [activityId]: (prev[activityId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleUploadEvidence = async (act: CommunityActivity) => {
    const activityId = act.id;
    const photos = evidenceImages[activityId] || [];
    const caption = evidenceCaption[activityId] || '';
    const stage = evidenceStage[activityId] || 'before';
    const gps = evidenceGps[activityId];
    const meta = getAfterMeta(activityId);

    if (photos.length === 0) {
      setActionMessage({ type: 'error', text: 'Please capture a live photo or select at least one image from your device.' });
      return;
    }

    if (!caption.trim()) {
      setActionMessage({ type: 'error', text: 'Please enter a description for this evidence submission.' });
      return;
    }

    if (stage === 'after' && (!meta.waste_collected_kg.trim() || !meta.actual_participants.trim())) {
      setActionMessage({
        type: 'error',
        text: 'For After-stage completion review, please fill in Total Waste Collected (kg) and Actual Volunteers Present.'
      });
      return;
    }

    // AI Description Validation (Abuse check)
    const abuse = checkTextForAbuse(caption);
    if (!abuse.isSafe) {
      setActionMessage({
        type: 'error',
        text: `Inappropriate description detected: (${abuse.detectedWord || abuse.reason}). Please provide a professional civic description.`
      });
      return;
    }

    const reviewMetadata =
      stage === 'after'
        ? {
            waste_collected_kg: meta.waste_collected_kg.trim(),
            actual_participants: meta.actual_participants.trim(),
            area_covered: meta.area_covered.trim() || act.target_area || '',
            waste_disposal_details: meta.waste_disposal_details.trim(),
            equipment_used: meta.equipment_used.trim(),
            disinfection_status: meta.disinfection_status,
            challenges_notes: meta.challenges_notes.trim(),
            photos: photos
          }
        : { photos: photos };

    const evidencePayload = {
      photos: photos,
      storage_path: photos[0],
      image_url: photos[0],
      evidence_type: stage,
      stage,
      caption: caption.trim(),
      description: caption.trim(),
      latitude: gps?.lat || act.latitude || 20.9467,
      longitude: gps?.lng || act.longitude || 72.9279,
      review_metadata: reviewMetadata
    };

    try {
      setUploadingEvidence(prev => ({ ...prev, [activityId]: true }));

      // If offline, queue locally in IndexedDB and auto-sync when internet returns
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueOfflineSubmission(
          'community_evidence',
          `${stage.toUpperCase()} Evidence — ${act.title}`,
          evidencePayload,
          { activityId, stage }
        );
        const offlineEv: any = {
          id: `offline-ev-${Date.now()}`,
          activity_id: activityId,
          stage,
          evidence_type: stage,
          image_url: photos[0],
          storage_path: photos[0],
          caption: `${caption.trim()} [Saved Offline — Pending Sync]`,
          review_metadata: reviewMetadata,
          uploaded_by_name: 'Community Head',
          submission_status: 'pending_review',
          created_at: new Date().toISOString()
        };
        setEvidenceMap(prev => ({ ...prev, [activityId]: [offlineEv, ...(prev[activityId] || [])] }));
        setEvidenceImages(prev => ({ ...prev, [activityId]: [] }));
        setEvidenceCaption(prev => ({ ...prev, [activityId]: '' }));
        setEvidenceAiStatus(prev => ({ ...prev, [activityId]: '' }));
        setActionMessage({
          type: 'success',
          text: 'No internet detected — Evidence saved locally and will automatically upload to the server once you are back online!'
        });
        return;
      }

      const res = await api.uploadActivityEvidence(activityId, evidencePayload);

      const newEvidence: any = res.data || {
        id: `ev-${Date.now()}`,
        activity_id: activityId,
        stage,
        evidence_type: stage,
        image_url: photos[0],
        storage_path: photos[0],
        caption: caption.trim(),
        review_metadata: reviewMetadata,
        uploaded_by_name: 'Community Head',
        submission_status: 'pending_review',
        created_at: new Date().toISOString()
      };

      setEvidenceMap(prev => ({
        ...prev,
        [activityId]: [newEvidence, ...(prev[activityId] || [])]
      }));

      // Reset photos & caption
      setEvidenceImages(prev => ({ ...prev, [activityId]: [] }));
      setEvidenceCaption(prev => ({ ...prev, [activityId]: '' }));
      setEvidenceAiStatus(prev => ({ ...prev, [activityId]: '' }));

      setActionMessage({
        type: 'success',
        text:
          stage === 'after'
            ? `${photos.length} After-drive completion evidence photo${photos.length > 1 ? 's' : ''} & review report submitted successfully!`
            : `${photos.length} ${stage.toUpperCase()} stage evidence photo${photos.length > 1 ? 's' : ''} uploaded and synced to Ward Officer!`
      });
      onRefreshActivities();
    } catch (err: any) {
      if (isNetworkError(err)) {
        await enqueueOfflineSubmission(
          'community_evidence',
          `${stage.toUpperCase()} Evidence — ${act.title}`,
          evidencePayload,
          { activityId, stage }
        );
        setEvidenceImages(prev => ({ ...prev, [activityId]: [] }));
        setEvidenceCaption(prev => ({ ...prev, [activityId]: '' }));
        setEvidenceAiStatus(prev => ({ ...prev, [activityId]: '' }));
        setActionMessage({
          type: 'success',
          text: 'Network unavailable — Evidence saved locally and will automatically sync to the server when internet returns!'
        });
      } else {
        setActionMessage({ type: 'error', text: err.message || 'Failed to upload evidence.' });
      }
    } finally {
      setUploadingEvidence(prev => ({ ...prev, [activityId]: false }));
    }
  };

  // Submit all evidence for official NMC verification
  const handleSubmitAllEvidence = async (activityId: string) => {
    try {
      await api.submitActivityEvidence(activityId, 'All before/during/after evidence compiled for NMC inspection.');
      setActionMessage({
        type: 'success',
        text: 'All evidence submitted to Ward Officer for drive completion verification!'
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Evidence submitted successfully.' });
    }
  };

  // Load available Ward Officer problems for linking
  useEffect(() => {
    api.getCommunityWardProblems().then(res => {
      if (res.success && res.data) {
        setCommunityProblems(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialLinkedProblem) {
      applyProblemToForm(initialLinkedProblem);
    }
  }, [initialLinkedProblem]);

  const applyProblemToForm = (prob: CommunityProblem) => {
    setSelectedProblemId(prob.id);
    setWizardForm(prev => ({
      ...prev,
      title: prob.title,
      target_area: prob.location_name || prob.address,
      meeting_point: prob.address || prob.location_name,
      ward_number: prob.ward_number || 3,
      ward_name: prob.ward_name || `Ward ${prob.ward_number || 3}`,
      ward_id: `ward-0${prob.ward_number || 3}`,
      short_description: prob.description,
      detailed_description: `${prob.description}\n\nRecommended Action Plan by Ward Officer:\n${prob.action_plan}`,
      equipment_needed: prob.suggested_equipment && prob.suggested_equipment.length > 0 ? prob.suggested_equipment : prev.equipment_needed,
      target_volunteers: prob.estimated_volunteers_needed || 30,
      max_capacity: Math.max(50, (prob.estimated_volunteers_needed || 30) * 3),
      linked_problem_id: prob.id
    }));
  };

  const handleSelectProblem = (pId: string) => {
    setSelectedProblemId(pId);
    if (!pId) {
      setWizardForm(prev => ({ ...prev, linked_problem_id: undefined }));
      return;
    }
    const prob = communityProblems.find(p => p.id === pId);
    if (prob) {
      applyProblemToForm(prob);
    }
  };

  // =========================================================================
  // 4. WIZARD CREATION LOGIC
  // =========================================================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWizardForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEquipment = () => {
    if (wizardForm.equipmentInput.trim()) {
      setWizardForm(prev => ({
        ...prev,
        equipment_needed: [...prev.equipment_needed, prev.equipmentInput.trim()],
        equipmentInput: ''
      }));
    }
  };

  const handleRemoveEquipment = (index: number) => {
    setWizardForm(prev => ({
      ...prev,
      equipment_needed: prev.equipment_needed.filter((_, i) => i !== index)
    }));
  };

  const handleAiGenerateDescription = async () => {
    if (!wizardForm.title || !wizardForm.target_area) {
      alert('Please enter title and target area first so the AI can generate a tailored description.');
      return;
    }

    try {
      setAiLoading(true);
      const res = await api.aiGenerateDescription({
        title: wizardForm.title,
        activity_type: wizardForm.activity_type,
        target_area: wizardForm.target_area
      });

      if (res.data) {
        setWizardForm(prev => ({
          ...prev,
          short_description: res.data.short_description || prev.short_description,
          detailed_description: res.data.detailed_description || prev.detailed_description,
          volunteer_instructions: res.data.volunteer_instructions || prev.volunteer_instructions,
          equipment_needed:
            res.data.equipment_needed && res.data.equipment_needed.length > 0
              ? res.data.equipment_needed
              : prev.equipment_needed
        }));
      }
    } catch {
      setWizardForm(prev => ({
        ...prev,
        short_description: `Community-driven cleanup drive focusing on clearing litter, desilting, and tree planting at ${wizardForm.target_area}.`,
        detailed_description: `Join Navsari Green Warriors for an impactful cleanliness initiative at ${wizardForm.target_area}, Ward ${wizardForm.ward_number}. Together we will collect segregated dry/wet waste, clear plastics, and create a cleaner living environment for all residents.`,
        volunteer_instructions: 'Please wear comfortable cotton clothing, walking shoes, and bring a reusable water bottle. Safety gear and refreshments will be provided.'
      }));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitWizard = async (asDraft = false) => {
    if (!wizardForm.title || !wizardForm.target_area) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: wizardForm.title,
        activity_type: wizardForm.activity_type,
        short_description: wizardForm.short_description,
        detailed_description: wizardForm.detailed_description,
        volunteer_instructions: wizardForm.volunteer_instructions,
        equipment_needed: wizardForm.equipment_needed,
        proposed_start_at: wizardForm.proposed_start_at ? toISTIso(wizardForm.proposed_start_at) : new Date(Date.now() + 86400000 * 3).toISOString(),
        proposed_end_at: wizardForm.proposed_end_at ? toISTIso(wizardForm.proposed_end_at) : new Date(Date.now() + 86400000 * 3 + 10800000).toISOString(),
        target_area: wizardForm.target_area,
        meeting_point: wizardForm.meeting_point || wizardForm.target_area,
        latitude: wizardForm.latitude,
        longitude: wizardForm.longitude,
        ward_id: wizardForm.ward_id,
        ward_number: wizardForm.ward_number,
        ward_name: wizardForm.ward_name,
        target_volunteers: Number(wizardForm.target_volunteers) || 30,
        max_capacity: Number(wizardForm.max_capacity) || 500,
        auto_close_on_full: wizardForm.auto_close_on_full,
        waitlist_allowed: wizardForm.waitlist_allowed,
        linked_problem_id: (wizardForm as any).linked_problem_id || selectedProblemId || undefined,
        save_as_draft: asDraft
      };

      await api.createCommunityActivity(payload);
      setShowWizard(false);
      setActionMessage({
        type: 'success',
        text: asDraft
          ? 'Drive saved as draft.'
          : 'Cleanliness Drive submitted successfully for NMC Ward Officer inspection!'
      });
      onRefreshActivities();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit activity.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDriveSummaryCard = (act: CommunityActivity) => {
    const lifecycle = getDriveLifecycle(act);
    const isApproved = lifecycle.isApproved;
    const regList = registrationsMap[act.id] || [];
    const qList = questionsMap[act.id] || [];
    const evList = evidenceMap[act.id] || [];
    const regCount = regList.length || Number((act as any).registered_count || (act as any).current_volunteers || 0);
    const dbMaxCap = Number((act as any).maximum_participants || act.max_capacity || 50);
    const isCapacityFull = regCount >= dbMaxCap;
    const unansweredCount = qList.filter(q => q.status !== 'answered').length;

    return (
      <div
        key={act.id}
        id={`activity-${act.id}`}
        className={`bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between ${
          lifecycle.isCompleted ? 'border-emerald-200/90' : 'border-[#e2e8f0]'
        }`}
      >
        <div className="p-5 space-y-3.5">
          {/* Status Badges Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${lifecycle.badgeClass}`}
              >
                {lifecycle.label}
              </span>
              <span className="text-[11px] font-bold text-[#095c54] bg-[#e6f4f1] px-2.5 py-0.5 rounded-full border border-[#a7f3d0]">
                {act.ward_name || `Ward ${act.ward_number}`}
              </span>
              {isApproved && isCapacityFull && !lifecycle.isCompleted && (
                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Full ({regCount}/{dbMaxCap})
                </span>
              )}
            </div>

            {lifecycle.isCompleted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Award className="w-3 h-3 text-emerald-600" />
                <span>Approved & Complete</span>
              </span>
            )}
          </div>

          {/* Title & Short Description */}
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 tracking-tight line-clamp-1">
              {act.title}
            </h2>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {act.short_description || act.detailed_description}
            </p>
          </div>

          {/* Schedule & Location Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
              <span className="truncate">
                {new Date(act.proposed_start_at).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
                {' · '}
                {new Date(act.proposed_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
              <span className="truncate">{act.target_area || act.address || `Ward ${act.ward_number}`}</span>
            </div>
          </div>

          {/* Compact 5-Stage Lifecycle Bar */}
          <div className="pt-2 border-t border-slate-100">
            <div className="grid grid-cols-5 gap-1">
              {[
                { num: 1, label: 'Proposed' },
                { num: 2, label: 'Review' },
                { num: 3, label: 'Approved' },
                { num: 4, label: 'Evidence' },
                { num: 5, label: 'Completed' }
              ].map(st => {
                const done = !lifecycle.isRejected && lifecycle.stepIndex >= st.num;
                const current = !lifecycle.isRejected && lifecycle.stepIndex === st.num;
                return (
                  <div key={st.num} className="space-y-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        lifecycle.isRejected && st.num === 2
                          ? 'bg-rose-500'
                          : done
                          ? 'bg-[#095c54]'
                          : 'bg-slate-200'
                      }`}
                    />
                    <p
                      className={`text-[9px] font-bold truncate ${
                        lifecycle.isRejected && st.num === 2
                          ? 'text-rose-600'
                          : current
                          ? 'text-[#095c54] font-black'
                          : done
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {st.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Footer: Mini Metrics + View Details Button */}
        <div className="px-5 py-3.5 bg-[#f8faf9] border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {isApproved ? (
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-600">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                <Users className="w-3.5 h-3.5 text-[#095c54]" />
                <span>{regCount}/{dbMaxCap}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                <MessageSquare className="w-3.5 h-3.5 text-[#095c54]" />
                <span>{qList.length} Q&A</span>
                {unansweredCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black">
                    {unansweredCount} new
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                <Camera className="w-3.5 h-3.5 text-[#095c54]" />
                <span>{evList.length} Evidence</span>
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {lifecycle.isDraft
                  ? 'Saved as Draft — Submit for NMC approval'
                  : lifecycle.isRejected
                  ? 'Rejected — Open to view Ward Officer note'
                  : 'Awaiting Ward Officer inspection'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {isApproved && !lifecycle.isCompleted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(act);
                }}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition"
                title="Edit schedule and description"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenActivityDetails(act)}
              className="btn-primary-custom px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs hover:shadow transition shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn shadow-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & New Drive Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#095c54] tracking-tight">
            Activity Management
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#095c54] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowWizard(true);
              setWizardStep(1);
            }}
            className="btn-primary-custom px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>New Cleanliness Drive</span>
          </button>
        </div>
      </div>

      {/* 6-STEP CREATION WIZARD MODAL */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-[#095c54] uppercase">
                    Step {wizardStep} of 6
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {wizardStep === 1 && '1. Basic Drive Information'}
                    {wizardStep === 2 && '2. Date, Time & Shift Timing'}
                    {wizardStep === 3 && '3. Ward Location & Navsari Map'}
                    {wizardStep === 4 && '4. Volunteer Capacity & Limit (e.g. 500 Max)'}
                    {wizardStep === 5 && '5. Event Details & AI Assistant'}
                    {wizardStep === 6 && '6. Review & Official Submission'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowWizard(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Indicator Dots */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(st => (
                  <div
                    key={st}
                    className={`h-1.5 rounded-full flex-1 transition-all ${
                      st === wizardStep
                        ? 'bg-[#095c54]'
                        : st < wizardStep
                        ? 'bg-emerald-300'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* STEP 1: Basic Info */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  {/* Problem Dropdown from Ward Officer */}
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                    <label className="block font-black text-emerald-900 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#095c54]" />
                        Link to Civic Problem flagged by Ward Officer
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                        Officer Recommendation
                      </span>
                    </label>
                    <select
                      value={selectedProblemId}
                      onChange={e => handleSelectProblem(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 focus:border-[#095c54] text-xs font-bold text-slate-800 outline-none bg-white shadow-2xs"
                    >
                      <option value="">-- Standalone Cleanliness Drive (Create New Without Linking) --</option>
                      {communityProblems
                        .filter(p => {
                          const st = String(p.status || 'open').toLowerCase();
                          return st !== 'resolved' && st !== 'completed' && (st === 'open' || (p as any).allow_multiple_orgs !== false);
                        })
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            [Ward {p.ward_number}] {p.title} ({p.urgency.toUpperCase()} Urgency · ~{p.estimated_volunteers_needed} Volunteers{(p as any).allow_multiple_orgs === false ? ' · Exclusive' : ' · Multi-Org'})
                          </option>
                        ))}
                    </select>

                    {selectedProblemId && (
                      <div className="mt-2.5 p-3 bg-white/90 rounded-xl border border-emerald-200 text-[11px] text-slate-700 space-y-1">
                        <p className="font-extrabold text-[#095c54] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Linked to Problem: "{communityProblems.find(p => p.id === selectedProblemId)?.title}"
                        </p>
                        <p className="text-slate-600">
                          <strong>Ward Officer's Action Plan:</strong>{' '}
                          {communityProblems.find(p => p.id === selectedProblemId)?.action_plan}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Activity Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={wizardForm.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Dudhiya Talao Lakefront Mega Cleanliness Drive"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Activity Type</label>
                    <select
                      name="activity_type"
                      value={wizardForm.activity_type}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                    >
                      <option value="cleanliness_drive">Cleanliness Drive (General)</option>
                      <option value="drainage_cleanup">Drainage / Canal Desilting Drive</option>
                      <option value="lake_restoration">Waterbody / Lake Restoration</option>
                      <option value="plastic_collection">Single-Use Plastic Collection Drive</option>
                      <option value="tree_plantation">Swachh & Green Tree Plantation</option>
                      <option value="segregation_awareness">Waste Segregation Awareness Campaign</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Ward in Navsari</label>
                    <select
                      name="ward_number"
                      value={wizardForm.ward_number}
                      onChange={e => {
                        const wn = Number(e.target.value);
                        setWizardForm(prev => ({
                          ...prev,
                          ward_number: wn,
                          ward_id: `ward-${wn.toString().padStart(2, '0')}`,
                          ward_name: `Ward ${wn} - Navsari`
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 1).map(w => (
                        <option key={w} value={w}>
                          Ward {w} {w === 3 ? '(Dudhiya Talao & Ashapuri)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: Date & Time */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Proposed Start Time *</label>
                      <input
                        type="datetime-local"
                        name="proposed_start_at"
                        value={wizardForm.proposed_start_at}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Proposed End Time *</label>
                      <input
                        type="datetime-local"
                        name="proposed_end_at"
                        value={wizardForm.proposed_end_at}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Location */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Cleanliness Area *</label>
                    <input
                      type="text"
                      name="target_area"
                      value={wizardForm.target_area}
                      onChange={handleInputChange}
                      placeholder="e.g. Dudhiya Talao Ghat & Garden Walkway"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Meeting Point for Volunteers *</label>
                    <input
                      type="text"
                      name="meeting_point"
                      value={wizardForm.meeting_point}
                      onChange={handleInputChange}
                      placeholder="e.g. Main North Entrance, near Fountain Gate"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Volunteer Capacity & Limits */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target Volunteers</label>
                      <input
                        type="number"
                        name="target_volunteers"
                        min="5"
                        max="2000"
                        value={wizardForm.target_volunteers}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Max Capacity Limit (Auto-Close) *
                      </label>
                      <input
                        type="number"
                        name="max_capacity"
                        min="10"
                        max="5000"
                        value={wizardForm.max_capacity}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Registrations will automatically close once this limit (e.g. 500) is reached.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Details & AI Assistant */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Detailed Description & Instructions</label>
                    <button
                      type="button"
                      onClick={handleAiGenerateDescription}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 text-[#095c54] border border-teal-200 font-bold hover:bg-teal-100 transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#095c54]" />
                      <span>{aiLoading ? 'Generating...' : 'AI Auto-Draft'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    name="detailed_description"
                    value={wizardForm.detailed_description}
                    onChange={handleInputChange}
                    placeholder="Provide details about the cleanliness activity..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none"
                  />
                </div>
              )}

              {/* STEP 6: Review & Submission */}
              {wizardStep === 6 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{wizardForm.title || 'Untitled Activity'}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Target Ward: <strong>{wizardForm.ward_name}</strong></div>
                      <div>Max Limit: <strong>{wizardForm.max_capacity} volunteers</strong></div>
                      <div>Target Area: <strong>{wizardForm.target_area}</strong></div>
                      <div>Meeting Point: <strong>{wizardForm.meeting_point}</strong></div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Official NMC workflow: Ward Officer will inspect and sanction this activity for citizen registration.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 sm:p-5 flex items-center justify-between gap-3">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => prev - 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {wizardStep === 6 ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmitWizard(true)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmitWizard(false)}
                      className="btn-primary-custom px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? 'Submitting...' : 'Submit for NMC Approval'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && !wizardForm.title) {
                        alert('Please enter an activity title.');
                        return;
                      }
                      setWizardStep(prev => prev + 1);
                    }}
                    className="btn-primary-custom px-5 py-2.5 rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar (Shown in List View) */}
      {!viewingActivity && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'all', label: 'All Activities', count: statusCounts.all },
              { id: 'approved', label: 'Approved Drives', count: statusCounts.approved },
              { id: 'pending', label: 'Under Review', count: statusCounts.pending },
              { id: 'draft', label: 'Drafts', count: statusCounts.draft },
              { id: 'completed', label: 'Completed', count: statusCounts.completed }
            ].map(flt => (
              <button
                key={flt.id}
                onClick={() => setFilterStatus(flt.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  filterStatus === flt.id
                    ? flt.id === 'completed'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#095c54] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{flt.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    filterStatus === flt.id
                      ? 'bg-white/20 text-white'
                      : flt.id === 'completed' && flt.count > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {flt.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search drives, areas, wards..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#095c54]"
            />
          </div>
        </div>
      )}

      {/* LIVE CAMERA CAPTURE MODAL */}
      {cameraActivityId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#095c54]" />
                <h3 className="text-sm font-black text-slate-900">Live Site Evidence Camera</h3>
              </div>
              <button
                onClick={closeLiveCamera}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {cameraError ? (
                <div className="p-6 text-center rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                  {cameraError}
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeLiveCamera}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                {!cameraError && (
                  <button
                    type="button"
                    onClick={captureFromLiveCamera}
                    className="btn-primary-custom px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER-DETAIL VIEW: SUMMARY CARDS WITH VIEW DETAILS OR DEDICATED DRIVE DETAIL WORKSPACE */}
      {!viewingActivity ? (
        filteredActivities.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {filterStatus === 'completed'
                ? 'No completed cleanliness drives yet'
                : 'No activities match your criteria'}
            </p>
            <p className="text-xs text-slate-500">
              {filterStatus === 'completed'
                ? 'Once your drive evidence is verified and marked complete by the Ward Officer, it will appear here.'
                : 'Adjust your filter or create a new cleanliness drive.'}
            </p>
          </div>
        ) : filterStatus === 'all' ? (
          <div className="space-y-8">
            {/* Active, Approved & Pending Drives */}
            {filteredActivities.some(a => !getDriveLifecycle(a).isCompleted) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#095c54]" />
                    <span>Active & Upcoming Drives</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#e6f4f1] text-[#095c54] text-[10px]">
                      {filteredActivities.filter(a => !getDriveLifecycle(a).isCompleted).length}
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredActivities
                    .filter(a => !getDriveLifecycle(a).isCompleted)
                    .map(act => renderDriveSummaryCard(act))}
                </div>
              </div>
            )}

            {/* Completed Drives Section */}
            {filteredActivities.some(a => getDriveLifecycle(a).isCompleted) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed Drives (Ward Officer Verified)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                      {filteredActivities.filter(a => getDriveLifecycle(a).isCompleted).length}
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredActivities
                    .filter(a => getDriveLifecycle(a).isCompleted)
                    .map(act => renderDriveSummaryCard(act))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filterStatus === 'completed' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Completed Drives — Evidence verified and approved by your Ward Officer. Click <strong>View Details</strong> to inspect volunteer attendance, Q&A, and verified evidence.
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredActivities.map(act => renderDriveSummaryCard(act))}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {/* Back to Activities Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleCloseActivityDetails}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold transition shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Activities</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                <span className="font-semibold">Activity Management</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                <span className="font-black text-[#095c54] truncate">{viewingActivity.title}</span>
              </div>
            </div>

            {getDriveLifecycle(viewingActivity).isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completed & Ward Officer Verified</span>
              </span>
            )}
          </div>

          {[viewingActivity].map(act => {
            const lifecycle = getDriveLifecycle(act);
            const isApproved = lifecycle.isApproved;
            const currentSubTab = activeSubTab[act.id] || 'registrations';
            const regList = registrationsMap[act.id] || [];
            const qList = questionsMap[act.id] || [];
            const evList = evidenceMap[act.id] || [];
            const dbMaxCap = Number((act as any).maximum_participants || act.max_capacity || 50);
            const maxCap = capacityLimits[act.id] !== undefined ? capacityLimits[act.id] : dbMaxCap;
            const isCapacityFull = regList.length >= dbMaxCap;
            const currentStage = evidenceStage[act.id] || 'before';
            const afterMeta = getAfterMeta(act.id);

            return (
              <div
                key={act.id}
                id={`activity-${act.id}`}
                className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden"
              >
                {lifecycle.isCompleted && (
                  <div className="px-5 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-extrabold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                      <span>
                        Drive Verified & Marked Complete by Ward Officer — Moved to Completed Drives
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-extrabold uppercase tracking-wider">
                      Official Record Locked
                    </span>
                  </div>
                )}
                {/* 1. Drive Summary Banner */}
                <div className="p-5 sm:p-6 pb-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${lifecycle.badgeClass}`}
                        >
                          {lifecycle.label}
                        </span>

                        <span className="text-xs font-bold text-[#095c54] bg-[#e6f4f1] px-2.5 py-0.5 rounded-full border border-[#a7f3d0]">
                          {act.ward_name || `Ward ${act.ward_number}`}
                        </span>

                        {isApproved && isCapacityFull && !lifecycle.isCompleted && (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Registration Full ({regList.length}/{maxCap})
                          </span>
                        )}
                      </div>

                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {act.title}
                      </h2>

                      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                        {act.short_description || act.detailed_description}
                      </p>
                    </div>

                    {/* Drive Schedule & Status Pill */}
                    <div className="sm:text-right shrink-0 space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
                        <span>
                          {new Date(act.proposed_start_at).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {new Date(act.proposed_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(act.proposed_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 sm:justify-end">
                        <MapPin className="w-3 h-3 text-[#095c54] shrink-0" />
                        <span>{act.target_area}</span>
                      </p>
                      {isApproved && !lifecycle.isCompleted && (
                        <div className="pt-1 flex sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(act)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-extrabold transition shadow-2xs hover:border-amber-300"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit Schedule &amp; Details</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unified 5-Stage Live Status Tracking Bar (Synced with Ward Officer) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { num: 1, label: 'Proposed' },
                        { num: 2, label: 'Officer Review' },
                        { num: 3, label: 'Approved' },
                        { num: 4, label: 'Evidence Sent' },
                        { num: 5, label: 'Verified Done' }
                      ].map(st => {
                        const done = !lifecycle.isRejected && lifecycle.stepIndex >= st.num;
                        const current = !lifecycle.isRejected && lifecycle.stepIndex === st.num;
                        return (
                          <div key={st.num} className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                lifecycle.isRejected && st.num === 2
                                  ? 'bg-rose-500'
                                  : done
                                  ? 'bg-[#095c54]'
                                  : 'bg-slate-200'
                              }`}
                            />
                            <p
                              className={`text-[10px] font-bold truncate ${
                                lifecycle.isRejected && st.num === 2
                                  ? 'text-rose-600'
                                  : current
                                  ? 'text-[#095c54] font-black'
                                  : done
                                  ? 'text-slate-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.num}. {st.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. IF APPROVED: HORIZONTAL TABS (REGISTRATIONS, CITIZEN Q&A, EVENT EVIDENCE) */}
                {isApproved ? (
                  <div className="border-t border-[#f1f5f9]">
                    {/* Horizontal Sub-Navigation Tab Bar */}
                    <div className="bg-[#f8faf9] px-4 sm:px-6 py-2 border-b border-[#e2e8f0] flex items-center gap-2 overflow-x-auto">
                      <button
                        onClick={() => handleSwitchSubTab(act.id, 'registrations')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
                          currentSubTab === 'registrations'
                            ? 'bg-[#095c54] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Registrations & Limit</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                          currentSubTab === 'registrations' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {regList.length}/{maxCap}
                        </span>
                      </button>

                      <button
                        onClick={() => handleSwitchSubTab(act.id, 'questions')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
                          currentSubTab === 'questions'
                            ? 'bg-[#095c54] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Citizen Questions</span>
                        {qList.filter(q => q.status !== 'answered').length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                          currentSubTab === 'questions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {qList.length}
                        </span>
                      </button>

                      <button
                        onClick={() => handleSwitchSubTab(act.id, 'evidence')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition whitespace-nowrap ${
                          currentSubTab === 'evidence'
                            ? 'bg-[#095c54] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Event Gallery & Evidence</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                          currentSubTab === 'evidence' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {evList.length}
                        </span>
                      </button>
                    </div>

                    {/* Sub-Tab 1: Registrations & Capacity Limit */}
                    {currentSubTab === 'registrations' && (
                      <div className="p-5 sm:p-6 space-y-4 animate-fadeIn">
                        {/* Capacity Limit Bar & Controls */}
                        <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-slate-700">Set Max Volunteer Limit:</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="5000"
                                value={maxCap}
                                onChange={e =>
                                  setCapacityLimits(prev => ({ ...prev, [act.id]: Number(e.target.value) }))
                                }
                                className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 outline-none focus:border-[#095c54]"
                              />
                              <button
                                onClick={() => handleUpdateCapacityLimit(act)}
                                disabled={savingCapacity[act.id]}
                                className="btn-primary-custom px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs"
                              >
                                {savingCapacity[act.id] ? 'Saving...' : 'Set Limit'}
                              </button>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              (e.g. 500 max allow — registrations automatically lock when filled)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleRegistrationStatus(act)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                act.registration_status === 'closed' || isCapacityFull
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {act.registration_status === 'closed' || isCapacityFull ? 'Open Registration' : 'Close Registration'}
                            </button>

                            <a
                              href={api.getRegistrationCsvUrl(act.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Export CSV</span>
                            </a>
                          </div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">Volunteer Attendance Capacity</span>
                            <span className={isCapacityFull ? 'text-rose-600 font-black' : 'text-[#095c54]'}>
                              {regList.length} of {maxCap} Volunteers Enrolled ({((regList.length / maxCap) * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCapacityFull ? 'bg-rose-500' : 'bg-[#10b981]'
                              }`}
                              style={{ width: `${Math.min(100, (regList.length / maxCap) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Registered Citizens List */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-extrabold text-slate-700 flex justify-between">
                            <span>Registered Citizen Volunteers ({regList.length})</span>
                            <span className="text-slate-500">Attendance Verification</span>
                          </div>

                          {regList.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                              No citizens have enrolled in this drive yet.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {regList.map(reg => (
                                <div
                                  key={reg.id}
                                  className="p-3.5 sm:px-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-[#e6f4f1] text-[#095c54] font-black text-xs flex items-center justify-center shrink-0">
                                      {(reg.citizen_name || 'Citizen').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{reg.citizen_name || 'Citizen'}</p>
                                      <p className="text-[11px] text-slate-500">
                                        {reg.citizen_phone || 'Mobile verified'} · Reg #{reg.registration_number || '001'} · {new Date(reg.registered_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleToggleAttendance(act.id, reg.id, reg.attendance_status)}
                                      className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                                        reg.attendance_status === 'present'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {reg.attendance_status === 'present' ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Present</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Mark Present</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 2: Citizen Questions & Chatbot AI Suggestion */}
                    {currentSubTab === 'questions' && (
                      <div className="p-5 sm:p-6 space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Citizen Inquiries for this Drive ({qList.length})
                          </h3>
                          <span className="text-[11px] text-slate-500">
                            Community Head Review & AI Chatbot Response
                          </span>
                        </div>

                        {qList.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                            No questions asked by citizens for this drive yet.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {qList.map(q => (
                              <div
                                key={q.id}
                                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
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
                                      "{q.question_text}"
                                    </p>
                                  </div>

                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                      q.status === 'answered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {q.status === 'answered' ? 'Answered' : 'Pending Response'}
                                  </span>
                                </div>

                                {q.status === 'answered' || q.response_text || (q as any).response?.response_text ? (
                                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Official Community Answer:</span>
                                    </p>
                                    <p className="text-slate-800 leading-relaxed">
                                      {q.response_text || (q as any).response?.response_text}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-bold text-slate-600">Your Response:</label>
                                      <button
                                        type="button"
                                        onClick={() => handleAiSuggestAnswer(act, q)}
                                        disabled={aiGeneratingQuestion[q.id]}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-[#095c54] border border-teal-200 text-xs font-bold hover:bg-teal-100 transition disabled:opacity-50"
                                      >
                                        <Bot className="w-3.5 h-3.5 text-[#095c54]" />
                                        <span>
                                          {aiGeneratingQuestion[q.id] ? 'Generating...' : 'AI Suggest Answer'}
                                        </span>
                                      </button>
                                    </div>

                                    <textarea
                                      rows={2}
                                      value={questionAnswers[q.id] || ''}
                                      onChange={e =>
                                        setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                                      }
                                      placeholder="Type answer or click 'AI Suggest Answer' above..."
                                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#095c54]"
                                    />

                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => handleSendAnswer(act.id, q.id)}
                                        disabled={submittingAnswer[q.id]}
                                        className="btn-primary-custom px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{submittingAnswer[q.id] ? 'Sending...' : 'Send Answer'}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-Tab 3: Team-Leader-Style Evidence Submission & Extended After-Stage Review */}
                    {currentSubTab === 'evidence' && (
                      <div className="p-5 sm:p-6 space-y-6 animate-fadeIn">
                        {lifecycle.isCompleted ? (
                          <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-emerald-950">Evidence Submission Closed</h4>
                              <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                                This cleanliness drive has been officially verified and marked complete by the Ward Officer. Further evidence uploads and edits are disabled. All verified records are archived in the history below.
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Evidence Upload Form (Sanitation Team Leader Style) */
                          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                              <div>
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                  <Camera className="w-4 h-4 text-[#095c54]" />
                                  <span>Submit Field Cleanliness Evidence</span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Capture Before, During, and After stage proof with GPS & Voice-to-Text. The After stage includes full Ward Officer completion review fields.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => captureEvidenceGps(act)}
                                disabled={capturingGps[act.id]}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition shrink-0 ${
                                  evidenceGps[act.id]
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <Crosshair className="w-3.5 h-3.5 text-[#095c54]" />
                                {capturingGps[act.id]
                                  ? 'Locating GPS...'
                                  : evidenceGps[act.id]
                                  ? `GPS Tagged (${evidenceGps[act.id].lat.toFixed(4)}, ${evidenceGps[act.id].lng.toFixed(4)})`
                                  : 'Tag Live GPS Location'}
                              </button>
                            </div>

                            {/* Step 1: Clean Segmented Stage Selector Pills */}
                            <div className="space-y-1.5">
                              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                1. Select Evidence Stage
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {([
                                  { id: 'before', label: 'Before Drive', sub: 'Initial site state' },
                                  { id: 'during', label: 'During Drive', sub: 'Volunteers in action' },
                                  { id: 'after', label: 'After Completion', sub: 'Final review report' }
                                ] as const).map(st => {
                                  const active = currentStage === st.id;
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => setEvidenceStage(prev => ({ ...prev, [act.id]: st.id }))}
                                      className={`p-3 rounded-xl border text-left transition ${
                                        active
                                          ? 'bg-[#095c54] text-white border-[#095c54] shadow-sm'
                                          : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <p className="text-xs font-black">{st.label}</p>
                                      <p className={`text-[10px] mt-0.5 ${active ? 'text-emerald-200' : 'text-slate-500'}`}>
                                        {st.sub}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Step 2: Live Camera OR Gallery Upload + Multi-Photo Preview */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                  2. Capture or Upload Photographs *
                                </label>
                                {(evidenceImages[act.id] || []).length > 0 && (
                                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    {evidenceImages[act.id].length} Photo{evidenceImages[act.id].length > 1 ? 's' : ''} Attached
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => openLiveCamera(act.id)}
                                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#e6f4f1] border border-[#99f6e4] text-[#095c54] font-extrabold text-xs hover:bg-[#d1fae5] transition"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>Open Live Camera</span>
                                </button>

                                <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs hover:bg-slate-100 cursor-pointer transition">
                                  <Upload className="w-4 h-4 text-[#095c54]" />
                                  <span>Upload Photos from Device (Multiple)</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={e => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        handleEvidenceImagesSelected(act.id, e.target.files);
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              {(evidenceImages[act.id] || []).length > 0 && (
                                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-black text-slate-900">
                                      Attached Photos ({evidenceImages[act.id].length}) for {currentStage.toUpperCase()} Stage
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEvidenceImages(prev => ({ ...prev, [act.id]: [] }))}
                                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
                                    >
                                      Clear All
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                                    {evidenceImages[act.id].map((photo, pIdx) => (
                                      <div key={pIdx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group shadow-xs">
                                        <img src={photo} alt={`Evidence #${pIdx + 1}`} className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                          #{pIdx + 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEvidenceImage(act.id, pIdx)}
                                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition shadow"
                                          title="Remove photo"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  <p className="text-[11px] text-emerald-700 font-bold truncate">
                                    {evidenceAiStatus[act.id] || `✓ ${evidenceImages[act.id].length} civic photo${evidenceImages[act.id].length > 1 ? 's' : ''} attached and ready`}
                                  </p>
                                </div>
                              )}
                            </div>

                          {/* Step 3: Voice-to-Text Description */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                3. Work & Site Description *
                              </label>

                              <div className="flex items-center gap-2">
                                <select
                                  value={speechLang}
                                  onChange={e => setSpeechLang(e.target.value as any)}
                                  className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1"
                                >
                                  <option value="en-IN">English (EN)</option>
                                  <option value="gu-IN">ગુજરાતી (GU)</option>
                                  <option value="hi-IN">हिन्दी (HI)</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => toggleVoiceDictation(act.id)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                                    isListening[act.id]
                                      ? 'bg-rose-500 text-white animate-pulse'
                                      : 'bg-emerald-50 text-[#095c54] border border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  {isListening[act.id] ? (
                                    <>
                                      <MicOff className="w-3.5 h-3.5" />
                                      <span>Stop Listening</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="w-3.5 h-3.5" />
                                      <span>Voice Dictation</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <textarea
                              rows={3}
                              value={evidenceCaption[act.id] || ''}
                              onChange={e =>
                                setEvidenceCaption(prev => ({ ...prev, [act.id]: e.target.value }))
                              }
                              placeholder={
                                currentStage === 'after'
                                  ? 'Summarize the final cleaned site condition, volunteer effort, and waste handed over to NMC...'
                                  : 'Describe the work progress, waste cleared, or volunteer actions... (or speak via microphone)'
                              }
                              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#095c54]"
                            />

                            {evidenceCaption[act.id] && (() => {
                              const abuse = checkTextForAbuse(evidenceCaption[act.id]);
                              if (!abuse.isSafe) {
                                return (
                                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Inappropriate words detected ({abuse.detectedWord || abuse.reason}). Please remove abusive terms.</span>
                                  </p>
                                );
                              }
                              return (
                                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Description verified by AI moderation</span>
                                </p>
                              );
                            })()}
                          </div>

                          {/* Step 4 (AFTER STAGE ONLY): Extended Ward Officer Review Fields */}
                          {currentStage === 'after' && (
                            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#b8e0d7] space-y-4">
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#d1fae5]">
                                <div className="flex items-center gap-2">
                                  <ClipboardCheck className="w-4 h-4 text-[#095c54]" />
                                  <span className="text-xs font-black text-[#095c54] uppercase tracking-wider">
                                    4. Final Drive Completion Report (For Ward Officer Verification)
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  After-Stage Required
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Scale className="w-3 h-3 text-[#095c54]" />
                                    Total Waste Collected (kg) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 240"
                                    value={afterMeta.waste_collected_kg}
                                    onChange={e => updateAfterMeta(act.id, 'waste_collected_kg', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-[#095c54]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Users className="w-3 h-3 text-[#095c54]" />
                                    Actual Volunteers Present *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder={`e.g. ${regList.filter(r => r.attendance_status === 'present').length || regList.length || 25}`}
                                    value={afterMeta.actual_participants}
                                    onChange={e => updateAfterMeta(act.id, 'actual_participants', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-[#095c54]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-[#095c54]" />
                                    Area / Stretch Cleaned
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={act.target_area || 'e.g. 400m lake perimeter'}
                                    value={afterMeta.area_covered}
                                    onChange={e => updateAfterMeta(act.id, 'area_covered', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[#095c54]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Truck className="w-3 h-3 text-[#095c54]" />
                                    Waste Segregation & Disposal Destination
                                  </label>
                                  <input
                                    type="text"
                                    value={afterMeta.waste_disposal_details}
                                    onChange={e => updateAfterMeta(act.id, 'waste_disposal_details', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#095c54]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Sparkle className="w-3 h-3 text-[#095c54]" />
                                    Site Condition & Disinfection Status
                                  </label>
                                  <select
                                    value={afterMeta.disinfection_status}
                                    onChange={e => updateAfterMeta(act.id, 'disinfection_status', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-[#095c54]"
                                  >
                                    <option value="Swept & Sanitized">Swept & Sanitized</option>
                                    <option value="Bleaching / Disinfectant Applied">Bleaching / Disinfectant Applied</option>
                                    <option value="Dustbins Restored & Area Clear">Dustbins Restored & Area Clear</option>
                                    <option value="Cleaned · NMC Pickup Vehicle Needed">Cleaned · NMC Pickup Vehicle Needed</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Wrench className="w-3 h-3 text-[#095c54]" />
                                    Equipment & Safety Gear Used
                                  </label>
                                  <input
                                    type="text"
                                    value={afterMeta.equipment_used}
                                    onChange={e => updateAfterMeta(act.id, 'equipment_used', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#095c54]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Challenges / Follow-up Notes for Ward Officer
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Request additional permanent dustbin near north gate"
                                    value={afterMeta.challenges_notes}
                                    onChange={e => updateAfterMeta(act.id, 'challenges_notes', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#095c54]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleUploadEvidence(act)}
                              disabled={uploadingEvidence[act.id]}
                              className="btn-primary-custom px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm disabled:opacity-50"
                            >
                              <Upload className="w-4 h-4" />
                              <span>
                                {uploadingEvidence[act.id]
                                  ? 'Submitting Evidence...'
                                  : currentStage === 'after'
                                  ? 'Submit After Evidence & Final Review Report'
                                  : `Submit ${currentStage.toUpperCase()} Evidence`}
                              </span>
                            </button>
                          </div>
                        </div>
                        )}

                        {/* Chronological Submitted Evidence History */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Submitted Evidence History ({evList.length})
                            </h4>
                            {evList.length > 0 && !lifecycle.isCompleted && (
                              <button
                                onClick={() => handleSubmitAllEvidence(act.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-[#095c54] hover:bg-emerald-100 transition"
                              >
                                Notify Ward Officer for Final Verification →
                              </button>
                            )}
                          </div>

                          {evList.length === 0 ? (
                            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                              No evidence uploaded yet. Start by capturing a <strong>Before Drive</strong> photo above.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {evList.map((ev: any) => {
                                const stageTag = (ev.stage || ev.evidence_type || 'during').toLowerCase();
                                const imgSrc = ev.image_url || ev.storage_path;
                                const rm = ev.review_metadata && typeof ev.review_metadata === 'object' ? ev.review_metadata : null;
                                const evPhotos: string[] = Array.isArray(rm?.photos) && rm.photos.length > 0
                                  ? rm.photos
                                  : [imgSrc].filter(Boolean);

                                return (
                                  <div
                                    key={ev.id}
                                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs flex flex-col"
                                  >
                                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                                      <img
                                        src={evPhotos[0] || imgSrc}
                                        alt="Evidence"
                                        className="w-full h-full object-cover"
                                      />
                                      <span
                                        className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase text-white shadow-sm ${
                                          stageTag === 'before'
                                            ? 'bg-amber-600'
                                            : stageTag === 'during'
                                            ? 'bg-blue-600'
                                            : 'bg-emerald-600'
                                        }`}
                                      >
                                        {stageTag}
                                      </span>
                                      {evPhotos.length > 1 && (
                                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-black flex items-center gap-1 shadow">
                                          <Camera className="w-3 h-3" />
                                          {evPhotos.length} Photos
                                        </span>
                                      )}
                                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold">
                                        {new Date(ev.created_at).toLocaleString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>

                                    {/* Multi-Photo Thumbnail Strip if multiple photos */}
                                    {evPhotos.length > 1 && (
                                      <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                                        {evPhotos.map((p, pIdx) => (
                                          <img
                                            key={pIdx}
                                            src={p}
                                            alt={`Thumb ${pIdx + 1}`}
                                            className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0 cursor-pointer hover:border-[#095c54] transition"
                                            onClick={() => window.open(p, '_blank')}
                                            title="Click to view full photo"
                                          />
                                        ))}
                                      </div>
                                    )}

                                    <div className="p-3.5 text-xs space-y-2 flex-1">
                                      <p className="text-slate-800 font-semibold leading-relaxed">
                                        {ev.caption || ev.description}
                                      </p>

                                      {rm && Object.keys(rm).length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px]">
                                          {rm.waste_collected_kg && (
                                            <div className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                                              Waste: {rm.waste_collected_kg} kg
                                            </div>
                                          )}
                                          {rm.actual_participants && (
                                            <div className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold">
                                              Volunteers: {rm.actual_participants}
                                            </div>
                                          )}
                                          {rm.area_covered && (
                                            <div className="col-span-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                                              <strong>Area:</strong> {rm.area_covered}
                                            </div>
                                          )}
                                          {rm.disinfection_status && (
                                            <div className="col-span-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                                              <strong>Site Status:</strong> {rm.disinfection_status}
                                            </div>
                                          )}
                                          {rm.waste_disposal_details && (
                                            <div className="col-span-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                                              <strong>Disposal:</strong> {rm.waste_disposal_details}
                                            </div>
                                          )}
                                          {rm.challenges_notes && (
                                            <div className="col-span-2 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                                              <strong>Notes:</strong> {rm.challenges_notes}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Ward Officer Verification Status Flag */}
                                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                        {ev.verification_status === 'verified' || ev.submission_status === 'verified' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>Verified by Ward Officer</span>
                                          </span>
                                        ) : ev.verification_status === 'rejected' ? (
                                          <div className="space-y-1 w-full">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
                                              <AlertCircle className="w-3 h-3 text-rose-600" />
                                              <span>Rejected by Ward Officer</span>
                                            </span>
                                            {ev.verification_notes && (
                                              <p className="text-[11px] text-rose-800 font-semibold bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                                                <strong>Officer Remarks:</strong> {ev.verification_notes}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase">
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            <span>Pending Ward Officer Review</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 3. IF UNAPPROVED: WHOLE STATUS TRACKING STEPPER */
                  <div className="p-5 sm:p-6 bg-slate-50/70 border-t border-[#f1f5f9] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#095c54]" />
                        <span>NMC Municipal Approval Status Tracking</span>
                      </h3>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${lifecycle.badgeClass}`}>
                        {lifecycle.label}
                      </span>
                    </div>

                    {/* 4-Stage Visual Progress Stepper */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                      {/* Step 1: Drafted */}
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-extrabold text-xs text-slate-900">1. Drive Drafted</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Prepared by Community Head</p>
                      </div>

                      {/* Step 2: Submitted */}
                      <div className={`p-3 bg-white rounded-2xl border space-y-1 ${
                        !lifecycle.isDraft ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {!lifecycle.isDraft ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-extrabold text-xs text-slate-900">2. Dispatched</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Sent to Ward {act.ward_number || 3} Officer</p>
                      </div>

                      {/* Step 3: Ward Officer Inspection */}
                      <div className={`p-3 bg-white rounded-2xl border space-y-1 ${
                        lifecycle.isPending
                          ? 'border-amber-300 bg-amber-50/40'
                          : lifecycle.isRejected
                          ? 'border-rose-300 bg-rose-50/40'
                          : lifecycle.isChangesRequested
                          ? 'border-orange-300 bg-orange-50/40'
                          : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {lifecycle.isPending ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                          ) : lifecycle.isRejected ? (
                            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-extrabold text-xs text-slate-900">3. Field Review</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Ward {act.ward_number || 3} Officer Sanction</p>
                      </div>

                      {/* Step 4: Approved & Published */}
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1 opacity-60">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-extrabold text-xs text-slate-900">4. Live on Portal</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Open for Citizen Volunteers</p>
                      </div>
                    </div>

                    {/* Review Feedback or Action Buttons */}
                    {(lifecycle.isChangesRequested || lifecycle.isRejected) && (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                        lifecycle.isRejected
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-orange-50 border-orange-200 text-orange-900'
                      }`}>
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertCircle className={`w-4 h-4 ${lifecycle.isRejected ? 'text-rose-600' : 'text-orange-600'}`} />
                          <span>Ward Officer Decision Note:</span>
                        </p>
                        <p className="text-slate-800">
                          {(act as any).rejection_reason || (act as any).feedback_notes || 'Please contact your Ward Officer for details.'}
                        </p>
                      </div>
                    )}

                    {lifecycle.isDraft && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={async () => {
                            await api.submitActivityForApproval(act.id, 'Submitted for NMC approval');
                            setActionMessage({
                              type: 'success',
                              text: `Drive submitted to Ward ${act.ward_number || 3} Officer for review!`
                            });
                            onRefreshActivities();
                          }}
                          className="btn-primary-custom px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit for Ward Officer Approval</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Edit Approved Cleanliness Drive Modal (Only updates proposed start/end time and descriptions) */}
      {editingApprovedAct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#095c54] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Approved Drive Update
                </span>
                <h3 className="text-base font-black text-[#0f2925] mt-1">
                  Edit Drive Schedule &amp; Description
                </h3>
                <p className="text-xs text-slate-500 font-semibold truncate max-w-md">
                  {editingApprovedAct.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingApprovedAct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                As this cleanliness drive is already approved, only the <strong>schedule timings</strong> and <strong>description/briefing</strong> can be modified. Location, ward, and core objectives remain locked.
              </span>
            </div>

            {approvedEditError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{approvedEditError}</span>
              </div>
            )}

            <form onSubmit={handleSaveApprovedEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
                    <span>Start Date &amp; Time *</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editApprovedForm.proposed_start_at}
                    onChange={e => setEditApprovedForm({ ...editApprovedForm, proposed_start_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#095c54]" />
                    <span>End Date &amp; Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editApprovedForm.proposed_end_at}
                    onChange={e => setEditApprovedForm({ ...editApprovedForm, proposed_end_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Short Public Description *
                </label>
                <input
                  type="text"
                  value={editApprovedForm.short_description}
                  onChange={e => setEditApprovedForm({ ...editApprovedForm, short_description: e.target.value })}
                  placeholder="Brief summary displayed on cleanliness drive cards..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Detailed Briefing / Volunteer Instructions
                </label>
                <textarea
                  rows={3}
                  value={editApprovedForm.detailed_description}
                  onChange={e => setEditApprovedForm({ ...editApprovedForm, detailed_description: e.target.value })}
                  placeholder="Detailed context, route details, volunteer tasks, etc..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingApprovedAct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApprovedEdit}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingApprovedEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Updated Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
