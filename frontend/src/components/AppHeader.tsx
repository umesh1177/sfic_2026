import React, { useState } from 'react';
import {
  Sparkles,
  Bell,
  Globe,
  User,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Volume2
} from 'lucide-react';
import { Profile, AppNotification } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface AppHeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  user: Profile | null;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenReport: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  user,
  onOpenAuth,
  onLogout,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenReport
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[lang];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleReadAloud = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('home')}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#095c54] via-[#0d6e65] to-[#10b981] flex items-center justify-center text-white shadow-md shadow-[#095c54]/25 transform transition hover:scale-105">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#095c54]">
                  {t.app_title}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f4f1] text-[#05443e] border border-[#b8e0d7]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                  NMC Civic
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748b] font-medium leading-none hidden xs:block">
                {t.app_subtitle}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'home', label: t.nav_home },
              { id: 'complaints', label: t.nav_complaints },
              { id: 'map', label: t.nav_map },
              { id: 'drives', label: t.nav_drives },
              { id: 'challenges', label: t.nav_challenges },
              { id: 'rewards', label: t.nav_rewards },
              { id: 'support', label: t.nav_support }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  currentTab === item.id
                    ? 'text-[#095c54] bg-[#e6f4f1]'
                    : 'text-[#64748b] hover:text-[#095c54] hover:bg-[#e6f4f1]/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Report Issue Button (Desktop & Tablet) */}
            <button
              onClick={onOpenReport}
              className="hidden sm:inline-flex btn-primary-custom px-4 py-2 text-xs sm:text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.action_report}</span>
            </button>

            {/* Read Aloud Helper */}
            <button
              onClick={() => handleReadAloud(`${t.app_title}. ${t.tagline}. ${t.welcome_back} ${user?.full_name || 'Citizen'}.`)}
              title={t.read_aloud}
              className="p-2 rounded-lg text-[#64748b] hover:text-[#095c54] hover:bg-[#e6f4f1] transition"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-bold text-[#0f2925] hover:border-[#095c54] transition"
              >
                <Globe className="w-3.5 h-3.5 text-[#095c54]" />
                <span>{lang === 'en' ? 'EN' : lang === 'gu' ? 'ગુજ' : 'हिं'}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-1.5 z-50">
                  {[
                    { code: 'en' as Language, label: 'English' },
                    { code: 'gu' as Language, label: 'ગુજરાતી' },
                    { code: 'hi' as Language, label: 'हिन्दी' }
                  ].map(item => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLang(item.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-bold transition flex items-center justify-between ${
                        lang === item.code ? 'text-[#095c54] bg-[#e6f4f1]' : 'text-[#0f2925] hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {lang === item.code && <CheckCircle2 className="w-3.5 h-3.5 text-[#095c54]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowLangMenu(false);
                }}
                className="relative p-2 rounded-lg text-[#64748b] hover:text-[#095c54] hover:bg-[#e6f4f1] transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#dc2626] text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#e2e8f0] overflow-hidden z-50">
                  <div className="p-3.5 bg-[#f0f6f4] border-b border-[#e2e8f0] flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm text-[#095c54]">
                      Civic Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] font-bold text-[#095c54] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#e2e8f0]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748b]">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`p-3 text-left transition cursor-pointer hover:bg-slate-50 ${
                            !n.is_read ? 'bg-[#e6f4f1]/40' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-[#e6f4f1] text-[#095c54] mt-0.5">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#0f2925] truncate">
                                  {n.title}
                                </h4>
                                <span className="text-[10px] text-[#64748b]">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile or Login Trigger */}
            {user ? (
              <div
                onClick={() => setCurrentTab('profile')}
                className="flex items-center gap-2 pl-1 cursor-pointer group"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#095c54]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#095c54] text-white flex items-center justify-center font-bold text-xs">
                    {user.full_name.charAt(0)}
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <span className="block text-xs font-extrabold text-[#0f2925] group-hover:text-[#095c54]">
                    {user.full_name.split(' ')[0]}
                  </span>
                  <span className="block text-[10px] text-[#64748b]">
                    Citizen
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="btn-outline-custom px-3 py-1.5 text-xs font-bold"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.nav_login}</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#095c54] hover:bg-[#e6f4f1] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation for Secondary Sections */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#e2e8f0] px-4 pt-2 pb-6 space-y-2 animate-fadeIn shadow-lg">
          {[
            { id: 'home', label: t.nav_home },
            { id: 'complaints', label: t.nav_complaints },
            { id: 'map', label: t.nav_map },
            { id: 'drives', label: t.nav_drives },
            { id: 'challenges', label: t.nav_challenges },
            { id: 'rewards', label: t.nav_rewards },
            { id: 'support', label: t.nav_support },
            { id: 'profile', label: t.nav_profile }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between ${
                currentTab === item.id
                  ? 'text-[#095c54] bg-[#e6f4f1]'
                  : 'text-[#0f2925] hover:bg-slate-50'
              }`}
            >
              <span>{item.label}</span>
              {currentTab === item.id && <CheckCircle2 className="w-4 h-4 text-[#095c54]" />}
            </button>
          ))}

          {user && (
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm font-bold text-[#dc2626] hover:bg-[#fee2e2] rounded-xl flex items-center gap-2 mt-4"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav_logout}</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
