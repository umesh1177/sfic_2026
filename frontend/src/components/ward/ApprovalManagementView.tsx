import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  FileText,
  Users,
  RefreshCw,
  CheckCircle2,
  Building2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Eye,
  ExternalLink,
  Layers,
  Lock
} from 'lucide-react';
import { api } from '../../services/api.js';

interface ApprovalManagementViewProps {
  wardNumber?: number;
}

export const ApprovalManagementView: React.FC<ApprovalManagementViewProps> = ({ wardNumber }) => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'community_registration' | 'activity'>('community_registration');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Certificate / Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; name: string; url: string } | null>(null);

  // Reject / Changes Modal
  const [rejectModalItem, setRejectModalItem] = useState<any | null>(null);
  const [rejectAction, setRejectAction] = useState<'reject' | 'changes_requested'>('reject');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const fetchApprovals = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getWardApprovals(wardNumber);
      const list = res.data || [];
      setApprovals(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load approval queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [wardNumber]);

  const communityRequests = approvals.filter(a => a.type === 'community_registration');
  const driveRequests = approvals.filter(a => a.type === 'activity');
  const visibleItems = activeTab === 'community_registration' ? communityRequests : driveRequests;

  const handleApproveCommunity = async (item: any) => {
    setProcessingId(item.id);
    setErrorMessage('');
    try {
      const res = await api.reviewWardApproval(
        item.id,
        'approve',
        'Verified registration certificate and approved by Ward Officer.',
        { approval_type: 'community_registration' }
      );
      setActionMessage(res.message || `Organization "${item.title}" approved! Community Head can now log in.`);
      await fetchApprovals();
      setTimeout(() => setActionMessage(''), 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDrive = async (item: any) => {
    setProcessingId(item.id);
    setErrorMessage('');
    try {
      const res = await api.reviewWardApproval(
        item.id,
        'approve',
        'Cleanliness Drive approved by Ward Officer.',
        { approval_type: 'activity' }
      );
      setActionMessage(
        res.message || `Cleanliness Drive "${item.title}" approved and published!`
      );
      await fetchApprovals();
      setTimeout(() => setActionMessage(''), 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmRejectOrChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem || !rejectReason.trim()) return;
    setSubmittingAction(true);
    setErrorMessage('');
    try {
      const res = await api.reviewWardApproval(
        rejectModalItem.id,
        rejectAction,
        rejectReason.trim(),
        { approval_type: rejectModalItem.type }
      );
      setActionMessage(res.message || `Request updated (${rejectAction}).`);
      setRejectModalItem(null);
      setRejectReason('');
      await fetchApprovals();
      setTimeout(() => setActionMessage(''), 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase tracking-wider">
              Ward {wardNumber || 3} Approval Desk
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {approvals.length} Total Pending
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Approval Management
          </h2>
        </div>

        <button
          onClick={fetchApprovals}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STRICTLY TWO SUB-TABS ONLY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('community_registration')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-between gap-2 ${
            activeTab === 'community_registration'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>1. Community Register Approval</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'community_registration'
                ? 'bg-white/20 text-white'
                : 'bg-white text-[#095c54] border border-slate-200'
            }`}
          >
            {communityRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-between gap-2 ${
            activeTab === 'activity'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>2. Cleanliness Drive Approval</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'activity'
                ? 'bg-white/20 text-white'
                : 'bg-white text-[#095c54] border border-slate-200'
            }`}
          >
            {driveRequests.length}
          </span>
        </button>
      </div>

      {/* Queue Body */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
          <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 mt-2">Loading Ward {wardNumber || 3} approval requests...</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto opacity-75" />
          <h4 className="text-sm font-extrabold text-[#0f2925]">
            {activeTab === 'community_registration'
              ? 'No Pending Community Registrations'
              : 'No Pending Cleanliness Drive Proposals'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'community_registration'
              ? `All self-registered organizations for Ward ${wardNumber || 3} have been reviewed.`
              : `All cleanliness drive requests for Ward ${wardNumber || 3} are up to date.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SUB-TAB 1: COMMUNITY REGISTER APPROVAL */}
          {activeTab === 'community_registration' &&
            communityRequests.map(item => (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 hover:border-[#095c54]/50 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase">
                        {item.details?.organization_type || 'Community Organization'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        Ward {item.ward_number}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Applied {new Date(item.submission_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#0f2925]">{item.title}</h3>
                    <p className="text-xs text-slate-600">
                      Community Head: <strong className="text-[#0f2925]">{item.submitted_by_name}</strong>
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider self-start">
                    Pending Verification
                  </span>
                </div>

                {/* Organization Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Info</span>
                    <p className="font-bold text-[#0f2925] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#095c54]" />
                      {item.details?.phone || 'N/A'}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {item.details?.email || 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Location &amp; Ward</span>
                    <p className="font-bold text-[#0f2925] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                      {item.details?.locality || `Ward ${item.ward_number}`}
                    </p>
                    <p className="text-slate-600 line-clamp-2">{item.details?.address || 'Navsari'}</p>
                  </div>

                  {/* Verification Document Card */}
                  <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#095c54] block">
                        Verification Certificate / Proof
                      </span>
                      <p className="text-xs font-bold text-[#0f2925] truncate mt-0.5">
                        {item.verification_document_name || 'Registration Certificate'}
                      </p>
                    </div>
                    {item.verification_document_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: item.title,
                            name: item.verification_document_name || 'Organization Verification Certificate',
                            url: item.verification_document_url
                          })
                        }
                        className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-emerald-50 text-[#095c54] border border-emerald-300 text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Document</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-semibold">No document attached</span>
                    )}
                  </div>
                </div>

                {item.details?.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <strong className="text-slate-800">About Organization: </strong>
                    {item.details.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <button
                    type="button"
                    disabled={processingId === item.id}
                    onClick={() => {
                      setRejectModalItem(item);
                      setRejectAction('reject');
                      setRejectReason('');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold transition"
                  >
                    Reject Registration
                  </button>
                  <button
                    type="button"
                    disabled={processingId === item.id}
                    onClick={() => handleApproveCommunity(item)}
                    className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {processingId === item.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Approve Organization &amp; Enable Login</span>
                  </button>
                </div>
              </div>
            ))}

          {/* SUB-TAB 2: CLEANLINESS DRIVE APPROVAL */}
          {activeTab === 'activity' &&
            driveRequests.map(item => {
              const hasLinkedProblem = Boolean(item.linked_problem_id || item.problem_title);

              return (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 hover:border-[#095c54]/50 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase">
                          Cleanliness Drive Proposal
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          Ward {item.ward_number}
                        </span>
                        {hasLinkedProblem && (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold">
                            Linked Problem · {(item.sibling_pending_count || 1)} Pending / {item.sibling_approved_count || 0} Approved
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-[#0f2925]">{item.title}</h3>
                      <p className="text-xs text-slate-600">
                        Proposed by <strong className="text-[#0f2925]">{item.submitted_by_name}</strong>
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider self-start">
                      Awaiting Approval
                    </span>
                  </div>

                  {/* Drive Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Proposed Schedule</span>
                      <p className="font-bold text-[#0f2925] flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
                        {item.details?.proposed_date || 'Upcoming'}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Location</span>
                      <p className="font-bold text-[#0f2925] flex items-center gap-1.5 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                        <span className="truncate">{item.details?.location || `Ward ${item.ward_number}`}</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Expected Volunteers</span>
                      <p className="font-bold text-[#0f2925] flex items-center gap-1.5 mt-1">
                        <Users className="w-3.5 h-3.5 text-[#095c54]" />
                        {item.details?.expected_volunteers || 30} Volunteers
                      </p>
                    </div>
                  </div>

                  {item.details?.safety_plan && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700">
                      <strong className="text-[#0f2925]">Plan &amp; Description: </strong>
                      {item.details.safety_plan}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalItem(item);
                        setRejectAction('changes_requested');
                        setRejectReason('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold transition"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalItem(item);
                        setRejectAction('reject');
                        setRejectReason('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold transition"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={processingId === item.id}
                      onClick={() => handleApproveDrive(item)}
                      className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {processingId === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Cleanliness Drive</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Document / Certificate Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f2925]">{previewDoc.title}</h3>
                <p className="text-xs text-slate-500">{previewDoc.name}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden max-h-[65vh] flex items-center justify-center">
              {previewDoc.url.startsWith('data:image') || /\.(png|jpe?g|webp|gif)$/i.test(previewDoc.url) ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[62vh] w-auto object-contain" />
              ) : (
                <iframe src={previewDoc.url} title={previewDoc.name} className="w-full h-[60vh]" />
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <a
                href={previewDoc.url}
                download={previewDoc.name}
                className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Request Changes Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  {rejectAction === 'changes_requested'
                    ? 'Request Adjustments'
                    : rejectModalItem.type === 'community_registration'
                    ? 'Reject Community Registration'
                    : 'Reject Cleanliness Drive'}
                </h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejectOrChanges} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Official Reason / Feedback *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Provide a clear reason that will be sent directly to the organization..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !rejectReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold disabled:opacity-50"
                >
                  {submittingAction ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
