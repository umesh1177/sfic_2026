import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { CommunityActivity, ActivityApprovalLog } from '../../types/index.js';
import { api } from '../../services/api.js';

interface ApprovalTrackingProps {
  activities: CommunityActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
}

export const ApprovalTracking: React.FC<ApprovalTrackingProps> = ({
  activities,
  selectedActivityId,
  onSelectActivity
}) => {
  const [currentActivityId, setCurrentActivityId] = useState<string>(
    selectedActivityId || (activities[0]?.id || '')
  );
  const [approvalLogs, setApprovalLogs] = useState<ActivityApprovalLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedActivityId && selectedActivityId !== currentActivityId) {
      setCurrentActivityId(selectedActivityId);
    }
  }, [selectedActivityId]);

  const loadApprovals = async (actId: string) => {
    if (!actId) return;
    setLoading(true);
    try {
      const res = await api.getActivityApprovals(actId);
      if (res.success && res.data) {
        setApprovalLogs(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentActivityId) {
      loadApprovals(currentActivityId);
    }
  }, [currentActivityId]);

  const currentActivity = activities.find(a => a.id === currentActivityId);

  // Determine current active step (1 to 11)
  const getStepIndex = (act?: CommunityActivity): number => {
    if (!act) return 1;
    if (act.evidence_status === 'verified_complete') return 11;
    if (act.evidence_status === 'submitted_for_review') return 10;
    if (act.event_status === 'completed') return 9;
    if (act.event_status === 'in_progress') return 7;
    if (act.registration_status === 'open') return 6;
    if (act.approval_status === 'approved') return 5;
    if (act.approval_status === 'pending_officer_review') return 3;
    if (act.approval_status === 'draft') return 1;
    return 2;
  };

  const currentStep = getStepIndex(currentActivity);

  const workflowSteps = [
    { num: 1, title: 'Draft Created', desc: 'Community Head designs the activity draft' },
    { num: 2, title: 'Submitted for Approval', desc: 'Dispatched to NMC portal' },
    { num: 3, title: 'Ward Officer Review', desc: 'Ward 3 Sanitary Inspector reviews logistics' },
    { num: 4, title: 'NMC Admin Approval', desc: 'Official administrative clearance' },
    { num: 5, title: 'Activity Published', desc: 'Visible on citizen dashboard & map' },
    { num: 6, title: 'Registrations Open', desc: 'Citizens can RSVP and join' },
    { num: 7, title: 'Ground Execution', desc: 'Volunteers assemble and execute cleanliness' },
    { num: 8, title: 'Activity Concluded', desc: 'Cleanup finished on the ground' },
    { num: 9, title: 'Evidence Uploaded', desc: 'Before / During / After photos added' },
    { num: 10, title: 'Evidence Submitted', desc: 'Official packet sent to Ward Officer' },
    { num: 11, title: 'Verified Complete', desc: 'Official stamp & resolution verified' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Official Approval &amp; Verification Timeline
        </h1>
      </div>

      {/* Activity Selector */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
        <label className="text-xs font-bold text-slate-700">Select Activity to Track</label>
        <select
          value={currentActivityId}
          onChange={e => {
            setCurrentActivityId(e.target.value);
            onSelectActivity(e.target.value);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-bold text-slate-900 outline-none bg-white"
        >
          {activities.map(act => (
            <option key={act.id} value={act.id}>
              {act.title} - Status: {act.approval_status.toUpperCase()} ({act.ward_name})
            </option>
          ))}
        </select>
      </div>

      {/* 11-STEP VISUAL PROGRESS TIMELINE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              11-Step Official Verification Flow
            </h2>
            <p className="text-xs text-slate-500">
              Current Stage:{' '}
              <strong className="text-[#095c54]">
                Step {currentStep}: {workflowSteps[currentStep - 1]?.title}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                currentActivity?.approval_status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentActivity?.approval_status === 'pending_officer_review'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentActivity?.approval_status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Step Items Grid / Vertical Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workflowSteps.map(st => {
            const isCompleted = st.num < currentStep;
            const isCurrent = st.num === currentStep;

            return (
              <div
                key={st.num}
                className={`p-4 rounded-2xl border transition flex items-start gap-3 ${
                  isCurrent
                    ? 'bg-teal-50/70 border-[#095c54] shadow-sm ring-1 ring-[#095c54]'
                    : isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 ${
                    isCurrent
                      ? 'bg-[#095c54] text-white shadow'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {st.title}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OFFICIAL AUDIT LOGS & COMMENTS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#095c54]" />
          Officer Review Decisions & Action Trail
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : approvalLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
            No official review logs recorded yet for this activity.
          </div>
        ) : (
          <div className="space-y-3">
            {approvalLogs.map(log => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        log.decision === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.decision === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.decision.toUpperCase()}
                    </span>
                    <span className="font-bold text-slate-800">
                      {log.reviewer_name || 'NMC Official'}
                    </span>
                    <span className="text-slate-400">({log.reviewer_role?.replace(/_/g, ' ')})</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  "{log.comments}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

