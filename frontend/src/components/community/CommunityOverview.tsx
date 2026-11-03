import { formatDate } from '../../utils/dateFormat.js';
import React from 'react';
import {
  Calendar,
  Users,
  Clock,
  MessageSquare,
  AlertCircle,
  PlusCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  MapPin,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { CommunityDashboardSummary, CommunityActivity } from '../../types/index.js';

interface CommunityOverviewProps {
  summary: CommunityDashboardSummary | null;
  loading: boolean;
  onNavigateTab: (tab: string) => void;
  onSelectActivity?: (activityId: string) => void;
  onOpenCreateWizard: () => void;
}

export const CommunityOverview: React.FC<CommunityOverviewProps> = ({
  summary,
  loading,
  onNavigateTab,
  onSelectActivity,
  onOpenCreateWizard
}) => {
  if (loading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  const comm = summary?.community || {
    id: 'comm-lead',
    community_name: 'Community Cleanliness Initiative',
    organisation_type: 'Resident Welfare Association',
    registration_number: 'NMC-RWA-2026-001',
    address: 'Navsari Civic Area',
    locality: 'Navsari',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    contact_phone: '+919825100000',
    contact_email: 'community@navsarimunicipal.gov.in',
    head_name: 'Community Leader',
    verification_status: 'verified' as const,
    created_by: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const rawMetrics = (summary as any)?.metrics || (summary as any)?.stats;
  const metrics = {
    total_activities: rawMetrics?.total_activities ?? rawMetrics?.total_activities_created ?? 0,
    upcoming_activities: rawMetrics?.upcoming_activities ?? 0,
    completed_activities: rawMetrics?.completed_activities ?? 0,
    awaiting_evidence_activities: rawMetrics?.awaiting_evidence_activities ?? rawMetrics?.activities_awaiting_evidence ?? 0,
    total_registrations: rawMetrics?.total_registrations ?? rawMetrics?.total_citizen_registrations ?? 0,
    verified_participants: rawMetrics?.verified_participants ?? rawMetrics?.total_verified_participants ?? 0,
    volunteer_attendance_rate: rawMetrics?.volunteer_attendance_rate ?? 0,
    unanswered_citizen_questions: rawMetrics?.unanswered_citizen_questions ?? 0
  };

  const pending_actions = summary?.pending_actions || {
    activities_requiring_edits: [],
    activities_awaiting_approval: [],
    unanswered_questions: [],
    evidence_pending: []
  };

  const impact = summary?.impact || {
    verified_activities_count: 5,
    verified_participants_count: 342,
    total_cleanliness_hours: 1040,
    monthly_trend: [],
    ward_distribution: []
  };

  const upcoming_activities = summary?.upcoming_activities || [];

  return (
    <div className="space-y-6">
      {/* 1. CLEAN CIVIC OVERVIEW HEADER (No bulky green banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#095c54] tracking-tight">
            {comm.community_name}
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            {comm.organisation_type} · Ward {comm.ward_number || 3} ({comm.ward_name || 'Ward 3 - Dudhiya Talao & Ashapuri'}) · NMC Action Command
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateWizard}
            className="btn-primary-custom px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Create New Activity</span>
          </button>
        </div>
      </div>

      {/* 2. Urgent Attention / Pending Action Banner */}
      {(pending_actions.unanswered_questions.length > 0 ||
        pending_actions.activities_awaiting_approval.length > 0 ||
        pending_actions.evidence_pending.length > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Actions Requiring Community Head Attention</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pending_actions.unanswered_questions.length > 0 && (
              <button
                onClick={() => onNavigateTab('activities')}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-300 shadow-sm text-left transition"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {pending_actions.unanswered_questions.length} Citizen Questions
                  </p>
                  <p className="text-[11px] text-amber-700">AI answer suggestions ready</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            )}

            {pending_actions.activities_awaiting_approval.length > 0 && (
              <button
                onClick={() => onNavigateTab('activities')}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-300 shadow-sm text-left transition"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {pending_actions.activities_awaiting_approval.length} Under Review
                  </p>
                  <p className="text-[11px] text-slate-600">Ward Officer verification</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            )}

            {pending_actions.evidence_pending.length > 0 && (
              <button
                onClick={() => onNavigateTab('activities')}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-300 shadow-sm text-left transition"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {pending_actions.evidence_pending.length} Evidence Pending
                  </p>
                  <p className="text-[11px] text-amber-700">Submit Before/After photos</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Core Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Activities */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Total Drives</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {metrics.total_activities}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="text-emerald-700 font-bold">{metrics.upcoming_activities} upcoming</span>
            <span>·</span>
            <span>{metrics.completed_activities} finished</span>
          </div>
        </div>

        {/* Card 2: Verified Volunteers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Verified Volunteers</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {impact.verified_participants_count}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Attendance rate: {metrics.volunteer_attendance_rate}%</span>
          </div>
        </div>

        {/* Card 3: Civic Cleanliness Hours */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Civic Action Hours</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {impact.total_cleanliness_hours} <span className="text-sm font-semibold text-slate-500">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Dedication across Navsari wards
          </div>
        </div>

        {/* Card 4: Unanswered Inquiries */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Citizen Inquiries</span>
            <div className={`p-2 rounded-xl ${metrics.unanswered_citizen_questions > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {metrics.unanswered_citizen_questions}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {metrics.unanswered_citizen_questions > 0 ? (
              <span className="text-rose-600 font-bold">Needs Community Head reply</span>
            ) : (
              <span className="text-emerald-700 font-bold">All citizen queries resolved</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Upcoming Activities & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Activities Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#095c54]" />
              Scheduled Cleanliness Drives
            </h2>
            <button
              onClick={() => onNavigateTab('activities')}
              className="text-xs font-bold text-[#095c54] hover:underline flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcoming_activities.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center text-[#095c54]">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No Upcoming Activities Scheduled</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Organize a cleanliness drive for your neighborhood, lakefront, or park. Submit for official NMC approval.
              </p>
              <button
                onClick={onOpenCreateWizard}
                className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-bold shadow hover:bg-[#074741] transition"
              >
                + Plan New Drive
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming_activities.map((act: CommunityActivity) => {
                const regCount = Number(act.registered_count || 0);
                const maxCap = Number(act.max_capacity || 50);
                const pct = Math.min(100, Math.round((regCount / maxCap) * 100));

                return (
                  <div
                    key={act.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            act.approval_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : act.approval_status === 'pending_officer_review'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {act.approval_status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {act.ward_name || `Ward ${act.ward_number}`}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {act.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onSelectActivity) onSelectActivity(act.id);
                            onNavigateTab('registrations');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                        >
                          Registrations
                        </button>
                        <button
                          onClick={() => {
                            if (onSelectActivity) onSelectActivity(act.id);
                            onNavigateTab('evidence');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c54] text-xs font-bold transition flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Evidence
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(act.proposed_start_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {act.target_area}
                      </span>
                    </div>

                    {/* Registration Capacity Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          Registered: <strong className="text-slate-900">{regCount}</strong> of {maxCap}
                        </span>
                        <span className="text-xs font-bold text-[#095c54]">{pct}% Full</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Quick Community Head Tools */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#095c54]" />
            Community Actions
          </h2>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-sm">
            <button
              onClick={() => onNavigateTab('announcements')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-left transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-[#095c54] flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">Broadcast Event Alert</p>
                <p className="text-[11px] text-slate-500 truncate">Target registered participants only</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => onNavigateTab('evidence')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-left transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">Before / After Gallery</p>
                <p className="text-[11px] text-slate-500 truncate">AI quality check & photo slider</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => onNavigateTab('approvals')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-left transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">11-Step Approval Timeline</p>
                <p className="text-[11px] text-slate-500 truncate">Track Ward Officer & NMC status</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => onNavigateTab('analytics')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-left transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#095c54] flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">Reports & AI Insights</p>
                <p className="text-[11px] text-slate-500 truncate">Civic turnout & ML forecasts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* Environmental Impact Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Verified Ward Impact</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your organization has mobilized <strong>{impact.verified_participants_count} citizens</strong> across{' '}
              <strong>{impact.verified_activities_count} verified cleanliness activities</strong> in Navsari.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

