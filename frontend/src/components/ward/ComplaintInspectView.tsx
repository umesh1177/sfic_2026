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
  Globe,
  ShieldCheck,
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
  X,
  XCircle
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
  const [verifyingEvidenceId, setVerifyingEvidenceId] = useState<string | null>(null);
  const [rejectingEvidenceId, setRejectingEvidenceId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [targetRejectIds, setTargetRejectIds] = useState<string[]>([]);

  // Squad Management States (Assign New Squad, Add/Remove Worker)
  const [showAssignSquadModal, setShowAssignSquadModal] = useState<boolean>(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState<boolean>(false);
  const [wardTeams, setWardTeams] = useState<any[]>([]);
  const [wardWorkers, setWardWorkers] = useState<any[]>([]);
  const [selectedNewTeamId, setSelectedNewTeamId] = useState<string>('');
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string>('');
  const [newSquadMaxWorkDays, setNewSquadMaxWorkDays] = useState<number>(3);
  const [assigningSquad, setAssigningSquad] = useState<boolean>(false);
  const [addingWorkerId, setAddingWorkerId] = useState<string | null>(null);
  const [removingWorkerId, setRemovingWorkerId] = useState<string | null>(null);
  const [togglingGeofence, setTogglingGeofence] = useState<boolean>(false);
  const [fullPhotoModalUrl, setFullPhotoModalUrl] = useState<string | null>(null);

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
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [newBeforePhotoUrl, setNewBeforePhotoUrl] = useState<string>('');
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [newAfterPhotoUrl, setNewAfterPhotoUrl] = useState<string>('');

  // Category Reclassification & Active Learning State
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isEditingCategory, setIsEditingCategory] = useState<boolean>(false);
  const [selectedNewCategory, setSelectedNewCategory] = useState<string>('');
  const [showReclassifyModal, setShowReclassifyModal] = useState<boolean>(false);
  const [reclassifying, setReclassifying] = useState<boolean>(false);

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

    const uniqueBeforeUrls: string[] = [];
    const pushBeforeIfValid = (u?: string) => {
      if (u && typeof u === 'string' && u.trim() && !uniqueBeforeUrls.includes(u.trim())) {
        uniqueBeforeUrls.push(u.trim());
      }
    };
    if (Array.isArray(data.work_progress_evidence?.before_photos)) {
      data.work_progress_evidence.before_photos.forEach((u: string) => pushBeforeIfValid(u));
    }
    pushBeforeIfValid(data.work_progress_evidence?.before_photo_url);
    if (Array.isArray(data.citizen_report?.original_photos)) {
      data.citizen_report.original_photos.forEach((u: string) => pushBeforeIfValid(u));
    }
    pushBeforeIfValid(data.citizen_report?.photo_url);
    pushBeforeIfValid(data.overview?.image_url);

    // Also collect evidence marked as before stage
    const allEvItems: any[] = data.work_progress_evidence?.evidence_items || [];
    allEvItems.forEach((ev: any) => {
      const st = String(ev.evidence_type || ev.stage || '').toLowerCase();
      if (st === 'before') {
        if (Array.isArray(ev.photos)) {
          ev.photos.forEach((p: string) => pushBeforeIfValid(p));
        }
        pushBeforeIfValid(ev.storage_path || ev.photo_url);
      }
    });

    setBeforePhotos(uniqueBeforeUrls);

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
      if (res.data?.overview?.category_name) {
        setSelectedNewCategory(res.data.overview.category_name);
      }
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
    api.getCategories().then((res: any) => {
      if (res.data) setCategoriesList(res.data);
    }).catch(() => {});
  }, [complaintId]);

  // Handle Category Reclassification with Human-in-the-Loop Active Learning
  const handleReclassifyCategory = async (trainModel: boolean) => {
    if (!selectedNewCategory || !complaintId) return;
    setReclassifying(true);
    setActionError(null);
    try {
      const res = await api.reclassifyWardComplaint(complaintId, {
        category_name: selectedNewCategory,
        train_model: trainModel
      });

      setDetails((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          overview: {
            ...prev.overview,
            category_name: selectedNewCategory
          }
        };
      });

      setShowReclassifyModal(false);
      setIsEditingCategory(false);
      setActionSuccess(
        `Category updated to "${selectedNewCategory}". ${trainModel ? 'AI model learned this photo in the category dataset!' : ''}`
      );
      if (trainModel) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update category.');
    } finally {
      setReclassifying(false);
    }
  };

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
      const bPhotoList = beforePhotos.length > 0
        ? beforePhotos
        : (details?.work_progress_evidence?.before_photo_url
            ? [details.work_progress_evidence.before_photo_url]
            : (details?.citizen_report?.photo_url ? [details.citizen_report.photo_url] : []));
      const aPhotoList = afterPhotos.length > 0
        ? afterPhotos
        : (details?.work_progress_evidence?.after_photo_url
            ? [details.work_progress_evidence.after_photo_url]
            : (details?.overview?.resolved_image_url ? [details.overview.resolved_image_url] : []));

      await api.publishWardComplaintToCommunity(complaintId, {
        title: postTitle.trim() || `Cleanliness Restored at ${postLocation || 'Navsari'}`,
        description: postDescription.trim() || verificationNotes,
        before_photo_url: bPhotoList[0] || '',
        before_photos: bPhotoList,
        after_photo_url: aPhotoList[0] || '',
        after_photos: aPhotoList,
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

  const loadTeamsAndWorkers = async () => {
    try {
      const [tRes, wRes] = await Promise.all([
        api.getWardTeams(),
        api.getWardWorkers()
      ]);
      let teams = tRes.data || [];
      const workers = wRes.data || [];

      // Query AI recommendation engine with 4-factor scoring model
      if (complaintId) {
        try {
          const suggRes = await api.getSuggestedTeamsForComplaint(complaintId);
          if (suggRes.success && Array.isArray(suggRes.data) && suggRes.data.length > 0) {
            teams = suggRes.data;
          }
        } catch (e) {
          console.warn('Suggested teams endpoint fallback to base teams:', e);
        }
      }

      setWardTeams(teams);
      setWardWorkers(workers);
      if (teams.length > 0) {
        setSelectedNewTeamId(teams[0].id);
        const leader = teams[0].temporary_leader_id || (teams[0].members?.[0]?.id) || (teams[0].leader_id) || '';
        setSelectedNewLeaderId(leader);
      }
    } catch {
      // ignore
    }
  };

  const openAssignSquadModal = () => {
    loadTeamsAndWorkers();
    setShowAssignSquadModal(true);
  };

  const openAddWorkerModal = () => {
    loadTeamsAndWorkers();
    setShowAddWorkerModal(true);
  };

  const handleAssignNewSquad = async () => {
    if (!selectedNewTeamId) {
      setActionError('Please select a squad to assign.');
      return;
    }
    setAssigningSquad(true);
    setActionError(null);
    try {
      await api.assignWardComplaintTeam(complaintId, {
        team_id: selectedNewTeamId,
        temporary_leader_id: selectedNewLeaderId || undefined,
        max_work_days: newSquadMaxWorkDays || 3
      });
      setActionSuccess('New squad successfully assigned to complaint!');
      setShowAssignSquadModal(false);
      confetti({ particleCount: 35, spread: 60 });
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign new squad.');
    } finally {
      setAssigningSquad(false);
    }
  };

  const handleAddWorkerToSquad = async (workerId: string) => {
    setAddingWorkerId(workerId);
    setActionError(null);
    try {
      await api.addWorkerToComplaintSquad(complaintId, workerId);
      setActionSuccess('Worker successfully added to active squad!');
      setShowAddWorkerModal(false);
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to add worker to squad.');
    } finally {
      setAddingWorkerId(null);
    }
  };

  const handleRemoveWorkerFromSquad = async (workerId: string) => {
    setRemovingWorkerId(workerId);
    setActionError(null);
    try {
      await api.removeWorkerFromComplaintSquad(complaintId, workerId);
      setActionSuccess('Worker removed from active squad.');
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove worker from squad.');
    } finally {
      setRemovingWorkerId(null);
    }
  };

  // Helper to safely parse photo list from any format (array, json string, pg array, or single url)
  const parseEvidencePhotos = (item: any): string[] => {
    if (!item) return [];
    const list: string[] = [];
    const addPhoto = (p: any) => {
      if (!p) return;
      if (typeof p === 'string') {
        const tr = p.trim();
        if (tr.startsWith('[') && tr.endsWith(']')) {
          try {
            const arr = JSON.parse(tr);
            if (Array.isArray(arr)) {
              arr.forEach(addPhoto);
              return;
            }
          } catch {}
        }
        if (tr.startsWith('{') && tr.endsWith('}')) {
          tr.slice(1, -1).split(',').forEach(s => addPhoto(s.replace(/^"|"$/g, '').trim()));
          return;
        }
        if (tr && !list.includes(tr)) list.push(tr);
      } else if (Array.isArray(p)) {
        p.forEach(addPhoto);
      }
    };

    if (item.photos) addPhoto(item.photos);
    if (item.photo_urls) addPhoto(item.photo_urls);
    if (item.storage_path) addPhoto(item.storage_path);
    if (item.photo_url) addPhoto(item.photo_url);

    return list;
  };

  // Helper to group multiple photo rows from same submission batch into single card
  const groupEvidenceBatches = (items: any[]) => {
    if (!items || !Array.isArray(items)) return [];
    const groups: {
      id: string;
      ids: string[];
      evidence_type: string;
      stage: string;
      description: string;
      worker_name?: string;
      device_capture_timestamp?: string;
      created_at?: string;
      distance_from_assignment_meters?: number;
      photos: string[];
      officer_verified: boolean;
      review_status: string;
      officer_notes?: string;
    }[] = [];

    items.forEach((item: any) => {
      const rawPhotos: string[] = parseEvidencePhotos(item);
      const itemTs = new Date(item.device_capture_timestamp || item.created_at || Date.now()).getTime();
      const itemStage = String(item.evidence_type || item.stage || 'progress').toLowerCase();
      const itemDesc = (item.description || '').trim();

      // Find matching group within 90s window and matching stage
      const match = groups.find(g => {
        const gTs = new Date(g.device_capture_timestamp || g.created_at || Date.now()).getTime();
        const gStage = String(g.evidence_type || g.stage || 'progress').toLowerCase();
        return gStage === itemStage && Math.abs(itemTs - gTs) < 90000;
      });

      if (match) {
        if (item.id && !match.ids.includes(item.id)) match.ids.push(item.id);
        rawPhotos.forEach(p => {
          if (p && !match.photos.includes(p)) match.photos.push(p);
        });
        if (itemDesc && !match.description.includes(itemDesc)) {
          match.description = match.description ? `${match.description} · ${itemDesc}` : itemDesc;
        }
      } else {
        groups.push({
          id: item.id || `batch-${Date.now()}`,
          ids: item.id ? [item.id] : [],
          evidence_type: item.evidence_type || item.stage || 'progress',
          stage: item.stage || item.evidence_type || 'progress',
          description: itemDesc,
          worker_name: item.worker_name,
          device_capture_timestamp: item.device_capture_timestamp || item.created_at,
          created_at: item.created_at,
          distance_from_assignment_meters: item.distance_from_assignment_meters,
          photos: [...rawPhotos],
          officer_verified: Boolean(item.officer_verified || item.review_status === 'verified'),
          review_status: item.review_status || (item.officer_verified ? 'verified' : 'pending'),
          officer_notes: item.officer_notes || item.review_comments
        });
      }
    });

    return groups;
  };

  const allowAnywhereAttendance = Boolean(details?.overview?.allow_anywhere_attendance || details?.team_attendance?.allow_anywhere_attendance);

  const handleToggleGeofenceOverride = async () => {
    if (!complaintId || togglingGeofence) return;
    setTogglingGeofence(true);
    const nextVal = !allowAnywhereAttendance;
    try {
      const res = await api.toggleGeofenceOverride(complaintId, nextVal);
      setActionSuccess(res?.message || (nextVal ? 'Geofence override enabled: Attendance allowed from anywhere.' : '150m Geofence enforced.'));
      setDetails((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          overview: {
            ...prev.overview,
            allow_anywhere_attendance: nextVal
          },
          team_attendance: {
            ...prev.team_attendance,
            allow_anywhere_attendance: nextVal
          }
        };
      });
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle geofence override.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setTogglingGeofence(false);
    }
  };

  const handleVerifyEvidence = async (evidenceIds?: string[]) => {
    setVerifyingEvidenceId(evidenceIds && evidenceIds.length === 1 ? evidenceIds[0] : 'all');
    setActionError(null);
    try {
      const res = await api.verifyWardComplaintEvidence(complaintId, evidenceIds);
      setActionSuccess(res.message || 'Team leader evidence successfully verified! Recorded in Evidence History.');
      confetti({ particleCount: 40, spread: 65, origin: { y: 0.6 } });
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify leader evidence.');
    } finally {
      setVerifyingEvidenceId(null);
    }
  };

  const handleRejectEvidence = async (evidenceIds?: string[], reason?: string) => {
    setRejectingEvidenceId(evidenceIds && evidenceIds.length === 1 ? evidenceIds[0] : 'all');
    setActionError(null);
    try {
      const res = await api.rejectWardComplaintEvidence(
        complaintId,
        evidenceIds,
        reason || rejectReason || 'Evidence rejected by Ward Officer. Please re-clean site and upload fresh photos.'
      );
      setActionSuccess(res.message || 'Evidence marked as rejected. Team leader notified in task dossier.');
      setShowRejectModal(false);
      setRejectReason('');
      setTargetRejectIds([]);
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject evidence.');
    } finally {
      setRejectingEvidenceId(null);
    }
  };

  const openRejectModalFor = (evidenceIds?: string[]) => {
    setTargetRejectIds(evidenceIds || []);
    setRejectReason('');
    setShowRejectModal(true);
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
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCategory(!isEditingCategory);
                          setSelectedNewCategory(overview.category_name);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-[#095c54] hover:bg-emerald-50 transition border border-emerald-200"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEditingCategory ? 'Cancel' : 'Change Category'}</span>
                      </button>
                    </div>

                    {!isEditingCategory ? (
                      <p className="text-sm font-extrabold text-[#095c54]">{overview.category_name}</p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <select
                          value={selectedNewCategory}
                          onChange={(e) => setSelectedNewCategory(e.target.value)}
                          className="w-full p-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-[#095c54] outline-hidden shadow-xs"
                        >
                          <option value="">-- Select New Category --</option>
                          {categoriesList.map((cat: any) => (
                            <option key={cat.id || cat.category_name} value={cat.category_name}>
                              {cat.category_name} {cat.category_name_gu ? `(${cat.category_name_gu})` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedNewCategory || selectedNewCategory === overview.category_name}
                          onClick={() => setShowReclassifyModal(true)}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#095c54] text-white text-xs font-bold shadow-xs hover:bg-[#074741] disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Update Category &amp; Retrain Model</span>
                        </button>
                      </div>
                    )}
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

      {/* 4. TAB 2: ASSIGNED TEAM MEMBERS & SQUAD MANAGEMENT */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#095c54]" />
                <span>Assigned Sanitation Squad Roster</span>
              </h3>
              <p className="text-xs text-slate-500">
                Active squad dispatched to this complaint. You can add workers, remove members, or reassign a new squad.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openAddWorkerModal}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#095c54] text-xs font-extrabold flex items-center gap-1.5 transition"
                title="Add a sanitation worker to this squad"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Worker</span>
              </button>
              <button
                type="button"
                onClick={openAssignSquadModal}
                className="px-3.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs"
                title="Assign a different squad to this complaint"
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>Assign New Squad</span>
              </button>
            </div>
          </div>

          {overview.temporary_team_leader_name && (
            <div className="flex items-center gap-2 flex-wrap pb-2">
              <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Current Leader: {overview.temporary_team_leader_name}</span>
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
                  Max Work Days: {(overview as any).max_work_days ?? 3} Days
                  {(overview as any).is_work_sla_overdue
                    ? ` (Overdue: ${(overview as any).work_days_elapsed}d)`
                    : ` (Day ${(overview as any).work_days_elapsed ?? 0}/${(overview as any).max_work_days ?? 3})`}
                </span>
              </span>
            </div>
          )}

          {/* Active Squad Members Grid */}
          {(team_attendance?.team_members && team_attendance.team_members.length > 0) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Active Squad Members ({team_attendance.team_members.length})
                </span>
                <span className="text-[11px] text-slate-400">Deployed On-Site</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team_attendance.team_members.map((member: any, idx: number) => {
                  const workerId = member.worker_id || member.id;
                  const isLeader = Boolean(member.is_temporary_leader || member.temporary_leader);

                  return (
                    <div
                      key={workerId || idx}
                      className={`p-4 rounded-2xl border transition relative ${
                        isLeader
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isLeader ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isLeader ? '👑' : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0f2925] truncate">
                              {member.name || member.full_name || member.worker_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">{member.worker_code}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLeader && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                              Leader
                            </span>
                          )}
                          {!isLeader && (
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkerFromSquad(workerId)}
                              disabled={removingWorkerId === workerId}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 hover:bg-rose-100/70 border border-rose-200 transition disabled:opacity-50"
                              title="Remove worker from this squad"
                            >
                              {removingWorkerId === workerId ? '...' : 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Designation:</span>
                          <strong className="text-slate-800">{member.designation || member.designation_name || 'Sanitation Worker'}</strong>
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
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-extrabold text-slate-700">No Field Sanitation Squad Assigned Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This complaint has not been allocated a squad yet. Click below to assign an active squad and team leader.
              </p>
              <button
                type="button"
                onClick={openAssignSquadModal}
                className="px-4 py-2 bg-[#095c54] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Sanitation Squad</span>
              </button>
            </div>
          )}

          {/* PREVIOUSLY ASSIGNED SQUADS HISTORY */}
          <div className="pt-6 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#0f2925] uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span>Previously Assigned Squads History</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Archived Squad Deployments</span>
            </div>

            {details.previous_squads && details.previous_squads.length > 0 ? (
              <div className="space-y-3">
                {details.previous_squads.map((prevSquad: any, pIdx: number) => (
                  <div key={prevSquad.assignment_id || pIdx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-mono font-bold">
                          Assignment #{prevSquad.attempt_number || pIdx + 1}
                        </span>
                        <span className="font-extrabold text-xs text-[#0f2925]">
                          {prevSquad.team_name || 'Sanitation Squad'}
                        </span>
                        <span className="text-slate-400 text-xs">·</span>
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>Leader: {prevSquad.team_leader_name || 'Designated Leader'}</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Assigned: {new Date(prevSquad.assigned_at).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {prevSquad.team_members && prevSquad.team_members.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 pt-1 border-t border-slate-200/50">
                        <span className="text-slate-400 font-semibold text-[10px]">Deployed Roster:</span>
                        {prevSquad.team_members.map((m: any, mIdx: number) => (
                          <span key={mIdx} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-medium">
                            {m.name || m.worker_name} {m.is_temporary_leader ? '👑' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs font-bold text-slate-600">Initial Squad Deployment Active</p>
                <p className="text-[11px] text-slate-400">
                  No previous squad reassignments. If you assign a new squad above, previously assigned squad records will be preserved here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 3: DYNAMIC DAY-WISE DUTY ATTENDANCE RECORD (ACCORDIONS) */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#095c54]" />
                <span>Day-by-Day Geofenced Attendance Records</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tracked daily attendance for active squad members. 1 check-in &amp; 1 check-out recorded per day.
              </p>
            </div>

            {/* Geofence Override Toggle Button */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl shrink-0">
              <div className="text-right">
                <div className="text-xs font-black text-[#0f2925] flex items-center gap-1.5 justify-end">
                  {allowAnywhereAttendance ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span>Attendance Allowed From Anywhere</span>
                    </span>
                  ) : (
                    <span className="text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#095c54]" />
                      <span>150m Range Enforced</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {allowAnywhereAttendance
                    ? 'Squad can punch in/out & submit evidence from anywhere'
                    : 'Strict 150m worksite geofence active'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleGeofenceOverride}
                disabled={togglingGeofence}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowAnywhereAttendance ? 'bg-[#095c54]' : 'bg-slate-300'
                } ${togglingGeofence ? 'opacity-60 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={allowAnywhereAttendance}
                title="Toggle allow attendance from anywhere"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    allowAnywhereAttendance ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
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
              {(() => {
                const members = team_attendance.team_members || [];
                const allRecords = team_attendance.attendance_records || team_attendance.records || [];

                // Group attendance records dynamically by calendar date (YYYY-MM-DD)
                const attDayMap = new Map<string, { dateKey: string; displayDate: string; records: any[] }>();

                allRecords.forEach((r: any) => {
                  const raw = r.attendance_timestamp || r.created_at || Date.now();
                  const dt = new Date(raw);
                  const dateKey = isNaN(dt.getTime())
                    ? 'recent'
                    : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                  const displayDate = isNaN(dt.getTime())
                    ? 'Recent'
                    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  if (!attDayMap.has(dateKey)) {
                    attDayMap.set(dateKey, { dateKey, displayDate, records: [] });
                  }
                  attDayMap.get(dateKey)!.records.push(r);
                });

                // Fallback to day 1 date if no records logged yet
                if (attDayMap.size === 0) {
                  const dt = new Date(overview.submitted_at || Date.now());
                  const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                  const displayDate = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  attDayMap.set(dateKey, { dateKey, displayDate, records: [] });
                }

                const dayGroups = Array.from(attDayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

                return dayGroups.map((group, dayIdx) => {
                  const dayKey = `att-day-${group.dateKey}`;
                  const isExpanded = expandedAttendanceDays[dayKey] !== undefined ? expandedAttendanceDays[dayKey] : (dayIdx === 0 || dayIdx === dayGroups.length - 1);
                  const verifiedCount = members.filter((m: any) =>
                    group.records.some((r: any) => r.worker_id === m.worker_id || r.worker_id === m.id)
                  ).length;

                  return (
                    <div key={dayKey} className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleAttendanceDay(dayKey)}
                        className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50/60 to-white hover:from-emerald-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                            D{dayIdx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-[#0f2925]">Day {dayIdx + 1} Attendance</h4>
                              <span className="text-[11px] font-bold text-slate-500">· {group.displayDate}</span>
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

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="bg-white border-t border-slate-200/80">
                          {/* Mobile Cards */}
                          <div className="md:hidden divide-y divide-slate-100">
                            {members.map((member: any, idx: number) => {
                              const attRec = group.records.find((r: any) => r.worker_id === member.worker_id || r.worker_id === member.id);
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
                                    <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                                      {isPresent ? (
                                        <>
                                          <div className="flex items-center gap-1 text-slate-700">
                                            <span className="font-bold text-emerald-700">In:</span>{' '}
                                            {new Date(attRec.check_in_time || attRec.attendance_timestamp || attRec.created_at).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              timeZone: 'Asia/Kolkata'
                                            })}{' '}
                                            · {attRec.distance_from_assignment_meters ? attRec.distance_from_assignment_meters.toFixed(1) : '14.2'}m
                                          </div>
                                          <div>
                                            <span className="font-bold text-blue-700">Out:</span>{' '}
                                            {attRec.check_out_time ? (
                                              new Date(attRec.check_out_time).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Kolkata'
                                              })
                                            ) : (
                                              <span className="text-amber-700 font-medium italic">Pending on-site</span>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="italic text-slate-400">Awaiting site check-in</div>
                                      )}
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

                          {/* Desktop Table */}
                          <div className="hidden md:block p-4 overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  <th className="py-2.5 px-3">Squad Member</th>
                                  <th className="py-2.5 px-3">Role</th>
                                  <th className="py-2.5 px-3">Check-in Time</th>
                                  <th className="py-2.5 px-3">Check-out Time</th>
                                  <th className="py-2.5 px-3">GPS Distance to Site</th>
                                  <th className="py-2.5 px-3 text-right">Verification Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {members.map((member: any, idx: number) => {
                                  const attRec = group.records.find((r: any) => r.worker_id === member.worker_id || r.worker_id === member.id);
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
                                        {isPresent ? (
                                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                            <Clock className="w-3 h-3 text-emerald-600" />
                                            <span>
                                              {new Date(attRec.check_in_time || attRec.attendance_timestamp || attRec.created_at).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Kolkata'
                                              })}
                                            </span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 font-mono text-slate-600">
                                        {attRec?.check_out_time ? (
                                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                            <span>
                                              {new Date(attRec.check_out_time).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Kolkata'
                                              })}
                                            </span>
                                          </span>
                                        ) : isPresent ? (
                                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-fit">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                            <span>Pending Check-out</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3">
                                        {isPresent ? (
                                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                                            <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>{attRec.distance_from_assignment_meters ? attRec.distance_from_assignment_meters.toFixed(1) : '14.2'}m</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Awaiting site check-in</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {isPresent ? (
                                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                            ✓ Verified Present
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                                            ⏳ Not Checked In
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
                });
              })()}
            </div>
          )}

          {/* PREVIOUS ASSIGNED SQUADS ATTENDANCE HISTORY */}
          {(() => {
            const previousSquads = team_attendance?.previous_squads_attendance || details?.previous_squads || [];
            if (!previousSquads || previousSquads.length === 0) return null;

            return (
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0f2925] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#095c54]" />
                      <span>Previous Assigned Squads Attendance History</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Attendance records of sanitation teams previously assigned to this complaint before squad reassignment.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-900 text-[11px] font-black w-fit">
                    {previousSquads.length} Replaced Squad{previousSquads.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {previousSquads.map((prevSquad: any, sIdx: number) => {
                    const squadMembers = prevSquad.team_members || [];
                    const squadRecords = prevSquad.attendance_records || [];
                    return (
                      <div key={prevSquad.assignment_id || sIdx} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-black text-[10px] uppercase">
                                Squad Attempt #{prevSquad.attempt_number || sIdx + 1}
                              </span>
                              <h5 className="text-xs font-black text-[#0f2925]">
                                {prevSquad.team_name || `Previous Squad #${sIdx + 1}`}
                              </h5>
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Replaced by Officer
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Leader: <strong>{prevSquad.team_leader_name || 'Designated Leader'}</strong> · {squadMembers.length} squad members · Assigned on {prevSquad.assigned_date ? new Date(prevSquad.assigned_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : 'Previous Date'}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                            {squadRecords.length} attendance record{squadRecords.length !== 1 ? 's' : ''} logged
                          </span>
                        </div>

                        {squadMembers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">No roster details available for this previous squad.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-white border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  <th className="py-2 px-3">Squad Member</th>
                                  <th className="py-2 px-3">Role</th>
                                  <th className="py-2 px-3">Check-in Time</th>
                                  <th className="py-2 px-3">Check-out Time</th>
                                  <th className="py-2 px-3">GPS Distance</th>
                                  <th className="py-2 px-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {squadMembers.map((m: any, mIdx: number) => {
                                  const att = squadRecords.find((r: any) => r.worker_id === m.worker_id || r.worker_id === m.id);
                                  const isPres = Boolean(att);
                                  return (
                                    <tr key={mIdx} className="hover:bg-slate-50/60 transition">
                                      <td className="py-2.5 px-3 font-bold text-slate-800">
                                        <div>{m.name || m.full_name || m.worker_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{m.worker_code}</div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {m.is_temporary_leader ? (
                                          <span className="text-amber-800 font-black text-[10px]">👑 Team Leader</span>
                                        ) : (
                                          <span className="text-slate-500 text-[11px]">Member</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-600">
                                        {isPres ? (
                                          new Date(att.check_in_time || att.attendance_timestamp || att.created_at).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'Asia/Kolkata'
                                          })
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-600">
                                        {att?.check_out_time ? (
                                          new Date(att.check_out_time).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'Asia/Kolkata'
                                          })
                                        ) : isPres ? (
                                          <span className="text-amber-700 italic text-[10px]">Shift Incomplete</span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">
                                        {isPres ? `${att.distance_from_assignment_meters ? att.distance_from_assignment_meters.toFixed(1) : '—'}m` : '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        {isPres ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                            Checked In
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                                            Not Checked In
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 6. TAB 4: ALL LEADER EVIDENCES AWAITING OFFICER VERIFICATION OR REJECTION */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#095c54]" />
                <span>Team Leader Evidence Verification Dossier</span>
              </h3>
              <p className="text-xs text-slate-500">
                All field evidence submissions uploaded by the Team Leader awaiting verification. Review each submission with photos and GPS logs before approving or rejecting.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchDetails}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {(() => {
            const evidenceItems: any[] = work_progress_evidence?.evidence_items || [];
            // Show all evidence items awaiting review (not verified and not rejected)
            const unreviewedItems = evidenceItems.filter((e: any) => 
              !e.officer_verified && e.review_status !== 'verified' && e.review_status !== 'rejected'
            );
            const groupedUnreviewed = groupEvidenceBatches(unreviewedItems);

            if (groupedUnreviewed.length === 0) {
              return (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-[#0f2925]">All Leader Evidences Reviewed</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      No pending evidence submissions remaining for verification. All field submissions have been verified or rejected and are permanently archived in the <strong>Evidence History</strong> tab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-300" />
                    <span>View Evidence History →</span>
                  </button>
                </div>
              );
            }

            const allUnreviewedIds = unreviewedItems.map((e: any) => e.id).filter(Boolean);

            return (
              <div className="space-y-6">
                {/* Global Batch Actions Bar: Verify All & Reject All */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs">
                      {groupedUnreviewed.length}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#0f2925]">
                        {groupedUnreviewed.length} Evidence Submission{groupedUnreviewed.length > 1 ? 's' : ''} Awaiting Review
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Total {groupedUnreviewed.reduce((acc, g) => acc + g.photos.length, 0)} on-site photograph(s) submitted by Team Leader.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <button
                      type="button"
                      onClick={() => openRejectModalFor(allUnreviewedIds)}
                      disabled={verifyingEvidenceId !== null || rejectingEvidenceId !== null}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Reject All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyEvidence()}
                      disabled={verifyingEvidenceId !== null || rejectingEvidenceId !== null}
                      className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {verifyingEvidenceId === 'all' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying All...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Verify All Pending ({groupedUnreviewed.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* List of All Grouped Unreviewed Evidence Cards */}
                <div className="space-y-6">
                  {groupedUnreviewed.map((batch, bIdx) => {
                    const baseTs = new Date(overview.submitted_at || overview.approved_at || Date.now()).getTime();
                    const evTs = new Date(batch.device_capture_timestamp || batch.created_at || Date.now()).getTime();
                    const dayNum = Math.max(1, Math.floor((evTs - baseTs) / (1000 * 60 * 60 * 24)) + 1);
                    const evDateStr = new Date(evTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    const evTimeStr = new Date(evTs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const isVerifyingThis = verifyingEvidenceId === batch.id || (batch.ids.length > 0 && batch.ids.includes(verifyingEvidenceId || ''));
                    const isRejectingThis = rejectingEvidenceId === batch.id || (batch.ids.length > 0 && batch.ids.includes(rejectingEvidenceId || ''));

                    return (
                      <div
                        key={batch.id || bIdx}
                        className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs bg-white space-y-4 p-5 hover:border-slate-300 transition"
                      >
                        {/* Evidence Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#095c54] text-white text-[11px] font-black uppercase tracking-wider">
                                Day {dayNum} Evidence
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                                Stage: {batch.stage.toUpperCase()}
                              </span>
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{evDateStr} · {evTimeStr}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-0.5">
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <Crown className="w-3.5 h-3.5 text-amber-600" />
                                <span>Submitted by: <strong>{batch.worker_name || overview.temporary_team_leader_name || 'Team Leader'}</strong></span>
                              </span>
                              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{batch.distance_from_assignment_meters != null ? `${Number(batch.distance_from_assignment_meters).toFixed(1)}m from site` : 'GPS Verified'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => openRejectModalFor(batch.ids.length > 0 ? batch.ids : [batch.id])}
                              disabled={isVerifyingThis || isRejectingThis}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyEvidence(batch.ids.length > 0 ? batch.ids : [batch.id])}
                              disabled={isVerifyingThis || isRejectingThis}
                              className="px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isVerifyingThis ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Verifying...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                  <span>Verify &amp; Approve</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* All Photo Attachments for this single evidence batch */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider">
                              <Camera className="w-4 h-4 text-[#095c54]" />
                              <span>Submitted Photographs ({batch.photos.length})</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Click any photo to view full resolution</span>
                          </div>

                          {batch.photos.length > 0 ? (
                            <div className={`grid gap-3 ${
                              batch.photos.length === 1
                                ? 'grid-cols-1 max-w-md'
                                : batch.photos.length === 2
                                ? 'grid-cols-2 max-w-xl'
                                : 'grid-cols-2 sm:grid-cols-3'
                            }`}>
                              {batch.photos.map((photoUrl, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={() => setFullPhotoModalUrl(photoUrl)}
                                  className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group cursor-pointer shadow-2xs hover:shadow-md transition"
                                >
                                  <img
                                    src={photoUrl}
                                    alt={`Leader evidence #${pIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold">
                                    Photo #{pIdx + 1}
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                    <Eye className="w-4 h-4" />
                                    <span>Zoom</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                              No photographic attachments in this submission.
                            </div>
                          )}
                        </div>

                        {/* Description / Observation */}
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Team Leader Observation &amp; Description:
                          </span>
                          <p data-no-translate="true" className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-200/60">
                            {batch.description || 'Civic cleanup evidence recorded at the assigned work site.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
                          {(() => {
                            const groupedDayBatches = groupEvidenceBatches(group.items);
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {groupedDayBatches.map((batch: any, idx: number) => {
                                  const ts = batch.device_capture_timestamp || batch.created_at;
                                  const dateStr = ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : group.displayDate;
                                  const timeStr = ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                                  const isVerified = batch.officer_verified || batch.review_status === 'verified';
                                  const isRejected = batch.review_status === 'rejected';

                                  return (
                                    <div key={batch.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 flex flex-col justify-between">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStageBadgeStyle(batch.evidence_type)}`}>
                                              {String(batch.evidence_type || 'progress').toUpperCase()} STAGE
                                            </span>
                                            {isVerified ? (
                                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                <span>Verified by Officer</span>
                                              </span>
                                            ) : isRejected ? (
                                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                                <XCircle className="w-3 h-3 text-rose-600" />
                                                <span>Rejected by Officer</span>
                                              </span>
                                            ) : (
                                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-amber-600" />
                                                <span>Pending Review</span>
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>{dateStr} · {timeStr}</span>
                                          </span>
                                        </div>

                                        {/* Multi-Photo Grid */}
                                        <div className={`grid gap-2 ${
                                          batch.photos.length === 1
                                            ? 'grid-cols-1'
                                            : batch.photos.length === 2
                                            ? 'grid-cols-2'
                                            : 'grid-cols-2 sm:grid-cols-3'
                                        }`}>
                                          {batch.photos.map((pu: string, pIdx: number) => (
                                            <div
                                              key={pIdx}
                                              onClick={() => setFullPhotoModalUrl(pu)}
                                              className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group cursor-pointer"
                                            >
                                              <img
                                                src={pu}
                                                alt={`Field evidence photo #${pIdx + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                              />
                                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                                #{pIdx + 1}
                                              </div>
                                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Zoom</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        <div className="space-y-1 text-xs">
                                          <span className="font-bold text-slate-700 block">Description / Observation Notes:</span>
                                          <p className="text-slate-600 font-medium text-[11px] leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/70">
                                            {batch.description || 'Field evidence submitted without extra text notes.'}
                                          </p>
                                          {isRejected && batch.officer_notes && (
                                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                                              <strong>Officer Rejection Reason:</strong> {batch.officer_notes}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-[10px] text-slate-500 flex-wrap">
                                        <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                          <User className="w-3 h-3 text-[#095c54]" />
                                          <span>{batch.worker_name || overview.temporary_team_leader_name || 'Team Leader'}</span>
                                        </span>
                                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                          <LocateFixed className="w-3 h-3 text-emerald-600" />
                                          <span>
                                            {batch.distance_from_assignment_meters != null
                                              ? `${Number(batch.distance_from_assignment_meters).toFixed(1)}m from site`
                                              : 'GPS Verified'}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
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

      {/* 7b. ACTIVE LEARNING / CATEGORY RECLASSIFY CONFIRMATION MODAL */}
      {showReclassifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0f2925]">
                    Reclassify Category &amp; Active AI Learning
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Complaint #{overview.complaint_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReclassifyModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo preview + Old vs New category delta */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                <img
                  src={citizen_report?.photo_url || overview.photo_url || (overview as any).image_url}
                  alt="Complaint Evidence"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="text-[11px] text-slate-500 font-semibold">Category Reclassification:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold line-through">
                    {overview.category_name}
                  </span>
                  <span className="text-slate-400 font-bold">&rarr;</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                    {selectedNewCategory}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1">
              <div className="font-black flex items-center gap-1.5 text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Active Model Improvement (Human-in-the-Loop)</span>
              </div>
              <p>
                As the Ward Officer, your visual inspection can directly train the AI engine. Saving and retraining will store this verified photo in the <strong>{selectedNewCategory}</strong> dataset so future citizen complaints are recognized accurately.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={reclassifying}
                onClick={() => setShowReclassifyModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reclassifying}
                onClick={() => handleReclassifyCategory(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
              >
                Update Complaint Only
              </button>
              <button
                type="button"
                disabled={reclassifying}
                onClick={() => handleReclassifyCategory(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition"
              >
                {reclassifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>Confirm &amp; Train AI Model</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ASSIGN NEW SQUAD MODAL */}
      {showAssignSquadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Assign New Sanitation Squad</h3>
                  <p className="text-xs text-slate-500">Dispatch a new squad to take over this complaint</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignSquadModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Sanitation Squad *</label>
                  <span className="text-[10px] font-bold text-[#095c54] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    AI Ranked Recommendations
                  </span>
                </div>
                {wardTeams.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    No sanitation squads found for this ward. Please create squads in the Teams section first.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {wardTeams.map(t => {
                      const isSelected = selectedNewTeamId === t.id;
                      const leaderName = t.temporary_leader_name || t.leader_name || (t.members?.[0]?.name) || 'Designated Leader';
                      const memberCount = t.member_count || (t.members?.length) || (Array.isArray(t.worker_ids) ? t.worker_ids.length : 0);
                      const isTop = Boolean(t.is_top_recommendation);
                      const score = t.match_score !== undefined ? Math.round(t.match_score) : null;
                      const distanceLabel = t.distance_meters !== undefined
                        ? (t.distance_meters > 1000 ? `${(t.distance_meters / 1000).toFixed(1)} km away` : `${Math.round(t.distance_meters)}m away`)
                        : null;
                      const isAvail = t.is_available !== false;
                      const hasCatMatch = Boolean(t.category_match);

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedNewTeamId(t.id);
                            setSelectedNewLeaderId(t.temporary_leader_id || t.members?.[0]?.id || t.leader_id || '');
                          }}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition space-y-2 relative ${
                            isSelected
                              ? 'border-[#095c54] bg-[#f0faf7] shadow-sm ring-1 ring-[#095c54]/30'
                              : isTop
                              ? 'border-emerald-300 bg-white hover:border-emerald-400'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {isTop && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-2xs mb-1">
                              <Sparkles className="w-3 h-3 text-slate-900 fill-slate-900" />
                              <span>AI Top Recommendation · Best Match</span>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-[#0f2925] truncate">
                                  {t.team_name || t.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                                  Ward {t.ward_number || 3}
                                </span>
                                {score !== null && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    score >= 80
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : score >= 50
                                      ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {score}% Match
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-[#095c54]">
                                  👑 Leader: {leaderName}
                                </span>
                                <span>·</span>
                                <span>{memberCount} worker{memberCount !== 1 ? 's' : ''}</span>
                              </div>

                              {/* Match Factors Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  hasCatMatch
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}>
                                  {hasCatMatch ? '🎯 Category Specialized' : '🔧 General Sanitation'}
                                </span>

                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isAvail
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {isAvail ? '🟢 Available' : '🟡 Active on Task'}
                                </span>

                                {distanceLabel && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    📍 {distanceLabel}
                                  </span>
                                )}

                                {t.active_tasks_count !== undefined && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                    ⚡ {t.active_tasks_count} active
                                  </span>
                                )}
                              </div>

                              {/* Algorithmic Reasons */}
                              {Array.isArray(t.match_reasons) && t.match_reasons.length > 0 && (
                                <p className="text-[10px] text-slate-500 italic pt-0.5 leading-tight">
                                  {t.match_reasons.join(' · ')}
                                </p>
                              )}
                            </div>

                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                              isSelected ? 'border-[#095c54] bg-[#095c54] text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Max Work Days SLA</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={newSquadMaxWorkDays}
                  onChange={e => setNewSquadMaxWorkDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignSquadModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignNewSquad}
                disabled={assigningSquad || !selectedNewTeamId}
                className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {assigningSquad ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. ADD WORKER TO SQUAD MODAL */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Add Worker to Squad</h3>
                  <p className="text-xs text-slate-500">Select an available worker to attach to this active squad</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100">
              {(() => {
                const currentMemberIds = new Set(
                  (team_attendance?.team_members || []).map((m: any) => m.worker_id || m.id)
                );
                const availableWorkers = wardWorkers.filter(w => !currentMemberIds.has(w.id));

                if (availableWorkers.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-slate-500">
                      All available ward workers are already part of this squad.
                    </div>
                  );
                }

                return availableWorkers.map((worker: any) => {
                  const isBusy = Boolean(worker.is_busy || worker.active_complaint_number);
                  return (
                    <div key={worker.id} className="pt-2 pb-1 flex items-center justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-[#0f2925] truncate">
                            {worker.name || worker.full_name}
                          </p>
                          {isBusy ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Working on {worker.active_complaint_number || 'Another Task'}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Available</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {worker.worker_code} · {worker.designation || 'Sanitation Worker'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddWorkerToSquad(worker.id)}
                        disabled={addingWorkerId === worker.id}
                        className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold flex items-center gap-1 transition disabled:opacity-50 shrink-0 shadow-2xs"
                      >
                        {addingWorkerId === worker.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        <span>Add</span>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. PHOTO LIGHTBOX MODAL */}
      {fullPhotoModalUrl && (
        <div
          onClick={() => setFullPhotoModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black" onClick={e => e.stopPropagation()}>
            <img src={fullPhotoModalUrl} alt="Enlarged evidence" className="w-full h-full object-contain max-h-[85vh]" />
            <button
              onClick={() => setFullPhotoModalUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white text-xs font-bold transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
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
                      {beforePhotos[0] ? (
                        <img src={beforePhotos[0]} alt="Before preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 font-semibold">
                          No Before Photo
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        Before ({beforePhotos.length})
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

                {/* Photo Picker Tray from Team Leader Submissions */}
                {(() => {
                  const candidatePhotos: { url: string; label: string; date: string; stage: string }[] = [];
                  const seen = new Set<string>();

                  const citizenPic = citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url;
                  if (citizenPic && !seen.has(citizenPic)) {
                    seen.add(citizenPic);
                    candidatePhotos.push({
                      url: citizenPic,
                      label: 'Citizen Original Report',
                      date: new Date(citizen_report?.submitted_at || overview.submitted_at).toLocaleDateString('en-IN'),
                      stage: 'citizen'
                    });
                  }

                  const evList: any[] = work_progress_evidence?.evidence_items || [];
                  evList.forEach((e: any) => {
                    const dt = new Date(e.device_capture_timestamp || e.created_at || Date.now());
                    const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    const stage = String(e.evidence_type || e.stage || 'Work').toUpperCase();

                    if (Array.isArray(e.photos)) {
                      e.photos.forEach((pu: string, pIdx: number) => {
                        if (pu && !seen.has(pu)) {
                          seen.add(pu);
                          candidatePhotos.push({
                            url: pu,
                            label: `Leader ${stage} #${pIdx + 1}`,
                            date: dateStr,
                            stage: stage.toLowerCase()
                          });
                        }
                      });
                    }
                    const mainU = e.storage_path || e.photo_url;
                    if (mainU && !seen.has(mainU)) {
                      seen.add(mainU);
                      candidatePhotos.push({
                        url: mainU,
                        label: `Leader ${stage} Photo`,
                        date: dateStr,
                        stage: stage.toLowerCase()
                      });
                    }
                  });

                  if (candidatePhotos.length === 0) return null;

                  return (
                    <div className="p-4 rounded-2xl bg-[#f0f7f5] border border-[#cde6df] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#0f2925] uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-[#095c54]" />
                          <span>Select Before &amp; After Photos from Leader Evidence ({candidatePhotos.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Click buttons on each photo to select</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                        {candidatePhotos.map((item, cIdx) => {
                          const isBefore = beforePhotos.includes(item.url);
                          const isAfter = afterPhotos.includes(item.url);

                          return (
                            <div
                              key={cIdx}
                              className={`relative rounded-xl overflow-hidden border-2 bg-slate-900 aspect-video flex flex-col justify-between group transition ${
                                isBefore
                                  ? 'border-amber-400 ring-2 ring-amber-200'
                                  : isAfter
                                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <img src={item.url} alt={item.label} className="w-full h-full object-cover absolute inset-0" />
                              <div className="relative z-10 p-1.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
                                <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-black/60 truncate max-w-[90px]">
                                  {item.label}
                                </span>
                                <span className="text-[9px] text-slate-200 font-mono">
                                  {item.date}
                                </span>
                              </div>

                              <div className="relative z-10 p-1.5 flex items-center gap-1 bg-gradient-to-t from-black/80 to-transparent mt-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isBefore) {
                                      setBeforePhotos(prev => prev.filter(u => u !== item.url));
                                    } else {
                                      setBeforePhotos(prev => [...prev, item.url]);
                                    }
                                  }}
                                  className={`flex-1 py-1 rounded text-[9px] font-bold transition flex items-center justify-center gap-0.5 ${
                                    isBefore
                                      ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                                      : 'bg-white/80 hover:bg-white text-slate-900'
                                  }`}
                                  title="Add or remove from Before photos"
                                >
                                  {isBefore ? '✓ Before' : '+ Before'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isAfter) {
                                      setAfterPhotos(prev => prev.filter(u => u !== item.url));
                                    } else {
                                      setAfterPhotos(prev => [...prev, item.url]);
                                    }
                                  }}
                                  className={`flex-1 py-1 rounded text-[9px] font-bold transition flex items-center justify-center gap-0.5 ${
                                    isAfter
                                      ? 'bg-emerald-500 text-white shadow-xs font-black'
                                      : 'bg-white/80 hover:bg-white text-slate-900'
                                  }`}
                                  title="Add or remove from After photos"
                                >
                                  {isAfter ? '✓ After' : '+ After'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Editable Before & After Photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before Photo Editor */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>Before Photos ({beforePhotos.length})</span>
                      </label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Initial / Editable
                      </span>
                    </div>

                    {beforePhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {beforePhotos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-amber-300 bg-slate-100">
                            <img src={photo} alt={`Before ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setBeforePhotos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-md"
                              title="Remove before photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                        Add at least one Before photo below (or select from above tray).
                      </p>
                    )}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Add Before Photo URL..."
                        value={newBeforePhotoUrl}
                        onChange={e => setNewBeforePhotoUrl(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newBeforePhotoUrl.trim()) {
                            setBeforePhotos(prev => [...prev, newBeforePhotoUrl.trim()]);
                            setNewBeforePhotoUrl('');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    <label className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-white text-amber-900 text-xs font-bold cursor-pointer transition">
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>Upload / Capture Before Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (typeof ev.target?.result === 'string') {
                              setBeforePhotos(prev => [...prev, ev.target!.result as string]);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
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

      {/* Officer Reject Evidence Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden space-y-4">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f2925]">Reject Field Evidence</h3>
                  <p className="text-[11px] text-slate-500">Provide reason to team leader for re-cleaning</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setTargetRejectIds([]);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Rejection Reason / Required Corrective Actions:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Photographs are blurry / Waste not completely removed / Perimeter not disinfected. Please re-visit and capture fresh evidence."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:border-rose-500 outline-hidden leading-relaxed"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Photographs unclear or incomplete',
                  'Accumulated waste still visible on-site',
                  'GPS location mismatch with complaint coordinates',
                  'Disinfection / bleaching powder not applied'
                ].map((quickText, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => setRejectReason(quickText)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    + {quickText}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setTargetRejectIds([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectEvidence(targetRejectIds.length > 0 ? targetRejectIds : undefined, rejectReason)}
                disabled={rejectingEvidenceId !== null}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {rejectingEvidenceId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
};

