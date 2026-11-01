import React from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Camera,
  Crown,
  Star,
  ThumbsUp,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { WorkerProfile, WorkerDashboardSummary } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

interface WorkerPerformanceProps {
  profile: WorkerProfile | null;
  summary: WorkerDashboardSummary | null;
  lang: Language;
}

export const WorkerPerformance: React.FC<WorkerPerformanceProps> = ({
  profile,
  summary,
  lang
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0f2925] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#095c54]" />
            <span>Field Performance & Municipal Recognition</span>
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5 font-medium">
            Navsari Municipal Corporation · Objective Metrics Based on GPS Attendance & Verification Audits
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] rounded-2xl text-xs font-black shrink-0">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          <span>Municipal Rating: 4.9 / 5.0</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>GPS Attendance</span>
            <div className="p-1.5 bg-[#ecfdf5] text-[#047857] rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2925]">
            {summary?.metrics?.on_time_attendance_rate ?? 97.4}%
          </div>
          <p className="text-xs text-[#047857] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Within 100m geofence
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>Tasks Completed</span>
            <div className="p-1.5 bg-[#f8faf9] text-[#095c54] rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2925]">
            {summary?.metrics?.completed_tasks ?? 142}
          </div>
          <p className="text-xs text-[#095c54] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified by Ward 3 Officer
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>Evidence Verification</span>
            <div className="p-1.5 bg-[#ecfdf5] text-[#047857] rounded-xl">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2925]">
            {summary?.metrics?.verified_evidence_rate ?? 98.8}%
          </div>
          <p className="text-xs text-[#047857] font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            High photo authenticity
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#64748b] text-xs font-bold">
            <span>Leadership Duties</span>
            <div className="p-1.5 bg-[#ecfdf5] text-[#047857] rounded-xl">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2925]">
            24
          </div>
          <p className="text-xs text-[#047857] font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            Tasks Led as Team Leader
          </p>
        </div>
      </div>

      {/* Badges & Recognition */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-black text-[#0f2925] flex items-center gap-2">
          <Award className="w-5 h-5 text-[#095c54]" />
          <span>Municipal Honors & Service Badges</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-3xl border border-[#e2e8f0] bg-white shadow-xs flex items-start gap-3.5 hover:border-[#095c54]/30 transition">
            <div className="p-3 bg-[#e6f4f1] text-[#095c54] rounded-2xl text-xl">
              🏆
            </div>
            <div>
              <h4 className="font-black text-[#0f2925] text-sm">Swachhta Senani - Ward 3</h4>
              <p className="text-xs text-[#64748b] mt-0.5">
                Awarded for maintaining 0 drain overflow complaints in Dudhiya Talao sector for 60 consecutive days.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl border border-[#e2e8f0] bg-white shadow-xs flex items-start gap-3.5 hover:border-[#095c54]/30 transition">
            <div className="p-3 bg-[#ecfdf5] text-[#047857] rounded-2xl text-xl">
              📍
            </div>
            <div>
              <h4 className="font-black text-[#0f2925] text-sm">Zero-Deviation GPS Attendance</h4>
              <p className="text-xs text-[#64748b] mt-0.5">
                Over 120 verified worksite punch-ins within 25 meters of the municipal task coordinates.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl border border-[#e2e8f0] bg-white shadow-xs flex items-start gap-3.5 hover:border-[#095c54]/30 transition">
            <div className="p-3 bg-[#e6f4f1] text-[#095c54] rounded-2xl text-xl">
              ⭐
            </div>
            <div>
              <h4 className="font-black text-[#0f2925] text-sm">Exemplary Team Leadership</h4>
              <p className="text-xs text-[#64748b] mt-0.5">
                Successfully coordinated 20+ sanitation drives with 100% on-time before/after closeout reporting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
