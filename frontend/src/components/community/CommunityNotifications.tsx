import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Calendar,
  CheckCheck,
  Trash2,
  Clock,
  Award,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AppNotification, DriveCompletionCertificate } from '../../types/index.js';
import { api } from '../../services/api.js';
import { CompletionCertificateModal } from '../CompletionCertificateModal.js';

interface CommunityNotificationsProps {
  onNavigateTab: (tab: string) => void;
}

export const CommunityNotifications: React.FC<CommunityNotificationsProps> = ({ onNavigateTab }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [viewingCertificate, setViewingCertificate] = useState<DriveCompletionCertificate | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const filtered = filterUnread ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Community Head Notifications
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Official municipal approvals, citizen question alerts, and registration updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm hover:bg-slate-50 transition"
            >
              <CheckCheck className="w-4 h-4 text-[#095c54]" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 w-fit text-xs">
        <button
          onClick={() => setFilterUnread(false)}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            !filterUnread ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilterUnread(true)}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            filterUnread ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <Bell className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs font-bold text-slate-700">No Notifications</p>
          <p className="text-[11px] text-slate-500">You are completely up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const isCert = notif.notification_type === 'certificate' || Boolean(notif.certificate);
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                  if (notif.certificate) {
                    setViewingCertificate(notif.certificate);
                    return;
                  }
                  if (notif.title?.toLowerCase().includes('question')) onNavigateTab('questions');
                  else if (notif.title?.toLowerCase().includes('approval')) onNavigateTab('approvals');
                  else if (notif.title?.toLowerCase().includes('registration')) onNavigateTab('registrations');
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                  isCert
                    ? 'bg-gradient-to-r from-amber-50/60 to-emerald-50/40 border-amber-300 shadow-sm'
                    : notif.is_read
                    ? 'bg-white border-slate-200'
                    : 'bg-teal-50/50 border-teal-300 shadow-sm'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCert
                      ? 'bg-amber-100 text-amber-700'
                      : notif.title?.toLowerCase().includes('question')
                      ? 'bg-amber-100 text-amber-800'
                      : notif.title?.toLowerCase().includes('approval')
                      ? 'bg-emerald-100 text-[#095c54]'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {isCert ? (
                    <Award className="w-5 h-5" />
                  ) : notif.title?.toLowerCase().includes('question') ? (
                    <MessageSquare className="w-4 h-4" />
                  ) : notif.title?.toLowerCase().includes('approval') ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900">{notif.title}</h3>
                      {notif.points_awarded && notif.points_awarded > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          +{notif.points_awarded} Points
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                  {notif.certificate && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (!notif.is_read) handleMarkAsRead(notif.id);
                          setViewingCertificate(notif.certificate!);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-2xs transition"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        <span>View &amp; Download Community Certificate</span>
                      </button>
                    </div>
                  )}
                </div>

                {!notif.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#095c54] mt-2 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Official Community Completion Certificate Modal */}
      {viewingCertificate && (
        <CompletionCertificateModal
          certificate={viewingCertificate}
          onClose={() => setViewingCertificate(null)}
        />
      )}
    </div>
  );
};

