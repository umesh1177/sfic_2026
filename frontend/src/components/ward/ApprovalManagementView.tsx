import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  FileText,
  Camera,
  Users,
  Clock,
  RefreshCw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardApprovalItem } from '../../types/index.js';

interface ApprovalManagementViewProps {
  wardNumber?: number;
}

export const ApprovalManagementView: React.FC<ApprovalManagementViewProps> = ({ wardNumber }) => {
  const [approvals, setApprovals] = useState<WardApprovalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [rejectModalItem, setRejectModalItem] = useState<WardApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.getWardApprovals(wardNumber);
      setApprovals(res.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [wardNumber]);

  const handleApprove = async (item: WardApprovalItem) => {
    try {
      await api.reviewWardApproval(item.id, 'approve', 'Approved by Municipal Ward Officer for community action');
      setActionMessage(`Cleanliness Drive "${item.title}" APPROVED! It is now published and live on all citizen dashboards.`);
      setApprovals(prev => prev.filter(a => a.id !== item.id));
      setTimeout(() => setActionMessage(''), 6000);
    } catch (err: any) {
      console.error('Approve failed:', err);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem || !rejectReason.trim()) return;
    setSubmittingAction(true);
    try {
      await api.reviewWardApproval(rejectModalItem.id, 'reject', rejectReason.trim());
      setActionMessage(`Cleanliness Drive "${rejectModalItem.title}" REJECTED. Official reason sent as notification to Community Head.`);
      setApprovals(prev => prev.filter(a => a.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectReason('');
      setTimeout(() => setActionMessage(''), 6000);
    } catch (err: any) {
      console.error('Reject failed:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReviewAction = async (id: string, action: 'approve' | 'changes_requested' | 'reject') => {
    try {
      await api.reviewWardApproval(id, action, `Official review by Ward Officer: ${action}`);
      setActionMessage(`Item ${id} marked as ${action}.`);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const filtered = approvals.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Central Approval Management Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pending Officer Decisions across Community Drives, Field Evidence, Completion Reports & Exceptions
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
        {[
          { id: 'all', label: `All Pending (${approvals.length})` },
          { id: 'activity', label: '1. Community Activities' },
          { id: 'completion_report', label: '2. Completion Reports' },
          { id: 'evidence_review', label: '3. Worker Evidence' },
          { id: 'attendance_exception', label: '4. Attendance Exceptions' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === tab.id
                ? 'bg-white text-[#095c54] shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
            <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 mt-2">Loading decision queue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto opacity-70" />
            <p className="font-extrabold text-slate-700">All Ward Approvals are up to date!</p>
            <p className="text-[11px] text-slate-400">No pending items requiring officer action.</p>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 hover:border-[#095c54] transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Submitted {new Date(item.submission_time).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[#0f2925] mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">
                    By <strong>{item.submitted_by_name}</strong> ({item.submitted_by_role})
                  </p>
                </div>

                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider self-start sm:self-auto">
                  Awaiting Officer Decision
                </span>
              </div>

              {/* Photos preview if present */}
              {item.photos && item.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {item.photos.map((p, pIdx) => (
                    <div key={pIdx} className="rounded-2xl overflow-hidden aspect-video border border-slate-200">
                      <img src={p} alt="Evidence" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Details breakdown */}
              {item.details && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  {Object.entries(item.details).map(([k, v]) => (
                    <p key={k} className="text-slate-700">
                      <strong className="capitalize text-slate-900">{k.replace('_', ' ')}:</strong>{' '}
                      {Array.isArray(v) ? v.join(', ') : String(v)}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleApprove(item)}
                  className="px-4 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Publish to Citizens</span>
                </button>
                <button
                  onClick={() => handleReviewAction(item.id, 'changes_requested')}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-extrabold transition"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => {
                    setRejectModalItem(item);
                    setRejectReason('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-extrabold transition"
                >
                  Reject (With Reason)
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Officer Rejection Reason Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Reject Cleanliness Drive Submission
                </h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Please enter the official reason for rejecting <strong>"{rejectModalItem.title}"</strong>.
              This reason will be instantly dispatched as a high-priority notification to the Community Head's dashboard:
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Schedule conflicts with NMC arterial road desilting drive. Please reschedule to Sunday or shift the volunteer gathering point away from the main highway."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-rose-200 bg-rose-50/20 text-xs font-medium text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !rejectReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                >
                  {submittingAction ? 'Sending Rejection...' : 'Confirm Rejection & Notify Community Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

