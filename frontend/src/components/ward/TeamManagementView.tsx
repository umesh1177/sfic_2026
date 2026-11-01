import React, { useState, useEffect } from 'react';
import {
  Users,
  Crown,
  Check,
  Plus,
  Shield,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api.js';

export const TeamManagementView: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([
    'f2000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000002'
  ]);
  const [temporaryLeaderId, setTemporaryLeaderId] = useState<string>(
    'f2000000-0000-0000-0000-000000000001'
  );
  const [teamName, setTeamName] = useState<string>('Sanitation Unit 4B');
  const [targetLocation, setTargetLocation] = useState<string>('Dudhiya Talao Lakeside');
  const [actionSuccess, setActionSuccess] = useState<string>('');

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await api.getWardWorkers();
      setWorkers(res.data || []);
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const toggleWorker = (id: string) => {
    if (selectedWorkerIds.includes(id)) {
      if (selectedWorkerIds.length <= 1) return; // Keep at least one
      setSelectedWorkerIds(selectedWorkerIds.filter(wId => wId !== id));
      if (temporaryLeaderId === id) {
        const remaining = selectedWorkerIds.filter(wId => wId !== id);
        setTemporaryLeaderId(remaining[0]);
      }
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, id]);
    }
  };

  const handleDeployTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const leader = workers.find(w => w.id === temporaryLeaderId);
    setActionSuccess(
      `Team "${teamName}" formed with ${selectedWorkerIds.length} members. Temporary Team Leadership activated for ${
        leader?.full_name || 'selected worker'
      } for today's assignment.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
          Team Management & Temporary Leadership
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Form Task-Specific Units · Assign Temporary Team Leadership for Field Assignments
        </p>
      </div>

      {/* Critical Role Notice */}
      <div className="p-4 rounded-3xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-medium space-y-1">
        <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
          <Crown className="w-4 h-4 text-amber-700" />
          <span>Temporary Leadership Rule (Core Architectural Requirement)</span>
        </p>
        <p className="text-amber-900 leading-relaxed">
          There is strictly <strong>ONE worker role</strong>. A worker may be temporarily designated as Team Leader for a particular task only. After the assignment ends, that leadership ends. Do not create separate login accounts or permanent roles for Team Leaders.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Form & Assembly Grid */}
      <form onSubmit={handleDeployTeam} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Personnel Selection (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[#0f2925]">
              Select Field Workers for Assignment ({selectedWorkerIds.length} Selected)
            </h3>
            <span className="text-xs text-slate-500">Ward 3 Directory</span>
          </div>

          <div className="space-y-3">
            {workers.map(worker => {
              const isSelected = selectedWorkerIds.includes(worker.id);
              const isLeader = temporaryLeaderId === worker.id;
              return (
                <div
                  key={worker.id}
                  onClick={() => toggleWorker(worker.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/40 border-[#095c54] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#095c54] border-[#095c54] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>

                    <img
                      src={worker.avatar_url}
                      alt={worker.full_name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />

                    <div>
                      <h4 className="text-sm font-extrabold text-[#0f2925]">{worker.full_name}</h4>
                      <p className="text-xs text-slate-500">{worker.designation} · {worker.worker_code}</p>
                    </div>
                  </div>

                  {/* Temporary Leadership Radio Choice */}
                  {isSelected && (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        setTemporaryLeaderId(worker.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                        isLeader
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      <Crown className={`w-3.5 h-3.5 ${isLeader ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>{isLeader ? 'Temporary Team Leader' : 'Make Team Leader'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Deployment Summary & Activation (1 Col) */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#0f2925] border-b border-slate-100 pb-3">
              Team Deployment Details
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit Designation Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Work Area in Ward 3</label>
              <input
                type="text"
                required
                value={targetLocation}
                onChange={e => setTargetLocation(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Configuration</span>
              <p className="text-slate-800">
                Total Members: <strong>{selectedWorkerIds.length}</strong>
              </p>
              <p className="text-slate-800 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Designated Leader:{' '}
                  <strong>
                    {workers.find(w => w.id === temporaryLeaderId)?.full_name || 'Kanti Solanki'}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#095c54] hover:bg-emerald-800 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Deploy Team & Grant Task Permissions</span>
          </button>
        </div>
      </form>
    </div>
  );
};

