import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  User,
  Crown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  LocateFixed,
  Send,
  Navigation,
  ExternalLink,
  Phone,
  Shield,
  FileCheck2,
  Camera,
  RefreshCw,
  Sparkles,
  Mic,
  MicOff,
  UploadCloud,
  Check,
  CheckCheck,
  Video,
  X
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import confetti from 'canvas-confetti';
import { WorkAssignment, WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { api } from '../../services/api.js';
import { enqueueOfflineSubmission, isNetworkError } from '../../services/offlineSync.js';
import { checkTextForAbuse } from '../../utils/moderation.js';

const taskIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const workerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { animate: true });
  }, [center, map]);
  return null;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const GEOFENCE_LIMIT_METERS = 150;

interface SubmittedEvidence {
  id?: string;
  stage: 'before' | 'during' | 'after';
  photo_url: string;
  photos?: string[];
  description: string;
  dateLabel: string;
  timeLabel: string;
  distance: number;
  aiCategory?: string;
  review_status?: 'submitted' | 'verified' | 'rejected' | 'pending';
  officer_verified?: boolean;
  officer_notes?: string;
}

interface DailyAttendanceRecord {
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'none' | 'checked_in' | 'completed_for_day';
}

interface AssignWorkViewProps {
  assignments: WorkAssignment[];
  profile: WorkerProfile | null;
  lang: Language;
  initialTaskId?: string;
  onRefresh?: () => void;
}

