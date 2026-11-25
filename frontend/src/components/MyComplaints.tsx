import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Star,
  Search,
  ChevronRight,
  ShieldCheck,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  MapPin,
  Building2,
  Calendar,
  Sparkles,
  Layers,
  Send,
  Eye,
  Camera,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { Complaint, ComplaintStatus } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';
import { StatusProgressionStepper } from './common/StatusProgressionStepper.js';

interface MyComplaintsProps {
  onOpenReport: () => void;
  lang: Language;
}

export const MyComplaints: React.FC<MyComplaintsProps> = ({ onOpenReport, lang }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Reopen Modal
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Feedback Modal
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const t = translations[lang];

  const handleSelectComplaint = async (c: Complaint) => {
    setSelectedComplaint(c);
    try {
      const detailRes = await api.getComplaintById(c.id);
      if (detailRes?.data) {
        setSelectedComplaint(detailRes.data);
      }
    } catch {
      // keep list version if detail fetch fails
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getMyComplaints({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined
      });
      setComplaints(res.data || []);
      if (selectedComplaint) {
        const detailRes = await api.getComplaintById(selectedComplaint.id).catch(() => null);
        if (detailRes?.data) {
          setSelectedComplaint(detailRes.data);
        } else {
          const updated = (res.data || []).find((c: Complaint) => c.id === selectedComplaint.id);
          if (updated) setSelectedComplaint(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [selectedStatus, searchQuery]);

  const handleReopen = async (complaintId: string) => {
    if (!reopenReason.trim()) {
      alert('Please state a specific reason for reopening this complaint.');
      return;
    }
    try {
      const res = await api.reopenComplaint(complaintId, reopenReason.trim());
      if (res.data) {
        setSelectedComplaint(res.data);
        setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, ...res.data } : c));
      }
      setIsReopening(false);
      setReopenReason('');
      setActionSuccess('Issue reopened and escalated to the senior ward officer for re-inspection.');
      await fetchComplaints();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reopen complaint');
    }
  };

  const handleFeedback = async (complaintId: string) => {
    try {
      const res = await api.submitFeedback(complaintId, feedbackRating, feedbackText, feedbackRating >= 3);
      setIsSubmittingFeedback(false);
      setActionSuccess('Thank you! Your feedback helps evaluate municipal sanitation quality.');
      confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
      await fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint(prev =>
          prev
            ? {
                ...prev,
                feedback: res.data || {
                  id: 'fb-new',
                  complaint_id: complaintId,
                  citizen_id: 'me',
                  rating: feedbackRating,
                  feedback_text: feedbackText,
                  resolution_satisfactory: feedbackRating >= 3,
                  created_at: new Date().toISOString()
                }
              }
            : null
        );
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit feedback');
    }
  };

  const handleDelete = async (complaintId: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint record from the database?')) return;
    try {
      await api.deleteComplaint(complaintId);
      setSelectedComplaint(null);
      setComplaints(prev => prev.filter(c => c.id !== complaintId));
      setActionSuccess('Complaint record permanently deleted from database.');
      await fetchComplaints();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete complaint');
    }
  };

  const tabs: { id: string; label: string }[] = [
    { id: 'all', label: t.tab_all },
    { id: 'submitted', label: t.tab_submitted },
    { id: 'under_review', label: t.tab_under_review },
    { id: 'assigned', label: t.tab_assigned },
    { id: 'in_progress', label: t.tab_in_progress },
    { id: 'awaiting_verification', label: t.tab_awaiting_verification },
    { id: 'resolved', label: t.tab_resolved },
    { id: 'reopened', label: t.tab_reopened }
  ];

  const getStatusBadge = (status: ComplaintStatus) => {
    const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      submitted: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800', dot: 'bg-teal-600', label: t.tab_submitted },
      under_review: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500', label: t.tab_under_review },
      assigned: { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', dot: 'bg-sky-500', label: t.tab_assigned },
      in_progress: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', dot: 'bg-blue-600 animate-pulse', label: t.tab_in_progress },
      awaiting_verification: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', dot: 'bg-purple-600 animate-pulse', label: t.tab_awaiting_verification },
      resolved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500', label: t.tab_resolved },
      verified_complete: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500', label: t.tab_resolved },
      closed: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500', label: t.tab_resolved },
      rejected: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-500', label: t.tab_rejected },
      reopened: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500 animate-pulse', label: t.tab_reopened }
    };

    const c = config[status] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400', label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <span>{c.label}</span>
      </span>
    );
  };

  // =========================================================================
  // FULL PAGE VIEW: COMPLAINT DETAILS & RESOLUTION TIMELINE
  // =========================================================================
  if (selectedComplaint) {
    const isResolved =
      selectedComplaint.status === 'resolved' ||
      (selectedComplaint.status as string) === 'verified_complete' ||
      (selectedComplaint.status as string) === 'closed';

    return (
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* Navigation Breadcrumb Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedComplaint(null);
                setActionSuccess('');
                setActionError('');
              }}
              className="flex items-center gap-2 text-xs font-black text-[#095c54] bg-[#e6f4f1] hover:bg-[#d0ece6] transition py-2 px-3.5 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Complaints</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {selectedComplaint.complaint_number}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ward {selectedComplaint.location.ward_number}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-[#0f2925] mt-1">
                {selectedComplaint.category_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSelectComplaint(selectedComplaint)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Refresh live status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {getStatusBadge(selectedComplaint.status)}
          </div>
        </div>

        {/* Global Feedback Messages */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-800 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-800 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Visual Comparison / Photo Showcase */}
        {isResolved ? (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925]">
                    Resolution Visual Verification (Before vs After)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Municipal inspection proof confirming waste clearing and site restoration
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                100% Resolved & Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Before Photo */}
              <div className="space-y-2">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border-2 border-rose-200 bg-rose-50 shadow-xs group">
                  <img
                    src={selectedComplaint.image_url}
                    alt="Citizen Reported (Before)"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                    <span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-black shadow-sm">
                      Before Cleanup (Reported)
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600 flex items-center justify-between px-1">
                  <span>Reported by You</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(selectedComplaint.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* After Photo */}
              <div className="space-y-2">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border-2 border-emerald-300 bg-emerald-50 shadow-xs group">
                  <img
                    src={
                      selectedComplaint.resolved_image_url ||
                      (selectedComplaint as any).resolution_image_url ||
                      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'
                    }
                    alt="Municipal Resolution (After)"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                    <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-sm flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      After Cleanup (Verified)
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600 flex items-center justify-between px-1">
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified by Ward Officer
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {selectedComplaint.resolved_at ? new Date(selectedComplaint.resolved_at).toLocaleDateString() : 'Completed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-[#0f2925]">
                Citizen Reported Photo Evidence
              </h3>
              {getStatusBadge(selectedComplaint.status)}
            </div>

            <div className="relative aspect-[21/9] sm:aspect-[24/8] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={selectedComplaint.image_url}
                alt={selectedComplaint.category_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                <div className="text-white">
                  <span className="text-xs font-black uppercase tracking-wider block text-teal-300">
                    AI Classified Category: {selectedComplaint.category_name}
                  </span>
                  <p className="text-xs text-white/90 line-clamp-1">{selectedComplaint.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Municipal Status Progression Stepper */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#0f2925]">
                Live Municipal Status Progression
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking as your complaint moves through municipal evaluation, crew dispatch, and completion.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              Step-by-Step Transparency
            </span>
          </div>

          <div className="pt-2">
            <StatusProgressionStepper
              status={selectedComplaint.status}
              rejectionReason={(selectedComplaint as any).rejection_reason}
            />
          </div>
        </div>

        {/* Complaint Dossier & Privacy Shield */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Location & Time Information */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#095c54] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#095c54]" />
              <span>Location & Ward Details</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Incident Address</span>
                <p className="font-extrabold text-slate-800">{selectedComplaint.location.address}</p>
                {selectedComplaint.location.landmark && (
                  <p className="text-slate-500 text-[11px]">Landmark: {selectedComplaint.location.landmark}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Ward Division</span>
                  <p className="font-bold text-slate-800">Ward {selectedComplaint.location.ward_number}</p>
                  <p className="text-[10px] text-slate-500 truncate">{selectedComplaint.location.ward_name}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Priority Level</span>
                  <p className="font-bold text-slate-800 capitalize">{selectedComplaint.priority || 'Medium'}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">AI Assessed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Citizen Anonymity Protection */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#095c54] flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4 text-[#095c54]" />
                <span>Issue Description</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Strict Anonymity Protection Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="font-black flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Identity Protection Active</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Your personal contact details and name are strictly confidential and protected by municipal privacy policy. Ward Officers and sanitation squads only see your issue location and photos.
              </p>
            </div>
          </div>
        </div>

        {/* Activity Logs & Sanitation Audit Trail */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#095c54] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Official Sanitation Action Audit Trail</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {selectedComplaint.activity_logs?.length || 0} Events Recorded
            </span>
          </div>

          {selectedComplaint.activity_logs && selectedComplaint.activity_logs.length > 0 ? (
            <div className="space-y-3">
              {selectedComplaint.activity_logs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-start gap-3 hover:bg-slate-100/60 transition"
                >
                  <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#095c54] text-xs">
                        {log.action || (log as any).status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {log.description || (log as any).note}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      Actor: {log.actor_name} {log.actor_role ? `(${log.actor_role})` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No activity log entries recorded yet.</p>
          )}
        </div>

        {/* Feedback Section for Resolved Complaints */}
        {isResolved && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-4">
            {selectedComplaint.feedback && !isSubmittingFeedback ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Your Citizen Satisfaction Review</span>
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    Feedback Recorded
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= selectedComplaint.feedback!.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-black text-emerald-900 ml-2">
                      {selectedComplaint.feedback.rating}/5 Stars
                    </span>
                  </div>
                  {selectedComplaint.feedback.feedback_text && (
                    <p className="text-xs text-emerald-950 font-medium italic">
                      "{selectedComplaint.feedback.feedback_text}"
                    </p>
                  )}
                  <span className="text-[10px] text-emerald-700 block">
                    Submitted on {new Date(selectedComplaint.feedback.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-[#0f2925]">
                      Rate Municipal Cleanup Quality
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      How satisfied are you with the speed, cleanliness, and hygiene of this resolution?
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="p-1 hover:scale-110 transition"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= feedbackRating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Write a quick comment for the municipal sanitation team..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 outline-none focus:border-[#095c54]"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isSubmittingFeedback}
                      onClick={() => handleFeedback(selectedComplaint.id)}
                      className="px-5 py-2.5 rounded-xl bg-[#095c54] text-white text-xs font-bold hover:bg-[#074741] transition disabled:opacity-50"
                    >
                      {isSubmittingFeedback ? 'Submitting...' : 'Submit Satisfaction Rating'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar (Reopen or Delete) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(isResolved || selectedComplaint.status === 'rejected') && (
              <button
                type="button"
                onClick={() => setIsReopening(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Reopen This Complaint</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleDelete(selectedComplaint.id)}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition ml-auto"
            title="Delete this complaint from database"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete Complaint Record</span>
          </button>
        </div>

        {/* Reopen Modal Sheet */}
        {isReopening && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeInBackdrop">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-[#0f2925] border-b border-slate-100 pb-3">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black">Reopen Complaint #{selectedComplaint.complaint_number}</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                If the cleanliness issue has recurred or the resolution was unsatisfactory, explain the situation below. This will escalate directly to the Senior Ward Officer.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason for Reopening *</label>
                <textarea
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="e.g. Garbage was cleared from the road, but the corner drain is still choked with plastic bags..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReopening(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!reopenReason.trim()}
                  onClick={() => handleReopen(selectedComplaint.id)}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-50"
                >
                  Confirm & Reopen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN COMPLAINTS OVERVIEW (BEAUTIFUL GRID VIEW)
  // =========================================================================
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Title & Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#10b981]" />
            <span>{t.nav_complaints}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchComplaints}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0"
            title="Refresh complaints"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenReport}
            className="btn-primary-custom px-5 py-2.5 text-xs font-black shadow-md shadow-[#095c54]/20 touch-press flex-1 sm:flex-none justify-center flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>{t.action_report}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Complaint ID (NMC-2026-XXXXX), locality, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-[#095c54] outline-none bg-slate-50 focus:bg-white transition"
          />
        </div>

        {/* Scrollable Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition touch-press ${
                selectedStatus === tab.id
                  ? 'bg-[#095c54] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-[#095c54]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-800 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Complaints Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-slate-500">
          {t.loading}
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#095c54] flex items-center justify-center mx-auto border border-emerald-100">
            <ClipboardList className="w-8 h-8 text-[#095c54]" />
          </div>
          <h4 className="font-extrabold text-base text-[#0f2925]">{t.empty}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't logged any complaints under this filter. Tap below to report a civic sanitation issue in your ward.
          </p>
          <button onClick={onOpenReport} className="btn-primary-custom px-5 py-2.5 text-xs font-bold touch-press mt-2">
            {t.action_report}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complaints.map(c => (
            <div
              key={c.id}
              onClick={() => handleSelectComplaint(c)}
              className="rounded-3xl border border-slate-200/90 bg-white shadow-xs hover:shadow-lg hover:border-[#095c54]/50 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Photo Header & Status Badges */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={c.image_url}
                    alt={c.category_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-black shadow-sm">
                      {c.complaint_number}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(c.status)}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#095c54] text-white text-[10px] font-bold">
                      Ward {c.location.ward_number}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#095c54]">
                      {c.category_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(c.submitted_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-semibold line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                    <span className="truncate">{c.location.address}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer with Clear Action Button */}
              <div className="p-4 sm:p-5 pt-0">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSelectComplaint(c);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-[#e6f4f1] text-[#095c54] border border-slate-200 group-hover:border-[#095c54]/30 text-xs font-black transition flex items-center justify-center gap-1.5"
                >
                  <span>{t.view_details}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
