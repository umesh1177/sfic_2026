import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  Flame,
  Users
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardCleanlinessScore } from '../../types/index.js';

export const WardCleanlinessScoreView: React.FC = () => {
  const [scoreData, setScoreData] = useState<WardCleanlinessScore | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchScore = async () => {
    setLoading(true);
    try {
      const res = await api.getWardCleanlinessScore();
      setScoreData(res.data);
    } catch (err) {
      console.error('Failed to load cleanliness score:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
        <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500 mt-2">Computing Ward 3 Cleanliness Index...</p>
      </div>
    );
  }

  if (!scoreData) return null;

  const { current_score, previous_score, monthly_trend, components, formula_breakdown, inspection_coverage_pct, active_hotspots_count } = scoreData;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#095c54]" />
            <span>Ward Cleanliness Score Index</span>
          </h2>
        </div>

        <button
          onClick={fetchScore}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto"
          title="Recalculate score"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Score Gauge & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#095c54] to-[#064e43] text-white shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-200 uppercase tracking-wider">
              Composite Cleanliness Index
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              Grade A+
            </span>
          </div>

          <div className="py-2 text-center">
            <span className="text-6xl font-black tracking-tight">{current_score}</span>
            <span className="text-emerald-300 text-xl font-bold ml-1">/ 100</span>
            <p className="text-xs text-emerald-100 font-medium mt-2 flex items-center justify-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span>Up +{(current_score - previous_score).toFixed(1)} points from previous evaluation</span>
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs text-[11px] text-emerald-100 space-y-0.5">
            <span className="font-bold">Inspection Coverage:</span>
            <p className="font-extrabold text-white">{inspection_coverage_pct}% of Ward 3 Streets Inspected</p>
          </div>
        </div>

        {/* Formula & Method Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#095c54]" />
              <h3 className="text-sm font-extrabold text-[#0f2925]">Configurable Municipal Score Model</h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
              <span className="font-black text-[#095c54]">Score =</span> (0.40 × C) + (0.25 × H) + (0.20 × R) + (0.15 × P)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Calculated dynamically from physical ward sanitation inspections (C), recurring hotspot resolution rates (H), verified citizen complaint turnaround (R), and citizen participation in community drives (P).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-950">
            Active Breakdown: {formula_breakdown}
          </div>
        </div>
      </div>

      {/* 4 Component Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Component 1: Physical Cleanliness */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Weight: 40%</span>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Physical (C)
            </span>
          </div>
          <p className="text-2xl font-black text-[#0f2925]">{components.physical_cleanliness} <span className="text-xs text-slate-400">/ 100</span></p>
          <h4 className="text-xs font-extrabold text-[#095c54]">Physical Cleanliness Audit</h4>
          <p className="text-[11px] text-slate-500 leading-tight">
            Field audit score based on dustbin clearance, street sweeping, and road cleanliness.
          </p>
        </div>

        {/* Component 2: Hotspot Improvement */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Weight: 25%</span>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Hotspots (H)
            </span>
          </div>
          <p className="text-2xl font-black text-[#0f2925]">{components.hotspot_improvement} <span className="text-xs text-slate-400">/ 100</span></p>
          <h4 className="text-xs font-extrabold text-amber-900">Hotspot Mitigation Index</h4>
          <p className="text-[11px] text-slate-500 leading-tight">
            Resolution rate across {active_hotspots_count} recurring problem clusters in Dudhiya Talao.
          </p>
        </div>

        {/* Component 3: Verified Complaint Resolution */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Weight: 20%</span>
            <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Turnaround (R)
            </span>
          </div>
          <p className="text-2xl font-black text-[#0f2925]">{components.verified_resolution} <span className="text-xs text-slate-400">/ 100</span></p>
          <h4 className="text-xs font-extrabold text-blue-900">Verified Complaint SLA</h4>
          <p className="text-[11px] text-slate-500 leading-tight">
            Percentage of citizen complaints verified and resolved without overdue penalties.
          </p>
        </div>

        {/* Component 4: Community Participation */}
        <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Weight: 15%</span>
            <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Civic (P)
            </span>
          </div>
          <p className="text-2xl font-black text-[#0f2925]">{components.community_participation} <span className="text-xs text-slate-400">/ 100</span></p>
          <h4 className="text-xs font-extrabold text-purple-900">Citizen Participation</h4>
          <p className="text-[11px] text-slate-500 leading-tight">
            Volunteer turnouts in RWA cleanliness drives and community wall participation.
          </p>
        </div>
      </div>

      {/* Monthly Trend Chart Display */}
      <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-[#0f2925]">6-Month Cleanliness Score Trajectory</h3>
        <div className="grid grid-cols-6 gap-2 text-center">
          {monthly_trend.map(item => (
            <div key={item.month} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between h-28">
              <span className="text-xs font-bold text-slate-500">{item.month}</span>
              <div className="w-full bg-slate-200 h-16 rounded-xl overflow-hidden flex flex-col justify-end">
                <div
                  className="bg-[#095c54] w-full rounded-t-md transition-all duration-500"
                  style={{ height: `${(item.score / 100) * 100}%` }}
                />
              </div>
              <span className="text-xs font-black text-[#0f2925]">{item.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

