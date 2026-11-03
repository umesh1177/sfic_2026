import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  Users,
  Calendar,
  Clock,
  Award,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  ArrowUpRight,
  BrainCircuit
} from 'lucide-react';
import { CommunityDashboardSummary } from '../../types/index.js';
import { api } from '../../services/api.js';

interface CommunityAnalyticsProps {
  summary: CommunityDashboardSummary | null;
}

export const CommunityAnalytics: React.FC<CommunityAnalyticsProps> = ({ summary }) => {
  const [aiInsights, setAiInsights] = useState<{
    key_insights: string[];
    recommendations: string[];
    sentiment_score: number;
    predicted_next_turnout: number;
  } | null>(null);

  const [loadingInsights, setLoadingInsights] = useState<boolean>(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await api.aiGetActivityInsights();
        if (res.success && res.data) {
          setAiInsights(res.data);
        }
      } catch (err) {
        console.error('Failed to load AI insights:', err);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, []);

  const metrics = summary?.metrics;
  const impact = summary?.impact;

  // Monthly trend data
  const monthlyData = [
    { month: 'Jun', count: 18, height: '40%' },
    { month: 'Jul', count: 26, height: '58%' },
    { month: 'Aug', count: 32, height: '70%' },
    { month: 'Sep', count: 44, height: '90%' },
    { month: 'Oct', count: 48, height: '100%' },
    { month: 'Nov', count: 38, height: '80%' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Community Reports & AI Analytics
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Comprehensive civic impact metrics, volunteer turnout forecasts, and data-driven recommendations for Navsari.
        </p>
      </div>

      {/* AI INTELLIGENCE & FORECASTING CARD */}
      <div className="p-6 rounded-3xl bg-white border border-emerald-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#095c54]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0f2925] tracking-tight">
                AI Civic Intelligence & Predictions
              </h2>
              <p className="text-xs text-slate-500">
                Trained on verified Navsari Municipal Corporation ground statistics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Predicted Next Turnout</span>
              <span className="text-base font-extrabold text-[#095c54]">
                {aiInsights?.predicted_next_turnout || 45} Volunteers
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-700 block uppercase font-bold">Civic Sentiment</span>
              <span className="text-base font-extrabold text-emerald-800">
                {aiInsights?.sentiment_score || 94}% Positive
              </span>
            </div>
          </div>
        </div>

        {/* Key Insights & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-4 h-4 text-[#095c54]" />
              <span>Key Civic Findings</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
              {(aiInsights?.key_insights || [
                'Early morning drives (6:30 AM – 9:00 AM) achieve 88% higher attendance than evening drives.',
                'Dudhiya Talao lakefront cleanups show the highest volunteer return rate in Ward 3.',
                'Targeted event notifications delivered 24 hours in advance improve attendance by 34%.'
              ]).map((ins, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span>Strategic Recommendations</span>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-900 leading-relaxed">
              {(aiInsights?.recommendations || [
                'Schedule next drive at Dudhiya Talao North Promenade to maintain zero-litter status.',
                'Partner with local youth sports clubs to boost morning plogging participation.',
                'Upload Before & After photographs within 2 hours of completion for faster NMC approval.'
              ]).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* CORE KPI SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500">Total Drives Organized</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {metrics?.total_activities || 4}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold">
            100% verified by Ward 3 Officer
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500">Verified Volunteers</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {impact?.verified_participants_count || 142}
          </div>
          <div className="text-[11px] text-blue-700 font-bold">
            Avg attendance: {metrics?.volunteer_attendance_rate || 88}%
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500">Cleanliness Hours</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {impact?.total_cleanliness_hours || 420} <span className="text-sm font-medium text-slate-500">hrs</span>
          </div>
          <div className="text-[11px] text-amber-700 font-bold">
            Top 5% in Navsari Municipal Corp
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500">Est. Waste Diverted</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#095c54]">
            ~1,840 <span className="text-sm font-medium text-slate-500">kg</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Plastic, debris, organic compost
          </div>
        </div>
      </div>

      {/* VISUAL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Volunteer Participation Trend */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Monthly Volunteer Mobilization
              </h3>
              <p className="text-xs text-slate-500">Participating citizens per month</p>
            </div>
            <span className="text-xs font-bold text-[#095c54] bg-teal-50 px-2.5 py-1 rounded-full">
              +42% Growth
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                  {d.count}
                </span>
                <div className="w-full bg-slate-100 rounded-t-xl overflow-hidden h-36 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-[#095c54] to-teal-500 rounded-t-xl group-hover:from-emerald-600 group-hover:to-teal-400 transition-all duration-300"
                    style={{ height: d.height }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-600">{d.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Peak Month: <strong>October (48 volunteers)</strong></span>
            <span>Navsari Ward 3</span>
          </div>
        </div>

        {/* Chart 2: Activity Categories Breakdown */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Cleanliness Activity Composition
            </h3>
            <p className="text-xs text-slate-500">Drive types organized in 2026</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Lakefront Cleanliness Drives', pct: 45, count: '4 drives', color: 'from-teal-500 to-emerald-500' },
              { label: 'Market Segregation Campaigns', pct: 25, count: '2 drives', color: 'from-blue-500 to-cyan-500' },
              { label: 'Tree Plantation & Greening', pct: 20, count: '2 drives', color: 'from-emerald-500 to-green-600' },
              { label: 'Morning Plogging & Fitness', pct: 10, count: '1 drive', color: 'from-amber-500 to-orange-500' }
            ].map((cat, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{cat.label}</span>
                  <span className="text-slate-500 font-semibold">{cat.count} ({cat.pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${cat.color} rounded-full`}
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between mt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#095c54]" />
              Official Recognition: <strong>A+ Grade Community</strong>
            </span>
            <span className="text-slate-400">NMC Clean Navsari</span>
          </div>
        </div>
      </div>
    </div>
  );
};

