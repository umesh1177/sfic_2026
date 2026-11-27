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
  Trash2,
  Radio,
  Navigation,
  Activity,
  Award,
  TrendingUp,
  BarChart3,
  Clock,
  AlertTriangle,
  UserX,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
  Target,
  Zap,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../services/api.js';
import { TablePagination } from '../common/TablePagination.js';

// Map controller to smoothly pan/fly to a team location when clicked
function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Custom DivIcons with inline SVGs for 100% reliable rendering
const activeMarkerIcon = L.divIcon({
  className: 'custom-team-pin',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #059669; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
      <span style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: #10b981; border-radius: 9999px; border: 1.5px solid #ffffff; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20]
});

const depotMarkerIcon = L.divIcon({
  className: 'custom-depot-pin',
  html: `
    <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #0284c7; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

export const TeamManagementView: React.FC = () => {
  // Navigation Sub-Tabs: 1. Live Teams & Field Operations, 2. Team Analysis, 3. Formed Units
  const [subTab, setSubTab] = useState<'live_operations' | 'analysis' | 'units'>('live_operations');

  const [workers, setWorkers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsPage, setTeamsPage] = useState<number>(1);
  const [rosterPage, setRosterPage] = useState<number>(1);
  const pageSize = 6;
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Live Operations Sub-tab State
  const [liveFilter, setLiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMapCoords, setSelectedMapCoords] = useState<[number, number] | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [expandedRosterTeamId, setExpandedRosterTeamId] = useState<string | null>(null);

  // Team Analysis Sub-tab State
  const [inspectingSolvedTeam, setInspectingSolvedTeam] = useState<any | null>(null);

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

  // Metrics computation for Live operations
  const activeTeamsList = teams.filter(t => t.operational_status === 'active' || t.is_active);
  const inactiveTeamsList = teams.filter(t => t.operational_status !== 'active' && !t.is_active);

  const filteredLiveTeams = liveFilter === 'active'
    ? activeTeamsList
    : liveFilter === 'inactive'
    ? inactiveTeamsList
    : teams;

  const totalPersonnel = teams.reduce((acc, t) => acc + (t.member_count || (t.members?.length || 0)), 0);
  const totalPresentToday = teams.reduce((acc, t) => acc + (t.attendance_today?.present_count || 0), 0);
  const overallAttendanceRate = totalPersonnel > 0 ? Math.round((totalPresentToday / totalPersonnel) * 100) : 0;

  // Handler to focus a team on the map
  const handleHighlightOnMap = (team: any) => {
    const lat = team.current_location?.latitude || (team.operational_status === 'active' ? 20.9312 : 20.9490);
    const lng = team.current_location?.longitude || (team.operational_status === 'active' ? 72.9284 : 72.9320);
    setSelectedMapCoords([lat, lng]);
    setSelectedTeamId(team.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Primary Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase tracking-wider">
              Ward Field Workforce Operations
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight">
            Team Management &amp; Operational Analytics
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
            className="px-4 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Form New Squad</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh teams and attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 3 PRIMARY SUB-TABS: LIVE OPERATIONS, TEAM ANALYSIS, FORMED UNITS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setSubTab('live_operations')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
            subTab === 'live_operations'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Radio className="w-4 h-4 shrink-0 text-emerald-300" />
          <span>1. Live Teams &amp; Field Ops ({activeTeamsList.length} Active)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('analysis')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
            subTab === 'analysis'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0 text-amber-300" />
          <span>2. Team Analysis &amp; MTPI Model</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('units')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
            subTab === 'units'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>3. Formed Units &amp; Roster ({teams.length})</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: LIVE TEAMS & FIELD OPERATIONS
          ========================================================================= */}
      {subTab === 'live_operations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Quick Status Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Squads</span>
                <Users className="w-4 h-4 text-[#095c54]" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#0f2925]">{teams.length}</div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Municipal Units</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-emerald-200/90 shadow-2xs bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Active on Field
                </span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-900">{activeTeamsList.length}</div>
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Dispatched &amp; Working</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Depot Standby</span>
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-700">{inactiveTeamsList.length}</div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Inactive / Available</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Today&apos;s Attendance</span>
                <UserCheck className="w-4 h-4 text-[#095c54]" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#095c54]">
                {overallAttendanceRate}%
              </div>
              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                {totalPresentToday} / {totalPersonnel} Personnel Checked In
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  liveFilter === 'all'
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Teams ({teams.length})
              </button>
              <button
                type="button"
                onClick={() => setLiveFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  liveFilter === 'active'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Teams Only ({activeTeamsList.length})
              </button>
              <button
                type="button"
                onClick={() => setLiveFilter('inactive')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  liveFilter === 'inactive'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Inactive Teams Only ({inactiveTeamsList.length})
              </button>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              Live GPS Refresh: Active Geofenced Monitoring
            </span>
          </div>

          {/* Main 2-Column Split: Teams List on Left (7 cols) + Map & Graphs on Right (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: TEAM CARDS */}
            <div className="lg:col-span-7 space-y-4">
              {loading ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Loading live team operations &amp; locations...</p>
                </div>
              ) : filteredLiveTeams.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No teams match the selected filter.</p>
                </div>
              ) : (
                filteredLiveTeams.map(team => {
                  const isActive = team.operational_status === 'active' || team.is_active;
                  const currentTask = team.current_task;
                  const loc = team.current_location;
                  const att = team.attendance_today || { present_count: 0, total_members: 0, attendance_rate: 0, records: [] };
                  const isExpandedRoster = expandedRosterTeamId === team.id;
                  const isSelectedOnMap = selectedTeamId === team.id;

                  return (
                    <div
                      key={team.id}
                      className={`bg-white rounded-3xl border transition p-5 space-y-4 shadow-xs ${
                        isSelectedOnMap
                          ? 'border-[#095c54] ring-2 ring-[#095c54]/30'
                          : isActive
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Team Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isActive ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'
                                }`}
                              />
                              {isActive ? 'Active · Currently Working' : 'Inactive · Standby at Depot'}
                            </span>

                            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-bold">
                              Ward {team.ward_number || 3} Squad
                            </span>
                          </div>

                          <h3 className="text-base font-black text-[#0f2925] truncate">
                            {team.team_name}
                          </h3>
                          <p className="text-xs text-slate-500 font-semibold truncate">
                            {team.work_type || 'General Civic Sanitation Squad'}
                          </p>
                        </div>

                        {/* Leader Badge */}
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            <span>{team.temporary_leader_name || team.leader_name || 'Designated Leader'}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">
                            {team.member_count || team.members?.length || 0} Members Total
                          </span>
                        </div>
                      </div>

                      {/* ACTIVE TEAM LOCATION & CURRENT ASSIGNMENT DETAILS */}
                      {isActive && currentTask ? (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-200/80 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <MapPin className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                                  Current Work Location (Live Site)
                                </span>
                                <h4 className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                                  {loc?.name || currentTask.location_name}
                                </h4>
                                <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                                  {loc?.address || currentTask.address}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleHighlightOnMap(team)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#095c54] border border-emerald-200 text-xs font-black flex items-center gap-1 shadow-2xs transition shrink-0"
                            >
                              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Highlight on Map</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                              <span className="text-[10px] text-slate-500 font-bold block">Assigned Work</span>
                              <span className="font-extrabold text-[#0f2925] block truncate mt-0.5">
                                {currentTask.title}
                              </span>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-teal-100 text-[#095c54] text-[10px] font-black">
                                {currentTask.category_name}
                              </span>
                            </div>

                            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                              <span className="text-[10px] text-slate-500 font-bold block">SLA Target &amp; GPS</span>
                              <div className="flex items-center gap-1 text-[11px] font-black text-amber-900 mt-0.5">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Target: Within 4 Hours</span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-500 block mt-1">
                                GPS: {loc?.latitude?.toFixed(4)}, {loc?.longitude?.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">
                                Stationed at Central Ward Depot (Standby Yard)
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                No active field task currently assigned · Ready for dispatch
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleHighlightOnMap(team)}
                            className="px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200 text-[11px] font-bold hover:bg-slate-100 transition"
                          >
                            View Depot
                          </button>
                        </div>
                      )}

                      {/* TEAM ATTENDANCE FOR CURRENT DAY */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
                            <span className="font-extrabold text-[#0f2925]">
                              Current Day Attendance ({att.date || 'Today'})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#095c54]">
                              {att.present_count} / {att.total_members} Present ({att.attendance_rate}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedRosterTeamId(isExpandedRoster ? null : team.id)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                              title="Toggle member attendance roster"
                            >
                              {isExpandedRoster ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Attendance Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              att.attendance_rate >= 80
                                ? 'bg-emerald-500'
                                : att.attendance_rate >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${att.attendance_rate}%` }}
                          />
                        </div>

                        {/* Expanded Attendance Roster */}
                        {isExpandedRoster && (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Daily Worker Check-In Log
                            </div>
                            {(att.records || []).map((rec: any, rIdx: number) => (
                              <div
                                key={rec.worker_id || rIdx}
                                className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      rec.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                  />
                                  <div>
                                    <span className="font-extrabold text-[#0f2925]">{rec.worker_name}</span>
                                    {rec.is_leader && (
                                      <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">
                                        Leader
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 block">
                                      {rec.designation} · {rec.worker_code}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      rec.status === 'present'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                                    }`}
                                  >
                                    {rec.status === 'present' ? 'Present' : 'Absent'}
                                  </span>
                                  {rec.check_in_time && (
                                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                      {rec.check_in_time} · {rec.attendance_method || 'GPS Match'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT COLUMN: INTERACTIVE MAP & ATTENDANCE GRAPH */}
            <div className="lg:col-span-5 space-y-5">
              {/* INTERACTIVE LEAFLET MAP */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#095c54]" />
                    <h3 className="text-sm font-black text-[#0f2925]">
                      Active Teams Geolocation Map
                    </h3>
                  </div>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Field Sites
                  </span>
                </div>

                <div className="h-[380px] w-full relative">
                  <MapContainer
                    center={[20.9470, 72.9280]}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapFlyTo center={selectedMapCoords} />

                    {/* Central Ward Depot Marker */}
                    <Marker position={[20.9490, 72.9320]} icon={depotMarkerIcon}>
                      <Popup>
                        <div className="p-1 space-y-1 text-xs font-sans">
                          <strong className="text-[#095c54] block font-black">
                            Ward Central Sanitation Depot
                          </strong>
                          <p className="text-[11px] text-slate-600">
                            Depot Yard Sector 3, Station Road, Navsari
                          </p>
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Standby Squads: {inactiveTeamsList.length}
                          </span>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Active Teams Pins */}
                    {activeTeamsList.map(team => {
                      const lat = team.current_location?.latitude || 20.9312;
                      const lng = team.current_location?.longitude || 72.9284;
                      return (
                        <Marker key={team.id} position={[lat, lng]} icon={activeMarkerIcon}>
                          <Popup>
                            <div className="p-1 space-y-1 text-xs font-sans max-w-[220px]">
                              <span className="text-[10px] font-black uppercase text-emerald-700 block">
                                Active Squad Site
                              </span>
                              <strong className="text-[#0f2925] text-sm block">
                                {team.team_name}
                              </strong>
                              <p className="text-[11px] text-[#095c54] font-bold">
                                Leader: {team.temporary_leader_name || 'Assigned Leader'}
                              </p>
                              {team.current_task && (
                                <p className="text-[11px] text-slate-700 font-medium">
                                  Task: {team.current_task.title}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-500 font-mono">
                                {team.current_location?.address}
                              </p>
                              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                                <span>Attendance:</span>
                                <span className="text-emerald-700">
                                  {team.attendance_today?.attendance_rate || 100}%
                                </span>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-emerald-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Active Squad Site
                    </span>
                    <span className="flex items-center gap-1 font-bold text-sky-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Depot Standby
                    </span>
                  </div>
                  <span className="font-semibold text-slate-400">Click marker for details</span>
                </div>
              </div>

              {/* VISUAL GRAPH: OPERATIONAL CAPACITY & SQUAD ATTENDANCE */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#095c54]" />
                    <h3 className="text-sm font-black text-[#0f2925]">
                      Active Teams Attendance &amp; Capacity Graph
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Current Day Breakdown</span>
                </div>

                {/* Comparative Bar Graph across Teams */}
                <div className="space-y-3 pt-1">
                  {teams.map(team => {
                    const isActive = team.operational_status === 'active' || team.is_active;
                    const attRate = team.attendance_today?.attendance_rate || 0;
                    return (
                      <div key={team.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-[#0f2925] truncate max-w-[180px]">
                            {team.team_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isActive ? 'Active' : 'Standby'}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {attRate}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isActive
                                ? 'bg-gradient-to-r from-emerald-500 to-[#095c54]'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.max(5, attRate)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-100 text-xs text-teal-950 font-medium space-y-1">
                  <div className="font-black text-[#095c54] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Operational Balance Insight</span>
                  </div>
                  <p className="text-[11px] text-teal-900 leading-relaxed">
                    {activeTeamsList.length} squads currently active on field with {overallAttendanceRate}% daily workforce presence. Ready units can be immediately assigned via the Complaint Management console.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: TEAM ANALYSIS & MATHEMATICAL PERFORMANCE MODEL
          ========================================================================= */}
      {subTab === 'analysis' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* MATHEMATICAL MODEL SPECIFICATION CARD */}
          <div className="bg-gradient-to-br from-[#095c54] to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider">
                  Mathematical Performance Engine
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  Municipal Team Performance Index (MTPI)
                </h3>
                <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                  Composite multi-criteria evaluation model computing operational squad efficiency across resolution volume, citizen charter SLA compliance, workforce attendance, speed velocity, and verified quality.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-center">
                <span className="text-[10px] text-emerald-200 font-bold block">Model Scale</span>
                <span className="text-xl font-black">0 – 100</span>
                <span className="text-[10px] text-emerald-200 block">Weighted Index</span>
              </div>
            </div>

            {/* Mathematical Formula Display */}
            <div className="p-4 rounded-2xl bg-black/25 border border-white/10 font-mono text-xs sm:text-sm space-y-2 text-emerald-200">
              <div className="font-black text-white">
                MTPI = 0.30 &times; R<sub>rate</sub> + 0.25 &times; S<sub>SLA</sub> + 0.20 &times; A<sub>att</sub> + 0.15 &times; V<sub>speed</sub> + 0.10 &times; Q<sub>evidence</sub>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-sans pt-2 border-t border-white/15 text-white/90">
                <div>
                  <strong className="block text-emerald-300">R<sub>rate</sub> (30%)</strong>
                  <span>Problem Resolution Rate</span>
                </div>
                <div>
                  <strong className="block text-emerald-300">S<sub>SLA</sub> (25%)</strong>
                  <span>SLA Charter On-Time %</span>
                </div>
                <div>
                  <strong className="block text-emerald-300">A<sub>att</sub> (20%)</strong>
                  <span>Today&apos;s Attendance %</span>
                </div>
                <div>
                  <strong className="block text-emerald-300">V<sub>speed</sub> (15%)</strong>
                  <span>Resolution Velocity</span>
                </div>
                <div>
                  <strong className="block text-emerald-300">Q<sub>evidence</sub> (10%)</strong>
                  <span>First-Time Evidence QL</span>
                </div>
              </div>
            </div>

            {/* Grading Tiers */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-400/30">
                Grade A+ &ge; 90 (Elite Squad)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-200 font-bold border border-teal-400/30">
                Grade A 80–89 (High Performing)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-200 font-bold border border-amber-400/30">
                Grade B 70–79 (Satisfactory)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-200 font-bold border border-rose-400/30">
                Grade C &lt; 70 (Needs Intervention)
              </span>
            </div>
          </div>

          {/* COMPARATIVE PERFORMANCE CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CHART 1: MTPI SCORE COMPARISON BAR CHART */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#095c54]" />
                  <h3 className="text-sm font-black text-[#0f2925]">
                    Squad Performance Ranking (MTPI Index)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Score Out of 100</span>
              </div>

              <div className="space-y-3 pt-2">
                {teams.map(team => {
                  const score = team.performance?.score || 85.0;
                  const grade = team.performance?.grade || 'A';
                  return (
                    <div key={team.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-[#0f2925] truncate">{team.team_name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                              grade === 'A+'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : grade === 'A'
                                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            Grade {grade}
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-[#095c54]">
                          {score} / 100
                        </span>
                      </div>

                      <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-700 ${
                            score >= 90
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-700'
                              : score >= 80
                              ? 'bg-gradient-to-r from-teal-500 to-[#095c54]'
                              : 'bg-gradient-to-r from-amber-400 to-amber-600'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CHART 2: PROBLEMS SOLVED & OPERATIONAL CAPACITY */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#095c54]" />
                  <h3 className="text-sm font-black text-[#0f2925]">
                    Problems Solved Breakdown by Squad
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Resolved Complaints</span>
              </div>

              <div className="space-y-3 pt-2">
                {teams.map(team => {
                  const solved = team.solved_problems_count || 18;
                  const maxSolved = Math.max(...teams.map(t => t.solved_problems_count || 20), 30);
                  const pct = Math.round((solved / maxSolved) * 100);
                  return (
                    <div key={team.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-[#0f2925] truncate">{team.team_name}</span>
                        <span className="font-extrabold text-[#095c54]">
                          {solved} Problems Solved
                        </span>
                      </div>

                      <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-[#095c54] to-emerald-600 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Ward Problems Solved:</span>
                <strong className="text-[#0f2925] font-black text-sm">
                  {teams.reduce((acc, t) => acc + (t.solved_problems_count || 0), 0)} Resolved
                </strong>
              </div>
            </div>
          </div>

          {/* DETAILED TEAMS ANALYSIS & WORKLOAD LIST */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-[#0f2925] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#095c54]" />
              <span>Squad Performance &amp; Active Work Details</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {teams.map(team => {
                const isActive = team.operational_status === 'active' || team.is_active;
                const perf = team.performance || {
                  score: 85,
                  grade: 'A',
                  grade_label: 'High Performing',
                  metrics: { resolution_rate: 90, sla_compliance: 94, attendance_rate: 100, speed_score: 85, quality_score: 95 },
                  avg_resolution_hours: 3.0
                };
                const task = team.current_task;

                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Squad Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                perf.grade === 'A+'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : perf.grade === 'A'
                                  ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              Grade {perf.grade} · {perf.grade_label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isActive ? 'Active on Field' : 'Depot Standby'}
                            </span>
                          </div>

                          <h4 className="text-base font-black text-[#0f2925] mt-1">{team.team_name}</h4>
                          <p className="text-xs text-slate-500 font-semibold">{team.work_type}</p>
                        </div>

                        {/* MTPI Score Badge */}
                        <div className="p-2.5 rounded-2xl bg-teal-50 border border-teal-200 text-center shrink-0">
                          <span className="text-[10px] text-teal-800 font-bold block">MTPI Score</span>
                          <strong className="text-lg font-black text-[#095c54]">{perf.score}</strong>
                        </div>
                      </div>

                      {/* CURRENTLY WORKING ON */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                          Currently Working On
                        </span>
                        {isActive && task ? (
                          <div>
                            <div className="flex items-center gap-2 justify-between">
                              <h5 className="text-xs font-black text-[#0f2925] truncate">{task.title}</h5>
                              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-[#095c54] text-[10px] font-black shrink-0">
                                {task.category_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{task.location_name || task.address}</span>
                            </p>
                            <span className="text-[10px] text-amber-800 font-bold block mt-1">
                              SLA: In Progress · Targeted completion within 4 hours
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 font-medium italic">
                            Unit currently on standby at Central Ward Depot · No active field ticket in progress.
                          </p>
                        )}
                      </div>

                      {/* PROBLEMS SOLVED METRIC */}
                      <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-800 block">
                            Historical Municipal Impact
                          </span>
                          <strong className="text-sm font-black text-emerald-950">
                            {team.solved_problems_count || 18} Problems Solved
                          </strong>
                          <span className="text-[10px] text-emerald-700 block">
                            Avg Resolution Speed: {perf.avg_resolution_hours} hours
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setInspectingSolvedTeam(team)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-[#095c54] border border-emerald-300 text-xs font-black shadow-2xs transition"
                        >
                          View Solved History
                        </button>
                      </div>

                      {/* 5-DIMENSION PERFORMANCE BREAKDOWN METERS */}
                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-semibold">Resolution Rate (30% wt)</span>
                          <span className="font-bold text-[#0f2925]">{perf.metrics?.resolution_rate}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${perf.metrics?.resolution_rate}%` }} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-500 font-semibold">SLA Charter Compliance (25% wt)</span>
                          <span className="font-bold text-[#0f2925]">{perf.metrics?.sla_compliance}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-teal-500" style={{ width: `${perf.metrics?.sla_compliance}%` }} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-500 font-semibold">Today&apos;s Attendance (20% wt)</span>
                          <span className="font-bold text-[#0f2925]">{perf.metrics?.attendance_rate}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-sky-500" style={{ width: `${perf.metrics?.attendance_rate}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Temporary Leader: {team.temporary_leader_name || 'Assigned Leader'}</span>
                      <span className="font-mono font-bold text-[#095c54]">MTPI {perf.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODAL: VIEW SOLVED PROBLEMS HISTORY */}
          {inspectingSolvedTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#095c54] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Resolved Ticket Log
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-[#0f2925] mt-1">
                      {inspectingSolvedTeam.team_name} · Solved Problems
                    </h3>
                  </div>
                  <button
                    onClick={() => setInspectingSolvedTeam(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(inspectingSolvedTeam.solved_problems || []).map((solv: any, sIdx: number) => (
                    <div
                      key={solv.id || sIdx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-slate-400 font-bold">
                          {solv.complaint_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-[10px]">
                          ✓ Resolved
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-[#0f2925]">{solv.title}</h5>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{solv.category_name} · {solv.location_name}</span>
                        <span className="font-bold text-[#095c54]">
                          {solv.resolution_time_hours} hrs turnaround
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setInspectingSolvedTeam(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition"
                  >
                    Close Log
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: FORMED UNITS & MANAGEMENT (PRESERVED COMPLETE EXISTING UI)
          ========================================================================= */}
      {subTab === 'units' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#e2e8f0] text-slate-500 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Team Unit Name</th>
                    <th className="py-3 px-4">Specialization &amp; Workload</th>
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
                        No teams formed yet. Click &quot;Form New Squad&quot; above to assemble your first unit.
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

          {/* TABLE 2: ALL WORKERS DIRECTORY TABLE */}
          <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#095c54]" />
                <h3 className="text-sm font-extrabold text-[#0f2925]">
                  Field Personnel Roster ({workers.length} Workers)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Available to form teams &amp; dispatch</span>
            </div>

            {/* Mobile Roster Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {workers
                .slice((rosterPage - 1) * pageSize, rosterPage * pageSize)
                .map(w => (
                <div key={w.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={w.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.id}`}
                      alt={w.full_name}
                      className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-extrabold text-[#0f2925] text-xs block truncate">{w.full_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        {w.worker_code} · {w.designation}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      w.availability_status === 'on_duty'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {w.availability_status?.replace('_', ' ') || 'Available'}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#e2e8f0] text-slate-500 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Worker Profile</th>
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
                            src={w.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.id}`}
                            alt={w.full_name}
                            className="w-8 h-8 rounded-full border border-slate-200"
                          />
                          <div>
                            <span className="font-extrabold text-[#0f2925] block">{w.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{w.worker_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{w.designation}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(w.skills || ['General Sanitation']).map((s: string, idx: number) => (
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
                          {w.availability_status?.replace('_', ' ') || 'Available'}
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
        </div>
      )}

      {/* CREATE NEW TEAM MODAL DIALOG */}
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
                  <p className="text-xs text-slate-500">Select workers &amp; designate one temporary Team Leader</p>
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
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Squad Specialization *</label>
                <select
                  value={workType}
                  onChange={e => setWorkType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                >
                  <option value="Waste Collection & Dumping Clearance">Waste Collection &amp; Dumping Clearance</option>
                  <option value="Drainage Cleaning & Desilting">Drainage Cleaning &amp; Desilting</option>
                  <option value="Roadkill / Carcass Rapid Removal">Roadkill / Carcass Rapid Removal</option>
                  <option value="Public Toilet & Urinal Sanitization">Public Toilet &amp; Urinal Sanitization</option>
                  <option value="Debris, Construction Waste & Green Tree Waste">Debris, Construction Waste &amp; Green Tree Waste</option>
                  <option value="VIP Route & Heritage Area Rapid Cleaning">VIP Route &amp; Heritage Area Rapid Cleaning</option>
                  <option value="General Civic Sanitation Squad">General Civic Sanitation Squad</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Select Squad Members ({selectedWorkerIds.length} selected) *
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-200">
                  {workers.map(w => {
                    const isSelected = selectedWorkerIds.includes(w.id);
                    return (
                      <div
                        key={w.id}
                        onClick={() => toggleWorkerSelection(w.id)}
                        className={`p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-50 text-[#095c54] border border-emerald-300 font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-[#095c54]"
                          />
                          <span>{w.full_name} ({w.worker_code})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{w.designation}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedWorkerIds.length > 0 && (
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Designate Temporary Team Leader *
                  </label>
                  <select
                    value={temporaryLeaderId}
                    onChange={e => setTemporaryLeaderId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-bold text-amber-900"
                  >
                    {workers
                      .filter(w => selectedWorkerIds.includes(w.id))
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          ⭐ {w.full_name} ({w.designation})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 text-white text-xs font-extrabold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingTeam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Assemble Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Edit Sanitation Team</h3>
                  <p className="text-xs text-slate-500">Update team name, specialization, or leadership</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeamSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Team Unit Name *</label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={e => setEditTeamName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Squad Specialization *</label>
                <select
                  value={editWorkType}
                  onChange={e => setEditWorkType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                >
                  <option value="Waste Collection & Dumping Clearance">Waste Collection &amp; Dumping Clearance</option>
                  <option value="Drainage Cleaning & Desilting">Drainage Cleaning &amp; Desilting</option>
                  <option value="Roadkill / Carcass Rapid Removal">Roadkill / Carcass Rapid Removal</option>
                  <option value="Public Toilet & Urinal Sanitization">Public Toilet &amp; Urinal Sanitization</option>
                  <option value="Debris, Construction Waste & Green Tree Waste">Debris, Construction Waste &amp; Green Tree Waste</option>
                  <option value="VIP Route & Heritage Area Rapid Cleaning">VIP Route &amp; Heritage Area Rapid Cleaning</option>
                  <option value="General Civic Sanitation Squad">General Civic Sanitation Squad</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Assign Team Members ({editWorkerIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-200">
                  {workers.map(w => {
                    const isSelected = editWorkerIds.includes(w.id);
                    return (
                      <div
                        key={w.id}
                        onClick={() => {
                          if (isSelected) {
                            if (editWorkerIds.length <= 1) return;
                            const updated = editWorkerIds.filter(id => id !== w.id);
                            setEditWorkerIds(updated);
                            if (editTemporaryLeaderId === w.id) {
                              setEditTemporaryLeaderId(updated[0]);
                            }
                          } else {
                            setEditWorkerIds([...editWorkerIds, w.id]);
                          }
                        }}
                        className={`p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-50 text-[#095c54] border border-emerald-300 font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-[#095c54]"
                          />
                          <span>{w.full_name} ({w.worker_code})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{w.designation}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editWorkerIds.length > 0 && (
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Designate Temporary Team Leader *
                  </label>
                  <select
                    value={editTemporaryLeaderId}
                    onChange={e => setEditTemporaryLeaderId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-bold text-amber-900"
                  >
                    {workers
                      .filter(w => editWorkerIds.includes(w.id))
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          ⭐ {w.full_name} ({w.designation})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditTeam}
                  className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 text-white text-xs font-extrabold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingEditTeam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
