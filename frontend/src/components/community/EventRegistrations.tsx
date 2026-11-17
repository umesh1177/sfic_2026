import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Calendar,
  AlertCircle,
  Filter,
  Check,
  X
} from 'lucide-react';
import { CommunityActivity, ActivityRegistration } from '../../types/index.js';
import { api } from '../../services/api.js';

interface EventRegistrationsProps {
  activities: CommunityActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
}

export const EventRegistrations: React.FC<EventRegistrationsProps> = ({
  activities,
  selectedActivityId,
  onSelectActivity
}) => {
  const [currentActivityId, setCurrentActivityId] = useState<string>(
    selectedActivityId || (activities[0]?.id || '')
  );
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAttendance, setFilterAttendance] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (selectedActivityId && selectedActivityId !== currentActivityId) {
      setCurrentActivityId(selectedActivityId);
    }
  }, [selectedActivityId]);

  const loadRegistrations = async (actId: string) => {
    if (!actId) return;
    setLoading(true);
    try {
      const res = await api.getActivityRegistrations(actId, 1, 100);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.registrations || []);
        setRegistrations(list);
      }
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentActivityId) {
      loadRegistrations(currentActivityId);
    }
  }, [currentActivityId]);

  const handleAttendanceChange = async (
    regId: string,
    status: 'present' | 'absent',
    notes?: string
  ) => {
    try {
      await api.updateRegistrationAttendance(regId, status, notes);
      setRegistrations(prev =>
        prev.map(r => (r.id === regId ? { ...r, attendance_status: status } : r))
      );
      setStatusMessage(`Attendance marked as ${status.toUpperCase()}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      alert(`Error updating attendance: ${err.message}`);
    }
  };

  const handleExportCsv = () => {
    if (!currentActivityId) return;
    const url = api.getRegistrationCsvUrl(currentActivityId);
    window.open(url, '_blank');
  };

  const currentActivity = activities.find(a => a.id === currentActivityId);

  // Filter registrations
  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch =
      (r.citizen_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.citizen_phone || '').includes(searchQuery);

    const matchesAttendance =
      filterAttendance === 'all'
        ? true
        : filterAttendance === 'present'
        ? r.attendance_status === 'present'
        : filterAttendance === 'absent'
        ? r.attendance_status === 'absent'
        : filterAttendance === 'pending'
        ? !r.attendance_status || r.attendance_status === 'unmarked'
        : true;

    return matchesSearch && matchesAttendance;
  });

  const presentCount = registrations.filter(r => r.attendance_status === 'present').length;
  const absentCount = registrations.filter(r => r.attendance_status === 'absent').length;
  const pendingCount = registrations.length - presentCount - absentCount;

  return (
    <div className="space-y-6">
      {/* Header & Activity Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Event Registrations & Attendance
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Monitor registered citizens, mark ground attendance, and export official NMC reports.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={registrations.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold shadow-sm transition disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-[#095c54]" />
          <span>Export Attendance CSV</span>
        </button>
      </div>

      {/* Activity Selector Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-700">Select Cleanliness Drive</label>
        <select
          value={currentActivityId}
          onChange={e => {
            setCurrentActivityId(e.target.value);
            onSelectActivity(e.target.value);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] text-xs font-bold text-slate-900 outline-none bg-white"
        >
          {activities.map(act => (
            <option key={act.id} value={act.id}>
              {act.title} ({new Date(act.proposed_start_at).toLocaleDateString()}) - {act.ward_name}
            </option>
          ))}
        </select>

        {currentActivity && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Total Registered</span>
              <p className="text-base font-extrabold text-slate-900">{registrations.length} / {currentActivity.max_capacity}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-700 text-[11px]">Present (Verified)</span>
              <p className="text-base font-extrabold text-emerald-900">{presentCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-rose-700 text-[11px]">Absent</span>
              <p className="text-base font-extrabold text-rose-900">{absentCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-amber-700 text-[11px]">Unmarked</span>
              <p className="text-base font-extrabold text-amber-900">{pendingCount}</p>
            </div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All (${registrations.length})` },
            { id: 'present', label: `Present (${presentCount})` },
            { id: 'absent', label: `Absent (${absentCount})` },
            { id: 'pending', label: `Unmarked (${pendingCount})` }
          ].map(flt => (
            <button
              key={flt.id}
              onClick={() => setFilterAttendance(flt.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                filterAttendance === flt.id
                  ? 'bg-[#095c54] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search volunteer or phone..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#095c54]"
          />
        </div>
      </div>

      {/* Registrations List (Mobile Cards + Desktop Table) */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <Users className="w-10 h-10 mx-auto text-slate-400" />
          <p className="text-sm font-bold text-slate-800">No Registrations Found</p>
          <p className="text-xs text-slate-500">
            Citizens will appear here once they register for this cleanliness activity.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card List (hidden on lg) */}
          <div className="lg:hidden space-y-3">
            {filteredRegistrations.map((reg, idx) => (
              <div
                key={reg.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {reg.citizen_name || `Volunteer #${idx + 1}`}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {reg.citizen_phone || 'N/A'}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      reg.attendance_status === 'present'
                        ? 'bg-emerald-100 text-emerald-800'
                        : reg.attendance_status === 'absent'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {reg.attendance_status ? reg.attendance_status.toUpperCase() : 'UNMARKED'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Registered: {new Date(reg.registered_at).toLocaleString()}
                </div>

                {/* Attendance Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleAttendanceChange(reg.id, 'present')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      reg.attendance_status === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Present</span>
                  </button>

                  <button
                    onClick={() => handleAttendanceChange(reg.id, 'absent')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      reg.attendance_status === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Absent</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (visible on lg:) */}
          <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Volunteer Name</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Registered At</th>
                  <th className="py-3.5 px-4">Attendance</th>
                  <th className="py-3.5 px-5 text-right">Ground Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRegistrations.map((reg, idx) => (
                  <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-5 font-bold text-slate-900">
                      {reg.citizen_name || `Citizen Volunteer #${idx + 1}`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {reg.citizen_phone || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(reg.registered_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          reg.attendance_status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.attendance_status === 'absent'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {reg.attendance_status ? reg.attendance_status.toUpperCase() : 'UNMARKED'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleAttendanceChange(reg.id, 'present')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            reg.attendance_status === 'present'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>Present</span>
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(reg.id, 'absent')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            reg.attendance_status === 'absent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