export const AssignWorkView: React.FC<AssignWorkViewProps> = ({
  assignments: rawAssignments,
  profile,
  initialTaskId,
  onRefresh
}) => {
  // Exclude completed & officer-verified assignments from active Assign Work tab (they live in Work History)
  const assignments = rawAssignments.filter(
    a => !['verified_complete', 'closed', 'resolved'].includes(String(a.status || '').toLowerCase())
  );

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    initialTaskId || assignments[0]?.id || ''
  );

  // Sync selected assignment when initialTaskId or assignments list updates
  useEffect(() => {
    if (initialTaskId && assignments.some(a => a.id === initialTaskId)) {
      setSelectedAssignmentId(initialTaskId);
    } else if (assignments.length > 0 && !assignments.some(a => a.id === selectedAssignmentId)) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [initialTaskId, assignments]);

  const currentTask =
    assignments.find(a => a.id === selectedAssignmentId) || assignments[0];

  const [activeTab, setActiveTab] = useState<'work_info' | 'attendance' | 'evidence_submission' | 'evidence_history'>('work_info');

  // Requirement: Only Team Leader can access evidence submission and evidence log/history
  useEffect(() => {
    if (!currentTask?.is_temporary_leader && (activeTab === 'evidence_submission' || activeTab === 'evidence_history')) {
      setActiveTab('work_info');
    }
  }, [currentTask?.is_temporary_leader, activeTab]);

  // Geolocation state
  const [deviceCoords, setDeviceCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  // Attendance states
  const todayKey = new Date().toISOString().split('T')[0];
  const attendanceStorageKey = `worker_attendance_${profile?.id || 'worker'}_${currentTask?.id || 'task'}_${todayKey}`;

  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceRecord>({
    date: todayKey,
    status: 'none'
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTodayAttendance = async () => {
      try {
        const res = await api.getWorkerTodayAttendance(currentTask?.id);
        if (isMounted && res?.data && res.data.status && res.data.status !== 'none') {
          const rec: DailyAttendanceRecord = {
            date: res.data.date || todayKey,
            status: res.data.status,
            checkInTime: res.data.checkInTime,
            checkOutTime: res.data.checkOutTime
          };
          setDailyAttendance(rec);
          try {
            localStorage.setItem(attendanceStorageKey, JSON.stringify(rec));
          } catch {}
          return;
        }
      } catch {
        // Fallback to local cache if network/offline
      }

      try {
        const saved = localStorage.getItem(attendanceStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.date === todayKey) {
            if (isMounted) setDailyAttendance(parsed);
            return;
          }
        }
      } catch {}

      if (currentTask?.my_attendance_status === 'present' || currentTask?.my_attendance_status === 'verified') {
        if (isMounted) {
          setDailyAttendance({
            date: todayKey,
            status: 'checked_in',
            checkInTime: 'Verified On-Site'
          });
        }
      } else {
        if (isMounted) {
          setDailyAttendance({ date: todayKey, status: 'none' });
        }
      }
    };

    fetchTodayAttendance();
    return () => { isMounted = false; };
  }, [attendanceStorageKey, currentTask?.id, currentTask?.my_attendance_status, todayKey]);

  const [submittingAttendance, setSubmittingAttendance] = useState<boolean>(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Evidence states
  const [evidenceStage, setEvidenceStage] = useState<'before' | 'during' | 'after'>('before');
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'gu-IN' | 'hi-IN' | 'en-IN'>('gu-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [submittedEvidences, setSubmittedEvidences] = useState<SubmittedEvidence[]>([]);

  // Completion report states
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [wasteCollectedKg, setWasteCollectedKg] = useState<number>(0);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Live Camera modal state
  const [showLiveCameraModal, setShowLiveCameraModal] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fetchLiveLocation = () => {
    if (!navigator.geolocation) {
      setDeviceCoords({
        lat: currentTask?.latitude ? currentTask.latitude + 0.0001 : 20.9313,
        lng: currentTask?.longitude ? currentTask.longitude + 0.0001 : 72.9285,
        accuracy: 10
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setLocating(false);
      },
      () => {
        setDeviceCoords({
          lat: currentTask?.latitude ? currentTask.latitude + 0.0001 : 20.9313,
          lng: currentTask?.longitude ? currentTask.longitude + 0.0001 : 72.9285,
          accuracy: 10
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (currentTask) fetchLiveLocation();
  }, [currentTask?.id]);

  // Load real evidence from backend
  useEffect(() => {
    if (!currentTask) {
      setSubmittedEvidences([]);
      return;
    }
    const loadEvidences = async () => {
      try {
        const res = await api.getWorkEvidence(currentTask.id);
        if (res.data && res.data.length > 0) {
          const rawList = res.data || [];
          const groupedMap = new Map<string, SubmittedEvidence>();

          rawList.forEach((e: any) => {
            const dt = new Date(e.device_capture_timestamp || e.created_at || Date.now());
            const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const stage = (String(e.evidence_type || e.stage || 'during').toLowerCase() as any);
            const rawPhotos: string[] = Array.isArray(e.photos) && e.photos.length > 0 ? e.photos : (e.storage_path ? [e.storage_path] : []);

            // Key by batch (same stage + same 90-second window + description snippet) to group multi-photo submissions
            const timeBucket = Math.floor(dt.getTime() / (1000 * 90));
            const groupKey = `${stage}-${timeBucket}-${(e.description || '').slice(0, 20)}`;

            if (groupedMap.has(groupKey)) {
              const existing = groupedMap.get(groupKey)!;
              rawPhotos.forEach(p => {
                if (p && !existing.photos?.includes(p)) {
                  existing.photos?.push(p);
                }
              });
              if (e.review_status) existing.review_status = e.review_status;
              if (e.officer_verified) existing.officer_verified = e.officer_verified;
            } else {
              groupedMap.set(groupKey, {
                id: e.id,
                stage: stage,
                photo_url: rawPhotos[0] || e.storage_path || '',
                photos: rawPhotos.length > 0 ? rawPhotos : [e.storage_path || ''],
                description: e.description || `${(e.evidence_type || 'Work').toUpperCase()} evidence recorded.`,
                dateLabel: dateStr,
                timeLabel: timeStr,
                distance: Math.round(e.distance_from_assignment_meters || e.gps_accuracy || 10),
                aiCategory: 'Sanitation Verification',
                review_status: e.review_status || 'submitted',
                officer_verified: Boolean(e.officer_verified || e.review_status === 'verified'),
                officer_notes: e.review_comments || e.officer_notes
              });
            }
          });
          setSubmittedEvidences(Array.from(groupedMap.values()));
        } else {
          setSubmittedEvidences([]);
        }
      } catch {
        setSubmittedEvidences([]);
      }
    };
    loadEvidences();
  }, [currentTask?.id]);

  if (!currentTask) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Briefcase className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#0f2925]">No Active Work Assignment</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          You currently have no tasks assigned by your Ward Officer. When a squad assignment is dispatched to your team, all site details, map coordinates, attendance, and evidence controls will appear here.
        </p>
      </div>
    );
  }

  const taskCoords: [number, number] = [
    currentTask.latitude || 20.9312,
    currentTask.longitude || 72.9284
  ];

  const userCoords: [number, number] = [
    deviceCoords?.lat || taskCoords[0] + 0.0001,
    deviceCoords?.lng || taskCoords[1] + 0.0001
  ];

  const distanceToTask = getDistanceMeters(
    userCoords[0],
    userCoords[1],
    taskCoords[0],
    taskCoords[1]
  );
  const isWithinGeofence = distanceToTask <= GEOFENCE_LIMIT_METERS;

  const isEvidenceSubmitted =
    submittedEvidences.length > 0 ||
    currentTask.has_before_evidence ||
    currentTask.has_after_evidence ||
    (currentTask.status as string) === 'completion_submitted' ||
    (currentTask.status as string) === 'completed_pending_review' ||
    currentTask.status === 'verified_complete' ||
    (currentTask.status as string) === 'resolved';

  const isApprovedByOfficer =
    currentTask.status === 'verified_complete' ||
    (currentTask.status as string) === 'resolved';

  // Resolve real team leader info from team_members
  const leaderMember = (currentTask.team_members || []).find(m => m.temporary_leader);
  const leaderName = leaderMember?.worker_name || currentTask.temporary_leader_name || 'Assigned Team Leader';
  const leaderPhone = leaderMember?.worker_phone || '';

  const handlePunchAttendance = async (action: 'check_in' | 'check_out') => {
    setAttendanceError(null);
    setAttendanceSuccess(null);

    if (currentTask.status === 'reassigned') {
      setAttendanceError('This task was reassigned to another squad by the Ward Officer. You are no longer assigned to this task.');
      return;
    }

    if (!isWithinGeofence) {
      setAttendanceError(
        `You are ${distanceToTask}m away from ${currentTask.location_name || currentTask.address}. Attendance requires being within ${GEOFENCE_LIMIT_METERS}m of the site.`
      );
      return;
    }

    if (action === 'check_in' && dailyAttendance.status !== 'none') {
      setAttendanceError('You have already checked in today.');
      return;
    }
    if (action === 'check_out') {
      if (dailyAttendance.status === 'completed_for_day') {
        setAttendanceError("Today's attendance is already completed.");
        return;
      }
      if (dailyAttendance.status !== 'checked_in') {
        setAttendanceError('Please check in first before checking out.');
        return;
      }
    }

    setSubmittingAttendance(true);
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await api.markWorkerAttendance({
        assignment_id: currentTask.id,
        latitude: userCoords[0],
        longitude: userCoords[1],
        gps_accuracy_meters: deviceCoords?.accuracy || 8,
        action
      });

      const serverAtt: any = res?.data;
      const serverCheckIn = serverAtt?.check_in_time
        ? new Date(serverAtt.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : nowTime;
      const serverCheckOut = serverAtt?.check_out_time
        ? new Date(serverAtt.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : nowTime;

      const record: DailyAttendanceRecord =
        action === 'check_in'
          ? { date: todayKey, status: 'checked_in', checkInTime: serverCheckIn }
          : { ...dailyAttendance, status: 'completed_for_day', checkOutTime: serverCheckOut };

      setDailyAttendance(record);
      try {
        localStorage.setItem(attendanceStorageKey, JSON.stringify(record));
      } catch {}
      setAttendanceSuccess(
        action === 'check_in'
          ? `Check-In verified at ${serverCheckIn} (${distanceToTask}m from site). Stored in municipal records.`
          : `Check-Out verified at ${serverCheckOut}. Shift attendance completed and saved to database.`
      );
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setAttendanceError(err.message || 'Failed to record attendance.');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Voice dictation is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListeningSpeech && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningSpeech(false);
      return;
    }

    setSpeechError(null);
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListeningSpeech(true);
      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        if (fullTranscript.trim()) {
          setEvidenceDescription(fullTranscript.trim());
        }
      };
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked. Please allow mic access.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListeningSpeech(false);
      };
      recognition.onend = () => setIsListeningSpeech(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechError('Could not start microphone.');
      setIsListeningSpeech(false);
    }
  };

  const openLiveCamera = async () => {
    setCameraError(null);
    setShowLiveCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('Unable to access camera. Please allow camera permission or upload a photo.');
    }
  };

  const closeLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowLiveCameraModal(false);
  };

  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.85);
      setEvidencePreviews(prev => [...prev, b64]);
      closeLiveCamera();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setEvidencePreviews(prev => [...prev, b64]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setEvidencePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadStageEvidence = async () => {
    if (!currentTask) return;
    setEvidenceError(null);
    setEvidenceSuccess(null);

    if (currentTask.status === 'reassigned') {
      setEvidenceError('This task was reassigned to another squad by the Ward Officer. You are no longer authorized to submit evidence.');
      return;
    }

    // Validation: Team Leader cannot submit evidence if not checked in or after check-out
    if (dailyAttendance.status === 'none') {
      setEvidenceError('Attendance Check-In Required: You must punch in your duty attendance at the site first before submitting field evidence.');
      return;
    }
    if (dailyAttendance.status === 'completed_for_day') {
      setEvidenceError("Duty Shift Closed: You have already checked out for today. Evidence submission is closed until tomorrow's shift.");
      return;
    }

    if (evidencePreviews.length === 0) {
      setEvidenceError('Please capture or select at least one photo for evidence.');
      return;
    }

    if (!isWithinGeofence) {
      setEvidenceError(
        `You are ${distanceToTask}m away from the site. Evidence must be captured within ${GEOFENCE_LIMIT_METERS}m.`
      );
      return;
    }

    if (evidenceDescription.trim()) {
      const abuseCheck = checkTextForAbuse(evidenceDescription);
      if (!abuseCheck.isSafe) {
        setEvidenceError(abuseCheck.reason || 'Please use appropriate language in your description.');
        return;
      }
    }

    setUploadingEvidence(true);
    const descToSave =
      evidenceDescription.trim() ||
      `${evidenceStage.toUpperCase()} site cleanup evidence recorded at ${currentTask.location_name || currentTask.address}.`;

    const primaryPhoto = evidencePreviews[0];
    const evidencePayload = {
      stage: evidenceStage,
      photo_url: primaryPhoto,
      photos: evidencePreviews,
      description: descToSave,
      latitude: userCoords[0],
      longitude: userCoords[1],
      gps_accuracy: deviceCoords?.accuracy || 8
    };

    const saveOfflineWorkEvidence = async () => {
      await enqueueOfflineSubmission(
        'worker_evidence',
        `${evidenceStage.toUpperCase()} Evidence (${evidencePreviews.length} photos) — ${currentTask.task_code || currentTask.title}`,
        evidencePayload,
        { assignmentId: currentTask.id, stage: evidenceStage }
      );
      const dt = new Date();
      setSubmittedEvidences(prev => [
        ...prev,
        {
          id: `offline-wev-${Date.now()}`,
          stage: evidenceStage,
          photo_url: primaryPhoto,
          description: `${descToSave} [Saved Offline — Pending Auto-Sync]`,
          dateLabel: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          timeLabel: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          distance: distanceToTask,
          aiCategory: 'Queued Offline'
        }
      ]);
      setEvidenceSuccess('No internet detected — Evidence saved locally on your device and will automatically sync to the server when internet returns!');
      setEvidencePreviews([]);
      setEvidenceDescription('');
    };

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveOfflineWorkEvidence();
        return;
      }

      const res = await api.uploadWorkEvidence(currentTask.id, evidencePayload);

      const dt = new Date(res?.data?.device_capture_timestamp || res?.data?.created_at || Date.now());
      const newEv: SubmittedEvidence = {
        id: res?.data?.id,
        stage: evidenceStage,
        photo_url: primaryPhoto,
        description: descToSave,
        dateLabel: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        timeLabel: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        distance: distanceToTask,
        aiCategory: 'Field Team Evidence'
      };

      setSubmittedEvidences(prev => [...prev, newEv]);
      setEvidenceSuccess(`${evidenceStage.toUpperCase()} evidence (${evidencePreviews.length} photo${evidencePreviews.length > 1 ? 's' : ''}) submitted and synced to Ward Officer.`);
      setEvidencePreviews([]);
      setEvidenceDescription('');
      confetti({ particleCount: 30, spread: 50 });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (isNetworkError(err)) {
        await saveOfflineWorkEvidence();
      } else {
        setEvidenceError(err.message || 'Failed to upload evidence. Please try again.');
      }
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    setReportError(null);
    setReportSuccess(null);

    if (completionNotes.trim()) {
      const abuseCheck = checkTextForAbuse(completionNotes);
      if (!abuseCheck.isSafe) {
        setReportError(abuseCheck.reason || 'Prohibited language detected.');
        return;
      }
    }

    setSubmittingReport(true);
    try {
      await api.submitWorkCompletionReport(currentTask.id, {
        completion_description: completionNotes.trim() || 'Civic waste cleared, area swept and disinfected.',
        waste_quantity: wasteCollectedKg > 0 ? `${wasteCollectedKg} kg` : 'Standard Municipal Load',
        waste_disposal_destination: 'Navsari Solid Waste Processing Plant',
        equipment_used: currentTask.required_equipment || ['Safety Gloves', 'Broom', 'Shovel'],
        issues_encountered: 'None'
      });
      setReportSuccess('Completion report submitted to Ward Officer for final verification.');
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setReportError(err.message || 'Only the designated Team Leader can submit the completion report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const deadlineDisplay = new Date(
    currentTask.deadline || currentTask.expected_end_time || currentTask.target_completion_date || Date.now() + 24 * 3600 * 1000
  ).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-5">
      {/* 1. REDESIGNED CLEAN TASK HEADER & FULL-WIDTH MULTI-TASK SWITCHER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Top Row: Full-Width Task Switcher Bar (only when multiple tasks exist) */}
        {assignments.length > 1 && (
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-[#f7f9f8] border-b border-slate-200/70 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Tasks ({assignments.length})
            </span>
            <div className="h-4 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              {assignments.map(a => {
                const isSelected = currentTask.id === a.id;
                const isDone = a.status === 'verified_complete';
                const isSubmitted = a.status === 'completion_submitted';
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 border shrink-0 ${
                      isSelected
                        ? 'bg-[#095c54] text-white border-[#095c54] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:text-[#0f2925]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-300'
                          : isDone
                          ? 'bg-emerald-500'
                          : isSubmitted
                          ? 'bg-teal-500'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-mono">{a.task_code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Task Hero Body (Full horizontal width, mobile-first padding) */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="space-y-3">
            {/* Badges Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-[#095c54] bg-[#f0f7f5] border border-[#cde6df] px-2.5 py-0.5 rounded-md">
                  {currentTask.task_code}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border capitalize ${
                    currentTask.priority === 'emergency' || (currentTask.priority as string) === 'urgent'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : currentTask.priority === 'high'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {currentTask.priority} Priority
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                    isApprovedByOfficer
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isEvidenceSubmitted
                      ? 'bg-[#f0f7f5] text-[#095c54] border-[#cde6df]'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {isApprovedByOfficer ? 'Verified Complete' : isEvidenceSubmitted ? 'Evidence Submitted' : 'Assigned'}
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#095c54] bg-[#f7f9f8] border border-slate-200 px-3 py-1 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                <span>Ward {currentTask.ward_number || profile?.ward_number || 3}</span>
              </span>
            </div>

            {/* Full-Width Task Title */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0f2925] tracking-tight leading-snug">
                {currentTask.title}
              </h2>
              {currentTask.address && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentTask.address}</span>
                </p>
              )}
            </div>

            {/* Clean Structured Metadata Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#f7f9f8] border border-slate-200/70">
                <Calendar className="w-4 h-4 text-[#095c54] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Shift Date
                  </span>
                  <span className="text-xs font-semibold text-[#0f2925] truncate block">
                    {currentTask.scheduled_date || todayKey}
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${
                  (currentTask as any).is_work_sla_overdue
                    ? 'bg-red-50 border-red-300'
                    : 'bg-sky-50/70 border-sky-200/80'
                }`}
              >
                <AlertCircle
                  className={`w-4 h-4 shrink-0 ${
                    (currentTask as any).is_work_sla_overdue ? 'text-red-600' : 'text-sky-700'
                  }`}
                />
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block ${
                      (currentTask as any).is_work_sla_overdue ? 'text-red-600' : 'text-sky-700'
                    }`}
                  >
                    Maximum Work Days
                  </span>
                  <span
                    className={`text-xs font-extrabold truncate block ${
                      (currentTask as any).is_work_sla_overdue ? 'text-red-800' : 'text-[#0f2925]'
                    }`}
                  >
                    {(currentTask as any).max_work_days ?? 3} Days
                    {(currentTask as any).is_work_sla_overdue
                      ? ` · OVERDUE (${(currentTask as any).work_days_elapsed}d)`
                      : ` · Day ${(currentTask as any).work_days_elapsed ?? 0}/${(currentTask as any).max_work_days ?? 3}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#f7f9f8] border border-slate-200/70">
                <Clock className="w-4 h-4 text-[#095c54] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Completion Deadline
                  </span>
                  <span className="text-xs font-semibold text-[#0f2925] truncate block">
                    {deadlineDisplay}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#f7f9f8] border border-slate-200/70">
                <User className="w-4 h-4 text-[#095c54] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Squad &amp; Role
                  </span>
                  <span className="text-xs font-semibold text-[#0f2925] truncate block">
                    {(currentTask.team_members?.length || 0) > 0
                      ? `${currentTask.team_members!.length} Member${currentTask.team_members!.length > 1 ? 's' : ''}`
                      : 'Field Crew'} · {currentTask.is_temporary_leader ? 'Team Leader' : 'Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sleek Responsive 3-Step Progress Bar */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {[
                { key: 'assigned', label: 'Work Assigned', shortLabel: 'Assigned', done: true },
                { key: 'evidence', label: 'Evidence Submitted', shortLabel: 'Evidence', done: isEvidenceSubmitted },
                { key: 'verified', label: 'Officer Verified', shortLabel: 'Verified', done: isApprovedByOfficer }
              ].map((step, idx, arr) => (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        step.done
                          ? 'bg-[#095c54] text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {step.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-semibold text-center sm:text-left truncate ${
                        step.done ? 'text-[#0f2925]' : 'text-slate-400'
                      }`}
                    >
                      <span className="sm:hidden">{step.shortLabel}</span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`h-px flex-1 min-w-[16px] ${
                        arr[idx + 1].done ? 'bg-[#095c54]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CLEAN HORIZONTAL TAB BAR (Mobile Touch Scrollable) */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'work_info', label: 'Work Overview', icon: Briefcase },
          { id: 'attendance', label: 'Duty Attendance', icon: Clock },
          ...(Boolean(currentTask?.is_temporary_leader) ? [
            { id: 'evidence_submission', label: 'Submit Evidence', icon: Camera },
            { id: 'evidence_history', label: `Evidence Log (${submittedEvidences.length})`, icon: FileCheck2 }
          ] : [])
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-[#095c54] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#0f2925] hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: WORK OVERVIEW & MAP */}
      {activeTab === 'work_info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Cols: Map & Directives */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0f2925] truncate">
                    {currentTask.location_name || currentTask.address}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {currentTask.address} · Ward {currentTask.ward_number || 3}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${taskCoords[0]},${taskCoords[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold transition inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>

              <div className="h-56 sm:h-68 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer center={taskCoords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapRecenter center={taskCoords} />
                  <Marker position={taskCoords} icon={taskIcon}>
                    <Popup>
                      <div className="p-1 text-xs">
                        <p className="font-bold text-[#095c54]">{currentTask.task_code}</p>
                        <p>{currentTask.location_name || currentTask.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={taskCoords}
                    radius={GEOFENCE_LIMIT_METERS}
                    pathOptions={{ color: '#095c54', fillColor: '#095c54', fillOpacity: 0.1, weight: 1.5 }}
                  />
                  <Marker position={userCoords} icon={workerIcon}>
                    <Popup>
                      <div className="p-1 text-xs">
                        <p className="font-bold text-slate-800">Your GPS Location</p>
                        <p className="text-slate-500">Accuracy: ±{deviceCoords?.accuracy || 10}m</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>

                <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isWithinGeofence ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>Distance: ~{distanceToTask}m · Geofence {GEOFENCE_LIMIT_METERS}m</span>
                </div>
              </div>
            </div>

            {/* Work Instructions & Safety Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#0f2925]">Work Directives & Equipment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Issued by Ward {currentTask.ward_number || 3} Sanitary Officer
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Instructions
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentTask.work_instructions || 'Clear waste from assigned location, sweep perimeter thoroughly, and disinfect.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 border-l-3 border-l-[#095c54] space-y-1">
                  <span className="text-[11px] font-semibold text-[#095c54] uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Safety Precautions</span>
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentTask.safety_instructions || 'Wear reflective safety vest, heavy rubber gloves, and boots at all times.'}
                  </p>
                </div>

                {currentTask.required_equipment && currentTask.required_equipment.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Required Equipment
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentTask.required_equipment.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/80"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Squad & Leader Card */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0f2925]">Assigned Squad</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{currentTask.task_code}</p>
                </div>
                <Crown className="w-4 h-4 text-amber-600" />
              </div>

              <div className="p-3.5 rounded-xl bg-[#f0f7f5] border border-[#cde6df] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[#095c54] uppercase tracking-wider block">
                      Temporary Team Leader
                    </span>
                    <p className="text-sm font-bold text-[#0f2925] truncate mt-0.5">{leaderName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white text-[#095c54] border border-[#cde6df] text-[10px] font-bold shrink-0">
                    Leader
                  </span>
                </div>
                {leaderPhone && (
                  <div className="pt-2 border-t border-[#cde6df]/70 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Contact</span>
                    <a
                      href={`tel:${leaderPhone}`}
                      className="font-semibold text-[#095c54] hover:underline inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{leaderPhone}</span>
                    </a>
                  </div>
                )}
              </div>

              {currentTask.team_members && currentTask.team_members.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Team Roster ({currentTask.team_members.length})
                  </span>
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                    {currentTask.team_members.map((member, idx) => (
                      <div key={member.id || idx} className="px-3 py-2.5 bg-white flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {member.temporary_leader ? (
                            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0f2925] truncate">{member.worker_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{member.worker_code}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 shrink-0">
                          {member.designation_name || 'Worker'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUTY ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#0f2925]">Geofenced Duty Attendance</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Allowed within {GEOFENCE_LIMIT_METERS}m of assigned work location (1 check-in &amp; 1 check-out per day).
              </p>
            </div>
            <button
              onClick={fetchLiveLocation}
              disabled={locating}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin text-[#095c54]' : ''}`} />
              <span>Refresh GPS</span>
            </button>
          </div>

          <div
            className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              isWithinGeofence
                ? 'bg-[#f0f7f5] border-[#cde6df] text-[#0f2925]'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isWithinGeofence ? (
                <CheckCircle2 className="w-4 h-4 text-[#095c54] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {isWithinGeofence
                    ? `Inside Work Zone (~${distanceToTask}m from pin)`
                    : `Outside Work Zone (~${distanceToTask}m away)`}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {userCoords[0].toFixed(5)}° N, {userCoords[1].toFixed(5)}° E
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
              {isWithinGeofence ? 'Verified' : 'Out of Range'}
            </span>
          </div>

          {attendanceSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{attendanceSuccess}</span>
            </div>
          )}
          {attendanceError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{attendanceError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Check-In Time
              </span>
              <p className="text-base font-bold text-[#0f2925] mt-1">
                {dailyAttendance.checkInTime || '—'}
              </p>
              <span className="text-[11px] text-slate-500">
                {dailyAttendance.checkInTime ? 'GPS verified' : 'Not marked yet'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Check-Out Time
              </span>
              <p className="text-base font-bold text-[#0f2925] mt-1">
                {dailyAttendance.checkOutTime || '—'}
              </p>
              <span className="text-[11px] text-slate-500">
                {dailyAttendance.checkOutTime ? 'Shift closed' : 'Pending'}
              </span>
            </div>
          </div>

          {currentTask.status === 'reassigned' ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Squad Replaced: The Ward Officer has reassigned this complaint to another team. You are no longer authorized to submit attendance or evidence.</span>
            </div>
          ) : (
            <>
              {dailyAttendance.status === 'none' && (
                <button
                  onClick={() => handlePunchAttendance('check_in')}
                  disabled={submittingAttendance || !isWithinGeofence}
                  className="w-full py-3 bg-[#095c54] hover:bg-[#074741] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  {submittingAttendance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Check-In...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-4 h-4" />
                      <span>Mark Duty Check-In</span>
                    </>
                  )}
                </button>
              )}

              {dailyAttendance.status === 'checked_in' && (
                <button
                  onClick={() => handlePunchAttendance('check_out')}
                  disabled={submittingAttendance || !isWithinGeofence}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  {submittingAttendance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Check-Out...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Mark Duty Check-Out</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {dailyAttendance.status === 'completed_for_day' && (
            <div className="p-4 rounded-xl bg-[#f0f7f5] border border-[#cde6df] text-center space-y-2">
              <CheckCheck className="w-5 h-5 text-[#095c54] mx-auto" />
              <p className="text-xs font-bold text-[#0f2925]">Today's Shift Attendance Completed</p>
              <p className="text-[11px] text-slate-600">
                Checked in at <strong>{dailyAttendance.checkInTime}</strong> and checked out at <strong>{dailyAttendance.checkOutTime}</strong>.
              </p>
              <div className="pt-2 border-t border-[#cde6df]/70 text-[11px] text-slate-500 font-medium">
                1 check-in and 1 check-out limit reached for today. Next duty check-in unlocks on the next calendar day.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EVIDENCE SUBMISSION */}
      {activeTab === 'evidence_submission' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#0f2925]">Field Evidence Submission</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload geotagged before, during, or after photos with notes. Immediately visible to Ward Officer.
                </p>
              </div>
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 w-full sm:w-auto">
                {(['before', 'during', 'after'] as const).map(stage => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setEvidenceStage(stage)}
                    className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold capitalize transition text-center ${
                      evidenceStage === stage
                        ? 'bg-[#095c54] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0f2925]'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-700">
                <LocateFixed className="w-4 h-4 text-[#095c54] shrink-0" />
                <span className="font-mono text-[11px]">
                  {userCoords[0].toFixed(5)}° N, {userCoords[1].toFixed(5)}° E (~{distanceToTask}m from pin)
                </span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  isWithinGeofence
                    ? 'bg-[#f0f7f5] text-[#095c54] border-[#cde6df]'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {isWithinGeofence ? 'Geotag Validated' : 'Outside 150m Geofence'}
              </span>
            </div>

            {evidenceSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{evidenceSuccess}</span>
              </div>
            )}
            {evidenceError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{evidenceError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Multi-Photo Capture & Thumbnails */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Photo Evidence ({evidenceStage.toUpperCase()} Stage) *
                  </label>
                  <span className="text-[11px] font-bold text-[#095c54]">
                    {evidencePreviews.length} Photo{evidencePreviews.length !== 1 ? 's' : ''} Added
                  </span>
                </div>

                {evidencePreviews.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
                      {evidencePreviews.map((photo, pIdx) => (
                        <div key={pIdx} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[4/3] group shadow-2xs">
                          <img src={photo} alt={`Evidence #${pIdx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-white text-[9px] font-bold">
                            #{pIdx + 1} {evidenceStage.toUpperCase()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-xs transition"
                            title="Remove this photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <label className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>+ Add More Photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={openLiveCamera}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5 text-[#095c54]" />
                        <span>Take Live Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvidencePreviews([])}
                        className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition ml-auto"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/70 p-6 flex flex-col items-center justify-center text-center aspect-[4/3] space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-[#095c54] flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0f2925]">Capture or Upload Multiple Site Photos</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                        Team leaders can select multiple photos at once. GPS and timestamps attached automatically.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                      <label className="px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={openLiveCamera}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5 text-[#095c54]" />
                        <span>Live Viewfinder</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Notes + Voice + Attendance Check + Submit */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Work Notes & Description
                    </label>
                    <div className="flex items-center gap-1 text-[10px] font-semibold">
                      {(['gu-IN', 'hi-IN', 'en-IN'] as const).map(langCode => (
                        <button
                          key={langCode}
                          type="button"
                          onClick={() => setSpeechLang(langCode)}
                          className={`px-2 py-0.5 rounded-md transition ${
                            speechLang === langCode
                              ? 'bg-[#095c54] text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-[#0f2925]'
                          }`}
                        >
                          {langCode === 'gu-IN' ? 'ગુજ' : langCode === 'hi-IN' ? 'हिंदी' : 'ENG'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={4}
                      value={evidenceDescription}
                      onChange={e => setEvidenceDescription(e.target.value)}
                      placeholder="Describe work completed or tap the microphone to dictate..."
                      className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
                    />
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`absolute right-2.5 top-2.5 p-2 rounded-lg transition ${
                        isListeningSpeech
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title={isListeningSpeech ? 'Stop voice input' : 'Voice to text'}
                    >
                      {isListeningSpeech ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#095c54]" />}
                    </button>
                  </div>

                  {isListeningSpeech && (
                    <p className="text-[11px] font-semibold text-rose-600">
                      Listening ({speechLang === 'gu-IN' ? 'Gujarati' : speechLang === 'hi-IN' ? 'Hindi' : 'English'})...
                    </p>
                  )}
                  {speechError && (
                    <p className="text-[11px] font-medium text-amber-700">{speechError}</p>
                  )}
                </div>

                {/* Duty Attendance Gate Check */}
                {dailyAttendance.status === 'none' && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Check-In Required Before Submitting Evidence</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      You must punch in duty attendance in the <strong>Attendance tab</strong> first. Field evidence cannot be uploaded without active on-site check-in.
                    </p>
                  </div>
                )}

                {dailyAttendance.status === 'completed_for_day' && (
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Duty Shift Completed for Today</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      You have already checked out today. Evidence submission is closed and will reopen upon next day's check-in.
                    </p>
                  </div>
                )}

                {dailyAttendance.status === 'checked_in' && (
                  <div className="p-3 rounded-xl bg-[#f0f7f5] border border-[#cde6df] text-[#095c54] text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#095c54] shrink-0" />
                    <span className="font-semibold">Duty Shift Active · Checked in at {dailyAttendance.checkInTime}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUploadStageEvidence}
                  disabled={uploadingEvidence || evidencePreviews.length === 0 || !isWithinGeofence || dailyAttendance.status !== 'checked_in'}
                  className="w-full py-3 bg-[#095c54] hover:bg-[#074741] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  {uploadingEvidence ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading {evidencePreviews.length} Photos...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        Submit {evidenceStage.toUpperCase()} Evidence
                        {evidencePreviews.length > 0 ? ` (${evidencePreviews.length} photo${evidencePreviews.length > 1 ? 's' : ''})` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Consolidated Completion Report */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#0f2925]">Final Completion Report</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit final closure summary to the Ward Officer once all stages are complete.
                </p>
              </div>
              {currentTask.is_temporary_leader && (
                <span className="px-2.5 py-1 rounded-md bg-[#f0f7f5] text-[#095c54] border border-[#cde6df] text-[10px] font-semibold">
                  Team Leader Authorized
                </span>
              )}
            </div>

            {reportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                {reportSuccess}
              </div>
            )}
            {reportError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
                {reportError}
              </div>
            )}

            <form onSubmit={handleSubmitCompletion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Estimated Waste Cleared (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={wasteCollectedKg}
                    onChange={e => setWasteCollectedKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#0f2925] bg-white focus:border-[#095c54] outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Completion Status
                  </label>
                  <select className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#0f2925] bg-white focus:border-[#095c54] outline-hidden">
                    <option value="5">100% Cleared & Disinfected</option>
                    <option value="4">Satisfactory Clearance</option>
                    <option value="3">Partial — Follow-up Needed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Completion Summary
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={e => setCompletionNotes(e.target.value)}
                  placeholder="Summarize waste cleared, surface washing, and final site condition..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#095c54] hover:bg-[#074741] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submittingReport ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Completion Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: EVIDENCE LOG */}
      {activeTab === 'evidence_history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0f2925]">Location Evidence Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Photographic records submitted for {currentTask.task_code}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('evidence_submission')}
              className="px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold transition"
            >
              Add Photo
            </button>
          </div>

          {submittedEvidences.length === 0 ? (
            <div className="py-12 px-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2.5">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-[#0f2925]">No Evidence Uploaded Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Submitted before, during, and after photos for this task will appear here chronologically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {submittedEvidences.map((ev, idx) => {
                const photos = Array.isArray(ev.photos) && ev.photos.length > 0 ? ev.photos : [ev.photo_url];
                const isVerified = ev.officer_verified || ev.review_status === 'verified';
                const isRejected = ev.review_status === 'rejected';

                return (
                  <div key={ev.id || idx} className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden flex flex-col shadow-2xs hover:shadow-sm transition">
                    {/* Multi-Photo Grid or Single Photo Header */}
                    <div className="relative bg-slate-900 overflow-hidden">
                      {photos.length === 1 ? (
                        <div className="h-48 relative">
                          <img src={photos[0]} alt={ev.stage} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`grid gap-1 p-1 bg-slate-900 ${photos.length === 2 ? 'grid-cols-2 h-48' : 'grid-cols-3 h-48'}`}>
                          {photos.map((ph, pIdx) => (
                            <div key={pIdx} className="relative h-full overflow-hidden rounded-lg bg-slate-800">
                              <img src={ph} alt={`Evidence #${pIdx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                #{pIdx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                        <span className="px-2 py-0.5 rounded-md bg-white/95 text-[#0f2925] text-[10px] font-black uppercase shadow-2xs border border-slate-200/60">
                          {ev.stage}
                        </span>
                        {photos.length > 1 && (
                          <span className="px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs">
                            {photos.length} Photos
                          </span>
                        )}
                      </div>

                      {/* Verification Status Badge */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {isVerified ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-wide shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Verified by Officer
                          </span>
                        ) : isRejected ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wide shadow-md flex items-center gap-1">
                            <X className="w-3 h-3" /> Rejected by Officer
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black tracking-wide shadow-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {ev.description}
                      </p>
                      {ev.officer_notes && (
                        <p className={`text-[11px] p-2 rounded-xl border ${isRejected ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                          <strong>Officer Note:</strong> {ev.officer_notes}
                        </p>
                      )}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{ev.dateLabel} · {ev.timeLabel}</span>
                        <span className="font-semibold text-[#095c54]">~{ev.distance}m GPS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live Viewfinder Modal */}
      {showLiveCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden p-5 space-y-4 border border-slate-700 text-white">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>Live Camera Viewfinder</span>
              </h4>
              <button onClick={closeLiveCamera} className="p-1 rounded-lg hover:bg-slate-800 text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-rose-950/70 border border-rose-800 text-rose-200 rounded-xl text-xs">
                {cameraError}
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-300">
                  {userCoords[0].toFixed(5)}°N, {userCoords[1].toFixed(5)}°E
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeLiveCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureLiveSnapshot}
                className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
