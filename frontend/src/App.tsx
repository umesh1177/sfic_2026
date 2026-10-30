import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader.js';
import { MobileBottomNavigation } from './components/MobileBottomNavigation.js';
import { DashboardHome } from './components/DashboardHome.js';
import { MyComplaints } from './components/MyComplaints.js';
import { NavsariMap } from './components/NavsariMap.js';
import { CleanlinessDrives } from './components/CleanlinessDrives.js';
import { CommunityChallenges } from './components/CommunityChallenges.js';
import { RewardsRecognition } from './components/RewardsRecognition.js';
import { FeedbackSupport } from './components/FeedbackSupport.js';
import { MyProfile } from './components/MyProfile.js';
import { AuthModal } from './components/AuthModal.js';
import { ReportIssueModal } from './components/ReportIssueModal.js';
import { PwaOfflineBanner } from './components/PwaOfflineBanner.js';
import { api } from './services/api.js';
import { Profile, AppNotification, ComplaintCategory, Complaint } from './types/index.js';
import { Language, translations } from './i18n/translations.js';
import { Phone, Mail, MapPin, Sparkles, Shield, Heart } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [user, setUser] = useState<Profile | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  const t = translations[lang];

  // Fetch initial profile & dashboard data
  const loadInitialData = async () => {
    try {
      const [dashRes, catRes] = await Promise.all([
        api.getDashboard(),
        api.getCategories()
      ]);
      setDashboardData(dashRes.data);
      setCategories(catRes.data);

      // Check if user is logged in
      const token = localStorage.getItem('clean_navsari_token');
      if (token) {
        try {
          const meRes = await api.getMe();
          setUser(meRes.data.profile);
          setLang(meRes.data.profile.preferred_language || 'en');
          const notifsRes = await api.getNotifications();
          setNotifications(notifsRes.data);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('clean_navsari_token');
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (profile: Profile) => {
    setUser(profile);
    setLang(profile.preferred_language || 'en');
    api.getNotifications().then(res => setNotifications(res.data)).catch(() => {});
    api.getDashboard().then(res => setDashboardData(res.data)).catch(() => {});
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setCurrentTab('home');
  };

  const handleComplaintSubmitted = (newComplaint: Complaint) => {
    // Refresh dashboard data
    api.getDashboard().then(res => setDashboardData(res.data)).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex flex-col antialiased selection:bg-[#e6f4f1] selection:text-[#095c54]">
      {/* Offline Connectivity Banner */}
      <PwaOfflineBanner />

      {/* Main Glassmorphic Header */}
      <AppHeader
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        setLang={setLang}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkNotificationRead={async id => {
          await api.markNotificationRead(id);
          setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
        }}
        onMarkAllNotificationsRead={async () => {
          await api.markAllNotificationsRead();
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }}
        onOpenReport={() => {
          if (!user) {
            handleOpenAuth('login');
          } else {
            setReportModalOpen(true);
          }
        }}
      />

      {/* Main Application Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 lg:pb-12">
        {currentTab === 'home' && (
          <DashboardHome
            user={user}
            dashboardData={dashboardData}
            onOpenReport={() => {
              if (!user) {
                handleOpenAuth('login');
              } else {
                setReportModalOpen(true);
              }
            }}
            onNavigateTab={tab => setCurrentTab(tab)}
            lang={lang}
          />
        )}

        {currentTab === 'complaints' && (
          <MyComplaints
            onOpenReport={() => {
              if (!user) {
                handleOpenAuth('login');
              } else {
                setReportModalOpen(true);
              }
            }}
            lang={lang}
          />
        )}

        {currentTab === 'map' && (
          <NavsariMap categories={categories} lang={lang} />
        )}

        {currentTab === 'drives' && (
          <CleanlinessDrives lang={lang} />
        )}

        {currentTab === 'challenges' && (
          <CommunityChallenges lang={lang} />
        )}

        {currentTab === 'rewards' && (
          <RewardsRecognition lang={lang} />
        )}

        {currentTab === 'support' && (
          <FeedbackSupport lang={lang} />
        )}

        {currentTab === 'profile' && (
          <MyProfile
            user={user}
            onUpdateUser={updated => setUser(updated)}
            onLogout={handleLogout}
            lang={lang}
            setLang={setLang}
            onOpenAuth={handleOpenAuth}
          />
        )}
      </main>

      {/* Mobile-First Bottom Navigation (docked at screen bottom for < 1024px) */}
      <MobileBottomNavigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenReport={() => {
          if (!user) {
            handleOpenAuth('login');
          } else {
            setReportModalOpen(true);
          }
        }}
        lang={lang}
        unreadComplaintsCount={dashboardData?.stats?.pending || 0}
      />

      {/* Civic Tech Municipal Footer */}
      <footer className="bg-white border-t border-[#e2e8f0] py-8 mt-auto hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#095c54] to-[#10b981] flex items-center justify-center text-white font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-base text-[#095c54]">
                  {t.app_title}
                </span>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed">
                Empowering citizens of Navsari, Gujarat to report, monitor and solve municipal cleanliness challenges with AI & GPS precision.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#095c54]">
                <Shield className="w-3.5 h-3.5 text-[#10b981]" />
                <span>SIH Problem Statement: PS000089</span>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-xs text-[#0f2925] uppercase tracking-wider mb-3">
                Municipal Helpdesk
              </h4>
              <ul className="text-xs text-[#64748b] space-y-2">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>NMC Helpline: 1800-233-0194</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>swachhata@navsarimunicipal.in</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>Junathana, Navsari, Gujarat 396445</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-xs text-[#0f2925] uppercase tracking-wider mb-3">
                Civic Portals
              </h4>
              <ul className="text-xs text-[#64748b] space-y-2">
                <li><a href="#map" onClick={e => { e.preventDefault(); setCurrentTab('map'); }} className="hover:text-[#095c54]">Navsari Ward Boundary Map</a></li>
                <li><a href="#drives" onClick={e => { e.preventDefault(); setCurrentTab('drives'); }} className="hover:text-[#095c54]">Swachhata Volunteer Drives</a></li>
                <li><a href="#challenges" onClick={e => { e.preventDefault(); setCurrentTab('challenges'); }} className="hover:text-[#095c54]">Ward Cleanliness Challenges</a></li>
                <li><a href="#support" onClick={e => { e.preventDefault(); setCurrentTab('support'); }} className="hover:text-[#095c54]">Citizen Feedback & Redressal</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-xs text-[#0f2925] uppercase tracking-wider mb-3">
                Swachh Bharat Mission (Urban)
              </h4>
              <div className="p-3.5 rounded-2xl bg-[#f0f6f4] border border-[#b8e0d7] text-xs text-[#05443e]">
                <p className="font-bold">Swachh Navsari · Sundar Navsari</p>
                <p className="text-[11px] text-[#0d6e65] mt-1">
                  100% door-to-door waste collection & PostGIS ward monitoring active.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between text-xs text-[#94a3b8]">
            <div>&copy; 2026 Navsari Municipal Corporation (NMC). All rights reserved.</div>
            <div className="flex items-center gap-1">
              Crafted with civic pride for Navsari <Heart className="w-3.5 h-3.5 text-[#dc2626] fill-[#dc2626]" />
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Signup, Login, Forgot Password) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authInitialMode}
        lang={lang}
      />

      {/* Guided 8-Step Report Issue Modal */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        categories={categories}
        onComplaintSubmitted={handleComplaintSubmitted}
        lang={lang}
      />
    </div>
  );
};

export default App;
