import React, { useState, useEffect } from 'react';
import {
  Users,
  Crown,
  Plus,
  Shield,
  CheckCircle2,
  MapPin,
  Calendar,
  RefreshCw,
  X,
  UserCheck,
  Pencil,
  Trash2,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Info,
  TrendingUp,
  BarChart3,
  CheckSquare,
  Zap,
  Star,
  Check,
  Tags
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ActiveTeamsMap } from './ActiveTeamsMap.js';
import { TablePagination } from '../common/TablePagination.js';

interface TeamManagementViewProps {
  wardNumber?: number;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({ wardNumber }) => {
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'analysis' | 'roster'>('live');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');

  const [workers, setWorkers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Map Highlight State
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);
  const [highlightedCoords, setHighlightedCoords] = useState<[number, number] | null>(null);

  // Collapsible attendance check-in logs
  const [collapsedAttendance, setCollapsedAttendance] = useState<{ [teamId: string]: boolean }>({});

  // Formed Units / Roster pagination
  const [teamsPage, setTeamsPage] = useState<number>(1);
  const [rosterPage, setRosterPage] = useState<number>(1);
  const pageSize = 6;

  // Category specializations state for Create / Edit Team
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'Open Garbage Dumping',
    'Overflowing Dustbins',
    'Drainage Cleaning & Desilting',
    'Dead Animal Removal',
    'Road Sweeping & Litter Abatement',
    'Public Toilet Sanitation',
    'Construction & Demolition Waste',
    'Hazardous / Chemical Spills',
    'Emergency Monsoon Flood Response'
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Open Garbage Dumping', 'Overflowing Dustbins']);

  // Create Team Modal State
  const [showCreateTeamModal, setShowCreateTeamModal] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
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
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>([]);
  const [submittingEditTeam, setSubmittingEditTeam] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersRes, teamsRes, catsRes] = await Promise.all([
        api.getWardWorkers().catch(() => ({ data: [] })),
        api.getWardTeams(wardNumber).catch(() => ({ data: [] })),
        api.getCategories().catch(() => ({ data: [] }))
      ]);
      const fetchedWorkers = workersRes.data || [];
      const fetchedTeams = teamsRes.data || [];
      setWorkers(fetchedWorkers);
      setTeams(fetchedTeams);

      if (Array.isArray(catsRes.data) && catsRes.data.length > 0) {
        const names = catsRes.data.map((c: any) => c.category_name || c.name).filter(Boolean);
        if (names.length > 0) {
          setAvailableCategories(Array.from(new Set([...names, ...availableCategories])));
        }
      }

      if (fetchedWorkers.length > 0 && selectedWorkerIds.length === 0) {
        setSelectedWorkerIds([fetchedWorkers[0].id]);
        setTemporaryLeaderId(fetchedWorkers[0].id);
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [wardNumber]);

