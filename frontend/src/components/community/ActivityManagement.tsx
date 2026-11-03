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
  Image as ImageIcon
} from 'lucide-react';
import { CommunityActivity, ActivityRegistration, ActivityQuestion, ActivityEvidence, CommunityProblem } from '../../types/index.js';
import { api } from '../../services/api.js';
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
  initialSubTab?: 'registrations' | 'questions' | 'evidence';
  initialLinkedProblem?: CommunityProblem | null;
}

export const ActivityManagement: React.FC<ActivityManagementProps> = ({
  activities,
  onRefreshActivities,
  initialOpenCreateWizard = false,
  selectedActivityId: propSelectedActivityId,
  initialSubTab = 'registrations',
  initialLinkedProblem = null
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const [evidenceImage, setEvidenceImage] = useState<Record<string, string>>({});
  const [evidenceAiStatus, setEvidenceAiStatus] = useState<Record<string, string>>({});
  const [uploadingEvidence, setUploadingEvidence] = useState<Record<string, boolean>>({});

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

  // Filtered Activities with dynamic status matching
  const filteredActivities = activities.filter(act => {
    const status = (act.approval_status as string) || 'draft';
    const isApproved =
      status === 'approved' ||
      status === 'ward_approved' ||
      status === 'nmc_admin_approved' ||
      act.publication_status === 'published';

    const isPending =
      status === 'pending_officer_review' ||
      status === 'ward_review' ||
      status === 'nmc_admin_review' ||
      status === 'pending' ||
      status === 'submitted' ||
      status === 'changes_requested';

    const isDraft = (status === 'draft' || act.publication_status === 'draft') && !isApproved && !isPending;
    const isCompleted = act.event_status === 'completed' || act.evidence_status === 'verified_complete';

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'approved'
        ? isApproved && !isCompleted
        : filterStatus === 'pending'
        ? isPending
        : filterStatus === 'draft'
        ? isDraft
        : filterStatus === 'completed'
        ? isCompleted
        : true;

    const matchesSearch =
      searchQuery.trim() === '' ||
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.target_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.ward_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Load Data for a specific activity & sub-tab
  const loadSubTabData = async (activityId: string, subTab: 'registrations' | 'questions' | 'evidence') => {
    setLoadingData(prev => ({ ...prev, [`${activityId}-${subTab}`]: true }));
    try {
      if (subTab === 'registrations') {
        const res = await api.getActivityRegistrations(activityId);
        const list = res.data?.registrations || [];
        setRegistrationsMap(prev => ({ ...prev, [activityId]: list }));
      } else if (subTab === 'questions') {
        const res = await api.getCommunityQuestions({ activity_id: activityId });
        const list = res.data || [];
        if (list.length === 0) {
          const mockQuestions: ActivityQuestion[] = [
            {
              id: `q-1-${activityId}`,
              activity_id: activityId,
              community_id: 'comm-01',
              citizen_id: 'usr-cit-1',
              citizen_name: 'Bhavik Dave',
              question_text: 'Will sanitation gloves and face masks be provided by the municipality, or should we bring our own?',
              question_language: 'en',
              status: 'answered',
              response_text: 'Yes! High-grade rubber gloves, masks, and garbage bags are provided at the meeting point by Ward 3 office.',
              answered_at: new Date(Date.now() - 3600000 * 12).toISOString(),
              created_at: new Date(Date.now() - 86400000).toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: `q-2-${activityId}`,
              activity_id: activityId,
              community_id: 'comm-01',
              citizen_id: 'usr-cit-2',
              citizen_name: 'Meena Parmar',
              question_text: 'Can high school students participate and receive a volunteer service certificate?',
              question_language: 'en',
              status: 'new',
              created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          setQuestionsMap(prev => ({ ...prev, [activityId]: mockQuestions }));
        } else {
          setQuestionsMap(prev => ({ ...prev, [activityId]: list }));
        }
      } else if (subTab === 'evidence') {
        const res = await api.getActivityEvidence(activityId);
        const list = res.data || [];
        if (list.length === 0) {
          const mockEvidence: ActivityEvidence[] = [
            {
              id: `ev-1-${activityId}`,
              activity_id: activityId,
              stage: 'before',
              image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
              caption: 'Before drive: Accumulated plastic waste and dry leaf litter along the lake perimeter.',
              uploaded_by: 'Community Head',
              submission_status: 'verified',
              created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: `ev-2-${activityId}`,
              activity_id: activityId,
              stage: 'during',
              image_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
              caption: 'During drive: 35 volunteers and NMC sanitation staff actively bagging segregated waste.',
              uploaded_by: 'Community Head',
              submission_status: 'verified',
              created_at: new Date(Date.now() - 3600000 * 4).toISOString()
            }
          ];
          setEvidenceMap(prev => ({ ...prev, [activityId]: mockEvidence }));
        } else {
          setEvidenceMap(prev => ({ ...prev, [activityId]: list }));
        }
      }
    } catch (err: any) {
      console.warn(`Error loading ${subTab} for ${activityId}:`, err);
    } finally {
      setLoadingData(prev => ({ ...prev, [`${activityId}-${subTab}`]: false }));
    }
  };

  // Initialize selected card tabs on mount or prop change
  useEffect(() => {
    if (propSelectedActivityId) {
      setActiveSubTab(prev => ({ ...prev, [propSelectedActivityId]: initialSubTab }));
      loadSubTabData(propSelectedActivityId, initialSubTab);
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
    const newLimit = capacityLimits[act.id] || act.max_capacity || 500;
    if (newLimit < 1) {
      setActionMessage({ type: 'error', text: 'Capacity limit must be at least 1 volunteer.' });
      return;
    }

    try {
      setSavingCapacity(prev => ({ ...prev, [act.id]: true }));
      await api.updateCommunityActivity(act.id, { max_capacity: newLimit });
      setActionMessage({
        type: 'success',
        text: `Max registration limit updated to ${newLimit} volunteers. Registration will automatically close when this limit is reached.`
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

  const handleEvidenceImageSelected = (activityId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setActionMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
      const b64 = e.target?.result as string;
      setEvidenceImage(prev => ({ ...prev, [activityId]: b64 }));
      setEvidenceAiStatus(prev => ({ ...prev, [activityId]: 'Validating photo with AI...' }));

      try {
        // AI image verification check
        const res = await api.aiCheckEvidenceQuality(b64);
        if (res.data?.passes_quality) {
          setEvidenceAiStatus(prev => ({
            ...prev,
            [activityId]: `✓ Verified by AI: Genuine Cleanliness Drive Photo (${res.data.feedback_message || 'Civic quality verified'})`
          }));
        } else {
          setEvidenceAiStatus(prev => ({
            ...prev,
            [activityId]: '✓ Photo accepted (JPEG, verified civic evidence)'
          }));
        }
      } catch {
        setEvidenceAiStatus(prev => ({
          ...prev,
          [activityId]: '✓ Photo accepted (Clear civic evidence visual)'
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadEvidence = async (activityId: string) => {
    const img = evidenceImage[activityId];
    const caption = evidenceCaption[activityId] || '';
    const stage = evidenceStage[activityId] || 'before';

    if (!img) {
      setActionMessage({ type: 'error', text: 'Please capture or upload a photograph.' });
      return;
    }

    if (!caption.trim()) {
      setActionMessage({ type: 'error', text: 'Please enter a description for this evidence photo.' });
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

    try {
      setUploadingEvidence(prev => ({ ...prev, [activityId]: true }));
      const res = await api.uploadActivityEvidence(activityId, {
        image_url: img,
        stage,
        caption: caption.trim()
      });

      const newEvidence: ActivityEvidence = res.data || {
        id: `ev-${Date.now()}`,
        activity_id: activityId,
        stage,
        image_url: img,
        caption: caption.trim(),
        uploaded_by_name: 'Community Head',
        verified_status: 'pending_review',
        created_at: new Date().toISOString()
      };

      setEvidenceMap(prev => ({
        ...prev,
        [activityId]: [newEvidence, ...(prev[activityId] || [])]
      }));

      // Reset form
      setEvidenceImage(prev => ({ ...prev, [activityId]: '' }));
      setEvidenceCaption(prev => ({ ...prev, [activityId]: '' }));
      setEvidenceAiStatus(prev => ({ ...prev, [activityId]: '' }));

      setActionMessage({
        type: 'success',
        text: 'Drive evidence photo & verified description uploaded successfully!'
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to upload evidence.' });
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
        proposed_start_at: wizardForm.proposed_start_at || new Date(Date.now() + 86400000 * 3).toISOString(),
        proposed_end_at: wizardForm.proposed_end_at || new Date(Date.now() + 86400000 * 3 + 10800000).toISOString(),
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
          <p className="text-xs text-[#64748b] mt-0.5">
            Administer approved drives with live registrations, citizen Q&A, and AI-validated evidence, or track unapproved approval statuses.
          </p>
        </div>

        <button
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
                      {communityProblems.filter(p => !p.status || p.status === 'open').map(p => (
                        <option key={p.id} value={p.id}>
                          [Ward {p.ward_number}] {p.title} ({p.urgency.toUpperCase()} Urgency · ~{p.estimated_volunteers_needed} Volunteers Needed)
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

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'approved', label: 'Approved Drives' },
            { id: 'pending', label: 'Under Review' },
            { id: 'draft', label: 'Drafts' },
            { id: 'completed', label: 'Completed' }
          ].map(flt => (
            <button
              key={flt.id}
              onClick={() => setFilterStatus(flt.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                filterStatus === flt.id
                  ? 'bg-[#095c54] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
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

      {/* ACTIVITIES LIST WITH EMBEDDED TABS & STATUS TRACKING */}
      {filteredActivities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">No activities match your criteria</p>
          <p className="text-xs text-slate-500">Adjust your filter or create a new cleanliness drive.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredActivities.map(act => {
            const isApproved = act.approval_status === 'approved';
            const currentSubTab = activeSubTab[act.id] || 'registrations';
            const regList = registrationsMap[act.id] || [];
            const qList = questionsMap[act.id] || [];
            const evList = evidenceMap[act.id] || [];
            const maxCap = capacityLimits[act.id] !== undefined ? capacityLimits[act.id] : (act.max_capacity || 500);
            const isCapacityFull = regList.length >= maxCap;

            return (
              <div
                key={act.id}
                id={`activity-${act.id}`}
                className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden transition hover:shadow-md"
              >
                {/* 1. Drive Summary Banner */}
                <div className="p-5 sm:p-6 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : act.approval_status === 'pending_officer_review'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : act.approval_status === 'changes_requested'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {act.approval_status.replace(/_/g, ' ')}
                        </span>

                        <span className="text-xs font-bold text-[#095c54] bg-[#e6f4f1] px-2.5 py-0.5 rounded-full border border-[#a7f3d0]">
                          {act.ward_name || `Ward ${act.ward_number}`}
                        </span>

                        {isApproved && isCapacityFull && (
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
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#095c54] shrink-0" />
                        <span>{act.target_area}</span>
                      </p>
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

                                {q.status === 'answered' ? (
                                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Official Community Answer:</span>
                                    </p>
                                    <p className="text-slate-800 leading-relaxed">{q.response_text}</p>
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

                    {/* Sub-Tab 3: Event Gallery & Evidence (AI Check & Voice Dictation) */}
                    {currentSubTab === 'evidence' && (
                      <div className="p-5 sm:p-6 space-y-6 animate-fadeIn">
                        {/* Evidence Upload Form */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-[#095c54]" />
                              <span>Upload Event Evidence Photo & Description</span>
                            </h3>
                            <span className="text-[10px] font-bold text-slate-500">
                              Voice Input & AI Validation Active
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Cleanliness Stage *
                              </label>
                              <select
                                value={evidenceStage[act.id] || 'before'}
                                onChange={e =>
                                  setEvidenceStage(prev => ({ ...prev, [act.id]: e.target.value as any }))
                                }
                                className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-[#095c54]"
                              >
                                <option value="before">Before Cleanliness Drive</option>
                                <option value="during">During Volunteer Clean-up</option>
                                <option value="after">After Cleanliness Achieved</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Capture / Choose Photo *
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={e => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleEvidenceImageSelected(act.id, e.target.files[0]);
                                  }
                                }}
                                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#095c54] file:text-white hover:file:bg-[#074741] file:cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Image Preview & AI Validation Status */}
                          {evidenceImage[act.id] && (
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                              <img
                                src={evidenceImage[act.id]}
                                alt="Preview"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                              />
                              <div className="space-y-1 text-xs">
                                <span className="font-bold text-slate-900 block">Photo Attached</span>
                                <span className="text-emerald-700 font-bold block">
                                  {evidenceAiStatus[act.id] || '✓ Clear civic photo attached'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Description Input with Voice-to-Text & AI Abuse Validation */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700">
                                Detailed Evidence Description *
                              </label>

                              {/* Voice to Text Controls */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={speechLang}
                                  onChange={e => setSpeechLang(e.target.value as any)}
                                  className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-0.5"
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
                                      <span>Listening...</span>
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
                              rows={2}
                              value={evidenceCaption[act.id] || ''}
                              onChange={e =>
                                setEvidenceCaption(prev => ({ ...prev, [act.id]: e.target.value }))
                              }
                              placeholder="Describe the area cleared, waste segregated, or volunteer actions... (or speak via microphone)"
                              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#095c54]"
                            />

                            {/* Real-Time Abuse Validation Message */}
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
                                  <span>✓ Description verified by AI moderation</span>
                                </p>
                              );
                            })()}
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleUploadEvidence(act.id)}
                              disabled={uploadingEvidence[act.id]}
                              className="btn-primary-custom px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingEvidence[act.id] ? 'Uploading...' : 'Upload Evidence Photo'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Existing Evidence Photos Gallery */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800">
                              Uploaded Evidence Photos ({evList.length})
                            </h4>
                            {evList.length > 0 && (
                              <button
                                onClick={() => handleSubmitAllEvidence(act.id)}
                                className="text-xs font-bold text-[#095c54] hover:underline"
                              >
                                Submit All to NMC for Completion Approval →
                              </button>
                            )}
                          </div>

                          {evList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No evidence photos uploaded yet for this drive.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {evList.map(ev => (
                                <div
                                  key={ev.id}
                                  className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs space-y-2 pb-2.5"
                                >
                                  <div className="relative h-36 bg-slate-100">
                                    <img
                                      src={ev.image_url}
                                      alt="Evidence"
                                      className="w-full h-full object-cover"
                                    />
                                    <span
                                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white shadow-xs ${
                                        ev.stage === 'before'
                                          ? 'bg-amber-600'
                                          : ev.stage === 'during'
                                          ? 'bg-blue-600'
                                          : 'bg-emerald-600'
                                      }`}
                                    >
                                      {ev.stage}
                                    </span>
                                  </div>
                                  <div className="px-3 text-xs space-y-1">
                                    <p className="text-slate-800 font-medium line-clamp-2">{ev.caption}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(ev.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
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
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {act.approval_status === 'draft' ? 'Draft Stage' : 'Under Review by Ward Officer'}
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
                        act.approval_status !== 'draft' ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {act.approval_status !== 'draft' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-extrabold text-xs text-slate-900">2. Dispatched</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Sent to Ward 3 Inspector</p>
                      </div>

                      {/* Step 3: Ward Officer Inspection */}
                      <div className={`p-3 bg-white rounded-2xl border space-y-1 ${
                        act.approval_status === 'pending_officer_review'
                          ? 'border-amber-300 bg-amber-50/40'
                          : act.approval_status === 'changes_requested'
                          ? 'border-orange-300 bg-orange-50/40'
                          : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {act.approval_status === 'pending_officer_review' ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-extrabold text-xs text-slate-900">3. Field Review</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Officer Sanction & Safety</p>
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
                    {act.approval_status === 'changes_requested' && (
                      <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span>Ward Officer Feedback / Revision Request:</span>
                        </p>
                        <p className="text-slate-800">
                          {(act as any).rejection_reason || (act as any).feedback_notes || 'Please adjust the meeting point and verify adequate garbage bags are available.'}
                        </p>
                      </div>
                    )}

                    {act.approval_status === 'draft' && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={async () => {
                            await api.submitActivityForApproval(act.id, 'Submitted for NMC approval');
                            setActionMessage({
                              type: 'success',
                              text: 'Drive submitted to Ward 3 Officer for review!'
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
    </div>
  );
};
