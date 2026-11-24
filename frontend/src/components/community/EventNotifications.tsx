import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  AlertTriangle,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Radio,
  Eye,
  MessageSquare
} from 'lucide-react';
import { CommunityActivity, ActivityAnnouncement } from '../../types/index.js';
import { api } from '../../services/api.js';

interface EventNotificationsProps {
  activities: CommunityActivity[];
}

export const EventNotifications: React.FC<EventNotificationsProps> = ({ activities }) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '');
  const [announcements, setAnnouncements] = useState<ActivityAnnouncement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [form, setForm] = useState({
    title: '',
    message: '',
    target_audience: 'all_registered',
    priority: 'normal'
  });

  const loadAnnouncements = async (actId?: string) => {
    setLoading(true);
    try {
      const res = await api.getCommunityAnnouncements(actId || selectedActivityId);
      if (res.success && res.data) {
        setAnnouncements(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedActivityId) {
      loadAnnouncements(selectedActivityId);
    }
  }, [selectedActivityId]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId || !form.title.trim() || !form.message.trim()) {
      alert('Please select a drive and fill out the announcement fields.');
      return;
    }

    setSending(true);
    try {
      const res = await api.createActivityAnnouncement(selectedActivityId, {
        title: form.title.trim(),
        message: form.message.trim(),
        target_audience: form.target_audience,
        priority: form.priority,
        channels: ['in_app', 'sms']
      });

      if (res.success) {
        setSuccessMessage('Announcement dispatched to registered participants!');
        setForm({
          title: '',
          message: '',
          target_audience: 'all_registered',
          priority: 'normal'
        });
        loadAnnouncements(selectedActivityId);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err: any) {
      alert(`Failed to send announcement: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Targeted Event Notifications
        </h1>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Two-Column Grid: Form + History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Compose Announcement Form */}
        <form
          onSubmit={handleSendAnnouncement}
          className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Radio className="w-4 h-4 text-[#095c54]" />
            <h2 className="text-sm font-extrabold text-slate-900">Compose Targeted Announcement</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Target Cleanliness Drive *</label>
            <select
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-bold text-slate-900 outline-none bg-white"
            >
              {activities.map(act => (
                <option key={act.id} value={act.id}>
                  {act.title} ({new Date(act.proposed_start_at).toLocaleDateString()}) - {act.ward_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Recipient Audience</label>
              <select
                value={form.target_audience}
                onChange={e => setForm(prev => ({ ...prev, target_audience: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none bg-white"
              >
                <option value="all_registered">All Registered Citizens</option>
                <option value="confirmed_only">Confirmed Attendees Only</option>
                <option value="waitlist_only">Waitlist Queue Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Priority Level</label>
              <select
                value={form.priority}
                onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none bg-white"
              >
                <option value="normal">Normal (Info)</option>
                <option value="urgent">Urgent (Weather / Schedule)</option>
                <option value="critical">Critical (Reschedule / Cancellation)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Announcement Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Assembly Point Shifted to East Promenade Gate"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Detailed Message *</label>
            <textarea
              rows={4}
              value={form.message}
              onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Provide clear guidance for volunteers regarding arrival time, supplies, or weather adjustments..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-medium text-slate-900 outline-none resize-none"
            />
          </div>

          {/* Recipient Isolation Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#095c54]" />
              <span>Targeted Delivery Protection</span>
            </p>
            <p className="text-[11px] text-slate-500">
              This announcement will ONLY be delivered to citizens registered for this drive (
              <strong>{selectedActivity?.registered_count || 0} participants</strong>). It will not be sent to unrelated users.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={sending || !form.title.trim() || !form.message.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Dispatching...' : 'Broadcast Announcement'}</span>
            </button>
          </div>
        </form>

        {/* Right: Broadcast History Feed */}
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#095c54]" />
            Previous Drive Announcements
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">No Announcements Dispatched</p>
              <p className="text-[11px] text-slate-500">
                Announcements sent to this drive's registered volunteers will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(an => (
                <div
                  key={an.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        an.priority === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : an.priority === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-100 text-[#095c54]'
                      }`}
                    >
                      {(an.priority || 'NORMAL').toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(an.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900">{an.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{an.message}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Audience: <strong>{an.target_audience?.replace(/_/g, ' ') || 'All registered'}</strong></span>
                    <span className="text-[#095c54] font-bold">
                      {an.recipients_count ?? 'Delivered'} recipients
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
