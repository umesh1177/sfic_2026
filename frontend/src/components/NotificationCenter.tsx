import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Users,
  ShieldCheck,
  ChevronRight,
  Filter,
  Trash2,
  Volume2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api.js';
import { AppNotification } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface NotificationCenterProps {
  onBack?: () => void;
  onNavigateTab: (tab: string) => void;
  lang: Language;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onBack,
  onNavigateTab,
  lang
}) => {
  const t = translations[lang];
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Extended civic notifications to ensure all categories are richly represented
  const initialCivicNotifications: AppNotification[] = [
    {
      id: 'notif-01',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Action In Progress: Dudhiya Talao Dustbin',
      message: 'Sanitation Unit 4B has been dispatched to resolve the overflowing bin complaint #NMC-2026-10021.',
      notification_type: 'complaint_status',
      reference_id: 'comp-01',
      is_read: false,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-02',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Civic Alert: Ward 4 Monsoon Drain Clearance',
      message: 'NMC Health Dept is carrying out pre-monsoon deep gutter desilting in Ward 4. Road access may be slow near Bazar Gate.',
      notification_type: 'civic_alert',
      is_read: false,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 'notif-03',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Cleanliness Drive RSVP Confirmed',
      message: 'You are successfully registered for the Dudhiya Talao Lakefront Mega Swachhata Drive on Sunday. Gloves and vests provided.',
      notification_type: 'drive_reminder',
      reference_id: 'drive-01',
      is_read: true,
      created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
    },
    {
      id: 'notif-04',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Civic Karma Reward: +50 Points Added',
      message: 'Your report was verified by the Ward Officer with 5-star accuracy. You earned +50 Civic Karma points!',
      notification_type: 'reward_earned',
      reference_id: 'rew-01',
      is_read: true,
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
    },
    {
      id: 'notif-05',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Single-Use Plastic Ban Enforcement Notice',
      message: 'NMC has banned plastic carry bags below 120 microns. Help us report illegal commercial dumping across all 13 wards.',
      notification_type: 'civic_alert',
      is_read: true,
      created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString()
    }
  ];

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.data && res.data.length > 0) {
        // Merge with initial rich examples to ensure diverse demonstration
        const existingIds = new Set(res.data.map(n => n.id));
        const merged = [...res.data];
        for (const item of initialCivicNotifications) {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        }
        setNotifications(merged);
      } else {
        setNotifications(initialCivicNotifications);
      }
    } catch {
      setNotifications(initialCivicNotifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.markNotificationRead(id);
    } catch {
      // Background sync
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setFeedbackMsg('All notifications marked as read');
    setTimeout(() => setFeedbackMsg(null), 2500);
    try {
      await api.markAllNotificationsRead();
    } catch {
      // Background sync
    }
  };

  const filtered = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'complaints') return n.notification_type === 'complaint_status';
    if (filterType === 'drives') return n.notification_type === 'drive_reminder';
    if (filterType === 'alerts') return n.notification_type === 'civic_alert';
    if (filterType === 'rewards') return n.notification_type === 'reward_earned';
    return true;
  });

  const unreadTotal = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'complaint_status':
        return <CheckCircle2 className="w-5 h-5 text-[#095c54]" />;
      case 'civic_alert':
        return <AlertTriangle className="w-5 h-5 text-[#d97706]" />;
      case 'drive_reminder':
        return <Users className="w-5 h-5 text-[#2563eb]" />;
      case 'reward_earned':
        return <Award className="w-5 h-5 text-[#10b981]" />;
      default:
        return <Bell className="w-5 h-5 text-[#095c54]" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'complaint_status':
        return { label: 'Complaint Update', bg: 'bg-[#e6f4f1] text-[#095c54]' };
      case 'civic_alert':
        return { label: 'Municipal Alert', bg: 'bg-[#fef3c7] text-[#92400e]' };
      case 'drive_reminder':
        return { label: 'Cleanliness Drive', bg: 'bg-[#eff6ff] text-[#1d4ed8]' };
      case 'reward_earned':
        return { label: 'Karma Reward', bg: 'bg-[#ecfdf5] text-[#047857]' };
      default:
        return { label: 'Notice', bg: 'bg-[#f1f5f9] text-[#475569]' };
    }
  };

  const handleActionClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.notification_type === 'complaint_status') {
      onNavigateTab('complaints');
    } else if (n.notification_type === 'drive_reminder') {
      onNavigateTab('drives');
    } else if (n.notification_type === 'reward_earned') {
      onNavigateTab('rewards');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-xl hover:bg-[#f0f6f4] text-[#095c54] transition sm:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="pill-badge py-1 px-3 text-[11px]">
              <span className="badge-dot" />
              NMC Citizen Alerts
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] mt-1 flex items-center gap-2">
            <span>Notifications & Civic Alerts</span>
            {unreadTotal > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#dc2626] text-white font-black animate-pulse">
                {unreadTotal} new
              </span>
            )}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Stay updated with real-time complaint progress, municipal cleanliness drives, and civic announcements.
          </p>
        </div>

        {unreadTotal > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-outline-custom px-4 py-2 text-xs font-extrabold self-start sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#095c54]" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Temporary Feedback Banner */}
      {feedbackMsg && (
        <div className="p-3 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-bold text-[#047857] animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All Notifications', count: notifications.length },
          { id: 'complaints', label: 'Complaints', count: notifications.filter(n => n.notification_type === 'complaint_status').length },
          { id: 'alerts', label: 'Civic Alerts', count: notifications.filter(n => n.notification_type === 'civic_alert').length },
          { id: 'drives', label: 'Drives', count: notifications.filter(n => n.notification_type === 'drive_reminder').length },
          { id: 'rewards', label: 'Karma Rewards', count: notifications.filter(n => n.notification_type === 'reward_earned').length }
        ].map(chip => (
          <button
            key={chip.id}
            onClick={() => setFilterType(chip.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 border ${
              filterType === chip.id
                ? 'bg-[#095c54] text-white border-[#095c54] shadow-sm'
                : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-[#f0f6f4] hover:text-[#095c54]'
            }`}
          >
            <span>{chip.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              filterType === chip.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#64748b]'
            }`}>
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">
          <div className="w-8 h-8 rounded-full border-2 border-[#095c54] border-t-transparent animate-spin mx-auto mb-2" />
          Loading your notifications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#f0f6f4] text-[#095c54] flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-[#095c54]">No Notifications Found</h3>
          <p className="text-xs text-[#64748b] max-w-sm mx-auto">
            You're all caught up! New updates on your reported complaints, cleanliness drives, and NMC announcements will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const badge = getNotificationBadge(n.notification_type);

            return (
              <div
                key={n.id}
                onClick={() => handleActionClick(n)}
                className={`bg-white rounded-2xl border transition p-4 sm:p-5 flex items-start gap-3.5 cursor-pointer hover:shadow-md ${
                  !n.is_read
                    ? 'border-[#b8e0d7] shadow-sm bg-gradient-to-r from-[#f0f6f4]/50 to-white'
                    : 'border-[#e2e8f0] hover:border-[#b8e0d7]'
                }`}
              >
                {/* Left Icon Badge */}
                <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                  !n.is_read ? 'bg-[#e6f4f1]' : 'bg-[#f8faf9]'
                }`}>
                  {getNotificationIcon(n.notification_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#94a3b8] font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-xs sm:text-sm text-[#0f2925]">
                    {n.title}
                  </h3>

                  <p className="text-xs text-[#64748b] leading-relaxed">
                    {n.message}
                  </p>

                  {/* Contextual Action Link */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#095c54] flex items-center gap-1 hover:underline">
                      {n.notification_type === 'complaint_status' && 'View Complaint Tracking →'}
                      {n.notification_type === 'drive_reminder' && 'View Cleanliness Drive →'}
                      {n.notification_type === 'reward_earned' && 'View Badges & Leaderboard →'}
                      {n.notification_type === 'civic_alert' && 'Municipal Swachhata Advisory'}
                    </span>

                    {!n.is_read && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="text-[10px] font-bold text-[#64748b] hover:text-[#095c54]"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

