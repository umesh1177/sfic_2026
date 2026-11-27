import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader.js';
import { DesktopSidebar } from './components/DesktopSidebar.js';
import { MobileBottomNavigation } from './components/MobileBottomNavigation.js';
import { DashboardHome } from './components/DashboardHome.js';
import { MyComplaints } from './components/MyComplaints.js';
import { CleanlinessDrives } from './components/CleanlinessDrives.js';
import { CitizenCertificatesView } from './components/CitizenCertificatesView.js';
import { RewardsRecognition } from './components/RewardsRecognition.js';
import { FeedbackSupport } from './components/FeedbackSupport.js';
import { MyProfile } from './components/MyProfile.js';
import { NotificationCenter } from './components/NotificationCenter.js';
import { AuthPage } from './components/AuthPage.js';
import { ReportIssuePage } from './components/ReportIssuePage.js';
import { PwaOfflineBanner } from './components/PwaOfflineBanner.js';
import { CommunityHeadDashboard } from './components/community/CommunityHeadDashboard.js';
import { WorkerDashboard } from './components/worker/WorkerDashboard.js';
import { WardOfficerDashboard } from './components/ward/WardOfficerDashboard.js';
import { NMCAdminDashboard } from './components/admin/NMCAdminDashboard.js';
import { LocationMonitor } from './components/common/LocationMonitor.js';
import { OfflineSyncBanner } from './components/common/OfflineSyncBanner.js';
import { PwaNotificationManager } from './components/common/PwaNotificationManager.js';
import { PublicCertificateVerificationModal } from './components/common/PublicCertificateVerificationModal.js';
import { api } from './services/api.js';
import { Profile, AppNotification, ComplaintCategory, Complaint } from './types/index.js';
import { Language, translations } from './i18n/translations.js';
import { startDomTranslationSync } from './i18n/domTranslator.js';
import { registerSwachhServiceWorker } from './services/pwaNotifications.js';
import { Phone, Mail, MapPin, Sparkles, Shield, Heart } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [viewMode, setViewMode] = useState<'citizen' | 'community_head' | 'worker' | 'ward_officer' | 'nmc_admin'>('citizen');
  const [user, setUser] = useState<Profile | null>(null);
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('swachh_setu_lang');
    if (saved === 'gu' || saved === 'hi' || saved === 'en') return saved;
    return 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('swachh_setu_lang', newLang);
  };
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [complaintsRefreshTrigger, setComplaintsRefreshTrigger] = useState<number>(0);

  // Deep-link public certificate verification code (?verify_cert=... or ?code=...)
  const [verifyCertCode, setVerifyCertCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('verify_cert') || params.get('code') || null;
  });

  const handleCloseVerification = () => {
    setVerifyCertCode(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('verify_cert');
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
    } catch {
      // safe fallback
    }
  };

  const t = translations[lang];

  // Fetch initial profile & dashboard data
  const loadInitialData = async () => {
    try {
      const [dashRes, catRes] = await Promise.all([
        api.getDashboard().catch(() => ({ data: null })),
        api.getCategories().catch(() => ({ data: [] }))
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
          if (meRes.data.profile.role === 'nmc_admin' || (meRes.data.profile.role as any) === 'super_admin') {
            setViewMode('nmc_admin');
          } else if (meRes.data.profile.role === 'ward_officer') {
            setViewMode('ward_officer');
          } else if (meRes.data.profile.role === 'community_head') {
            setViewMode('community_head');
          } else if (meRes.data.profile.role === 'worker' || (meRes.data.profile.role as any) === 'sanitation_worker') {
            setViewMode('worker');
          }
          const notifsRes = await api.getNotifications().catch(() => ({ data: [] }));
          setNotifications(notifsRes.data);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('clean_navsari_token');
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    registerSwachhServiceWorker();
  }, []);

  // Synchronize full-app UI chrome translation (EN / ગુજરાતી / हिन्दी) while preserving user-submitted content
  useEffect(() => {
    document.documentElement.lang = lang;
    return startDomTranslationSync(lang);
  }, [lang, viewMode, currentTab, user?.id, isInitializing]);

  const handleAuthSuccess = (profile: Profile) => {
    setUser(profile);
    setLang(profile.preferred_language || 'en');
    if (profile.role === 'nmc_admin' || (profile.role as any) === 'super_admin') {
      setViewMode('nmc_admin');
    } else if (profile.role === 'ward_officer') {
      setViewMode('ward_officer');
    } else if (profile.role === 'community_head') {
      setViewMode('community_head');
    } else if (profile.role === 'worker' || (profile.role as any) === 'sanitation_worker') {
      setViewMode('worker');
    } else {
      setViewMode('citizen');
    }
    api.getNotifications().then(res => setNotifications(res.data)).catch(() => {});
    api.getDashboard().then(res => setDashboardData(res.data)).catch(() => {});
    setCurrentTab('home');
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setViewMode('citizen');
    setCurrentTab('home');
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'nmc_admin' || tab === 'admin') {
      setViewMode('nmc_admin');
    } else if (tab === 'ward_officer') {
      setViewMode('ward_officer');
    } else if (tab === 'community_head') {
      setViewMode('community_head');
    } else if (tab === 'worker') {
      setViewMode('worker');
    } else {
      setViewMode('citizen');
      setCurrentTab(tab);
    }
  };

  const handleComplaintSubmitted = (newComplaint: Complaint) => {
    // Refresh dashboard stats
    api.getDashboard().then(res => setDashboardData(res.data)).catch(() => {});
    setComplaintsRefreshTrigger(Date.now());
  };

  // 1. Loading screen while checking authentication token
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#095c54] to-[#10b981] flex items-center justify-center text-white shadow-xl shadow-[#095c54]/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center ring-2 ring-white">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-[#095c54]">Swachh Setu</p>
          <p className="text-xs font-bold text-[#64748b] animate-pulse">
            {lang === 'gu' ? 'લોડ થઈ રહ્યું છે...' : lang === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Show Dedicated Login / Sign Up Page directly!
  if (!user) {
    return (
      <>
        {verifyCertCode && (
          <PublicCertificateVerificationModal
            certificateCode={verifyCertCode}
            onClose={handleCloseVerification}
          />
        )}
        <AuthPage
          onSuccess={handleAuthSuccess}
          lang={lang}
          onLanguageChange={setLang}
        />
      </>
    );
  }

  // 3. Community Head Dashboard View
  if (viewMode === 'community_head') {
    return (
      <>
        {verifyCertCode && (
          <PublicCertificateVerificationModal
            certificateCode={verifyCertCode}
            onClose={handleCloseVerification}
          />
        )}
        <PwaNotificationManager userId={user?.id} />
        <CommunityHeadDashboard
          user={user}
          lang={lang}
          setLang={setLang}
          onLogout={handleLogout}
          onSwitchToCitizenView={() => {
            setViewMode('citizen');
            setCurrentTab('home');
          }}
        />
      </>
    );
  }

  // 4. Municipal Worker Dashboard View
  if (viewMode === 'worker') {
    return (
      <>
        {verifyCertCode && (
          <PublicCertificateVerificationModal
            certificateCode={verifyCertCode}
            onClose={handleCloseVerification}
          />
        )}
        <PwaNotificationManager userId={user?.id} />
        <WorkerDashboard
          user={user}
          lang={lang}
          setLang={setLang}
          onLogout={handleLogout}
          onSwitchToCitizenView={() => {
            setViewMode('citizen');
            setCurrentTab('home');
          }}
        />
      </>
    );
  }

  // 5. Ward Officer Dashboard View
  if (viewMode === 'ward_officer') {
    return (
      <>
        {verifyCertCode && (
          <PublicCertificateVerificationModal
            certificateCode={verifyCertCode}
            onClose={handleCloseVerification}
          />
        )}
        <PwaNotificationManager userId={user?.id} />
        <WardOfficerDashboard
          user={user}
          lang={lang}
          setLang={setLang}
          onLogout={handleLogout}
          onSwitchToCitizenView={() => {
            setViewMode('citizen');
            setCurrentTab('home');
          }}
        />
      </>
    );
  }

  // 6. NMC Central Admin Dashboard View
  if (viewMode === 'nmc_admin') {
    return (
      <>
        {verifyCertCode && (
          <PublicCertificateVerificationModal
            certificateCode={verifyCertCode}
            onClose={handleCloseVerification}
          />
        )}
        <PwaNotificationManager userId={user?.id} />
        <NMCAdminDashboard
          user={user}
          lang={lang}
          setLang={setLang}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // 4. Authenticated Citizen Application
  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f2925] flex antialiased selection:bg-[#e6f4f1] selection:text-[#095c54] overflow-x-clip">
      {/* Public Certificate Verification Modal */}
      {verifyCertCode && (
        <PublicCertificateVerificationModal
          certificateCode={verifyCertCode}
          onClose={handleCloseVerification}
        />
      )}
      {/* Native Mobile PWA Push Notifications */}
      <PwaNotificationManager userId={user?.id} onNewNotifications={setNotifications} />

      {/* Offline Connectivity Banner */}
      <PwaOfflineBanner />

      {/* Desktop Left Sidebar (Visible on lg: screens) */}
      <DesktopSidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigateTab}
        user={user}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
        unreadCount={dashboardData?.stats?.pending || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Role Switcher Return Banner (Only visible to Staff/Heads viewing citizen mode) */}
        {(user?.role === 'community_head' || user?.role === 'worker' || (user?.role as any) === 'sanitation_worker') && (
          <div className="bg-[#095c54] text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm sticky top-0 z-40">
            <span className="font-semibold text-emerald-100">
              Viewing Swachh Setu in Citizen Mode
            </span>
            <button
              onClick={() => setViewMode(user?.role === 'community_head' ? 'community_head' : 'worker')}
              className="px-3 py-1 bg-white text-[#095c54] font-extrabold rounded-lg hover:bg-emerald-50 transition text-xs shadow-xs"
            >
              Return to {user?.role === 'community_head' ? 'Community Head Portal' : 'Field Worker Portal'} &rarr;
            </button>
          </div>
        )}

        {/* Mobile / Tablet Header (Hidden on large screens where Left Sidebar is shown) */}
        <div className="lg:hidden">
          <AppHeader
            currentTab={currentTab}
            setCurrentTab={handleNavigateTab}
            lang={lang}
            setLang={setLang}
            user={user}
            onOpenAuth={() => {}}
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
            onOpenReport={() => setCurrentTab('report')}
          />
        </div>

        {/* Continuous Location Monitoring & Offline Auto-Sync for Citizens */}
        <LocationMonitor roleLabel="Citizen" />
        <OfflineSyncBanner onSynced={loadInitialData} />

        {/* Content Container (Mobile-first compact padding with safe-area support) */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-6 pb-[max(5.5rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))] lg:pb-10">
          {/* Direct Full-Page View: Report an Issue (NO modal) */}
          {currentTab === 'report' && (
            <ReportIssuePage
              onBack={() => setCurrentTab('home')}
              categories={categories}
              onComplaintSubmitted={handleComplaintSubmitted}
              lang={lang}
              onNavigateToComplaints={() => setCurrentTab('complaints')}
            />
          )}

          {currentTab === 'home' && (
            <DashboardHome
              user={user}
              dashboardData={dashboardData}
              onOpenReport={() => setCurrentTab('report')}
              onNavigateTab={tab => setCurrentTab(tab)}
              lang={lang}
            />
          )}

          {currentTab === 'complaints' && (
            <MyComplaints
              key={complaintsRefreshTrigger}
              onOpenReport={() => setCurrentTab('report')}
              lang={lang}
            />
          )}

          {currentTab === 'drives' && (
            <CleanlinessDrives lang={lang} />
          )}

          {currentTab === 'certificates' && (
            <CitizenCertificatesView
              lang={lang}
              user={user}
              onBack={() => setCurrentTab('home')}
              onExploreDrives={() => setCurrentTab('drives')}
            />
          )}

          {(currentTab === 'rewards' || currentTab === 'posts') && (
            <RewardsRecognition lang={lang} />
          )}

          {currentTab === 'support' && (
            <FeedbackSupport lang={lang} />
          )}

          {currentTab === 'notifications' && (
            <NotificationCenter
              onBack={() => setCurrentTab('home')}
              onNavigateTab={tab => setCurrentTab(tab)}
              lang={lang}
            />
          )}

          {currentTab === 'profile' && (
            <MyProfile
              user={user}
              onUpdateUser={updated => setUser(updated)}
              onLogout={handleLogout}
              lang={lang}
              setLang={setLang}
              onOpenAuth={() => {}}
            />
          )}
        </main>

        {/* Civic Tech Municipal Footer (Desktop only) */}
        <footer className="bg-white border-t border-[#e2e8f0] py-6 px-4 sm:px-8 mt-auto hidden lg:block">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between text-xs text-[#64748b] gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#095c54]">Swachh Setu</span>
              <span>· Navsari Municipal Corporation, Gujarat</span>
            </div>
            <div className="flex items-center gap-4">
              <span>NMC Helpline: 1800-233-0194</span>
              <div className="flex items-center gap-1 text-[#94a3b8]">
                <span>Crafted with pride</span>
                <Heart className="w-3.5 h-3.5 text-[#dc2626] fill-[#dc2626]" />
              </div>
            </div>
          </div>
        </footer>

        {/* Mobile-First Bottom Navigation (Docked for screens < 1024px) */}
        <div className="lg:hidden">
          <MobileBottomNavigation
            currentTab={currentTab}
            setCurrentTab={handleNavigateTab}
            onOpenReport={() => setCurrentTab('report')}
            lang={lang}
            unreadComplaintsCount={dashboardData?.stats?.pending || 0}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
