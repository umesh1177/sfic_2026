import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  MessageSquare,
  Bell,
  Image as ImageIcon,
  ShieldCheck,
  TrendingUp,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
  ArrowRightLeft,
  ChevronRight,
  Globe,
  PlusCircle,
  HelpCircle,
  ExternalLink,
  HeartHandshake
} from 'lucide-react';
import { Profile, CommunityDashboardSummary, CommunityActivity } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { api } from '../../services/api.js';
import { SwachhSetuLogo, SwachhSetuIcon } from '../SwachhSetuLogo.js';

// Tab Components
import { CommunityOverview } from './CommunityOverview.js';
import { MyCommunityProfile } from './MyCommunityProfile.js';
import { ActivityManagement } from './ActivityManagement.js';
import { CommunityWardProblemsView } from './CommunityWardProblemsView.js';
import { EventRegistrations } from './EventRegistrations.js';
import { CitizenQuestions } from './CitizenQuestions.js';
import { EventNotifications } from './EventNotifications.js';
import { EventGalleryEvidence } from './EventGalleryEvidence.js';
import { ApprovalTracking } from './ApprovalTracking.js';
import { CommunityAnalytics } from './CommunityAnalytics.js';
import { CommunityNotifications } from './CommunityNotifications.js';
import { CommunitySettings } from './CommunitySettings.js';

