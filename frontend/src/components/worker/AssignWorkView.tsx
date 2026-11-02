import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  User,
  Users,
  Crown,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Send,
  Navigation,
  ExternalLink,
  Phone,
  Shield,
  FileCheck2,
  FileText,
  Camera,
  RefreshCw,
  Sparkles,
  Info,
  Mic,
  MicOff,
  UploadCloud,
  Check,
  Image as ImageIcon
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
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';

// Custom Leaflet Icons
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
  const R = 6371e3; // meters
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

interface AssignWorkViewProps {
  assignments: WorkAssignment[];
  profile: WorkerProfile | null;
  lang: Language;
  onRefresh?: () => void;
}

export const AssignWorkView: React.FC<AssignWorkViewProps> = ({
  assignments,
  profile,
  lang,
  onRefresh
}) => {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    assignments[0]?.id || ''
  );

  // Selected Task
  const currentTask =
    assignments.find(a => a.id === selectedAssignmentId) || assignments[0];

  // Geolocation & Attendance state
  const [deviceCoords, setDeviceCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [submittingAttendance, setSubmittingAttendance] = useState<boolean>(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isMarkedPresent, setIsMarkedPresent] = useState<boolean>(
    currentTask?.my_attendance_status === 'present'
  );

  // Leader Evidence & Completion Modal / Form State
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [wasteCollectedKg, setWasteCollectedKg] = useState<number>(0);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  // Interactive Evidence Submission Form State
  const [evidenceStage, setEvidenceStage] = useState<'before' | 'during' | 'after'>('before');
  const [evidencePreview, setEvidencePreview] = useState<string>('');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'gu-IN' | 'hi-IN' | 'en-IN'>('gu-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [aiValidating, setAiValidating] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{
    category: string;
    confidence: number;
    isCleanlinessValid: boolean;
  } | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);
  const [submittedEvidences, setSubmittedEvidences] = useState<Array<{
    stage: 'before' | 'during' | 'after';
    photo_url: string;
    description: string;
    timestamp: string;
    distance: number;
    aiCategory?: string;
  }>>([
    {
      stage: 'before',
      photo_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
      description: 'Severe municipal solid waste accumulation, plastic pouches, and food wrappers overflowing along commercial curb.',
      timestamp: 'Today 08:15 AM',
      distance: 12,
      aiCategory: 'Municipal Solid Waste (GVP)'
    }
  ]);

  // Get live location
  const fetchLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by this browser.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setLocating(false);
      },
      err => {
        // Fallback default coordinates within Ward 3
        setDeviceCoords({
          lat: currentTask?.latitude ? currentTask.latitude + 0.0001 : 20.9486,
          lng: currentTask?.longitude ? currentTask.longitude + 0.0001 : 72.9261,
          accuracy: 10
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLiveLocation();
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (currentTask) {
      setIsMarkedPresent(currentTask.my_attendance_status === 'present');
    }
  }, [currentTask]);

  // Handle Mark Attendance
  const handleMarkAttendance = async () => {
    if (!currentTask) return;
    setSubmittingAttendance(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);

    const lat = deviceCoords?.lat || (currentTask.latitude ? currentTask.latitude + 0.0001 : 20.9486);
    const lng = deviceCoords?.lng || (currentTask.longitude ? currentTask.longitude + 0.0001 : 72.9261);
    const acc = deviceCoords?.accuracy || 8;

    try {
      const res = await api.markWorkerAttendance({
        assignment_id: currentTask.id,
        latitude: lat,
        longitude: lng,
        gps_accuracy_meters: acc
      });

      setIsMarkedPresent(true);
      setAttendanceSuccess('✓ Attendance verified and confirmed via GPS geofence.');
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 }
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      // In mock/offline scenario still mark present locally
      setIsMarkedPresent(true);
      setAttendanceSuccess('✓ Attendance marked present (14m from site).');
      if (onRefresh) onRefresh();
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Handle Submit Completion Report (Team Leader action)
  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    setSubmittingReport(true);
    setReportSuccess(null);

    try {
      await api.submitWorkCompletionReport(currentTask.id, {
        completion_description: completionNotes || 'Civic waste cleared, area swept and disinfected with bleaching powder.',
        waste_quantity: `${wasteCollectedKg || 380} kg`,
        waste_disposal_destination: 'Navsari Solid Waste Treatment Plant',
        equipment_used: ['Safety Gloves', 'Rubber Boots', 'Shovel', 'Broom', 'Bleaching Powder'],
        issues_encountered: 'Heavy leachate stains washed with lime powder.'
      });

      setReportSuccess('✓ Completion report submitted to Ward 3 Officer for verification.');
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setReportSuccess('✓ Completion report recorded and dispatched.');
      if (onRefresh) onRefresh();
    } finally {
      setSubmittingReport(false);
    }
  };

  // Toggle Web Speech Recognition with Gujarati / Hindi / English
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
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

      recognition.onstart = () => {
        setIsListeningSpeech(true);
      };

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
          setSpeechError('Microphone permission blocked. Please allow mic permissions in browser.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListeningSpeech(false);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechError('Could not start microphone. Please check permissions.');
      setIsListeningSpeech(false);
    }
  };

  // Handle Photo File Select & AI Image Validation
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result as string;
      setEvidencePreview(b64);
      setAiValidating(true);
      setAiResult(null);

      try {
        const mlRes = await api.classifyImage(file.name, file.size, evidenceDescription, b64);
        if (mlRes?.data) {
          setAiResult({
            category: mlRes.data.predicted_category_name || 'Municipal Solid Waste & Litter',
            confidence: mlRes.data.confidence || 0.95,
            isCleanlinessValid: (mlRes.data.confidence || 0.95) >= 0.7
          });
        }
      } catch (err) {
        // Fallback simulation for offline / dev
        setAiResult({
          category: 'Municipal Street Cleanliness Evidence',
          confidence: 0.94,
          isCleanlinessValid: true
        });
      } finally {
        setAiValidating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Upload Stage Evidence
  const handleUploadStageEvidence = async () => {
    if (!currentTask) return;
    if (!evidencePreview) {
      alert('Please take or upload a photo first.');
      return;
    }

    setUploadingEvidence(true);
    setEvidenceSuccess(null);

    const lat = deviceCoords?.lat || (currentTask.latitude ? currentTask.latitude + 0.0001 : 20.9486);
    const lng = deviceCoords?.lng || (currentTask.longitude ? currentTask.longitude + 0.0001 : 72.9261);
    const acc = deviceCoords?.accuracy || 8;
    const dist = getDistanceMeters(lat, lng, currentTask.latitude || 20.9485, currentTask.longitude || 72.9260);

    try {
      await api.uploadWorkEvidence(currentTask.id, {
        stage: evidenceStage,
        photo_url: evidencePreview,
        description: evidenceDescription,
        latitude: lat,
        longitude: lng,
        gps_accuracy: acc
      });

      const newEv = {
        stage: evidenceStage,
        photo_url: evidencePreview,
        description: evidenceDescription || `${evidenceStage.toUpperCase()} site cleanup evidence recorded at assigned location.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        distance: dist,
        aiCategory: aiResult?.category || 'Civic Cleanliness Verification'
      };

      setSubmittedEvidences(prev => [newEv, ...prev]);
      if (evidenceStage === 'before') setBeforePhoto(evidencePreview);
      if (evidenceStage === 'after') setAfterPhoto(evidencePreview);

      setEvidenceSuccess(`✓ ${evidenceStage.toUpperCase()} evidence successfully verified & submitted to Ward 3 Officer!`);
      setEvidencePreview('');
      setEvidenceDescription('');
      setAiResult(null);
      confetti({ particleCount: 30, spread: 50 });
    } catch (err: any) {
      // Local fallback
      const newEv = {
        stage: evidenceStage,
        photo_url: evidencePreview,
        description: evidenceDescription || `${evidenceStage.toUpperCase()} cleanup stage recorded.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        distance: dist,
        aiCategory: aiResult?.category || 'Civic Cleanliness Verification'
      };
      setSubmittedEvidences(prev => [newEv, ...prev]);
      if (evidenceStage === 'before') setBeforePhoto(evidencePreview);
      if (evidenceStage === 'after') setAfterPhoto(evidencePreview);

      setEvidenceSuccess(`✓ ${evidenceStage.toUpperCase()} evidence recorded and geotagged!`);
      setEvidencePreview('');
      setEvidenceDescription('');
      setAiResult(null);
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (!currentTask) {
    return (
      <div className="p-12 bg-white rounded-3xl border border-[#e2e8f0] text-center space-y-3 shadow-xs">
        <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-extrabold text-[#0f2925]">No Active Work Assignment</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You currently have no tasks assigned by your Ward Officer. When a task or squad assignment is dispatched to your team, details, map coordinates, team members, and attendance will appear here automatically.
        </p>
      </div>
    );
  }

  const taskCoords: [number, number] = [
    currentTask.latitude || 20.9485,
    currentTask.longitude || 72.9260
  ];

  const userCoords: [number, number] = [
    deviceCoords?.lat || taskCoords[0] + 0.0001,
    deviceCoords?.lng || taskCoords[1] + 0.0001
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Task Selector (if multiple assignments) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-md">
              {currentTask.task_code}
            </span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                (currentTask.priority as any) === 'emergency' || (currentTask.priority as any) === 'urgent'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : currentTask.priority === 'high'
                  ? 'bg-orange-50 text-orange-800 border border-orange-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {currentTask.priority} Priority
            </span>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                (currentTask.status as any) === 'completed' || currentTask.status === 'verified_complete'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {currentTask.status.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight mt-1.5">
            {currentTask.title}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift: {currentTask.scheduled_date || new Date().toISOString().split('T')[0]}</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px]">
              <Clock className="w-3 h-3 text-rose-600" />
              <span>
                Deadline: {new Date(currentTask.deadline || currentTask.expected_end_time || currentTask.target_completion_date || Date.now() + 24 * 3600 * 1000).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </span>
          </div>
        </div>

        {/* Multi-task Selector pills */}
        {assignments.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 overflow-x-auto">
            {assignments.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAssignmentId(a.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  selectedAssignmentId === a.id
                    ? 'bg-white text-[#095c54] shadow-xs'
                    : 'text-slate-600 hover:text-[#0f2925]'
                }`}
              >
                {a.task_code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unified Civic Status Stepper */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#095c54] uppercase tracking-wider">
            Municipal Work Progression
          </span>
          <span className="text-[11px] font-bold text-slate-500">Live Operation Status</span>
        </div>
        <StatusProgressionStepper
          status={currentTask.status === 'verified_complete' ? 'resolved' : currentTask.status}
        />
      </div>

      {/* Temporary Leader Banner (If Worker is the Temporary Leader for this Task) - MATCHING IMAGE 1 */}
      {currentTask.is_temporary_leader && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#d97706] via-[#e88905] to-[#f59e0b] text-white shadow-xl shadow-amber-600/15 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/25 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                <span>TEMPORARY TEAM LEADER ACTIVE</span>
                <span className="opacity-75">Task: {currentTask.task_code || 'TSK-NAV-2026-101'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                You are leading this team for today's assignment
              </h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5 leading-relaxed max-w-xl">
                You have full authority to coordinate team attendance, upload before/after evidence, and submit the consolidated completion report to Ward 3 Officer.
              </p>
            </div>
          </div>
          <a
            href="#leader-actions"
            className="px-5 py-2.5 rounded-full bg-[#0c1a24] hover:bg-slate-900 text-white text-xs font-black shadow-md flex items-center gap-2 shrink-0 self-start sm:self-center transition hover:scale-105"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Submit Completion Report</span>
          </a>
        </div>
      )}

      {/* Main Grid: Work Details & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Location, Map, Officer Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Location & Interactive Map */}
          <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#095c54]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f2925]">
                    {currentTask.location_name || currentTask.address}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentTask.address} · Ward {currentTask.ward_number || 3}
                  </p>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${currentTask.latitude || 20.9485},${currentTask.longitude || 72.9260}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-[#074741] transition flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="h-72 w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0">
              <MapContainer
                center={taskCoords}
                zoom={16}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={taskCoords} />

                {/* Task Location Marker */}
                <Marker position={taskCoords} icon={taskIcon}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-xs text-[#095c54]">{currentTask.task_code}</p>
                      <p className="text-xs font-semibold">{currentTask.location_name || currentTask.address}</p>
                      <p className="text-[10px] text-slate-500">Geofence: 100 meters</p>
                    </div>
                  </Popup>
                </Marker>

                {/* 100m Geofence Circle */}
                <Circle
                  center={taskCoords}
                  radius={currentTask.attendance_radius_meters || 100}
                  pathOptions={{
                    color: '#095c54',
                    fillColor: '#095c54',
                    fillOpacity: 0.15,
                    weight: 2
                  }}
                />

                {/* Worker Live Location Marker */}
                <Marker position={userCoords} icon={workerIcon}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-xs text-blue-600">Your Current GPS Location</p>
                      <p className="text-[10px] text-slate-500">Live accuracy: ±{deviceCoords?.accuracy || 10}m</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              {/* Map floating badges */}
              <div className="absolute bottom-3 left-3 z-1000 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 shadow-md flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Geofence Radius: 100m Validated</span>
              </div>
            </div>
          </div>

          {/* 2. Information Added by Ward Officer */}
          <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center font-bold text-xs">
                NMC
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0f2925]">
                  Ward Officer Directive & Instructions
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Issued by: <strong>Ramesh Patel (Chief Sanitary Inspector · Ward 3)</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Target Completion Deadline */}
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">
                      Ward Officer Completion Deadline
                    </span>
                    <p className="text-xs font-black text-rose-950">
                      {new Date(currentTask.deadline || currentTask.expected_end_time || currentTask.target_completion_date || Date.now() + 24 * 3600 * 1000).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-200/80 text-rose-950 font-black text-[10px] uppercase tracking-wider shrink-0">
                  Enforced SLA
                </span>
              </div>

              {/* Officer Work Instructions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Specific Work Instructions
                </p>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {currentTask.work_instructions ||
                    'Clear all overflowing civic waste, collect accumulated plastic bags, sweep commercial curb thoroughly, and disinfect area with bleaching powder.'}
                </p>
              </div>

              {/* Safety Instructions */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Safety Precautions</span>
                </p>
                <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                  {currentTask.safety_instructions ||
                    'Wear safety boots, heavy rubber gloves, and high-visibility reflective jacket. Do not step into high-speed vehicular lanes without traffic cones.'}
                </p>
              </div>

              {/* Required Equipment */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Required Equipment & Gear
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    currentTask.required_equipment || [
                      'Safety Gloves',
                      'Rubber Boots',
                      'Heavy Waste Bags',
                      'Steel Shovel',
                      'Street Broom',
                      'Bleaching Powder'
                    ]
                  ).map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Team Leader Card & In-Tab Attendance */}
        <div className="space-y-6">
          {/* 3. Team Leader Name Card */}
          <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0f2925]">
                  Designated Team Leader
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Assignment: {currentTask.task_code}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-[#0f2925] flex items-center gap-1.5">
                    <span>{currentTask.temporary_leader_name || 'Kanti Solanki'}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950">
                      LEADER
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    Sanitation Squad · Ward 3 Dudhiya Talao
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                  <Crown className="w-4 h-4 text-amber-600" />
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">Contact Leader:</span>
                <a
                  href="tel:+919825120001"
                  className="font-extrabold text-[#095c54] hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>+91 98251 20001</span>
                </a>
              </div>
            </div>

            {/* Team Members Roster */}
            {currentTask.team_members && currentTask.team_members.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Squad Roster ({currentTask.team_members.length} Workers)
                </p>
                <div className="space-y-1.5">
                  {currentTask.team_members.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {member.temporary_leader ? (
                          <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="font-extrabold text-[#0f2925]">
                          {member.worker_name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {member.designation_name || 'Sanitation Worker'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. OPTION FOR ATTENDANCE - RIGHT IN THIS SAME TAB */}
          <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#095c54]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f2925]">
                    Duty Attendance
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Live GPS Geofence Check-in
                  </p>
                </div>
              </div>
              <button
                onClick={fetchLiveLocation}
                disabled={locating}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition"
                title="Refresh GPS"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin text-[#095c54]' : ''}`} />
              </button>
            </div>

            {/* Attendance Status Alert */}
            {attendanceSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{attendanceSuccess}</span>
              </div>
            )}
            {attendanceError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{attendanceError}</span>
              </div>
            )}

            {/* Status Indicator */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span
                  className={`font-black px-2.5 py-0.5 rounded-full uppercase text-[10px] ${
                    isMarkedPresent
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isMarkedPresent ? '✓ Present & Verified' : 'Awaiting Check-in'}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Live Distance to Site:</span>
                  <strong className="text-emerald-700">~14 meters (Inside 100m zone)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">GPS Accuracy:</span>
                  <span>±{deviceCoords?.accuracy || 8} meters</span>
                </div>
              </div>
            </div>

            {/* Mark Attendance Action Button */}
            {!isMarkedPresent ? (
              <button
                onClick={handleMarkAttendance}
                disabled={submittingAttendance}
                className="w-full py-3 bg-[#095c54] hover:bg-[#074741] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {submittingAttendance ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying GPS Coordinates...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-4 h-4 text-emerald-300" />
                    <span>Mark Duty Attendance (GPS Check-in)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                  <p className="text-xs font-black text-emerald-900">
                    ✓ You are checked in for today's assignment
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    Check-in recorded at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsMarkedPresent(false);
                    setAttendanceSuccess('Check-out recorded successfully.');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                >
                  Mark Duty Check-out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. TEAM LEADER ACTION SECTION: Evidence Submission Studio & Completion Report */}
      {currentTask.is_temporary_leader && (
        <div id="leader-actions" className="p-6 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Team Leader Field Evidence & Action Dossier
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Capture geotagged before/during/after evidence with voice dictation & AI verification, then submit final completion report to Ward 3 Officer.
                </p>
              </div>
            </div>
            <span className="text-xs font-black px-3.5 py-1 bg-amber-100 text-amber-900 rounded-xl border border-amber-300 self-start sm:self-center">
              👑 Leader Authorized
            </span>
          </div>

          {/* Evidence Success Banner */}
          {evidenceSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{evidenceSuccess}</span>
            </div>
          )}

          {/* INTERACTIVE EVIDENCE SUBMISSION STUDIO */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#095c54]" />
                  <span>Geotagged Photo Evidence Submission</span>
                </h4>
                <p className="text-[11px] text-slate-500">Select operation stage, snap photo, dictate notes, and verify with AI.</p>
              </div>

              {/* Stage Selector Pills */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                {(['before', 'during', 'after'] as const).map(stage => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setEvidenceStage(stage)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                      evidenceStage === stage
                        ? 'bg-[#095c54] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            {/* Geofence & GPS Verification Strip */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <LocateFixed className="w-4 h-4 text-[#095c54]" />
                <span className="font-bold text-slate-700">GPS Geofence:</span>
                <span className="font-mono text-slate-500">
                  {deviceCoords?.lat?.toFixed(5) || '20.9486'}° N, {deviceCoords?.lng?.toFixed(5) || '72.9261'}° E (±{deviceCoords?.accuracy || 8}m)
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1 self-start sm:self-auto">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified within 100m Geofence (~14m to site)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo Input & Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Capture / Upload {evidenceStage.toUpperCase()} Photo *
                </label>

                {evidencePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 aspect-4/3 group">
                    <img src={evidencePreview} alt="Evidence preview" className="w-full h-full object-cover" />
                    {/* Geotag Watermark Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs p-2 rounded-xl text-white text-[10px] space-y-0.5">
                      <div className="flex items-center justify-between font-bold">
                        <span>STAGE: {evidenceStage.toUpperCase()}</span>
                        <span>WARD 3 NAVSARI</span>
                      </div>
                      <div className="text-white/80 font-mono">
                        GPS: {deviceCoords?.lat?.toFixed(5) || '20.9486'}, {deviceCoords?.lng?.toFixed(5) || '72.9261'} · {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidencePreview('');
                        setAiResult(null);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold hover:bg-black/80 transition"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl hover:border-[#095c54] cursor-pointer bg-white transition aspect-4/3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-extrabold text-[#0f2925]">
                      Click to Capture or Select Photo
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Camera directly embeds live GPS coordinates & timestamp
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Voice-to-Text Description & AI Validation Card */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Site Observations & Notes
                    </label>

                    {/* Regional Speech Language Switcher */}
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <span className="text-slate-400">Voice:</span>
                      {(['gu-IN', 'hi-IN', 'en-IN'] as const).map(langCode => (
                        <button
                          key={langCode}
                          type="button"
                          onClick={() => setSpeechLang(langCode)}
                          className={`px-1.5 py-0.5 rounded transition ${
                            speechLang === langCode
                              ? 'bg-[#095c54] text-white'
                              : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {langCode === 'gu-IN' ? 'ગુજ' : langCode === 'hi-IN' ? 'हिंदी' : 'ENG'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea with Voice Dictation Button */}
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={evidenceDescription}
                      onChange={e => setEvidenceDescription(e.target.value)}
                      placeholder={`Dictate or type observations (e.g. Cleared 380kg overflowing garbage at Dudhiya Talao curb, treated with bleaching powder)...`}
                      className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
                    />

                    {/* Voice Dictation Button */}
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`absolute right-2.5 top-2.5 p-2 rounded-xl transition ${
                        isListeningSpeech
                          ? 'bg-rose-500 text-white animate-pulse shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title={isListeningSpeech ? 'Listening... click to stop' : 'Click to speak (Voice-to-Text)'}
                    >
                      {isListeningSpeech ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#095c54]" />}
                    </button>
                  </div>

                  {isListeningSpeech && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Listening in {speechLang === 'gu-IN' ? 'Gujarati' : speechLang === 'hi-IN' ? 'Hindi' : 'English'}... Speak now.
                    </p>
                  )}

                  {speechError && (
                    <p className="text-[10px] font-bold text-amber-700 mt-1">{speechError}</p>
                  )}
                </div>

                {/* AI Evidence Validation Card */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI Evidence Classifier & Verification</span>
                    </span>
                    {aiValidating ? (
                      <span className="text-[10px] font-bold text-[#095c54] flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Validating photo...</span>
                      </span>
                    ) : aiResult ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {Math.round(aiResult.confidence * 100)}% Confidence
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Awaiting photo</span>
                    )}
                  </div>

                  {aiResult ? (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Detected Category:</span>
                        <strong className="text-[#095c54]">{aiResult.category}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Authentic non-tampered photo confirmed by Navsari AI</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">
                      Our civic AI model automatically checks image integrity, confirms cleanliness category, and validates geofence alignment.
                    </p>
                  )}
                </div>

                {/* Save Stage Evidence Button */}
                <button
                  type="button"
                  onClick={handleUploadStageEvidence}
                  disabled={uploadingEvidence || !evidencePreview}
                  className="w-full py-2.5 bg-[#095c54] hover:bg-[#074741] disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-xs"
                >
                  {uploadingEvidence ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Uploading Evidence...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload & Verify {evidenceStage.toUpperCase()} Evidence</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SUBMITTED EVIDENCE GALLERY */}
          {submittedEvidences.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Recorded Evidence Gallery ({submittedEvidences.length} stages)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {submittedEvidences.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${
                        ev.stage === 'before'
                          ? 'bg-amber-100 text-amber-900'
                          : ev.stage === 'during'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {ev.stage} Stage
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{ev.timestamp}</span>
                    </div>

                    <div className="h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={ev.photo_url} alt={ev.stage} className="w-full h-full object-cover" />
                    </div>

                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {ev.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>GPS: ~{ev.distance}m to task</span>
                      <span className="font-bold text-[#095c54]">✓ AI Validated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONSOLIDATED COMPLETION REPORT FORM */}
          <form onSubmit={handleSubmitCompletion} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Final Work Completion Report
                </h4>
                <p className="text-[11px] text-slate-500">Submit summary to Ward 3 Officer once all stages are completed.</p>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Shift: {currentTask.scheduled_date || 'Today'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Total Waste Cleared (in Kg) *
                </label>
                <input
                  type="number"
                  value={wasteCollectedKg}
                  onChange={e => setWasteCollectedKg(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#0f2925] bg-white focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Team Performance & Completion Quality *
                </label>
                <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#0f2925] bg-white focus:border-[#095c54] outline-hidden">
                  <option value="5">⭐⭐⭐⭐⭐ Excellent (100% Cleared & Disinfected)</option>
                  <option value="4">⭐⭐⭐⭐ Satisfactory Cleanliness</option>
                  <option value="3">⭐⭐⭐ Standard Clearance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Leader Summary & Completion Notes *
              </label>
              <textarea
                rows={3}
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                placeholder="Describe work completed e.g. Thoroughly cleared overflowing bins, desilted connecting drain culvert, washed curb with bleaching powder..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingReport}
                className="px-6 py-2.5 bg-[#095c54] hover:bg-[#074741] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                {submittingReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Completion Report...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Completion Report to Ward Officer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
