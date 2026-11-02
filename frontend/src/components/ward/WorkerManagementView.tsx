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
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Award,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api.js';

export const WorkerManagementView: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 5;

  // Add Worker Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('Worker@123');
  const [designation, setDesignation] = useState<string>('Sanitation Worker');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Litter Abatement', 'Bin Clearance']);
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('available');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Edit Worker Modal State
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editDesignation, setEditDesignation] = useState<string>('Sanitation Worker');
  const [editAvailability, setEditAvailability] = useState<string>('available');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  const handleOpenEditModal = (worker: any) => {
    setEditingWorker(worker);
    setEditFullName(worker.full_name);
    setEditPhone(worker.phone);
    setEditDesignation(worker.designation || 'Sanitation Worker');
    setEditAvailability(worker.availability_status || 'available');
    setEditSkills(Array.isArray(worker.skills) ? [...worker.skills] : ['Litter Abatement']);
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;
    setSubmittingEdit(true);
    setActionError('');
    try {
      const res = await api.updateWardWorker(editingWorker.id, {
        full_name: editFullName,
        phone: editPhone,
        designation: editDesignation,
        availability_status: editAvailability,
        skills: editSkills
      });
      setActionSuccess(res.message || 'Worker updated successfully');
      setEditingWorker(null);
      fetchWorkers();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update worker');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${workerName} from Ward 3 field roster?`)) {
      return;
    }
    try {
      const res = await api.deleteWardWorker(workerId);
      setActionSuccess(res.message || `Worker ${workerName} removed successfully`);
      setWorkers(prev => prev.filter(w => w.id !== workerId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove worker');
    }
  };

  const allSkillsList = [
    'Bin Clearance',
    'Lakeside Sanitation',
    'Debris Lifting',
    'Door-to-door Collection',
    'Waste Segregation',
    'High Pressure Jetting',
    'Sewer Maintenance',
    'Mechanical Sweeping',
    'Litter Abatement',
    'Commercial Waste Removal',
    'Heavy Vehicle Driving'
  ];

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

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setActionError('Full name and phone number are required.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      const res = await api.addWardWorker({
        full_name: fullName.trim(),
        phone: phone.trim(),
        username: username.trim(),
        password: password.trim(),
        designation,
        skills: selectedSkills,
        availability_status: availabilityStatus
      });

      setActionSuccess(res.message || 'Worker added successfully to Ward 3.');
      setShowAddModal(false);
      setFullName('');
      setPhone('');
      setUsername('');
      setPassword('Worker@123');
      setSelectedSkills(['Litter Abatement', 'Bin Clearance']);
      await fetchWorkers();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add worker');
    } finally {
      setSubmitting(false);
    }
  };

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

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedWorkers = filtered.slice((page - 1) * pageSize, page * pageSize);

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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#095c54] text-white hover:bg-emerald-800 text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Worker</span>
          </button>

          <button
            onClick={fetchWorkers}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh directory"
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

      {/* Role notice as required by municipal policy */}
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
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by worker name, code, or skill..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Availability:</span>
          <select
            value={availabilityFilter}
            onChange={e => {
              setAvailabilityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">All Workers</option>
            <option value="available">Available (Standby)</option>
            <option value="on_duty">Currently on Duty</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* WORKERS DIRECTORY TABLE (Mandated Table Format with Pagination) */}
      <div className="rounded-3xl bg-white border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#e2e8f0] text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Worker Personnel</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Certified Skills</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4">Today's Deployment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto mb-2" />
                    Loading worker records...
                  </td>
                </tr>
              ) : paginatedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No workers match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedWorkers.map(worker => (
                  <tr key={worker.id} className="hover:bg-slate-50/70 transition">
                    {/* Worker Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={worker.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80'}
                          alt={worker.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-extrabold text-[#0f2925] text-xs">{worker.full_name}</p>
                          <span className="font-mono text-[10px] text-slate-400 block">{worker.worker_code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="py-3.5 px-4 font-bold text-[#095c54]">
                      {worker.designation}
                    </td>

                    {/* Skills */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(worker.skills || []).slice(0, 3).map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                        {(worker.skills || []).length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                            +{(worker.skills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Availability */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                          worker.availability_status === 'on_duty'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : worker.availability_status === 'available'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {worker.availability_status?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Today's Deployment */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-bold text-slate-800">{worker.attendance_today || 'Present (Standby)'}</p>
                      {worker.active_task_code && (
                        <p className="text-[10px] text-[#095c54] font-mono mt-0.5">
                          Task: <strong>{worker.active_task_code}</strong>
                        </p>
                      )}
                    </td>

                    {/* Actions: Call, Edit, Delete */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`tel:${worker.phone}`}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white transition"
                          title={`Call ${worker.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleOpenEditModal(worker)}
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-[#095c54] text-[#095c54] hover:text-white transition border border-emerald-200"
                          title="Edit Worker Profile"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorker(worker.id, worker.full_name)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition border border-rose-200"
                          title="Remove Worker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-[#e2e8f0] bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Showing <strong>{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> workers
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="text-xs font-extrabold text-[#095c54] px-2">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold flex items-center gap-1 shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD WORKER MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Add New Sanitation Worker</h3>
                  <p className="text-xs text-slate-500">Register field personnel to Ward 3 municipal roster</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Worker Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g., Bharatbhai Rathod"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+9198251XXXXX"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Login Username <span className="text-[10px] text-slate-400 font-normal">(Optional - defaults to worker code or mobile)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. raju or WRK-03"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Login Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Set password for worker login"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">Worker can log in using either their mobile number or username, along with this password.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Designation</label>
                  <select
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  >
                    <option value="Sanitation Worker">Sanitation Worker</option>
                    <option value="Waste Collection Worker">Waste Collection Worker</option>
                    <option value="Drainage Jetting Operator">Drainage Jetting Operator</option>
                    <option value="Road Sweeper">Road Sweeper</option>
                    <option value="Tipper Truck Driver">Tipper Truck Driver</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Initial Availability</label>
                  <select
                    value={availabilityStatus}
                    onChange={e => setAvailabilityStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  >
                    <option value="available">Available (Standby)</option>
                    <option value="on_duty">On Duty</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                  Certified Competencies & Skills
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {allSkillsList.map(skill => {
                    const checked = selectedSkills.includes(skill);
                    return (
                      <label
                        key={skill}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                          checked ? 'bg-emerald-100/70 text-[#095c54]' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleSkill(skill)}
                          className="rounded text-[#095c54] focus:ring-0"
                        />
                        <span className="truncate">{skill}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Worker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORKER MODAL */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f2925]">
                    Edit Worker Profile: {editingWorker.full_name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Code: {editingWorker.worker_code} · Ward 3
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingWorker(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateWorker} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Designation
                  </label>
                  <select
                    value={editDesignation}
                    onChange={e => setEditDesignation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden"
                  >
                    <option value="Sanitation Worker">Sanitation Worker</option>
                    <option value="Drainage Cleaning Worker">Drainage Cleaning Worker</option>
                    <option value="Street Cleaning Worker">Street Cleaning Worker</option>
                    <option value="Waste Collection Worker">Waste Collection Worker</option>
                    <option value="Waste Segregation Worker">Waste Segregation Worker</option>
                    <option value="Garbage Vehicle Operator">Garbage Vehicle Operator</option>
                    <option value="Public Toilet Maintenance Worker">Public Toilet Maintenance Worker</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Availability Status
                  </label>
                  <select
                    value={editAvailability}
                    onChange={e => setEditAvailability(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden"
                  >
                    <option value="available">Available (Standby)</option>
                    <option value="on_duty">On Duty</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
                >
                  {submittingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
