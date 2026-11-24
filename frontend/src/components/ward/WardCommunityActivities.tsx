import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Plus,
  Building,
  Award,
  Camera,
  UserCheck,
  UserX,
  Upload,
  FileCheck2,
  X,
  AlertCircle,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Search,
  ShieldCheck,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api.js';
import { DriveInspectView } from './DriveInspectView.js';
import { TablePagination } from '../common/TablePagination.js';

interface WardCommunityActivitiesProps {
  wardNumber?: number;
}

export const WardCommunityActivities: React.FC<WardCommunityActivitiesProps> = ({ wardNumber }) => {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'completed' | 'organizations'>('active');
  const [orgPage, setOrgPage] = useState<number>(1);
  const orgPageSize = 6;
  const [drives, setDrives] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgSearch, setOrgSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingOrgs, setLoadingOrgs] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [inspectingActivity, setInspectingActivity] = useState<any | null>(null);

  // View / Edit Organization Modals
  const [viewingOrg, setViewingOrg] = useState<any | null>(null);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [editOrgForm, setEditOrgForm] = useState({
    community_name: '',
    organisation_type: 'Resident Welfare Association',
    head_name: '',
    phone: '',
    email: '',
    locality: '',
    address: ''
  });
  const [savingOrgEdit, setSavingOrgEdit] = useState<boolean>(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);

  // Add Community / Organization Modal State (Single + Bulk Excel Upload)
  const [showAddCommunityModal, setShowAddCommunityModal] = useState<boolean>(false);
  const [addCommunityTab, setAddCommunityTab] = useState<'single' | 'bulk'>('single');
  const [communityName, setCommunityName] = useState<string>('');
  const [headName, setHeadName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('Head@123');
  const [organisationType, setOrganisationType] = useState<string>('Resident Welfare Association');
  const [address, setAddress] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [docUrl, setDocUrl] = useState<string>('');
  const [docName, setDocName] = useState<string>('');
  const [submittingCommunity, setSubmittingCommunity] = useState<boolean>(false);
  const [communityError, setCommunityError] = useState<string>('');

  // Bulk Excel Upload State
  interface BulkCommunityRow {
    excelRow: number;
    community_name: string;
    organisation_type: string;
    head_name: string;
    phone: string;
    email: string;
    username: string;
    password: string;
    locality: string;
    address: string;
    description: string;
    validationError?: string;
  }
  const [bulkFileName, setBulkFileName] = useState<string>('');
  const [bulkRows, setBulkRows] = useState<BulkCommunityRow[]>([]);
  const [bulkUploading, setBulkUploading] = useState<boolean>(false);
  const [bulkResult, setBulkResult] = useState<{
    created_count: number;
    failed_count: number;
    errors: Array<{ row: number; community_name: string; error: string }>;
  } | null>(null);

  const BULK_EXCEL_HEADERS = [
    'Organization Name',
    'Organization Type',
    'Community Head Name',
    'Mobile Number',
    'Email',
    'Login Username',
    'Password',
    'Locality',
    'Address',
    'Description'
  ];

  const handleDownloadCommunityExcelFormat = () => {
    // Only column headers — no dummy rows — so Ward Officer knows exact fields to fill
    const worksheet = XLSX.utils.aoa_to_sheet([BULK_EXCEL_HEADERS]);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 24 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 30 },
      { wch: 32 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Communities');
    XLSX.writeFile(workbook, `Ward_${wardNumber || 3}_Community_Bulk_Format.xlsx`);
  };

  const normalizeHeaderKey = (k: string) =>
    String(k || '')
      .toLowerCase()
      .replace(/[*()\-_/\s]+/g, '');

  const handleBulkExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommunityError('');
    setBulkResult(null);
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setCommunityError('The uploaded Excel file does not contain any worksheet.');
          setBulkRows([]);
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rawObjects = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        const parsed: BulkCommunityRow[] = [];
        rawObjects.forEach((rawRow, idx) => {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(rawRow)) {
            mapped[normalizeHeaderKey(k)] = String(v ?? '').trim();
          }

          const community_name =
            mapped['organizationname'] ||
            mapped['organisationname'] ||
            mapped['communityname'] ||
            mapped['name'] ||
            '';
          const organisation_type =
            mapped['organizationtype'] ||
            mapped['organisationtype'] ||
            mapped['type'] ||
            'Resident Welfare Association';
          const head_name =
            mapped['communityheadname'] ||
            mapped['headname'] ||
            mapped['coordinatorname'] ||
            mapped['head'] ||
            '';
          const phoneVal =
            mapped['mobilenumber'] ||
            mapped['phone'] ||
            mapped['phonenumber'] ||
            mapped['mobile'] ||
            mapped['contact'] ||
            '';
          const emailVal = mapped['email'] || mapped['officialemail'] || '';
          const usernameVal = mapped['loginusername'] || mapped['username'] || '';
          const passwordVal = mapped['password'] || '';
          const localityVal = mapped['locality'] || mapped['area'] || '';
          const addressVal = mapped['address'] || mapped['officeaddress'] || '';
          const descriptionVal = mapped['description'] || mapped['about'] || '';

          // Skip completely empty rows
          if (!community_name && !head_name && !phoneVal && !emailVal) return;

          const digits = phoneVal.replace(/\D/g, '');
          const clean10 =
            digits.length === 12 && digits.startsWith('91')
              ? digits.slice(2)
              : digits.length === 11 && digits.startsWith('0')
              ? digits.slice(1)
              : digits;

          let validationError: string | undefined;
          if (!community_name) {
            validationError = 'Missing Organization Name';
          } else if (!head_name) {
            validationError = 'Missing Community Head Name';
          } else if (!/^[6-9]\d{9}$/.test(clean10)) {
            validationError = 'Invalid 10-digit Mobile Number';
          } else if (usernameVal && /\s/.test(usernameVal)) {
            validationError = 'Username cannot contain spaces';
          }

          parsed.push({
            excelRow: idx + 2,
            community_name,
            organisation_type,
            head_name,
            phone: clean10 || phoneVal,
            email: emailVal,
            username: usernameVal,
            password: passwordVal,
            locality: localityVal,
            address: addressVal,
            description: descriptionVal,
            validationError
          });
        });

        if (parsed.length === 0) {
          setCommunityError(
            'No data rows found in the uploaded Excel file. Fill rows below the header row and re-upload.'
          );
        }
        setBulkRows(parsed);
      } catch (err: any) {
        setCommunityError(err?.message || 'Unable to parse Excel file. Please use the downloaded .xlsx format.');
        setBulkRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
    // Allow re-selecting same file after edits
    e.target.value = '';
  };

  const handleBulkRegisterSubmit = async () => {
    const validRows = bulkRows.filter(r => !r.validationError);
    if (validRows.length === 0) {
      setCommunityError('There are no valid rows ready to register. Please fix the highlighted rows in Excel.');
      return;
    }
    setBulkUploading(true);
    setCommunityError('');
    setBulkResult(null);
    try {
      const res = await api.bulkAddWardCommunities(
        validRows.map(r => ({
          community_name: r.community_name,
          organisation_type: r.organisation_type || 'Resident Welfare Association',
          head_name: r.head_name,
          phone: r.phone,
          email: r.email || undefined,
          username: r.username || undefined,
          password: r.password || undefined,
          locality: r.locality || undefined,
          address: r.address || undefined,
          description: r.description || undefined
        }))
      );
      setBulkResult({
        created_count: res.data?.created_count || 0,
        failed_count: res.data?.failed_count || 0,
        errors: res.data?.errors || []
      });
      if ((res.data?.created_count || 0) > 0) {
        setActionMessage(
          res.message || `${res.data.created_count} communities registered in Ward ${wardNumber || 3}.`
        );
        await fetchOrganizations();
        setTimeout(() => setActionMessage(''), 6000);
      }
    } catch (err: any) {
      setCommunityError(err.message || 'Bulk community registration failed.');
    } finally {
      setBulkUploading(false);
    }
  };

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const res = await api.getWardCommunities();
      setOrganizations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load registered organizations:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await api.getWardOrganizationDrives(wardNumber);
      setDrives(res.data || []);
    } catch (err) {
      console.error('Failed to load organization drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
    fetchOrganizations();
  }, [wardNumber]);

  const openEditOrg = (org: any) => {
    setEditingOrg(org);
    setEditOrgForm({
      community_name: org.community_name || '',
      organisation_type: org.organisation_type || 'Resident Welfare Association',
      head_name: org.head_name || '',
      phone: org.phone || '',
      email: org.email || '',
      locality: org.locality || '',
      address: org.address || ''
    });
  };

  const handleSaveOrgEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setSavingOrgEdit(true);
    try {
      const res = await api.updateWardCommunity(editingOrg.id, editOrgForm);
      setActionMessage(res.message || `Organization "${editOrgForm.community_name}" updated successfully.`);
      setEditingOrg(null);
      await fetchOrganizations();
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update organization.');
    } finally {
      setSavingOrgEdit(false);
    }
  };

  const handleDeleteOrg = async (org: any) => {
    if (!window.confirm(`Are you sure you want to delete organization "${org.community_name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingOrgId(org.id);
    try {
      const res = await api.deleteWardCommunity(org.id);
      setOrganizations(prev => prev.filter(o => o.id !== org.id));
      setActionMessage(res.message || `Organization "${org.community_name}" removed successfully.`);
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete organization.');
    } finally {
      setDeletingOrgId(null);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') setDocUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim() || !headName.trim()) {
      setCommunityError('Organization name and Community Head name are required.');
      return;
    }
    setSubmittingCommunity(true);
    setCommunityError('');
    try {
      const res = await api.addWardCommunity({
        community_name: communityName.trim(),
        head_name: headName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        username: username.trim(),
        password: password.trim(),
        address: address.trim(),
        locality: locality.trim(),
        description: description.trim(),
        ward_number: wardNumber,
        organisation_type: organisationType,
        verification_document_url: docUrl || undefined,
        verification_document_name: docName || undefined
      });
      setActionMessage(res.message || `Organization "${communityName}" registered for Ward ${wardNumber || 3}.`);
      setShowAddCommunityModal(false);
      setCommunityName('');
      setHeadName('');
      setPhone('');
      setEmail('');
      setUsername('');
      setPassword('Head@123');
      setAddress('');
      setLocality('');
      setDescription('');
      setDocUrl('');
      setDocName('');
      await fetchOrganizations();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err: any) {
      setCommunityError(err.message || 'Failed to add organization.');
    } finally {
      setSubmittingCommunity(false);
    }
  };

  if (inspectingActivity) {
    return (
      <DriveInspectView
        activity={inspectingActivity}
        onBack={() => {
          setInspectingActivity(null);
          fetchDrives();
        }}
        onActionCompleted={() => {
          fetchDrives();
        }}
      />
    );
  }

  const activeDrives = drives.filter(
    d => d.event_status !== 'completed' && d.evidence_status !== 'verified_complete'
  );
  const completedDrives = drives.filter(
    d => d.event_status === 'completed' || d.evidence_status === 'verified_complete'
  );
  const displayedDrives = activeSubTab === 'active' ? activeDrives : completedDrives;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase tracking-wider">
              Ward {wardNumber || 3} · Organization Drives
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
            Organization Drives
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setCommunityError('');
              setAddCommunityTab('single');
              setShowAddCommunityModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Community</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCommunityError('');
              setBulkResult(null);
              setAddCommunityTab('bulk');
              setShowAddCommunityModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#095c54] border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Upload Excel</span>
          </button>
          <button
            type="button"
            onClick={fetchDrives}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh drives"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 3 PRIMARY SUB-TABS: ACTIVE DRIVES, COMPLETE DRIVE HISTORY, REGISTERED ORGANIZATIONS */}
      <div className="mobile-tab-strip sm:grid sm:grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveSubTab('active')}
          className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'active'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>1. Active ({activeDrives.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('completed')}
          className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'completed'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>2. History ({completedDrives.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('organizations');
            fetchOrganizations();
          }}
          className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'organizations'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>3. Organizations ({organizations.length})</span>
        </button>
      </div>

      {/* SUB-TAB 3: REGISTERED ORGANIZATIONS DIRECTORY (VIEW / EDIT / DELETE) */}
      {activeSubTab === 'organizations' ? (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
                placeholder="Search registered organizations by name, head, phone, or type..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#f7f9f8] border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54] focus:bg-white transition"
              />
            </div>
            <button
              type="button"
              onClick={fetchOrganizations}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOrgs ? 'animate-spin text-[#095c54]' : ''}`} />
              <span>Refresh List</span>
            </button>
          </div>

          {loadingOrgs ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 mt-2">Loading registered organizations...</p>
            </div>
          ) : (() => {
            const q = orgSearch.trim().toLowerCase();
            const filteredOrgs = organizations.filter(o =>
              !q ||
              (o.community_name || '').toLowerCase().includes(q) ||
              (o.head_name || '').toLowerCase().includes(q) ||
              (o.organisation_type || '').toLowerCase().includes(q) ||
              (o.phone || '').toLowerCase().includes(q) ||
              (o.email || '').toLowerCase().includes(q)
            );
            if (filteredOrgs.length === 0) {
              return (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                  <Building className="w-9 h-9 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-extrabold text-[#0f2925]">No Registered Organizations Found</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Approved community organizations for Ward {wardNumber || 3} will appear here. Click &ldquo;Add Community&rdquo; above to register one directly.
                  </p>
                </div>
              );
            }
            const paginatedOrgs = filteredOrgs.slice(
              (orgPage - 1) * orgPageSize,
              orgPage * orgPageSize
            );
            return (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Mobile Card View (< md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paginatedOrgs.map(org => (
                    <div key={org.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-xs text-[#0f2925] truncate">{org.community_name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold truncate">
                            {org.head_name || 'Community Head'} · {org.phone || 'N/A'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] shrink-0">
                          Ward {org.ward_number || wardNumber || 3}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1">
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-bold">
                          {org.organisation_type || 'Community Org'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingOrg(org)}
                            className="px-2 py-1 rounded-lg bg-[#f0f7f5] text-[#095c54] border border-[#cde6df] text-[10px] font-extrabold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditOrg(org)}
                            className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrg(org)}
                            disabled={deletingOrgId === org.id}
                            className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f7f9f8] border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">Organization</th>
                        <th className="py-3.5 px-4">Community Head</th>
                        <th className="py-3.5 px-4">Contact</th>
                        <th className="py-3.5 px-4">Ward / Area</th>
                        <th className="py-3.5 px-4">Document</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedOrgs.map(org => (
                        <tr key={org.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-black text-[#0f2925]">{org.community_name}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-bold">
                              {org.organisation_type || 'Community Org'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{org.head_name || 'Community Head'}</p>
                            {org.username && (
                              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[160px]">{org.username}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 space-y-0.5">
                            {org.phone && (
                              <p className="text-slate-700 font-semibold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#095c54]" />
                                {org.phone}
                              </p>
                            )}
                            {org.email && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[180px]">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {org.email}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                              Ward {org.ward_number || wardNumber || 3}
                            </span>
                            {org.locality && (
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">{org.locality}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {org.verification_document_url ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <FileCheck2 className="w-3 h-3" />
                                Verified Doc
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Officer Added</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingOrg(org)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#f0f7f5] hover:bg-[#d9f0ea] text-[#095c54] border border-[#cde6df] text-[11px] font-extrabold inline-flex items-center gap-1 transition"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditOrg(org)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-extrabold inline-flex items-center gap-1 transition"
                                title="Edit Organization"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOrg(org)}
                                disabled={deletingOrgId === org.id}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-extrabold inline-flex items-center gap-1 transition disabled:opacity-50"
                                title="Delete Organization"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{deletingOrgId === org.id ? '...' : 'Delete'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  currentPage={orgPage}
                  totalItems={filteredOrgs.length}
                  pageSize={orgPageSize}
                  onPageChange={setOrgPage}
                  itemLabel="organizations"
                />
              </div>
            );
          })()}
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 mt-2">Loading Ward {wardNumber || 3} organization drives...</p>
        </div>
      ) : displayedDrives.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <Calendar className="w-9 h-9 text-slate-300 mx-auto" />
          <h4 className="text-sm font-extrabold text-[#0f2925]">
            {activeSubTab === 'active' ? 'No Active Organization Drives' : 'No Completed Drives Yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeSubTab === 'active'
              ? `Approved cleanliness drives for Ward ${wardNumber || 3} will appear here once approved from Approval Management.`
              : `Once you verify submitted evidence and mark a drive complete, it will move to Complete Drive History.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayedDrives.map(drive => {
            const isComplete = drive.event_status === 'completed' || drive.evidence_status === 'verified_complete';
            return (
              <div
                key={drive.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#095c54]/40 transition p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] border border-teal-200 text-[10px] font-black uppercase">
                          Ward {drive.ward_number || wardNumber || 3}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isComplete
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : drive.evidence_status === 'submitted'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {isComplete
                            ? 'Completed & Verified'
                            : drive.evidence_status === 'submitted'
                            ? 'Evidence Ready'
                            : 'Scheduled / Active'}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-[#0f2925] leading-snug">
                        {drive.title}
                      </h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                        <span className="font-semibold truncate">{drive.community_name}</span>
                      </p>
                    </div>
                  </div>

                  {/* Schedule & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {drive.proposed_start_at
                          ? new Date(drive.proposed_start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                          : 'Scheduled'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{drive.address || drive.landmark || `Ward ${drive.ward_number}`}</span>
                    </span>
                  </div>

                  {/* Present / Absent / Evidence / Certificates Mini Metrics */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-[#f7f9f8] border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block">Registered</span>
                      <strong className="text-sm font-black text-[#0f2925]">{drive.registered_count || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                        <UserCheck className="w-3 h-3" /> Present
                      </span>
                      <strong className="text-sm font-black text-emerald-800">{drive.present_count || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70 text-center">
                      <span className="text-[10px] font-bold text-rose-700 flex items-center justify-center gap-0.5">
                        <UserX className="w-3 h-3" /> Absent
                      </span>
                      <strong className="text-sm font-black text-rose-700">{drive.absent_count || 0}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#f7f9f8] border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-0.5">
                        {isComplete ? <Award className="w-3 h-3 text-amber-500" /> : <Camera className="w-3 h-3 text-[#095c54]" />}
                        {isComplete ? 'Certs' : 'Evidence'}
                      </span>
                      <strong className="text-sm font-black text-[#095c54]">
                        {isComplete ? drive.certificates_count || 0 : drive.evidence_count || 0}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {drive.evidence_count || 0} Evidence Photo{(drive.evidence_count || 0) === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectingActivity(drive)}
                    className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD COMMUNITY / ORGANIZATION MODAL (SINGLE + BULK EXCEL UPLOAD) */}
      {showAddCommunityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-4 sm:my-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-[#0f2925]">
                  Register Community / Organization (Ward {wardNumber || 3})
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Register a single community or bulk-register multiple communities using Excel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCommunityModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Single vs Bulk Excel Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setAddCommunityTab('single');
                  setCommunityError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  addCommunityTab === 'single'
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Single Registration</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddCommunityTab('bulk');
                  setCommunityError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  addCommunityTab === 'bulk'
                    ? 'bg-[#095c54] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Upload (Excel)</span>
              </button>
            </div>

            {communityError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{communityError}</span>
              </div>
            )}

            {addCommunityTab === 'bulk' ? (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-0.5">
                {/* Step 1: Download Header-Only Excel Format */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f0faf8] border border-teal-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-[#095c54] block">
                        Step 1 · Template Format
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-[#0f2925]">
                        Download Excel Column Format (.xlsx)
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Contains only the required column headers so you can fill in your ward&apos;s community details cleanly.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadCommunityExcelFormat}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs shrink-0 transition"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download Excel Format</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-teal-200/70">
                    {BULK_EXCEL_HEADERS.map(col => {
                      const isReq =
                        col === 'Organization Name' ||
                        col === 'Community Head Name' ||
                        col === 'Mobile Number';
                      return (
                        <span
                          key={col}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isReq
                              ? 'bg-white text-[#095c54] border-teal-300'
                              : 'bg-white/70 text-slate-600 border-slate-200'
                          }`}
                        >
                          {col}
                          {isReq ? ' *' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Upload Filled Excel File */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-dashed border-[#095c54]/40 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Step 2 · Upload Filled Excel Sheet
                  </span>
                  <label className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white border border-slate-200 hover:border-[#095c54] text-xs font-extrabold text-[#095c54] cursor-pointer transition text-center">
                    {bulkFileName ? (
                      <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Upload className="w-5 h-5 shrink-0" />
                    )}
                    <span className="truncate max-w-full">
                      {bulkFileName
                        ? `Selected: ${bulkFileName} (${bulkRows.length} rows parsed)`
                        : 'Click to Upload Excel File (.xlsx, .xls, or .csv)'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      className="hidden"
                      onChange={handleBulkExcelFileChange}
                    />
                  </label>
                </div>

                {/* Live Parsed Preview Table */}
                {bulkRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-black text-[#0f2925]">
                        Preview ({bulkRows.filter(r => !r.validationError).length} Valid ·{' '}
                        {bulkRows.filter(r => r.validationError).length} Invalid)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkRows([]);
                          setBulkFileName('');
                          setBulkResult(null);
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Clear File
                      </button>
                    </div>

                    <div className="max-h-52 overflow-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                          <tr>
                            <th className="py-2 px-2.5">Row</th>
                            <th className="py-2 px-2.5">Organization</th>
                            <th className="py-2 px-2.5">Head &amp; Mobile</th>
                            <th className="py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bulkRows.map(r => (
                            <tr key={r.excelRow} className={r.validationError ? 'bg-rose-50/60' : ''}>
                              <td className="py-2 px-2.5 font-bold text-slate-500">#{r.excelRow}</td>
                              <td className="py-2 px-2.5">
                                <div className="font-black text-[#0f2925] truncate max-w-[160px]">
                                  {r.community_name || '—'}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  {r.organisation_type}
                                </div>
                              </td>
                              <td className="py-2 px-2.5">
                                <div className="font-bold text-[#0f2925] truncate max-w-[140px]">
                                  {r.head_name || '—'}
                                </div>
                                <div className="text-[10px] text-slate-500">{r.phone || '—'}</div>
                              </td>
                              <td className="py-2 px-2.5">
                                {r.validationError ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] inline-block">
                                    {r.validationError}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px] inline-block">
                                    Ready
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bulk Upload Server Results */}
                {bulkResult && (
                  <div className="p-3.5 rounded-2xl border bg-emerald-50/70 border-emerald-200 space-y-2 text-xs">
                    <div className="font-black text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Registered {bulkResult.created_count} communit
                        {bulkResult.created_count === 1 ? 'y' : 'ies'} in Ward {wardNumber || 3}
                        {bulkResult.failed_count > 0 ? ` · ${bulkResult.failed_count} skipped` : ''}
                      </span>
                    </div>
                    {bulkResult.errors.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-emerald-200/70 max-h-28 overflow-y-auto">
                        {bulkResult.errors.map((er, idx) => (
                          <div key={idx} className="text-[11px] font-bold text-rose-700">
                            Row #{er.row} ({er.community_name}): {er.error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddCommunityModal(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkRegisterSubmit}
                    disabled={
                      bulkUploading || bulkRows.filter(r => !r.validationError).length === 0
                    }
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {bulkUploading
                        ? 'Registering Communities...'
                        : `Register ${bulkRows.filter(r => !r.validationError).length} Communities`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleAddCommunitySubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={e => setCommunityName(e.target.value)}
                    placeholder="e.g. Swachh Navsari Youth Trust"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Organization Type</label>
                  <select
                    value={organisationType}
                    onChange={e => setOrganisationType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#095c54]"
                  >
                    <option value="Resident Welfare Association">Resident Welfare Association</option>
                    <option value="NGO / Charitable Trust">NGO / Charitable Trust</option>
                    <option value="Youth Club / College NSS">Youth Club / College NSS</option>
                    <option value="Market / Traders Association">Market / Traders Association</option>
                    <option value="Religious / Cultural Trust">Religious / Cultural Trust</option>
                    <option value="Corporate CSR Group">Corporate CSR Group</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Community Head Name *</label>
                  <input
                    type="text"
                    required
                    value={headName}
                    onChange={e => setHeadName(e.target.value)}
                    placeholder="Head / Coordinator full name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="org@email.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Login Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Optional username"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Locality</label>
                  <input
                    type="text"
                    value={locality}
                    onChange={e => setLocality(e.target.value)}
                    placeholder={`Ward ${wardNumber || 3} Area`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Office / Society address"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              {/* Certificate / Verification Document Upload */}
              <div className="p-3.5 rounded-2xl bg-[#f7f9f8] border border-dashed border-[#095c54]/40 space-y-2">
                <label className="text-xs font-extrabold text-[#095c54] block">
                  Upload Registration Certificate / Verification Document
                </label>
                <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-[#095c54] text-xs font-bold text-[#095c54] cursor-pointer transition">
                  {docUrl ? <FileCheck2 className="w-4 h-4 text-emerald-600" /> : <Upload className="w-4 h-4" />}
                  <span className="truncate">{docName ? `Uploaded: ${docName}` : 'Choose Certificate / Document (Image or PDF)'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
                </label>
                {docUrl && docUrl.startsWith('data:image') && (
                  <img src={docUrl} alt="Document preview" className="h-24 w-full object-cover rounded-xl border border-slate-200" />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCommunityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCommunity}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold disabled:opacity-50"
                >
                  {submittingCommunity ? 'Registering...' : 'Register Organization'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
      {/* VIEW ORGANIZATION DETAILS MODAL */}
      {viewingOrg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Registered Organization
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    Ward {viewingOrg.ward_number || wardNumber || 3}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#0f2925]">{viewingOrg.community_name}</h3>
                <p className="text-xs text-slate-500">{viewingOrg.organisation_type || 'Community Organization'}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrg(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Community Head</span>
                <strong className="text-slate-900">{viewingOrg.head_name || 'N/A'}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Login Username</span>
                <strong className="text-slate-900 font-mono">{viewingOrg.username || viewingOrg.email || 'N/A'}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Phone</span>
                <strong className="text-slate-900">{viewingOrg.phone || 'N/A'}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Email</span>
                <strong className="text-slate-900 break-all">{viewingOrg.email || 'N/A'}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Address &amp; Locality</span>
                <strong className="text-slate-900">
                  {[viewingOrg.address, viewingOrg.locality, `Ward ${viewingOrg.ward_number || wardNumber || 3}`].filter(Boolean).join(' · ')}
                </strong>
              </div>
              {viewingOrg.description && (
                <div className="p-3 rounded-2xl bg-[#f7f9f8] border border-slate-200/70 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">About Organization</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">{viewingOrg.description}</p>
                </div>
              )}
            </div>

            {viewingOrg.verification_document_url && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    Verification Certificate: {viewingOrg.verification_document_name || 'Uploaded Document'}
                  </span>
                  <a
                    href={viewingOrg.verification_document_url}
                    download={viewingOrg.verification_document_name || 'verification_certificate'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-extrabold text-[#095c54] underline"
                  >
                    Open / Download
                  </a>
                </div>
                {viewingOrg.verification_document_url.startsWith('data:image') && (
                  <img
                    src={viewingOrg.verification_document_url}
                    alt="Verification Document"
                    className="max-h-48 w-full object-contain rounded-xl bg-white border border-emerald-200"
                  />
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const target = viewingOrg;
                  setViewingOrg(null);
                  openEditOrg(target);
                }}
                className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingOrg(null)}
                className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ORGANIZATION MODAL */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0f2925]">Edit Registered Organization</h3>
                <p className="text-xs text-slate-500">Update organization contact and leadership information.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrg(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrgEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={editOrgForm.community_name}
                  onChange={e => setEditOrgForm(p => ({ ...p, community_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Organization Type</label>
                  <select
                    value={editOrgForm.organisation_type}
                    onChange={e => setEditOrgForm(p => ({ ...p, organisation_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white outline-none focus:border-[#095c54]"
                  >
                    <option value="Resident Welfare Association">Resident Welfare Association</option>
                    <option value="NGO / Charitable Trust">NGO / Charitable Trust</option>
                    <option value="Youth Club / College NSS">Youth Club / College NSS</option>
                    <option value="Market / Traders Association">Market / Traders Association</option>
                    <option value="Religious / Cultural Trust">Religious / Cultural Trust</option>
                    <option value="Corporate CSR Group">Corporate CSR Group</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Community Head Name *</label>
                  <input
                    type="text"
                    required
                    value={editOrgForm.head_name}
                    onChange={e => setEditOrgForm(p => ({ ...p, head_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editOrgForm.phone}
                    onChange={e => setEditOrgForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editOrgForm.email}
                    onChange={e => setEditOrgForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Locality</label>
                  <input
                    type="text"
                    value={editOrgForm.locality}
                    onChange={e => setEditOrgForm(p => ({ ...p, locality: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Address</label>
                  <input
                    type="text"
                    value={editOrgForm.address}
                    onChange={e => setEditOrgForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOrgEdit}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold disabled:opacity-50"
                >
                  {savingOrgEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
