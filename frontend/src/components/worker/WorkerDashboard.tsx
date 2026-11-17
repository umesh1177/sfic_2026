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
import { RewardsRecognition } from '../RewardsRecognition.js';

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

  const isLeader = assignments.some(a => a.is_temporary_leader);

  // Main Navigation Tabs
  const navItems = [
    { id: 'home', label: t.wrk_nav_home, icon: LayoutDashboard },
    {
      id: 'assign_work',
      label: t.wrk_nav_assign_work,
      icon: Briefcase,
      badge: isLeader ? '👑 Leader' : undefined
    },
    { id: 'work_history', label: t.wrk_nav_work_history, icon: FileCheck2 },
    { id: 'posts', label: lang === 'gu' ? 'સ્વચ્છતા પોસ્ટ્સ' : lang === 'hi' ? 'स्वच्छता पोस्ट्स' : 'Posts & Spotlights', icon: Sparkles },
    { id: 'notifications', label: t.wrk_nav_notifications, icon: Bell },
    { id: 'profile_settings', label: t.wrk_nav_profile, icon: User }
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased selection:bg-[#e6f4f1] selection:text-[#095c54]">
      {/* 1. DESKTOP SIDEBAR */}
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
                {t.field_worker_portal}
              </p>
            </div>
          </div>
        </div>

        {/* 5 Navigation Tabs List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigateTab(item.id)}
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
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Identity Box & Logout */}
        <div className="p-3.5 border-t border-[#f1f5f9] space-y-2.5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#e6f4f1] border border-[#99f6e4] shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0 leading-tight">
              <h4 className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                {workerProfile?.full_name || user.full_name || 'Kanti Solanki'}
              </h4>
              <p className="text-[11px] font-bold text-[#0d9488] truncate mt-0.5">
                {workerProfile?.designation_name || 'Sanitation Worker'} · Ward {workerProfile?.ward_number || 3}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition border border-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav_logout}</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="leading-tight truncate">
                <span className="text-xs sm:text-sm font-black text-[#0f2925] tracking-tight block sm:inline truncate">
                  NMC · Field Operations
                </span>
                <span className="text-[11px] text-slate-500 font-bold hidden md:inline ml-2">
                  · Ward {workerProfile?.worker_code?.includes('008') ? 8 : 3}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl text-xs font-bold">
              {(['en', 'gu', 'hi'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 sm:py-1 rounded-lg uppercase text-[10px] sm:text-[11px] font-black transition ${
                    lang === l ? 'bg-[#095c54] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {l === 'en' ? 'EN' : l === 'gu' ? 'ગુજ' : 'हिं'}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => handleNavigateTab('notifications')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 relative transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Profile Pill */}
            <div
              onClick={() => handleNavigateTab('profile_settings')}
              className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-[#e6f4f1] border border-[#b8e0d7] cursor-pointer hover:border-[#095c54] transition shadow-xs"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                {workerProfile?.full_name ? workerProfile.full_name.slice(0, 2).toUpperCase() : 'KW'}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <span className="block text-xs font-black text-[#095c54] truncate max-w-[110px]">
                  {workerProfile?.full_name || user.full_name || 'Kanti Solanki'}
                </span>
                <span className="block text-[10px] font-bold text-[#047857] truncate">
                  🛠️ {workerProfile?.designation_name || 'Worker'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body (Padded pb-24 for mobile bottom bar) */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8 space-y-6">
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
              assignments={assignments}
              profile={workerProfile}
              lang={lang}
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

          {activeTab === 'posts' && (
            <RewardsRecognition lang={lang} />
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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] py-1.5 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* 1. Home */}
            <button
              onClick={() => handleNavigateTab('home')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'home' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'home' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_home}
              </span>
            </button>

            {/* 2. Assign Work */}
            <button
              onClick={() => handleNavigateTab('assign_work')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${
                activeTab === 'assign_work' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Briefcase className="w-5 h-5" />
                {isLeader && (
                  <span className="absolute -top-1 -right-2 text-[8px] bg-amber-400 text-slate-950 font-black px-1 rounded-full">
                    👑
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${activeTab === 'assign_work' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_assign_work}
              </span>
            </button>

            {/* 3. History */}
            <button
              onClick={() => handleNavigateTab('work_history')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'work_history' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'work_history' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_work_history}
              </span>
            </button>

            {/* 4. Notifications */}
            <button
              onClick={() => handleNavigateTab('notifications')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${
                activeTab === 'notifications' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'notifications' ? 'font-black' : 'font-semibold'}`}>
                {t.wrk_nav_notifications}
              </span>
            </button>

            {/* 5. Profile */}
            <button
              onClick={() => handleNavigateTab('profile_settings')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'profile_settings' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'profile_settings' ? 'font-black' : 'font-semibold'}`}>
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

          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col justify-between p-4 overflow-y-auto animate-fadeIn">
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
                    {workerProfile?.full_name || user.full_name || 'Kanti Solanki'}
                  </h4>
                  <p className="text-[11px] font-bold text-[#0d9488] truncate mt-0.5">
                    {workerProfile?.designation_name || 'Sanitation Worker'} · Ward {workerProfile?.ward_number || 3}
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
