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
  RefreshCw,
  X,
  UserCheck,
  Pencil,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api.js';
import { TablePagination } from '../common/TablePagination.js';

export const TeamManagementView: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsPage, setTeamsPage] = useState<number>(1);
  const [rosterPage, setRosterPage] = useState<number>(1);
  const pageSize = 6;
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Create Team Modal State
  const [showCreateTeamModal, setShowCreateTeamModal] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('Sanitation Squad 3B');
  const [workType, setWorkType] = useState<string>('Waste Collection & Dumping Clearance');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [temporaryLeaderId, setTemporaryLeaderId] = useState<string>('');
  const [submittingTeam, setSubmittingTeam] = useState<boolean>(false);

  // Edit Team State
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [editTeamName, setEditTeamName] = useState<string>('');
  const [editWorkType, setEditWorkType] = useState<string>('Waste Collection & Dumping Clearance');
  const [editWorkerIds, setEditWorkerIds] = useState<string[]>([]);
  const [editTemporaryLeaderId, setEditTemporaryLeaderId] = useState<string>('');
  const [submittingEditTeam, setSubmittingEditTeam] = useState<boolean>(false);

  const handleOpenEditTeam = (team: any) => {
    setEditingTeam(team);
    setEditTeamName(team.team_name);
    setEditWorkType(team.work_type || 'Waste Collection & Dumping Clearance');
    setEditWorkerIds(Array.isArray(team.worker_ids) ? [...team.worker_ids] : []);
    setEditTemporaryLeaderId(team.temporary_leader_id);
  };

  const handleUpdateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setSubmittingEditTeam(true);
    setActionError('');
    try {
      const res = await api.updateWardTeam(editingTeam.id, {
        team_name: editTeamName,
        work_type: editWorkType,
        worker_ids: editWorkerIds,
        temporary_leader_id: editTemporaryLeaderId
      });
      if (res.data) {
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...t, ...res.data } : t));
      }
      setActionSuccess(res.message || 'Team updated successfully');
      setEditingTeam(null);
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update team');
    } finally {
      setSubmittingEditTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to disband team "${teamName}"?`)) {
      return;
    }
    try {
      const res = await api.deleteWardTeam(teamId);
      setActionSuccess(res.message || `Team "${teamName}" disbanded`);
      setTeams(prev => prev.filter(t => t.id !== teamId));
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete team');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersRes, teamsRes] = await Promise.all([
        api.getWardWorkers().catch(() => ({ data: [] })),
        api.getWardTeams().catch(() => ({ data: [] }))
      ]);
      setWorkers(workersRes.data || []);
      setTeams(teamsRes.data || []);
      if (workersRes.data && workersRes.data.length > 0 && selectedWorkerIds.length === 0) {
        setSelectedWorkerIds([workersRes.data[0].id]);
        setTemporaryLeaderId(workersRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleWorkerSelection = (id: string) => {
    if (selectedWorkerIds.includes(id)) {
      if (selectedWorkerIds.length <= 1) return; // Keep at least one worker selected
      const updated = selectedWorkerIds.filter(wId => wId !== id);
      setSelectedWorkerIds(updated);
      if (temporaryLeaderId === id) {
        setTemporaryLeaderId(updated[0]);
      }
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, id]);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setActionError('Team name is required');
      return;
    }
    if (selectedWorkerIds.length === 0) {
      setActionError('Please select at least one worker for the team');
      return;
    }
    if (!temporaryLeaderId) {
      setActionError('Please choose one worker to be the temporary Team Leader');
      return;
    }

    setSubmittingTeam(true);
    setActionError('');
    try {
      const res = await api.createWardTeam({
        team_name: newTeamName.trim(),
        work_type: workType,
        worker_ids: selectedWorkerIds,
        temporary_leader_id: temporaryLeaderId
      });

      const leader = workers.find(w => w.id === temporaryLeaderId);
      if (res.data) {
        setTeams(prev => [res.data, ...prev]);
      }
      setActionSuccess(
        res.message ||
        `Team "${newTeamName}" created with temporary leader ${leader?.full_name || 'selected worker'}.`
      );
      setShowCreateTeamModal(false);
      setNewTeamName('');
      await fetchData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create team');
    } finally {
      setSubmittingTeam(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Team Management &amp; Temporary Leadership
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Create New Team Button at top as specifically requested by user */}
          <button
            onClick={async () => {
              setActionError('');
              setShowCreateTeamModal(true);
              try {
                const res = await api.getWardWorkers();
                const freshWorkers = res.data || [];
                setWorkers(freshWorkers);
                if (freshWorkers.length > 0) {
                  setSelectedWorkerIds([freshWorkers[0].id]);
                  setTemporaryLeaderId(freshWorkers[0].id);
                }
                setNewTeamName(`Sanitation Squad ${teams.length + 1}`);
              } catch {
                if (workers.length > 0) {
                  setSelectedWorkerIds([workers[0].id]);
                  setTemporaryLeaderId(workers[0].id);
                  setNewTeamName(`Sanitation Squad ${teams.length + 1}`);
                }
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#095c54] text-white hover:bg-emerald-800 text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Team</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh teams"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
        </div>
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

      {/* TABLE 1: ACTIVE SANITATION TEAMS */}
      <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#095c54]" />
            <h3 className="text-sm font-extrabold text-[#0f2925]">
              Formed Sanitation Units ({teams.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Available for Complaint Dispatch</span>
        </div>

        {/* Mobile Cards for Teams (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 text-[#095c54] animate-spin mx-auto mb-2" />
              Loading teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 text-xs">
              No teams formed yet. Click &quot;Create New Team&quot; above.
            </div>
          ) : (
            teams
              .slice((teamsPage - 1) * pageSize, teamsPage * pageSize)
              .map(team => {
              const memberWorkers = workers.filter(w => (team.worker_ids || []).includes(w.id));
              return (
                <div key={team.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-[#0f2925] text-xs block truncate">{team.team_name}</span>
                      <span className="text-[10px] font-bold text-[#095c54] block truncate">{team.work_type || 'General Civic Sanitation Squad'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditTeam(team)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-[#095c54] border border-emerald-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.team_name)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Crown className="w-3 h-3 text-amber-600" />
                      {team.temporary_leader_name || 'Leader'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                      {memberWorkers.length} Members
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {team.active_tasks_count || 0} Active Tasks
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#e2e8f0] text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Team Unit Name</th>
                <th className="py-3 px-4">Specialization & Workload</th>
                <th className="py-3 px-4">Temporary Team Leader</th>
                <th className="py-3 px-4">Assigned Members</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 text-[#095c54] animate-spin mx-auto mb-2" />
                    Loading teams...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No teams formed yet. Click "Create New Team" above to assemble your first unit.
                  </td>
                </tr>
              ) : (
                teams
              .slice((teamsPage - 1) * pageSize, teamsPage * pageSize)
              .map(team => {
                  const memberWorkers = workers.filter(w => (team.worker_ids || []).includes(w.id));
                  return (
                    <tr key={team.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#0f2925] text-xs block">{team.team_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ward {team.ward_number || 3} Unit</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#095c54] text-xs block">
                          {team.work_type || 'General Civic Sanitation Squad'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              (team.active_tasks_count || 0) === 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : (team.active_tasks_count || 0) === 1
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {(team.active_tasks_count || 0) === 0
                              ? '0 Active Tasks (Available)'
                              : `${team.active_tasks_count} Active ${team.active_tasks_count === 1 ? 'Task' : 'Tasks'} (Busy)`}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Crown className="w-3.5 h-3.5 text-amber-600" />
                          <span>{team.temporary_leader_name || 'Assigned Leader'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {memberWorkers.map(m => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                            >
                              {m.full_name}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {team.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditTeam(team)}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-[#095c54] text-[#095c54] hover:text-white transition border border-emerald-200"
                            title="Edit Team"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.team_name)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition border border-rose-200"
                            title="Disband Team"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={teamsPage}
          totalItems={teams.length}
          pageSize={pageSize}
          onPageChange={setTeamsPage}
          itemLabel="teams"
        />
      </div>

      {/* TABLE 2: ALL WORKERS DIRECTORY TABLE (Mandated by user prompt) */}
      <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#095c54]" />
            <h3 className="text-sm font-extrabold text-[#0f2925]">
              Field Personnel Roster ({workers.length} Workers)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Available to form teams & dispatch</span>
        </div>

        {/* Mobile Roster Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {workers
            .slice((rosterPage - 1) * pageSize, rosterPage * pageSize)
            .map(w => (
            <div key={w.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={w.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80'}
                  alt={w.full_name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-extrabold text-xs text-[#0f2925] truncate">{w.full_name}</p>
                  <p className="text-[10px] text-[#095c54] font-bold truncate">{w.designation} · {w.phone}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${w.availability_status === 'on_duty' ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800'}`}>
                {w.availability_status?.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#e2e8f0] text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Worker Name & Code</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Skills</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-right">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {workers
                .slice((rosterPage - 1) * pageSize, rosterPage * pageSize)
                .map(w => (
                <tr key={w.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={w.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80'}
                        alt={w.full_name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-extrabold text-[#0f2925]">{w.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{w.worker_code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#095c54] font-bold">{w.designation}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(w.skills || []).slice(0, 2).map((s: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        w.availability_status === 'on_duty'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {w.availability_status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-600">{w.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={rosterPage}
          totalItems={workers.length}
          pageSize={pageSize}
          onPageChange={setRosterPage}
          itemLabel="workers"
        />
      </div>

      {/* CREATE NEW TEAM MODAL DIALOG (Mandated by user prompt) */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Create New Sanitation Team</h3>
                  <p className="text-xs text-slate-500">Select workers & designate one temporary Team Leader</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTeamModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Team Unit Name *</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="e.g., Sanitation Squad 5B"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Type of Work / Work Specialization *
                </label>
                <select
                  value={workType}
                  onChange={e => setWorkType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-bold text-[#0f2925]"
                >
                  <option value="Waste Collection & Dumping Clearance">Waste Collection & Dumping Clearance</option>
                  <option value="Drainage & Gutter Cleaning">Drainage & Gutter Cleaning</option>
                  <option value="Street Sweeping & Roadside Scraping">Street Sweeping & Roadside Scraping</option>
                  <option value="Debris, Construction & Tree Waste">Debris, Construction & Tree Waste</option>
                  <option value="Public Toilet & Sanitation Maintenance">Public Toilet & Sanitation Maintenance</option>
                  <option value="General Civic Sanitation Squad">General Civic Sanitation Squad</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    Select Team Members ({selectedWorkerIds.length} Selected)
                  </label>
                  <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Pick 1 Temporary Leader
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-200">
                  {workers.map(worker => {
                    const isSelected = selectedWorkerIds.includes(worker.id);
                    const isLeader = temporaryLeaderId === worker.id;

                    return (
                      <div
                        key={worker.id}
                        className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-white border-[#095c54] shadow-xs'
                            : 'bg-white/60 border-slate-200'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleWorkerSelection(worker.id)}
                            className="rounded text-[#095c54] focus:ring-0"
                          />
                          <img
                            src={worker.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80'}
                            alt={worker.full_name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-[#0f2925] block truncate">
                              {worker.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {worker.designation} · {worker.worker_code}
                            </span>
                          </div>
                        </label>

                        {/* Radio for Temporary Team Leader */}
                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => setTemporaryLeaderId(worker.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1.5 ${
                              isLeader
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>{isLeader ? 'Leader (Active)' : 'Make Leader'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
                >
                  {submittingTeam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save & Form Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f2925]">
                    Edit Team: {editingTeam.team_name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Update team name, roster members, or temporary team leader.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeamSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Team Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={e => setEditTeamName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Type of Work / Work Specialization *
                </label>
                <select
                  value={editWorkType}
                  onChange={e => setEditWorkType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-bold text-[#0f2925]"
                >
                  <option value="Waste Collection & Dumping Clearance">Waste Collection & Dumping Clearance</option>
                  <option value="Drainage & Gutter Cleaning">Drainage & Gutter Cleaning</option>
                  <option value="Street Sweeping & Roadside Scraping">Street Sweeping & Roadside Scraping</option>
                  <option value="Debris, Construction & Tree Waste">Debris, Construction & Tree Waste</option>
                  <option value="Public Toilet & Sanitation Maintenance">Public Toilet & Sanitation Maintenance</option>
                  <option value="General Civic Sanitation Squad">General Civic Sanitation Squad</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    Select Team Members ({editWorkerIds.length} Selected)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    Click crown button to appoint temporary leader
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-200">
                  {workers.map(worker => {
                    const isSelected = editWorkerIds.includes(worker.id);
                    const isLeader = editTemporaryLeaderId === worker.id;

                    return (
                      <div
                        key={worker.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-white border-slate-200 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                if (editWorkerIds.length <= 1) return;
                                const updated = editWorkerIds.filter(id => id !== worker.id);
                                setEditWorkerIds(updated);
                                if (editTemporaryLeaderId === worker.id) {
                                  setEditTemporaryLeaderId(updated[0]);
                                }
                              } else {
                                setEditWorkerIds([...editWorkerIds, worker.id]);
                              }
                            }}
                            className="rounded text-[#095c54] focus:ring-0"
                          />
                          <div className="truncate">
                            <span className="font-extrabold text-[#0f2925] block truncate">
                              {worker.full_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {worker.worker_code} · {worker.designation}
                            </span>
                          </div>
                        </label>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => setEditTemporaryLeaderId(worker.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition shrink-0 ${
                              isLeader
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>{isLeader ? 'Leader (Active)' : 'Make Leader'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditTeam}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
                >
                  {submittingEditTeam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
