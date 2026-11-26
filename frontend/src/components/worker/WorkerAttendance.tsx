import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileQuestion,
  History,
  Send,
  Navigation
} from 'lucide-react';
import { WorkAssignment, WorkerAttendance as AttendanceType, WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { api } from '../../services/api.js';

interface WorkerAttendanceProps {
  assignments: WorkAssignment[];
  profile: WorkerProfile | null;
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const WorkerAttendance: React.FC<WorkerAttendanceProps> = ({
  assignments,
  profile,
  onNavigateTab,
  lang
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(assignments[0]?.id || '');
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [latestAttendance, setLatestAttendance] = useState<AttendanceType | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Exception Modal State
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [submittingException, setSubmittingException] = useState(false);
  const [exceptionSuccess, setExceptionSuccess] = useState<string | null>(null);

  const selectedTask = assignments.find(a => a.id === selectedTaskId) || assignments[0];

  const fetchLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser or device.');
      return;
    }

    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || 'Unable to retrieve your GPS location. Please turn on Location services.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const loadAttendanceHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getWorkerAttendanceHistory();
      if (res.data) {
        setAttendanceHistory(res.data);
      }
    } catch (err: any) {
      console.warn('Could not fetch attendance history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLiveLocation();
    loadAttendanceHistory();
  }, []);

  const handleMarkAttendance = async () => {
    if (!selectedTaskId) {
      alert('Please select a task first.');
      return;
    }

    if (!deviceCoords) {
      fetchLiveLocation();
      alert('Locating GPS signal. Please try again in a few moments.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.markWorkerAttendance({
        assignment_id: selectedTaskId,
        latitude: deviceCoords.lat,
        longitude: deviceCoords.lng,
        gps_accuracy_meters: deviceCoords.accuracy
      });

      if (res.data) {
        setLatestAttendance(res.data);
      }
      loadAttendanceHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !exceptionReason.trim()) return;

    setSubmittingException(true);
    try {
      await api.requestAttendanceException({
        assignment_id: selectedTaskId,
        reason: exceptionReason.trim()
      });
      setExceptionSuccess('Exception submitted to Ward 3 Officer for manual review and authorization.');
      setExceptionReason('');
      setTimeout(() => {
        setShowExceptionModal(false);
        setExceptionSuccess(null);
      }, 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exception');
    } finally {
      setSubmittingException(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar (Citizen Dashboard Theme) */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0f2925] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#095c54]" />
            <span>GPS Geofence-Validated Attendance</span>
          </h2>
        </div>

        <button
          type="button"
          onClick={fetchLiveLocation}
          disabled={locating}
          className="px-3.5 py-2 bg-[#f8faf9] hover:bg-[#e6f4f1] border border-[#e2e8f0] text-[#0f2925] text-xs font-bold rounded-2xl flex items-center gap-2 transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin text-[#095c54]' : ''}`} />
          <span>{locating ? 'Acquiring GPS...' : 'Refresh GPS Signal'}</span>
        </button>
      </div>

      {/* 2. Worksite & Location Verification Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5 sm:p-6 space-y-5">
            <div>
              <label className="text-xs font-black text-[#0f2925] uppercase tracking-wider block mb-1.5">
                Select Worksite Task to Punch In
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full text-xs font-semibold p-3 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl text-[#0f2925] focus:ring-2 focus:ring-[#095c54]/10 focus:border-[#095c54] outline-none"
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.task_code} - {a.title} ({a.location_name})
                  </option>
                ))}
              </select>
            </div>

            {selectedTask && (
              <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0] space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-[#0f2925]">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    {selectedTask.location_name}
                  </span>
                  <span className="bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] px-2 py-0.5 rounded-full font-mono text-[11px] font-bold">
                    Geofence: {selectedTask.attendance_radius_meters}m
                  </span>
                </div>
                <p className="text-[#64748b]">{selectedTask.address}</p>
                <div className="flex items-center gap-3 text-[#64748b] pt-1 border-t border-[#e2e8f0]">
                  <span>Shift: {selectedTask.scheduled_start_time} - {selectedTask.expected_end_time}</span>
                  <span>·</span>
                  <span>Ward: {selectedTask.ward_name}</span>
                </div>
              </div>
            )}

            {/* Device GPS Diagnostic */}
            <div className="p-4 rounded-2xl border border-[#e2e8f0] space-y-2 bg-[#f8faf9]">
              <span className="text-xs font-black text-[#0f2925] uppercase tracking-wider block">
                Current Device GPS Sensor Status
              </span>

              {locError ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{locError}</span>
                </div>
              ) : deviceCoords ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">Live Coordinates:</span>
                    <span className="font-mono text-[#0f2925] font-bold">
                      {deviceCoords.lat.toFixed(5)}, {deviceCoords.lng.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">GPS Signal Accuracy:</span>
                    <span className={`font-extrabold flex items-center gap-1 ${
                      deviceCoords.accuracy <= 25 ? 'text-[#047857]' :
                      deviceCoords.accuracy <= 65 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ±{deviceCoords.accuracy} meters ({deviceCoords.accuracy <= 65 ? 'Acceptable' : 'Weak Signal'})
                    </span>
                  </div>
                  {deviceCoords.accuracy > 65 && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                      ⚠️ Accuracy is weak. Please step under open sky for accurate geofence verification.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#64748b]">Acquiring GPS fix from device...</p>
              )}
            </div>

            {/* Check-In Action Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleMarkAttendance}
                disabled={submitting || locating}
                className="w-full py-3.5 bg-[#095c54] hover:bg-[#06423c] disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Coordinates with Navsari Municipal GIS...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Present at Worksite (GPS Punch-In)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowExceptionModal(true)}
                className="w-full py-2 text-xs font-bold text-[#64748b] hover:text-[#0f2925] flex items-center justify-center gap-1.5"
              >
                <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
                <span>GPS Discrepancy? Request Manual Exception to Ward Officer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Latest Punch Result & Audit Verification */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#0f2925] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#095c54]" />
              <span>Location Verification Status</span>
            </h3>

            {latestAttendance ? (
              <div className={`p-4 rounded-2xl border ${
                latestAttendance.validation_status === 'verified_match'
                  ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#047857] shrink-0" />
                  <span className="capitalize">{latestAttendance.validation_status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs mt-1 font-medium">{latestAttendance.validation_reason}</p>
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Distance from Task Site:</span>
                    <span className="font-bold">{latestAttendance.distance_from_assignment_meters} meters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Allowed Geofence Radius:</span>
                    <span className="font-bold">{latestAttendance.geofence_radius_meters} meters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Punch Time:</span>
                    <span className="font-mono">{new Date(latestAttendance.attendance_timestamp || latestAttendance.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-[#64748b] bg-[#f8faf9] rounded-2xl border border-[#e2e8f0]">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-[#0f2925]">No punch-in recorded yet for this session</p>
                <p className="text-[11px] text-[#64748b] mt-0.5">Press "Mark Present at Worksite" after reaching the task site.</p>
              </div>
            )}

            {/* Attendance History Preview */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Recent Attendance Logs</span>
              </h4>

              {loadingHistory ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                  Loading logs...
                </div>
              ) : attendanceHistory.length === 0 ? (
                <p className="text-xs text-slate-400">No historical records found.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {attendanceHistory.slice(0, 4).map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {new Date(att.attendance_timestamp || att.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {new Date(att.attendance_timestamp || att.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} • {att.distance_from_assignment_meters}m
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        att.validation_status.includes('verified')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {att.validation_status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Manual Exception Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-amber-600" />
                <span>Attendance Exception Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExceptionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              If road barricades, dense buildings, or network congestion prevent GPS validation inside the geofence, explain the situation. The Ward 3 Sanitary Inspector will review and approve your attendance.
            </p>

            <form onSubmit={handleSubmitException} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason for Location Discrepancy:
                </label>
                <textarea
                  required
                  rows={3}
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="e.g. Traffic diversion at Dudhiya Talao Gate 2 forced us to park 80m away from the drainage site."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {exceptionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                  {exceptionSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExceptionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingException || !exceptionReason.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  {submittingException ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit Exception</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
