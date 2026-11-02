import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCw,
  Flame,
  ArrowRight,
  CheckCircle2,
  Building,
  HeartHandshake
} from 'lucide-react';
import { CommunityProblem, Community } from '../../types/index.js';
import { api } from '../../services/api.js';
import { Language } from '../../i18n/translations.js';

interface CommunityWardProblemsViewProps {
  community: Community | null;
  lang: Language;
  onPlanDriveForProblem: (problem: CommunityProblem) => void;
}

export const CommunityWardProblemsView: React.FC<CommunityWardProblemsViewProps> = ({
  community,
  onPlanDriveForProblem
}) => {
  const [problems, setProblems] = useState<CommunityProblem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const targetWard = wardFilter === 'all' ? undefined : parseInt(wardFilter, 10);
      const res = await api.getCommunityWardProblems(targetWard);
      if (res.success && res.data) {
        setProblems(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load ward problems for community:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [wardFilter]);

  const handleAdoptAndPlan = async (problem: CommunityProblem) => {
    setClaimingId(problem.id);
    try {
      await api.claimCommunityWardProblem(problem.id);
      setSuccessBanner(`You have adopted "${problem.title}"! Redirecting to plan community cleanliness drive...`);
      setTimeout(() => {
        onPlanDriveForProblem(problem);
      }, 1000);
    } catch (err: any) {
      console.error('Error claiming problem:', err);
      onPlanDriveForProblem(problem);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#095c54] to-[#128c7e] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-3">
            <HeartHandshake className="w-3.5 h-3.5" />
            Civic Partnership · Ward {community?.ward_number || 3}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Ward Problems for Community Action
          </h1>
          <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed">
            These civic issues have been flagged by Municipal Ward Officers specifically for community-led volunteer intervention.
            Review the problem, inspect the officer's recommended action plan, and adopt the issue to organize a citizen cleanliness drive.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-1.5 backdrop-blur-xs border border-white/20">
              <span className="text-xs font-bold text-emerald-100">Ward Filter:</span>
              <select
                value={wardFilter}
                onChange={e => setWardFilter(e.target.value)}
                className="bg-emerald-950/40 text-white font-bold text-xs rounded-xl px-2.5 py-1 outline-none border border-white/20"
              >
                <option value="all" className="bg-[#095c54] text-white">All Wards (Entire Navsari)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
                  <option key={w} value={String(w)} className="bg-[#095c54] text-white">Ward {w}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchProblems}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition backdrop-blur-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Problems
            </button>
          </div>
        </div>

        <Sparkles className="absolute right-6 -bottom-6 w-44 h-44 text-white/10 pointer-events-none" />
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* 2. Problems List */}
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
          <h3 className="text-lg font-black text-[#0f2925]">No Pending Civic Problems for Action</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your Ward Officer has not posted any unresolved community problems at this moment. You can still initiate your own independent cleanliness drives under the Activities tab!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {problems.map(prob => {
            const isClaimedByMe = prob.claimed_by_community_id === community?.id;
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

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
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Issue Description
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        {prob.description}
                      </p>
                    </div>

                    {/* What Should Be Done */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Officer's Recommended Action Plan
                      </span>
                      <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                        {prob.action_plan}
                      </p>
                    </div>

                    {/* Volunteers & Equipment */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Users className="w-4 h-4 text-[#095c54]" />
                        <span>Recommended Volunteers: <strong>{prob.estimated_volunteers_needed}</strong></span>
                      </div>

                      {prob.claimed_by_community_name && (
                        <div className="flex items-center gap-1 text-blue-700 font-bold">
                          <Building className="w-3.5 h-3.5" />
                          <span>{isClaimedByMe ? 'Adopted by your group' : `Adopted by ${prob.claimed_by_community_name}`}</span>
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

                {/* Footer Action Button */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Posted by: {prob.officer_name || 'Ward Officer'}
                  </span>

                  <button
                    onClick={() => handleAdoptAndPlan(prob)}
                    disabled={claimingId === prob.id}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs sm:text-sm shadow-sm hover:bg-[#074741] transition active:scale-95 disabled:opacity-50"
                  >
                    <span>Plan Cleanliness Drive</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

