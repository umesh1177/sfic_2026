import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Crown,
  ArrowRight,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  Volume2,
  ChevronRight,
  Activity,
  PhoneCall
} from 'lucide-react';
import { WorkerProfile, WorkerDashboardSummary, WorkAssignment } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

interface WorkerOverviewProps {
  profile: WorkerProfile | null;
  summary: WorkerDashboardSummary | null;
  assignments: WorkAssignment[];
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

const priorityLabel: Record<string, { label: string; badgeClass: string }> = {
  emergency: { label: 'Emergency', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  urgent: { label: 'Urgent', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  high: { label: 'High', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  medium: { label: 'Medium', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  low: { label: 'Routine', badgeClass: 'bg-slate-50 text-slate-600 border-slate-200' }
};

const statusLabel: Record<string, { label: string; badgeClass: string }> = {
  in_progress: { label: 'In Progress', badgeClass: 'bg-[#f0f7f5] text-[#095c54] border-[#cde6df]' },
  assigned: { label: 'Assigned', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  completion_submitted: { label: 'Under Review', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  verified_complete: { label: 'Verified Complete', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  closed: { label: 'Closed', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export const WorkerOverview: React.FC<WorkerOverviewProps> = ({
  profile,
  summary,
  assignments,
  onNavigateTab,
  lang
}) => {
  const activeAssignments = assignments.filter(
    a => a.status !== 'verified_complete' && a.status !== 'closed'
  );
  const activeLeaderTasks = activeAssignments.filter(a => a.is_temporary_leader);
  const isLeaderOnAnyTask = activeLeaderTasks.length > 0;

  const todayCount = summary?.metrics?.today_tasks ?? activeAssignments.length;
  const inProgressCount = summary?.metrics?.in_progress_tasks ?? assignments.filter(a => a.status === 'in_progress').length;
  const completedCount =
    summary?.metrics?.completed_tasks ??
    assignments.filter(a => a.status === 'verified_complete' || a.status === 'closed' || a.status === 'completion_submitted').length;
  const attendanceRate = summary?.metrics?.on_time_attendance_rate ?? 0;

  const displayName = profile?.full_name || 'Field Worker';
  const firstName = displayName.split(' ')[0] || 'Worker';
  const wardNumber = profile?.ward_number || 3;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FW';

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const todayFormatted = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formatShortTime = (isoOrStr?: string) => {
    if (!isoOrStr) return null;
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return isoOrStr;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  return (
    <div className="space-y-5">
      {/* 1. CLEAN EXECUTIVE HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,41,37,0.03)] p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#095c54] text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#f0f7f5] text-[#095c54] text-[10px] sm:text-[11px] font-semibold border border-[#cde6df]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#095c54]" />
                  Ward {wardNumber} · {todayFormatted}
                </span>
                {profile?.worker_code && (
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {profile.worker_code}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#0f2925] tracking-tight mt-1.5 truncate">
                {greeting}, {firstName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>{profile?.designation_name || 'Sanitation Worker'}</span>
                <span className="text-slate-300">•</span>
                <span>Navsari Municipal Corporation</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onNavigateTab('assign_work')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>View Today's Work</span>
            </button>
            <button
              onClick={() =>
                speakText(
                  `નમસ્તે ${displayName}. તમારા આજના ${todayCount} કાર્યો ઉપલબ્ધ છે.`
                )
              }
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition shrink-0"
              title="Voice Summary (Gujarati / Hindi)"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUBTLE TEMPORARY TEAM LEADER NOTICE (ONLY WHEN ACTUALLY ASSIGNED AS LEADER) */}
      {isLeaderOnAnyTask && (
        <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-amber-500 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#0f2925]">Temporary Squad Team Leader</h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold uppercase">
                  Task Delegated
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                You are designated to coordinate attendance and upload field evidence for{' '}
                <span className="font-semibold text-[#0f2925]">
                  {activeLeaderTasks.map(t => t.task_code).join(', ')}
                </span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('assign_work', activeLeaderTasks[0]?.id)}
            className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
          >
            <span>Open Task</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. FOUR UNIFIED METRIC CARDS (CLEAN MONOCHROME + TEAL SYSTEM) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Tasks</span>
            <Calendar className="w-4 h-4 text-[#095c54]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0f2925]">{todayCount}</span>
            <span className="text-[11px] font-medium text-slate-500">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ward {wardNumber} schedule</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <Activity className="w-4 h-4 text-[#095c54]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0f2925]">{inProgressCount}</span>
            <span className="text-[11px] font-medium text-slate-500">Ongoing</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Field work active</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#095c54]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0f2925]">{completedCount}</span>
            <span className="text-[11px] font-medium text-slate-500">Total</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified & submitted</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attendance</span>
            <TrendingUp className="w-4 h-4 text-[#095c54]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0f2925]">{attendanceRate}%</span>
            <span className="text-[11px] font-medium text-slate-500">GPS Verified</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Geofence compliance</p>
        </div>
      </div>

      {/* 4. TODAY'S FIELD ASSIGNMENTS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#0f2925]">Today's Field Operations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active tasks dispatched to your squad by the Ward {wardNumber} Officer
            </p>
          </div>
          {activeAssignments.length > 0 && (
            <button
              onClick={() => onNavigateTab('assign_work')}
              className="text-xs font-semibold text-[#095c54] hover:underline flex items-center gap-1"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeAssignments.length === 0 ? (
          <div className="py-10 px-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <Briefcase className="w-8 h-8 mx-auto mb-2.5 text-slate-300" />
            <p className="font-semibold text-sm text-[#0f2925]">No Tasks Assigned Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              You currently have no pending assignments. When your Ward Officer assigns work to your team, it will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeAssignments.map(task => {
              const priority = priorityLabel[task.priority] || priorityLabel.medium;
              const status = statusLabel[task.status] || {
                label: task.status.replace(/_/g, ' '),
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
              };
              const deadlineStr = formatShortTime(task.deadline || task.expected_end_time);

              return (
                <div
                  key={task.id}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-semibold text-[#095c54] bg-[#f0f7f5] px-2 py-0.5 rounded-md border border-[#cde6df]">
                        {task.task_code}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase border ${priority.badgeClass}`}>
                        {priority.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase border ${status.badgeClass}`}>
                        {status.label}
                      </span>
                      {task.is_temporary_leader && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Leader
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-[#0f2925] leading-snug break-words">{task.title}</h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[220px] sm:max-w-[300px]">{task.location_name || task.address}</span>
                      </span>
                      {deadlineStr && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Due {deadlineStr}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('assign_work', task.id)}
                    className="w-full md:w-auto px-4 py-2.5 md:py-2 bg-[#095c54] hover:bg-[#074741] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shrink-0"
                  >
                    <span>Open Task</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. SAFETY & HELPLINE FOOTER STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f0f7f5] text-[#095c54] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0f2925]">Field Safety Guidelines</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Wear reflective vest, rubber gloves, and safety boots at all times. Report hazardous waste to your Ward Officer before handling.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0f2925]">NMC Sanitation Control Room</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Need equipment support or emergency escalation on site? Contact Ward {wardNumber} Control Desk at{' '}
              <a href="tel:18002332026" className="font-semibold text-[#095c54] hover:underline">
                1800-233-2026
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
