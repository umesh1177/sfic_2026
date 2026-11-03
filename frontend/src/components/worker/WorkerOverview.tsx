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
  Camera,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Sparkles,
  PhoneCall,
  Volume2,
  ChevronRight,
  Target,
  Award,
  Zap,
  Activity,
  Check,
  Shield,
  Radio
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

const priorityConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  emergency: {
    label: 'Emergency',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500 animate-ping'
  },
  urgent: {
    label: 'Urgent',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500 animate-ping'
  },
  high: {
    label: 'High Priority',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500'
  },
  medium: {
    label: 'Medium Priority',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500'
  },
  low: {
    label: 'Routine',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400'
  }
};

const statusConfig: Record<string, { label: string; badgeClass: string }> = {
  in_progress: { label: 'In Progress', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  assigned: { label: 'Assigned', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  completion_submitted: { label: 'Under Review', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  verified_complete: { label: 'Verified Complete', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  closed: { label: 'Closed', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export const WorkerOverview: React.FC<WorkerOverviewProps> = ({
  profile,
  summary,
  assignments,
  onNavigateTab,
  lang
}) => {
  const isLeaderOnAnyTask = assignments.some(a => a.is_temporary_leader);
  const activeLeaderTasks = assignments.filter(a => a.is_temporary_leader);
  const todayAssignments = assignments.filter(
    a => a.status === 'in_progress' || a.status === 'assigned' || a.scheduled_date === new Date().toISOString().split('T')[0]
  );

  const completedCount =
    summary?.metrics?.completed_tasks ??
    assignments.filter(
      a => a.status === 'verified_complete' || a.status === 'closed' || a.status === 'completion_submitted'
    ).length;
  const inProgressCount =
    summary?.metrics?.in_progress_tasks ?? assignments.filter(a => a.status === 'in_progress').length;
  const attendanceRate = summary?.metrics?.on_time_attendance_rate ?? 94;
  const todayCount = summary?.metrics?.today_tasks ?? todayAssignments.length;

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'FW';

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

  return (
    <div className="space-y-6">
      {/* ── 1. MODERN EXECUTIVE HERO BANNER ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#063a32] via-[#095c54] to-[#0c7066] text-white shadow-lg p-5 sm:p-7">
        {/* Soft background radial accents */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-teal-300/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Details */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-white text-xl sm:text-2xl shadow-md">
                {initials}
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#095c54] shadow-xs"
                title="Active on Duty"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-bold border border-emerald-300/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active On Duty · Ward {profile?.ward_number || 3}
                </span>
                <span className="text-[11px] text-white/70 font-medium">{todayFormatted}</span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
                {greeting}, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Kanti'}!
              </h1>

              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-emerald-100 font-medium">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{profile?.designation_name || 'Sanitation Worker'}</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-300/40" />
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Navsari Municipal Corporation · Ward {profile?.ward_number || 3}</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-300/40" />
                <span className="font-mono text-[11px] text-white/80 bg-white/10 px-2 py-0.5 rounded-md">
                  {profile?.worker_code || 'NMC-WRK-001'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start lg:self-auto shrink-0">
            <button
              onClick={() => onNavigateTab('assign_work')}
              className="px-4 py-2.5 rounded-xl bg-white text-[#095c54] font-black text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition active:scale-95 flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-[#095c54]" />
              <span>Mark Attendance</span>
            </button>

            <button
              onClick={() => onNavigateTab('assign_work')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs sm:text-sm transition active:scale-95 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-emerald-200" />
              <span>Today's Tasks</span>
            </button>

            <button
              onClick={() =>
                speakText(
                  `નમસ્તે ${profile?.full_name || 'સાથી'}. તમારા આજના ${todayCount} કાર્યો તૈયાર છે. અટેન્ડન્સ માર્ક કરો.`
                )
              }
              className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 transition active:scale-95"
              title="Regional voice assistant (Gujarati / Hindi)"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TEMPORARY TEAM LEADER CALLOUT (if assigned) ─────────────────── */}
      {isLeaderOnAnyTask && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 rounded-3xl border border-amber-300/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-amber-200/80 border border-amber-400 rounded-2xl flex items-center justify-center text-amber-900 shrink-0 shadow-xs">
              <Crown className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-amber-950">Temporary Squad Team Leader</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 border border-amber-300 text-[10px] font-black text-amber-900 uppercase tracking-wide">
                  Task Delegated Authority
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Authorized by Ward Officer to coordinate squad attendance, upload before/after photos, and submit the completion report for{' '}
                <span className="font-bold underline">{activeLeaderTasks.map(t => t.title).join(', ')}</span>.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('assign_work', activeLeaderTasks[0]?.id)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Open Squad Task</span>
          </button>
        </div>
      )}

      {/* ── 3. FOUR KPI METRICS (Modern Cards with Clean Typography) ────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Today's Tasks */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Tasks</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#0f2925]">{todayCount}</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Assigned
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ward {profile?.ward_number || 3} Daily Schedule</p>
          </div>
        </div>

        {/* Metric 2: Active / In Progress */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#0f2925]">{inProgressCount}</span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Field Squad Operating Now</p>
          </div>
        </div>

        {/* Metric 3: Verified Completed */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#095c54] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#0f2925]">{completedCount}</span>
              <span className="text-[11px] font-bold text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-full">
                Lifetime
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Officer Verified & Signed</p>
          </div>
        </div>

        {/* Metric 4: GPS Attendance */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#0f2925]">{attendanceRate}%</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                Verified GPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Geofence Compliance Score</p>
          </div>
        </div>
      </div>

      {/* ── 4. TODAY'S FIELD OPERATIONS (Clean, Modern Cards) ───────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0f2925]">Today's Field Tasks</h2>
              <p className="text-xs text-slate-500">
                Ward {profile?.ward_number || 3} Scheduled Operations · Navsari Municipal Corporation
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('assign_work')}
            className="text-xs font-bold text-[#095c54] hover:text-[#074741] flex items-center gap-1 self-start sm:self-auto group"
          >
            <span>View All Operations</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Task Cards List */}
        <div className="space-y-3">
          {todayAssignments.length === 0 ? (
            <div className="p-8 text-center bg-[#f8faf9] rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="font-extrabold text-sm text-[#0f2925]">No Pending Tasks for Today</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                All daily operations are currently up to date. New sanitation requests or emergency tickets dispatched by your Ward Officer will appear here.
              </p>
            </div>
          ) : (
            todayAssignments.map(task => {
              const priority = priorityConfig[task.priority] || priorityConfig.low;
              const status = statusConfig[task.status] || {
                label: task.status.replace('_', ' '),
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
              };

              return (
                <div
                  key={task.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-[#095c54]/50 bg-white hover:bg-[#f8faf9] transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Header Chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md border border-[#a7f3d0]">
                        {task.task_code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 ${priority.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
                        {priority.label}
                      </span>
                      {task.is_temporary_leader && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-700" />
                          Squad Leader
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-black text-sm text-[#0f2925] truncate">{task.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                    </div>

                    {/* Meta Chips */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{task.location_name || task.address}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {task.scheduled_start_time || '08:00 AM'} - {task.expected_end_time || '04:00 PM'}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-200">
                        <Radio className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Geofence: {task.attendance_radius_meters || 150}m</span>
                      </span>
                    </div>
                  </div>

                  {/* Open Work Details Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onNavigateTab('assign_work', task.id)}
                      className="px-4 py-2.5 bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black rounded-xl flex items-center gap-2 transition shadow-xs active:scale-95"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Open Task</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. MUNICIPAL HOTLINE & SAFETY PROTOCOL (2 Cards) ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safety & PPE Standard Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#0f2925]">Municipal Field Safety Protocols</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Reflective safety jacket, protective rubber gloves, and rubber boots are compulsory on site. Report hazardous chemical waste or open drain hazards immediately.
            </p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ PPE Mandatory
              </span>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ GPS Geotagged
              </span>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Zero-Harm Protocol
              </span>
            </div>
          </div>
        </div>

        {/* Ward Sanitary Inspector Hotline */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#0f2925]">
                Ward {profile?.ward_number || 3} Sanitary Inspector Hotline
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Need vehicle assistance, road safety barricades, or emergency waste clearance squad reinforcement?
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 font-mono">+91 98251 00003</span>
            <a
              href="tel:+919825100003"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <PhoneCall className="w-3 h-3 text-emerald-400" />
              <span>Call Inspector</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
