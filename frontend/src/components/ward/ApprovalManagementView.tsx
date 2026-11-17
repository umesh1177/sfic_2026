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
  ChevronRight,
  Building,
  Eye,
  Key,
  Lock,
  Phone,
  FileCheck,
  ExternalLink,
  Award
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardApprovalItem } from '../../types/index.js';
import { PostDriveCompletionModal, CompletedDriveForPost } from './PostDriveCompletionModal.js';

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

  // Community Approval & Password Assignment Modal State
  const [communityApproveModalItem, setCommunityApproveModalItem] = useState<WardApprovalItem | null>(null);
  const [assignedPassword, setAssignedPassword] = useState<string>('Navsari@2026');
  const [showPasswordInput, setShowPasswordInput] = useState<boolean>(true);
  const [approvalComments, setApprovalComments] = useState<string>('Verified society registration credentials and authorization certificate.');
  const [submittingCommunityApproval, setSubmittingCommunityApproval] = useState<boolean>(false);

  // Document Inspection Modal State
  const [inspectDocItem, setInspectDocItem] = useState<WardApprovalItem | null>(null);

  // Ready-to-Post Completed Drive Banner & Modal (after approving drive evidence completion)
  const [readyToPostDrive, setReadyToPostDrive] = useState<CompletedDriveForPost | null>(null);
  const [postCompletionModalDrive, setPostCompletionModalDrive] = useState<CompletedDriveForPost | null>(null);

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
    if (item.type === 'community_registration') {
      setCommunityApproveModalItem(item);
      setAssignedPassword('Navsari@2026');
      setApprovalComments('Verified society registration credentials and authorization certificate.');
      return;
    }

    try {
      const res = await api.reviewWardApproval(item.id, 'approve', 'Approved by Municipal Ward Officer for community action');
      if (item.type === 'evidence_review' && res.data?.completed_drive) {
        setReadyToPostDrive(res.data.completed_drive);
        setActionMessage(
          res.message ||
            `Completed work for "${item.title}" VERIFIED! Click "Post Drive Completion & Issue Certificates" below to announce completion and send certificates + points.`
        );
      } else {
        setActionMessage(
          res.message ||
            `Cleanliness Drive "${item.title}" APPROVED! It is now published and live on all citizen dashboards.`
        );
        setTimeout(() => setActionMessage(''), 6000);
      }
      setApprovals(prev => prev.filter(a => a.id !== item.id));
    } catch (err: any) {
      console.error('Approve failed:', err);
    }
  };

  // Submit Community Head Approval & Issue Password (KEY REQUIREMENT)
  const handleConfirmCommunityApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityApproveModalItem || !assignedPassword.trim()) return;

    setSubmittingCommunityApproval(true);
    try {
      await api.approveWardCommunityRequest(communityApproveModalItem.id, {
        password: assignedPassword.trim(),
        comments: approvalComments.trim()
      });

      const commName = communityApproveModalItem.details?.community_name || 'Community';
      const headPhone = communityApproveModalItem.details?.phone || '';
      setActionMessage(`🎉 Community "${commName}" APPROVED! Login password "${assignedPassword}" has been dispatched to Community Head (+91 ${headPhone}) via SMS.`);
      setApprovals(prev => prev.filter(a => a.id !== communityApproveModalItem.id));
      setCommunityApproveModalItem(null);
      setTimeout(() => setActionMessage(''), 8000);
    } catch (err: any) {
      alert(`Approval error: ${err.message || 'Failed to approve community'}`);
    } finally {
      setSubmittingCommunityApproval(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem || !rejectReason.trim()) return;
    setSubmittingAction(true);
    try {
      if (rejectModalItem.type === 'community_registration') {
        await api.rejectWardCommunityRequest(rejectModalItem.id, {
          reason: rejectReason.trim()
        });
        setActionMessage(`Community Registration "${rejectModalItem.title}" REJECTED. Notification sent to applicant.`);
      } else {
        await api.reviewWardApproval(rejectModalItem.id, 'reject', rejectReason.trim());
        setActionMessage(`Item "${rejectModalItem.title}" REJECTED. Official reason recorded.`);
      }
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

  const communityRequestsCount = approvals.filter(a => a.type === 'community_registration').length;

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
            Pending Officer Decisions across Community Registrations, Drives, Evidence & Completion Reports
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-xs font-black text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{actionMessage}</span>
          </div>
          {readyToPostDrive && (
            <button
              type="button"
              onClick={() => setPostCompletionModalDrive(readyToPostDrive)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-md transition shrink-0"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Post Drive Completion &amp; Issue Certificates</span>
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
        {[
          { id: 'all', label: `All Pending (${approvals.length})` },
          { id: 'community_registration', label: `🏛️ Community Registrations (${communityRequestsCount})` },
          { id: 'activity', label: '1. Community Activities' },
          { id: 'completion_report', label: '2. Completion Reports' },
          { id: 'evidence_review', label: '3. Work & Drive Evidence' },
          { id: 'attendance_exception', label: '4. Attendance Exceptions' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-white text-[#095c54] shadow-xs font-black'
                : 'hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.id === 'community_registration' && communityRequestsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
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
            <p className="text-[11px] text-slate-400">No pending items requiring officer action in this category.</p>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className={`p-5 rounded-3xl bg-white border shadow-xs space-y-4 transition ${
                item.type === 'community_registration'
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10 hover:border-[#095c54]'
                  : 'border-[#e2e8f0] hover:border-[#095c54]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      item.type === 'community_registration'
                        ? 'bg-emerald-100 text-[#095c54] border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Submitted {new Date(item.submission_time).toLocaleDateString('en-IN')}
                    </span>
                    {item.details?.request_code && (
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.details.request_code}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-[#0f2925] mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">
                    By <strong>{item.submitted_by_name}</strong> ({item.submitted_by_role})
                  </p>
                </div>

                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto border ${
                  item.type === 'community_registration'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  Awaiting Officer Decision
                </span>
              </div>

              {/* Photos or Document preview banner */}
              {item.photos && item.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {item.photos.map((p, pIdx) => (
                    <div key={pIdx} className="rounded-2xl overflow-hidden aspect-video border border-slate-200 relative group">
                      <img src={p} alt="Evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setInspectDocItem(item)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-black gap-1"
                      >
                        <Eye className="w-4 h-4" /> View Fullscreen
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Details breakdown */}
              {item.details && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  {item.type === 'community_registration' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 font-bold">Community / Organisation:</span>{' '}
                        <strong className="text-[#095c54]">{item.details.community_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Entity Type:</span>{' '}
                        <span className="font-semibold text-slate-800">{item.details.organisation_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Head Applicant:</span>{' '}
                        <span className="font-bold text-slate-800">{item.details.full_name || item.submitted_by_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Mobile Phone:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">{item.details.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Locality / Ward:</span>{' '}
                        <span className="font-semibold text-slate-800">{item.details.locality} (Ward {item.ward_number})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Verification Document:</span>{' '}
                        <button
                          type="button"
                          onClick={() => setInspectDocItem(item)}
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{item.details.document_name || 'View Certificate'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    Object.entries(item.details).map(([k, v]) => (
                      <p key={k} className="text-slate-700">
                        <strong className="capitalize text-slate-900">{k.replace('_', ' ')}:</strong>{' '}
                        {Array.isArray(v) ? v.join(', ') : String(v)}
                      </p>
                    ))
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {item.type === 'community_registration' && (
                  <button
                    onClick={() => setInspectDocItem(item)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspect Document</span>
                  </button>
                )}

                <button
                  onClick={() => handleApprove(item)}
                  className="px-4 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-2xs"
                >
                  {item.type === 'community_registration' ? (
                    <>
                      <Key className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Approve &amp; Set Password</span>
                    </>
                  ) : item.type === 'evidence_review' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify &amp; Approve Completed Work</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Publish to Citizens</span>
                    </>
                  )}
                </button>

                {item.type !== 'community_registration' && (
                  <button
                    onClick={() => handleReviewAction(item.id, 'changes_requested')}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-extrabold transition"
                  >
                    Request Changes
                  </button>
                )}

                <button
                  onClick={() => {
                    setRejectModalItem(item);
                    setRejectReason('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-extrabold transition"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================================================================= */}
      {/* 1. WARD OFFICER COMMUNITY APPROVAL & PASSWORD ASSIGNMENT MODAL   */}
      {/* (KEY USER REQUIREMENT: Officer sets password and issues to Head)   */}
      {/* ================================================================= */}
      {communityApproveModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#095c54]">
                <ShieldCheck className="w-5 h-5 text-[#095c54]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Approve Community & Set Head Password
                </h3>
              </div>
              <button
                onClick={() => setCommunityApproveModalItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Verify and register <strong>"{communityApproveModalItem.details?.community_name}"</strong> under Ward {communityApproveModalItem.ward_number || 3}. As Ward Officer, set the login password for the Community Head. This password will be immediately dispatched to their device via SMS.
            </p>

            {/* Applicant Summary */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Community Head:</span>
                <span className="font-extrabold text-slate-800">{communityApproveModalItem.details?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Contact Mobile:</span>
                <span className="font-mono font-extrabold text-emerald-800">{communityApproveModalItem.details?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Verified Document:</span>
                <button
                  type="button"
                  onClick={() => setInspectDocItem(communityApproveModalItem)}
                  className="font-bold text-[#095c54] hover:underline flex items-center gap-1"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{communityApproveModalItem.details?.document_name}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleConfirmCommunityApproval} className="space-y-4">
              {/* Password Setting Input (REQUIRED BY USER) */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Assign Login Password for Head *</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordInput(!showPasswordInput)}
                    className="text-[10px] text-[#095c54] font-extrabold hover:underline"
                  >
                    {showPasswordInput ? 'Hide' : 'Show'} Password
                  </button>
                </label>
                <div className="flex items-center rounded-2xl border-2 border-emerald-300 focus-within:border-[#095c54] bg-white overflow-hidden transition">
                  <span className="px-3 py-2.5 bg-emerald-50 text-[#095c54] border-r border-emerald-200">
                    <Key className="w-4 h-4 text-[#095c54]" />
                  </span>
                  <input
                    type={showPasswordInput ? 'text' : 'password'}
                    required
                    value={assignedPassword}
                    onChange={e => setAssignedPassword(e.target.value)}
                    placeholder="Enter secure initial password (e.g. Navsari@2026)"
                    className="flex-1 px-3 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  This password will be texted to +91 {communityApproveModalItem.details?.phone} for immediate login.
                </p>
              </div>

              {/* Officer Comments */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Officer Remarks / Note
                </label>
                <input
                  type="text"
                  value={approvalComments}
                  onChange={e => setApprovalComments(e.target.value)}
                  placeholder="Official approval note (e.g. Document verified, registered under Ward 3)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCommunityApproveModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCommunityApproval || !assignedPassword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>
                    {submittingCommunityApproval ? 'Approving & Sending SMS...' : 'Confirm Approval & Send Password SMS'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. DOCUMENT INSPECTION MODAL (View Certificate)                  */}
      {/* ================================================================= */}
      {inspectDocItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#095c54]">
                <FileCheck className="w-5 h-5 text-[#095c54]" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Verification Document Inspection
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {inspectDocItem.details?.document_name || 'Community Verification Document'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectDocItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Document details box */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-bold">Community:</span>{' '}
                <span className="font-black text-slate-800">{inspectDocItem.details?.community_name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Head Applicant:</span>{' '}
                <span className="font-bold text-slate-800">{inspectDocItem.details?.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Contact Mobile:</span>{' '}
                <span className="font-mono font-bold text-slate-800">{inspectDocItem.details?.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Ward Area:</span>{' '}
                <span className="font-bold text-slate-800">Ward {inspectDocItem.ward_number || 3}</span>
              </div>
            </div>

            {/* Document Image Preview */}
            <div className="rounded-2xl border border-slate-300 overflow-hidden bg-slate-900 flex items-center justify-center max-h-80">
              <img
                src={inspectDocItem.details?.document_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=800&q=80'}
                alt="Verification Certificate"
                className="max-h-80 w-auto object-contain"
              />
            </div>

            {/* Verification Checklist */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <div className="font-black flex items-center gap-1 text-emerald-950">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verification Checklist Passed:</span>
              </div>
              <p className="text-emerald-800 pl-4">
                ✓ Valid Society / RWA Registration seal present<br />
                ✓ Head applicant authorized by executive committee resolution<br />
                ✓ Operating address verified within Navsari municipal boundaries
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectDocItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetItem = inspectDocItem;
                  setInspectDocItem(null);
                  handleApprove(targetItem);
                }}
                className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition flex items-center gap-1"
              >
                <Key className="w-3.5 h-3.5 text-emerald-300" />
                <span>Proceed to Approve & Set Password →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. OFFICER REJECTION REASON MODAL                                 */}
      {/* ================================================================= */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {rejectModalItem.type === 'community_registration'
                    ? 'Reject Community Registration'
                    : 'Reject Cleanliness Drive Submission'}
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
              This reason will be instantly dispatched as a high-priority notification and SMS to the applicant:
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
                  placeholder="e.g. Uploaded document is illegible or missing official registration seal. Please re-apply with clear scanned copy of Gujarat Societies Registration Certificate."
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
                  {submittingAction ? 'Sending Rejection...' : 'Confirm Rejection & Dispatch Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. POST DRIVE COMPLETION & ISSUE CERTIFICATES MODAL */}
      {postCompletionModalDrive && (
        <PostDriveCompletionModal
          drive={postCompletionModalDrive}
          onClose={() => setPostCompletionModalDrive(null)}
          onPublished={msg => {
            setPostCompletionModalDrive(null);
            setReadyToPostDrive(null);
            setActionMessage(msg);
            setTimeout(() => setActionMessage(''), 8000);
          }}
        />
      )}
    </div>
  );
};

