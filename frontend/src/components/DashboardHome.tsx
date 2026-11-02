import React from 'react';
import {
  Sparkles,
  Camera,
  FileText,
  MapPin,
  Calendar,
  Trophy,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Award,
  ChevronRight,
  Plus,
  Map as MapIcon,
  Users
} from 'lucide-react';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface DashboardHomeProps {
  user: Profile | null;
  dashboardData: any;
  onOpenReport: () => void;
  onNavigateTab: (tab: string) => void;
  lang: Language;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  user,
  dashboardData,
  onOpenReport,
  onNavigateTab,
  lang
}) => {
  const t = translations[lang];
  const stats = dashboardData?.stats || { total_submitted: 0, pending: 0, in_progress: 0, resolved: 0 };
  const nearbyIssues = dashboardData?.nearby_issues || [];
  const wardScores = dashboardData?.ward_scores || [];

  const currentDateFormatted = new Date().toLocaleDateString(
    lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN',
    { weekday: 'short', day: 'numeric', month: 'short' }
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ======================================================== */}
      {/* 1. CLEAN CIVIC OVERVIEW HEADER                           */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#095c54] tracking-tight">
            {t.welcome_back} {user?.full_name ? user.full_name.split(' ')[0] : 'Citizen'}!
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Navsari 13-Ward Civic Action & Cleanliness Overview · {currentDateFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenReport}
            className="btn-primary-custom px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>{t.action_report}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS OVERVIEW: CLEAN MINIMALIST CARDS                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Submitted */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#b8e0d7] hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748b]">Total Reports</span>
            <div className="p-2 rounded-xl bg-[#e6f4f1] text-[#095c54] group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-2">
            {stats.total_submitted}
          </div>
          <span className="text-[10px] font-bold text-[#095c54] mt-1 block">
            All submitted issues
          </span>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#fde68a] hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748b]">Pending</span>
            <div className="p-2 rounded-xl bg-[#fef3c7] text-[#d97706] group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#d97706] mt-2">
            {stats.pending}
          </div>
          <span className="text-[10px] font-bold text-[#b45309] mt-1 block">
            Awaiting officer review
          </span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#bae6fd] hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748b]">In Progress</span>
            <div className="p-2 rounded-xl bg-[#f0f9ff] text-[#0284c7] group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0284c7] mt-2">
            {stats.in_progress}
          </div>
          <span className="text-[10px] font-bold text-[#0369a1] mt-1 block">
            Sanitation crew dispatched
          </span>
        </div>

        {/* Resolved */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#a7f3d0] hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748b]">Resolved</span>
            <div className="p-2 rounded-xl bg-[#ecfdf5] text-[#10b981] group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#10b981] mt-2">
            {stats.resolved}
          </div>
          <span className="text-[10px] font-bold text-[#047857] mt-1 block">
            Verified cleaned spots
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. QUICK CIVIC ACCESS CHIPS                              */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateTab('map')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#095c54] transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center font-bold">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-[#0f2925]">Cleanliness Map</div>
              <div className="text-[10px] text-[#64748b]">13 Ward GIS & Hotspots</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#095c54] group-hover:translate-x-0.5 transition" />
        </button>

        <button
          onClick={() => onNavigateTab('drives')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#095c54] transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-[#0f2925]">Cleanliness Drives</div>
              <div className="text-[10px] text-[#64748b]">Join Volunteer Action</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#095c54] group-hover:translate-x-0.5 transition" />
        </button>

        <button
          onClick={() => onNavigateTab('rewards')}
          className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#095c54] transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-[#0f2925]">Rewards & Badges</div>
              <div className="text-[10px] text-[#64748b]">Citizen Karma & Impact</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#095c54] group-hover:translate-x-0.5 transition" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. RECENT REPORTS & WARD SCORES (TWO COLUMNS)            */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Cleanliness Reports */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-[#095c54]">
                Recent Reports in Navsari
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Real-time citizen reporting across wards
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('complaints')}
              className="text-xs font-extrabold text-[#095c54] hover:underline"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {nearbyIssues.slice(0, 3).map((issue: any) => (
              <div
                key={issue.id}
                className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] hover:border-[#b8e0d7] transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                    <img
                      src={issue.image_url || 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=400&q=80'}
                      alt="report"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0f2925] truncate">
                      {issue.category_name}
                    </div>
                    <div className="text-[11px] text-[#64748b] truncate">
                      📍 {issue.address}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                    issue.status === 'resolved'
                      ? 'bg-[#ecfdf5] text-[#047857]'
                      : issue.status === 'in_progress'
                      ? 'bg-[#f0f9ff] text-[#0284c7]'
                      : 'bg-[#fef3c7] text-[#b45309]'
                  }`}>
                    ● {issue.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ward Cleanliness Index Leaderboard */}
        <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-[#095c54]">
                Cleanliness Index
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Top rated wards this week
              </p>
            </div>
            <span className="p-1.5 rounded-xl bg-[#ecfdf5] text-[#10b981]">
              <Award className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-3">
            {wardScores.slice(0, 4).map((w: any, idx: number) => (
              <div key={w.ward_number} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0f2925]">
                    #{idx + 1} Ward {w.ward_number}: {w.ward_name.split(' - ')[0]}
                  </span>
                  <span className="font-black text-[#10b981]">
                    {w.score}/10
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#10b981] h-full rounded-full"
                    style={{ width: `${(w.score / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs font-extrabold text-[#095c54] hover:underline"
            >
              Explore Full Ward Ranking →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
