import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldAlert,
  Crown,
  CheckCircle,
  Truck,
  Volume2,
  Navigation,
  Sparkles,
  Camera,
  FileCheck2,
  AlertTriangle,
  Send,
  Loader2
} from 'lucide-react';
import { WorkAssignment, WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { api } from '../../services/api.js';

interface MyDailyWorkProps {
  assignments: WorkAssignment[];
  profile: WorkerProfile | null;
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
  onRefresh: () => void;
}

export const MyDailyWork: React.FC<MyDailyWorkProps> = ({
  assignments,
  profile,
  onNavigateTab,
  lang,
  onRefresh
}) => {
  const [selectedTask, setSelectedTask] = useState<WorkAssignment | null>(
    assignments.find(a => a.status === 'in_progress') || assignments[0] || null
  );
  const [progressComment, setProgressComment] = useState('');
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [progressSuccess, setProgressSuccess] = useState<string | null>(null);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAcknowledge = async (task: WorkAssignment) => {
    try {
      await api.acknowledgeWorkerAssignment(task.id);
      onRefresh();
    } catch (err) {
      console.error('Error acknowledging task:', err);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !progressComment.trim()) return;

    setSubmittingProgress(true);
    try {
      await api.addWorkProgress(selectedTask.id, {
        comment: progressComment.trim(),
        stage: 'in_progress'
      });
      setProgressSuccess('Work progress update logged to supervisor.');
      setProgressComment('');
      setTimeout(() => setProgressSuccess(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit progress');
    } finally {
      setSubmittingProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar (Citizen Dashboard Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0f2925] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#095c54]" />
            <span>My Daily Work & Field Instructions</span>
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5 font-medium">
            Navsari Municipal Corporation · Sanitary Operations · Shift: 06:30 AM – 02:30 PM
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
            {assignments.length} Tasks Scheduled Today
          </span>
        </div>
      </div>

      {/* 2. Tasks Grid & Detailed Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Task List Selector */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider text-xs">
            Assigned Work Orders
          </h3>

          {assignments.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              No tasks scheduled for today.
            </div>
          ) : (
            assignments.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">{task.task_code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 mt-1 text-sm line-clamp-1">{task.title}</h4>

                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{task.location_name}</span>
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {task.scheduled_start_time}
                    </span>

                    {task.is_temporary_leader ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" />
                        Team Leader
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Team Member</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Task Detailed Control Deck */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5 sm:p-6 space-y-5">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-mono font-extrabold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-xl">
                    {selectedTask.task_code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                      selectedTask.priority === 'emergency' ? 'bg-red-50 text-red-700 border border-red-200' :
                      selectedTask.priority === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Priority: {selectedTask.priority}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f8faf9] text-[#64748b] border border-[#e2e8f0]">
                      {selectedTask.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-[#0f2925] mt-2">{selectedTask.title}</h3>
                <p className="text-xs sm:text-sm text-[#64748b] mt-1">{selectedTask.description}</p>
              </div>

              {/* Leadership Role Indicator (Citizen Standard, Zero Bulky Box) */}
              {selectedTask.is_temporary_leader ? (
                <div className="p-3.5 bg-white border border-[#e2e8f0] rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] rounded-xl shrink-0">
                      <Crown className="w-4 h-4 text-[#047857]" />
                    </div>
                    <div>
                      <span className="font-black text-[#0f2925]">Temporary Team Leader: </span>
                      <span className="text-[#64748b]">Appointed to coordinate this worksite, record team attendance, and submit final completion report.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl flex items-center justify-between text-xs text-[#64748b]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#047857]" />
                    <span>Role: Sanitation Field Worker (Team Member)</span>
                  </div>
                  <span className="text-[#64748b] font-medium">Reporting to Team Leader</span>
                </div>
              )}

              {/* Location & Time specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Work Location:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    {selectedTask.location_name}
                  </span>
                  <span className="text-slate-500 block mt-0.5">{selectedTask.address}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Shift Timing:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {selectedTask.scheduled_start_time} - {selectedTask.expected_end_time}
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    GPS Geofence: Radius {selectedTask.attendance_radius_meters}m
                  </span>
                </div>
              </div>

              {/* Work Instructions & Audio Reader */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>Work Instructions & Safety</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => speakText(selectedTask.work_instructions || selectedTask.description)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen Aloud</span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
                  <p>{selectedTask.work_instructions || 'Execute thorough sanitization and clearance according to NMC standard protocol.'}</p>
                  {selectedTask.safety_instructions && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{selectedTask.safety_instructions}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Equipment Checklist */}
              {selectedTask.required_equipment && selectedTask.required_equipment.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Required Equipment & PPE
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.required_equipment.map((eq, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Matrix */}
              <div className="pt-2 border-t border-[#e2e8f0] flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigateTab('attendance', selectedTask.id)}
                  className="flex-1 min-w-[140px] px-4 py-2.5 bg-[#095c54] hover:bg-[#06423c] text-white font-extrabold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Clock className="w-4 h-4" />
                  <span>GPS Attendance</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('work_map', selectedTask.id)}
                  className="px-4 py-2.5 bg-[#f8faf9] hover:bg-[#e6f4f1] text-[#0f2925] font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition border border-[#e2e8f0]"
                >
                  <Navigation className="w-4 h-4 text-[#095c54]" />
                  <span>Map & Route</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('evidence', selectedTask.id)}
                  className="px-4 py-2.5 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#047857] font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition border border-[#a7f3d0]"
                >
                  <Camera className="w-4 h-4 text-[#047857]" />
                  <span>Before/After Photos</span>
                </button>

                {selectedTask.is_temporary_leader && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('completion_reports', selectedTask.id)}
                    className="px-4 py-2.5 bg-[#095c54] hover:bg-[#06423c] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <FileCheck2 className="w-4 h-4 text-emerald-200" />
                    <span>Completion Report</span>
                  </button>
                )}
              </div>

              {/* Progress Update Submitter */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Send On-Field Progress Note</h4>
                <form onSubmit={handleAddProgress} className="flex gap-2">
                  <input
                    type="text"
                    value={progressComment}
                    onChange={(e) => setProgressComment(e.target.value)}
                    placeholder="e.g. Suction jetting 50% finished, road clearing underway..."
                    className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingProgress || !progressComment.trim()}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    {submittingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send</span>
                  </button>
                </form>
                {progressSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {progressSuccess}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              Select a task from the list to view instructions and take action.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

