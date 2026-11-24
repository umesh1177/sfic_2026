import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Plus,
  Trash2,
  MapPin,
  Users,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Upload,
  Search,
  Layers,
  Lock,
  RotateCcw,
  Wrench,
  Sparkles,
  Flag
} from 'lucide-react';
import { CommunityProblem } from '../../types/index.js';
import { api } from '../../services/api.js';
import { MiniMapLocationPicker } from '../MiniMapLocationPicker.js';
import { Language } from '../../i18n/translations.js';

interface WardCommunityProblemsViewProps {
  wardNumber: number;
  officerName: string;
  lang: Language;
}

const PRESET_EQUIPMENT_OPTIONS = [
  'Heavy Duty Brooms',
  'Protective Rubber Gloves',
  'Biodegradable Trash Bags',
  'Metal Rakes & Shovels',
  'Bleaching Powder Disinfectant',
  'Safety Reflective Vests',
  'Wheelbarrows / Push Carts',
  'Awareness Banners',
  'First Aid Kit'
];

const URGENCY_STYLES: Record<string, { label: string; badge: string; dot: string }> = {
  critical: { label: 'Critical', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-600' },
  high: { label: 'High Priority', badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  medium: { label: 'Medium', badge: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  low: { label: 'Routine', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' }
};

export const WardCommunityProblemsView: React.FC<WardCommunityProblemsViewProps> = ({
  wardNumber,
  officerName
}) => {
  const [problems, setProblems] = useState<CommunityProblem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'completed'>('active');

  // Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [address, setAddress] = useState<string>(`Ward ${wardNumber}, Navsari Municipal Area`);
  const [latitude, setLatitude] = useState<number>(20.9470);
  const [longitude, setLongitude] = useState<number>(72.9280);
  const [actionPlan, setActionPlan] = useState<string>('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [volunteersNeeded, setVolunteersNeeded] = useState<number>(20);
  const [allowMultipleOrgs, setAllowMultipleOrgs] = useState<boolean>(true);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'Heavy Duty Brooms',
    'Protective Rubber Gloves',
    'Biodegradable Trash Bags'
  ]);
  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80'
  );

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await api.getWardCommunityProblems(wardNumber);
      if (res.success && res.data) {
        setProblems(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load community problems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAddress(`Ward ${wardNumber}, Navsari Municipal Area`);
    fetchProblems();
  }, [wardNumber]);

  const toggleEquipment = (item: string) => {
    setSelectedEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !actionPlan.trim()) {
      setErrorMsg('Please fill in Problem Title, Description, and Recommended Action Plan.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.addWardCommunityProblem({
        ward_number: wardNumber,
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim() || `Ward ${wardNumber} Civic Sector`,
        latitude,
        longitude,
        address: address.trim(),
        action_plan: actionPlan.trim(),
        urgency,
        estimated_volunteers_needed: volunteersNeeded,
        suggested_equipment: selectedEquipment,
        image_url: imageUrl.trim(),
        allow_multiple_orgs: allowMultipleOrgs
      });

      if (res.success) {
        setSuccessMsg(`Civic problem published for Ward ${wardNumber} organizations!`);
        setIsCreateOpen(false);
        setTitle('');
        setDescription('');
        setActionPlan('');
        setLocationName('');
        fetchProblems();
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish civic problem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await api.reopenWardCommunityProblem(id);
      setSuccessMsg('Problem reopened for community organizations.');
      fetchProblems();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not reopen problem.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently remove this problem listing?')) return;
    try {
      await api.deleteWardCommunityProblem(id);
      setProblems(prev => prev.filter(p => p.id !== id));
      setSuccessMsg('Problem removed.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not remove problem.');
    }
  };

  // =========================================================================
  // CREATE PROBLEM VIEW (CLEAN, PREMIUM SPLIT-COLUMN FORM)
  // =========================================================================
  if (isCreateOpen) {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#095c54]">
                Ward {wardNumber} · Community Action Brief
              </span>
              <h1 className="text-lg sm:text-xl font-black text-[#0f2925] tracking-tight">
                Post Civic Problem for Organization Drives
              </h1>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Problem Details & Action Plan */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#0f2925] block">
                Problem Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Plastic & Silt Accumulation Along Lake Promenade"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-[#0f2925] focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/10 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#0f2925] block">
                Detailed Problem Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe current ground conditions, sanitation impact, and site access..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/10 outline-none transition"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#f7f9f8] border border-[#cde6df] space-y-2">
              <label className="text-xs font-extrabold text-[#095c54] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Recommended Action Plan (What Organizations Should Do) *</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Step-by-step cleanup guidance: waste segregation, sweeping perimeter, bagging plastic waste, bleaching powder dusting..."
                value={actionPlan}
                onChange={e => setActionPlan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 focus:border-[#095c54] outline-none"
              />
            </div>

            {/* Urgency, Volunteers & Collaboration Policy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-[#0f2925] block mb-1.5">
                  Urgency Level
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['critical', 'high', 'medium', 'low'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border capitalize transition ${
                        urgency === level
                          ? 'bg-[#095c54] text-white border-[#095c54]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#0f2925] block mb-1.5">
                  Estimated Volunteers Needed
                </label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={volunteersNeeded}
                  onChange={e => setVolunteersNeeded(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#0f2925] focus:border-[#095c54] outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Suggested volunteer headcount for this site</p>
              </div>
            </div>

            {/* Multi-Org Collaboration Policy */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold text-[#0f2925] block">
                  Allow Multiple Organizations on This Problem
                </span>
                <span className="text-[11px] text-slate-500">
                  When enabled, multiple organizations can run drives on this site simultaneously.
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowMultipleOrgs}
                onChange={e => setAllowMultipleOrgs(e.target.checked)}
                className="w-4 h-4 accent-[#095c54] cursor-pointer shrink-0"
              />
            </div>

            {/* Equipment Chips */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-[#0f2925] flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#095c54]" />
                <span>Recommended Equipment &amp; Supplies</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_EQUIPMENT_OPTIONS.map(item => {
                  const selected = selectedEquipment.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleEquipment(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        selected
                          ? 'bg-[#095c54] text-white border-[#095c54]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#095c54]/50'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}{item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Site Photo & Location Picker */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <label className="text-xs font-extrabold text-[#0f2925] block">
                Site Photograph Preview
              </label>
              <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                {imageUrl ? (
                  <img src={imageUrl} alt="Problem site" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No Photo Selected
                  </div>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-[#095c54]/40 bg-[#f7f9f8] hover:bg-[#e6f4f1] text-[#095c54] text-xs font-extrabold cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span>Upload Site Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <label className="text-xs font-extrabold text-[#0f2925] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#095c54]" />
                <span>Location &amp; Landmark (Ward {wardNumber})</span>
              </label>
              <input
                type="text"
                placeholder="Landmark / Spot Name"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
              />
              <input
                type="text"
                placeholder="Full Street Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54]"
              />
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <MiniMapLocationPicker
                  initialLat={latitude}
                  initialLng={longitude}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] py-3 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-300" />}
                <span>Publish Civic Problem</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // MAIN LIST VIEW (PREMIUM, CLEAN, INSTITUTIONAL DESIGN)
  // =========================================================================
  const isSolvedProblem = (p: CommunityProblem) => {
    const st = String(p.status || 'open').toLowerCase();
    return st === 'completed' || st === 'resolved';
  };

  const activeProblems = problems.filter(p => !isSolvedProblem(p));
  const solvedProblems = problems.filter(p => isSolvedProblem(p));

  const openCount = activeProblems.filter(p => p.status === 'open').length;
  const claimedCount = activeProblems.filter(p => p.status === 'claimed' || p.status === 'in_progress').length;
  const completedCount = solvedProblems.length;
  const totalVols = activeProblems.reduce((acc, p) => acc + (Number(p.estimated_volunteers_needed) || 0), 0);

  const tabBaseProblems = activeSubTab === 'completed' ? solvedProblems : activeProblems;
  const filteredProblems = tabBaseProblems.filter(p => {
    const matchesUrgency = urgencyFilter === 'all' || String(p.urgency || '').toLowerCase() === urgencyFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.location_name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q);
    return matchesUrgency && matchesQuery;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#f0f7f5] text-[#095c54] border border-[#cde6df] text-[10px] font-black uppercase tracking-wider">
              Ward {wardNumber} Civic Collaboration Hub
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Officer: {officerName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight">
            Community Cleanliness Problems
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={fetchProblems}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Problem</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Flagged', value: problems.length, sub: `Ward ${wardNumber} listings`, accent: 'text-[#095c54]' },
          { label: 'Open for Drives', value: openCount, sub: 'Ready for organizations', accent: 'text-emerald-700' },
          { label: 'Active / Claimed', value: claimedCount, sub: `${completedCount} completed`, accent: 'text-amber-700' },
          { label: 'Volunteer Target', value: totalVols, sub: 'Combined citizens needed', accent: 'text-slate-800' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {kpi.label}
            </span>
            <p className={`text-2xl font-black mt-1 ${kpi.accent}`}>{kpi.value}</p>
            <span className="text-[11px] text-slate-500 font-medium">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2 SUB-TABS: ACTIVE PROBLEMS & COMPLETED / SOLVED PROBLEMS */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveSubTab('active')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'active'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>1. Active Problems ({activeProblems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('completed')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'completed'
              ? 'bg-[#095c54] text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-[#0f2925]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>2. Completed / Solved ({solvedProblems.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Ward problems by title, location, or description..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#f7f9f8] border border-slate-200 text-xs font-semibold outline-none focus:border-[#095c54] focus:bg-white transition"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'critical', 'high', 'medium', 'low'].map(u => (
            <button
              key={u}
              type="button"
              onClick={() => setUrgencyFilter(u)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition ${
                urgencyFilter === u
                  ? 'bg-[#095c54] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {u === 'all' ? 'All Urgency' : u}
            </button>
          ))}
        </div>
      </div>

      {/* Problem Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-7 h-7 text-[#095c54] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 mt-2">Loading Ward {wardNumber} community problems...</p>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#f0f7f5] text-[#095c54] flex items-center justify-center mx-auto">
            <Flag className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-extrabold text-[#0f2925]">
            {activeSubTab === 'completed' ? 'No Completed / Solved Problems Yet' : 'No Active Community Problems Flagged'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeSubTab === 'completed'
              ? 'Once an organization completes a drive on a flagged problem and you verify & approve their evidence, the solved problem will automatically appear here.'
              : `Post a civic cleanliness problem in Ward ${wardNumber} so local NGOs, RWAs, and youth clubs can propose and execute community drives.`}
          </p>
          {activeSubTab === 'active' && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Post First Problem</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProblems.map(problem => {
            const urg = URGENCY_STYLES[String(problem.urgency || 'medium').toLowerCase()] || URGENCY_STYLES.medium;
            const isMultiOrg = (problem as any).allow_multiple_orgs !== false;
            return (
              <div
                key={problem.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#095c54]/40 transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Photo Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {problem.image_url ? (
                      <img src={problem.image_url} alt={problem.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        No Site Photo
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${urg.badge}`}>
                        {urg.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        isSolvedProblem(problem)
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-white/95 text-[#095c54] border-white'
                      }`}>
                        {isSolvedProblem(problem) ? 'Solved & Verified' : problem.status === 'open' ? 'Open' : problem.status}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/65 text-white backdrop-blur-xs flex items-center gap-1">
                        {isMultiOrg ? <Layers className="w-3 h-3 text-emerald-300" /> : <Lock className="w-3 h-3 text-amber-300" />}
                        <span>{isMultiOrg ? 'Multi-Org Allowed' : 'Exclusive Org'}</span>
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="text-base font-black leading-snug line-clamp-1">{problem.title}</h3>
                      <p className="text-[11px] text-white/90 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-emerald-300" />
                        <span className="truncate">{problem.location_name || problem.address}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3.5">
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {problem.description}
                    </p>

                    {/* Action Plan Box */}
                    <div className="p-3.5 rounded-2xl bg-[#f7f9f8] border border-[#cde6df] space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#095c54] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Action Plan for Organizations
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                        {problem.action_plan}
                      </p>
                    </div>

                    {/* Volunteers & Equipment */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#0f2925]">
                        <Users className="w-3.5 h-3.5 text-[#095c54]" />
                        {problem.estimated_volunteers_needed || 20} Volunteers Needed
                      </span>
                      {problem.claimed_by_community_name && (
                        <span className="text-[11px] font-bold text-[#095c54] bg-[#f0f7f5] px-2.5 py-0.5 rounded-full border border-[#cde6df] truncate max-w-[180px]">
                          Claimed: {problem.claimed_by_community_name}
                        </span>
                      )}
                    </div>

                    {Array.isArray(problem.suggested_equipment) && problem.suggested_equipment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {problem.suggested_equipment.slice(0, 4).map((eq, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {eq}
                          </span>
                        ))}
                        {problem.suggested_equipment.length > 4 && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            +{problem.suggested_equipment.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-[#f7f9f8] border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Ward {problem.ward_number || wardNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    {problem.status !== 'open' && (
                      <button
                        type="button"
                        onClick={() => handleReopen(problem.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#095c54] border border-emerald-200 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(problem.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Problem</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
