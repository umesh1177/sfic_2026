import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Edit,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Mail,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardOfficerRecord } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

interface WardOfficerManagementProps {
  lang: Language;
}

const WARD_OFFICER_NAV_TABS: Array<{ id: string; label: string; group: string }> = [
  { id: 'overview', label: '1. Ward Overview', group: 'Core' },
  { id: 'complaints', label: '2. Complaint Catalogue', group: 'Operations' },
  { id: 'hotspots', label: '3. Hotspots Map', group: 'Operations' },
  { id: 'workers', label: '4. Worker Management', group: 'Workforce' },
  { id: 'teams', label: '5. Team Management', group: 'Workforce' },
  { id: 'activities', label: '6. Organization Drives', group: 'Community' },
  { id: 'approvals', label: '7. Approval Management', group: 'Community' },
  { id: 'posts', label: '8. Community & Citizen Posts', group: 'Community' },
  { id: 'community_problems', label: '9. Add Problem for Community', group: 'Community' },
  { id: 'ai_analytics', label: '10. AI Analytics', group: 'Insights' },
  { id: 'notifications', label: '11. Notifications', group: 'Account' },
  { id: 'settings', label: '12. Settings', group: 'Account' }
];

const ALL_TAB_IDS = WARD_OFFICER_NAV_TABS.map(t => t.id);

