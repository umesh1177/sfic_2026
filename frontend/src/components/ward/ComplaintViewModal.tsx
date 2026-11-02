import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  Crown,
  Clock,
  Phone,
  Send,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Eye,
  Camera
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';

const markerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ComplaintViewModalProps {
  complaintId: string;
  onClose: () => void;
  onComplaintUpdated?: () => void;
  onOpenInspect?: (id: string) => void;
}

export const ComplaintViewModal: React.FC<ComplaintViewModalProps> = ({
  complaintId,
  onClose,
  onComplaintUpdated,
  onOpenInspect
}) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reject State
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);

  // Approve & Assign Team State
  const [showAssignForm, setShowAssignForm] = useState<boolean>(false);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('waste_collection');
  const [instructions, setInstructions] = useState<string>(
    'Clear all overflowing waste, sweep pavement curb thoroughly, and disinfect area with bleaching powder.'
  );
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [assigning, setAssigning] = useState<boolean>(false);

  // View Full Team Modal State
  const [viewingFullTeam, setViewingFullTeam] = useState<any | null>(null);

  const fetchComplaintDetails = async () => {
    try {
      setLoading(true);
      const [compRes, teamsRes, workersRes] = await Promise.all([
        api.getWardComplaintDetails(complaintId),
        api.getWardTeams().catch(() => ({ data: [] })),
        api.getWardWorkers().catch(() => ({ data: [] }))
      ]);

      setDetails(compRes.data);
      const teams = teamsRes.data || [];
      setTeamsList(teams);
      setWorkersList(workersRes.data || []);

      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [complaintId]);

  // Handle Reject Complaint
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please specify a valid reason for rejecting this complaint.');
      return;
    }

    setRejecting(true);
    setError(null);
    try {
      await api.rejectWardComplaint(complaintId, {
        rejection_reason: rejectionReason.trim()
      });
      if (onComplaintUpdated) onComplaintUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject complaint.');
      setRejecting(false);
    }
  };

  // Handle Approve & Assign Team
  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const team = teamsList.find(t => t.id === selectedTeamId) || teamsList[0];
    if (!team) {
      alert('Please select a sanitation squad team.');
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      await api.assignWardComplaint(complaintId, {
        team_id: team.id,
        team_name: team.team_name,
        work_type: selectedWorkType,
        worker_ids: team.worker_ids,
        temporary_leader_id: team.temporary_leader_id,
        instructions,
        deadline: new Date(deadline).toISOString()
      });
      confetti({ particleCount: 35, spread: 60 });
      if (onComplaintUpdated) onComplaintUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign team.');
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading complaint...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-3">
          <p className="text-xs font-bold text-red-600">Could not load complaint information.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { overview, citizen_report, location_map } = details;
  const coords: [number, number] = [location_map?.latitude || 20.9485, location_map?.longitude || 72.9260];
  const isPendingTriage = overview.status === 'submitted' || overview.status === 'under_review';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-gradient-to-r from-emerald-50/70 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#095c54] text-white flex items-center justify-center font-black text-sm shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                  {overview.complaint_number}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Ward {location_map?.ward_number || 3}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-[#0f2925] truncate mt-0.5">
                {overview.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Status Stepper Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <StatusProgressionStepper
            status={overview.status}
            rejectionReason={(overview as any).rejection_reason}
            compact
          />
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. IMAGE & CITIZEN DESCRIPTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 relative">
              {(citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url) ? (
                <img
                  src={citizen_report?.photo_url || (citizen_report?.original_photos && citizen_report.original_photos[0]) || overview.image_url}
                  alt="Citizen complaint photograph"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-4 text-center">
                  <Camera className="w-8 h-8 text-slate-300 mb-1" />
                  <span className="text-xs font-bold text-slate-500">No Photo Submitted</span>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">
                Citizen Photo Evidence
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cleanliness Category</span>
                  <span className="text-sm font-extrabold text-[#095c54]">{overview.category_name}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed mt-0.5">
                    {citizen_report?.description || overview.description || 'No detailed description provided.'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Reported By:</span>
                  <strong className="text-slate-800">{citizen_report?.citizen_name || overview.citizen_name || 'Citizen'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <a href={`tel:${citizen_report?.citizen_phone || '+919825100001'}`} className="font-bold text-[#095c54] hover:underline">
                    {citizen_report?.citizen_phone || '+91 98251 00001'}
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span>{new Date(citizen_report?.submitted_at || overview.submitted_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. INTERACTIVE LOCATION IN MAP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                <span>Geographic Map Location</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {location_map?.address || 'Navsari Ward 3'}
              </span>
            </div>

            <div className="h-52 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
              <MapContainer center={coords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={coords} icon={markerIcon}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong className="text-[#095c54]">{overview.complaint_number}</strong>
                      <p>{location_map?.landmark || location_map?.address}</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle center={coords} radius={100} pathOptions={{ color: '#095c54', fillColor: '#095c54', fillOpacity: 0.15 }} />
              </MapContainer>
            </div>
          </div>

          {/* 3. REJECT COMPLAINT FORM (If Officer clicks Reject) */}
          {showRejectForm && (
            <form onSubmit={handleReject} className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Specify Rejection Reason (Dispatched to Citizen Notification)</span>
              </div>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why this complaint is being rejected (e.g. Duplicate report, private property outside municipal jurisdiction, unclear coordinates)..."
                className="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs text-slate-900 bg-white focus:border-rose-500 outline-hidden resize-none"
                required
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3.5 py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {rejecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Confirm Rejection & Notify Citizen</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. APPROVE & ASSIGN TEAM FORM (WITH PROPER LIST OF ALL TEAMS) */}
          {showAssignForm && (
            <form onSubmit={handleAssignTeam} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#095c54]" />
                  <span>Select Sanitation Squad to Assign (Active Formed Teams)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select a team from the list below. Assigned workers will immediately see this task in their dashboard.
                </p>
              </div>

              {/* PROPER LIST OF ALL TEAMS (NOT A DROPDOWN!) */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {teamsList.map(team => {
                  const isSelected = selectedTeamId === team.id;
                  const memberCount = (team.worker_ids || []).length;
                  const leaderWorker = workersList.find(w => w.id === team.temporary_leader_id);

                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#095c54] bg-[#e6f4f1]/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-[#095c54] bg-[#095c54]' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs font-extrabold text-[#0f2925]">{team.team_name}</h5>
                            <span className="px-2 py-0.2 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                              Ward {team.ward_number || 3}
                            </span>
                            <span className="px-2 py-0.2 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              {memberCount} Workers
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Team Leader: <strong>{team.temporary_leader_name || leaderWorker?.full_name || 'Kanti Solanki'}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* View Full Team Button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setViewingFullTeam(team);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 self-start sm:self-center"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>View Full Team</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Work Type, Instructions & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Work Type Category *</label>
                  <select
                    value={selectedWorkType}
                    onChange={e => setSelectedWorkType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white outline-hidden focus:border-[#095c54]"
                  >
                    <option value="waste_collection">Solid Waste & Litter Clearance</option>
                    <option value="drain_clearing">Drain & Culvert Desilting</option>
                    <option value="road_sweeping">Road Sweeping & Curb Sanitization</option>
                    <option value="disinfection">Bleaching Powder Disinfection</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Completion Deadline *</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={e => setDeadline(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white outline-hidden focus:border-[#095c54]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Specific Officer Instructions *</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="e.g. Desilt drain mouth & apply lime..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white outline-hidden focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAssignForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
                >
                  {assigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Confirm & Assign Squad</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Actions: Two Action Buttons Approve & Reject */}
        <div className="p-4 sm:p-5 border-t border-[#e2e8f0] bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onOpenInspect && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInspect(complaintId);
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#095c54] border border-[#a7f3d0] font-extrabold text-xs transition flex items-center gap-1.5 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Full Inspect View &rarr;</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPendingTriage && !showRejectForm && !showAssignForm && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200 transition flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Reject Complaint</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignForm(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs shadow-md transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Approve & Assign Team</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* VIEW FULL TEAM ROSTER MODAL */}
      {viewingFullTeam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center font-bold text-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0f2925]">{viewingFullTeam.team_name}</h4>
                  <p className="text-[10px] text-slate-500">Sanitation Squad · Ward {viewingFullTeam.ward_number || 3}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingFullTeam(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Full Squad Roster ({((viewingFullTeam.worker_ids || []).length)} Members)
              </p>

              {(viewingFullTeam.worker_ids || []).map((wId: string) => {
                const w = workersList.find(worker => worker.id === wId);
                const isLeader = wId === viewingFullTeam.temporary_leader_id;

                return (
                  <div
                    key={wId}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                      isLeader ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isLeader ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isLeader ? '👑' : '👷'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#0f2925]">{w?.full_name || 'Field Worker'}</span>
                          {isLeader && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                              LEADER
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{w?.worker_code || 'WRK-NAV'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block font-medium">{w?.designation || 'Sanitation Worker'}</span>
                      <a href={`tel:${w?.phone || '+919825120001'}`} className="text-[10px] font-bold text-[#095c54] hover:underline">
                        {w?.phone || '+91 98251 20001'}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingFullTeam(null)}
                className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

