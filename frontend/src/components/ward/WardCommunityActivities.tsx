import { formatDate } from '../../utils/dateFormat.js';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  Plus,
  Building,
  Phone,
  Mail,
  Pencil,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api.js';
import { DriveInspectView } from './DriveInspectView.js';

export const WardCommunityActivities: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'drives' | 'communities'>('drives');
  const [activities, setActivities] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [inspectingActivity, setInspectingActivity] = useState<any | null>(null);

  // Add Community Modal State
  const [showAddCommunityModal, setShowAddCommunityModal] = useState<boolean>(false);
  const [communityName, setCommunityName] = useState<string>('');
  const [headName, setHeadName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('Head@123');
  const [organisationType, setOrganisationType] = useState<string>('Resident Welfare Association');
  const [address, setAddress] = useState<string>('');
  const [locality, setLocality] = useState<string>('Dudhiya Talao');
  const [submittingCommunity, setSubmittingCommunity] = useState<boolean>(false);
  const [communityError, setCommunityError] = useState<string>('');

  // Edit Community State
  const [editingCommunity, setEditingCommunity] = useState<any | null>(null);
  const [editCommunityName, setEditCommunityName] = useState<string>('');
  const [editHeadName, setEditHeadName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editLocality, setEditLocality] = useState<string>('Dudhiya Talao');
  const [editOrgType, setEditOrgType] = useState<string>('Resident Welfare Association');
  const [submittingEditCommunity, setSubmittingEditCommunity] = useState<boolean>(false);

  const handleOpenEditCommunity = (com: any) => {
    setEditingCommunity(com);
    setEditCommunityName(com.community_name);
    setEditHeadName(com.head_name);
    setEditPhone(com.phone || '');
    setEditEmail(com.email || '');
    setEditAddress(com.address || '');
    setEditLocality(com.locality || 'Dudhiya Talao');
    setEditOrgType(com.organisation_type || 'Resident Welfare Association');
  };

  const handleUpdateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommunity) return;
    setSubmittingEditCommunity(true);
    setCommunityError('');
    try {
      const res = await api.updateWardCommunity(editingCommunity.id, {
        community_name: editCommunityName,
        head_name: editHeadName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        locality: editLocality,
        organisation_type: editOrgType
      });
      setActionMessage(res.message || 'Community updated successfully');
      setEditingCommunity(null);
      fetchData();
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      setCommunityError(err.message || 'Failed to update community');
    } finally {
      setSubmittingEditCommunity(false);
    }
  };

  const handleDeleteCommunity = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from Ward 3 directory?`)) {
      return;
    }
    try {
      const res = await api.deleteWardCommunity(id);
      setActionMessage(res.message || `Community "${name}" removed`);
      setCommunities(prev => prev.filter(c => c.id !== id));
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      console.error('Delete failed:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actRes, comRes] = await Promise.all([
        api.getCommunityActivities().catch(() => ({ data: [] })),
        api.getWardCommunities().catch(() => ({ data: [] }))
      ]);
      setActivities(actRes.data || []);
      setCommunities(comRes.data || []);
    } catch (err) {
      console.error('Failed to load community activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (id: string, decision: 'ward_approved' | 'changes_requested' | 'rejected') => {
    try {
      const mappedDecision = decision === 'ward_approved' ? 'approved' : decision;
      await api.officerReviewActivity(
        id,
        mappedDecision,
        `Ward 3 Officer decision: ${decision.replace('_', ' ')}`
      );
      setActionMessage(`Activity successfully updated to ${decision.replace('_', ' ')}.`);
      await fetchData();
      if (selectedActivity?.id === id) {
        setSelectedActivity({ ...selectedActivity, approval_status: decision });
      }
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      console.error('Review failed:', err);
    }
  };

  const handleAddCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim() || !headName.trim()) {
      setCommunityError('Community name and Head name are required.');
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
        organisation_type: organisationType
      });

      setActionMessage(res.message || 'Community organization successfully registered in Ward 3.');
      setShowAddCommunityModal(false);
      setCommunityName('');
      setHeadName('');
      setPhone('');
      setEmail('');
      setUsername('');
      setPassword('Head@123');
      setAddress('');
      await fetchData();
      setActiveSubTab('communities');
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      setCommunityError(err.message || 'Failed to add community organization');
    } finally {
      setSubmittingCommunity(false);
    }
  };

  if (inspectingActivity) {
    return (
      <DriveInspectView
        activity={inspectingActivity}
        onBack={() => setInspectingActivity(null)}
        onActionCompleted={() => {
          setInspectingActivity(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Community Activities & Organisations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review Citizen Drives & Manage Ward 3 Community Groups
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Add Community Button as specifically requested by user */}
          <button
            onClick={() => setShowAddCommunityModal(true)}
            className="px-4 py-2 rounded-xl bg-[#095c54] text-white hover:bg-emerald-800 text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Community</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh activities"
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

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('drives')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === 'drives'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Cleanliness Drives Queue ({activities.length})
        </button>
        <button
          onClick={() => setActiveSubTab('communities')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === 'communities'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Registered Communities & RWAs ({communities.length})
        </button>
      </div>

      {/* TAB 1: CLEANLINESS DRIVES */}
      {activeSubTab === 'drives' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
              <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 mt-2">Loading community activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-500 text-xs">
              No community activities found for Ward 3.
            </div>
          ) : (
            activities.map(act => (
              <div
                key={act.id}
                className="p-5 rounded-3xl bg-white border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                        {act.activity_category}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                          act.approval_status === 'ward_approved' || act.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : act.approval_status === 'submitted'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : act.approval_status === 'changes_requested'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {act.approval_status?.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-[#0f2925]">{act.title}</h3>
                    <p className="text-xs text-slate-500">
                      Organised by: <strong>{act.community_name || 'Navsari Green Warriors RWA'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectingActivity(act)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#095c54]" />
                      <span>Inspect</span>
                    </button>
                    {act.approval_status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleReview(act.id, 'ward_approved')}
                          className="px-3.5 py-1.5 rounded-xl bg-[#095c54] text-white hover:bg-emerald-800 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Drive</span>
                        </button>
                        <button
                          onClick={() => handleReview(act.id, 'changes_requested')}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => handleReview(act.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {act.short_description || act.detailed_description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Proposed: {formatDate(act.proposed_start_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{act.address || 'Ward 3, Navsari'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Volunteers: <strong>{act.registered_count || 0}</strong> / {act.maximum_participants || 50} max</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: REGISTERED COMMUNITIES */}
      {activeSubTab === 'communities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map(com => (
            <div
              key={com.id}
              className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center font-black text-sm shrink-0 border border-emerald-100">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0f2925]">{com.community_name}</h4>
                    <span className="text-[10px] font-bold text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {com.organisation_type}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ward {com.ward_number || 3}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <p className="text-slate-700 font-bold">
                  Community Head: <span className="font-extrabold text-[#0f2925]">{com.head_name}</span>
                </p>
                <div className="flex flex-wrap gap-3 text-slate-600 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {com.phone}
                  </span>
                  {com.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {com.email}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{com.address}</span>
                </p>
              </div>

              {/* Action buttons: Edit & Delete */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEditCommunity(com)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#095c54] text-[#095c54] hover:text-white text-xs font-bold transition flex items-center gap-1 border border-emerald-200"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteCommunity(com.id, com.community_name)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-bold transition flex items-center gap-1 border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD COMMUNITY MODAL DIALOG */}
      {showAddCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Register Community Group</h3>
                  <p className="text-xs text-slate-500">Add an RWA, NGO, or volunteer body in Ward 3</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCommunityModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {communityError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                {communityError}
              </div>
            )}

            <form onSubmit={handleAddCommunitySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Community / RWA Name *
                </label>
                <input
                  type="text"
                  required
                  value={communityName}
                  onChange={e => setCommunityName(e.target.value)}
                  placeholder="e.g., Dudhiya Talao Youth Cleanliness Club"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Community Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={headName}
                    onChange={e => setHeadName(e.target.value)}
                    placeholder="e.g., Sanjay Desai"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Organisation Type
                  </label>
                  <select
                    value={organisationType}
                    onChange={e => setOrganisationType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  >
                    <option value="Resident Welfare Association">Resident Welfare Association (RWA)</option>
                    <option value="Environmental NGO">Environmental NGO</option>
                    <option value="Citizen Action Group">Citizen Action Group</option>
                    <option value="Youth Volunteers Club">Youth Volunteers Club</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+9198251XXXXX"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="head@community.org"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Login Username <span className="text-[10px] text-slate-400 font-normal">(Optional - defaults to email or phone)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. amit.sharma or green_youth"
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
                  placeholder="Set password for Community Head login"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#095c54] outline-hidden font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">Community Head can log in using their phone number, email, or username, along with this password.</p>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Address & Locality in Ward 3</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g., Near Ashapuri Garden Gate, Ward 3"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCommunityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCommunity}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
                >
                  {submittingCommunity ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Register Community</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMMUNITY MODAL DIALOG */}
      {editingCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2925]">Edit Community Details</h3>
                  <p className="text-xs text-slate-500">Update organization or leader details in Ward 3</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCommunity(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCommunitySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Community / RWA Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCommunityName}
                  onChange={e => setEditCommunityName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Community Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editHeadName}
                    onChange={e => setEditHeadName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#0f2925] focus:bg-white focus:border-[#095c54] outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Organization Type
                  </label>
                  <select
                    value={editOrgType}
                    onChange={e => setEditOrgType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#0f2925]"
                  >
                    <option value="Resident Welfare Association">Resident Welfare Association (RWA)</option>
                    <option value="Non-Governmental Organization">Non-Governmental Organization (NGO)</option>
                    <option value="Youth Volunteer Group">Youth Volunteer Group</option>
                    <option value="Market Traders Association">Market Traders Association</option>
                    <option value="Environmental Club">Environmental Club</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Address & Locality in Ward 3</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCommunity(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditCommunity}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5"
                >
                  {submittingEditCommunity ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
