import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ShieldCheck,
  FileText
} from 'lucide-react';

export const WardNotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 'wnot-01',
      title: 'Completion Report Submitted: TSK-NAV-2026-101',
      description: 'Team Leader Kanti Solanki submitted final report for North Lake Promenade dustbin clearance.',
      severity: 'action_required',
      timestamp: '15 mins ago',
      is_read: false
    },
    {
      id: 'wnot-02',
      title: 'GPS Attendance Discrepancy Exception Requested',
      description: 'Suresh Vaghela submitted manual exception justification (Basement signal shield).',
      severity: 'action_required',
      timestamp: '1 hour ago',
      is_read: false
    },
    {
      id: 'wnot-03',
      title: 'SLA Warning: Complaint NMC-2026-10045 Nearing Deadline',
      description: 'Debris removal at Ashapuri Garden East Perimeter has 4 hours remaining before SLA breach.',
      severity: 'urgent',
      timestamp: '2 hours ago',
      is_read: false
    },
    {
      id: 'wnot-04',
      title: 'New Community Cleanliness Drive Proposed',
      description: 'Navsari Green Warriors RWA submitted Lakeside Eco-Cleanliness Drive 2026 for Ward approval.',
      severity: 'info',
      timestamp: '1 day ago',
      is_read: true
    }
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#095c54]" />
            <span>Ward Operational Notifications</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            SLA Escalations, Completion Reports, and Field Exception Alerts
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="text-xs font-bold text-[#095c54] hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`p-4 rounded-3xl border transition flex items-start justify-between gap-3 shadow-xs ${
              !n.is_read
                ? 'bg-white border-[#095c54]/40 ring-1 ring-[#095c54]/10'
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.severity === 'urgent'
                    ? 'bg-red-50 text-red-600'
                    : n.severity === 'action_required'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {n.severity === 'urgent' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-[#0f2925]">{n.title}</h4>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#095c54]" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.description}</p>
                <p className="text-[10px] text-slate-400 font-mono pt-1">{n.timestamp}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setNotifications(
                  notifications.map(item => (item.id === n.id ? { ...item, is_read: true } : item))
                );
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
              title="Mark as read"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

