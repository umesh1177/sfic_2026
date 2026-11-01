import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Shield,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api.js';

export const WorkerManagementView: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await api.getWardWorkers();
      setWorkers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const filtered = workers.filter(w => {
    if (availabilityFilter !== 'all' && w.availability_status !== availabilityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        w.full_name.toLowerCase().includes(q) ||
        w.worker_code.toLowerCase().includes(q) ||
        w.designation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Worker Management Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sanitation Personnel Assigned to Ward 3 · Total Staff: <strong>{workers.length}</strong>
          </p>
        </div>

        <button
          onClick={fetchWorkers}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto"
          title="Refresh directory"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
        </button>
      </div>

      {/* Role notice as required by user prompt */}
      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>
          <strong>Municipal Role Policy:</strong> There is strictly ONE worker role (Worker / Sanitation Worker). Temporary Team Leadership is assigned on a per-task basis and does not create a permanent rank.
        </span>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by worker name, code, or skill..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Availability:</span>
          <select
            value={availabilityFilter}
            onChange={e => setAvailabilityFilter(e.target.value)}
            className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">All Workers</option>
            <option value="on_duty">Currently on Duty</option>
            <option value="available">Available (Standby)</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Workers Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
            <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 mt-2">Loading worker profiles...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-500 text-xs">
            No workers match the search criteria.
          </div>
        ) : (
          filtered.map(worker => (
            <div
              key={worker.id}
              className="p-5 rounded-3xl bg-white border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={worker.avatar_url}
                    alt={worker.full_name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0f2925]">{worker.full_name}</h4>
                    <p className="text-xs text-[#095c54] font-bold">{worker.designation}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{worker.worker_code}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    worker.availability_status === 'on_duty'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : worker.availability_status === 'available'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {worker.availability_status.replace('_', ' ')}
                </span>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Certified Competencies</span>
                <div className="flex flex-wrap gap-1.5">
                  {(worker.skills || []).map((skill: string, sIdx: number) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Today's deployment & attendance */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold text-[11px]">Today's Status:</span>
                  <span className="font-extrabold text-[#095c54]">{worker.attendance_today}</span>
                </div>
                {worker.active_task_code && (
                  <p className="text-[11px] text-slate-600 font-mono">
                    Active Assignment: <strong className="text-slate-800">{worker.active_task_code}</strong>
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

