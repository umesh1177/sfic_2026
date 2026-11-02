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

  const isMoreTabActive = ['drives', 'challenges', 'rewards', 'support', 'profile', 'notifications'].includes(currentTab);

  return (
    <>
      {/* Mobile Bottom Bar (Visible on mobile & small tablets < 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] px-2 sm:px-4 lg:hidden shadow-[0_-4px_24px_rgba(9,92,84,0.08)]"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          
          {/* 1. Home */}
          <button
            onClick={() => handleSelectTab('home')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all touch-press ${
              currentTab === 'home'
                ? 'bg-[#e6f4f1] text-[#095c54] font-extrabold shadow-xs'
                : 'text-[#64748b] hover:text-[#095c54]'
            }`}
            aria-label={t.nav_home}
          >
            <Home className={`w-5 h-5 transition-transform ${currentTab === 'home' ? 'scale-110 text-[#095c54]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">
              {t.nav_home}
            </span>
          </button>

          {/* 2. My Complaints */}
          <button
            onClick={() => handleSelectTab('complaints')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all touch-press relative ${
              currentTab === 'complaints'
                ? 'bg-[#e6f4f1] text-[#095c54] font-extrabold shadow-xs'
                : 'text-[#64748b] hover:text-[#095c54]'
            }`}
            aria-label={t.nav_complaints}
          >
            <div className="relative">
              <FileText className={`w-5 h-5 transition-transform ${currentTab === 'complaints' ? 'scale-110 text-[#095c54]' : ''}`} />
              {unreadComplaintsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">
              {t.nav_complaints}
            </span>
          </button>

          {/* 3. Primary Report Action (Raised Center Floating Button) */}
          <button
            onClick={onOpenReport}
            className="flex flex-col items-center justify-center -mt-5 group touch-press px-1"
            aria-label={t.action_report}
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#095c54] via-[#0d6e65] to-[#10b981] p-2.5 sm:p-3 text-white shadow-lg shadow-[#095c54]/30 flex items-center justify-center ring-4 ring-white group-active:scale-90 transition-all">
              <PlusCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.4]" />
            </div>
            <span className="text-[10px] font-black text-[#095c54] mt-0.5 tracking-tight">
              {t.nav_report_short || t.nav_report}
            </span>
          </button>

          {/* 4. Map */}
          <button
            onClick={() => handleSelectTab('map')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all touch-press ${
              currentTab === 'map'
                ? 'bg-[#e6f4f1] text-[#095c54] font-extrabold shadow-xs'
                : 'text-[#64748b] hover:text-[#095c54]'
            }`}
            aria-label={t.nav_map}
          >
            <MapPin className={`w-5 h-5 transition-transform ${currentTab === 'map' ? 'scale-110 text-[#095c54]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">
              {t.nav_map}
            </span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setMoreSheetOpen(!moreSheetOpen)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all touch-press ${
              isMoreTabActive || moreSheetOpen
                ? 'bg-[#e6f4f1] text-[#095c54] font-extrabold shadow-xs'
                : 'text-[#64748b] hover:text-[#095c54]'
            }`}
            aria-label={t.nav_more}
          >
            <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreTabActive ? 'scale-110 text-[#095c54]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">
              {t.nav_more}
            </span>
          </button>

        </div>
      </nav>

      {/* "More" Bottom Sheet Modal for Mobile */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm lg:hidden animate-fadeInBackdrop"
          onClick={() => setMoreSheetOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-[2rem] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl border-t border-[#e2e8f0] max-h-[85vh] overflow-y-auto animate-slideUpSheet"
            onClick={e => e.stopPropagation()}
          >
            {/* Native Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                <h3 className="font-extrabold text-base text-[#095c54]">
                  {t.nav_more} Civic Services
                </h3>
              </div>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1.5 rounded-full text-[#64748b] hover:bg-[#e6f4f1] transition touch-press"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4">
              
              {/* Cleanliness Drives */}
              <button
                onClick={() => handleSelectTab('drives')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left flex flex-col gap-2 transition touch-press ${
                  currentTab === 'drives'
                    ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_drives}</span>
                  <span className="block text-[10px] text-[#64748b]">Volunteer Action</span>
                </div>
              </button>

              {/* Community Challenges */}
              <button
                onClick={() => handleSelectTab('challenges')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left flex flex-col gap-2 transition touch-press ${
                  currentTab === 'challenges'
                    ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_challenges}</span>
                  <span className="block text-[10px] text-[#64748b]">Ward Missions</span>
                </div>
              </button>

              {/* Rewards & Badges */}
              <button
                onClick={() => handleSelectTab('rewards')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left flex flex-col gap-2 transition touch-press ${
                  currentTab === 'rewards'
                    ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_rewards}</span>
                  <span className="block text-[10px] text-[#64748b]">Karma & Honors</span>
                </div>
              </button>

              {/* Notifications & Alerts */}
              <button
                onClick={() => handleSelectTab('notifications')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left flex flex-col gap-2 transition touch-press ${
                  currentTab === 'notifications'
                    ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#ecfdf5] text-[#095c54] flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-xs">{t.nav_notifications}</span>
                  <span className="block text-[10px] text-[#64748b]">Civic Alerts</span>
                </div>
              </button>

              {/* Feedback & Support */}
              <button
                onClick={() => handleSelectTab('support')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left flex flex-col gap-2 transition touch-press col-span-2 ${
                  currentTab === 'support'
                    ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                    : 'border-[#e2e8f0] bg-white text-[#0f2925] hover:border-[#b8e0d7]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center font-bold shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs">{t.nav_support}</span>
                    <span className="block text-[10px] text-[#64748b]">Helpline & Helpdesk Tickets</span>
                  </div>
                </div>
              </button>

            </div>

            {/* My Profile */}
            <button
              onClick={() => handleSelectTab('profile')}
              className={`w-full mt-3 p-3.5 rounded-2xl border flex items-center gap-3 transition touch-press ${
                currentTab === 'profile'
                  ? 'border-[#095c54] bg-[#e6f4f1] text-[#095c54]'
                  : 'border-[#e2e8f0] bg-slate-50 text-[#0f2925]'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-[#e2e8f0] text-[#095c54] flex items-center justify-center shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <span className="block font-bold text-xs">{t.nav_profile}</span>
                <span className="block text-[10px] text-[#64748b]">Account, Language & Accessibility</span>
              </div>
            </button>

          </div>
        </div>
      )}
    </>
  );
};
