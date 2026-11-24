import React from 'react';
import { Check, Clock, XCircle, RotateCcw } from 'lucide-react';

export interface StatusProgressionStepperProps {
  status: string;
  rejectionReason?: string;
  compact?: boolean;
  className?: string;
}

export const StatusProgressionStepper: React.FC<StatusProgressionStepperProps> = ({
  status,
  rejectionReason,
  compact = false,
  className = ''
}) => {
  const normRaw = (status || 'submitted').toLowerCase().trim();
  const isRejected = normRaw === 'rejected';
  const isReopened = normRaw === 'reopened';
  const isResolved = normRaw === 'resolved' || normRaw === 'verified_complete' || normRaw === 'closed';

  // Unified 6-step lifecycle shared across Citizen, Worker, and Ward Officer views
  const steps = [
    { key: 'submitted', label: 'Submitted', desc: 'Logged by Citizen' },
    { key: 'under_review', label: 'Under Review', desc: 'Officer Triage' },
    { key: 'assigned', label: 'Team Assigned', desc: 'Squad Dispatched' },
    { key: 'in_progress', label: 'In Progress', desc: 'Field Work Active' },
    { key: 'awaiting_verification', label: 'Verification', desc: 'Evidence Uploaded' },
    { key: 'resolved', label: 'Resolved', desc: 'Verified Complete' }
  ];

  const order = steps.map(s => s.key);

  let currentNorm = normRaw;
  if (normRaw === 'evidence_submitted' || normRaw === 'completion_submitted') {
    currentNorm = 'awaiting_verification';
  } else if (isResolved) {
    currentNorm = 'resolved';
  } else if (isReopened) {
    currentNorm = 'assigned';
  } else if (!order.includes(currentNorm)) {
    currentNorm = 'submitted';
  }

  const currentIndex = order.indexOf(currentNorm);

  const getStepState = (stepIndex: number) => {
    if (isResolved) return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'future';
  };

  if (isRejected) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <span className="font-bold block">Complaint Rejected by Ward Officer</span>
            {rejectionReason && (
              <p className="text-[11px] text-rose-700 mt-0.5 font-medium leading-relaxed">
                Reason: "{rejectionReason}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {isReopened && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Complaint Reopened — Re-dispatched for Follow-up Cleanup</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-1 sm:gap-2 relative">
        {steps.map((step, idx) => {
          const state = getStepState(idx);
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-1 text-center min-w-0">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs transition duration-200 shrink-0 ${
                    state === 'completed'
                      ? 'bg-[#095c54] text-white shadow-2xs'
                      : state === 'current'
                      ? 'bg-amber-500 text-white shadow-sm ring-2 sm:ring-4 ring-amber-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {state === 'completed' ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  ) : state === 'current' ? (
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="mt-1 sm:mt-1.5 leading-tight min-w-0 w-full">
                  <span
                    className={`block font-bold text-[9px] sm:text-[11px] truncate ${
                      state === 'completed'
                        ? 'text-[#095c54]'
                        : state === 'current'
                        ? 'text-amber-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {!compact && (
                    <span className="hidden md:block text-[9px] text-slate-400 truncate mt-0.5">
                      {step.desc}
                    </span>
                  )}
                </div>
              </div>

              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mb-5 transition-colors ${
                    state === 'completed' && (isResolved || idx < currentIndex) ? 'bg-[#095c54]' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
