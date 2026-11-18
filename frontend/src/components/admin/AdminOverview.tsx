import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  FileText,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Language, translations } from '../../i18n/translations.js';

interface AdminOverviewProps {
  lang: Language;
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ lang, onNavigateTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminOverview();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      setError(err.message || 'Failed to load dynamic data from NMC server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const summary = data?.summary || {
    total_wards: 13,
    total_officers: 4,
    total_workers: 24,
    total_complaints: 0,
    active_complaints: 0,
    resolved_complaints: 0,
    pending_approval_complaints: 0,
    flagged_officers_count: 0,
    avg_cleanliness_score: 90.2,
    sla_compliance_rate: 94
  };

  const flaggedOfficers = data?.flagged_officers || [];
  const categories = data?.category_breakdown || [];
  const recentComplaints = data?.recent_complaints || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#095c54] via-[#0b6e65] to-[#043e39] text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-black tracking-wide border border-emerald-400/30">
                NMC CENTRAL EXECUTIVE
              </span>
              <span className="text-white/60 text-xs font-semibold">Navsari Municipal Corporation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              City Administration &amp; Governance Overview
            </h1>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-xs flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={() => onNavigateTab('boundaries')}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-[#095c54] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Set Geofence</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Flagged Officers SLA Alert Panel */}
      {flaggedOfficers.length > 0 && (
        <div className="p-5 sm:p-6 bg-red-50 border-2 border-red-200 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-950">
                  {flaggedOfficers.length} Ward Officer{flaggedOfficers.length > 1 ? 's' : ''} Flagged for SLA Breach
                </h3>
                <p className="text-xs font-semibold text-red-700">
                  Complaints exceeded Maximum Approval Days or Maximum Work Days limits. Urgent intervention required.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('ward_officers')}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              <span>Manage Officers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {flaggedOfficers.map((item: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-white border border-red-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-sm text-[#0f2925] truncate">
                    {item.officer.full_name}
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-[10px]">
                    Ward {item.officer.assigned_wards?.join(', ')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-bold mb-2">
                  Contact: <span className="text-[#095c54] font-black">{item.officer.phone}</span>
                </div>
                <div className="space-y-1.5 border-t border-red-100 pt-2">
                  {item.overdue_complaints.slice(0, 3).map((oc: any, oIdx: number) => (
                    <div key={oIdx} className="text-[11px] text-red-800 font-medium flex items-start gap-1.5">
                      <Clock className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span
                          className={`inline-block px-1.5 py-0.2 mr-1 rounded text-[9px] font-black uppercase ${
                            oc.breach_type === 'work_sla'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {oc.breach_type === 'work_sla' ? 'Work Days Breach' : 'Approval Breach'}
                        </span>
                        <span className="font-bold">{oc.complaint_number}</span> ({oc.category_name}
                        {oc.team_leader_name ? ` · Leader: ${oc.team_leader_name}` : ''}):{' '}
                        <span className="font-black text-red-700">{oc.days_pending} days</span>{' '}
                        (Max: {oc.breach_type === 'work_sla' ? `${oc.max_work_days ?? 3}d work` : `${oc.max_approval_days ?? 2}d approval`})
                      </div>
                    </div>
                  ))}
                  {item.overdue_complaints.length > 3 && (
                    <div className="text-[10px] font-bold text-red-600">
                      +{item.overdue_complaints.length - 3} more overdue complaints
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Core KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Wards */}
        <div
          onClick={() => onNavigateTab('wards')}
          className="p-5 bg-white rounded-3xl border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Wards</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#095c54] flex items-center justify-center group-hover:bg-[#095c54] group-hover:text-white transition">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0f2925] tracking-tight">{summary.total_wards}</div>
          <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> All 13 Municipal Wards Active
          </p>
        </div>

        {/* Active Ward Officers */}
        <div
          onClick={() => onNavigateTab('ward_officers')}
          className="p-5 bg-white rounded-3xl border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Ward Officers</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#095c54] flex items-center justify-center group-hover:bg-[#095c54] group-hover:text-white transition">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0f2925] tracking-tight">{summary.total_officers}</div>
          <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1">
            <span>Allocated across 13 wards</span>
          </p>
        </div>

        {/* Total Sanitation Workers */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="p-5 bg-white rounded-3xl border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Field Workers</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#095c54] flex items-center justify-center group-hover:bg-[#095c54] group-hover:text-white transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0f2925] tracking-tight">{summary.total_workers}</div>
          <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <span>Sanitation & Cleaning Crew</span>
          </p>
        </div>

        {/* Complaints Status */}
        <div
          onClick={() => onNavigateTab('categories')}
          className="p-5 bg-white rounded-3xl border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Complaints Total</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#095c54] flex items-center justify-center group-hover:bg-[#095c54] group-hover:text-white transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0f2925] tracking-tight">{summary.total_complaints}</div>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
            <span className="text-amber-600">{summary.active_complaints} Active</span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-600">{summary.resolved_complaints} Resolved</span>
          </div>
        </div>
      </div>

      {/* 4. Second Row Metrics: Cleanliness Score & SLA Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-[#e2e8f0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-[#0f2925]">City Cleanliness Index</h3>
              <p className="text-xs text-slate-500 font-semibold">Weighted average score across all 13 NMC Wards</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200">
              Grade A+
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-[#095c54]">{summary.avg_cleanliness_score}%</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +2.4% vs last month
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mt-4 overflow-hidden">
            <div
              className="bg-[#095c54] h-full rounded-full transition-all duration-700"
              style={{ width: `${summary.avg_cleanliness_score}%` }}
            />
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-[#e2e8f0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-[#0f2925]">SLA Compliance Rate</h3>
              <p className="text-xs text-slate-500 font-semibold">Complaints approved & resolved within target deadlines</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-black text-xs border border-blue-200">
              Target: 90%
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-[#0f2925]">{summary.sla_compliance_rate}%</span>
            <span className="text-xs font-bold text-slate-500">
              {summary.flagged_officers_count > 0 ? `${summary.flagged_officers_count} officer(s) off-track` : 'Zero SLA violations'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                summary.sla_compliance_rate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${summary.sla_compliance_rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Category SLA & Distribution Preview */}
      <div className="p-6 bg-white rounded-3xl border border-[#e2e8f0] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-[#0f2925]">Complaint Categories & Defined SLAs</h3>
            <p className="text-xs text-slate-500 font-semibold">
              Configured maximum approval and resolution days for each civic grievance type
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('categories')}
            className="text-xs font-black text-[#095c54] hover:underline flex items-center gap-1"
          >
            <span>Manage All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {categories.slice(0, 5).map((cat: any) => (
            <div key={cat.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#095c54] transition">
              <div className="font-black text-xs text-[#0f2925] truncate">{cat.name}</div>
              <div className="text-[11px] text-slate-500 font-medium truncate">{cat.name_gu}</div>
              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] font-bold text-slate-600">
                <span>Approve: <strong className="text-[#095c54]">{cat.max_approval_days}d</strong></span>
                <span>Solve: <strong className="text-[#095c54]">{cat.max_work_days}d</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('wards')}
          className="p-5 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 hover:border-[#095c54] cursor-pointer transition shadow-2xs group"
        >
          <Building2 className="w-7 h-7 text-[#095c54] mb-3 group-hover:scale-110 transition" />
          <h4 className="font-black text-sm text-[#0f2925]">Ward Directory & Inspection</h4>
          <p className="text-xs text-slate-600 font-medium mt-1">
            View complete information for all 13 wards, locations, officers, and cleanliness ratings.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('boundaries')}
          className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:border-[#095c54] cursor-pointer transition shadow-2xs group"
        >
          <MapPin className="w-7 h-7 text-emerald-700 mb-3 group-hover:scale-110 transition" />
          <h4 className="font-black text-sm text-[#0f2925]">Geofence & Boundary Controls</h4>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Draw and adjust outer Navsari city border line and ward zones on interactive map.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('staff')}
          className="p-5 rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 hover:border-indigo-600 cursor-pointer transition shadow-2xs group"
        >
          <Users className="w-7 h-7 text-indigo-700 mb-3 group-hover:scale-110 transition" />
          <h4 className="font-black text-sm text-[#0f2925]">Staff & Personnel Registration</h4>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Register new ward officers and field sanitation workers with username and password login.
          </p>
        </div>
      </div>
    </div>
  );
};

