import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  RefreshCw,
  CheckCheck,
  Award,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import { AppNotification } from '../../types/index.js';

export const WardNotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterUnread, setFilterUnread] = useState<boolean>(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to load ward notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = filterUnread ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#095c54]" />
            <span>Ward Operational Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live Community Drive Proposals, Evidence Review Requests, SLA Alerts &amp; Approvals
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#095c54] hover:bg-emerald-50 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit text-xs">
        <button
          type="button"
          onClick={() => setFilterUnread(false)}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            !filterUnread ? 'bg-[#095c54] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterUnread(true)}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            filterUnread ? 'bg-[#095c54] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading live ward notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto opacity-80" />
          <p className="text-sm font-extrabold text-slate-800">All Caught Up!</p>
          <p className="text-xs text-slate-500">
            No {filterUnread ? 'unread ' : ''}notifications right now. New community drive proposals, evidence submissions, and ward alerts will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const isUrgent =
              n.notification_type === 'civic_alert' ||
              n.title.toLowerCase().includes('sla') ||
              n.title.toLowerCase().includes('urgent');
            const isEvidenceOrProposal =
              n.title.toLowerCase().includes('evidence') ||
              n.title.toLowerCase().includes('proposal') ||
              n.title.toLowerCase().includes('registration');

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                }}
                className={`p-4 rounded-3xl border transition flex items-start justify-between gap-3 shadow-xs cursor-pointer ${
                  !n.is_read
                    ? 'bg-emerald-50/30 border-[#095c54]/40 ring-1 ring-[#095c54]/10'
                    : 'bg-white border-[#e2e8f0]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isUrgent
                        ? 'bg-red-50 text-red-600'
                        : isEvidenceOrProposal
                        ? 'bg-amber-50 text-amber-600'
                        : n.notification_type === 'certificate'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : n.notification_type === 'certificate' ? (
                      <Award className="w-4 h-4" />
                    ) : isEvidenceOrProposal ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-extrabold text-[#0f2925]">{n.title}</h4>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#095c54]" />}
                      {n.points_awarded && n.points_awarded > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          <Sparkles className="w-3 h-3" />+{n.points_awarded} pts
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 font-mono pt-1">
                      {new Date(n.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleMarkRead(n.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#095c54] shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
