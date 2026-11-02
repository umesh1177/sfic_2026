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
  ArrowRight
} from 'lucide-react';
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
      await api.submitFeedback(complaintId, feedbackRating, feedbackText, feedbackRating >= 3);
      setIsSubmittingFeedback(false);
      setActionSuccess('Thank you! Your feedback helps evaluate municipal sanitation quality.');
      fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        selectedComplaint.feedback = {
          id: 'fb-new',
          complaint_id: complaintId,
          citizen_id: 'me',
          rating: feedbackRating,
          feedback_text: feedbackText,
          resolution_satisfactory: feedbackRating >= 3,
          created_at: new Date().toISOString()
        };
      }
    } catch (err: any) {
      alert(err.message);
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
      submitted: { bg: 'bg-[#e6f4f1]', text: 'text-[#095c54]', label: 'Submitted' },
      under_review: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]', label: 'Under Review' },
      assigned: { bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]', label: 'Assigned' },
      in_progress: { bg: 'bg-[#f0f6f4]', text: 'text-[#095c54]', label: 'In Progress' },
      awaiting_verification: { bg: 'bg-[#f3e8ff]', text: 'text-[#9333ea]', label: 'Awaiting Verification' },
      resolved: { bg: 'bg-[#ecfdf5]', text: 'text-[#10b981]', label: 'Resolved' },
      rejected: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', label: 'Rejected' },
      reopened: { bg: 'bg-[#ffedd5]', text: 'text-[#ea580c]', label: 'Reopened' }
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
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#10b981]" />
            {t.nav_complaints}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Track status timeline, activity audit trail, and verify cleanup resolution.
          </p>
        </div>

        <button
          onClick={onOpenReport}
          className="btn-primary-custom px-4 py-2 text-xs sm:text-sm"
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

        {/* Scrollable Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedStatus === tab.id
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
          Loading complaints from municipal database...
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#e6f4f1] text-[#095c54] flex items-center justify-center mx-auto text-xl">
            📋
          </div>
          <h4 className="font-extrabold text-sm text-[#0f2925]">No complaints found</h4>
          <p className="text-xs text-[#64748b] max-w-sm mx-auto">
            No complaints matching your selected filter. Notice garbage in your ward? Be the first to report it!
          </p>
          <button onClick={onOpenReport} className="btn-primary-custom px-4 py-2 text-xs font-bold">
            Report a Cleanliness Issue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {complaints.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedComplaint(c)}
              className="p-4 rounded-3xl border border-[#e2e8f0] bg-white shadow-sm hover:shadow-md hover:border-[#b8e0d7] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Photo & Status */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-[#e2e8f0]">
                  <img src={c.image_url} alt={c.category_name} className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 right-2.5">
                    {getStatusBadge(c.status)}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-black">
                    {c.complaint_number}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-extrabold text-[#095c54]">
                    {c.category_name}
                  </div>
                  <p className="text-xs text-[#0f2925] font-semibold mt-1 line-clamp-2">
                    {c.description}
                  </p>
                  <p className="text-[11px] text-[#64748b] mt-1.5 flex items-center gap-1">
                    📍 Ward {c.location.ward_number} · {c.location.address}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#e2e8f0] flex items-center justify-between text-[11px]">
                <span className="text-[#94a3b8]">
                  {new Date(c.submitted_at).toLocaleDateString()}
                </span>
                <span className="font-extrabold text-[#095c54] flex items-center gap-1">
                  View Timeline <ChevronRight className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
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
              {/* Image & Main Info */}
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

              <div>
                <h4 className="text-sm font-extrabold text-[#095c54]">
                  {selectedComplaint.category_name}
                </h4>
                <p className="text-xs text-[#0f2925] mt-1 font-medium">
                  {selectedComplaint.description}
                </p>
                <div className="mt-2 text-xs text-[#64748b] bg-[#f8faf9] p-3 rounded-xl border border-[#e2e8f0] space-y-1">
                  <div>📍 <strong>Location:</strong> {selectedComplaint.location.address}</div>
                  <div>🏛️ <strong>Ward:</strong> Ward {selectedComplaint.location.ward_number} ({selectedComplaint.location.ward_name})</div>
                  <div>📅 <strong>Submitted:</strong> {new Date(selectedComplaint.submitted_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Resolution Timeline Visual Stepper (Unified 5-Step Civic Progression) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-[#095c54] uppercase tracking-wider">
                    Official Status Progression
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">Live Municipal Tracking</span>
                </div>
                <StatusProgressionStepper
                  status={selectedComplaint.status}
                  rejectionReason={(selectedComplaint as any).rejection_reason}
                />
              </div>

              {/* Activity Log Audit Trail */}
              <div>
                <h4 className="text-xs font-extrabold text-[#095c54] uppercase tracking-wider mb-2">
                  Municipal Action Log
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

              {/* Citizen Actions: Feedback, Reopen & Delete */}
              <div className="pt-2 border-t border-[#e2e8f0] flex flex-wrap gap-2 items-center">
                {selectedComplaint.status === 'resolved' && !selectedComplaint.feedback && (
                  <button
                    onClick={() => setIsSubmittingFeedback(true)}
                    className="flex-1 btn-primary-custom py-2 text-xs font-bold"
                  >
                    <Star className="w-3.5 h-3.5" /> Rate Resolution
                  </button>
                )}

                {(selectedComplaint.status === 'resolved' || selectedComplaint.status === 'rejected') && (
                  <button
                    onClick={() => setIsReopening(true)}
                    className="flex-1 btn-outline-custom py-2 text-xs font-bold text-[#ea580c] border-[#fdba74]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen Unresolved Issue
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(selectedComplaint.id)}
                  className="btn-outline-custom py-2 px-3 text-xs font-bold text-[#dc2626] border-[#fca5a5] hover:bg-[#fee2e2] transition ml-auto"
                  title="Delete this complaint from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              {/* Feedback Form Section */}
              {isSubmittingFeedback && (
                <div className="p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] space-y-2">
                  <span className="text-xs font-extrabold text-[#065f46]">Rate Sanitation Resolution</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className={`text-xl ${star <= feedbackRating ? 'text-[#d97706]' : 'text-slate-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Provide written feedback about cleanup quality..."
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#a7f3d0] text-xs outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSubmittingFeedback(false)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-bold text-[#64748b]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleFeedback(selectedComplaint.id)}
                      className="btn-primary-custom px-4 py-1.5 text-xs font-bold"
                    >
                      Submit Feedback
                    </button>
                  </div>
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
