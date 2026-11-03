import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Crown,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertCircle,
  Send,
  Loader2,
  Lock,
  Calendar,
  Sparkles
} from 'lucide-react';
import { WorkAssignment, WorkCompletionReport, WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { api } from '../../services/api.js';

interface WorkCompletionReportsProps {
  assignments: WorkAssignment[];
  initialTaskId?: string;
  profile: WorkerProfile | null;
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const WorkCompletionReports: React.FC<WorkCompletionReportsProps> = ({
  assignments,
  initialTaskId,
  profile,
  onNavigateTab,
  lang
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTaskId || assignments.find(a => a.is_temporary_leader)?.id || assignments[0]?.id || ''
  );

  const selectedTask = assignments.find(a => a.id === selectedTaskId) || assignments[0];
  const isLeaderForThisTask = Boolean(selectedTask?.is_temporary_leader);

  // Form states
  const [completionDescription, setCompletionDescription] = useState(
    'Task completed satisfactorily. Silt removed, drainage free-flowing, and surface area washed with disinfectant.'
  );
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('11:30');
  const [wasteQuantity, setWasteQuantity] = useState('320 kg (2 Handcart Loads)');
  const [destination, setDestination] = useState('Navsari Municipal Solid Waste Processing Plant, Junathana');
  const [equipmentUsed, setEquipmentUsed] = useState<string[]>([
    'Suction Jetting Unit',
    'Long Hand Brooms',
    'Heavy Silt Buckets',
    'Disinfectant Chemical Sprayer'
  ]);
  const [issuesEncountered, setIssuesEncountered] = useState('Minor vehicular congestion resolved with traffic police cooperation.');

  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<WorkCompletionReport | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    if (!isLeaderForThisTask) {
      alert('Permission Denied: Only the assigned Temporary Team Leader can submit the consolidated completion report.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitWorkCompletionReport(selectedTaskId, {
        completion_description: completionDescription.trim(),
        actual_start_time: startTime,
        actual_end_time: endTime,
        waste_quantity: wasteQuantity,
        waste_disposal_destination: destination,
        equipment_used: equipmentUsed,
        issues_encountered: issuesEncountered
      });

      if (res.data) {
        setSubmittedReport(res.data);
      }
      setSuccessMsg('Consolidated Completion Report submitted to Ward 3 Officer for formal verification.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit completion report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <span>Task Completion & Verification Reports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official Ward 3 Municipal Closeout Workflow • Temporary Team Leader Consolidation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.task_code} - {a.location_name} {a.is_temporary_leader ? '(Team Leader)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Permission Banner (Citizen Standard) */}
      {isLeaderForThisTask ? (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl flex items-center justify-center text-[#047857] shrink-0">
            <Crown className="w-5 h-5 text-[#047857]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                Team Leader Authorized
              </span>
              <span className="font-mono text-xs font-bold text-[#64748b]">{selectedTask?.task_code}</span>
            </div>
            <h3 className="font-black text-sm text-[#0f2925] mt-0.5">Consolidated Work Completion Report</h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Complete the field metrics below to formally submit the completed assignment to Ward 3 Officer.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 bg-slate-50 border border-[#e2e8f0] rounded-2xl flex items-center justify-center text-slate-500 shrink-0">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#0f2925]">Team Member View (Read-Only)</h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              The consolidated completion report for this task must be submitted by the appointed Temporary Team Leader. Your attendance and site photos have already been linked to the work order.
            </p>
          </div>
        </div>
      )}

      {/* 3. Report Form or Status Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {isLeaderForThisTask ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Actual Work Start Time:
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Actual Work End Time:
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Total Waste / Silt Collected (Approximate weight or load):
              </label>
              <input
                type="text"
                required
                value={wasteQuantity}
                onChange={(e) => setWasteQuantity(e.target.value)}
                placeholder="e.g. 350 kg (or 2 tractor trolleys)"
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Disposal / Processing Destination:
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Summary of Completed Work & Sanitization Conducted:
              </label>
              <textarea
                required
                rows={3}
                value={completionDescription}
                onChange={(e) => setCompletionDescription(e.target.value)}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Issues Encountered / Notes for Ward Officer:
              </label>
              <input
                type="text"
                value={issuesEncountered}
                onChange={(e) => setIssuesEncountered(e.target.value)}
                placeholder="e.g. Resident vehicles parked over drainage lids delayed work by 15 mins."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Report to Ward 3 Officer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Consolidated Completion Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900">Task Summary & Team Status</h4>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Task Code:</span>
                <span className="font-mono font-bold text-slate-800">{selectedTask?.task_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-semibold text-slate-800">{selectedTask?.location_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-emerald-700 capitalize">{selectedTask?.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ward:</span>
                <span className="font-semibold text-slate-800">{selectedTask?.ward_name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              When the temporary Team Leader submits the closeout report, this task will be verified by the Ward Officer and marked complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
