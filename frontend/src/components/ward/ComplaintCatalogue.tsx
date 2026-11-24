import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  Crown,
  Camera,
  Layers,
  ArrowUpDown,
  Sparkles,
  Users,
  ClipboardCheck,
  Activity,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ComplaintViewModal } from './ComplaintViewModal.js';
import { ComplaintInspectView } from './ComplaintInspectView.js';
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';

interface ComplaintCatalogueProps {
  initialFilter?: {
    status?: string;
    progress_status?: string;
    priority?: string;
    additional_flags?: string;
    ward_number?: number | string;
  };
  onNavigateTab?: (tab: string) => void;
}

export const ComplaintCatalogue: React.FC<ComplaintCatalogueProps> = ({ initialFilter, onNavigateTab }) => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [trackingComplaintId, setTrackingComplaintId] = useState<string | null>(null);
  const [viewingComplaintId, setViewingComplaintId] = useState<string | null>(null);
  const [inspectingComplaintId, setInspectingComplaintId] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>(initialFilter?.status || 'all');
  const [category, setCategory] = useState<string>('all');
  const [priority, setPriority] = useState<string>(initialFilter?.priority || 'all');
  const [progressStatus, setProgressStatus] = useState<string>(initialFilter?.progress_status || 'all');
  const [wardFilter, setWardFilter] = useState<string>(initialFilter?.ward_number ? String(initialFilter.ward_number) : 'all');
  const [assignment, setAssignment] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [additionalFlags, setAdditionalFlags] = useState<string>(initialFilter?.additional_flags || 'all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Segregation: Active vs Resolved category
  const [catalogueView, setCatalogueView] = useState<'active' | 'resolved'>('active');

  // Reopen Modal State
  const [reopeningComplaint, setReopeningComplaint] = useState<any | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopenUrgency, setReopenUrgency] = useState<string>('high');
  const [submittingReopen, setSubmittingReopen] = useState<boolean>(false);
  const [reopenSuccess, setReopenSuccess] = useState<string | null>(null);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync when initialFilter prop changes or is cleared
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.status) setStatus(initialFilter.status);
      if (initialFilter.priority) setPriority(initialFilter.priority);
      if (initialFilter.progress_status) setProgressStatus(initialFilter.progress_status);
      if (initialFilter.additional_flags) setAdditionalFlags(initialFilter.additional_flags);
      if (initialFilter.ward_number) setWardFilter(String(initialFilter.ward_number));
    } else {
      setStatus('all');
      setPriority('all');
      setProgressStatus('all');
      setAdditionalFlags('all');
      setWardFilter('all');
    }
    setPage(1);
  }, [initialFilter]);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Load complaints
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const targetStatus = catalogueView === 'resolved' ? 'resolved' : (status !== 'all' ? status : undefined);
      const res = await api.getWardComplaints({
        search,
        status: targetStatus,
        category,
        priority,
        progress_status: progressStatus,
        ward: wardFilter !== 'all' ? wardFilter : undefined,
        ward_number: wardFilter !== 'all' ? wardFilter : undefined,
        assignment,
        location: locationFilter,
        additional_flags: additionalFlags,
        sort_by: sortBy,
        page,
        limit: 15
      });
      setComplaints(res.data || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalCount(res.pagination?.total || (res.data || []).length);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [search, status, category, priority, progressStatus, wardFilter, assignment, locationFilter, additionalFlags, sortBy, page, catalogueView]);

  // Handle Reopen Problem
  const handleConfirmReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningComplaint || !reopenReason.trim()) return;
    setSubmittingReopen(true);
    setReopenError(null);
    try {
      await api.reopenWardComplaint(reopeningComplaint.id, {
        reopen_reason: reopenReason.trim(),
        urgency: reopenUrgency,
        team_option: 'previous'
      });
      setReopenSuccess(`Complaint ${reopeningComplaint.complaint_number} reopened successfully! It has been returned to Active Complaints.`);
      setReopeningComplaint(null);
      setReopenReason('');
      setCatalogueView('active');
      await fetchComplaints();
      setTimeout(() => setReopenSuccess(null), 4000);
    } catch (err: any) {
      setReopenError(err.message || 'Failed to reopen complaint.');
    } finally {
      setSubmittingReopen(false);
    }
  };

  // Handle Delete Complaint
  const handleDeleteComplaint = async (complaint: any) => {
    const ok = window.confirm(
      `Are you sure you want to permanently delete complaint ${complaint.complaint_number} (${complaint.category_name})?`
    );
    if (!ok) return;
    setDeletingId(complaint.id);
    setReopenError(null);
    try {
      await api.deleteWardComplaint(complaint.id);
      setReopenSuccess(`Complaint ${complaint.complaint_number} deleted permanently.`);
      if (trackingComplaintId === complaint.id) setTrackingComplaintId(null);
      await fetchComplaints();
      setTimeout(() => setReopenSuccess(null), 4000);
    } catch (err: any) {
      setReopenError(err.message || 'Failed to delete complaint.');
    } finally {
      setDeletingId(null);
    }
  };

  const displayedComplaints = complaints.filter(c => {
    if (catalogueView === 'active') {
      return c.status !== 'resolved' && c.status !== 'closed';
    } else {
      return c.status === 'resolved' || c.status === 'closed';
    }
  });

  // Reset filters
  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('all');
    setPriority('all');
    setProgressStatus('all');
    setWardFilter(initialFilter?.ward_number ? String(initialFilter.ward_number) : 'all');
    setAssignment('all');
    setLocationFilter('all');
    setAdditionalFlags('all');
    setSortBy('newest');
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    status !== 'all' ||
    category !== 'all' ||
    priority !== 'all' ||
    progressStatus !== 'all' ||
    wardFilter !== 'all' ||
    assignment !== 'all' ||
    locationFilter !== 'all' ||
    additionalFlags !== 'all' ||
    sortBy !== 'newest';

  if (inspectingComplaintId) {
    return (
      <ComplaintInspectView
        complaintId={inspectingComplaintId}
        onBack={() => setInspectingComplaintId(null)}
        onComplaintUpdated={fetchComplaints}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Complaint Catalogue
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}
          <button
            onClick={fetchComplaints}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh catalogue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reopen Toast Notification */}
      {reopenSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reopenSuccess}</span>
        </div>
      )}

      {/* 2 Primary Segments: Active Complaints vs Resolved Problems */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-full sm:w-fit border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setCatalogueView('active');
            setPage(1);
          }}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
            catalogueView === 'active'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Active Complaints (Requiring Action)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCatalogueView('resolved');
            setPage(1);
          }}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
            catalogueView === 'resolved'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Resolved & Completed Problems</span>
        </button>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Complaint ID, Landmark, Citizen, or Temporary Team Leader..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 font-medium focus:bg-white focus:border-[#095c54] outline-hidden transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Progress Status (CRITICAL FILTER!) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-purple-800 mb-1">
              Progress Status
            </label>
            <select
              value={progressStatus}
              onChange={e => {
                setProgressStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-bold p-2 rounded-xl border border-purple-200 bg-purple-50/60 text-purple-950 focus:border-purple-600 outline-hidden"
            >
              <option value="all">All Progress Stages</option>
              <option value="Not Assigned">Not Assigned</option>
              <option value="Assigned – Awaiting Attendance">Assigned – Awaiting Attendance</option>
              <option value="Attendance & Monitoring">Attendance & Monitoring</option>
              <option value="Work In Progress">Work In Progress</option>
              <option value="Work Progress & Evidence">Work Progress & Evidence</option>
              <option value="Completion Report Submitted">Completion Report Submitted</option>
              <option value="Awaiting Ward Officer Review">Awaiting Ward Officer Review</option>
              <option value="Changes Requested">Changes Requested</option>
              <option value="Verified Complete">Verified Complete</option>
              <option value="Reopened – New Work Required">Reopened – New Work Required</option>
              <option value="Overdue Work">Overdue Work</option>
            </select>
          </div>

          {/* 2. Ward Location */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Ward</label>
            <select
              value={wardFilter}
              onChange={e => {
                setWardFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white focus:border-[#095c54] outline-hidden truncate"
            >
              <option value="all">All Wards (Navsari)</option>
              <option value="3">Ward 3 - Dudhiya Talao</option>
              <option value="1">Ward 1 - Lunsikui</option>
              <option value="2">Ward 2 - Station Road</option>
              <option value="4">Ward 4 - Kaliawadi</option>
              <option value="5">Ward 5 - Jalalpore</option>
              <option value="6">Ward 6 - Shantadevi</option>
              <option value="7">Ward 7 - Chhapra</option>
              <option value="8">Ward 8 - Kabilpore</option>
              <option value="9">Ward 9 - Vejalpore</option>
              <option value="10">Ward 10 - Eru Char Rasta</option>
              <option value="11">Ward 11 - Gandevi Road</option>
              <option value="12">Ward 12 - Maroli</option>
              <option value="13">Ward 13 - Aat Heritage</option>
            </select>
          </div>

          {/* 3. Complaint Status */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white focus:border-[#095c54] outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">New / Submitted</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="reopened">Reopened</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* 3. Category */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Category</label>
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white focus:border-[#095c54] outline-hidden truncate"
            >
              <option value="all">All Categories</option>
              <option value="Overflowing Dustbin">Overflowing Dustbin</option>
              <option value="Open Garbage Dumping">Open Garbage Dumping</option>
              <option value="Littering">Littering</option>
              <option value="Roadside Garbage">Roadside Garbage</option>
              <option value="Drainage">Drainage Blockage</option>
            </select>
          </div>

          {/* 4. Priority */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={e => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white focus:border-[#095c54] outline-hidden"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent / Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white focus:border-[#095c54] outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Highest Priority</option>
              <option value="overdue">Longest Overdue</option>
              <option value="most_reopened">Most Reopened</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400">Quick Filters:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'reopened', label: 'Reopened Only' },
            { id: 'overdue', label: 'Overdue SLA' },
            { id: 'with_photos', label: 'With Photos' },
            { id: 'has_feedback', label: 'With Citizen Feedback' }
          ].map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                setAdditionalFlags(tag.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                additionalFlags === tag.id
                  ? 'bg-[#095c54] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List Presentation */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
          <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 mt-2">Loading complaints catalogue...</p>
        </div>
      ) : displayedComplaints.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-sm font-extrabold text-[#0f2925]">
            {catalogueView === 'resolved' ? 'No resolved complaints found in this category' : 'No active complaints match current filters'}
          </p>
          <p className="text-xs text-slate-500">
            {catalogueView === 'resolved' ? 'Resolved complaints will appear here once verified.' : 'Try adjusting search term or clearing filter criteria.'}
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-[#095c54] text-white rounded-xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden lg:block bg-white rounded-3xl border border-[#e2e8f0] overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Complaint ID & Category</th>
                  <th className="py-3 px-4">Location / Landmark</th>
                  <th className="py-3 px-4">Priority & SLA</th>
                  <th className="py-3 px-4">Assigned Unit & Leader</th>
                  <th className="py-3 px-4">Progress Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {displayedComplaints.map(complaint => (
                  <React.Fragment key={complaint.id}>
                    <tr className="hover:bg-slate-50/80 transition group">
                    {/* ID & Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#095c54]">
                          {complaint.complaint_number}
                        </span>
                        {complaint.reopen_count > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                            Reopened ×{complaint.reopen_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-extrabold text-[#0f2925] mt-0.5 truncate max-w-xs">
                        {complaint.category_name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(complaint.submitted_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })} · By Anonymous Citizen
                      </p>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-bold text-slate-700 truncate max-w-xs">
                        {complaint.location?.landmark || complaint.location?.address}
                      </p>
                      <p className="text-[10px] text-slate-400">Ward {complaint.location?.ward_number || 3} · Navsari</p>
                    </td>

                    {/* Priority & SLA */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          complaint.priority === 'urgent'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : complaint.priority === 'high'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {complaint.priority}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{complaint.days_pending}d pending</span>
                      </p>
                    </td>

                    {/* Assigned Unit & Leader */}
                    <td className="py-3.5 px-4">
                      {complaint.temporary_team_leader_name ? (
                        <div>
                          <p className="text-xs font-extrabold text-[#095c54] flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{complaint.temporary_team_leader_name}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {complaint.assignment_id || 'Task Dispatched'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">Unassigned</span>
                      )}
                    </td>

                    {/* Progress Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                          complaint.progress_status.includes('Verified')
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : complaint.progress_status.includes('Reopened')
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : complaint.progress_status.includes('Overdue')
                            ? 'bg-red-50 text-red-800 border-red-300 animate-pulse'
                            : complaint.progress_status.includes('Evidence')
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {complaint.progress_status}
                      </span>
                    </td>

                    {/* Actions: 3 Distinct Buttons (View, Inspect, Track) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setViewingComplaintId(complaint.id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#095c54] border border-[#a7f3d0] text-xs font-extrabold transition flex items-center gap-1 shadow-2xs"
                          title="View complaint image, description, map location, and approve or reject"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setInspectingComplaintId(complaint.id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold transition flex items-center gap-1 shadow-2xs"
                          title="Open full dedicated inspection dossier with 5 tabs"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setTrackingComplaintId(prev => (prev === complaint.id ? null : complaint.id));
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            trackingComplaintId === complaint.id
                              ? 'bg-[#095c54] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Toggle live status progression steps"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </button>

                        {(complaint.status === 'resolved' || complaint.status === 'closed') && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setReopeningComplaint(complaint);
                              setReopenReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black transition flex items-center gap-1 shadow-2xs"
                            title="Reopen Problem"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                            <span>Reopen</span>
                          </button>
                        )}

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteComplaint(complaint);
                          }}
                          disabled={deletingId === complaint.id}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                          title="Delete this complaint permanently"
                        >
                          {deletingId === complaint.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline Status Progression Stepper (No Modal) */}
                  {trackingComplaintId === complaint.id && (
                    <tr className="bg-emerald-50/30 border-b border-[#e2e8f0]">
                      <td colSpan={6} className="p-4 px-6">
                        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-[#095c54]" />
                              <span className="text-xs font-black text-[#0f2925] uppercase tracking-wider">
                                Live Status Progression · {complaint.complaint_number}
                              </span>
                            </div>
                            <button
                              onClick={() => setTrackingComplaintId(null)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-lg hover:bg-slate-100"
                            >
                              ✕ Close
                            </button>
                          </div>
                          <StatusProgressionStepper
                            status={complaint.status}
                            rejectionReason={complaint.rejection_reason}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Visible on mobile/tablet) */}
          <div className="lg:hidden space-y-3">
            {displayedComplaints.map(complaint => (
              <div
                key={complaint.id}
                className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-3 hover:border-[#095c54] transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                      {complaint.complaint_number}
                    </span>
                    {complaint.reopen_count > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
                        Reopened ×{complaint.reopen_count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      complaint.priority === 'urgent'
                        ? 'bg-red-50 text-red-800'
                        : complaint.priority === 'high'
                        ? 'bg-orange-50 text-orange-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {complaint.priority}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-[#0f2925]">{complaint.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{complaint.location?.landmark || complaint.location?.address}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Progress Status:</span>
                    <span className="font-extrabold text-[#095c54]">{complaint.progress_status}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setViewingComplaintId(complaint.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#095c54] border border-[#a7f3d0] font-extrabold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setInspectingComplaintId(complaint.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Inspect</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setTrackingComplaintId(prev => (prev === complaint.id ? null : complaint.id));
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                        trackingComplaintId === complaint.id
                          ? 'bg-[#095c54] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Track</span>
                    </button>

                    {(complaint.status === 'resolved' || complaint.status === 'closed') && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setReopeningComplaint(complaint);
                          setReopenReason('');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                        <span>Reopen</span>
                      </button>
                    )}

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteComplaint(complaint);
                      }}
                      disabled={deletingId === complaint.id}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 shadow-2xs disabled:opacity-50"
                      title="Delete this complaint permanently"
                    >
                      {deletingId === complaint.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Inline Status Progression Stepper for Mobile (No Modal) */}
                {trackingComplaintId === complaint.id && (
                  <div className="p-3 bg-emerald-50/30 rounded-2xl border border-emerald-100 mt-2">
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-emerald-100">
                      <span className="text-[11px] font-black text-[#095c54] uppercase tracking-wider">
                        Live Status Progression
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setTrackingComplaintId(null);
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <StatusProgressionStepper
                      status={complaint.status}
                      rejectionReason={complaint.rejection_reason}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-white rounded-2xl border border-[#e2e8f0] flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Triage Modal */}
      {viewingComplaintId && (
        <ComplaintViewModal
          complaintId={viewingComplaintId}
          onClose={() => setViewingComplaintId(null)}
          onComplaintUpdated={fetchComplaints}
          onOpenInspect={id => {
            setViewingComplaintId(null);
            setInspectingComplaintId(id);
          }}
        />
      )}

      {/* REOPEN PROBLEM MODAL */}
      {reopeningComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0f2925]">
                    Reopen Problem
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {reopeningComplaint.complaint_number} · {reopeningComplaint.category_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReopeningComplaint(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reopenError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {reopenError}
              </div>
            )}

            <form onSubmit={handleConfirmReopen} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Reason for Reopening Problem *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="e.g. Garbage accumulated again within 24 hours, missed corner drain clearing, citizen escalated with fresh evidence..."
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 font-medium focus:bg-white focus:border-purple-600 outline-hidden transition resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Dispatch Urgency Level
                </label>
                <select
                  value={reopenUrgency}
                  onChange={e => setReopenUrgency(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden"
                >
                  <option value="urgent">Urgent Priority (Immediate Re-dispatch)</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal / Standard Priority</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 text-[11px] text-purple-900 leading-relaxed">
                <strong>Note:</strong> Reopening this complaint will immediately transition its status to <em>Reopened – New Work Required</em> and move it back into the <strong>Active Complaints</strong> queue for field crew reassignment.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReopeningComplaint(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReopen || !reopenReason.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition"
                >
                  {submittingReopen ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Reopen & Move to Active</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

