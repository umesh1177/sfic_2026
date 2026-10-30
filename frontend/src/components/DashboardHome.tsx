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
  ChevronRight
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
  const municipalStats = dashboardData?.municipal_stats || {
    city_total_complaints: 142,
    city_resolved_complaints: 118,
    city_average_resolution_hours: 18.5,
    total_active_drives: 3,
    active_volunteers: 480
  };
  const nearbyIssues = dashboardData?.nearby_issues || [];
  const wardScores = dashboardData?.ward_scores || [];
  const communityImpact = dashboardData?.community_impact || {
    drives_joined: 1,
    rewards_earned: 3,
    active_challenges: 1,
    civic_points: 850
  };

  const currentDateFormatted = new Date().toLocaleDateString(
    lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. HERO & WELCOME BANNER                                 */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#095c54] via-[#0d6e65] to-[#10b981] p-6 sm:p-8 text-white shadow-xl shadow-[#095c54]/15 overflow-hidden">
        {/* Decorative circle glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-[#e6f4f1]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            NMC Swachhata Command Center · Navsari
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {t.welcome_back} {user?.full_name ? user.full_name.split(' ')[0] : 'Citizen'}!
          </h1>

          <p className="text-xs sm:text-sm text-[#e6f4f1] font-medium leading-relaxed">
            Together we monitor, report, and maintain the cleanliness of all 13 Navsari wards. Check your civic action summary for <span className="font-bold underline decoration-[#a7f3d0]">{currentDateFormatted}</span>.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={onOpenReport}
              className="px-5 py-2.5 rounded-2xl bg-white text-[#095c54] font-black text-xs sm:text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#10b981]" />
              <span>{t.action_report}</span>
            </button>
            <button
              onClick={() => onNavigateTab('complaints')}
              className="px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm hover:bg-white/25 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>{t.action_track}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATS BANNER: DYNAMIC DATABASE COUNTS                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Submitted */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#b8e0d7] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748b]">
            <span>{t.stats_total}</span>
            <div className="p-2 rounded-xl bg-[#e6f4f1] text-[#095c54]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-2">
            {stats.total_submitted}
          </div>
          <span className="text-[11px] font-bold text-[#095c54] mt-1 block">
            Your personal reports
          </span>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#fde68a] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748b]">
            <span>{t.stats_pending}</span>
            <div className="p-2 rounded-xl bg-[#fef3c7] text-[#d97706]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#d97706] mt-2">
            {stats.pending}
          </div>
          <span className="text-[11px] font-bold text-[#b45309] mt-1 block">
            Awaiting ward officer review
          </span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#bae6fd] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748b]">
            <span>{t.stats_in_progress}</span>
            <div className="p-2 rounded-xl bg-[#e0f2fe] text-[#0284c7]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0284c7] mt-2">
            {stats.in_progress}
          </div>
          <span className="text-[11px] font-bold text-[#0369a1] mt-1 block">
            Sanitation units dispatched
          </span>
        </div>

        {/* Resolved */}
        <div
          onClick={() => onNavigateTab('complaints')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#a7f3d0] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#64748b]">
            <span>{t.stats_resolved}</span>
            <div className="p-2 rounded-xl bg-[#ecfdf5] text-[#10b981]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#10b981] mt-2">
            {stats.resolved}
          </div>
          <span className="text-[11px] font-bold text-[#047857] mt-1 block">
            Cleaned and verified
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. QUICK ACTIONS GRID                                    */}
      {/* ======================================================== */}
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#095c54] mb-3">
          {t.quick_actions}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Action 1: Report */}
          <button
            onClick={onOpenReport}
            className="p-4 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#095c54] hover:shadow-md transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center group-hover:scale-105 transition">
              <Camera className="w-5 h-5" />
            </div>
            <span className="block font-bold text-xs sm:text-sm text-[#0f2925] mt-2.5">
              {t.action_report}
            </span>
            <span className="block text-[11px] text-[#64748b] mt-0.5">
              AI camera & GPS
            </span>
          </button>

          {/* Action 2: Track */}
          <button
            onClick={() => onNavigateTab('complaints')}
            className="p-4 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#095c54] hover:shadow-md transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0f6f4] text-[#095c54] flex items-center justify-center group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="block font-bold text-xs sm:text-sm text-[#0f2925] mt-2.5">
              {t.action_track}
            </span>
            <span className="block text-[11px] text-[#64748b] mt-0.5">
              View live progress
            </span>
          </button>

          {/* Action 3: Cleanliness Map */}
          <button
            onClick={() => onNavigateTab('map')}
            className="p-4 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#095c54] hover:shadow-md transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center group-hover:scale-105 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="block font-bold text-xs sm:text-sm text-[#0f2925] mt-2.5">
              {t.action_map}
            </span>
            <span className="block text-[11px] text-[#64748b] mt-0.5">
              13 Wards & Hotspots
            </span>
          </button>

          {/* Action 4: Cleanliness Drives */}
          <button
            onClick={() => onNavigateTab('drives')}
            className="p-4 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#095c54] hover:shadow-md transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center group-hover:scale-105 transition">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="block font-bold text-xs sm:text-sm text-[#0f2925] mt-2.5">
              {t.action_drives}
            </span>
            <span className="block text-[11px] text-[#64748b] mt-0.5">
              Volunteer RSVP
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SPLIT PANEL: RECENT REPORTS & WARD LEADERBOARD        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recent Public Cleanliness Reports in Navsari */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-[#095c54] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              {t.nearby_issues_title}
            </h3>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs font-bold text-[#095c54] hover:underline flex items-center gap-1"
            >
              Explore Map <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#e2e8f0]">
            {nearbyIssues.map((issue: any) => (
              <div
                key={issue.id}
                onClick={() => onNavigateTab('complaints')}
                className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded-2xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={issue.image_url}
                    alt={issue.category_name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#e2e8f0]"
                  />
                  <div>
                    <div className="font-extrabold text-xs text-[#0f2925]">
                      {issue.category_name}
                    </div>
                    <div className="text-[11px] text-[#64748b]">
                      📍 {issue.ward_name} · {issue.address}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    issue.status === 'resolved' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#e6f4f1] text-[#095c54]'
                  }`}>
                    {issue.status}
                  </span>
                  <span className="block text-[10px] text-[#94a3b8] mt-1">
                    {new Date(issue.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Ward Cleanliness Scores */}
        <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#095c54] flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#d97706]" />
              {t.ward_scores_title}
            </h3>
            <span className="text-[11px] text-[#64748b]">Out of 10</span>
          </div>

          <div className="space-y-2.5">
            {wardScores.slice(0, 5).map((w: any) => (
              <div key={w.ward_number} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#0f2925]">
                    Ward {w.ward_number}: {w.ward_name.split('-')[0]}
                  </div>
                  <div className="text-[10px] text-[#64748b]">
                    Officer: {w.officer}
                  </div>
                </div>
                <span className="font-black text-xs px-2.5 py-0.5 rounded-lg bg-[#e6f4f1] text-[#095c54]">
                  {w.score} ★
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#e2e8f0]">
            <button
              onClick={() => onNavigateTab('map')}
              className="w-full text-center text-xs font-bold text-[#095c54] hover:underline"
            >
              View all 13 Ward Scores & Officers →
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. COMMUNITY IMPACT SUMMARY                              */}
      {/* ======================================================== */}
      <div className="bg-[#f0f6f4] p-5 rounded-3xl border border-[#b8e0d7] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-[#095c54] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#10b981]" />
            {t.community_impact_title}
          </h3>
          <p className="text-xs text-[#0d6e65] mt-0.5">
            Your verified contributions to Navsari cleanliness initiatives.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-[10px] font-bold text-[#64748b] block">Drives Joined</span>
            <span className="text-lg font-black text-[#095c54]">{communityImpact.drives_joined}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-[#64748b] block">Badges</span>
            <span className="text-lg font-black text-[#095c54]">{communityImpact.rewards_earned}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-[#64748b] block">{t.points_earned}</span>
            <span className="text-lg font-black text-[#d97706]">{communityImpact.civic_points}</span>
          </div>
          <button
            onClick={() => onNavigateTab('rewards')}
            className="btn-primary-custom px-3 py-1.5 text-xs font-bold"
          >
            View Badges
          </button>
        </div>
      </div>
    </div>
  );
};
