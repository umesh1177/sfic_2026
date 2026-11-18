import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Wrench,
  Users,
  UserCheck,
  Calendar,
  ShieldCheck,
  Megaphone,
  Award,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Sparkles,
  ArrowRightLeft,
  HeartHandshake,
  BrainCircuit
} from 'lucide-react';
import { Profile } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { SwachhSetuIcon } from '../SwachhSetuLogo.js';
import { api } from '../../services/api.js';

const NAVSARI_WARD_NAMES: Record<number, string> = {
  1: 'Lunsikui - Tower Road',
  2: 'Station Road - Fuwara',
  3: 'Dudhiya Talao - Ashapuri',
  4: 'Kaliawadi - Sayaji Road',
  5: 'Jalalpore Road - Shanta Devi',
  6: 'Vijalpore North - Eru Char Rasta',
  7: 'Vijalpore South - GIDC',
  8: 'Madhumati - Parsi Wad',
  9: 'Sandhkuva - Junathana',
  10: 'Chhapra Road - Vejalpore',
  11: 'Vansda Road - Italva',
  12: 'Mahuva Highway - Chikhli Approach',
  13: 'Dandi Coastal Corridor'
};

// Internal Tab Views
import { WardOverview } from './WardOverview.js';
import { ComplaintCatalogue } from './ComplaintCatalogue.js';
import { HotspotsMap } from './HotspotsMap.js';
import { WorkAssignmentsView } from './WorkAssignmentsView.js';
import { WorkerManagementView } from './WorkerManagementView.js';
import { TeamManagementView } from './TeamManagementView.js';
import { WardCommunityActivities } from './WardCommunityActivities.js';
import { ApprovalManagementView } from './ApprovalManagementView.js';
import { WardCommunityPosts } from './WardCommunityPosts.js';
import { WardCommunityProblemsView } from './WardCommunityProblemsView.js';
import { WardAIAnalytics } from './WardAIAnalytics.js';
import { WardNotificationsView } from './WardNotificationsView.js';
import { WardSettingsView } from './WardSettingsView.js';

interface WardOfficerDashboardProps {
  user: Profile;
  lang: Language;
  setLang: (l: Language) => void;
  onLogout: () => void;
  onSwitchToCitizenView?: () => void;
}