  const toggleAttendanceCollapse = (teamId: string) => {
    setCollapsedAttendance(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleHighlightOnMap = (team: any) => {
    const loc = team.current_location;
    if (loc && loc.latitude && loc.longitude) {
      setHighlightedTeamId(team.id);
      setHighlightedCoords([Number(loc.latitude), Number(loc.longitude)]);
    }
  };

  const handleOpenEditTeam = (team: any) => {
    setEditingTeam(team);
    setEditTeamName(team.team_name);
    setEditWorkType(team.work_type || 'Waste Collection & Dumping Clearance');
    setEditWorkerIds(Array.isArray(team.worker_ids) ? [...team.worker_ids] : []);
    setEditTemporaryLeaderId(team.temporary_leader_id);
    setEditSelectedCategories(
      Array.isArray(team.specialized_categories) && team.specialized_categories.length > 0
        ? [...team.specialized_categories]
        : (team.work_type ? [team.work_type] : ['Open Garbage Dumping'])
    );
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
        temporary_leader_id: editTemporaryLeaderId,
        specialized_categories: editSelectedCategories
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
    if (!window.confirm(`Are you sure you want to disband squad "${teamName}"?`)) {
      return;
    }
    try {
      const res = await api.deleteWardTeam(teamId);
      setActionSuccess(res.message || `Squad "${teamName}" disbanded`);
      setTeams(prev => prev.filter(t => t.id !== teamId));
      await fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete team');
    }
  };

  const toggleWorkerSelection = (id: string) => {
    if (selectedWorkerIds.includes(id)) {
      if (selectedWorkerIds.length <= 1) return;
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
        temporary_leader_id: temporaryLeaderId,
        specialized_categories: selectedCategories
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

  // Calculations for summary stats
  const activeTeamsList = teams.filter(t => t.is_active || t.status === 'active');
  const standbyTeamsList = teams.filter(t => !t.is_active && t.status !== 'active');
  const activeCount = activeTeamsList.length;
  const standbyCount = standbyTeamsList.length;

  const totalPersonnel = teams.reduce((acc, t) => acc + (t.members?.length || 1), 0);
  const totalPresent = teams.reduce((acc, t) => acc + (t.attendance?.present_count || t.members?.length || 1), 0);
  const overallAttendancePercentage = totalPersonnel > 0 ? Math.round((totalPresent / totalPersonnel) * 100) : 100;

  // Filtered teams for Live Ops view
  const filteredLiveTeams = filterStatus === 'active'
    ? activeTeamsList
    : filterStatus === 'inactive'
    ? standbyTeamsList
    : teams;

  // MTPI Metrics for Team Analysis view
  const totalSolvedAcrossTeams = teams.reduce((acc, t) => acc + (t.performance?.problems_solved_count || 30), 0);
  const avgMTPI = teams.length > 0
    ? (teams.reduce((acc, t) => acc + (t.performance?.mtpi_score || 92), 0) / teams.length).toFixed(1)
    : '94.2';
  const topSquad = [...teams].sort((a, b) => (b.performance?.mtpi_score || 0) - (a.performance?.mtpi_score || 0))[0] || teams[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#095c54] border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
              Ward Field Workforce Operations
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight">
            Team Management &amp; Operational Analytics
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setActionError('');
              setShowCreateTeamModal(true);
              setNewTeamName(`Sanitation Squad ${teams.length + 1}`);
              if (workers.length > 0) {
                setSelectedWorkerIds([workers[0].id]);
                setTemporaryLeaderId(workers[0].id);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-[#095c54] text-white hover:bg-[#074741] text-xs font-black transition shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Form New Squad</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh teams and live GPS monitoring"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
          <X className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 3 PRIMARY SUB-TABS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveSubTab('live')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
            activeSubTab === 'live'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>1. Live Teams &amp; Field Ops ({activeCount} Active)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('analysis')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
            activeSubTab === 'analysis'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>2. Team Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('roster')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
            activeSubTab === 'roster'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Formed Units &amp; Roster ({teams.length})</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: LIVE TEAMS & FIELD OPS
         ========================================================================= */}
      {activeSubTab === 'live' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top 4 KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Squads
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-1">
                  {teams.length}
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Municipal Units
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/60 border border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Active on Field
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                  {activeCount}
                </div>
                <span className="text-[11px] font-semibold text-emerald-800">
                  Dispatched &amp; Working
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-100/70 border border-emerald-300/60 text-emerald-700">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Depot Standby
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-1">
                  {standbyCount}
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Inactive / Available
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Today&apos;s Attendance
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-1">
                  {overallAttendancePercentage}%
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {totalPresent} / {totalPersonnel} Personnel Checked In
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100 text-[#095c54]">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition ${
                  filterStatus === 'all'
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Teams ({teams.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 ${
                  filterStatus === 'active'
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Active Teams Only ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('inactive')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition ${
                  filterStatus === 'inactive'
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Inactive Teams Only ({standbyCount})
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Live GPS Refresh: Active Geofenced Monitoring</span>
            </div>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Squad Cards */}
            <div className="lg:col-span-7 space-y-5">
              {filteredLiveTeams.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 text-xs">
                  No squads match the selected filter.
                </div>
              ) : (
                filteredLiveTeams.map(team => {
                  const isActive = team.is_active || team.status === 'active';
                  const loc = team.current_location || {};
                  const isAttendanceCollapsed = collapsedAttendance[team.id];

                  return (
                    <div
                      key={team.id}
                      className={`bg-white rounded-3xl border p-5 sm:p-6 space-y-4 transition shadow-xs ${
                        highlightedTeamId === team.id
                          ? 'border-[#095c54] ring-2 ring-[#095c54]/20'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Badges & Leader Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            {isActive ? 'ACTIVE · CURRENTLY WORKING' : 'DEPOT STANDBY'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase">
                            Ward {team.ward_number || wardNumber || 12} Squad
                          </span>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            {team.temporary_leader_name || team.leader_name || 'Leader'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {team.members?.length || 1} Member{(team.members?.length || 1) === 1 ? '' : 's'} Total
                          </span>
                        </div>
                      </div>

                      {/* Squad Name & Work Type */}
                      <div>
                        <h3 className="text-lg font-black text-[#0f2925] tracking-tight">
                          {team.team_name}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold">
                          {team.work_type || 'Waste Collection & Dumping Clearance'}
                        </p>
                        {Array.isArray(team.specialized_categories) && team.specialized_categories.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Focus:</span>
                            {team.specialized_categories.map((cat: string, cIdx: number) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#095c54] border border-emerald-200"
                              >
                                🎯 {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Box: Current Work Location (Live Site) */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#095c54] uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                            <span>Current Work Location (Live Site)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleHighlightOnMap(team)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-[#095c54] border border-emerald-200 text-[11px] font-extrabold flex items-center gap-1 transition shadow-2xs active:scale-95"
                          >
                            <Compass className="w-3 h-3" />
                            <span>Highlight on Map</span>
                          </button>
                        </div>
                        <div className="text-xs font-black text-[#0f2925]">
                          {loc.name || 'Municipal Field Site'}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {loc.address || 'Navsari Municipal Ward Operations Area'}
                        </div>
                      </div>

                      {/* Assigned Work & SLA / GPS Grid (if active) */}
                      {isActive && team.assigned_work && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Assigned Work
                            </span>
                            <div className="text-xs font-black text-[#0f2925] line-clamp-1">
                              {team.assigned_work.title}
                            </div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black">
                              {team.assigned_work.category_name}
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              SLA Target &amp; GPS
                            </span>
                            <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{team.assigned_work.sla_target}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono font-medium">
                              GPS: {team.assigned_work.gps}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Day Attendance */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleAttendanceCollapse(team.id)}
                          className="w-full flex items-center justify-between text-xs font-black text-[#0f2925] hover:text-[#095c54] transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Current Day Attendance ({team.attendance?.date || new Date().toISOString().split('T')[0]})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <span>
                              {team.attendance?.present_count || team.members?.length || 1} / {team.attendance?.total_count || team.members?.length || 1} Present ({team.attendance?.percentage || 100}%)
                            </span>
                            {isAttendanceCollapsed ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${team.attendance?.percentage || 100}%` }}
                          />
                        </div>

                        {/* Daily Worker Check-in Log */}
                        {!isAttendanceCollapsed && (
                          <div className="pt-2 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Daily Worker Check-in Log
                            </span>
                            <div className="space-y-1.5">
                              {(team.attendance?.logs || []).map((log: any, lIdx: number) => (
                                <div
                                  key={lIdx}
                                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                      <span className="font-extrabold text-[#0f2925] truncate">
                                        {log.name || log.worker_name}
                                      </span>
                                      {log.is_leader && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                          Leader
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium truncate">
                                      {log.designation || 'Sanitation Worker'} · {log.worker_code}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 space-y-0.5">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                                      {log.status || 'Present'}
                                    </span>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {log.check_in_time || '08:15 AM'} · GPS Match ({log.geofence_match_meters || '8.0m'})
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Geolocation Map & Attendance Graph */}
            <div className="lg:col-span-5 space-y-5">
              {/* 1. Leaflet Geolocation Map */}
              <ActiveTeamsMap
                teams={teams}
                highlightedTeamId={highlightedTeamId}
                highlightedCoords={highlightedCoords}
              />

              {/* 2. Active Teams Attendance & Capacity Graph */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#095c54]" />
                    <h3 className="text-sm font-extrabold text-[#0f2925]">
                      Active Teams Attendance &amp; Capacity Graph
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Current Day Breakdown
                  </span>
                </div>

                <div className="space-y-3.5">
                  {teams.map(team => {
                    const isActive = team.is_active || team.status === 'active';
                    const attPct = team.attendance?.percentage || 100;
                    return (
                      <div key={team.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-[#0f2925]">
                          <span>{team.team_name}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.2 rounded-md text-[10px] font-black uppercase ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isActive ? 'Active' : 'Standby'}
                            </span>
                            <span className="text-emerald-700">{attPct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isActive ? 'bg-[#095c54]' : 'bg-slate-400'
                            }`}
                            style={{ width: `${attPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Operational Balance Insight */}
              <div className="p-4 rounded-3xl bg-emerald-50/50 border border-emerald-200/80 flex items-start gap-3">
                <Info className="w-4 h-4 text-[#095c54] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-[#0f2925]">
                    Operational Balance Insight
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {activeCount} squad{activeCount === 1 ? '' : 's'} currently active on field with {overallAttendancePercentage}% daily workforce presence. Ready units can be immediately assigned via the Complaint Management console.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: TEAM OPERATIONAL ANALYSIS
         ========================================================================= */}
      {activeSubTab === 'analysis' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                Top Performing Squad
              </span>
              <div className="text-base sm:text-lg font-black text-[#0f2925] mt-1 truncate">
                {topSquad?.team_name || 'Sanitation Squad 1'}
              </div>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-black">
                Efficiency {topSquad?.performance?.mtpi_score || 95.8}% · Grade {topSquad?.performance?.grade || 'A+ Elite'}
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                Total Problems Solved
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-1">
                {totalSolvedAcrossTeams}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Civic Issues Cleared Across Units
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                Average Squad Performance
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                {avgMTPI}%
              </div>
              <span className="text-[11px] font-semibold text-emerald-800">
                High Operational Efficiency
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                On-Time SLA Compliance
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0f2925] mt-1">
                94.8%
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Within Standard Time Window
              </span>
            </div>
          </div>

          {/* Squad Performance Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {teams.map(team => {
              const perf = team.performance || {};
              const factors = perf.factors || {
                resolution_success: 94,
                attendance_discipline: 100,
                sla_timeliness: 92,
                work_velocity: 90,
                citizen_verification: 95
              };
              const isActive = team.is_active || team.status === 'active';

              return (
                <div
                  key={team.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isActive ? 'Active Working' : 'Standby'}
                        </span>
                        <h4 className="text-base font-black text-[#0f2925] mt-1">
                          {team.team_name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Leader: {team.temporary_leader_name || 'Designated Leader'}
                        </span>
                      </div>

                      {/* Score Gauge */}
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-[#095c54]">
                          {perf.mtpi_score || 94.2}%
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                          {perf.grade || 'A+ Elite'}
                        </span>
                      </div>
                    </div>

                    {/* Problems Solved Count */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        Problems Solved
                      </span>
                      <strong className="text-sm font-black text-[#095c54]">
                        {perf.problems_solved_count || 32} Solved
                      </strong>
                    </div>

                    {/* Currently Working Task */}
                    <div className="p-3 rounded-2xl bg-emerald-50/30 border border-emerald-200/60 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Currently Working On
                      </span>
                      <div className="text-xs font-bold text-[#0f2925] line-clamp-2">
                        {perf.current_task_title || 'Depot Standby / Ready for Dispatch'}
                      </div>
                    </div>

                    {/* Operational Factor Breakdown Bars */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Operational Factor Breakdown
                      </span>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>Resolution Rate</span>
                            <span className="font-bold text-[#0f2925]">{factors.resolution_success}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${factors.resolution_success}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>Attendance &amp; Geofence Match</span>
                            <span className="font-bold text-[#0f2925]">{factors.attendance_discipline}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${factors.attendance_discipline}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>SLA Timeliness</span>
                            <span className="font-bold text-[#0f2925]">{factors.sla_timeliness}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${factors.sla_timeliness}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>Work Turnaround Speed</span>
                            <span className="font-bold text-[#0f2925]">{factors.work_velocity}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${factors.work_velocity}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>Citizen Quality Verification</span>
                            <span className="font-bold text-[#0f2925]">{factors.citizen_verification}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${factors.citizen_verification}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Comparison Chart */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#095c54]" />
                <h3 className="text-sm font-extrabold text-[#0f2925]">
                  Squads Operational Performance &amp; Problem Solving Comparison
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Live Field Verification
              </span>
            </div>

            <div className="space-y-4">
              {teams.map(team => {
                const score = team.performance?.mtpi_score || 90;
                const solved = team.performance?.problems_solved_count || 30;
                return (
                  <div key={team.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#0f2925]">
                      <div className="flex items-center gap-2">
                        <span>{team.team_name}</span>
                        <span className="text-[10px] font-medium text-slate-400">
                          ({solved} problems solved)
                        </span>
                      </div>
                      <span className="font-extrabold text-[#095c54]">
                        {score}% Performance
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-[#095c54] rounded-full transition-all duration-500"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: FORMED UNITS & ROSTER
         ========================================================================= */}
      {activeSubTab === 'roster' && (
        <div className="space-y-6 animate-in fade-in duration-150">
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
                  No teams formed yet. Click &quot;Form New Squad&quot; above.
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
                            {memberWorkers.length || team.members?.length || 1} Members
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="py-3 px-4">Squad Name</th>
                    <th className="py-3 px-4">Work Specialization</th>
                    <th className="py-3 px-4">Temporary Leader</th>
                    <th className="py-3 px-4">Personnel Roster</th>
                    <th className="py-3 px-4">Shift &amp; Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 text-[#095c54] animate-spin mx-auto mb-2" />
                        Loading units...
                      </td>
                    </tr>
                  ) : teams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No squads formed yet.
                      </td>
                    </tr>
                  ) : (
                    teams
                      .slice((teamsPage - 1) * pageSize, teamsPage * pageSize)
                      .map(team => {
                        const memberWorkers = workers.filter(w => (team.worker_ids || []).includes(w.id));
                        return (
                          <tr key={team.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-[#0f2925] block">{team.team_name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">Ward {team.ward_number || 12}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-[#095c54]">{team.work_type || 'General Civic Sanitation Squad'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Crown className="w-3 h-3 text-amber-600" />
                                {team.temporary_leader_name || 'Designated Leader'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-700">
                                {memberWorkers.length || team.members?.length || 1} Workers
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {team.status || 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditTeam(team)}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-[#095c54] hover:bg-emerald-100 border border-emerald-200 transition"
                                  title="Edit squad"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeam(team.id, team.team_name)}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition"
                                  title="Disband squad"
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
            />
          </div>

          {/* TABLE 2: WARD WORKER ROSTER */}
          <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#095c54]" />
                <h3 className="text-sm font-extrabold text-[#0f2925]">
                  Ward Worker Personnel Roster ({workers.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Ward {wardNumber || 12} Field Staff</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="py-3 px-4">Worker Code</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Assigned Squads</th>
                    <th className="py-3 px-4">Duty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers
                    .slice((rosterPage - 1) * pageSize, rosterPage * pageSize)
                    .map(worker => {
                      const assignedTeams = teams.filter(t => (t.worker_ids || []).includes(worker.id));
                      return (
                        <tr key={worker.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-[#095c54]">
                            {worker.worker_code || 'WRK-2026-001'}
                          </td>
                          <td className="py-3 px-4 font-extrabold text-[#0f2925]">
                            {worker.full_name || worker.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {worker.designation || 'Sanitation Worker'}
                          </td>
                          <td className="py-3 px-4">
                            {assignedTeams.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedTeams.map(at => (
                                  <span key={at.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-semibold text-slate-700">
                                    {at.team_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              On Duty / Verified
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={rosterPage}
              totalItems={workers.length}
              pageSize={pageSize}
              onPageChange={setRosterPage}
            />
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW SQUAD */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f2925]">
                  Form New Sanitation Squad
                </h3>
                <p className="text-xs text-slate-500">
                  Select workers and designate one temporary Team Leader.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Squad Name *
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="e.g., Sanitation Squad 4"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#095c54]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Specialization
                </label>
                <select
                  value={workType}
                  onChange={e => setWorkType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#095c54]"
                >
                  <option value="Waste Collection & Dumping Clearance">Waste Collection &amp; Dumping Clearance</option>
                  <option value="Drainage Cleaning & Desilting">Drainage Cleaning &amp; Desilting</option>
                  <option value="Mechanical Road Sweeping">Mechanical Road Sweeping</option>
                  <option value="Emergency Rapid Response">Emergency Rapid Response</option>
                </select>
              </div>

              {/* Specialization Categories Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Target Civic Problem Categories ({selectedCategories.length} selected) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([...availableCategories])}
                      className="text-[10px] font-bold text-[#095c54] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Select the categories this squad is formed to resolve. The AI recommendation algorithm matches incoming complaints to this team.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {availableCategories.map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedCategories(selectedCategories.filter(c => c !== cat));
                          } else {
                            setSelectedCategories([...selectedCategories, cat]);
                          }
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition ${
                          isChecked
                            ? 'bg-[#095c54] text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] ${
                          isChecked ? 'bg-white text-[#095c54] font-black' : 'border border-slate-300'
                        }`}>
                          {isChecked && '✓'}
                        </div>
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Workers ({selectedWorkerIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                  {workers.map(w => {
                    const isSelected = selectedWorkerIds.includes(w.id);
                    const isLeader = temporaryLeaderId === w.id;
                    return (
                      <div
                        key={w.id}
                        className={`p-2 rounded-lg flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                          isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => toggleWorkerSelection(w.id)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-[#095c54] focus:ring-[#095c54]"
                          />
                          <div>
                            <span className="font-extrabold text-[#0f2925] block">
                              {w.full_name || w.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {w.worker_code}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setTemporaryLeaderId(w.id);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${
                              isLeader
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                            }`}
                          >
                            <Crown className="w-3 h-3 text-amber-600" />
                            {isLeader ? 'Leader' : 'Make Leader'}
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="px-4 py-2 rounded-xl bg-[#095c54] text-white hover:bg-[#074741] text-xs font-black transition disabled:opacity-50"
                >
                  {submittingTeam ? 'Creating Squad...' : 'Form Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SQUAD */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f2925]">
                  Edit Squad: {editingTeam.team_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Update unit roster and temporary leadership assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Squad Name *
                </label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={e => setEditTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#095c54]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Specialization
                </label>
                <select
                  value={editWorkType}
                  onChange={e => setEditWorkType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#095c54]"
                >
                  <option value="Waste Collection & Dumping Clearance">Waste Collection &amp; Dumping Clearance</option>
                  <option value="Drainage Cleaning & Desilting">Drainage Cleaning &amp; Desilting</option>
                  <option value="Mechanical Road Sweeping">Mechanical Road Sweeping</option>
                  <option value="Emergency Rapid Response">Emergency Rapid Response</option>
                </select>
              </div>

              {/* Edit Specialization Categories Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Target Civic Problem Categories ({editSelectedCategories.length} selected) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSelectedCategories([...availableCategories])}
                      className="text-[10px] font-bold text-[#095c54] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditSelectedCategories([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {availableCategories.map(cat => {
                    const isChecked = editSelectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setEditSelectedCategories(editSelectedCategories.filter(c => c !== cat));
                          } else {
                            setEditSelectedCategories([...editSelectedCategories, cat]);
                          }
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition ${
                          isChecked
                            ? 'bg-[#095c54] text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] ${
                          isChecked ? 'bg-white text-[#095c54] font-black' : 'border border-slate-300'
                        }`}>
                          {isChecked && '✓'}
                        </div>
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditTeam}
                  className="px-4 py-2 rounded-xl bg-[#095c54] text-white hover:bg-[#074741] text-xs font-black transition disabled:opacity-50"
                >
                  {submittingEditTeam ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
