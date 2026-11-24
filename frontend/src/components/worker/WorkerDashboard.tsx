import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  Clock,
  MapPin,
  Camera,
  FileCheck2,
  Bell,
  TrendingUp,
  User,
  LifeBuoy,
  Menu,
  X,
  LogOut,
  Crown,
  Globe,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Profile, WorkerProfile, WorkerDashboardSummary, WorkAssignment } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { api } from '../../services/api.js';
import { SwachhSetuLogo, SwachhSetuIcon } from '../SwachhSetuLogo.js';

// 5 Tab Components
import { WorkerOverview } from './WorkerOverview.js';
import { AssignWorkView } from './AssignWorkView.js';
import { WorkHistoryView } from './WorkHistoryView.js';
import { WorkerNotifications } from './WorkerNotifications.js';
import { WorkerProfileView } from './WorkerProfileView.js';
import { LocationMonitor } from '../common/LocationMonitor.js';
import { OfflineSyncBanner } from '../common/OfflineSyncBanner.js';

interface WorkerDashboardProps {
  user: Profile;
  lang: Language;
  setLang: (lang: Language) => void;
  onLogout: () => void;
  onSwitchToCitizenView: () => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  user,
  lang,
  setLang,
  onLogout,
  onSwitchToCitizenView
}) => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [targetTaskId, setTargetTaskId] = useState<string | undefined>(undefined);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [summary, setSummary] = useState<WorkerDashboardSummary | null>(null);
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const t = translations[lang];

  const loadWorkerData = async () => {
    try {
      const [profRes, sumRes, assignRes] = await Promise.all([
        api.getWorkerProfile().catch(() => ({ data: null })),
        api.getWorkerDashboardSummary().catch(() => ({ data: null })),
        api.getWorkerAssignments().catch(() => ({ data: [], count: 0 }))
      ]);

      if (profRes.data) setWorkerProfile(profRes.data);
      if (sumRes.data) setSummary(sumRes.data);
      if (assignRes.data) setAssignments(assignRes.data);
    } catch (err) {
      console.error('Failed to load Worker dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerData();
  }, []);

  const handleNavigateTab = (tabId: string, assignmentId?: string) => {
    // Map legacy / sub-actions cleanly to the 5 primary tabs
    if (tabId === 'overview') {
      setActiveTab('home');
    } else if (
      tabId === 'daily_work' ||
      tabId === 'assignments' ||
      tabId === 'team' ||
      tabId === 'attendance' ||
      tabId === 'work_map' ||
      tabId === 'evidence' ||
      tabId === 'completion_reports' ||
      tabId === 'assign_work'
    ) {
      setActiveTab('assign_work');
    } else if (tabId === 'profile' || tabId === 'profile_settings') {
      setActiveTab('profile_settings');
    } else {
      setActiveTab(tabId);
    }

    if (assignmentId) {
      setTargetTaskId(assignmentId);
    }
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLeader = assignments.some(a => a.is_temporary_leader && a.status !== 'verified_complete' && a.status !== 'closed');
  const displayName = workerProfile?.full_name || user.full_name || 'Field Worker';
  const displayWard = workerProfile?.ward_number || (user as any)?.ward_number || 3;
  const displayDesignation = workerProfile?.designation_name || 'Sanitation Worker';
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FW';

  // Dynamic 5 Tabs in Main Navigation
  const navItems = [
    { id: 'home', label: t.wrk_nav_home, icon: LayoutDashboard },
    {
      id: 'assign_work',
      label: t.wrk_nav_assign_work,
      icon: Briefcase,
      badge: isLeader ? 'Leader' : undefined
    },
    { id: 'work_history', label: t.wrk_nav_work_history, icon: FileCheck2 },
    { id: 'notifications', label: t.wrk_nav_notifications, icon: Bell },
    { id: 'profile_settings', label: t.wrk_nav_profile, icon: User }
  ];

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-[#0f2925] flex antialiased selection:bg-[#e6f4f1] selection:text-[#095c54] overflow-x-clip">
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-68 bg-white border-r border-slate-200/80 h-screen sticky top-0 z-30 select-none">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <SwachhSetuIcon size={36} />
            </div>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-[#0f2925] text-base tracking-tight">{t.app_title}</span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#f0f7f5] text-[#095c54] border border-[#cde6df]">
                  {t.nmc_label}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                {t.field_worker_portal}
              </p>
            </div>
          </div>
        </div>

        {/* 5 Navigation Tabs List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigateTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-[13px] transition duration-150 ${
                  isActive
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0f2925]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#f0f7f5] text-[#095c54] border border-[#cde6df]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Identity Box & Logout */}
        <div className="p-3.5 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f0f7f5] border border-[#cde6df]">
            <div className="w-9 h-9 rounded-lg bg-[#095c54] text-white flex items-center justify-center shrink-0 font-bold text-xs">
              {displayInitials}
            </div>
            <div className="min-w-0 leading-tight">
              <h4 className="text-xs font-bold text-[#0f2925] truncate">
                {displayName}
              </h4>
              <p className="text-[11px] font-medium text-[#095c54] truncate mt-0.5">
                {displayDesignation} · Ward {displayWard}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition border border-slate-200/80"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav_logout}</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="min-h-[3.75rem] bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 shrink-0 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#095c54] shrink-0" />
              <div className="leading-tight min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#0f2925] tracking-tight block truncate">
                  NMC Field Operations
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium block sm:inline">
                  Ward {displayWard}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] sm:text-xs font-semibold">
              {(['en', 'gu', 'hi'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-1.5 sm:px-2 py-1 rounded-md uppercase text-[10px] font-bold transition ${
                    lang === l ? 'bg-white text-[#095c54] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {l === 'en' ? 'EN' : l === 'gu' ? 'ગુજ' : 'हिं'}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => handleNavigateTab('notifications')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 relative transition border border-transparent hover:border-slate-200 shrink-0"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Profile Pill */}
            <div
              onClick={() => handleNavigateTab('profile_settings')}
              className="flex items-center gap-2 px-1.5 sm:px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:border-[#095c54]/40 transition shrink-0"
            >
              <div className="w-7 h-7 rounded-lg bg-[#095c54] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                {displayInitials}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <span className="block text-xs font-bold text-[#0f2925] truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="block text-[10px] font-medium text-slate-500 truncate">
                  {displayDesignation}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Continuous Location Monitoring & Offline Evidence Auto-Sync */}
        <LocationMonitor roleLabel="Sanitation Worker" />
        <OfflineSyncBanner onSynced={loadWorkerData} />

        {/* Dynamic Main Body (Safe-area bottom padding for mobile nav) */}
        <main className="flex-1 px-3 py-3.5 sm:p-6 lg:p-7 max-w-6xl w-full mx-auto pb-[max(6.25rem,calc(5.25rem+env(safe-area-inset-bottom,0px)))] lg:pb-8 space-y-5 min-w-0">
          {activeTab === 'home' && (
            <WorkerOverview
              profile={workerProfile}
              summary={summary}
              assignments={assignments}
              onNavigateTab={handleNavigateTab}
              lang={lang}
            />
          )}

          {activeTab === 'assign_work' && (
            <AssignWorkView
              assignments={assignments.filter(
                a => !['verified_complete', 'closed', 'resolved'].includes(String(a.status || '').toLowerCase())
              )}
              profile={workerProfile}
              lang={lang}
              initialTaskId={targetTaskId}
              onRefresh={loadWorkerData}
            />
          )}

          {activeTab === 'work_history' && (
            <WorkHistoryView
              assignments={assignments}
              profile={workerProfile}
              lang={lang}
            />
          )}

          {activeTab === 'notifications' && (
            <WorkerNotifications
              onNavigateTab={handleNavigateTab}
              lang={lang}
            />
          )}

          {activeTab === 'profile_settings' && (
            <WorkerProfileView
              profile={workerProfile}
              lang={lang}
              setLang={setLang}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation (Visible on mobile/tablet <lg) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-5 gap-0.5 max-w-lg mx-auto">
            {/* 1. Home */}
            <button
              onClick={() => handleNavigateTab('home')}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition min-w-0 ${
                activeTab === 'home' ? 'bg-[#f0f7f5] text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className={`text-[10px] mt-0.5 truncate max-w-full ${activeTab === 'home' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_home}
              </span>
            </button>

            {/* 2. Assign Work */}
            <button
              onClick={() => handleNavigateTab('assign_work')}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition relative min-w-0 ${
                activeTab === 'assign_work' ? 'bg-[#f0f7f5] text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Briefcase className="w-5 h-5 shrink-0" />
                {isLeader && (
                  <span className="absolute -top-1 -right-2 text-[8px] bg-amber-400 text-slate-950 font-black px-1 rounded-full">
                    👑
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 truncate max-w-full ${activeTab === 'assign_work' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_assign_work}
              </span>
            </button>

            {/* 3. History */}
            <button
              onClick={() => handleNavigateTab('work_history')}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition min-w-0 ${
                activeTab === 'work_history' ? 'bg-[#f0f7f5] text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-5 h-5 shrink-0" />
              <span className={`text-[10px] mt-0.5 truncate max-w-full ${activeTab === 'work_history' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_work_history}
              </span>
            </button>

            {/* 4. Notifications */}
            <button
              onClick={() => handleNavigateTab('notifications')}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition relative min-w-0 ${
                activeTab === 'notifications' ? 'bg-[#f0f7f5] text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Bell className="w-5 h-5 shrink-0" />
              <span className={`text-[10px] mt-0.5 truncate max-w-full ${activeTab === 'notifications' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_notifications}
              </span>
            </button>

            {/* 5. Profile */}
            <button
              onClick={() => handleNavigateTab('profile_settings')}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition min-w-0 ${
                activeTab === 'profile_settings' ? 'bg-[#f0f7f5] text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-5 h-5 shrink-0" />
              <span className={`text-[10px] mt-0.5 truncate max-w-full ${activeTab === 'profile_settings' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_profile}
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* 3. Mobile Navigation Drawer (<lg) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col justify-between p-4 overflow-y-auto animate-fadeIn">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <SwachhSetuIcon size={32} />
                  <div className="leading-tight">
                    <span className="font-black text-[#095c54] text-sm block">{t.app_title}</span>
                    <span className="text-[9px] font-bold text-[#047857] uppercase tracking-wider">{t.field_worker_portal}</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
                        isActive
                          ? 'bg-[#095c54] text-white shadow-sm'
                          : 'text-[#64748b] hover:bg-[#f8faf9] hover:text-[#0f2925]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#e2e8f0] space-y-2.5">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#e6f4f1] border border-[#99f6e4]">
                <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="min-w-0 leading-tight">
                  <h4 className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                    {displayName}
                  </h4>
                  <p className="text-[11px] font-bold text-[#0d9488] truncate mt-0.5">
                    {displayDesignation} · Ward {displayWard}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.nav_logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