const buildDynamicInitialSummary = (user: Profile): CommunityDashboardSummary => ({
  community: {
    id: user?.id || 'comm-lead',
    community_name: user?.full_name ? `${user.full_name}'s Community Team` : 'Navsari Cleanliness Initiative',
    organisation_type: 'Resident Welfare Association',
    registration_number: `NMC-RWA-2026-0${user?.ward_number || 3}`,
    description: 'Civic cleanliness and local environmental action group.',
    logo_path: user?.avatar_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=256&q=80',
    address: user?.address || `Ward ${user?.ward_number || 3}, Navsari`,
    locality: user?.locality || `Ward ${user?.ward_number || 3}`,
    ward_id: `ward-0${user?.ward_number || 3}`,
    ward_number: user?.ward_number || 3,
    ward_name: `Ward ${user?.ward_number || 3}`,
    contact_phone: user?.phone || '',
    contact_email: user?.email || '',
    created_by: user?.id || '',
    head_name: user?.full_name || 'Community Leader',
    verification_status: 'verified',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  metrics: {
    total_activities: 0,
    upcoming_activities: 0,
    completed_activities: 0,
    awaiting_evidence_activities: 0,
    total_registrations: 0,
    verified_participants: 0,
    volunteer_attendance_rate: 0,
    unanswered_citizen_questions: 0
  },
  upcoming_activities: [],
  pending_actions: {
    activities_requiring_edits: [],
    activities_awaiting_approval: [],
    unanswered_questions: [],
    evidence_pending: []
  },
  impact: {
    verified_activities_count: 0,
    verified_participants_count: 0,
    total_cleanliness_hours: 0,
    monthly_trend: [],
    ward_distribution: []
  }
});

interface CommunityHeadDashboardProps {
  user: Profile;
  lang: Language;
  setLang: (lang: Language) => void;
  onLogout: () => void;
  onSwitchToCitizenView: () => void;
}

export const CommunityHeadDashboard: React.FC<CommunityHeadDashboardProps> = ({
  user,
  lang,
  setLang,
  onLogout,
  onSwitchToCitizenView
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [dashboardSummary, setDashboardSummary] = useState<CommunityDashboardSummary | null>(() => buildDynamicInitialSummary(user));
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [openCreateWizardDirectly, setOpenCreateWizardDirectly] = useState<boolean>(false);

  const t = translations[lang];

  const loadData = async () => {
    try {
      const [sumRes, actRes] = await Promise.all([
        api.getCommunityDashboardSummary().catch(() => ({ data: null })),
        api.getCommunityActivities().catch(() => ({ data: [] }))
      ]);

      if (sumRes.data) {
        setDashboardSummary(sumRes.data);
      } else if (!dashboardSummary) {
        setDashboardSummary(buildDynamicInitialSummary(user));
      }
      if (actRes.data && actRes.data.length > 0) {
        setActivities(actRes.data);
        if (!selectedActivityId) {
          setSelectedActivityId(actRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load Community Head data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const navItems: { id: string; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: t.ch_nav_overview, icon: LayoutDashboard },
    { id: 'activities', label: t.ch_nav_activities, icon: Calendar },
    { id: 'ward_problems', label: t.ch_nav_ward_problems, icon: HeartHandshake },
    { id: 'community', label: t.ch_nav_community, icon: Building2 },
    { id: 'analytics', label: t.ch_nav_analytics, icon: TrendingUp },
    { id: 'notifications', label: t.ch_nav_notifications, icon: Bell },
    { id: 'settings', label: t.ch_nav_settings, icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased selection:bg-[#e6f4f1] selection:text-[#095c54]">
      {/* DESKTOP SIDEBAR (Visible on lg: screens) */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-[#e2e8f0] h-screen sticky top-0 z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="shrink-0 transition-transform hover:scale-105 duration-200">
              <SwachhSetuIcon size={38} />
            </div>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-black text-[#095c54] text-base tracking-tight">{t.app_title}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#dcfce7] text-[#065f46] border border-[#86efac]">
                  {t.nmc_label}
                </span>
              </div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                {t.community_head_portal}
              </p>
            </div>
          </div>
        </div>

        {/* Community Verified Identity Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-900 truncate">
                {dashboardSummary?.community?.community_name || 'Navsari Green Warriors RWA'}
              </p>
              <p className="text-[10px] text-teal-800 font-bold truncate">
                Ward {dashboardSummary?.community?.ward_number || 3} · {dashboardSummary?.community?.locality || 'Navsari'}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Navigation Tabs List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition duration-150 ${
                  isActive
                    ? 'bg-[#095c54] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Switcher & Logout */}
        <div className="p-4 border-t border-[#f1f5f9] space-y-2">
          <button
            onClick={onSwitchToCitizenView}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition border border-slate-200"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#095c54]" />
            <span>{t.action_switch_citizen}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition border border-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav_logout}</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY (Visible on < lg: when open) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SwachhSetuIcon size={32} />
                <div className="leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="font-black text-[#095c54] text-sm">{t.app_title}</span>
                    <span className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-[#e6f4f1] text-[#047857]">{t.nmc_label}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t.community_head_portal}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 mx-3 my-2 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-bold truncate">
              {dashboardSummary?.community?.community_name || 'Navsari Green Warriors RWA'}
            </div>

            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition ${
                      isActive
                        ? 'bg-[#095c54] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onSwitchToCitizenView();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#095c54]" />
                <span>{t.action_switch_citizen}</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.nav_logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOP MUNICIPAL HEADER BAR */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] px-3.5 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Drawer Hamburger */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="leading-tight truncate">
                  <span className="text-xs sm:text-sm font-black text-[#0f2925] tracking-tight block sm:inline truncate">
                    {dashboardSummary?.community?.community_name || 'Community Portal'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold hidden md:inline ml-2">
                    · Ward {dashboardSummary?.community?.ward_number || 3}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Language Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 sm:p-1 text-xs font-bold">
                {(['en', 'gu', 'hi'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-0.5 sm:py-1 rounded-lg uppercase text-[10px] sm:text-[11px] font-black transition ${
                      lang === l ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l === 'en' ? 'EN' : l === 'gu' ? 'ગુજ' : 'हिं'}
                  </button>
                ))}
              </div>

              {/* Bell Alert */}
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {(dashboardSummary?.metrics?.unanswered_citizen_questions || 0) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              {/* Community Head Profile Pill */}
              <div
                onClick={() => setActiveTab('community')}
                className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-[#e6f4f1] border border-[#b8e0d7] cursor-pointer hover:border-[#095c54] transition shadow-xs"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                  {user.full_name?.slice(0, 2).toUpperCase() || 'CH'}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="block text-xs font-black text-[#095c54] truncate max-w-[110px]">
                    {user.full_name}
                  </span>
                  <span className="block text-[10px] font-bold text-[#047857] truncate">
                    🏛️ Community Head
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* TAB CONTENT CONTAINER (Padded pb-24 for mobile bottom bar) */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <CommunityOverview
              summary={dashboardSummary}
              loading={loading}
              onNavigateTab={tab => setActiveTab(tab)}
              onSelectActivity={id => setSelectedActivityId(id)}
              onOpenCreateWizard={() => {
                setActiveTab('activities');
                setOpenCreateWizardDirectly(true);
              }}
            />
          )}

          {/* Tab 2: My Community Profile */}
          {activeTab === 'community' && dashboardSummary?.community && (
            <MyCommunityProfile
              community={dashboardSummary.community}
              onCommunityUpdated={updated =>
                setDashboardSummary(prev => (prev ? { ...prev, community: updated } : null))
              }
            />
          )}

          {/* Tab 3: Activity Management */}
          {(activeTab === 'activities' || activeTab === 'registrations' || activeTab === 'questions' || activeTab === 'announcements' || activeTab === 'evidence' || activeTab === 'approvals') && (
            <ActivityManagement
              activities={activities}
              onRefreshActivities={loadData}
              initialOpenCreateWizard={openCreateWizardDirectly}
              selectedActivityId={selectedActivityId || undefined}
              initialSubTab={
                activeTab === 'questions'
                  ? 'questions'
                  : activeTab === 'evidence'
                  ? 'evidence'
                  : 'registrations'
              }
            />
          )}

          {/* Tab 4: Ward Problems for Community Action */}
          {activeTab === 'ward_problems' && (
            <CommunityWardProblemsView
              community={dashboardSummary?.community || null}
              lang={lang}
              onPlanDriveForProblem={problem => {
                setActiveTab('activities');
                setOpenCreateWizardDirectly(true);
              }}
            />
          )}

          {/* Tab 4: Reports & Analytics */}
          {activeTab === 'analytics' && (
            <CommunityAnalytics summary={dashboardSummary} />
          )}

          {/* Tab 5: Notifications */}
          {activeTab === 'notifications' && (
            <CommunityNotifications onNavigateTab={tab => setActiveTab(tab)} />
          )}

          {/* Tab 6: Settings */}
          {activeTab === 'settings' && (
            <CommunitySettings lang={lang} onLanguageChange={setLang} />
          )}
        </main>

        {/* Mobile Bottom Navigation (Visible on mobile/tablet <lg) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] py-1.5 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* 1. Overview */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'overview' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'overview' ? 'font-black' : 'font-semibold'}`}>
                {t.ch_nav_overview}
              </span>
            </button>

            {/* 2. Activities */}
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${
                activeTab === 'activities' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'activities' ? 'font-black' : 'font-semibold'}`}>
                {t.ch_nav_activities}
              </span>
            </button>

            {/* 3. Ward Problems */}
            <button
              onClick={() => setActiveTab('ward_problems')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'ward_problems' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'ward_problems' ? 'font-black' : 'font-semibold'}`}>
                {t.ch_nav_ward_problems.split(' ')[0]}
              </span>
            </button>

            {/* 4. Community Profile */}
            <button
              onClick={() => setActiveTab('community')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'community' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'community' ? 'font-black' : 'font-semibold'}`}>
                {t.ch_nav_community}
              </span>
            </button>

            {/* 4. Analytics */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'analytics' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'analytics' ? 'font-black' : 'font-semibold'}`}>
                {t.ch_nav_analytics}
              </span>
            </button>

            {/* 5. More (Drawer Trigger) */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                ['notifications', 'settings'].includes(activeTab) ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-semibold">
                {t.nav_more}
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};
