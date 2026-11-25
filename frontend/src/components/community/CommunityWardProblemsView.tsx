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
  HeartHandshake,
  ExternalLink
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
        const activeOnly = res.data.filter((p: any) => {
          const st = String(p.status || 'open').toLowerCase();
          return st !== 'completed' && st !== 'resolved';
        });
        setProblems(activeOnly);
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
      {/* 1. Clean Header (Removed bulky banner box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
            Ward Problems for Community Action
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-bold text-slate-600">Ward Filter:</span>
            <select
              value={wardFilter}
              onChange={e => setWardFilter(e.target.value)}
              className="bg-white text-slate-800 font-bold text-xs rounded-lg px-2 py-1 outline-none border border-slate-200"
            >
              <option value="all">All Wards (Entire Navsari)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(w => (
                <option key={w} value={String(w)}>Ward {w}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchProblems}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh Problems"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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
      ) : (() => {
        // Single vs Multi-Org visibility filter:
        // If single organization and claimed by another community after approval, hide it from other communities!
        const visibleProblems = problems.filter(prob => {
          const isSingleOrg = (prob as any).allow_multiple_orgs === false;
          const isClaimedByOther = (prob.status === 'claimed' || prob.status === 'in_progress' || prob.status === 'resolved') &&
            prob.claimed_by_community_id &&
            prob.claimed_by_community_id !== community?.id;
          if (isSingleOrg && isClaimedByOther) {
            return false;
          }
          return true;
        });

        if (visibleProblems.length === 0) {
          return (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#0f2925]">No Pending Civic Problems for Action</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Your Ward Officer has not posted any unresolved community problems at this moment. You can still initiate your own independent cleanliness drives under the Activities tab!
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {visibleProblems.map(prob => {
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
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-emerald-100 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{prob.location_name} · {prob.address}</span>
                        </p>
                        {((prob as any).location_url || (prob.latitude && prob.longitude)) && (
                          <a
                            href={(prob as any).location_url || `https://www.google.com/maps?q=${prob.latitude},${prob.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-300 hover:text-white underline font-bold shrink-0 flex items-center gap-0.5 bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-xs"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
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
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Posted by: {prob.officer_name || 'Ward Officer'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      (prob as any).allow_multiple_orgs === false
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {(prob as any).allow_multiple_orgs === false ? 'Single Org Exclusive' : 'Multi-Org Open'}
                    </span>
                  </div>

                  {prob.status === 'resolved' || (prob.status && prob.status !== 'open' && (prob as any).allow_multiple_orgs === false) ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        {prob.status === 'resolved'
                          ? 'Problem Resolved'
                          : prob.claimed_by_community_name
                          ? `Exclusive to ${prob.claimed_by_community_name}`
                          : 'Assigned Exclusively'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAdoptAndPlan(prob)}
                      disabled={claimingId === prob.id}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs sm:text-sm shadow-sm hover:bg-[#074741] transition active:scale-95 disabled:opacity-50"
                    >
                      <span>Plan Cleanliness Drive</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
};

