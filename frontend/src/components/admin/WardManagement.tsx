import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MapPin,
  UserCheck,
  Users,
  AlertCircle,
  CheckCircle2,
  Phone,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  X,
  Compass,
  BarChart3,
  Edit,
  History,
  Shield,
  Clock
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Ward, WardOfficerAssignmentHistory } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { TablePagination } from '../common/TablePagination.js';

interface WardManagementProps {
  lang: Language;
  onNavigateToBoundary: (wardNumber?: number) => void;
  onNavigateToAnalysis?: (wardNumber: number) => void;
}

export const WardManagement: React.FC<WardManagementProps> = ({
  lang,
  onNavigateToBoundary,
  onNavigateToAnalysis
}) => {
  const [wards, setWards] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  // Edit Ward Modal State
  const [editWardModal, setEditWardModal] = useState<any | null>(null);
  const [editWardName, setEditWardName] = useState<string>('');
  const [editWardNameGu, setEditWardNameGu] = useState<string>('');
  const [editOfficeAddress, setEditOfficeAddress] = useState<string>('');
  const [editContactPhone, setEditContactPhone] = useState<string>('');
  const [editOfficerId, setEditOfficerId] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Ward Officer History Modal State
  const [historyModalWard, setHistoryModalWard] = useState<any | null>(null);
  const [officerHistory, setOfficerHistory] = useState<WardOfficerAssignmentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchWardsAndOfficers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wardsRes, officersRes] = await Promise.all([
        api.getAdminWards(),
        api.getWardOfficers().catch(() => ({ success: false, data: [] }))
      ]);
      if (wardsRes.success && wardsRes.data) {
        setWards(wardsRes.data);
      }
      if (officersRes.success && officersRes.data) {
        setOfficers(officersRes.data.filter((o: any) => o.is_active !== false));
      }
    } catch (err: any) {
      console.error('Failed to load wards:', err);
      setError(err.message || 'Failed to fetch ward data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardsAndOfficers();
  }, []);

  const openEditModal = (ward: any) => {
    setEditWardModal(ward);
    setEditWardName(ward.ward_name || '');
    setEditWardNameGu(ward.ward_name_gu || '');
    setEditOfficeAddress(ward.office_address || '');
    setEditContactPhone(ward.contact_phone || '');
    
    // Find assigned officer id if any
    const assignedOff = (officers || []).find((o: any) => 
      Array.isArray(o.assigned_wards) && o.assigned_wards.includes(Number(ward.ward_number))
    );
    setEditOfficerId(assignedOff?.id || '');
  };

  const handleSaveWardEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWardModal) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await api.updateWard(editWardModal.id, {
        ward_name: editWardName.trim(),
        ward_name_gu: editWardNameGu.trim(),
        office_address: editOfficeAddress.trim(),
        contact_phone: editContactPhone.trim(),
        officer_id: editOfficerId ? editOfficerId : null
      });

      if (res.success) {
        setSuccessMessage(`Ward ${editWardModal.ward_number} updated successfully!`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setEditWardModal(null);
        await fetchWardsAndOfficers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update ward details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openHistoryModal = async (ward: any) => {
    setHistoryModalWard(ward);
    setLoadingHistory(true);
    setOfficerHistory([]);
    try {
      const res = await api.getWardOfficerHistory(ward.ward_number);
      if (res.success && res.data) {
        setOfficerHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch officer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredWards = wards.filter(w => {
    const query = searchQuery.toLowerCase();
    return (
      (w.ward_name || '').toLowerCase().includes(query) ||
      (w.ward_name_gu || '').toLowerCase().includes(query) ||
      String(w.ward_number).includes(query) ||
      (w.ward_officer_name || '').toLowerCase().includes(query) ||
      (w.office_address || '').toLowerCase().includes(query) ||
      (w.assigned_officers || []).some((o: any) => (o.name || '').toLowerCase().includes(query))
    );
  });

  const paginatedWards = filteredWards.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* 1. Header & Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-[10px] sm:text-xs font-black border border-teal-200">
              MUNICIPAL WARDS DIRECTORY
            </span>
            <span className="text-slate-400 text-[11px] font-bold">13 Divisions</span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-[#0f2925] tracking-tight">
            Navsari Ward Management
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by ward #, name, officer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
            />
          </div>
          <button
            onClick={fetchWardsAndOfficers}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Wards List: Compact Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && wards.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-bold">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#095c54]" />
              Loading municipal wards...
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold">
              No wards found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            paginatedWards.map(ward => (
              <div key={ward.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-[#095c54] inline-flex items-center justify-center font-black text-xs shrink-0">
                      {ward.ward_number}
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-[#0f2925] text-xs truncate">{ward.ward_name}</div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {ward.ward_officer_name || 'Unassigned'} · {ward.contact_phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-0.5 font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200 shrink-0">
                    {ward.cleanliness_score !== undefined ? Number(ward.cleanliness_score).toFixed(1) : '100.0'}%
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className={`px-2 py-0.5 rounded-full ${ward.active_complaints_count > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {ward.active_complaints_count} Active
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {ward.total_workers_count ?? 0} Workers
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => openEditModal(ward)}
                      className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#095c54] border border-teal-200 font-bold text-[10px] flex items-center gap-1"
                      title="Edit Ward Details & Officer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => openHistoryModal(ward)}
                      className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] flex items-center gap-1"
                      title="View Officer Assignment History"
                    >
                      <History className="w-3 h-3" />
                      <span>History</span>
                    </button>
                    {onNavigateToAnalysis && (
                      <button
                        onClick={() => onNavigateToAnalysis(ward.ward_number)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#095c54] border border-emerald-200 font-bold text-[10px] flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>Analyze</span>
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateToBoundary(ward.ward_number)}
                      className="px-2 py-1 rounded-lg bg-[#095c54] text-white font-bold text-[10px] flex items-center gap-1"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Boundary</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ward #</th>
                <th className="py-3.5 px-4">Ward Name & Area</th>
                <th className="py-3.5 px-4">Administrative Office</th>
                <th className="py-3.5 px-4">Ward Officer</th>
                <th className="py-3.5 px-4 text-center">Active Complaints</th>
                <th className="py-3.5 px-4 text-center">Workers</th>
                <th className="py-3.5 px-4 text-center">Cleanliness Score</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && wards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#095c54]" />
                    Loading municipal wards from database...
                  </td>
                </tr>
              ) : filteredWards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    No wards found matching &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                paginatedWards.map(ward => (
                  <tr key={ward.id} className="hover:bg-slate-50/80 transition group">
                    {/* Ward # */}
                    <td className="py-3.5 px-4 font-black text-[#0f2925]">
                      <span className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-[#095c54] inline-flex items-center justify-center font-black text-xs">
                        {ward.ward_number}
                      </span>
                    </td>

                    {/* Ward Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-[#0f2925] text-sm">{ward.ward_name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{ward.ward_name_gu}</div>
                    </td>

                    {/* Office Address */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-600 font-medium text-xs truncate flex items-center gap-1.5" title={ward.office_address}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{ward.office_address}</span>
                      </div>
                    </td>

                    {/* Officer & Phone */}
                    <td className="py-3.5 px-4">
                      {Array.isArray(ward.assigned_officers) && ward.assigned_officers.length > 0 ? (
                        <div className="space-y-1">
                          {ward.assigned_officers.map((off: any, idx: number) => (
                            <div key={off.id || idx}>
                              <div className="font-bold text-[#0f2925]">{off.name}</div>
                              <div className="text-[11px] text-[#095c54] font-bold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#095c54]" />
                                <span>{off.phone || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className={`font-bold ${ward.ward_officer_name ? 'text-[#0f2925]' : 'text-slate-400 italic'}`}>
                            {ward.ward_officer_name || 'Unassigned'}
                          </div>
                          {ward.contact_phone && (
                            <div className="text-[11px] text-[#095c54] font-bold flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-[#095c54]" />
                              <span>{ward.contact_phone}</span>
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Active Complaints */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black ${
                          ward.active_complaints_count > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {ward.active_complaints_count} Active
                      </span>
                    </td>

                    {/* Workers */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full text-[11px]">
                        <Users className="w-3 h-3 text-slate-500" />
                        {ward.total_workers_count ?? 0}
                      </span>
                    </td>

                    {/* Cleanliness Score */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {ward.cleanliness_score !== undefined ? Number(ward.cleanliness_score).toFixed(1) : '100.0'}%
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => openEditModal(ward)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#095c54] border border-teal-200 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                          title="Edit Ward Details and Replace Ward Officer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => openHistoryModal(ward)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                          title="View Officer Assignment History"
                        >
                          <History className="w-3 h-3" />
                          <span>History</span>
                        </button>
                        {onNavigateToAnalysis && (
                          <button
                            onClick={() => onNavigateToAnalysis(ward.ward_number)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#095c54] border border-emerald-200 font-bold text-[11px] transition flex items-center gap-1"
                            title="Open Deep Ward Analysis"
                          >
                            <BarChart3 className="w-3 h-3" />
                            <span>Analyze</span>
                          </button>
                        )}
                        <button
                          onClick={() => onNavigateToBoundary(ward.ward_number)}
                          className="px-2.5 py-1 rounded-lg bg-[#095c54] hover:bg-[#074741] text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                          title="View / Edit Boundary Polygon"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Boundary</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredWards.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="wards"
        />
      </div>

      {/* 4. Edit Ward Modal */}
      {editWardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditWardModal(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center font-black text-base shadow-2xs">
                {editWardModal.ward_number}
              </span>
              <div>
                <h3 className="text-base font-black text-[#0f2925]">Edit Ward {editWardModal.ward_number} Details</h3>
                <p className="text-xs text-slate-500 font-medium">Update municipal ward name, office address, and assign/replace Ward Officer.</p>
              </div>
            </div>

            <form onSubmit={handleSaveWardEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ward Name (English) *</label>
                <input
                  type="text"
                  required
                  value={editWardName}
                  onChange={e => setEditWardName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ward Name (Gujarati) *</label>
                <input
                  type="text"
                  required
                  value={editWardNameGu}
                  onChange={e => setEditWardNameGu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ward Office Address</label>
                <textarea
                  rows={2}
                  value={editOfficeAddress}
                  onChange={e => setEditOfficeAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency / Contact Phone</label>
                <input
                  type="text"
                  value={editContactPhone}
                  onChange={e => setEditContactPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              {/* Assign / Replace Ward Officer */}
              <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-2">
                <label className="block text-xs font-black text-[#095c54]">
                  Assign or Replace Ward Officer
                </label>
                <select
                  value={editOfficerId}
                  onChange={e => setEditOfficerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#095c54]"
                >
                  <option value="">-- No Officer (Mark as Unassigned) --</option>
                  {officers.map((off: any) => {
                    const isCur = Array.isArray(off.assigned_wards) && off.assigned_wards.includes(Number(editWardModal.ward_number));
                    const assignedWardsText = Array.isArray(off.assigned_wards) && off.assigned_wards.length > 0
                      ? `(Wards: ${off.assigned_wards.join(', ')})`
                      : '(No wards currently)';
                    return (
                      <option key={off.id} value={off.id}>
                        {off.full_name} · {off.designation || 'Ward Officer'} · {off.phone} {isCur ? '★ [Currently Assigned]' : assignedWardsText}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-teal-800 font-medium leading-relaxed">
                  Assigning a new officer automatically relieves previous officers and records a permanent timestamped log in the Officer Assignment History table.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditWardModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Ward Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Ward Officer Assignment History Modal */}
      {historyModalWard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setHistoryModalWard(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-base shadow-2xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0f2925]">
                  Officer Assignment History — Ward {historyModalWard.ward_number}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {historyModalWard.ward_name} ({historyModalWard.ward_name_gu})
                </p>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading officer assignment timeline...
              </div>
            ) : officerHistory.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-200">
                No past officer reassignment history recorded for Ward {historyModalWard.ward_number}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Officer Name</th>
                      <th className="py-2.5 px-3">Designation / Phone</th>
                      <th className="py-2.5 px-3">Assigned Date</th>
                      <th className="py-2.5 px-3">Relieved Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {officerHistory.map((h, idx) => (
                      <tr key={h.id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-black text-[#0f2925]">
                          {h.officer_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{h.designation || 'Ward Officer'}</div>
                          <div className="text-[10px] text-teal-700 font-bold">{h.officer_phone || 'N/A'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {h.assigned_at ? new Date(h.assigned_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          }) : 'Initial Deployment'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {h.relieved_at ? (
                            new Date(h.relieved_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })
                          ) : (
                            <span className="text-emerald-700 font-bold">Present (In Office)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            h.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {h.status === 'active' ? 'Active' : 'Relieved'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setHistoryModalWard(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Ward Details Modal */}
      {selectedWard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedWard(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center font-black text-base shadow-2xs">
                {selectedWard.ward_number}
              </span>
              <div>
                <h3 className="text-base font-black text-[#0f2925]">{selectedWard.ward_name}</h3>
                <p className="text-xs text-slate-500 font-bold">{selectedWard.ward_name_gu}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Administrative Office:</span>
                <span className="font-black text-[#0f2925] text-right">{selectedWard.office_address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Ward Officer In-charge:</span>
                <span className="font-black text-[#0f2925]">{selectedWard.ward_officer_name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Emergency Contact:</span>
                <span className="font-black text-[#095c54]">{selectedWard.contact_phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Field Sanitation Workers:</span>
                <span className="font-black text-[#0f2925]">{selectedWard.total_workers_count || 4} Personnel</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Active Grievances:</span>
                <span className="font-black text-amber-700">{selectedWard.active_complaints_count || 0} Open</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Cleanliness Performance:</span>
                <span className="font-black text-emerald-700">
                  {selectedWard.cleanliness_score !== undefined ? Number(selectedWard.cleanliness_score).toFixed(1) : '100.0'}%
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-500">Boundary Geofence:</span>
                <span className="font-black text-slate-700">
                  {selectedWard.boundary_coordinates?.length || 0} polygon coordinates defined
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 flex-wrap">
              <button
                onClick={() => {
                  const w = selectedWard;
                  setSelectedWard(null);
                  openHistoryModal(w);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>Assignment History</span>
              </button>
              <button
                onClick={() => {
                  const w = selectedWard;
                  setSelectedWard(null);
                  openEditModal(w);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c54] font-bold text-xs transition flex items-center gap-1.5 border border-teal-200"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Ward Details</span>
              </button>
              <button
                onClick={() => {
                  const num = selectedWard.ward_number;
                  setSelectedWard(null);
                  onNavigateToBoundary(num);
                }}
                className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Boundary</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
