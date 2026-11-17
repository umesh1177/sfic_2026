import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Send,
  Plus,
  Trash2,
  MapPin,
  Users,
  Wrench,
  CheckCircle2,
  Calendar,
  Camera,
  Image as ImageIcon,
  Flame,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Upload
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
  'Large Biodegradable Trash Bags',
  'Metal Rakes & Shovels',
  'Bleaching Powder Disinfectant',
  'Safety Reflective Vests',
  'Wheelbarrows / Push Carts',
  'Awareness Banners & Signboards',
  'First Aid Kit'
];

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

  // Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [address, setAddress] = useState<string>(`Ward ${wardNumber}, Navsari Civic Area`);
  const [latitude, setLatitude] = useState<number>(20.9470);
  const [longitude, setLongitude] = useState<number>(72.9280);
  const [actionPlan, setActionPlan] = useState<string>('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [volunteersNeeded, setVolunteersNeeded] = useState<number>(20);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'Heavy Duty Brooms',
    'Protective Rubber Gloves',
    'Large Biodegradable Trash Bags'
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
    fetchProblems();
  }, [wardNumber]);

  const toggleEquipment = (item: string) => {
    setSelectedEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !actionPlan.trim()) {
      setErrorMsg('Please complete all required fields: title, issue description, and action plan.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.addWardCommunityProblem({
        ward_number: wardNumber,
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim() || `Ward ${wardNumber} Focus Area`,
        latitude,
        longitude,
        address: address.trim(),
        action_plan: actionPlan.trim(),
        urgency,
        estimated_volunteers_needed: volunteersNeeded,
        suggested_equipment: selectedEquipment,
        image_url: imageUrl.trim()
      });

      if (res.success) {
        setSuccessMsg('Civic problem posted successfully! Community Heads will now see it in their dashboard.');
        setIsCreateOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setActionPlan('');
        setLocationName('');
        fetchProblems();
        setTimeout(() => setSuccessMsg(null), 6000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post civic problem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await api.reopenWardCommunityProblem(id);
      setSuccessMsg('Civic problem reopened! It is now available for all community groups to adopt.');
      fetchProblems();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not reopen problem.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this posted problem?')) return;
    try {
      await api.deleteWardCommunityProblem(id);
      setProblems(prev => prev.filter(p => p.id !== id));
      setSuccessMsg('Problem listing removed.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not remove problem.');
    }
  };

  if (isCreateOpen) {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Full Screen Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Problems List</span>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0f2925]">
                Add Problem for Community Cleanliness Drive
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Flagging civic problem for voluntary Community Head drives in Ward {wardNumber} (Navsari)
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Full Screen Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Heavy Plastic & Silt Dumping along Dudhiya Lake Shore"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                    Problem Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the condition, safety issues, and impact on local residents..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-emerald-800 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    What Should Be Done (Action Plan for Community Drive) *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="e.g., Organize a 30-volunteer morning drive. Clear plastic bottles and wrappers from the pedestrian promenade, bag organic weeds, wash corners with bleaching powder, and plant 10 flowering saplings."
                    value={actionPlan}
                    onChange={e => setActionPlan(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 text-sm focus:border-[#095c54] focus:ring-2 focus:ring-[#095c54]/20 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                      Location Landmark *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Near Lakeview Gazebo, Gate 2"
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#095c54] font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                      Street Address / Sector
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#095c54] font-medium"
                    />
                  </div>
                </div>

                {/* Interactive Map Location Picker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                    Pinpoint Exact Location on Map *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Click on the map or drag the pin. This geographic locus will be visible to Community Heads & Citizens for GPS attendance verification.
                  </p>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                    <MiniMapLocationPicker
                      initialLat={latitude}
                      initialLng={longitude}
                      onLocationChange={(lat, lng, ward, snippet) => {
                        setLatitude(lat);
                        setLongitude(lng);
                        if (snippet && !locationName) {
                          setLocationName(snippet);
                        }
                      }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </div>
                </div>
              </div>

              {/* Right Column: Parameters & Evidence */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                      Urgency Level
                    </label>
                    <select
                      value={urgency}
                      onChange={e => setUrgency(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:border-[#095c54]"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Urgency</option>
                      <option value="critical">Critical / Health Hazard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                      Estimated Volunteers Needed
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={150}
                      value={volunteersNeeded}
                      onChange={e => setVolunteersNeeded(parseInt(e.target.value, 10) || 15)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:border-[#095c54]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                    Suggested Equipment & Tools
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_EQUIPMENT_OPTIONS.map(item => {
                      const isSelected = selectedEquipment.includes(item);
                      return (
                        <button
                          type="button"
                          key={item}
                          onClick={() => toggleEquipment(item)}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#095c54] text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                    Problem Evidence Photo
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="Enter Image URL or upload below..."
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-[#095c54]"
                    />
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                  {imageUrl && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={imageUrl} alt="Problem Evidence" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-6 py-2.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 rounded-2xl bg-[#095c54] text-white font-black text-sm shadow-md hover:bg-[#074741] transition disabled:opacity-50"
              >
                {submitting ? 'Publishing Problem...' : <><Send className="h-4 w-4" /> Publish Problem for Community Drives</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Clean Header (Removed bulky banner box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            Ward {wardNumber} · Community Action Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
            Add Problem for Community Cleanliness Drive
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Post civic cleanliness challenges directly to registered Community Heads and RWAs in Navsari.
            Outline the issue, upload evidence photos, and specify what action should be taken so citizen volunteers can organize weekend drives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#095c54] text-white font-extrabold text-xs sm:text-sm shadow-xs hover:bg-[#074741] transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Post New Problem for Community</span>
          </button>
          <button
            onClick={fetchProblems}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Problems List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-[#0f2925]">No Active Problems Posted for Ward {wardNumber}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            When you notice chronic garbage spots, overgrown shrubs, or lakefront debris that can be cleaned through a community drive, post them here.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#095c54] text-white font-black text-sm shadow hover:bg-[#074741] transition"
          >
            <Plus className="w-4 h-4" />
            Add First Civic Problem
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {problems.map(prob => {
            const isUrgentHigh = prob.urgency === 'high' || prob.urgency === 'critical';
            return (
              <div
                key={prob.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Photo Banner with Urgency & Status Badges */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={prob.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80'}
                      alt={prob.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          prob.urgency === 'critical'
                            ? 'bg-rose-600 text-white'
                            : prob.urgency === 'high'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        {prob.urgency} Urgency
                      </span>

                      <span className="px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs text-xs font-bold">
                        Ward {prob.ward_number}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                          prob.status === 'claimed'
                            ? 'bg-blue-600 text-white'
                            : prob.status === 'resolved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {prob.status === 'claimed' ? 'Drive Planned' : prob.status}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="text-base sm:text-lg font-black leading-tight drop-shadow-sm">
                        {prob.title}
                      </h3>
                      <p className="text-xs text-emerald-100 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {prob.location_name} · {prob.address}
                      </p>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-4">
                    {/* Description */}
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Issue Description
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        {prob.description}
                      </p>
                    </div>

                    {/* What Should Be Done */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        What Should Be Done (Action Plan)
                      </span>
                      <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                        {prob.action_plan}
                      </p>
                    </div>

                    {/* Volunteers & Equipment */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Users className="w-4 h-4 text-[#095c54]" />
                        <span>Volunteers Needed: <strong>{prob.estimated_volunteers_needed}</strong></span>
                      </div>

                      {prob.claimed_by_community_name && (
                        <div className="flex items-center gap-1 text-blue-700 font-bold">
                          <Building className="w-3.5 h-3.5" />
                          <span>Claimed by: {prob.claimed_by_community_name}</span>
                        </div>
                      )}
                    </div>

                    {prob.suggested_equipment && prob.suggested_equipment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {prob.suggested_equipment.map((eq, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Posted by: {prob.officer_name || officerName}
                  </span>

                  <div className="flex items-center gap-2">
                    {prob.status && prob.status !== 'open' && (
                      <button
                        type="button"
                        onClick={() => handleReopen(prob.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition"
                        title="Reopen problem so other communities can plan a drive"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reopen Problem</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(prob.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
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
