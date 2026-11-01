import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Wrench,
  Camera,
  RefreshCw,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  Shield,
  Activity,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardDashboardSummary } from '../../types/index.js';
import { ComplaintDetailsModal } from './ComplaintDetailsModal.js';

interface WardOverviewProps {
  onNavigateToCatalogue: (filter?: {
    status?: string;
    progress_status?: string;
    priority?: string;
    additional_flags?: string;
  }) => void;
}

export const WardOverview: React.FC<WardOverviewProps> = ({ onNavigateToCatalogue }) => {
  const [summary, setSummary] = useState<WardDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getWardDashboardSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load ward dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3">
        <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading Ward 3 Operational Intelligence...</p>
      </div>
    );
  }

  if (!summary) return null;

  const m = summary.metrics;
  const a = summary.analytics;
  const f = summary.today_field_operations;

  // Exact 14 summary metric cards requested by prompt:
  const summaryCards = [
    {
      label: 'Total Complaints',
      value: m.total_complaints,
      color: 'text-[#0f2925]',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: FileText,
      onClick: () => onNavigateToCatalogue({})
    },
    {
      label: 'New Complaints',
      value: m.new_complaints,
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: AlertCircle,
      onClick: () => onNavigateToCatalogue({ status: 'submitted' })
    },
    {
      label: 'Under Review',
      value: m.under_review,
      color: 'text-amber-900',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      icon: Clock,
      onClick: () => onNavigateToCatalogue({ status: 'under_review' })
    },
    {
      label: 'Assigned Complaints',
      value: m.assigned_complaints,
      color: 'text-blue-800',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Users,
      onClick: () => onNavigateToCatalogue({ status: 'assigned' })
    },
    {
      label: 'In Progress',
      value: m.in_progress,
      color: 'text-indigo-800',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: Wrench,
      onClick: () => onNavigateToCatalogue({ status: 'in_progress' })
    },
    {
      label: 'Resolved – Awaiting Verif.',
      value: m.resolved_awaiting_verification,
      color: 'text-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      onClick: () => onNavigateToCatalogue({ progress_status: 'Completion Report Submitted' })
    },
    {
      label: 'Closed Complaints',
      value: m.closed_complaints,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      icon: CheckCircle2,
      onClick: () => onNavigateToCatalogue({ status: 'closed' })
    },
    {
      label: 'Reopened Complaints',
      value: m.reopened_complaints,
      color: 'text-purple-800',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: RefreshCw,
      badge: 'Follow-up',
      onClick: () => onNavigateToCatalogue({ additional_flags: 'reopened' })
    },
    {
      label: 'Overdue Complaints',
      value: m.overdue_complaints,
      color: 'text-red-800',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      badge: 'SLA Breach',
      onClick: () => onNavigateToCatalogue({ progress_status: 'Overdue Work' })
    },
    {
      label: 'Unassigned Complaints',
      value: m.unassigned_complaints,
      color: 'text-orange-800',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: Users,
      onClick: () => onNavigateToCatalogue({ status: 'submitted' })
    },
    {
      label: 'Active Work Assignments',
      value: m.active_work_assignments,
      color: 'text-cyan-800',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      icon: Activity,
      onClick: () => onNavigateToCatalogue({ progress_status: 'Work In Progress' })
    },
    {
      label: 'Available Workers',
      value: m.available_workers,
      color: 'text-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: UserCheck,
      onClick: () => onNavigateToCatalogue({})
    },
    {
      label: 'Workers on Duty',
      value: m.workers_on_duty,
      color: 'text-blue-900',
      bg: 'bg-blue-50/80',
      border: 'border-blue-200',
      icon: Users,
      onClick: () => onNavigateToCatalogue({ progress_status: 'Attendance & Monitoring' })
    },
    {
      label: 'Pending Evidence Reviews',
      value: m.pending_evidence_reviews,
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: Camera,
      onClick: () => onNavigateToCatalogue({ progress_status: 'Work Progress & Evidence' })
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Ward 3 Command Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dudhiya Talao & Ashapuri · Sanitary Inspector Ramesh Patel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Field Telemetry Online</span>
          </span>
          <button
            onClick={fetchSummary}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh summary"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 14 Operational Metric Cards Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-bold uppercase tracking-wider text-[10px]">
            Operational Metrics (Click any card to filter Complaint Catalogue)
          </span>
          <span className="text-[11px] text-[#095c54] font-extrabold">14 Live Indicators</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {summaryCards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <button
                key={idx}
                onClick={c.onClick}
                className={`p-3.5 rounded-2xl text-left border ${c.bg} ${c.border} hover:shadow-md hover:scale-[1.02] transition duration-150 flex flex-col justify-between group relative overflow-hidden`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${c.color} opacity-80 group-hover:opacity-100 transition`} />
                  {c.badge && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-white/90 border border-current">
                      {c.badge}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-[11px] font-extrabold text-slate-700 leading-tight mt-0.5 line-clamp-2">
                    {c.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics & Today's Field Operations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Field Operations */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#095c54]" />
              <h3 className="text-sm font-extrabold text-[#0f2925]">Today's Field Operations</h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Active Tasks</span>
              <span className="text-base font-black text-[#0f2925]">{f.active_tasks}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Teams Working</span>
              <span className="text-base font-black text-[#0f2925]">{f.teams_working}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 block uppercase">Workers Present</span>
              <span className="text-base font-black text-emerald-900">{f.workers_present}</span>
            </div>
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
              <span className="text-[10px] font-bold text-red-800 block uppercase">Workers Absent</span>
              <span className="text-base font-black text-red-900">{f.workers_absent}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 block uppercase">Awaiting Evidence</span>
              <span className="text-base font-black text-amber-900">{f.tasks_awaiting_evidence_review}</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
              <span className="text-[10px] font-bold text-purple-800 block uppercase">Delayed Tasks</span>
              <span className="text-base font-black text-purple-900">{f.delayed_tasks}</span>
            </div>
          </div>
        </div>

        {/* Complaint Resolution Analytics */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#095c54]" />
              <h3 className="text-sm font-extrabold text-[#0f2925]">Resolution Analytics</h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Avg Time: {a.avg_resolution_hours} hrs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Today</span>
              <span className="text-base font-black text-[#0f2925]">+{a.today_received}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">This Week</span>
              <span className="text-base font-black text-[#0f2925]">{a.week_received}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">This Month</span>
              <span className="text-base font-black text-[#0f2925]">{a.month_received}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 block uppercase">Resolved Total</span>
              <span className="text-base font-black text-emerald-900">{a.resolved_count}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Repeated Cleanliness Hotspots in Ward 3:
            </span>
            <span className="font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {a.repeated_locations_count} Recurring Clusters
            </span>
          </div>
        </div>
      </div>

      {/* Recent Operational Activity Feed */}
      <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#095c54]" />
            <h3 className="text-sm font-extrabold text-[#0f2925]">Recent Field Operations Activity</h3>
          </div>
          <button
            onClick={() => onNavigateToCatalogue({})}
            className="text-xs font-extrabold text-[#095c54] hover:underline flex items-center gap-1"
          >
            <span>View Catalogue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {summary.recent_activity.map(act => (
            <div
              key={act.id}
              onClick={() => {
                if (act.complaint_id) setSelectedComplaintId(act.complaint_id);
              }}
              className={`p-3.5 rounded-2xl border border-slate-200 hover:border-[#095c54] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                act.complaint_id ? 'cursor-pointer hover:bg-slate-50' : ''
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-[#0f2925] flex items-center gap-2">
                  <span>{act.title}</span>
                  <span className="text-[10px] font-bold text-slate-400">·</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-xs text-slate-600">{act.description}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                <span className="font-bold text-slate-700">{act.actor_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-mono">
                  {act.actor_role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complaint Details Modal */}
      {selectedComplaintId && (
        <ComplaintDetailsModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onComplaintUpdated={fetchSummary}
        />
      )}
    </div>
  );
};

