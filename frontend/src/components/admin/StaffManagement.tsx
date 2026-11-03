import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Search,
  Plus,
  Trash2,
  Edit,
  Phone,
  Mail,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  Languages
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Language } from '../../i18n/translations.js';

interface StaffManagementProps {
  lang: Language;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ lang }) => {
  const [activeSubTab, setActiveSubTab] = useState<'workers' | 'officers'>('workers');

  // Workers state
  const [workers, setWorkers] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [workerPage, setWorkerPage] = useState<number>(1);
  const [officerPage, setOfficerPage] = useState<number>(1);
  const pageSize = 6;

  // Add Worker Modal
  const [addWorkerOpen, setAddWorkerOpen] = useState<boolean>(false);
  const [wName, setWName] = useState<string>('');
  const [wPhone, setWPhone] = useState<string>('');
  const [wPassword, setWPassword] = useState<string>('');
  const [showWPassword, setShowWPassword] = useState<boolean>(false);
  const [wWard, setWWard] = useState<number>(3);
  const [wDesignation, setWDesignation] = useState<string>('Sanitation Worker');
  const [wLang, setWLang] = useState<string>('gu');
  const [savingWorker, setSavingWorker] = useState<boolean>(false);

  // Add Officer Modal
  const [addOfficerOpen, setAddOfficerOpen] = useState<boolean>(false);
  const [oName, setOName] = useState<string>('');
  const [oPhone, setOPhone] = useState<string>('');
  const [oEmail, setOEmail] = useState<string>('');
  const [oPassword, setOPassword] = useState<string>('');
  const [showOPassword, setShowOPassword] = useState<boolean>(false);
  const [oDesignation, setODesignation] = useState<string>('Ward Officer');
  const [oWards, setOWards] = useState<number[]>([1]);
  const [savingOfficer, setSavingOfficer] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, oRes] = await Promise.all([
        api.getAdminWorkers().catch(() => ({ success: false, data: [] })),
        api.getWardOfficers().catch(() => ({ success: false, data: [] }))
      ]);
      if (wRes.success && wRes.data) setWorkers(wRes.data);
      if (oRes.success && oRes.data) setOfficers(oRes.data);
    } catch (err: any) {
      console.error('Failed to load staff data:', err);
      setError(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredWorkers = workers.filter(w => {
    const q = searchQuery.toLowerCase();
    return (
      w.full_name?.toLowerCase().includes(q) ||
      w.phone?.includes(q) ||
      w.designation?.toLowerCase().includes(q) ||
      String(w.ward_number).includes(q)
    );
  });

  const filteredOfficers = officers.filter(o => {
    const q = searchQuery.toLowerCase();
    return (
      o.full_name?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.assigned_wards?.some((w: number) => String(w).includes(q))
    );
  });

  const totalWorkerPages = Math.max(1, Math.ceil(filteredWorkers.length / pageSize));
  const paginatedWorkers = filteredWorkers.slice((workerPage - 1) * pageSize, workerPage * pageSize);

  const totalOfficerPages = Math.max(1, Math.ceil(filteredOfficers.length / pageSize));
  const paginatedOfficers = filteredOfficers.slice((officerPage - 1) * pageSize, officerPage * pageSize);

  // Submit Add Worker
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName || !wPhone || !wPassword) {
      setError('Please provide Name, Phone, and Password.');
      return;
    }
    setSavingWorker(true);
    setError(null);

    try {
      const res = await api.createAdminWorker({
        full_name: wName,
        phone: wPhone,
        password: wPassword,
        ward_number: Number(wWard),
        designation: wDesignation,
        preferred_language: wLang
      });

      if (res.success) {
        setSuccessMessage(`Worker "${wName}" registered successfully! Login credentials generated.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setAddWorkerOpen(false);
        setWName('');
        setWPhone('');
        setWPassword('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add worker');
    } finally {
      setSavingWorker(false);
    }
  };

  // Submit Add Officer
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oName || !oPhone || !oPassword) {
      setError('Please provide Name, Phone, and Password.');
      return;
    }
    setSavingOfficer(true);
    setError(null);

    try {
      const res = await api.createWardOfficer({
        full_name: oName,
        phone: oPhone,
        email: oEmail,
        password: oPassword,
        designation: oDesignation,
        assigned_wards: oWards
      });

      if (res.success) {
        setSuccessMessage(`Ward Officer "${oName}" created successfully! Login active.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setAddOfficerOpen(false);
        setOName('');
        setOPhone('');
        setOEmail('');
        setOPassword('');
        setOWards([1]);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add officer');
    } finally {
      setSavingOfficer(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate worker "${name}"?`)) return;
    try {
      const res = await api.deleteAdminWorker(workerId);
      if (res.success) {
        setSuccessMessage(`Worker "${name}" deactivated.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate worker');
    }
  };

  const handleToggleWardInOfficer = (wNum: number) => {
    setOWards(prev => {
      if (prev.includes(wNum)) {
        if (prev.length === 1) return prev;
        return prev.filter(w => w !== wNum);
      } else {
        return [...prev, wNum].sort((a, b) => a - b);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-xs font-black border border-teal-200">
              NMC WORKFORCE REGISTRATION & AUTH
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
            Municipal Worker & Officer Management
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Register new personnel with username and password login credentials, assign wards, and manage field staff.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setWorkerPage(1);
                setOfficerPage(1);
              }}
              placeholder="Search staff..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
            />
          </div>

          {activeSubTab === 'workers' ? (
            <button
              onClick={() => setAddWorkerOpen(true)}
              className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Worker</span>
            </button>
          ) : (
            <button
              onClick={() => setAddOfficerOpen(true)}
              className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Officer</span>
            </button>
          )}
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

      {/* 2. Sub-Tabs Toggle: Field Workers vs Ward Officers */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('workers')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeSubTab === 'workers'
              ? 'bg-[#095c54] text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Sanitation Field Workers ({workers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('officers')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeSubTab === 'officers'
              ? 'bg-[#095c54] text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Ward Officers ({officers.length})</span>
        </button>
      </div>

      {/* 3A. Workers Table View */}
      {activeSubTab === 'workers' && (
        <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Worker Code</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Contact Phone (Login)</th>
                  <th className="py-3.5 px-4">Assigned Ward</th>
                  <th className="py-3.5 px-4 text-center">Language</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading && workers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#095c54]" />
                      Loading sanitation personnel...
                    </td>
                  </tr>
                ) : paginatedWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      No sanitation workers found matching your query.
                    </td>
                  </tr>
                ) : (
                  paginatedWorkers.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-black text-[#0f2925]">
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {w.worker_code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-[#0f2925]">
                        {w.full_name}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-semibold">
                        {w.designation}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#095c54]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{w.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#095c54] font-black text-[11px] border border-teal-200">
                          Ward {w.ward_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center uppercase font-bold text-slate-500 text-[11px]">
                        {w.preferred_language || 'gu'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            w.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {w.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteWorker(w.id, w.full_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Deactivate Worker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-semibold">
              Showing <strong className="text-slate-800">{filteredWorkers.length === 0 ? 0 : (workerPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800">{Math.min(workerPage * pageSize, filteredWorkers.length)}</strong> of{' '}
              <strong className="text-slate-800">{filteredWorkers.length}</strong> workers
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setWorkerPage(p => Math.max(1, p - 1))}
                disabled={workerPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalWorkerPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setWorkerPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition ${
                    workerPage === page
                      ? 'bg-[#095c54] text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setWorkerPage(p => Math.min(totalWorkerPages, p + 1))}
                disabled={workerPage === totalWorkerPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3B. Officers Table View */}
      {activeSubTab === 'officers' && (
        <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Officer Name</th>
                  <th className="py-3.5 px-4">Contact Phone (Login)</th>
                  <th className="py-3.5 px-4">Official Email</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Assigned Wards</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedOfficers.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-black text-[#0f2925]">
                      {o.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#095c54]">
                      {o.phone}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-[160px]">
                      {o.email || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {o.designation}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {o.assigned_wards?.map((wNum: number) => (
                          <span
                            key={wNum}
                            className="px-2 py-0.5 rounded-md bg-teal-50 text-[#095c54] font-black text-[11px] border border-teal-200"
                          >
                            Ward {wNum}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          o.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {o.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Officers Pagination */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-semibold">
              Showing <strong className="text-slate-800">{filteredOfficers.length === 0 ? 0 : (officerPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800">{Math.min(officerPage * pageSize, filteredOfficers.length)}</strong> of{' '}
              <strong className="text-slate-800">{filteredOfficers.length}</strong> officers
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setOfficerPage(p => Math.max(1, p - 1))}
                disabled={officerPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalOfficerPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setOfficerPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition ${
                    officerPage === page
                      ? 'bg-[#095c54] text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setOfficerPage(p => Math.min(totalOfficerPages, p + 1))}
                disabled={officerPage === totalOfficerPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Worker Modal with Password Field */}
      {addWorkerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddWorkerOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-[#0f2925] mb-1">
              Add New Sanitation Worker
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Enter worker profile and set password so they can log into the Worker Portal.
            </p>

            <form onSubmit={handleCreateWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={wName}
                  onChange={e => setWName(e.target.value)}
                  placeholder="e.g. Mukesh Solanki"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile (Username) *</label>
                  <input
                    type="text"
                    required
                    value={wPhone}
                    onChange={e => setWPhone(e.target.value)}
                    placeholder="+919825120003"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>

                {/* Password field as explicitly requested by user */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showWPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={wPassword}
                      onChange={e => setWPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWPassword(!showWPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showWPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Ward *</label>
                  <select
                    value={wWard}
                    onChange={e => setWWard(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  >
                    {Array.from({ length: 13 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>Ward {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <select
                    value={wDesignation}
                    onChange={e => setWDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  >
                    <option value="Sanitation Worker">Sanitation Worker</option>
                    <option value="Sanitation Team Leader">Sanitation Team Leader</option>
                    <option value="Drainage Specialist">Drainage Specialist</option>
                    <option value="Waste Vehicle Driver">Waste Vehicle Driver</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Language</label>
                <div className="flex gap-3">
                  {[
                    { id: 'gu', label: 'ગુજરાતી (Gujarati)' },
                    { id: 'en', label: 'English' },
                    { id: 'hi', label: 'हिन्दी (Hindi)' }
                  ].map(item => (
                    <label key={item.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="wlang"
                        value={item.id}
                        checked={wLang === item.id}
                        onChange={() => setWLang(item.id)}
                        className="text-[#095c54] focus:ring-[#095c54]"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddWorkerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWorker}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {savingWorker ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Register Worker Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Officer Modal */}
      {addOfficerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAddOfficerOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-[#0f2925] mb-1">
              Add New Ward Officer
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Create an administrative officer profile and password for logging into the Ward Officer Dashboard.
            </p>

            <form onSubmit={handleCreateOfficer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={oName}
                  onChange={e => setOName(e.target.value)}
                  placeholder="e.g. Nilesh Parekh"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile (Username) *</label>
                  <input
                    type="text"
                    required
                    value={oPhone}
                    onChange={e => setOPhone(e.target.value)}
                    placeholder="+919825130006"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showOPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={oPassword}
                      onChange={e => setOPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOPassword(!showOPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showOPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={oEmail}
                    onChange={e => setOEmail(e.target.value)}
                    placeholder="officer@navsarimunicipal.gov.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={oDesignation}
                    onChange={e => setODesignation(e.target.value)}
                    placeholder="Ward Officer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              {/* Multi-ward selection */}
              <div>
                <label className="block text-xs font-black text-[#0f2925] mb-1.5">
                  Allocate Wards (Multi-Ward Allocation)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(wNum => {
                    const isChecked = oWards.includes(wNum);
                    return (
                      <button
                        type="button"
                        key={wNum}
                        onClick={() => handleToggleWardInOfficer(wNum)}
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddOfficerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOfficer}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {savingOfficer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
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
