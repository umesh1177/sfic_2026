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
  ArrowRightLeft,
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

  // Strictly 5 Tabs in Main Navigation
  const navItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    {
      id: 'assign_work',
      label: 'Assign Work',
      icon: Briefcase,
      badge: assignments.some(a => a.is_temporary_leader) ? '👑 Leader' : undefined
    },
    { id: 'work_history', label: 'Work History', icon: FileCheck2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile_settings', label: 'Profile & Settings', icon: User }
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased selection:bg-[#e6f4f1] selection:text-[#095c54]">
      {/* 1. DESKTOP SIDEBAR (Identical to Ward Officer & Community Head) */}
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
                FIELD WORKER PORTAL
              </p>
            </div>
          </div>
        </div>

        {/* Worker Verified Identity Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
              {workerProfile?.full_name ? workerProfile.full_name.slice(0, 2).toUpperCase() : 'KW'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-[#0f2925] truncate">
                {workerProfile?.full_name || 'Kanti Solanki'}
              </p>
              <p className="text-[10px] text-[#047857] font-bold truncate">
                🛠️ {workerProfile?.designation_name || 'Drainage Worker'}
              </p>
              <span className="text-[9px] font-mono text-slate-500">
                {workerProfile?.worker_code || 'NMC-WRK-001'} · Ward 3
              </span>
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

        {/* Sidebar Footer: Switcher & Logout */}
        <div className="p-4 border-t border-[#f1f5f9] space-y-2">
          <button
            onClick={onSwitchToCitizenView}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition border border-slate-200"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#095c54]" />
            <span>Switch to Citizen View</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition border border-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="leading-tight">
                <span className="text-xs font-black text-[#0f2925] tracking-tight">
                  Navsari Municipal Corporation
                </span>
                <span className="text-[11px] text-slate-500 font-bold hidden sm:inline ml-2">
                  · Ward 3 Field Worker Operations
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              {(['en', 'gu', 'hi'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-lg uppercase text-[11px] font-black transition ${
                    lang === l ? 'bg-[#095c54] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => handleNavigateTab('notifications')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 relative transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Profile Pill */}
            <div
              onClick={() => handleNavigateTab('profile_settings')}
              className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-[#e6f4f1] border border-[#b8e0d7] cursor-pointer hover:border-[#095c54] transition shadow-xs"
            >
              <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                {workerProfile?.full_name ? workerProfile.full_name.slice(0, 2).toUpperCase() : 'KW'}
              </div>
              <div className="text-left leading-tight hidden xs:block">
                <span className="block text-xs font-black text-[#095c54] truncate max-w-[120px]">
                  {workerProfile?.full_name || user.full_name || 'Kanti Solanki'}
                </span>
                <span className="block text-[10px] font-bold text-[#047857] truncate">
                  🛠️ {workerProfile?.designation_name || 'Drainage Worker'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Horizontal Fast-Switch Tab Strip (<lg) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2 px-3 bg-white border-t border-[#e2e8f0] scrollbar-none text-xs">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigateTab(item.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'bg-[#f8faf9] text-[#64748b] border border-[#e2e8f0] hover:text-[#0f2925]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-900 font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
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
                    <span className="font-black text-[#095c54] text-sm block">Swachh Setu</span>
                    <span className="text-[9px] font-bold text-[#047857] uppercase tracking-wider">Field Worker Portal</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Worker Mini Profile */}
              <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
                <p className="font-extrabold text-sm text-[#0f2925]">{workerProfile?.full_name || 'Kanti Solanki'}</p>
                <p className="text-xs text-[#047857] font-semibold">{workerProfile?.designation_name || 'Drainage Worker'}</p>
                <p className="text-[11px] text-[#64748b] font-mono mt-0.5">{workerProfile?.worker_code || 'NMC-WRK-001'}</p>
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

            <div className="pt-4 border-t border-[#e2e8f0] space-y-2">
              <button
                onClick={onSwitchToCitizenView}
                className="w-full py-2.5 bg-[#f8faf9] hover:bg-[#e6f4f1] border border-[#e2e8f0] text-[#0f2925] text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#095c54]" />
                <span>Switch to Citizen View</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

