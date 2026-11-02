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
  ExternalLink
} from 'lucide-react';
import { Profile, CommunityDashboardSummary, CommunityActivity } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { api } from '../../services/api.js';
import { SwachhSetuLogo, SwachhSetuIcon } from '../SwachhSetuLogo.js';

// 11 Tab Components
import { CommunityOverview } from './CommunityOverview.js';
import { MyCommunityProfile } from './MyCommunityProfile.js';
import { ActivityManagement } from './ActivityManagement.js';
import { EventRegistrations } from './EventRegistrations.js';
import { CitizenQuestions } from './CitizenQuestions.js';
import { EventNotifications } from './EventNotifications.js';
import { EventGalleryEvidence } from './EventGalleryEvidence.js';
import { ApprovalTracking } from './ApprovalTracking.js';
import { CommunityAnalytics } from './CommunityAnalytics.js';
import { CommunityNotifications } from './CommunityNotifications.js';
import { CommunitySettings } from './CommunitySettings.js';

const DEFAULT_COMMUNITY_SUMMARY: CommunityDashboardSummary = {
  community: {
    id: 'b0000000-0000-0000-0000-000000000001',
    community_name: 'Navsari Green Warriors RWA',
    organisation_type: 'Resident Welfare Association',
    registration_number: 'NMC-RWA-2024-042',
    description: 'Civic action group dedicated to tree planting, stormwater drain preservation, and zero-waste segregation in Dudhiya Talao sector.',
    logo_path: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=256&q=80',
    address: 'Near Dudhiya Talao Lakefront, Sector 3',
    locality: 'Dudhiya Talao Ward 3',
    ward_id: 'ward-03',
    ward_number: 3,
    ward_name: 'Ward 3 - Dudhiya Talao',
    contact_phone: '+919825100099',
    contact_email: 'rajesh.varma@navsarigreen.org',
    created_by: 'c0000000-0000-0000-0000-000000000099',
    head_name: 'Rajesh Varma',
    verification_status: 'verified',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-30T10:00:00Z'
  },
  metrics: {
    total_activities: 8,
    upcoming_activities: 2,
    completed_activities: 5,
    awaiting_evidence_activities: 1,
    total_registrations: 384,
    verified_participants: 342,
    volunteer_attendance_rate: 89.1,
    unanswered_citizen_questions: 1
  },
  upcoming_activities: [],
  pending_actions: {
    activities_requiring_edits: [],
    activities_awaiting_approval: [],
    unanswered_questions: [],
    evidence_pending: []
  },
  impact: {
    verified_activities_count: 5,
    verified_participants_count: 342,
    total_cleanliness_hours: 1040,
    monthly_trend: [
      { month: 'Jul', activities: 1, volunteers: 45, waste_kg: 240 },
      { month: 'Aug', activities: 2, volunteers: 95, waste_kg: 520 },
      { month: 'Sep', activities: 2, volunteers: 88, waste_kg: 480 },
      { month: 'Oct', activities: 3, volunteers: 156, waste_kg: 780 }
    ],
    ward_distribution: [
      { ward_name: 'Ward 3 - Dudhiya Talao', count: 6 },
      { ward_name: 'Ward 4 - Junathana', count: 2 }
    ]
  }
};

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
  const [dashboardSummary, setDashboardSummary] = useState<CommunityDashboardSummary | null>(DEFAULT_COMMUNITY_SUMMARY);
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
        setDashboardSummary(DEFAULT_COMMUNITY_SUMMARY);
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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'activities', label: 'Activity Management', icon: Calendar },
    { id: 'community', label: 'My Community', icon: Building2 },
    { id: 'analytics', label: 'Reports & Analytics', icon: TrendingUp },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
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
                <span className="font-black text-[#095c54] text-base tracking-tight">Swachh Setu</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#dcfce7] text-[#065f46] border border-[#86efac]">
                  NMC
                </span>
              </div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                COMMUNITY HEAD PORTAL
              </p>
            </div>
          </div>
        </div>

        {/* Community Verified Identity Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-900 truncate">
                {dashboardSummary?.community?.community_name || 'Navsari Green Warriors RWA'}
              </p>
              <p className="text-[10px] text-teal-800 font-bold truncate">
                Ward 3 · Dudhiya Talao
              </p>
            </div>
          </div>
        </div>

        {/* 11 Navigation Tabs List */}
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

        {/* Sidebar Footer: Logout */}
        <div className="p-4 border-t border-[#f1f5f9]">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition border border-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
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

          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SwachhSetuIcon size={32} />
                <div className="leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="font-black text-[#095c54] text-sm">Swachh Setu</span>
                    <span className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-[#e6f4f1] text-[#047857]">NMC</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Community Head</p>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 mx-3 my-2 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-bold">
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

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOP MUNICIPAL HEADER BAR */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile Drawer Hamburger */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5">
              {/* Language Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
                {(['en', 'gu', 'hi'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-1 rounded-lg uppercase transition ${
                      lang === l ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Bell Alert */}
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Bell className="w-4 h-4" />
                {(dashboardSummary?.metrics?.unanswered_citizen_questions || 0) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              {/* Community Head Profile Pill (Matching Citizen Gold Standard) */}
              <div
                onClick={() => setActiveTab('community')}
                className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-[#e6f4f1] border border-[#b8e0d7] cursor-pointer hover:border-[#095c54] transition shadow-xs"
              >
                <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                  {user.full_name?.slice(0, 2).toUpperCase() || 'CH'}
                </div>
                <div className="text-left leading-tight hidden xs:block">
                  <span className="block text-xs font-black text-[#095c54] truncate max-w-[120px]">
                    {user.full_name}
                  </span>
                  <span className="block text-[10px] font-bold text-[#047857] truncate">
                    🏛️ Community Head
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Horizontal Fast-Switch Tab Strip (<lg) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 px-3 bg-white border-t border-[#e2e8f0] scrollbar-none text-xs -mx-4 sm:-mx-6 lg:-mx-8">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : 'bg-[#f8faf9] text-[#64748b] hover:text-[#095c54] border border-[#e2e8f0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white text-[#095c54]' : 'bg-[#e6f4f1] text-[#095c54]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* TAB CONTENT CONTAINER */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-16">
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

          {/* Tab 2: Activity Management (Unified Hub for Registrations, Citizen Q&A, Evidence & Status Tracking) */}
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

          {/* Tab 9: Reports & Analytics */}
          {activeTab === 'analytics' && (
            <CommunityAnalytics summary={dashboardSummary} />
          )}

          {/* Tab 10: Notifications */}
          {activeTab === 'notifications' && (
            <CommunityNotifications onNavigateTab={tab => setActiveTab(tab)} />
          )}

          {/* Tab 11: Settings */}
          {activeTab === 'settings' && (
            <CommunitySettings lang={lang} onLanguageChange={setLang} />
          )}
        </main>
      </div>
    </div>
  );
};

