import React, { useState } from 'react';
import {
  Settings,
  Shield,
  MapPin,
  CheckCircle2,
  Clock,
  Save,
  Bell
} from 'lucide-react';

export const WardSettingsView: React.FC = () => {
  const [attendanceRadius, setAttendanceRadius] = useState<number>(100);
  const [evidenceRadius, setEvidenceRadius] = useState<number>(150);
  const [urgentSlaHours, setUrgentSlaHours] = useState<number>(12);
  const [normalSlaHours, setNormalSlaHours] = useState<number>(48);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#095c54]" />
          <span>Ward Officer Preferences & Operational Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Municipal Field Rules · Geofence Thresholds · SLA Configuration for Ward 3
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Ward operational settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Officer Profile Dossier */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-[#0f2925] border-b border-slate-100 pb-2">
            Officer Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Officer Name</span>
              <span className="font-extrabold text-[#0f2925]">Ramesh Patel</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Official Designation</span>
              <span className="font-extrabold text-[#095c54]">Chief Sanitary Inspector, Ward 3</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Jurisdiction</span>
              <span className="font-extrabold text-[#0f2925]">Ward 3 (Dudhiya Talao & Ashapuri)</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Contact Mobile</span>
              <span className="font-mono font-bold text-slate-800">+91 98251 30003</span>
            </div>
          </div>
        </div>

        {/* GPS Geofence Parameters */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <MapPin className="w-4 h-4 text-[#095c54]" />
            <h3 className="text-sm font-extrabold text-[#0f2925]">Location Validation Geofence Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Check-in Radius (Meters)
              </label>
              <input
                type="number"
                min={50}
                max={500}
                value={attendanceRadius}
                onChange={e => setAttendanceRadius(Number(e.target.value))}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default: 100m. Maximum allowable distance for verified check-in.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Evidence Photo Capture Radius (Meters)
              </label>
              <input
                type="number"
                min={50}
                max={500}
                value={evidenceRadius}
                onChange={e => setEvidenceRadius(Number(e.target.value))}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default: 150m. Maximum distance for before/after photo location match.</p>
            </div>
          </div>
        </div>

        {/* SLA Timelines */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-[#095c54]" />
            <h3 className="text-sm font-extrabold text-[#0f2925]">SLA Resolution Deadlines</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Urgent / Emergency Priority SLA (Hours)
              </label>
              <input
                type="number"
                min={2}
                max={48}
                value={urgentSlaHours}
                onChange={e => setUrgentSlaHours(Number(e.target.value))}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Normal / Medium Priority SLA (Hours)
              </label>
              <input
                type="number"
                min={12}
                max={120}
                value={normalSlaHours}
                onChange={e => setNormalSlaHours(Number(e.target.value))}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-2 shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </form>
    </div>
  );
};

