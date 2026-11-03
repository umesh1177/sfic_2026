import React from 'react';
import { Check, Clock, XCircle } from 'lucide-react';

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
  const isRejected = status === 'rejected';

  // Standard 5 unified steps
  const steps = [
    { key: 'submitted', label: 'Submitted', desc: 'Logged by Citizen' },
    { key: 'under_review', label: 'Under Review', desc: 'Ward Officer Review' },
    { key: 'assigned', label: 'Team Assigned', desc: 'Squad Dispatched' },
    { key: 'in_progress', label: 'In Progress', desc: 'Field Work & Evidence' },
    { key: 'resolved', label: 'Resolved', desc: 'Verified Complete' }
  ];

  // Helper to determine step status
  const getStepState = (stepKey: string) => {
    if (isRejected) {
      if (stepKey === 'submitted') return 'completed';
      if (stepKey === 'under_review') return 'rejected';
      return 'future';
    }

    const order = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved'];
    let currentNorm = status;
    if (status === 'awaiting_verification' || status === 'evidence_submitted') currentNorm = 'in_progress';
    if (status === 'verified_complete' || status === 'closed') currentNorm = 'resolved';
    if (stepKey === 'resolved' && currentNorm === 'resolved') return 'completed';

    const currentIndex = order.indexOf(currentNorm);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'future';
  };

  if (isRejected) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <span className="font-extrabold block">Complaint Rejected by Ward Officer</span>
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
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-1 sm:gap-2 relative">
        {steps.map((step, idx) => {
          const state = getStepState(step.key);
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-1 text-center min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs transition duration-200 shrink-0 ${
                    state === 'completed'
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : state === 'current'
                      ? 'bg-amber-500 text-white shadow-md ring-4 ring-amber-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {state === 'completed' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : state === 'current' ? (
                    <Clock className="w-4 h-4 text-white" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="mt-1.5 leading-tight min-w-0">
                  <span
                    className={`block font-extrabold text-[10px] sm:text-[11px] truncate ${
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
                    <span className="hidden sm:block text-[9px] text-slate-400 truncate">
                      {step.desc}
                    </span>
                  )}
                </div>
              </div>

              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mb-5 transition-colors ${
                    state === 'completed' ? 'bg-[#095c54]' : 'bg-slate-200'
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
