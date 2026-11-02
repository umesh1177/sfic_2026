import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Crown,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Language } from '../../i18n/translations.js';
import { api } from '../../services/api.js';
import { AppNotification } from '../../types/index.js';

interface WorkerNotificationsProps {
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const WorkerNotifications: React.FC<WorkerNotificationsProps> = ({
  onNavigateTab,
  lang
}) => {
  const [filter, setFilter] = useState<'all' | 'tasks' | 'attendance' | 'alerts'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch worker notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'tasks') return n.notification_type === 'complaint_status';
    if (filter === 'attendance') return n.notification_type === 'civic_alert';
    if (filter === 'alerts') return n.notification_type === 'system_alert';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0f2925] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#095c54]" />
            <span>Worker Field Notifications & Duty Alerts</span>
          </h2>
          <p className="text-xs text-[#64748b] mt-1">
            Real-time assignment updates, shift schedules, and safety instructions from Ward Operations Command.
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {(['all', 'tasks', 'attendance', 'alerts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`text-xs px-3.5 py-1.5 rounded-2xl font-black capitalize transition ${
                filter === tab
                  ? 'bg-[#095c54] text-white shadow-xs'
                  : 'bg-[#f8faf9] text-[#64748b] hover:text-[#095c54] border border-[#e2e8f0]'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={fetchNotifications}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] shadow-xs">
          <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">Loading duty notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#0f2925]">No Notifications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You are all caught up! Work orders, team updates, and municipal duty alerts will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                notif.is_read ? 'bg-white border-[#e2e8f0]' : 'bg-[#e6f4f1]/50 border-[#b8e0d7] shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-2xl shrink-0 ${
                  notif.notification_type === 'system_alert' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  notif.notification_type === 'civic_alert' ? 'bg-[#ecfdf5] text-[#047857]' :
                  'bg-[#e6f4f1] text-[#095c54]'
                }`}>
                  {notif.notification_type === 'system_alert' ? <ShieldAlert className="w-5 h-5" /> :
                   notif.notification_type === 'civic_alert' ? <Clock className="w-5 h-5" /> :
                   <CheckCircle2 className="w-5 h-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-[#0f2925] text-sm">{notif.title}</h3>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">{notif.message}</p>
                  <span className="text-[11px] text-[#94a3b8] block pt-0.5">
                    {new Date(notif.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!notif.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-xs text-slate-500 hover:text-[#095c54] font-bold px-2 py-1"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleMarkRead(notif.id);
                    onNavigateTab('assign_work', notif.reference_id);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#095c54] hover:bg-[#06423c] text-white rounded-2xl text-xs font-black shrink-0 flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

