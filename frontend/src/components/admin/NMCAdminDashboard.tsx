import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  Compass,
  Tags,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Bell,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Profile } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { SwachhSetuIcon } from '../SwachhSetuLogo.js';

// Admin Sub-Views
import { AdminOverview } from './AdminOverview.js';
import { WardManagement } from './WardManagement.js';
import { WardOfficerManagement } from './WardOfficerManagement.js';
import { StaffManagement } from './StaffManagement.js';
import { BoundaryManagement } from './BoundaryManagement.js';
import { CategoryManagement } from './CategoryManagement.js';

interface NMCAdminDashboardProps {
  user: Profile | null;
  lang: Language;
  setLang: (l: Language) => void;
  onLogout: () => void;
}

export const NMCAdminDashboard: React.FC<NMCAdminDashboardProps> = ({
  user,
  lang,
  setLang,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [targetBoundaryWard, setTargetBoundaryWard] = useState<number | undefined>(undefined);

  const t = translations[lang];

  const adminName = user?.full_name || 'NMC Municipal Admin';

  // 6 Core Modules as requested by user
  const navItems = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'wards', label: '2. Ward Management', icon: Building2 },
    { id: 'ward_officers', label: '3. Ward Officer Management', icon: UserCheck },
    { id: 'staff', label: '4. Worker & Officer Management', icon: Users },
    { id: 'boundaries', label: '5. Set Boundary & Geofencing', icon: Compass },
    { id: 'categories', label: '6. Manage Categories & SLA', icon: Tags }
  ];

  const handleNavigateToBoundary = (wardNum?: number) => {
    setTargetBoundaryWard(wardNum);
    setActiveTab('boundaries');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabClick = (tabId: string) => {
    if (tabId !== 'boundaries') {
      setTargetBoundaryWard(undefined);
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f2925] flex flex-col lg:flex-row antialiased">
      {/* 1. Left Sidebar Navigation (Desktop) */}
      <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-[#e2e8f0] sticky top-0 h-screen z-30 shrink-0">
        {/* Brand / Logo Header */}
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#095c54] to-[#043e39] text-white flex items-center justify-center shadow-xs">
              <SwachhSetuIcon className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-[#0f2925] block">
                Swachh Setu
              </span>
              <span className="text-[10px] uppercase font-black text-emerald-700 tracking-wider block">
                NMC Central Admin
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Administrative Modules
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition ${
                  isActive
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Identity Box directly above Logout button */}
        <div className="p-3.5 border-t border-[#e2e8f0] bg-white space-y-2">
          {/* Identity Box */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#e6f4f1]/80 border border-[#99f6e4] shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0 leading-tight">
              <h4 className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                {adminName}
              </h4>
              <p className="text-[11px] font-bold text-[#0d9488] truncate mt-0.5">
                NMC Central Executive HQ
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

      {/* 2. Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#095c54] text-white flex items-center justify-center">
                  <SwachhSetuIcon className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#0f2925]">Swachh Setu</h3>
                  <span className="text-[10px] font-black text-emerald-700 uppercase">NMC Admin</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-black transition ${
                      isActive
                        ? 'bg-[#095c54] text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3.5 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#e6f4f1] border border-[#99f6e4]">
                <ShieldCheck className="w-5 h-5 text-[#095c54] shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#0f2925] truncate">{adminName}</h4>
                  <p className="text-[10px] text-emerald-700 font-bold truncate">NMC Central HQ</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-2 px-3 rounded-xl bg-red-50 text-red-700 font-extrabold text-xs flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.nav_logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Body */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="leading-tight truncate">
                <span className="text-xs sm:text-sm font-black text-[#0f2925] tracking-tight">
                  Navsari Municipal Corporation Central Portal
                </span>
                <span className="text-[11px] text-slate-400 font-bold hidden md:inline ml-2">
                  · Executive Authority
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

            {/* Logout Mobile */}
            <button
              onClick={onLogout}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-red-600"
              title={t.nav_logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Sub-view Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <AdminOverview lang={lang} onNavigateTab={handleTabClick} />
          )}

          {activeTab === 'wards' && (
            <WardManagement lang={lang} onNavigateToBoundary={handleNavigateToBoundary} />
          )}

          {activeTab === 'ward_officers' && (
            <WardOfficerManagement lang={lang} />
          )}

          {activeTab === 'staff' && (
            <StaffManagement lang={lang} />
          )}

          {activeTab === 'boundaries' && (
            <BoundaryManagement lang={lang} initialWardNumber={targetBoundaryWard} />
          )}

          {activeTab === 'categories' && (
            <CategoryManagement lang={lang} />
          )}
        </main>
      </div>
    </div>
  );
};

