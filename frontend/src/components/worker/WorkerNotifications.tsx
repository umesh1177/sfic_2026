import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Crown,
  Clock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Language } from '../../i18n/translations.js';

interface WorkerNotificationsProps {
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const WorkerNotifications: React.FC<WorkerNotificationsProps> = ({
  onNavigateTab,
  lang
}) => {
  const [filter, setFilter] = useState<'all' | 'tasks' | 'attendance' | 'alerts'>('all');

  const notifications = [
    {
      id: 'notif-1',
      title: 'Appointed Temporary Team Leader for Drain Desilting',
      message: 'Ward 3 Officer has appointed you as the temporary Team Leader for Task NMC-TSK-2026-001 (Dudhiya Talao Road). You are responsible for team coordination and completion reporting.',
      type: 'leadership',
      timestamp: 'Today, 06:15 AM',
      read: false,
      tabTarget: 'team',
      taskId: 'a1000000-0000-0000-0000-000000000001'
    },
    {
      id: 'notif-2',
      title: 'GPS Geofence Attendance Verified',
      message: 'Your punch-in at Dudhiya Talao (18.5m from site) was successfully validated against Navsari Municipal GIS.',
      type: 'attendance',
      timestamp: 'Today, 06:48 AM',
      read: true,
      tabTarget: 'attendance'
    },
    {
      id: 'notif-3',
      title: 'Monsoon Silt Removal Protocol Activated',
      message: 'All Ward 3 drainage workers must wear rubber safety boots, reflective vests, and deploy road cones before lifting drain lids.',
      type: 'alerts',
      timestamp: 'Yesterday, 04:30 PM',
      read: true,
      tabTarget: 'help_support'
    },
    {
      id: 'notif-4',
      title: 'Task Completion Approved by Ward Officer',
      message: 'Yesterday\'s public market waste clearance task (NMC-TSK-2026-003) was verified and approved by the Ward Officer. 100% attendance recorded.',
      type: 'tasks',
      timestamp: 'Yesterday, 02:15 PM',
      read: true,
      tabTarget: 'assignments'
    }
  ];

  const filtered = notifications.filter(n => {
    if (filter === 'tasks') return n.type === 'tasks' || n.type === 'leadership';
    if (filter === 'attendance') return n.type === 'attendance';
    if (filter === 'alerts') return n.type === 'alerts';
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
            Real-time assignment updates, shift schedules, and safety instructions from Ward 3 Command.
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap">
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
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.map(notif => (
          <div
            key={notif.id}
            className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              notif.read ? 'bg-white border-[#e2e8f0]' : 'bg-[#e6f4f1]/50 border-[#b8e0d7] shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                notif.type === 'leadership' ? 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]' :
                notif.type === 'attendance' ? 'bg-[#ecfdf5] text-[#047857]' :
                notif.type === 'alerts' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#e6f4f1] text-[#095c54]'
              }`}>
                {notif.type === 'leadership' ? <Crown className="w-5 h-5" /> :
                 notif.type === 'attendance' ? <Clock className="w-5 h-5" /> :
                 notif.type === 'alerts' ? <ShieldAlert className="w-5 h-5" /> :
                 <CheckCircle2 className="w-5 h-5" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-[#0f2925] text-sm">{notif.title}</h3>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-[#64748b] leading-relaxed">{notif.message}</p>
                <span className="text-[11px] text-[#94a3b8] block pt-0.5">{notif.timestamp}</span>
              </div>
            </div>

            {notif.tabTarget && (
              <button
                type="button"
                onClick={() => onNavigateTab(notif.tabTarget, notif.taskId)}
                className="w-full sm:w-auto px-4 py-2 bg-[#095c54] hover:bg-[#06423c] text-white rounded-2xl text-xs font-black shrink-0 flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <span>View</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