export const WardOfficerManagement: React.FC<WardOfficerManagementProps> = ({ lang }) => {
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [selectedOfficer, setSelectedOfficer] = useState<any | null>(null);

  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);

  // Form states for update
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editDesignation, setEditDesignation] = useState<string>('');
  const [editAssignedWards, setEditAssignedWards] = useState<number[]>([]);
  const [editAllowedTabs, setEditAllowedTabs] = useState<string[]>([...ALL_TAB_IDS]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>('');
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Form states for add new
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [newDesignation, setNewDesignation] = useState<string>('Ward Officer');
  const [newAssignedWards, setNewAssignedWards] = useState<number[]>([1]);
  const [newAllowedTabs, setNewAllowedTabs] = useState<string[]>([...ALL_TAB_IDS]);
  const [savingNew, setSavingNew] = useState<boolean>(false);

  const fetchOfficers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWardOfficers();
      if (res.success && res.data) {
        setOfficers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load ward officers:', err);
      setError(err.message || 'Failed to fetch officers from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  // Filter & Pagination
  const filteredOfficers = officers.filter(o => {
    const q = searchQuery.toLowerCase();
    return (
      o.full_name?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.email?.toLowerCase().includes(q) ||
      o.assigned_wards?.some((w: number) => String(w).includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOfficers.length / pageSize));
  const paginatedOfficers = filteredOfficers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenEdit = (officer: any) => {
    setSelectedOfficer(officer);
    setEditName(officer.full_name || '');
    setEditPhone(officer.phone || '');
    setEditEmail(officer.email || '');
    setEditDesignation(officer.designation || 'Ward Officer');
    setEditAssignedWards(officer.assigned_wards || [1]);
    setEditAllowedTabs(
      Array.isArray(officer.allowed_tabs) && officer.allowed_tabs.length > 0
        ? officer.allowed_tabs
        : [...ALL_TAB_IDS]
    );
    setEditIsActive(officer.is_active !== false);
    setEditPassword('');
    setShowEditPassword(false);
    setEditModalOpen(true);
  };

  const toggleTabSelection = (
    tabId: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => {
      if (prev.includes(tabId)) {
        if (prev.length === 1) return prev; // Keep at least 1 tab selected
        return prev.filter(t => t !== tabId);
      }
      return [...prev, tabId];
    });
  };

  const handleToggleWardInEdit = (wardNum: number) => {
    setEditAssignedWards(prev => {
      if (prev.includes(wardNum)) {
        if (prev.length === 1) return prev; // At least one ward
        return prev.filter(w => w !== wardNum);
      } else {
        return [...prev, wardNum].sort((a, b) => a - b);
      }
    });
  };

  const handleToggleWardInNew = (wardNum: number) => {
    setNewAssignedWards(prev => {
      if (prev.includes(wardNum)) {
        if (prev.length === 1) return prev;
        return prev.filter(w => w !== wardNum);
      } else {
        return [...prev, wardNum].sort((a, b) => a - b);
      }
    });
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficer) return;
    setSavingEdit(true);
    setError(null);

    try {
      const payload: any = {
        full_name: editName,
        phone: editPhone,
        email: editEmail,
        designation: editDesignation,
        assigned_wards: editAssignedWards,
        allowed_tabs: editAllowedTabs,
        is_active: editIsActive
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await api.updateWardOfficer(selectedOfficer.id, payload);
      if (res.success) {
        setSuccessMessage(`Ward Officer ${editName} updated successfully.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setEditModalOpen(false);
        fetchOfficers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update officer.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newPassword) {
      setError('Please fill in Name, Phone, and Password.');
      return;
    }
    setSavingNew(true);
    setError(null);

    try {
      const payload = {
        full_name: newName,
        phone: newPhone,
        email: newEmail,
        password: newPassword,
        designation: newDesignation,
        assigned_wards: newAssignedWards,
        allowed_tabs: newAllowedTabs
      };

      const res = await api.createWardOfficer(payload);
      if (res.success) {
        setSuccessMessage(`Officer ${newName} created successfully. They can now login with ${newPhone}.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setAddModalOpen(false);
        // Reset fields
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewPassword('');
        setNewAssignedWards([1]);
        setNewAllowedTabs([...ALL_TAB_IDS]);
        fetchOfficers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create officer.');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Add Officer button */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-xs font-black border border-teal-200">
              OFFICER DIRECTORY & MULTI-WARD ALLOCATION
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
            Ward Officer Management
          </h2>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search officer or ward..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
            />
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Officer</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
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

      {/* 2. Officers Table with Pagination */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Officer Name</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Assigned Wards</th>
                <th className="py-3.5 px-4 text-center">Cleanliness Score</th>
                <th className="py-3.5 px-4 text-center">SLA Status</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && officers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#095c54]" />
                    Loading ward officers...
                  </td>
                </tr>
              ) : paginatedOfficers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    No ward officers found matching your query.
                  </td>
                </tr>
              ) : (
                paginatedOfficers.map(officer => (
                  <tr key={officer.id} className="hover:bg-slate-50/80 transition">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#095c54] text-white flex items-center justify-center font-black text-xs shrink-0">
                          {officer.full_name?.slice(0, 2).toUpperCase() || 'WO'}
                        </div>
                        <div>
                          <div className="font-black text-[#0f2925] text-sm">{officer.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{officer.designation}</div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-bold text-[#095c54]">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{officer.phone}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-[160px]">
                      <div className="flex items-center gap-1.5" title={officer.email}>
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{officer.email || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Assigned Wards (Multi-ward chips) & Dashboard Tab Access */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                        {officer.assigned_wards?.map((wNum: number) => (
                          <span
                            key={wNum}
                            className="px-2 py-0.5 rounded-md bg-teal-50 text-[#095c54] font-black text-[11px] border border-teal-200"
                          >
                            Ward {wNum}
                          </span>
                        ))}
                      </div>
                      {(() => {
                        const tabs: string[] =
                          Array.isArray(officer.allowed_tabs) && officer.allowed_tabs.length > 0
                            ? officer.allowed_tabs
                            : ALL_TAB_IDS;
                        const isFull = tabs.length >= ALL_TAB_IDS.length;
                        return (
                          <div className="mt-1.5">
                            <span
                              title={tabs.map(id => WARD_OFFICER_NAV_TABS.find(t => t.id === id)?.label || id).join(', ')}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isFull
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {isFull ? 'Full Access (All 12 Tabs)' : `Custom Access (${tabs.length}/${ALL_TAB_IDS.length} Tabs)`}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Cleanliness Score */}
                    <td className="py-3.5 px-4 text-center font-black text-emerald-700">
                      {officer.cleanliness_score || 90.0}%
                    </td>

                    {/* SLA Status */}
                    <td className="py-3.5 px-4 text-center">
                      {officer.flagged ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-[10px] border border-red-300"
                          title={officer.flagged_reasons?.join('\n') || 'SLA Overdue'}
                        >
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          <span>Flagged ({officer.flagged_count || 1})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Compliant</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          officer.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {officer.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(officer)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-[#095c54] hover:text-white rounded-xl text-slate-700 font-bold text-xs transition flex items-center gap-1.5 ml-auto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Update / Allocate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Proper Pagination Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-800">{filteredOfficers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(currentPage * pageSize, filteredOfficers.length)}</strong> of{' '}
            <strong className="text-slate-800">{filteredOfficers.length}</strong> officers
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-black transition ${
                  currentPage === page
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Edit / Update Modal with Multi-Ward Allocation */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-[#0f2925] mb-1">
              Update Ward Officer & Allocate Wards
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Reassign or allocate multiple wards to {selectedOfficer?.full_name}.
            </p>

            <form onSubmit={handleSaveUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Login)</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={e => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              {/* Multi-Ward Allocation Checkbox Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-[#0f2925]">
                    Allocate Wards (Multi-Ward Assignment)
                  </label>
                  <span className="text-[11px] font-bold text-[#095c54]">
                    {editAssignedWards.length} Ward{editAssignedWards.length > 1 ? 's' : ''} Selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mb-2">
                  Select one or multiple wards under this officer&apos;s administrative purview:
                </p>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(wNum => {
                    const isChecked = editAssignedWards.includes(wNum);
                    return (
                      <button
                        type="button"
                        key={wNum}
                        onClick={() => handleToggleWardInEdit(wNum)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black transition border text-center ${
                          isChecked
                            ? 'bg-[#095c54] text-white border-[#095c54] shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        Ward {wNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Main Navigation Tabs Access Control */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-[#0f2925] block">
                      Dashboard Main Navigation Tabs Access
                    </label>
                    <span className="text-[11px] font-bold text-[#095c54]">
                      {editAllowedTabs.length === ALL_TAB_IDS.length
                        ? 'Full Access (All 12 Tabs Enabled)'
                        : `${editAllowedTabs.length} of ${ALL_TAB_IDS.length} Tabs Enabled`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditAllowedTabs([...ALL_TAB_IDS])}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition border ${
                      editAllowedTabs.length === ALL_TAB_IDS.length
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    Give Full Access
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {WARD_OFFICER_NAV_TABS.map(tab => {
                    const checked = editAllowedTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${
                          checked
                            ? 'bg-white border-[#095c54] text-[#0f2925] shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTabSelection(tab.id, setEditAllowedTabs)}
                          className="rounded text-[#095c54] focus:ring-[#095c54]"
                        />
                        <span className="truncate">{tab.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Password update field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change Login Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep existing password"
                    className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="officerActive"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="rounded text-[#095c54] focus:ring-[#095c54]"
                />
                <label htmlFor="officerActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Officer account is active and authorized to log in
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add New Ward Officer Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-[#0f2925] mb-1">
              Add New Ward Officer
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Register a new administrative ward officer with login credentials and ward allocations.
            </p>

            <form onSubmit={handleSaveNew} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (Username) *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+919825130005"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="officer@navsarimunicipal.gov.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              {/* Password field as requested */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter password (min 6 chars)"
                    className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The officer will use this mobile number & password to login immediately.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={e => setNewDesignation(e.target.value)}
                  placeholder="Ward Officer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              {/* Multi-Ward Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-[#0f2925]">
                    Allocate Wards (Multi-Ward Allocation)
                  </label>
                  <span className="text-[11px] font-bold text-[#095c54]">
                    {newAssignedWards.length} Ward{newAssignedWards.length > 1 ? 's' : ''} Selected
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(wNum => {
                    const isChecked = newAssignedWards.includes(wNum);
                    return (
                      <button
                        type="button"
                        key={wNum}
                        onClick={() => handleToggleWardInNew(wNum)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black transition border text-center ${
                          isChecked
                            ? 'bg-[#095c54] text-white border-[#095c54] shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        Ward {wNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Main Navigation Tabs Access Control */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-[#0f2925] block">
                      Dashboard Main Navigation Tabs Access
                    </label>
                    <span className="text-[11px] font-bold text-[#095c54]">
                      {newAllowedTabs.length === ALL_TAB_IDS.length
                        ? 'Full Access (All 12 Tabs Enabled)'
                        : `${newAllowedTabs.length} of ${ALL_TAB_IDS.length} Tabs Enabled`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewAllowedTabs([...ALL_TAB_IDS])}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition border ${
                      newAllowedTabs.length === ALL_TAB_IDS.length
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    Give Full Access
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {WARD_OFFICER_NAV_TABS.map(tab => {
                    const checked = newAllowedTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${
                          checked
                            ? 'bg-white border-[#095c54] text-[#0f2925] shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTabSelection(tab.id, setNewAllowedTabs)}
                          className="rounded text-[#095c54] focus:ring-[#095c54]"
                        />
                        <span className="truncate">{tab.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {savingNew ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Create Officer Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

