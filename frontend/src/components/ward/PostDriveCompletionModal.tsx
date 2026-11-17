import React, { useState } from 'react';
import {
  Award,
  X,
  Building2,
  Sparkles,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';

export interface CompletedDriveForPost {
  id: string;
  title: string;
  ward_number: number;
  ward_name: string;
  location_name: string;
  participating_communities: string[];
  volunteers_count: number;
  registered_count?: number;
  photos?: { url: string; stage?: string; caption?: string }[];
  completion_posted?: boolean;
}

interface PostDriveCompletionModalProps {
  drive: CompletedDriveForPost;
  onClose: () => void;
  onPublished: (summaryMessage: string) => void;
}

export const PostDriveCompletionModal: React.FC<PostDriveCompletionModalProps> = ({
  drive,
  onClose,
  onPublished
}) => {
  const [title, setTitle] = useState<string>(`Cleanliness Drive Completed: ${drive.title}`);
  const [description, setDescription] = useState<string>(
    `Ward ${drive.ward_number} officially celebrates the successful completion of "${drive.title}" at ${drive.location_name}! Dedicated citizen volunteers and community leaders worked together to restore spotless civic hygiene. Official completion certificates and reward points have been issued to all participating volunteers and communities.`
  );
  const [communities, setCommunities] = useState<string[]>(
    drive.participating_communities && drive.participating_communities.length > 0
      ? drive.participating_communities
      : ['Community Volunteers']
  );
  const [newCommunityInput, setNewCommunityInput] = useState<string>('');
  const [citizenPoints, setCitizenPoints] = useState<number>(150);
  const [communityPoints, setCommunityPoints] = useState<number>(300);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCommunity = () => {
    const trimmed = newCommunityInput.trim();
    if (trimmed && !communities.includes(trimmed)) {
      setCommunities(prev => [...prev, trimmed]);
      setNewCommunityInput('');
    }
  };

  const handleRemoveCommunity = (idx: number) => {
    setCommunities(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please enter both a post title and completion summary.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.publishDriveCompletion(drive.id, {
        title: title.trim(),
        description: description.trim(),
        citizen_points: Number(citizenPoints) || 150,
        community_points: Number(communityPoints) || 300,
        custom_communities: communities
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#095c54', '#10b981', '#f59e0b']
        });
        onPublished(
          res.message ||
            'Drive completion posted! Certificates and points have been sent to all participating citizens and communities.'
        );
      } else {
        setError('Failed to publish drive completion.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish drive completion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#095c54] text-white px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">
                Post Drive Completion &amp; Issue Certificates
              </h3>
              <p className="text-[11px] text-emerald-100 font-semibold">
                {drive.ward_name} · {drive.location_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Automated Actions Summary */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <p className="font-black text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Publishing this completion post will automatically:</span>
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-medium text-emerald-900">
              <li>Publish an official NMC Completion Post on Citizen, Community &amp; Officer feeds listing all participating communities below.</li>
              <li>Send an <strong>Official Completion Certificate</strong> + <strong>+{citizenPoints} Civic Karma Points</strong> in Notifications to all <strong>{drive.volunteers_count || drive.registered_count || 0} participated citizen(s)</strong>.</li>
              <li>Send an <strong>Official Community Certificate</strong> + <strong>+{communityPoints} Community Points</strong> in Notifications to each participating community.</li>
            </ul>
          </div>

          {/* Post Title */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1">
              Completion Post Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#095c54]"
            />
          </div>

          {/* Post Description */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1">
              Completion Summary &amp; Appreciation Message *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-[#095c54]"
            />
          </div>

          {/* Participating Communities Listed Below Post */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#095c54]" />
              <span>Participating Communities Listed Below Post ({communities.length})</span>
            </label>

            <div className="flex flex-wrap gap-2">
              {communities.map((cName, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-emerald-300 text-xs font-extrabold text-[#095c54] shadow-2xs"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{cName}</span>
                  {communities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCommunity(idx)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCommunityInput}
                onChange={e => setNewCommunityInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCommunity();
                  }
                }}
                placeholder="Add another partner community name (optional)..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#095c54]"
              />
              <button
                type="button"
                onClick={handleAddCommunity}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Points Rewards Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <label className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Points per Citizen Volunteer</span>
              </label>
              <input
                type="number"
                min={10}
                max={2000}
                step={10}
                value={citizenPoints}
                onChange={e => setCitizenPoints(parseInt(e.target.value, 10) || 150)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm font-black text-amber-950 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-amber-800 font-semibold">
                Sent with certificate to {drive.volunteers_count || drive.registered_count || 0} volunteer(s)
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
              <label className="text-[11px] font-black uppercase text-indigo-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Points per Participating Community</span>
              </label>
              <input
                type="number"
                min={25}
                max={5000}
                step={25}
                value={communityPoints}
                onChange={e => setCommunityPoints(parseInt(e.target.value, 10) || 300)}
                className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-sm font-black text-indigo-950 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-indigo-800 font-semibold">
                Sent with certificate to {communities.length} community partner(s)
              </p>
            </div>
          </div>

          {/* Evidence Photos Preview (if available) */}
          {drive.photos && drive.photos.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                Attached Drive Evidence Photos ({drive.photos.length})
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {drive.photos.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={p.url} alt={p.caption || 'Evidence'} className="w-full h-full object-cover" />
                    {p.stage && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-white text-[9px] font-bold uppercase">
                        {p.stage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <span>Publishing &amp; Sending Certificates...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Completion &amp; Issue Certificates</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

