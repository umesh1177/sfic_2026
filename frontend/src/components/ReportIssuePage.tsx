import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
  Camera,
  Upload,
  Mic,
  MicOff,
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  SwitchCamera,
  ThumbsUp,
  ExternalLink,
  AlertCircle,
  Volume2,
  MousePointerClick,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { enqueueOfflineSubmission, isNetworkError } from '../services/offlineSync.js';
import {
  extractImageVisualFeatures,
  checkLocalCleanlinessRelevance,
  ExtractedVisualFeatures
} from '../utils/imageFeatures.js';
import { checkTextForAbuse } from '../utils/moderation.js';
import { ComplaintCategory, Complaint } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';
import { MAP_CONFIG } from '../config/mapConfig.js';
import { CategoryVisualSymbol } from './CategoryVisualSymbol.js';

interface ReportIssuePageProps {
  onBack: () => void;
  categories: ComplaintCategory[];
  onComplaintSubmitted: (complaint: Complaint) => void;
  lang: Language;
  onNavigateToComplaints: () => void;
}

// Controller component to smoothly fly/pan map to target position
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 1.2 });
  }, [center, map]);
  return null;
}

// Map event listener: updates picked location as user drags or clicks the map (Uber/Rapido style)
function MapMoveListener({ onLocationChanged }: { onLocationChanged: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    dragend() {
      const c = map.getCenter();
      onLocationChanged(c.lat, c.lng);
    },
    zoomend() {
      const c = map.getCenter();
      onLocationChanged(c.lat, c.lng);
    },
    click(e) {
      map.flyTo(e.latlng, map.getZoom(), { duration: 0.5 });
      onLocationChanged(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Comprehensive civic categories with visual illustrations
export const DEFAULT_CATEGORIES: ComplaintCategory[] = [
  {
    id: 'cat-03',
    category_name: 'Overflowing Dustbin',
    category_name_gu: 'ઉભરાતી કચરાપેટી',
    category_name_hi: 'कूड़ेदान का ओवरफ्लो',
    description: 'Community dustbins and municipal bins overflowing with waste',
    icon: 'Archive',
    is_active: true
  },
  {
    id: 'cat-05',
    category_name: 'Drainage / Choked Gutter',
    category_name_gu: 'ગટર / નાલી કચરો',
    category_name_hi: 'नाली या सीवर जल जमाव',
    description: 'Choked drains, sewage overflow, and stagnant filthy waste water',
    icon: 'Droplets',
    is_active: true
  },
  {
    id: 'cat-02',
    category_name: 'Open Garbage Dumping',
    category_name_gu: 'ખુલ્લામાં કચરો ઠાલવવો',
    category_name_hi: 'खुले में कचरा डंपिंग',
    description: 'Unauthorized garbage dump heaps on vacant plots or roadside',
    icon: 'AlertTriangle',
    is_active: true
  },
  {
    id: 'cat-04',
    category_name: 'Roadside Garbage',
    category_name_gu: 'રસ્તા કિનારે કચરો',
    category_name_hi: 'सड़क किनारे कचरा',
    description: 'Accumulated debris, plastic packaging, and leaves along roads',
    icon: 'Truck',
    is_active: true
  },
  {
    id: 'cat-01',
    category_name: 'Littering / Plastic',
    category_name_gu: 'કચરો / પ્લાસ્ટિક',
    category_name_hi: 'कचरा फैलाना / प्लास्टिक',
    description: 'Public litter on streets, sidewalks, and market areas',
    icon: 'Trash2',
    is_active: true
  },
  {
    id: 'cat-07',
    category_name: 'Potholes / Degraded Road',
    category_name_gu: 'ખાડા / તૂટેલો રસ્તો',
    category_name_hi: 'सड़क के गड्ढे / खराब सड़क',
    description: 'Potholes, cracks, and degraded road surface causing traffic hazards',
    icon: 'Road',
    is_active: true
  },
  {
    id: 'cat-08',
    category_name: 'Fallen Tree / Blockage',
    category_name_gu: 'પડેલું ઝાડ / માર્ગ અવરોધ',
    category_name_hi: 'गिरा हुआ पेड़ / मार्ग अवरोध',
    description: 'Fallen branches, uprooted trees, or uncollected garden green waste',
    icon: 'TreePine',
    is_active: true
  },
  {
    id: 'cat-09',
    category_name: 'Railing / Parapet Damaged',
    category_name_gu: 'રેલિંગ / પેરાપેટ નુકસાન',
    category_name_hi: 'क्षतिग्रस्त रेलिंग / संरचना',
    description: 'Damaged pedestrian railings, parapet walls, or culvert slabs',
    icon: 'ShieldAlert',
    is_active: true
  },
  {
    id: 'cat-10',
    category_name: 'Road Overtopped / Flooding',
    category_name_gu: 'રસ્તા પર પાણી ભરાવું',
    category_name_hi: 'सड़क पर जलभराव / ओवरफ्लो',
    description: 'Severe waterlogging or flood water overtopping the road',
    icon: 'Waves',
    is_active: true
  },
  {
    id: 'cat-06',
    category_name: 'Other Civic Issues',
    category_name_gu: 'અન્ય નાગરિક સમસ્યાઓ',
    category_name_hi: 'अन्य स्वच्छता समस्याएं',
    description: 'Dead animal disposal, construction debris, or public toilet issues',
    icon: 'HelpCircle',
    is_active: true
  }
];

// Client-side instant keyword detector for immediate responsive category assignment
const detectCategoryFromText = (text: string, filename: string): string => {
  const combined = `${text} ${filename}`.toLowerCase();
  if (
    combined.includes('pothole') ||
    combined.includes('crater') ||
    combined.includes('khada') ||
    combined.includes('degraded') ||
    combined.includes('ખાડા') ||
    combined.includes('गड्ढा')
  ) {
    return 'cat-07'; // Potholes / Degraded Road
  }
  if (
    combined.includes('tree') ||
    combined.includes('branch') ||
    combined.includes('ઝાડ') ||
    combined.includes('વૃક્ષ') ||
    combined.includes('पेड़')
  ) {
    return 'cat-08'; // Fallen Tree
  }
  if (
    combined.includes('railing') ||
    combined.includes('parapet') ||
    combined.includes('bridge') ||
    combined.includes('રેલિંગ') ||
    combined.includes('પુલ')
  ) {
    return 'cat-09'; // Railing / Parapet Damaged
  }
  if (
    combined.includes('overtop') ||
    combined.includes('waterlog') ||
    combined.includes('flood') ||
    combined.includes('ભરાયેલું પાણી')
  ) {
    return 'cat-10'; // Road Overtopped
  }
  if (
    combined.includes('drain') ||
    combined.includes('gutter') ||
    combined.includes('water') ||
    combined.includes('sewage') ||
    combined.includes('sewer') ||
    combined.includes('stagnant') ||
    combined.includes('ગટર') ||
    combined.includes('નાલી')
  ) {
    return 'cat-05'; // Drainage / Waste Accumulation
  }
  if (
    combined.includes('bin') ||
    combined.includes('dustbin') ||
    combined.includes('container') ||
    combined.includes('box') ||
    combined.includes('can') ||
    combined.includes('overfill') ||
    combined.includes('overflow') ||
    combined.includes('કચરાપેટી') ||
    combined.includes('कूड़ेदान')
  ) {
    return 'cat-03'; // Overflowing Dustbin
  }
  if (
    combined.includes('dump') ||
    combined.includes('heap') ||
    combined.includes('pile') ||
    combined.includes('plot') ||
    combined.includes('open') ||
    combined.includes('mound') ||
    combined.includes('ઢગલો') ||
    combined.includes('ढेर')
  ) {
    return 'cat-02'; // Open Garbage Dumping
  }
  if (
    combined.includes('road') ||
    combined.includes('street') ||
    combined.includes('footpath') ||
    combined.includes('side') ||
    combined.includes('divider') ||
    combined.includes('pavement') ||
    combined.includes('ફૂટપાથ') ||
    combined.includes('સડક') ||
    combined.includes('सड़क')
  ) {
    return 'cat-04'; // Roadside Garbage
  }
  if (
    combined.includes('litter') ||
    combined.includes('plastic') ||
    combined.includes('bottle') ||
    combined.includes('cup') ||
    combined.includes('wrapper') ||
    combined.includes('pouch') ||
    combined.includes('પ્લાસ્ટિક')
  ) {
    return 'cat-01'; // Littering
  }
  return 'cat-06'; // Other
};

export const ReportIssuePage: React.FC<ReportIssuePageProps> = ({
  onBack,
  categories,
  onComplaintSubmitted,
  lang,
  onNavigateToComplaints
}) => {
  const t = translations[lang];

  // 1. Photo & Evidence State (Starts empty - no prefilled dummy photo)
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageValidationStatus, setImageValidationStatus] = useState<string>('');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Hidden native camera & gallery inputs
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Form & Category State (Starts empty - citizen enters their own issue)
  const [description, setDescription] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-03');
  const [aiIdentifiedCategory, setAiIdentifiedCategory] = useState<{ id: string; name: string; confidence: number } | null>(null);
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  // 3. Location & Map State (Uber/Rapido style)
  const [selectedWardNumber, setSelectedWardNumber] = useState<number>(3);
  const [showLocationMapAndWard, setShowLocationMapAndWard] = useState<boolean>(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CONFIG.center);
  const [address, setAddress] = useState<string>('Detecting location...');
  const [landmark, setLandmark] = useState<string>('');
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const NAVSARI_WARDS_LIST = [
    { number: 1, name: 'Ward 1 - Lunsikui / Tower Road', center: [20.9475, 72.9275] as [number, number] },
    { number: 2, name: 'Ward 2 - Station Road / Fuwara', center: [20.9475, 72.9425] as [number, number] },
    { number: 3, name: 'Ward 3 - Dudhiya Talao / Ashapuri', center: [20.9325, 72.9275] as [number, number] },
    { number: 4, name: 'Ward 4 - Kaliawadi / Sayaji Road', center: [20.9325, 72.9425] as [number, number] },
    { number: 5, name: 'Ward 5 - Jalalpore Road / Shanta Devi', center: [20.9475, 72.9100] as [number, number] },
    { number: 6, name: 'Ward 6 - Vijalpore North / Eru Char Rasta', center: [20.9175, 72.9250] as [number, number] },
    { number: 7, name: 'Ward 7 - Vijalpore South / GIDC', center: [20.9175, 72.9450] as [number, number] },
    { number: 8, name: 'Ward 8 - Madhumati / Parsi Wad', center: [20.9625, 72.9290] as [number, number] },
    { number: 9, name: 'Ward 9 - Sandhkuva / Junathana', center: [20.9625, 72.9450] as [number, number] },
    { number: 10, name: 'Ward 10 - Chhapra Road / Vejalpore', center: [20.9475, 72.9625] as [number, number] },
    { number: 11, name: 'Ward 11 - Vansda Road / Italva', center: [20.9200, 72.9625] as [number, number] },
    { number: 12, name: 'Ward 12 - Mahuva Highway / Chikhli Approach', center: [20.9000, 72.9150] as [number, number] },
    { number: 13, name: 'Ward 13 - Dandi Coastal Corridor', center: [20.9350, 72.8925] as [number, number] },
  ];

  // Helper to detect closest ward from geographic coordinates
  const detectWardFromCoordinates = (lat: number, lng: number): number => {
    let closestWard = 3;
    let minDistanceSq = Infinity;
    for (const ward of NAVSARI_WARDS_LIST) {
      const dLat = lat - ward.center[0];
      const dLng = lng - ward.center[1];
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestWard = ward.number;
      }
    }
    return closestWard;
  };

  const handleWardChange = (wardNum: number) => {
    setSelectedWardNumber(wardNum);
    const wardInfo = NAVSARI_WARDS_LIST.find(w => w.number === wardNum);
    if (wardInfo) {
      setMapCenter(wardInfo.center);
      setAddress(`${wardInfo.name.split(' - ')[1]}, Navsari`);
    }
  };

  // 4. Real Speech-To-Text State
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'gu-IN' | 'hi-IN' | 'en-IN'>(
    lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN'
  );
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // 5. Profanity & Abuse Check State
  const [abuseAlert, setAbuseAlert] = useState<{ isSafe: boolean; detectedWord?: string; reason?: string }>({
    isSafe: true
  });

  // 6. Short-Range Duplicate Detection State
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<boolean>(false);
  const [upvotedComplaintId, setUpvotedComplaintId] = useState<string | null>(null);

  // 7. Status & Success State
  const [loading, setLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [savedOfflineInfo, setSavedOfflineInfo] = useState<{ label: string; ward: number; address: string } | null>(null);
  const [aiTrainedInfo, setAiTrainedInfo] = useState<{ trained: boolean; totalSamples: number } | null>(null);
  const [imageVisualFeatures, setImageVisualFeatures] = useState<ExtractedVisualFeatures | null>(null);
  const [photoRejectedAlert, setPhotoRejectedAlert] = useState<string | null>(null);

  // Reverse geocoding helper to convert coordinates to clean street address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'MyCleanNavsari-App/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        const road = data.address?.road || data.address?.pedestrian || data.address?.suburb || '';
        const neighbourhood = data.address?.neighbourhood || data.address?.residential || '';
        const city = data.address?.city || data.address?.town || data.address?.state_district || 'Navsari';
        const formatted = [road, neighbourhood, city].filter(Boolean).join(', ');
        if (formatted) {
          setAddress(formatted);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setAddress('Near Station Road, Navsari Civic Area');
  };

  // Fetch GPS location automatically on mount
  const fetchCurrentLocation = () => {
    setIsGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please tap on the map to set your location.');
      setIsGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        const detected = detectWardFromCoordinates(latitude, longitude);
        setSelectedWardNumber(detected);
        reverseGeocode(latitude, longitude);
        setIsGpsLoading(false);
      },
      err => {
        setIsGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access is disabled. Please enable GPS permissions or drag the map below.');
        } else {
          setGpsError('Could not detect exact GPS position. Tap or drag the map to select the location.');
        }
        reverseGeocode(mapCenter[0], mapCenter[1]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  // Handle map movement / center update
  const handleMapLocationChanged = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    const detected = detectWardFromCoordinates(lat, lng);
    setSelectedWardNumber(detected);
    reverseGeocode(lat, lng);
  };

  // Live Description Input Handler with Instant Abuse Detection & AI Category Match
  const descDebounceRef = useRef<any>(null);
  const handleDescriptionChange = (newVal: string) => {
    setDescription(newVal);

    // 1. Instant client-side Profanity & Abuse Check
    const abuse = checkTextForAbuse(newVal);
    setAbuseAlert(abuse);

    if (!abuse.isSafe) {
      setFormError(
        abuse.reason || `Prohibited offensive language detected ("${abuse.detectedWord}"). Please describe the civic issue constructively.`
      );
    } else {
      if (formError && formError.includes('Prohibited offensive language')) {
        setFormError(null);
      }
    }

    // 2. Instant client-side keyword matching
    const autoCat = detectCategoryFromText(newVal, imageFileName);
    if (autoCat && categories.some(c => c.id === autoCat)) {
      setSelectedCategoryId(autoCat);
    }

    // 3. Debounced AI Backend Check (PyTorch category classification)
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    descDebounceRef.current = setTimeout(async () => {
      if (newVal.trim().length >= 4 && abuse.isSafe) {
        try {
          // Deep ML classification with description
          const mlRes = await api.classifyImage(
            imageFileName,
            500000,
            newVal,
            imageUrl.startsWith('data:') ? imageUrl : undefined
          );
          if (mlRes.data?.matched_category_id && categories.some(c => c.id === mlRes.data.matched_category_id)) {
            setSelectedCategoryId(mlRes.data.matched_category_id);
          }
        } catch {
          // Silent fallback
        }
      }
    }, 500);
  };

  // Unified visual analysis, relevance check & category prediction for BOTH uploads and live camera captures
  const analyzeAndValidatePhoto = async (
    b64: string,
    fileName: string,
    fileSize: number,
    source: 'live_camera' | 'upload'
  ) => {
    setPhotoRejectedAlert(null);
    setFormError(null);

    const visualFeatures = await extractImageVisualFeatures(b64);
    setImageVisualFeatures(visualFeatures);

    // 1. Immediate local cleanliness relevance gate (instant protection even offline)
    const localRel = checkLocalCleanlinessRelevance(visualFeatures);
    if (!localRel.isRelevant) {
      const msg =
        localRel.reason ||
        'This photo is not relevant to a cleanliness issue and cannot be submitted. Please capture a clear photo of the civic issue.';
      setPhotoRejectedAlert(msg);
      setImageUrl('');
      setAiIdentifiedCategory(null);
      setImageValidationStatus('Photo rejected — Not a cleanliness issue');
      return;
    }

    // 2. Backend + PyTorch ML classification & semantic relevance validation
    try {
      const mlRes = await api.classifyImage(fileName, fileSize, description, b64, visualFeatures, source);
      if (mlRes.data?.is_relevant === false) {
        const msg =
          mlRes.data.relevance_reason ||
          'This photo is not relevant to a cleanliness issue and cannot be submitted. Please capture a clear photo of the civic problem.';
        setPhotoRejectedAlert(msg);
        setImageUrl('');
        setAiIdentifiedCategory(null);
        setImageValidationStatus('Photo rejected — Not a cleanliness issue');
        return;
      }

      if (mlRes.data?.matched_category_id && categories.some(c => c.id === mlRes.data.matched_category_id)) {
        setSelectedCategoryId(mlRes.data.matched_category_id);
        const catObj = categories.find(c => c.id === mlRes.data.matched_category_id);
        setAiIdentifiedCategory({
          id: mlRes.data.matched_category_id,
          name: catObj?.category_name || mlRes.data.predicted_category_name || 'Civic Issue',
          confidence: Math.round(
            (mlRes.data as any).confidence_score || (mlRes.data.confidence ? mlRes.data.confidence * 100 : 94)
          )
        });
        setImageValidationStatus(
          `AI Predicted: ${mlRes.data.predicted_category_name}${
            mlRes.data.matched_learned_sample ? ' (Learned Model)' : ''
          }`
        );
      } else {
        setImageValidationStatus('Photo verified (Cleanliness visual clear)');
      }
    } catch {
      // Offline fallback: keyword detection from description/filename
      const autoCat = detectCategoryFromText(description, fileName);
      if (autoCat && categories.some(c => c.id === autoCat)) {
        setSelectedCategoryId(autoCat);
      }
      setImageValidationStatus('Photo verified locally (Offline mode ready)');
    }
  };

  // Convert uploaded image file to Base64 and run validation
  const handleImageFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Invalid file format. Please upload an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError('Image file is too large (max 15MB).');
      return;
    }

    setFormError(null);
    setPhotoRejectedAlert(null);
    setImageFileName(file.name);
    setImageValidationStatus(`Analyzing photo (${(file.size / 1024).toFixed(0)} KB)...`);

    const reader = new FileReader();
    reader.onload = async e => {
      const b64 = e.target?.result as string;
      setImageUrl(b64);
      await analyzeAndValidatePhoto(b64, file.name, file.size, 'upload');
    };
    reader.readAsDataURL(file);
  };

  // Short-Range Duplicate Detection Check
  useEffect(() => {
    if (!mapCenter || dismissedDuplicates) return;

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicates(true);
        const res = await api.checkDuplicates(mapCenter[0], mapCenter[1], selectedCategoryId || undefined);
        if (res.data?.duplicates && res.data.duplicates.length > 0) {
          setDuplicateMatches(res.data.duplicates);
        } else {
          setDuplicateMatches([]);
        }
      } catch {
        setDuplicateMatches([]);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [mapCenter, selectedCategoryId, dismissedDuplicates]);

  // Handle Upvoting existing duplicate complaint
  const handleUpvoteDuplicate = async (complaintId: string) => {
    try {
      await api.toggleFollow(complaintId);
      setUpvotedComplaintId(complaintId);
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      setUpvotedComplaintId(complaintId);
    }
  };

  // Live Camera WebRTC Stream Handling
  const startLiveCamera = async () => {
    setCameraError(null);
    setIsLiveCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError('Unable to access camera directly. Please use the "Click Photo" button to open your device camera.');
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const capturePhotoFromLiveStream = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const capturedName = `camera_capture_${Date.now()}.jpg`;
        setImageUrl(dataUrl);
        setImageFileName(capturedName);
        setImageValidationStatus('Verifying live photo cleanliness relevance...');
        analyzeAndValidatePhoto(dataUrl, capturedName, Math.round(dataUrl.length * 0.75), 'live_camera');
      }
    }
    stopLiveCamera();
  };

  const toggleCameraFacingMode = async () => {
    stopLiveCamera();
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    setTimeout(() => {
      startLiveCamera();
    }, 200);
  };

  // Real Web Speech API Recognition
  const toggleRealSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech-to-text is not supported on this browser. Please use Google Chrome or Microsoft Edge.');
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
          handleDescriptionChange(fullTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked. Please allow mic permissions in your browser.');
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

  // Preset quick tester
  const handleSelectPreset = (preset: { name: string; url: string; file: string; desc: string; catId: string }) => {
    setImageUrl(preset.url);
    setImageFileName(preset.file);
    setDescription(preset.desc);
    setSelectedCategoryId(preset.catId);
    setImageValidationStatus(`Photo verified: ${preset.name}`);
    setFormError(null);
  };

  // Submit Complaint to PostgreSQL Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Image Validation
    if (!imageUrl || imageUrl.trim().length === 0) {
      setFormError('Please capture or select a photo of the cleanliness issue before submitting.');
      return;
    }

    // 2. Description Validation
    if (!description.trim() || description.trim().length < 8) {
      setFormError('Please provide at least 8 characters describing the issue location and cleanliness problem.');
      return;
    }

    // Strict Abuse & Profanity Check Gate
    const abuse = checkTextForAbuse(description);
    if (!abuse.isSafe) {
      setAbuseAlert(abuse);
      setFormError(abuse.reason || 'Please remove abusive language before submitting your report.');
      return;
    }

    if (photoRejectedAlert || !imageUrl) {
      setFormError(
        photoRejectedAlert ||
          'Please capture or upload a valid cleanliness issue photo before submitting.'
      );
      return;
    }

    setLoading(true);

    const catId = selectedCategoryId || (categories[0]?.id || 'cat-01');
    const catName = categories.find(c => c.id === catId)?.category_name || 'Civic Issue';
    const payload: any = {
      category_id: catId,
      ward_number: selectedWardNumber,
      latitude: mapCenter[0],
      longitude: mapCenter[1],
      address: address || 'Navsari Municipal Area',
      landmark: landmark || undefined,
      description: description,
      original_language: lang,
      image_url: imageUrl,
      visual_features: imageVisualFeatures || undefined,
      is_urgent: isUrgent,
      priority: isUrgent ? 'urgent' : 'medium',
      confidence_score: aiIdentifiedCategory ? Number((aiIdentifiedCategory.confidence / 100).toFixed(2)) : 0.94,
      ai_model_name: 'NavsariWasteClassifier-ResNet50-Online',
      ai_model_version: 'v2.0.0'
    };

    const queueComplaintOffline = async () => {
      await enqueueOfflineSubmission(
        'complaint',
        `${catName} — Ward ${selectedWardNumber}`,
        payload
      );
      setSavedOfflineInfo({
        label: catName,
        ward: selectedWardNumber,
        address: payload.address
      });
    };

    try {
      // Offline check before hitting API
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await queueComplaintOffline();
        return;
      }

      // 3. AI Content Moderation & Abuse Check
      const modRes = await api.validateContent(description, 500000, 'image/jpeg');
      if (modRes.data?.moderation && !modRes.data.moderation.is_safe) {
        setFormError(
          modRes.data.moderation.reason ||
          'Prohibited or abusive language detected in description. Please describe the civic issue constructively.'
        );
        setLoading(false);
        return;
      }

      // 4. Submit to PostgreSQL database via backend API (also auto-trains AI model on this photo)
      const res: any = await api.createComplaint(payload);

      // Trigger Confetti Celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setAiTrainedInfo({
        trained: Boolean(res.data?.ai_model_trained),
        totalSamples: Number(res.data?.ai_total_samples || 0)
      });
      setSubmittedComplaint(res.data.complaint);
      onComplaintSubmitted(res.data.complaint);
    } catch (err: any) {
      if (isNetworkError(err)) {
        await queueComplaintOffline();
      } else {
        setFormError(err.message || 'Failed to submit complaint. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // OFFLINE QUEUED CONFIRMATION SCREEN
  // ========================================================
  if (savedOfflineInfo) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 animate-scaleUp">
        <div className="bg-white rounded-3xl shadow-xl border border-amber-300 p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-white shadow-lg mx-auto flex items-center justify-center text-amber-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-900">
              Saved Locally · Offline Queue Active
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0f2925] mt-2">
              Report Saved Offline
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Internet is currently unavailable. Your report for <strong>{savedOfflineInfo.label}</strong> (Ward {savedOfflineInfo.ward}) has been safely stored on your device and will <strong>automatically submit to the municipal server</strong> as soon as internet reconnects.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#095c54]" />
            <span>{savedOfflineInfo.address}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setSavedOfflineInfo(null);
                setDescription('');
                setLandmark('');
                onBack();
              }}
              className="btn-primary-custom py-3 px-6 text-xs sm:text-sm font-extrabold shadow-lg"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setSavedOfflineInfo(null);
                setDescription('');
                setLandmark('');
              }}
              className="btn-outline-custom py-3 px-6 text-xs sm:text-sm font-extrabold"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // SUCCESS SCREEN
  // ========================================================
  if (submittedComplaint) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 animate-scaleUp">
        <div className="bg-white rounded-3xl shadow-xl border border-[#b8e0d7] p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#ecfdf5] border-4 border-white shadow-lg mx-auto flex items-center justify-center text-[#10b981]">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#e6f4f1] text-[#095c54]">
              Saved to Municipal PostgreSQL Database
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#095c54] mt-2">
              Complaint Registered Successfully
            </h2>
            <p className="text-xs text-[#64748b] mt-1">
              Your report has been permanently recorded in the municipal database and dispatched to the ward sanitation team.
            </p>
          </div>

          {/* Ticket ID Box */}
          <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] inline-block w-full max-w-sm">
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">
              Official Tracking ID
            </span>
            <span className="text-lg font-black text-[#095c54] tracking-wider select-all">
              {submittedComplaint.complaint_number}
            </span>
            <div className="mt-2 pt-2 border-t border-[#e2e8f0] text-xs font-semibold text-[#0f2925] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
              <span className="truncate">{submittedComplaint.location?.address}</span>
            </div>
          </div>

          {aiTrainedInfo?.trained && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-extrabold text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                AI Vision Model automatically trained with your new photo ({aiTrainedInfo.totalSamples} learned sample{aiTrainedInfo.totalSamples === 1 ? '' : 's'})
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onNavigateToComplaints}
              className="btn-primary-custom py-3 px-6 text-xs sm:text-sm font-extrabold shadow-lg"
            >
              Track in My Complaints →
            </button>
            <button
              onClick={() => {
                setSubmittedComplaint(null);
                setDescription('');
                setLandmark('');
                setDismissedDuplicates(false);
                setDuplicateMatches([]);
              }}
              className="btn-outline-custom py-3 px-6 text-xs sm:text-sm font-extrabold"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);

  // ========================================================
  // COMPLAINT FORM
  // Sequence:
  // 1. Photo Capture & Validation at TOP
  // 2. Issue Description, Live Auto-Category & Audio Note
  // 3. Duplicate Detection Alert (if similar complaint within short range)
  // 4. Interactive Uber/Rapido Map at BOTTOM
  // 5. Submit Button
  // ========================================================
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-extrabold text-[#095c54] bg-white px-3 py-2 rounded-xl border border-[#e2e8f0] shadow-sm hover:bg-[#f0f6f4] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="text-right">
          <span className="pill-badge py-1 px-3 text-[11px]">
            <span className="badge-dot" />
            NMC Live Database Portal
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-5 sm:p-7 space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54]">
            Report a Cleanliness Issue
          </h2>
        </div>

        {/* Irrelevant Photo Rejection Alert Banner */}
        {photoRejectedAlert && (
          <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-xs font-bold text-red-900 flex items-start justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-black text-red-800">Photo Cannot Be Submitted — Not Relevant to Cleanliness Issue</p>
                <p className="font-semibold text-red-700 leading-relaxed">{photoRejectedAlert}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhotoRejectedAlert(null)}
              className="p-1 rounded-lg hover:bg-red-100 text-red-500 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {formError && (
          <div className="p-3.5 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-xs font-bold text-[#b91c1c] flex items-start gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#dc2626]" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ======================================================== */}
          {/* SECTION 1 (TOP): PHOTO EVIDENCE & VALIDATION             */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#095c54] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#095c54]" />
                Photo Evidence
              </label>
              <span
                className={`text-[11px] font-bold flex items-center gap-1 ${
                  photoRejectedAlert ? 'text-red-600' : 'text-[#10b981]'
                }`}
              >
                {photoRejectedAlert ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {imageValidationStatus}
              </span>
            </div>

            {/* Photo Preview Container */}
            <div
              className={`relative rounded-2xl overflow-hidden border-2 border-dashed aspect-video flex items-center justify-center ${
                photoRejectedAlert
                  ? 'border-red-300 bg-red-50/60'
                  : 'border-[#b8e0d7] bg-[#f8faf9]'
              }`}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Issue preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-6 text-xs font-bold text-slate-500">
                  Capture or upload a clear photo of the cleanliness issue
                </div>
              )}

              {/* Floating Camera Actions on Image (Responsive for small phones) */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-wrap items-center justify-center gap-2 p-2.5 sm:p-4">
                {/* 1. Direct Native Camera Button */}
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="btn-primary-custom py-2 px-3 sm:px-3.5 text-xs font-black shadow-lg flex items-center gap-1.5 touch-press"
                >
                  <Camera className="w-4 h-4" />
                  <span>Click Photo</span>
                </button>

                {/* 2. Live WebRTC Viewfinder Button */}
                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="bg-white/95 backdrop-blur-sm text-[#095c54] hover:bg-white py-2 px-3 sm:px-3.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition touch-press"
                >
                  <Sparkles className="w-4 h-4 text-[#095c54]" />
                  <span>Live Camera</span>
                </button>

                {/* 3. Upload from Gallery Button */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="bg-white/90 backdrop-blur-sm text-[#0f2925] hover:bg-white py-2 px-3 sm:px-3.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition touch-press"
                >
                  <Upload className="w-4 h-4 text-[#64748b]" />
                  <span>Gallery</span>
                </button>
              </div>

              {/* Hidden Native File Inputs */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFileSelected(file);
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFileSelected(file);
                }}
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="flex items-center gap-2 text-[11px] overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[10px] font-bold text-[#64748b] whitespace-nowrap">
                Sample photos:
              </span>
              {[
                {
                  name: 'Overflowing Bin',
                  url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
                  file: 'dustbin_overflow.jpg',
                  desc: 'Public community dustbin is completely filled and overflowing onto the pedestrian path.',
                  catId: 'cat-03'
                },
                {
                  name: 'Choked Gutter',
                  url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
                  file: 'gutter_drainage.jpg',
                  desc: 'Severely choked drainage gutter causing dirty stagnant wastewater to spill over street.',
                  catId: 'cat-05'
                },
                {
                  name: 'Roadside Dump',
                  url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
                  file: 'road_dump.jpg',
                  desc: 'Heavy roadside dumping of uncollected plastic debris and domestic waste.',
                  catId: 'cat-04'
                }
              ].map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPreset(s)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition border ${
                    imageUrl === s.url
                      ? 'bg-[#095c54] text-white border-[#095c54]'
                      : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-[#f0f6f4]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2 (MIDDLE): DESCRIPTION & AI CATEGORY DETECTION  */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-extrabold text-[#095c54]">
                  Issue Description
                </label>

                {/* Real Speech-to-Text Controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    value={speechLang}
                    onChange={e => setSpeechLang(e.target.value as any)}
                    className="text-[11px] font-bold text-[#095c54] bg-[#f0f6f4] px-2 py-1 rounded-xl border border-[#b8e0d7] outline-none cursor-pointer"
                    title="Select spoken language"
                  >
                    <option value="gu-IN">🇬🇯 ગુજરાતી</option>
                    <option value="hi-IN">🇮🇳 हिन्दी</option>
                    <option value="en-IN">🇬🇧 English</option>
                  </select>

                  <button
                    type="button"
                    onClick={toggleRealSpeechRecognition}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isListeningSpeech
                        ? 'bg-[#dc2626] text-white animate-pulse shadow-md shadow-red-500/20'
                        : 'bg-[#f0f6f4] text-[#095c54] hover:bg-[#e6f4f1] border border-[#b8e0d7]'
                    }`}
                  >
                    {isListeningSpeech ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 animate-spin" />
                        <span>Listening... Speak Now</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-[#10b981]" />
                        <span>Voice to Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Listening Sound Wave Animation */}
              {isListeningSpeech && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#fee2e2]/60 border border-[#fca5a5] text-xs font-bold text-[#dc2626] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-ping" />
                  <span>Microphone active: Speak clearly into your microphone in {speechLang === 'gu-IN' ? 'Gujarati' : speechLang === 'hi-IN' ? 'Hindi' : 'English'}...</span>
                </div>
              )}

              {/* Speech Error Banner */}
              {speechError && (
                <div className="text-[11px] font-semibold text-[#dc2626] bg-[#fee2e2] px-2.5 py-1.5 rounded-xl border border-[#fca5a5]">
                  {speechError}
                </div>
              )}

              <textarea
                rows={3}
                value={description}
                onChange={e => handleDescriptionChange(e.target.value)}
                placeholder="Describe what is causing the cleanliness problem (e.g. choked gutter, overflowing bin, open dump)..."
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-semibold text-[#0f2925] outline-none transition ${
                  !abuseAlert.isSafe
                    ? 'border-[#dc2626] bg-[#fee2e2]/20 focus:ring-2 focus:ring-[#dc2626]/20'
                    : 'border-[#e2e8f0] focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/10'
                }`}
                required
              />

              {/* Dynamic Helper Note with Strict Abuse Gate */}
              <div className="flex items-center justify-between text-[11px] text-[#64748b] flex-wrap gap-1.5">
                <span>Min 8 characters</span>
                {!abuseAlert.isSafe ? (
                  <span className="text-[#dc2626] font-bold flex items-center gap-1 bg-[#fee2e2] px-2.5 py-1 rounded-xl border border-[#fca5a5]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Inappropriate language ("{abuseAlert.detectedWord}") detected
                  </span>
                ) : description.trim().length >= 8 ? (
                  <span className="text-[#10b981] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Respectful civic description
                  </span>
                ) : (
                  <span className="text-[#d97706] font-medium">
                    {8 - description.trim().length} more characters needed
                  </span>
                )}
              </div>
            </div>

            {/* Category Selector with AI Auto-Detected Indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-[#095c54]">
                  Issue Category
                </label>
                {selectedCategoryObj && (
                  <span className="text-[11px] font-extrabold text-[#095c54] bg-[#e6f4f1] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#b8e0d7]">
                    <Sparkles className="w-3 h-3 text-[#095c54]" />
                    AI Assigned: {selectedCategoryObj.category_name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {categories.map(c => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all touch-press border relative flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-[#095c54] text-white border-[#095c54] shadow-md shadow-[#095c54]/20 ring-2 ring-[#095c54]/30'
                          : 'bg-[#f8faf9] text-[#0f2925] border-[#e2e8f0] hover:border-[#095c54] hover:bg-[#e6f4f1]/50'
                      }`}
                    >
                      <CategoryVisualSymbol
                        categoryId={c.id}
                        categoryName={c.category_name}
                        isSelected={isSelected}
                        size="sm"
                        showCheckBadge={false}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black truncate">{c.category_name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </div>
                        <div className={`text-[10px] font-semibold truncate mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-[#64748b]'}`}>
                          {c.category_name_gu}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency Checkbox */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0]">
              <div>
                <span className="text-xs font-extrabold text-[#0f2925] block">
                  Mark as High Urgency
                </span>
                <span className="text-[10px] text-[#64748b]">
                  Severe public health hazard or completely blocked thoroughfare
                </span>
              </div>
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-[#dc2626] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: SHORT-RANGE DUPLICATE DETECTION ALERT         */}
          {/* ======================================================== */}
          {duplicateMatches.length > 0 && !dismissedDuplicates && (
            <div className="p-4 rounded-2xl bg-[#fffbeb] border border-[#fde68a] space-y-3 animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#fef3c7] text-[#d97706]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#92400e]">
                      Similar Issue Found Nearby ({duplicateMatches[0].distance_meters}m away)
                    </h4>
                    <p className="text-[11px] text-[#78350f]">
                      A citizen has already logged a report for this spot. You can upvote it to escalate priority!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedDuplicates(true)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Dismiss duplicate alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Duplicate Card Preview */}
              <div className="p-3 rounded-xl bg-white border border-[#fde68a] flex items-center gap-3">
                <img
                  src={duplicateMatches[0].image_url}
                  alt="Existing duplicate"
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#e2e8f0]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e]">
                      {duplicateMatches[0].complaint_number}
                    </span>
                    <span className="text-[10px] font-bold text-[#10b981] capitalize">
                      ● {duplicateMatches[0].status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#0f2925] truncate mt-1">
                    {duplicateMatches[0].description}
                  </p>
                  <span className="text-[10px] text-[#64748b]">
                    Category: {duplicateMatches[0].category_name}
                  </span>
                </div>
              </div>

              {/* Actions: Upvote or Proceed Anyway */}
              <div className="flex items-center gap-2.5 pt-1">
                {upvotedComplaintId === duplicateMatches[0].id ? (
                  <div className="py-2 px-3 rounded-xl bg-[#ecfdf5] text-[#047857] text-xs font-black flex items-center gap-1.5 border border-[#a7f3d0]">
                    <Check className="w-3.5 h-3.5" /> Upvoted & Followed (+1 Priority)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpvoteDuplicate(duplicateMatches[0].id)}
                    className="btn-primary-custom py-2 px-3 text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Upvote Existing Issue (+1)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedDuplicates(true)}
                  className="btn-outline-custom py-2 px-3 text-xs font-bold text-[#64748b]"
                >
                  Submit Separate Report
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4 (BOTTOM): CHECKBOX TOGGLE FOR MAP & WARD NO    */}
          {/* ======================================================== */}
          <div className="space-y-3">
            {/* Checkbox Toggle Div: "Show location in map and ward no" */}
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#f8faf9] hover:bg-[#e6f4f1]/60 border border-[#b8e0d7] cursor-pointer transition select-none">
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={showLocationMapAndWard}
                  onChange={e => setShowLocationMapAndWard(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#095c54] cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#095c54] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#095c54] shrink-0" />
                    <span>Show location in map and ward no</span>
                  </span>
                  <span className="text-[11px] text-[#64748b] font-medium block mt-0.5 truncate">
                    {showLocationMapAndWard
                      ? 'Showing interactive map pin and municipal ward selector'
                      : `Auto-detected: Ward ${selectedWardNumber} · Check to view map or change ward`}
                  </span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                  showLocationMapAndWard
                    ? 'bg-[#095c54] text-white border-[#095c54]'
                    : 'bg-white text-[#095c54] border-[#b8e0d7]'
                }`}
              >
                {showLocationMapAndWard ? 'Shown' : 'Hidden'}
              </span>
            </label>

            {/* Show Ward Selection & Map View ONLY when checkbox is checked */}
            {showLocationMapAndWard && (
              <div className="space-y-2.5 animate-fadeIn">
                {/* Municipal Ward Selector */}
                <div className="p-3 rounded-2xl bg-white border border-[#b8e0d7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-[#095c54] block tracking-wider">
                      Target Municipal Ward *
                    </span>
                    <span className="text-[11px] text-[#64748b] font-medium">
                      Auto-centers map and dispatches to that ward's officer
                    </span>
                  </div>
                  <select
                    value={selectedWardNumber}
                    onChange={e => handleWardChange(Number(e.target.value))}
                    className="text-xs font-bold text-[#0f2925] bg-[#f8faf9] border border-[#cbd5e1] rounded-xl px-3 py-2 outline-none focus:border-[#095c54] cursor-pointer"
                  >
                    {NAVSARI_WARDS_LIST.map(w => (
                      <option key={w.number} value={w.number}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GPS Notification if Location is Disabled */}
                {gpsError && (
                  <div className="p-3 rounded-2xl bg-[#fef3c7] border border-[#fde68a] text-xs font-bold text-[#92400e] flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#d97706]" />
                      <span>{gpsError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchCurrentLocation}
                      className="px-2.5 py-1 rounded-xl bg-white border border-[#d97706] text-[11px] font-black text-[#92400e] hover:bg-[#fffbeb] shrink-0"
                    >
                      Turn On GPS
                    </button>
                  </div>
                )}

                {/* Interactive Uber/Rapido Map with Center Target Pin */}
                <div className="relative rounded-2xl overflow-hidden border border-[#b8e0d7] shadow-md h-60 sm:h-64 bg-slate-100">
                  <MapContainer
                    center={mapCenter}
                    zoom={16}
                    minZoom={4}
                    maxZoom={19}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%', zIndex: 10 }}
                  >
                    <MapCenterController center={mapCenter} />
                    <MapMoveListener onLocationChanged={handleMapLocationChanged} />

                    {/* Clean CartoDB / OSM Tiles */}
                    <TileLayer
                      url={MAP_CONFIG.tileProvider.url}
                      attribution={MAP_CONFIG.tileProvider.attribution}
                      subdomains={MAP_CONFIG.tileProvider.subdomains}
                      maxZoom={19}
                    />
                  </MapContainer>

                  {/* Fixed Uber-Style Center Pin with Pulse */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[20] pointer-events-none flex flex-col items-center">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#095c54] text-white flex items-center justify-center shadow-2xl border-2 border-white font-black text-sm uber-pin-bounce">
                        <MapPin className="w-5 h-5 text-white fill-white/20" />
                      </div>
                      <div className="gps-pulse-ring"></div>
                    </div>
                    {/* Pin Tip */}
                    <div className="w-2 h-2 bg-[#095c54] rotate-45 -mt-1 shadow-sm"></div>
                  </div>

                  {/* Floating "Locate Me" GPS Button */}
                  <button
                    type="button"
                    onClick={fetchCurrentLocation}
                    disabled={isGpsLoading}
                    className="absolute bottom-3 right-3 z-[20] bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-lg border border-[#b8e0d7] text-[#095c54] hover:bg-[#e6f4f1] transition disabled:opacity-50"
                    title="Detect current GPS location"
                  >
                    {isGpsLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-[#095c54]" />
                    ) : (
                      <Compass className="w-5 h-5 text-[#095c54]" />
                    )}
                  </button>

                  {/* Floating Instructions */}
                  <div className="absolute top-2.5 left-2.5 z-[20] bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-[10px] font-semibold pointer-events-none">
                    Pin set at map center
                  </div>
                </div>
              </div>
            )}

            {/* Readable Address Card (NO raw coordinates shown to user) */}
            <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#095c54] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[10px] font-extrabold uppercase text-[#64748b] block">
                    Detected Street / Area
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Enter street or area name"
                    className="w-full text-xs font-bold text-[#0f2925] bg-transparent outline-none mt-0.5"
                  />
                </div>
              </div>

              {/* Optional Landmark */}
              <div className="pt-2 border-t border-[#e2e8f0]/80">
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Nearby Landmark (e.g. Opp. Station, Near Water Tank)"
                  className="w-full text-xs font-semibold text-[#0f2925] bg-transparent outline-none placeholder:text-[#94a3b8]"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 5: SUBMIT ACTION BUTTON                         */}
          {/* ======================================================== */}
          <button
            type="submit"
            disabled={loading || !abuseAlert.isSafe || description.trim().length < 8}
            className={`w-full py-3.5 sm:py-4 text-sm font-black rounded-2xl shadow-xl transition-all touch-press flex items-center justify-center gap-2 ${
              !abuseAlert.isSafe
                ? 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5] cursor-not-allowed opacity-90'
                : 'btn-primary-custom disabled:opacity-60 shadow-lg shadow-[#095c54]/30'
            }`}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : !abuseAlert.isSafe ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Inappropriate Words Detected — Please Edit to Submit</span>
              </>
            ) : (
              <>
                <span>Submit Report to Municipal Corporation</span>
                <ChevronRight className="w-4 h-4 ml-1 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* ======================================================== */}
      {/* LIVE CAMERA VIEWFINDER MODAL                             */}
      {/* ======================================================== */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col relative animate-scaleUp">
            {/* Modal Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse"></span>
                Live Camera
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Feed */}
            <div className="relative aspect-[3/4] bg-slate-900 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {cameraError && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-black/90 text-white space-y-3">
                  <AlertTriangle className="w-8 h-8 text-[#f59e0b]" />
                  <p className="text-xs text-white/80">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      nativeCameraInputRef.current?.click();
                    }}
                    className="btn-primary-custom py-2 px-4 text-xs font-bold"
                  >
                    Open Device Camera
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Shutter Controls */}
            <div className="p-5 bg-black flex items-center justify-around">
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="p-3 rounded-full bg-white/15 text-white hover:bg-white/25 transition"
                title="Flip Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              {/* Big Circular Shutter Button */}
              <button
                type="button"
                onClick={capturePhotoFromLiveStream}
                className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center group active:scale-90 transition transform"
              >
                <div className="w-full h-full rounded-full bg-white group-hover:bg-[#10b981] transition"></div>
              </button>

              <div className="w-11"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
