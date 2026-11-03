import { formatDate } from '../utils/dateFormat.js';
import React from 'react';
import {
  Camera,
  FileText,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle2,
  Award,
  ChevronRight,
  MapPin,
  Users
} from 'lucide-react';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';
import { ComplaintEvidenceImage } from './common/ComplaintEvidenceImage.js';

interface DashboardHomeProps {
  user: Profile | null;
  dashboardData: any;
  onOpenReport: () => void;
  onNavigateTab: (tab: string) => void;
  lang: Language;
}

export  const DashboardHome: React.FC<DashboardHomeProps> = ({
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

  const currentDateFormatted = formatDate(new Date());

  // Time-of-day greeting (multilingual)
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 
    ? t.greeting_morning 
    : currentHour < 17 
    ? t.greeting_afternoon 
    : t.greeting_evening;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* ======================================================== */}
      {/* 1. CIVIC HERO & WELCOME BANNER                           */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#095c54] via-[#0d6e65] to-[#10b981] p-5 sm:p-7 text-white shadow-lg shadow-[#095c54]/15">
        {/* Decorative background glow circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#10b981]/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#10b981] ring-2 ring-white animate-pulse" />
                {t.ward_badge}
              </span>
              <span className="text-white/80 text-[11px] font-semibold">
                {t.civic_monitoring} · {currentDateFormatted}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              {greeting}, {user?.full_name ? user.full_name.split(' ')[0] : t.citizen}!
            </h1>

            <p className="text-xs sm:text-sm text-white/90 max-w-xl font-medium leading-relaxed">
              {t.hero_card_desc}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0">
            <button
              onClick={onOpenReport}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-[#095c54] hover:bg-[#e6f4f1] font-black text-xs sm:text-sm shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2 touch-press"
            >
              <Camera className="w-4 h-4 text-[#095c54]" />
              <span>{t.action_report}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS OVERVIEW: CLEAN MINIMALIST CARDS                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Submitted */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#b8e0d7] hover:shadow-md transition cursor-pointer group touch-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-[#64748b] truncate">{t.stats_total}</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#e6f4f1] text-[#095c54] group-hover:scale-110 transition-transform shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-[#0f2925] mt-1.5 sm:mt-2">
            {stats.total_submitted}
          </div>
          <span className="text-[10px] font-bold text-[#095c54] mt-0.5 block truncate">
            {t.stats_total_sub}
          </span>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#fde68a] hover:shadow-md transition cursor-pointer group touch-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-[#64748b] truncate">{t.stats_pending}</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#fef3c7] text-[#d97706] group-hover:scale-110 transition-transform shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-[#d97706] mt-1.5 sm:mt-2">
            {stats.pending}
          </div>
          <span className="text-[10px] font-bold text-[#b45309] mt-0.5 block truncate">
            {t.stats_pending_sub}
          </span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#bae6fd] hover:shadow-md transition cursor-pointer group touch-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-[#64748b] truncate">{t.stats_in_progress}</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#f0f9ff] text-[#0284c7] group-hover:scale-110 transition-transform shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-[#0284c7] mt-1.5 sm:mt-2">
            {stats.in_progress}
          </div>
          <span className="text-[10px] font-bold text-[#0369a1] mt-0.5 block truncate">
            {t.stats_in_progress_sub}
          </span>
        </div>

        {/* Resolved */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#a7f3d0] hover:shadow-md transition cursor-pointer group touch-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold text-[#64748b] truncate">{t.stats_resolved}</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#ecfdf5] text-[#10b981] group-hover:scale-110 transition-transform shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-[#10b981] mt-1.5 sm:mt-2">
            {stats.resolved}
          </div>
          <span className="text-[10px] font-bold text-[#047857] mt-0.5 block truncate">
            {t.stats_resolved_sub}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. QUICK CIVIC ACCESS CHIPS (RESPONSIVE 3-COLUMN)        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Cleanliness Drives */}
        <button
          onClick={() => onNavigateTab('drives')}
          className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#095c54] transition text-left flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2 group touch-press"
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center font-bold shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-black text-[#0f2925] whitespace-normal break-words leading-snug">{t.action_drives_title}</div>
              <div className="text-[9px] sm:text-[10px] text-[#64748b] truncate hidden sm:block">{t.action_drives_sub}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#095c54] group-hover:translate-x-0.5 transition hidden sm:block shrink-0" />
        </button>

        {/* Civic Challenges */}
        <button
          onClick={() => onNavigateTab('challenges')}
          className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#095c54] transition text-left flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2 group touch-press"
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-black text-[#0f2925] whitespace-normal break-words leading-snug">{t.action_challenges_title}</div>
              <div className="text-[9px] sm:text-[10px] text-[#64748b] truncate hidden sm:block">{t.action_challenges_sub}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#095c54] group-hover:translate-x-0.5 transition hidden sm:block shrink-0" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. RECENT REPORTS & WARD SCORES (TWO COLUMNS)            */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Cleanliness Reports */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-[#095c54]">
                {t.nearby_issues_title}
              </h3>
              <p className="text-[11px] text-[#64748b]">
                {t.civic_monitoring}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('complaints')}
              className="text-xs font-extrabold text-[#095c54] hover:underline"
            >
              {t.view_details} →
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
                    <ComplaintEvidenceImage
                      src={issue.image_url}
                      alt="report"
                      categoryName={issue.category_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0f2925] truncate">
                      {issue.category_name}
                    </div>
                    <div className="text-[11px] text-[#64748b] truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#095c54] shrink-0" />
                      <span className="truncate">{issue.address}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                    issue.status === 'resolved'
                      ? 'bg-[#ecfdf5] text-[#047857]'
                      : issue.status === 'in_progress'
                      ? 'bg-[#f0f9ff] text-[#0284c7]'
                      : 'bg-[#fef3c7] text-[#b45309]'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {issue.status === 'resolved' ? t.tab_resolved : issue.status === 'in_progress' ? t.tab_in_progress : t.tab_submitted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ward Cleanliness Index Leaderboard */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-[#095c54]">
                {t.ward_scores_title}
              </h3>
              <p className="text-[11px] text-[#64748b]">
                {t.app_subtitle}
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

        </div>
      </div>
    </div>
  );
};
