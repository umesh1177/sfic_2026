import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  Crown,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Truck,
  Sparkles,
  PhoneCall,
  Volume2,
  Briefcase
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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Clean Header (Removed bulky banner box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            NMC Field Sanitation Operations · Navsari
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
            Welcome back, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Worker'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            {profile?.designation_name || 'Sanitation Worker'} · Ward {profile?.ward_number || 3} {profile?.ward_name ? `(${profile.ward_name})` : ''}. Check today's assigned operations, team attendance, and before-and-after work evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => onNavigateTab('assign_work')}
            className="px-4 py-2.5 rounded-xl bg-[#095c54] text-white font-extrabold text-xs sm:text-sm shadow-xs hover:bg-[#074741] transition active:scale-95 flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>Mark GPS Attendance</span>
          </button>
          <button
            onClick={() => onNavigateTab('assign_work')}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#e2e8f0] font-bold text-xs sm:text-sm transition shadow-2xs flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Today's Tasks</span>
          </button>
          <button
            onClick={() => speakText(`નમસ્તે ${profile?.full_name || 'સાથી'}. તમારા આજના કાર્યો તૈયાર છે.`)}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Voice assistant in regional language"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean Leadership Card (Citizen Design Standard, NO Bulky Box) */}
      {isLeaderOnAnyTask && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl flex items-center justify-center text-[#047857] shrink-0">
              <Crown className="w-5 h-5 text-[#047857]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-[#0f2925]">
                  Temporary Team Leader Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[10px] font-black text-[#047857]">
                  Task-Specific Authority
                </span>
              </div>
              <p className="text-xs text-[#64748b] font-medium mt-0.5">
                Assigned to coordinate team attendance, upload before/after photos, and submit the completion report for {activeLeaderTasks.map(t => t.title).join(', ')}.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('assign_work', activeLeaderTasks[0]?.id)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#06423c] text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Open Assign Work</span>
          </button>
        </div>
      )}

      {/* 2. Key Metrics Row (Matching Citizen Dashboard Stats Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>Today's Tasks</span>
            <div className="p-1.5 bg-[#ecfdf5] text-[#047857] rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f2925]">{summary?.metrics?.today_tasks ?? todayAssignments.length}</span>
            <span className="text-[11px] text-[#047857] font-extrabold">Assigned</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>In Progress</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f2925]">
              {summary?.metrics?.in_progress_tasks ?? assignments.filter(a => a.status === 'in_progress').length}
            </span>
            <span className="text-[11px] text-amber-700 font-extrabold">Active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>Completed Tasks</span>
            <div className="p-1.5 bg-slate-100 text-[#095c54] rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f2925]">
              {summary?.metrics?.completed_tasks ?? assignments.filter(a => a.status === 'verified_complete' || a.status === 'closed' || a.status === 'completion_submitted').length}
            </span>
            <span className="text-[11px] text-[#095c54] font-extrabold">Lifetime</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>Attendance Rate</span>
            <div className="p-1.5 bg-emerald-50 text-[#047857] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f2925]">{summary?.metrics?.on_time_attendance_rate ?? 0}%</span>
            <span className="text-[11px] text-[#047857] font-extrabold">Verified GPS</span>
          </div>
        </div>
      </div>

      {/* 3. Today's Assigned Field Tasks */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0f2925]">Today's Field Tasks</h2>
            <p className="text-xs text-[#64748b]">Ward 3 Scheduled Operations · Navsari Municipal Corporation</p>
          </div>
          <button
            onClick={() => onNavigateTab('assign_work')}
            className="text-xs font-extrabold text-[#095c54] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          {todayAssignments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="font-semibold text-slate-700">No pending assignments for today</p>
              <p className="text-xs text-slate-500 mt-1">Check back later or contact Ward 3 Sanitary Inspector.</p>
            </div>
          ) : (
            todayAssignments.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{task.title}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'emergency' ? 'bg-red-100 text-red-700 border border-red-200' :
                      task.priority === 'high' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                    {task.is_temporary_leader && (
                      <span className="text-[11px] bg-amber-500/20 text-amber-800 border border-amber-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" />
                        Temporary Team Leader
                      </span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      task.status === 'in_progress' ? 'bg-emerald-100 text-emerald-700' :
                      task.status === 'completion_submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {task.location_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {task.scheduled_start_time} - {task.expected_end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      Geofence: {task.attendance_radius_meters}m
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigateTab('assign_work', task.id)}
                    className="px-3.5 py-2 bg-[#095c54] hover:bg-[#06423c] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Open Work Details</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Quick Help & Emergency Contacts */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Ward 3 Sanitary Inspector Hotline</p>
            <p className="text-xs text-slate-500">Need vehicle support, road safety barriers, or emergency reassignments?</p>
          </div>
        </div>
        <a
          href="tel:+919825100003"
          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
          <span>Call Inspector (+91 98251 00003)</span>
        </a>
      </div>
    </div>
  );
};
