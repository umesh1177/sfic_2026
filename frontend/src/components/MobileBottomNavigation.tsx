import React, { useState } from 'react';
import {
  Home,
  PlusCircle,
  FileText,
  MapPin,
  MoreHorizontal,
  Calendar,
  Trophy,
  Award,
  HelpCircle,
  Bell,
  User,
  X
} from 'lucide-react';
import { Language, translations } from '../i18n/translations.js';

interface MobileBottomNavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenReport: () => void;
  lang: Language;
  unreadComplaintsCount?: number;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  currentTab,
  setCurrentTab,
  onOpenReport,
  lang,
  unreadComplaintsCount = 0
}) => {
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const t = translations[lang];

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setMoreSheetOpen(false);
  };

  const isMoreTabActive = ['drives', 'rewards', 'support', 'profile', 'notifications'].includes(currentTab);

  return (
    <>
      {/* Mobile Bottom Bar (Visible on mobile & small tablets < 1024px) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] py-1.5 px-3 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          
          {/* 1. Home */}
          <button
            onClick={() => handleSelectTab('home')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              currentTab === 'home' ? 'text-[#095c54]' : 'text-[#64748b] hover:text-[#095c54]'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className={`text-[10px] mt-0.5 ${currentTab === 'home' ? 'font-extrabold' : 'font-medium'}`}>
              {t.nav_home}
            </span>
          </button>

          {/* 2. My Complaints */}
          <button
            onClick={() => handleSelectTab('complaints')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${
              currentTab === 'complaints' ? 'text-[#095c54]' : 'text-[#64748b] hover:text-[#095c54]'
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5" />
              {unreadComplaintsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 ${currentTab === 'complaints' ? 'font-extrabold' : 'font-medium'}`}>
              {t.nav_complaints}
            </span>
          </button>

          {/* 3. Primary Report Action (Raised center button) */}
          <button
            onClick={onOpenReport}
            className="flex flex-col items-center justify-center -mt-5"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#095c54] via-[#0d6e65] to-[#10b981] p-3 text-white shadow-lg shadow-[#095c54]/35 flex items-center justify-center transform active:scale-95 transition-all">
              <PlusCircle className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-extrabold text-[#095c54] mt-1">
              {t.nav_report}
            </span>
          </button>

          {/* 4. Map */}
          <button
            onClick={() => handleSelectTab('map')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              currentTab === 'map' ? 'text-[#095c54]' : 'text-[#64748b] hover:text-[#095c54]'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className={`text-[10px] mt-0.5 ${currentTab === 'map' ? 'font-extrabold' : 'font-medium'}`}>
              {t.nav_map}
            </span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setMoreSheetOpen(!moreSheetOpen)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              isMoreTabActive || moreSheetOpen ? 'text-[#095c54]' : 'text-[#64748b] hover:text-[#095c54]'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className={`text-[10px] mt-0.5 ${isMoreTabActive ? 'font-extrabold' : 'font-medium'}`}>
              {t.nav_more}
            </span>
          </button>

        </div>
      </div>

      {/* "More" Bottom Sheet Modal for Mobile */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:hidden animate-fadeIn">
          <div
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border-t border-[#e2e8f0] max-h-[80vh] overflow-y-auto animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                <h3 className="font-extrabold text-base text-[#095c54]">
                  {t.nav_more} Services
                </h3>
              </div>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1 rounded-full text-[#64748b] hover:bg-[#e6f4f1] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              
              {/* Cleanliness Drives */}
              <button
                onClick={() => handleSelectTab('drives')}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition ${
                  currentTab === 'drives'
                    ? 'border-[#095c54] bg-[#e6f4f1]/60 text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_drives}</span>
                  <span className="block text-[10px] text-[#64748b]">Volunteer RSVP</span>
                </div>
              </button>

              {/* Rewards & Badges */}
              <button
                onClick={() => handleSelectTab('rewards')}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition ${
                  currentTab === 'rewards'
                    ? 'border-[#095c54] bg-[#e6f4f1]/60 text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_rewards}</span>
                  <span className="block text-[10px] text-[#64748b]">Honors & Recognition</span>
                </div>
              </button>

              {/* Notifications & Civic Alerts */}
              <button
                onClick={() => handleSelectTab('notifications')}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition ${
                  currentTab === 'notifications'
                    ? 'border-[#095c54] bg-[#e6f4f1]/60 text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#ecfdf5] text-[#095c54] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_notifications}</span>
                  <span className="block text-[10px] text-[#64748b]">Civic Alerts & Status</span>
                </div>
              </button>

              {/* Feedback & Support */}
              <button
                onClick={() => handleSelectTab('support')}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition ${
                  currentTab === 'support'
                    ? 'border-[#095c54] bg-[#e6f4f1]/60 text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_support}</span>
                  <span className="block text-[10px] text-[#64748b]">Helpdesk Tickets</span>
                </div>
              </button>

            </div>

            {/* My Profile */}
            <button
              onClick={() => handleSelectTab('profile')}
              className={`w-full mt-3 p-3.5 rounded-2xl border flex items-center gap-3 transition ${
                currentTab === 'profile'
                  ? 'border-[#095c54] bg-[#e6f4f1]/60 text-[#095c54]'
                  : 'border-[#e2e8f0] bg-slate-50 text-[#0f2925]'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-[#e2e8f0] text-[#095c54] flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <span className="block font-bold text-xs">{t.nav_profile}</span>
                <span className="block text-[10px] text-[#64748b]">Language, Settings, Accessibility</span>
              </div>
            </button>

          </div>
        </div>
      )}
    </>
  );
};
