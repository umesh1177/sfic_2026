import React from 'react';
import {
  Home,
  FileText,
  Users,
  Award,
  Headphones,
  User,
  Bell,
  LogOut,
  Sparkles,
  Volume2,
  Globe,
  Wrench,
  Building2
} from 'lucide-react';
import { SwachhSetuIcon } from './SwachhSetuLogo.js';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface DesktopSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: Profile | null;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  unreadCount?: number;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  lang,
  setLang,
  unreadCount = 0
}) => {
  const t = translations[lang];

  const navItems = [
    { id: 'home', label: t.nav_home, icon: Home },
    { id: 'complaints', label: t.nav_complaints, icon: FileText, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'drives', label: t.nav_drives, icon: Users },
    { id: 'rewards', label: t.nav_rewards, icon: Award },
    { id: 'notifications', label: t.nav_notifications, icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'support', label: t.nav_support, icon: Headphones },
    { id: 'profile', label: t.nav_profile, icon: User }
  ];

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Welcome ${user?.full_name || 'Citizen'} to Swachh Setu. You have ${unreadCount} active complaints. Let's make Navsari clean and green together.`;
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang === 'gu') utterance.lang = 'gu-IN';
      else if (lang === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 h-screen sticky top-0 shrink-0 bg-white border-r border-[#e2e8f0] p-4 shadow-sm z-30">
      {/* Top Header & Branding */}
      <div>
        <div className="flex items-center gap-3 px-2 py-2 mb-5">
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
              {t.citizen_portal}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#095c54] text-white shadow-sm'
                    : 'text-[#64748b] hover:bg-[#f0f6f4] hover:text-[#095c54]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748b]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#095c54]' : 'bg-[#e6f4f1] text-[#095c54]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: User profile, Language, TTS, and Logout */}
      <div className="pt-3 border-t border-[#e2e8f0] space-y-2">
        {user && (
          <div
            onClick={() => setCurrentTab('profile')}
            className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] hover:border-[#095c54] transition cursor-pointer group shadow-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                user.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'CT'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#095c54] truncate">
                {user.full_name}
              </p>
              <p className="text-[10px] font-bold text-[#047857] flex items-center gap-1 truncate">
                {user.role === 'worker' || (user.role as any) === 'sanitation_worker' ? (
                  <span className="flex items-center gap-1"><Wrench className="w-3 h-3 text-[#047857] shrink-0" /> Field Worker</span>
                ) : user.role === 'community_head' ? (
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-[#047857] shrink-0" /> Community Head</span>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    <span>120 Karma Pts</span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Language & Voice Row */}
        <div className="flex items-center gap-1.5 bg-[#f8faf9] p-1.5 rounded-xl border border-[#e2e8f0]">
          <Globe className="w-3.5 h-3.5 text-[#095c54] ml-1 shrink-0" />
          <select
            value={lang}
            onChange={e => setLang(e.target.value as Language)}
            className="text-xs font-bold text-[#095c54] bg-transparent outline-none cursor-pointer flex-1"
          >
            <option value="en">English</option>
            <option value="gu">ગુજરાતી</option>
            <option value="hi">हिन्दी</option>
          </select>
          <button
            onClick={handleReadAloud}
            className="p-1 rounded-lg text-[#095c54] hover:bg-[#e6f4f1] transition"
            title="Read dashboard summary aloud"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Logout Button */}
        {user && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#dc2626] hover:bg-[#fee2e2] transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
