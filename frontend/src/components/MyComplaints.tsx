import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Star,
  MessageSquare,
  Search,
  Filter,
  Eye,
  ChevronRight,
  ShieldAlert,
  Trash2,
  ArrowRight,
  ClipboardList,
  MapPin,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { Complaint, ComplaintStatus } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

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

  const t = translations[lang];

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getMyComplaints({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined
      });
      setComplaints(res.data);
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
    if (!reopenReason.trim()) return;
    try {
      const res = await api.reopenComplaint(complaintId, reopenReason);
      setSelectedComplaint(res.data);
      setIsReopening(false);
      setReopenReason('');
      setActionSuccess('Issue reopened and escalated to the senior ward officer.');
      fetchComplaints();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFeedback = async (complaintId: string) => {
    try {
      const res = await api.submitFeedback(complaintId, feedbackRating, feedbackText, feedbackRating >= 3);
      setIsSubmittingFeedback(false);
      setActionSuccess('Thank you! Your feedback helps evaluate municipal sanitation quality.');
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint(prev => prev ? {
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
        } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    }
  };

  const handleDelete = async (complaintId: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint record from the database?')) return;
    try {
      await api.deleteComplaint(complaintId);
      setSelectedComplaint(null);
      setActionSuccess('Complaint record permanently deleted from database.');
      fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to delete complaint');
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
    const config: Record<string, { bg: string; text: string; label: string }> = {
      submitted: { bg: 'bg-[#e6f4f1]', text: 'text-[#095c54]', label: t.tab_submitted },
      under_review: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]', label: t.tab_under_review },
      assigned: { bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]', label: t.tab_assigned },
      in_progress: { bg: 'bg-[#f0f6f4]', text: 'text-[#095c54]', label: t.tab_in_progress },
      awaiting_verification: { bg: 'bg-[#f3e8ff]', text: 'text-[#9333ea]', label: t.tab_awaiting_verification },
      resolved: { bg: 'bg-[#ecfdf5]', text: 'text-[#10b981]', label: t.tab_resolved },
      rejected: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', label: t.tab_rejected },
      reopened: { bg: 'bg-[#ffedd5]', text: 'text-[#ea580c]', label: t.tab_reopened }
    };

    const c = config[status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: status };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Title & Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#10b981]" />
            {t.nav_complaints}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            {t.timeline_title}
          </p>
        </div>

        <button
          onClick={onOpenReport}
          className="btn-primary-custom px-4 py-2.5 text-xs sm:text-sm touch-press w-full sm:w-auto justify-center"
        >
          {t.action_report}
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-2xl border border-[#e2e8f0] space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Complaint ID (NMC-2026-XXXXX), locality, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
          />
        </div>

        {/* Scrollable Status Tabs with Momentum Touch */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition touch-press ${selectedStatus === tab.id
                  ? 'bg-[#095c54] text-white shadow-sm'
                  : 'bg-slate-50 text-[#64748b] hover:bg-[#e6f4f1] hover:text-[#095c54]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#ecfdf5] text-[#10b981] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Complaints List / Cards */}
      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-[#64748b]">
          {t.loading}
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#e6f4f1] text-[#095c54] flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7 text-[#095c54]" />
          </div>
          <h4 className="font-extrabold text-sm text-[#0f2925]">{t.empty}</h4>
          <p className="text-xs text-[#64748b] max-w-sm mx-auto">
            {t.hero_card_desc}
          </p>
          <button onClick={onOpenReport} className="btn-primary-custom px-5 py-2.5 text-xs font-bold touch-press">
            {t.action_report}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {complaints.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedComplaint(c)}
              className="rounded-3xl border border-[#e2e8f0] bg-white shadow-xs hover:shadow-md hover:border-[#b8e0d7] transition-all cursor-pointer flex flex-col justify-between touch-press overflow-hidden"
            >
              {/* Photo & Status */}
              <div className="relative aspect-video bg-slate-100">
                <img src={c.image_url} alt={c.category_name} className="w-full h-full object-cover" />
                <div className="absolute top-2.5 right-2.5">
                  {getStatusBadge(c.status)}
                </div>
                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-black">
                  {c.complaint_number}
                </div>
              </div>

              <div className="p-3.5 space-y-2">
                <div className="text-xs font-extrabold text-[#095c54]">
                  {c.category_name}
                </div>
                <p className="text-xs text-[#0f2925] font-semibold line-clamp-2">
                  {c.description}
                </p>
                {/* <button
                  onClick={e => { e.stopPropagation(); setSelectedComplaint(c); }}
                  className="mt-2 text-sm font-medium text-[#095c54] underline"
                >
                  {t.view_details}
                </button> */}
                <p className="text-[11px] text-[#64748b] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                  <span className="truncate">Ward {c.location.ward_number} · {c.location.address}</span>
                </p>
              </div>

              <div className="px-3.5 pb-3.5 border-t border-[#f1f5f9] pt-2.5 flex items-center justify-between text-[11px]">
                <span className="text-[#94a3b8]">
                  {new Date(c.submitted_at).toLocaleDateString(
                    lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN'
                  )}
                </span>
                <span className="font-extrabold text-[#095c54] flex items-center gap-1">
                  {t.view_details} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPLAINT DETAIL & TIMELINE MODAL                        */}
      {/* ======================================================== */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeInBackdrop"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="w-full h-full bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col animate-scaleUp pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Native Mobile Drag Pill */}
            <div className="sm:hidden pt-2.5 pb-1 bg-gradient-to-r from-[#095c54] to-[#0d6e65] flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-white/40" />
            </div>

            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#095c54] via-[#0d6e65] to-[#10b981] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#a7f3d0] uppercase">
                  NMC Citizen Complaint Tracker
                </span>
                <h3 className="font-extrabold text-base sm:text-lg">
                  {selectedComplaint.complaint_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Image & Resolution Visuals (Before & After for Resolved Issues) */}
              {selectedComplaint.status === 'resolved' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#095c54] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#10b981]" />
                      <span>Resolution Visual Verification (Before vs After)</span>
                    </span>
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {/* Before Image */}
                    <div className="space-y-1">
                      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-rose-200 bg-rose-50 shadow-xs">
                        <img
                          src={selectedComplaint.image_url}
                          alt="Citizen Reported (Before)"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold">
                          Before Cleanup
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold block text-center">
                        Reported by Citizen
                      </span>
                    </div>

                    {/* After Image */}
                    <div className="space-y-1">
                      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-emerald-300 bg-emerald-50 shadow-xs">
                        <img
                          src={
                            selectedComplaint.resolved_image_url ||
                            (selectedComplaint as any).resolution_image_url ||
                            'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'
                          }
                          alt="Municipal Resolution (After)"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-[#047857]/90 backdrop-blur-xs text-white text-[10px] font-bold">
                          After Cleanup
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold block text-center flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                        Municipal Verified
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#e2e8f0]">
                  <img
                    src={selectedComplaint.image_url}
                    alt={selectedComplaint.category_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-extrabold text-[#095c54]">
                  {selectedComplaint.category_name}
                </h4>
                <p className="text-xs text-[#0f2925] mt-1 font-medium">
                  {selectedComplaint.description}
                </p>
                <div className="mt-2 text-xs text-[#64748b] bg-[#f8faf9] p-3 rounded-xl border border-[#e2e8f0] space-y-1">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" /> <span><strong>Location:</strong> {selectedComplaint.location.address}</span></div>
                  <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-[#095c54] shrink-0" /> <span><strong>Ward:</strong> Ward {selectedComplaint.location.ward_number} ({selectedComplaint.location.ward_name})</span></div>
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#095c54] shrink-0" /> <span><strong>Submitted:</strong> {new Date(selectedComplaint.submitted_at).toLocaleString()}</span></div>
                  {selectedComplaint.resolved_at && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                      <span><strong>Resolved:</strong> {new Date(selectedComplaint.resolved_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Timeline Visual Stepper */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#095c54] uppercase tracking-wider">
                  {t.timeline_title}
                </h4>
                <div className="flex items-center justify-between text-[11px] font-bold text-center">
                  {[
                    { key: 'submitted', label: t.tab_submitted },
                    { key: 'assigned', label: t.tab_assigned },
                    { key: 'in_progress', label: t.tab_in_progress },
                    { key: 'resolved', label: t.tab_resolved }
                  ].map((step, idx) => {
                    const isDone =
                      (step.key === 'submitted') ||
                      (step.key === 'assigned' && ['assigned', 'in_progress', 'awaiting_verification', 'resolved'].includes(selectedComplaint.status)) ||
                      (step.key === 'in_progress' && ['in_progress', 'awaiting_verification', 'resolved'].includes(selectedComplaint.status)) ||
                      (step.key === 'resolved' && selectedComplaint.status === 'resolved');

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${isDone ? 'bg-[#10b981] text-white' : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className="text-[10px] text-[#64748b] mt-1">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Log Audit Trail */}
              <div>
                <h4 className="text-xs font-extrabold text-[#095c54] uppercase tracking-wider mb-2">
                  {t.activity_history}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedComplaint.activity_logs.map((log, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#095c54]">{log.action}</span>
                        <span className="text-[10px] text-[#94a3b8]">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#0f2925] mt-1">{log.description}</p>
                      <span className="text-[10px] text-[#64748b] block mt-0.5">By: {log.actor_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Citizen Actions */}
              <div className="pt-2 border-t border-[#e2e8f0] flex flex-wrap gap-2 items-center">
                {selectedComplaint.status === 'resolved' && !selectedComplaint.feedback && (
                  <button
                    onClick={() => setIsSubmittingFeedback(true)}
                    className="flex-1 btn-primary-custom py-2.5 text-xs font-bold touch-press flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>{t.feedback_btn || 'Rate Cleanup'}</span>
                  </button>
                )}

                {(selectedComplaint.status === 'resolved' || selectedComplaint.status === 'rejected') && (
                  <button
                    onClick={() => setIsReopening(true)}
                    className="flex-1 btn-outline-custom py-2.5 text-xs font-bold text-[#ea580c] border-[#fdba74] touch-press flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.reopen_btn}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(selectedComplaint.id)}
                  className="btn-outline-custom py-2.5 px-3 text-xs font-bold text-[#dc2626] border-[#fca5a5] hover:bg-[#fee2e2] transition ml-auto touch-press flex items-center gap-1.5"
                  title="Delete this complaint from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.close}</span>
                </button>
              </div>

              {/* Resolved Complaint Citizen Feedback Card (Both Submitted View & Form) */}
              {selectedComplaint.status === 'resolved' && (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#ecfdf5] border-2 border-[#a7f3d0] space-y-3.5 shadow-xs">
                  {selectedComplaint.feedback && !isSubmittingFeedback ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${star <= selectedComplaint.feedback!.rating
                                  ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                                  : 'text-slate-300'
                                }`}
                            />
                          ))}
                          <span className="text-xs font-black text-[#065f46] ml-2">
                            {selectedComplaint.feedback.rating}/5 Stars Rating
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackRating(selectedComplaint.feedback!.rating);
                            setFeedbackText(selectedComplaint.feedback!.feedback_text || '');
                            setIsSubmittingFeedback(true);
                          }}
                          className="text-xs font-black text-[#095c54] hover:underline"
                        >
                          Edit Feedback
                        </button>
                      </div>

                      {selectedComplaint.feedback.feedback_text ? (
                        <div className="bg-white/80 p-3 rounded-2xl border border-emerald-100">
                          <p className="text-xs text-[#065f46] font-semibold leading-relaxed">
                            "{selectedComplaint.feedback.feedback_text}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#047857] italic">Verified resolution with {selectedComplaint.feedback.rating}-star rating.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <h4 className="text-xs font-black text-[#065f46] flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>Rate Municipal Resolution Quality</span>
                          </h4>
                          <p className="text-[11px] text-[#047857]">
                            Inspect Before & After photos above and submit your 5-star rating & feedback
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 self-start sm:self-auto">
                          {feedbackRating === 5 ? '5 Stars - Excellent' : feedbackRating === 4 ? '4 Stars - Very Good' : feedbackRating === 3 ? '3 Stars - Satisfactory' : feedbackRating === 2 ? '2 Stars - Fair' : '1 Star - Poor'}
                        </span>
                      </div>

                      {/* 5-Star Interactive Rating Buttons */}
                      <div className="flex items-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 touch-press transition-transform hover:scale-125 focus:outline-hidden"
                            title={`${star} Star`}
                          >
                            <Star
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${star <= feedbackRating
                                  ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                                  : 'text-slate-300 hover:text-amber-300'
                                }`}
                            />
                          </button>
                        ))}
                      </div>

                      {/* Feedback Description Textarea */}
                      <div>
                        <label className="text-[11px] font-black text-[#065f46] block mb-1">
                          Feedback Description & Comments
                        </label>
                        <textarea
                          rows={2}
                          placeholder={
                            lang === 'gu'
                              ? 'સફાઈની ગુણવત્તા, ઝડપ અને મ્યુનિસિપલ સ્ટાફની કામગીરી વિશે પ્રતિભાવ લખો...'
                              : lang === 'hi'
                                ? 'सफाई की गुणवत्ता, गति और कार्य के बारे में अपनी प्रतिक्रिया लिखें...'
                                : 'Provide feedback about cleanup quality, speed, or team conduct...'
                          }
                          value={feedbackText}
                          onChange={e => setFeedbackText(e.target.value)}
                          className="w-full p-2.5 rounded-2xl border border-[#a7f3d0] text-xs outline-none focus:border-[#10b981] bg-white font-medium shadow-2xs"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        {selectedComplaint.feedback && (
                          <button
                            type="button"
                            onClick={() => setIsSubmittingFeedback(false)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#64748b] hover:bg-white"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFeedback(selectedComplaint.id)}
                          className="btn-primary-custom px-5 py-2 text-xs font-black shadow-md flex items-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>Submit Official Citizen Feedback</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reopen Form Section */}
              {isReopening && (
                <div className="p-4 rounded-2xl bg-[#fff7ed] border border-[#fdba74] space-y-2">
                  <span className="text-xs font-extrabold text-[#9a3412]">
                    Explain Why This Issue Is Still Unresolved
                  </span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Only half of the waste was cleared; garbage heap still blocks passage..."
                    value={reopenReason}
                    onChange={e => setReopenReason(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#fdba74] text-xs outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsReopening(false)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-bold text-[#64748b]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReopen(selectedComplaint.id)}
                      className="px-4 py-1.5 rounded-lg bg-[#ea580c] text-white text-xs font-bold"
                    >
                      Confirm Reopen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
