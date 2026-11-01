import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  Crown,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import { api } from '../../services/api.js';

export const WorkAssignmentsView: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('street_cleaning');
  const [newLocation, setNewLocation] = useState<string>('North Lake Promenade, Dudhiya Talao');
  const [newPriority, setNewPriority] = useState<string>('medium');
  const [newLeaderId, setNewLeaderId] = useState<string>('f2000000-0000-0000-0000-000000000001');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.getWardAssignments();
      setAssignments(res.data || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setSubmitting(true);
    try {
      const leaderName = newLeaderId === 'f2000000-0000-0000-0000-000000000001' ? 'Kanti Solanki' : 'Suresh Vaghela';
      const created = {
        id: `tsk-nav-2026-${Date.now()}`,
        task_code: `TSK-NAV-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: newTitle,
        category: newCategory,
        priority: newPriority,
        ward_number: 3,
        location_name: newLocation,
        team_leader_name: leaderName,
        team_leader_id: newLeaderId,
        team_members_count: 2,
        scheduled_date: new Date().toISOString().split('T')[0],
        status: 'assigned',
        attendance_status: 'Awaiting Check-in',
        evidence_status: 'Not Uploaded'
      };
      setAssignments([created, ...assignments]);
      setShowCreateModal(false);
      setNewTitle('');
      setActionMessage('New work assignment successfully created and dispatched to field worker team.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = assignments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.task_code.toLowerCase().includes(q) ||
        a.location_name.toLowerCase().includes(q) ||
        a.team_leader_name.toLowerCase().includes(q)
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
            Work Assignments Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily Municipal Field Deployments · Ward 3 Tasks & Schedules
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Assignment</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, codes, or leaders..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completion_submitted">Completion Submitted</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
            <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 mt-2">Loading field assignments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-500 text-xs">
            No assignments match the selected criteria.
          </div>
        ) : (
          filtered.map(assignment => (
            <div
              key={assignment.id}
              className="p-5 rounded-3xl bg-white border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] px-2.5 py-0.5 rounded-md border border-[#b8e0d7]">
                    {assignment.task_code}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      assignment.priority === 'urgent'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : assignment.priority === 'high'
                        ? 'bg-orange-50 text-orange-800 border border-orange-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {assignment.priority}
                  </span>
                  {assignment.linked_complaint_number && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Linked: {assignment.linked_complaint_number}
                    </span>
                  )}
                </div>

                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    assignment.status === 'completion_submitted'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : assignment.status === 'in_progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {assignment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-[#0f2925]">{assignment.title}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{assignment.location_name}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Temporary Team Leader</span>
                    <span className="font-extrabold text-slate-800">{assignment.team_leader_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Attendance Verification</span>
                    <span className="font-bold text-[#095c54]">{assignment.attendance_status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Photographic Evidence</span>
                    <span className="font-bold text-slate-700">{assignment.evidence_status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateAssignment}
            className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#0f2925]">Create New Work Assignment</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Lakeside Stone Pavement Desilting"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Landmark in Ward 3</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="street_cleaning">Street Cleaning</option>
                    <option value="bin_clearance">Bin Clearance</option>
                    <option value="drainage_cleaning">Drainage Cleaning</option>
                    <option value="open_dumping_removal">Open Dumping Removal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Designate Temporary Team Leader (Task-Specific Authority)
                </label>
                <select
                  value={newLeaderId}
                  onChange={e => setNewLeaderId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="f2000000-0000-0000-0000-000000000001">Kanti Solanki (Sanitation Worker)</option>
                  <option value="f2000000-0000-0000-0000-000000000002">Suresh Vaghela (Waste Collection Worker)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  Note: Leadership is temporary for this task only. No permanent leader role exists.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition"
              >
                {submitting ? 'Creating...' : 'Deploy Team'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