export const WardOfficerDashboard: React.FC<WardOfficerDashboardProps> = ({
  user,
  lang,
  setLang,
  onLogout,
  onSwitchToCitizenView
}) => {
  // Current active tab among items
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [catalogueFilter, setCatalogueFilter] = useState<any>(undefined);

  const t = translations[lang];

  // Dynamic Ward & Officer resolution (reflects Admin-assigned ward(s) immediately)
  const officerName = user?.full_name || 'Ward Officer';
  const wardMatch = user?.locality?.match(/Ward\s*(\d+)/i) || user?.address?.match(/Ward\s*(\d+)/i);
  const initialWards: number[] = Array.isArray((user as any)?.assigned_wards) && (user as any).assigned_wards.length > 0
    ? (user as any).assigned_wards.map(Number).filter((n: number) => !isNaN(n))
    : [(user as any)?.ward_number ? Number((user as any).ward_number) : (wardMatch ? Number(wardMatch[1]) : 3)];

  const [assignedWards, setAssignedWards] = useState<number[]>(initialWards);
  const [selectedWardNum, setSelectedWardNum] = useState<number>(initialWards[0] || 3);
  const initialAllowedTabs: string[] | null =
    Array.isArray((user as any)?.allowed_tabs) && (user as any).allowed_tabs.length > 0
      ? (user as any).allowed_tabs
      : null;
  const [allowedTabs, setAllowedTabs] = useState<string[] | null>(initialAllowedTabs);

  // Sync live ward assignment & tab access permissions from server (in case Admin updated after login)
  useEffect(() => {
    api.getWardDashboardSummary().then(res => {
      const data: any = res?.data;
      if (data?.assigned_wards && Array.isArray(data.assigned_wards) && data.assigned_wards.length > 0) {
        const liveWards = data.assigned_wards.map(Number).filter((n: number) => !isNaN(n));
        setAssignedWards(liveWards);
        if (!liveWards.includes(selectedWardNum)) {
          setSelectedWardNum(liveWards[0]);
        }
      } else if (data?.ward_number) {
        const w = Number(data.ward_number);
        setAssignedWards([w]);
        setSelectedWardNum(w);
      }
      if (Array.isArray(data?.allowed_tabs) && data.allowed_tabs.length > 0) {
        setAllowedTabs(data.allowed_tabs);
      }
    }).catch(() => {});
  }, [user?.id]);

  const userWardNum = selectedWardNum;
  const wardArea = NAVSARI_WARD_NAMES[userWardNum] || `Navsari Ward ${userWardNum}`;

  const catalogueInitialFilter = useMemo(
    () => ({ ward_number: userWardNum, ...(catalogueFilter || {}) }),
    [userWardNum, catalogueFilter]
  );

  // All 12 Navigation items filtered dynamically by Super Admin tab access permissions
  const allNavItems = [
    { id: 'overview', rawLabel: t.wo_nav_overview, icon: LayoutDashboard },
    { id: 'complaints', rawLabel: t.wo_nav_complaints, icon: FileText },
    { id: 'hotspots', rawLabel: t.wo_nav_hotspots, icon: MapPin },
    { id: 'workers', rawLabel: t.wo_nav_workers, icon: UserCheck },
    { id: 'teams', rawLabel: t.wo_nav_teams, icon: Users },
    { id: 'activities', rawLabel: t.wo_nav_activities, icon: Calendar },
    { id: 'approvals', rawLabel: t.wo_nav_approvals, icon: ShieldCheck },
    { id: 'posts', rawLabel: t.wo_nav_posts, icon: Megaphone },
    { id: 'community_problems', rawLabel: t.wo_nav_community_problems, icon: HeartHandshake },
    { id: 'ai_analytics', rawLabel: t.wo_nav_ai_analytics || 'AI Analytics', icon: BrainCircuit },
    { id: 'notifications', rawLabel: t.wo_nav_notifications, icon: Bell },
    { id: 'settings', rawLabel: t.wo_nav_settings, icon: Settings }
  ];

  const isTabAllowed = (tabId: string) =>
    !allowedTabs || allowedTabs.length === 0 || allowedTabs.includes(tabId);

  const navItems = allNavItems
    .filter(item => isTabAllowed(item.id))
    .map((item, idx) => ({
      id: item.id,
      label: `${idx + 1}. ${item.rawLabel}`,
      icon: item.icon
    }));

  // Ensure activeTab is always within this officer's granted tabs
  useEffect(() => {
    if (navItems.length > 0 && !navItems.some(n => n.id === activeTab)) {
      setActiveTab(navItems[0].id);
    }
  }, [allowedTabs, activeTab]);

  // Callback from overview cards to open catalogue with pre-applied filter (if permitted)
  const handleNavigateToCatalogue = (filter?: any) => {
    if (!isTabAllowed('complaints')) return;
    setCatalogueFilter(filter);
    setActiveTab('complaints');
  };

  const handleTabClick = (tabId: string) => {
    if (!isTabAllowed(tabId)) return;
    if (tabId === 'complaints') {
      setCatalogueFilter(undefined);
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased overflow-x-clip">
      {/* 1. Desktop Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#e2e8f0] h-screen sticky top-0 z-30 select-none">
        {/* Logo and Ward Branding */}
        <div className="p-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <SwachhSetuIcon size={38} className="shrink-0" />
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-black text-sm text-[#095c54] tracking-tight">{t.app_title}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider bg-[#dcfce7] text-[#065f46] px-1.5 py-0.5 rounded-full border border-[#86efac]">
                  {t.nmc_label}
                </span>
              </div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                {t.ward_officer_portal}
              </p>
            </div>
          </div>
        </div>

        {/* 12 Navigation Items List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-extrabold transition duration-150 ${
                  isActive
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3.5 border-t border-[#e2e8f0] bg-white space-y-2">
          {/* Identity Box from user screenshot */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#e6f4f1]/80 border border-[#99f6e4] shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0 leading-tight">
              <h4 className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                {officerName} · Ward Officer
              </h4>
              <p className="text-[11px] font-bold text-[#0d9488] truncate mt-0.5">
                Ward {userWardNum} · {wardArea}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav_logout}</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header (Fully Responsive on Mobile) */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Ward indicator badge + multi-ward switcher if officer is assigned multiple wards */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="leading-tight truncate">
                <span className="text-xs sm:text-sm font-black text-[#0f2925] tracking-tight block sm:inline truncate">
                  NMC · Ward {userWardNum}
                </span>
                <span className="text-[11px] text-slate-500 font-bold hidden md:inline ml-2">
                  · {wardArea}
                </span>
              </div>
              {assignedWards.length > 1 && (
                <select
                  value={userWardNum}
                  onChange={e => setSelectedWardNum(Number(e.target.value))}
                  className="ml-1 sm:ml-2 px-2 sm:px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-[10px] sm:text-[11px] font-black text-[#095c54] outline-none cursor-pointer max-w-[115px] sm:max-w-[200px] truncate"
                  title="Switch between your assigned wards"
                >
                  {assignedWards.map(w => (
                    <option key={w} value={w}>
                      Ward {w} · {NAVSARI_WARD_NAMES[w] || `Ward ${w}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Header Controls: Language Selector, Notifications, Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Language switcher */}
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

            {/* Notifications button (shown only if Notifications tab is permitted) */}
            {isTabAllowed('notifications') && (
              <button
                onClick={() => handleTabClick('notifications')}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 relative transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </button>
            )}

            {/* Logout (Mobile) */}
            <button
              onClick={onLogout}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-red-600"
              title={t.nav_logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 3. Main Dynamic Content Body (Padded for mobile bottom bar) */}
        <main className="flex-1 px-2.5 py-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-[max(5.5rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))] lg:pb-8">
          {activeTab === 'overview' && (
            <WardOverview
              wardNumber={userWardNum}
              officerName={officerName}
              wardArea={wardArea}
              lang={lang}
              onNavigateToCatalogue={handleNavigateToCatalogue}
            />
          )}

          {activeTab === 'complaints' && (
            <ComplaintCatalogue initialFilter={catalogueInitialFilter} />
          )}

          {activeTab === 'hotspots' && (
            <HotspotsMap ward={userWardNum} lang={lang} />
          )}

          {activeTab === 'assignments' && <WorkAssignmentsView />}

          {activeTab === 'workers' && <WorkerManagementView />}

          {activeTab === 'teams' && <TeamManagementView />}

          {activeTab === 'activities' && <WardCommunityActivities wardNumber={userWardNum} />}

          {activeTab === 'approvals' && <ApprovalManagementView wardNumber={userWardNum} />}

          {activeTab === 'posts' && <WardCommunityPosts />}

          {activeTab === 'community_problems' && (
            <WardCommunityProblemsView wardNumber={userWardNum} officerName={officerName} lang={lang} />
          )}

          {activeTab === 'ai_analytics' && (
            <WardAIAnalytics wardNumber={userWardNum} />
          )}

          {activeTab === 'notifications' && <WardNotificationsView />}

          {activeTab === 'settings' && <WardSettingsView />}
        </main>

        {/* 4. Dedicated Mobile Bottom Navigation (Visible on < lg, respects granted tabs) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] px-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {navItems.slice(0, 4).map(item => {
              const Icon = item.icon;
              const isAct = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                    isAct ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className={`text-[10px] mt-0.5 truncate max-w-[68px] ${isAct ? 'font-black' : 'font-semibold'}`}>
                    {item.label.replace(/^\d+\.\s*/, '')}
                  </span>
                </button>
              );
            })}

            {navItems.length > 4 && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                  !navItems.slice(0, 4).some(i => i.id === activeTab)
                    ? 'text-[#095c54] font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Menu className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-semibold">
                  {t.wo_nav_more}
                </span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* 5. Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-72 max-w-[85%] bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SwachhSetuIcon size={32} />
                <span className="font-black text-sm text-[#095c54]">{t.app_title}</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 mx-3 my-2 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-bold">
              Ward {userWardNum} · {officerName}
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                      isActive
                        ? 'bg-[#095c54] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#e2e8f0] bg-white space-y-2.5">
              {/* Identity Box from user screenshot */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#e6f4f1]/80 border border-[#99f6e4] shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="min-w-0 leading-tight">
                  <h4 className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                    {officerName} · Ward Officer
                  </h4>
                  <p className="text-[11px] font-bold text-[#0d9488] truncate mt-0.5">
                    Ward {userWardNum} · {wardArea}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-white text-red-600 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.nav_logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
