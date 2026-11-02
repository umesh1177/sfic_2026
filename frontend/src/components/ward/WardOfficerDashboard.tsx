import React, { useState } from 'react';
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
  HeartHandshake
} from 'lucide-react';
import { Profile } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { SwachhSetuIcon } from '../SwachhSetuLogo.js';

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

  // Dynamic Ward & Officer resolution
  const officerName = user?.full_name || 'Ramesh Patel';
  const officerInitials = officerName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'WO';
  const wardMatch = user?.locality?.match(/Ward\s*(\d+)/i) || user?.address?.match(/Ward\s*(\d+)/i);
  const userWardNum = (user as any)?.ward_number || (wardMatch ? Number(wardMatch[1]) : 3);
  const wardArea = user?.locality?.replace(/Ward\s*\d+/i, '').replace(/NMC/i, '').trim() || (userWardNum === 8 ? 'Madhumati - Parsi Wad' : 'Dudhiya Talao');

  // 11 Navigation items with fully dynamic language labels
  const navItems = [
    { id: 'overview', label: `1. ${t.wo_nav_overview}`, icon: LayoutDashboard },
    { id: 'complaints', label: `2. ${t.wo_nav_complaints}`, icon: FileText },
    { id: 'hotspots', label: `3. ${t.wo_nav_hotspots}`, icon: MapPin },
    { id: 'workers', label: `4. ${t.wo_nav_workers}`, icon: UserCheck },
    { id: 'teams', label: `5. ${t.wo_nav_teams}`, icon: Users },
    { id: 'activities', label: `6. ${t.wo_nav_activities}`, icon: Calendar },
    { id: 'approvals', label: `7. ${t.wo_nav_approvals}`, icon: ShieldCheck },
    { id: 'posts', label: `8. ${t.wo_nav_posts}`, icon: Megaphone },
    { id: 'community_problems', label: `9. ${t.wo_nav_community_problems}`, icon: HeartHandshake },
    { id: 'notifications', label: `10. ${t.wo_nav_notifications}`, icon: Bell },
    { id: 'settings', label: `11. ${t.wo_nav_settings}`, icon: Settings }
  ];

  // Callback from overview cards to open catalogue with pre-applied filter
  const handleNavigateToCatalogue = (filter?: any) => {
    setCatalogueFilter(filter);
    setActiveTab('complaints');
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'complaints') {
      setCatalogueFilter(undefined);
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased">
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
        <div className="p-4 border-t border-[#e2e8f0] bg-slate-50/70 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white font-black text-xs flex items-center justify-center shrink-0">
              {officerInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#0f2925] truncate">{officerName}</p>
              <p className="text-[10px] text-slate-500 font-bold truncate">Chief Sanitary Inspector</p>
              <p className="text-[10px] text-[#095c54] font-extrabold truncate">Ward {userWardNum} · {wardArea}</p>
            </div>
          </div>

          {onSwitchToCitizenView && (
            <button
              onClick={onSwitchToCitizenView}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#095c54] border border-slate-200 text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#095c54]" />
              <span>{t.action_switch_citizen}</span>
            </button>
          )}

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

            {/* Ward indicator badge */}
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

            {/* Notifications button */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 relative transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Switch to citizen (Mobile) */}
            {onSwitchToCitizenView && (
              <button
                onClick={onSwitchToCitizenView}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
                title={t.action_switch_citizen}
              >
                <ArrowRightLeft className="w-4 h-4 text-[#095c54]" />
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

        {/* 3. Main Dynamic Content Body (Padded pb-24 for mobile bottom bar) */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
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
            <ComplaintCatalogue initialFilter={{ ward_number: userWardNum, ...(catalogueFilter || {}) }} />
          )}

          {activeTab === 'hotspots' && (
            <HotspotsMap ward={userWardNum} lang={lang} />
          )}

          {activeTab === 'assignments' && <WorkAssignmentsView />}

          {activeTab === 'workers' && <WorkerManagementView />}

          {activeTab === 'teams' && <TeamManagementView />}

          {activeTab === 'activities' && <WardCommunityActivities />}

          {activeTab === 'approvals' && <ApprovalManagementView wardNumber={userWardNum} />}

          {activeTab === 'posts' && <WardCommunityPosts />}

          {activeTab === 'community_problems' && (
            <WardCommunityProblemsView wardNumber={userWardNum} officerName={officerName} lang={lang} />
          )}

          {activeTab === 'notifications' && <WardNotificationsView />}

          {activeTab === 'settings' && <WardSettingsView />}
        </main>

        {/* 4. Dedicated Mobile Bottom Navigation (Visible on < lg) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] py-1.5 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {/* 1. Overview */}
            <button
              onClick={() => handleTabClick('overview')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'overview' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'overview' ? 'font-black' : 'font-semibold'}`}>
                {t.wo_nav_overview}
              </span>
            </button>

            {/* 2. Complaints */}
            <button
              onClick={() => handleTabClick('complaints')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${
                activeTab === 'complaints' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'complaints' ? 'font-black' : 'font-semibold'}`}>
                {t.wo_nav_complaints}
              </span>
            </button>

            {/* 3. Hotspots */}
            <button
              onClick={() => handleTabClick('hotspots')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'hotspots' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'hotspots' ? 'font-black' : 'font-semibold'}`}>
                {t.wo_nav_hotspots}
              </span>
            </button>

            {/* 4. Teams */}
            <button
              onClick={() => handleTabClick('teams')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'teams' ? 'text-[#095c54]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className={`text-[10px] mt-0.5 ${activeTab === 'teams' ? 'font-black' : 'font-semibold'}`}>
                {t.wo_nav_teams}
              </span>
            </button>

            {/* 5. More (Drawer Trigger) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                !['overview', 'complaints', 'hotspots', 'teams'].includes(activeTab)
                  ? 'text-[#095c54]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-semibold">
                {t.wo_nav_more}
              </span>
            </button>
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

            <div className="p-4 border-t border-[#e2e8f0] bg-slate-50 space-y-2">
              {onSwitchToCitizenView && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSwitchToCitizenView();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>{t.action_switch_citizen}</span>
                </button>
              )}
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
