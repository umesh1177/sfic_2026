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
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardDashboardSummary } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { ComplaintDetailsModal } from './ComplaintDetailsModal.js';

interface WardOverviewProps {
  wardNumber?: number;
  officerName?: string;
  wardArea?: string;
  lang?: Language;
  onNavigateToCatalogue: (filter?: {
    status?: string;
    progress_status?: string;
    priority?: string;
    additional_flags?: string;
  }) => void;
}

export const WardOverview: React.FC<WardOverviewProps> = ({
  wardNumber = 3,
  officerName = 'Chief Sanitary Inspector',
  wardArea = 'Navsari Municipal Ward',
  lang = 'en',
  onNavigateToCatalogue
}) => {
  const [summary, setSummary] = useState<WardDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const t = translations[lang];

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getWardDashboardSummary(wardNumber);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load ward dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [wardNumber]);

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3">
        <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">
          {lang === 'gu'
            ? `વોર્ડ ${wardNumber} માહિતી લોડ થઈ રહી છે...`
            : lang === 'hi'
            ? `वार्ड ${wardNumber} डेटा लोड हो रहा है...`
            : `Loading Ward ${wardNumber} Operational Intelligence...`}
        </p>
      </div>
    );
  }

  if (!summary) return null;

  const m = summary.metrics;
  const a = summary.analytics;
  const f = summary.today_field_operations;

  // 6 Essential, High-Impact Operational KPI Cards
  const pendingTriageCount = (m.new_complaints || 0) + (m.under_review || 0) + (m.unassigned_complaints || 0);
  const activeFieldCount = (m.in_progress || 0) + (m.assigned_complaints || 0);
  const pendingVerificationCount = (m.resolved_awaiting_verification || 0) + (m.pending_evidence_reviews || 0);
  const criticalSlaCount = (m.overdue_complaints || 0) + (m.reopened_complaints || 0);
  const resolutionRate = m.total_complaints > 0
    ? Math.min(100, Math.round((m.closed_complaints / m.total_complaints) * 100))
    : 0;

  const keyKpiCards = [
    {
      id: 'total',
      label: t.kpi_total_complaints,
      desc: t.kpi_total_desc,
      value: m.total_complaints,
      color: 'text-[#095c54]',
      bg: 'bg-white hover:bg-teal-50/50',
      border: 'border-[#b8e0d7]',
      badgeBg: 'bg-[#e6f4f1] text-[#095c54] border-[#b8e0d7]',
      badge: lang === 'gu' ? 'કુલ નોંધાયેલ' : lang === 'hi' ? 'कुल पंजीकृत' : 'Ward Total',
      icon: FileText,
      onClick: () => onNavigateToCatalogue({})
    },
    {
      id: 'pending_triage',
      label: t.kpi_pending_triage,
      desc: t.kpi_pending_desc,
      value: pendingTriageCount,
      color: 'text-amber-800',
      bg: 'bg-white hover:bg-amber-50/50',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      badge: pendingTriageCount > 0
        ? (lang === 'gu' ? 'સોંપણી બાકી' : lang === 'hi' ? 'आवंटन बाकी' : 'Action Needed')
        : 'All Clear',
      icon: AlertCircle,
      onClick: () => onNavigateToCatalogue({ status: 'submitted' })
    },
    {
      id: 'active_field',
      label: t.kpi_active_field,
      desc: t.kpi_active_desc,
      value: activeFieldCount,
      color: 'text-blue-800',
      bg: 'bg-white hover:bg-blue-50/50',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
      badge: `${f?.teams_working ?? 0} ${lang === 'gu' ? 'ટીમો સક્રિય' : lang === 'hi' ? 'टीमें सक्रिय' : 'Teams Active'}`,
      icon: Wrench,
      onClick: () => onNavigateToCatalogue({ status: 'in_progress' })
    },
    {
      id: 'pending_verification',
      label: t.kpi_pending_verification,
      desc: t.kpi_verification_desc,
      value: pendingVerificationCount,
      color: 'text-teal-800',
      bg: 'bg-white hover:bg-teal-50/50',
      border: 'border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
      badge: lang === 'gu' ? 'પુરાવા તૈયાર' : lang === 'hi' ? 'साक्ष्य तैयार' : 'Evidence Ready',
      icon: Camera,
      onClick: () => onNavigateToCatalogue({ progress_status: 'Completion Report Submitted' })
    },
    {
      id: 'resolved_rate',
      label: t.kpi_resolved_rate,
      desc: t.kpi_resolved_desc,
      value: m.closed_complaints,
      color: 'text-emerald-800',
      bg: 'bg-white hover:bg-emerald-50/50',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      badge: `${resolutionRate}% ${lang === 'gu' ? 'ઉકેલ દર' : lang === 'hi' ? 'निवारण दर' : 'Resolved'}`,
      icon: CheckCircle2,
      onClick: () => onNavigateToCatalogue({ status: 'closed' })
    },
    {
      id: 'critical_sla',
      label: t.kpi_critical_sla,
      desc: t.kpi_critical_desc,
      value: criticalSlaCount,
      color: 'text-rose-800',
      bg: 'bg-white hover:bg-rose-50/50',
      border: 'border-rose-200',
      badgeBg: criticalSlaCount > 0 ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-slate-100 text-slate-700 border-slate-200',
      badge: criticalSlaCount > 0
        ? (lang === 'gu' ? 'તાત્કાલિક ધ્યાન' : lang === 'hi' ? 'अति आवश्यक' : 'SLA Breach')
        : 'On Track',
      icon: AlertTriangle,
      onClick: () => onNavigateToCatalogue({ progress_status: 'Overdue Work' })
    }
  ];

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      {/* Overview Top Header (Fully Dynamic) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-lg border border-[#b8e0d7]">
              WARD {wardNumber}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0f2925] tracking-tight">
              {t.ward_command_title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{wardArea}</span>
            <span>·</span>
            <span className="font-semibold text-slate-700">{officerName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t.telemetry_online}</span>
          </span>
          <button
            onClick={fetchSummary}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-2xs"
            title="Refresh summary"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Essential Actionable KPI Cards Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-extrabold uppercase tracking-wider text-[11px] text-[#095c54] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.operational_metrics}</span>
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {lang === 'gu' ? 'ક્લિક કરીને ફિલ્ટર કરો' : lang === 'hi' ? 'क्लिक करके फ़िल्टर करें' : 'Click card to filter'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {keyKpiCards.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={c.onClick}
                className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-left border ${c.bg} ${c.border} shadow-xs hover:shadow-md hover:scale-[1.01] transition duration-200 flex flex-col justify-between group relative overflow-hidden`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div className={`p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl ${c.badgeBg} shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full border truncate max-w-[95px] sm:max-w-none ${c.badgeBg}`}>
                    {c.badge}
                  </span>
                </div>

                <div className="mt-2 sm:mt-3">
                  <p className={`text-xl sm:text-3xl font-black ${c.color} tracking-tight`}>{c.value}</p>
                  <p className="text-[11px] sm:text-sm font-extrabold text-[#0f2925] mt-0.5 line-clamp-1">
                    {c.label}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1 hidden sm:block">
                    {c.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics & Today's Field Operations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Today's Field Operations */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#095c54]" />
              <h3 className="text-sm font-extrabold text-[#0f2925]">
                {lang === 'gu' ? 'આજની ફીલ્ડ કામગીરી' : lang === 'hi' ? 'आज का फील्ड कार्य' : "Today's Field Operations"}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                {lang === 'gu' ? 'ચાલુ કામ' : lang === 'hi' ? 'सक्रिय कार्य' : 'Active Tasks'}
              </span>
              <span className="text-base font-black text-[#0f2925]">{f.active_tasks}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                {lang === 'gu' ? 'કાર્યરત ટીમો' : lang === 'hi' ? 'कार्यरत टीमें' : 'Teams Working'}
              </span>
              <span className="text-base font-black text-[#0f2925]">{f.teams_working}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 block uppercase">
                {lang === 'gu' ? 'હાજર સ્ટાફ' : lang === 'hi' ? 'उपस्थित कर्मचारी' : 'Workers Present'}
              </span>
              <span className="text-base font-black text-emerald-900">{f.workers_present}</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 block uppercase">
                {lang === 'gu' ? 'ગેરહાજર સ્ટાફ' : lang === 'hi' ? 'अनुपस्थित कर्मचारी' : 'Workers Absent'}
              </span>
              <span className="text-base font-black text-rose-900">{f.workers_absent}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 block uppercase">
                {lang === 'gu' ? 'પુરાવા બાકી' : lang === 'hi' ? 'साक्ष्य प्रतीक्षित' : 'Awaiting Evidence'}
              </span>
              <span className="text-base font-black text-amber-900">{f.tasks_awaiting_evidence_review}</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
              <span className="text-[10px] font-bold text-purple-800 block uppercase">
                {lang === 'gu' ? 'વિલંબિત કાર્ય' : lang === 'hi' ? 'विलंबित कार्य' : 'Delayed Tasks'}
              </span>
              <span className="text-base font-black text-purple-900">{f.delayed_tasks}</span>
            </div>
          </div>
        </div>

        {/* Complaint Resolution Analytics */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#095c54]" />
              <h3 className="text-sm font-extrabold text-[#0f2925]">
                {lang === 'gu' ? 'નિવારણ વિશ્લેષણ' : lang === 'hi' ? 'निवारण विश्लेषण' : 'Resolution Analytics'}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Avg Time: {a.avg_resolution_hours} hrs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                {lang === 'gu' ? 'આજે' : lang === 'hi' ? 'आज' : 'Today'}
              </span>
              <span className="text-base font-black text-[#0f2925]">+{a.today_received}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                {lang === 'gu' ? 'આ અઠવાડિયે' : lang === 'hi' ? 'इस सप्ताह' : 'This Week'}
              </span>
              <span className="text-base font-black text-[#0f2925]">{a.week_received}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                {lang === 'gu' ? 'આ મહિને' : lang === 'hi' ? 'इस माह' : 'This Month'}
              </span>
              <span className="text-base font-black text-[#0f2925]">{a.month_received}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 block uppercase">
                {lang === 'gu' ? 'કુલ ઉકેલાયેલ' : lang === 'hi' ? 'कुल निस्तारित' : 'Resolved Total'}
              </span>
              <span className="text-base font-black text-emerald-900">{a.resolved_count}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              {lang === 'gu'
                ? `વોર્ડ ${wardNumber} પુનરાવર્તિત કચરાના સ્થળો:`
                : lang === 'hi'
                ? `वार्ड ${wardNumber} में आवर्ती कचरा स्थल:`
                : `Repeated Cleanliness Hotspots in Ward ${wardNumber}:`}
            </span>
            <span className="font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {a.repeated_locations_count} {lang === 'gu' ? 'ક્લસ્ટર્સ' : lang === 'hi' ? 'क्लस्टर्स' : 'Recurring Clusters'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Operational Activity Feed */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#095c54]" />
            <h3 className="text-sm font-extrabold text-[#0f2925]">
              {lang === 'gu' ? 'તાજેતરની ફીલ્ડ કામગીરી લૉગ' : lang === 'hi' ? 'हाल की फील्ड गतिविधि' : 'Recent Field Operations Activity'}
            </h3>
          </div>
          <button
            onClick={() => onNavigateToCatalogue({})}
            className="text-xs font-extrabold text-[#095c54] hover:underline flex items-center gap-1"
          >
            <span>{t.wo_nav_complaints}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {summary.recent_activity.map(act => (
            <div
              key={act.id}
              onClick={() => {
                if (act.complaint_id) setSelectedComplaintId(act.complaint_id);
              }}
              className={`p-3 sm:p-3.5 rounded-2xl border border-slate-200 hover:border-[#095c54] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                act.complaint_id ? 'cursor-pointer hover:bg-slate-50' : ''
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-extrabold text-[#0f2925] flex items-center gap-2 flex-wrap">
                  <span className="truncate">{act.title}</span>
                  <span className="text-[10px] font-bold text-slate-400">·</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-xs text-slate-600 line-clamp-2">{act.description}</p>
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
