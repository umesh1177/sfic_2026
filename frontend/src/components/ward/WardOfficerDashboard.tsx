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
  Sparkles
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
import { WardCleanlinessScoreView } from './WardCleanlinessScoreView.js';
import { WardReportsAnalytics } from './WardReportsAnalytics.js';
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
  // Current active tab among EXACT 13 items
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [catalogueFilter, setCatalogueFilter] = useState<any>(undefined);

  // Exact 13 items mandated by Prompt Section 3:
  const navItems = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'complaints', label: '2. Complaint Catalogue', icon: FileText },
    { id: 'hotspots', label: '3. Hotspots Map', icon: MapPin },
    { id: 'assignments', label: '4. Work Assignments', icon: Wrench },
    { id: 'workers', label: '5. Worker Management', icon: UserCheck },
    { id: 'teams', label: '6. Team Management', icon: Users },
    { id: 'activities', label: '7. Community Activities', icon: Calendar },
    { id: 'approvals', label: '8. Approval Management', icon: ShieldCheck },
    { id: 'posts', label: '9. Community & Citizen Posts', icon: Megaphone },
    { id: 'cleanliness_score', label: '10. Ward Cleanliness Score', icon: Award },
    { id: 'reports', label: '11. Reports & Analytics', icon: BarChart3 },
    { id: 'notifications', label: '12. Notifications', icon: Bell },
    { id: 'settings', label: '13. Settings', icon: Settings }
  ];

  // Callback from overview cards to open catalogue with pre-applied filter
  const handleNavigateToCatalogue = (filter?: any) => {
    setCatalogueFilter(filter);
    setActiveTab('complaints');
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'complaints') {
      // Clear filter when clicking catalogue tab directly
      setCatalogueFilter(undefined);
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased">
      {/* 1. Desktop Left Sidebar (Exact 13-item navigation) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#e2e8f0] h-screen sticky top-0 z-30 select-none">
        {/* Logo and Ward Branding */}
        <div className="p-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <SwachhSetuIcon size={38} className="shrink-0" />
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-[#095c54] tracking-tight">Swachh Setu</span>
                <span className="text-[10px] font-black bg-[#e6f4f1] text-[#095c54] px-1.5 py-0.2 rounded-full border border-[#b8e0d7]">
                  NMC
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Ward Officer Portal
              </p>
            </div>
          </div>
        </div>

        {/* 13 Navigation Items List */}
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
        <div className="p-4 border-t border-[#e2e8f0] bg-slate-50/70 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white font-black text-xs flex items-center justify-center shrink-0">
              RP
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#0f2925] truncate">Ramesh Patel</p>
              <p className="text-[10px] text-slate-500 font-bold truncate">Chief Sanitary Inspector</p>
              <p className="text-[10px] text-[#095c54] font-extrabold">Ward 3 · Dudhiya Talao</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs"
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
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Ward indicator badge */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="leading-tight">
                <span className="text-xs font-black text-[#0f2925] tracking-tight">
                  Navsari Municipal Corporation
                </span>
                <span className="text-[11px] text-slate-500 font-bold hidden sm:inline ml-2">
                  · Ward 3 Administrative Officer
                </span>
              </div>
            </div>
          </div>

          {/* Header Controls: Language Selector, Notifications, Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['en', 'gu', 'hi'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 rounded-lg uppercase text-[11px] font-black transition ${
                    lang === l ? 'bg-white text-[#095c54] shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Notifications button */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 relative transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Logout (Mobile) */}
            <button
              onClick={onLogout}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 3. Main Dynamic Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <WardOverview onNavigateToCatalogue={handleNavigateToCatalogue} />
          )}

          {activeTab === 'complaints' && (
            <ComplaintCatalogue initialFilter={catalogueFilter} />
          )}

          {activeTab === 'hotspots' && <HotspotsMap />}

          {activeTab === 'assignments' && <WorkAssignmentsView />}

          {activeTab === 'workers' && <WorkerManagementView />}

          {activeTab === 'teams' && <TeamManagementView />}

          {activeTab === 'activities' && <WardCommunityActivities />}

          {activeTab === 'approvals' && <ApprovalManagementView />}

          {activeTab === 'posts' && <WardCommunityPosts />}

          {activeTab === 'cleanliness_score' && <WardCleanlinessScoreView />}

          {activeTab === 'reports' && <WardReportsAnalytics />}

          {activeTab === 'notifications' && <WardNotificationsView />}

          {activeTab === 'settings' && <WardSettingsView />}
        </main>
      </div>

      {/* 4. Mobile Drawer Navigation */}
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
                <span className="font-black text-sm text-[#095c54]">Swachh Setu [NMC]</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
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

            <div className="p-4 border-t border-[#e2e8f0] bg-slate-50">
              <button
                onClick={onLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-white text-red-600 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
