import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  UserCheck
} from 'lucide-react';
import { Community } from '../../types/index.js';
import { api } from '../../services/api.js';

interface MyCommunityProfileProps {
  community: Community;
  onCommunityUpdated: (updated: Community) => void;
}

export const MyCommunityProfile: React.FC<MyCommunityProfileProps> = ({
  community,
  onCommunityUpdated
}) => {
  const comm = community || {} as Community;
  const [formData, setFormData] = useState({
    community_name: comm.community_name || 'Navsari Green Warriors RWA',
    organisation_type: comm.organisation_type || 'Resident Welfare Association',
    description: comm.description || '',
    address: comm.address || '',
    locality: comm.locality || '',
    contact_email: comm.contact_email || '',
    contact_phone: comm.contact_phone || '',
    logo_path: comm.logo_path || ''
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await api.updateCommunity(community.id, formData);
      if (res.success && res.data) {
        onCommunityUpdated(res.data);
        setSuccessMessage('Community profile updated successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update community profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header & Verification Certificate */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
              {formData.logo_path ? (
                <img src={formData.logo_path} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#095c54] font-extrabold text-xl">
                  {community.community_name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {community.community_name}
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {community.organisation_type} · Registration No: <strong className="text-slate-700">{community.registration_number || `NMC-RWA-2026-0${community.ward_number || 3}`}</strong>
              </p>
            </div>
          </div>

          <div>
            {community.verification_status === 'verified' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NMC Verified Entity</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Verification In-Progress</span>
              </div>
            )}
          </div>
        </div>

        {community.verified_at && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Verified by NMC Officer: <strong className="text-slate-900">{community.verified_by_officer_name || 'Dr. Ketan Parekh (NMC Admin)'}</strong>
            </span>
            <span className="text-slate-500">
              Verified on: {new Date(community.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
          Organization Profile Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Community / Organization Name</label>
            <input
              type="text"
              name="community_name"
              value={formData.community_name}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Organization Type</label>
            <select
              name="organisation_type"
              value={formData.organisation_type}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none bg-white"
            >
              <option value="Resident Welfare Association">Resident Welfare Association (RWA)</option>
              <option value="Youth Group">Youth Group / Youth Club</option>
              <option value="NGO">Non-Governmental Organization (NGO)</option>
              <option value="School / Educational">School / Educational Institution</option>
              <option value="Market Committee">Market / Traders Association</option>
              <option value="Civic Action Group">Civic Action Group</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Official Contact Email</label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Official Contact Phone</label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">Logo / Banner Image URL</label>
            <input
              type="url"
              name="logo_path"
              value={formData.logo_path}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">Headquarters Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Locality</label>
            <input
              type="text"
              name="locality"
              value={formData.locality}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Assigned Municipal Ward (Official)</label>
            <input
              type="text"
              readOnly
              disabled
              value={community.ward_name || `Ward ${community.ward_number} - Dudhiya Talao`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">Community Mission & Description</label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none resize-none"
              placeholder="Describe your organization's mission and civic activities in Navsari..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

