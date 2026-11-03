import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  CloudRain,
  Award,
  AlertTriangle,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Send,
  Users,
  Check,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Trophy,
  HeartHandshake,
  Wrench,
  RotateCcw,
  Lightbulb,
  ExternalLink,
  Plus
} from 'lucide-react';
import { api } from '../../services/api.js';
import {
  SeasonalPrediction,
  WorkerPerformerSuggestion,
  CommunityPerformerSuggestion,
  CitizenPerformerSuggestion,
  ChronicHotspotSuggestion
} from '../../types/index.js';

interface WardAIAnalyticsProps {
  wardNumber: number;
}

export const WardAIAnalytics: React.FC<WardAIAnalyticsProps> = ({ wardNumber }) => {
  // Main horizontal sub-navigation: 'seasonal' | 'performers' | 'chronic'
  const [activeSubTab, setActiveSubTab] = useState<'seasonal' | 'performers' | 'chronic'>('seasonal');

  // Performers internal cohort filter: 'workers' | 'communities' | 'citizens'
  const [performerCohort, setPerformerCohort] = useState<'workers' | 'communities' | 'citizens'>('workers');

  // Seasonal filter: 'all' | 'monsoon' | 'post_monsoon_festive' | 'summer_pre_monsoon' | 'winter_uttarayan'
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  // State data
  const [loading, setLoading] = useState<boolean>(true);
  const [seasonalData, setSeasonalData] = useState<{
    current_season: string;
    forecast_month: string;
    predictions: SeasonalPrediction[];
  }>({
    current_season: '',
    forecast_month: '',
    predictions: []
  });

  const [performersData, setPerformersData] = useState<{
    top_workers: WorkerPerformerSuggestion[];
    top_communities: CommunityPerformerSuggestion[];
    top_citizens: CitizenPerformerSuggestion[];
  }>({
    top_workers: [],
    top_communities: [],
    top_citizens: []
  });

  const [chronicData, setChronicData] = useState<{
    total_chronic_spots: number;
    high_reopen_spots_count: number;
    chronic_hotspots: ChronicHotspotSuggestion[];
  }>({
    total_chronic_spots: 0,
    high_reopen_spots_count: 0,
    chronic_hotspots: []
  });

  // Action status state
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string>('');

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setActionError('');
    try {
      const [seasonalRes, performersRes, chronicRes] = await Promise.all([
        api.getAISeasonalPredictions(wardNumber),
        api.getAIPerformersSuggestions(wardNumber),
        api.getAIChronicHotspots(wardNumber)
      ]);

      if (seasonalRes?.success && seasonalRes.data) {
        setSeasonalData(seasonalRes.data);
      }
      if (performersRes?.success && performersRes.data) {
        setPerformersData(performersRes.data);
      }
      if (chronicRes?.success && chronicRes.data) {
        setChronicData(chronicRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load AI analytics:', err);
      setActionError(err.message || 'Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [wardNumber]);

  // Handle 1-Click AI Quick Actions
  const handleCreateCommunityProblemFromAI = async (
    title: string,
    category: string,
    location_name: string,
    landmark: string,
    description: string,
    action_required: string,
    latitude: number,
    longitude: number
  ) => {
    setActionLoadingId(`prob-${location_name}`);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.executeAIQuickAction('create_community_problem', {
        ward_number: wardNumber,
        title: `[AI Alert] Preemptive Cleanliness Drive: ${title}`,
        category,
        location_name,
        landmark,
        description,
        action_required,
        latitude,
        longitude
      });
      setActionSuccess(res.message || 'Challenge successfully dispatched to Community Heads!');
    } catch (err: any) {
      setActionError(err.message || 'Failed to dispatch community challenge');
    } finally {
      setActionLoadingId('');
    }
  };

  const handlePublishPerformerRecognition = async (
    heroName: string,
    heroRole: string,
    badgeTitle: string,
    achievementStats: string,
    reason: string
  ) => {
    setActionLoadingId(`recog-${heroName}`);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.executeAIQuickAction('publish_performer_recognition', {
        hero_name: heroName,
        hero_role: heroRole,
        badge_title: badgeTitle,
        title: `Municipal Cleanliness Star Recognition: ${heroName}`,
        description: reason,
        ward_number: wardNumber,
        ward_name: `Ward ${wardNumber} (Navsari)`,
        achievement_stats: achievementStats
      });
      setActionSuccess(res.message || 'Recognition posted to Posts feed for citizens & community heads!');
    } catch (err: any) {
      setActionError(err.message || 'Failed to broadcast recognition post');
    } finally {
      setActionLoadingId('');
    }
  };

  // Filter seasonal predictions
  const filteredPredictions = seasonalData.predictions.filter(pred => {
    if (seasonFilter === 'all') return true;
    return pred.season_code === seasonFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header (Clean flat header - NO bulky boxes!) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" />
            AI Civic Intelligence & Dynamic Predictive Analytics · Ward {wardNumber}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
            AI Analytics & Intelligence Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Dynamic forecasting of recurring seasonal issues · Real performance scoring for workers, communities & citizens · Chronic hotspot root-cause remediation
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={fetchAllAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#e2e8f0] font-bold text-xs sm:text-sm transition shadow-2xs"
            title="Re-run dynamic inference"
          >
            <RefreshCw className={`w-4 h-4 text-[#095c54] ${loading ? 'animate-spin' : ''}`} />
            <span>Re-compute AI Insights</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seasonal Risk Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CloudRain className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {seasonalData.predictions.length} High-Risk Hotspots
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Active Season: <span className="font-bold text-[#095c54]">{seasonalData.current_season || 'Monsoon Preparedness'}</span>
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Star Performers</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {performersData.top_workers.length + performersData.top_communities.length + performersData.top_citizens.length} Recognized
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {performersData.top_workers.length} Workers · {performersData.top_communities.length} Communities · {performersData.top_citizens.length} Citizens
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chronic & Reopen Hotspots</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {chronicData.total_chronic_spots} Recurring Spots
          </div>
          <p className="text-xs text-rose-600 font-bold">
            {chronicData.high_reopen_spots_count} locations with recurring reopened complaints
          </p>
        </div>
      </div>

      {/* 3. Horizontal Navigation (Pill Tabs) */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#e2e8f0] shadow-2xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSubTab('seasonal')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition ${
            activeSubTab === 'seasonal'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CloudRain className="w-4 h-4" />
          <span>1. Predictive Seasonal & Recurring Problems</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'seasonal' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {seasonalData.predictions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('performers')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition ${
            activeSubTab === 'performers'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. AI Star Performers & Recognition</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'performers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {performersData.top_workers.length + performersData.top_communities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('chronic')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition ${
            activeSubTab === 'chronic'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>3. Chronic Hotspots & Reopen Intelligence</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'chronic' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {chronicData.total_chronic_spots}
          </span>
        </button>
      </div>

      {/* 4. Sub-Tab 1: PREDICTIVE RECURRING SEASONAL PROBLEMS */}
      {activeSubTab === 'seasonal' && (
        <div className="space-y-4">
          {/* Season Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter by Season / Timeline:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All 4 Seasons' },
                  { id: 'monsoon', label: '🌧️ Monsoon (Jun - Sep)' },
                  { id: 'post_monsoon_festive', label: '🪔 Festive & Post-Monsoon (Oct - Nov)' },
                  { id: 'summer_pre_monsoon', label: '☀️ Summer Pre-Monsoon (Mar - May)' },
                  { id: 'winter_uttarayan', label: '🪁 Winter Uttarayan (Dec - Feb)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSeasonFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      seasonFilter === opt.id
                        ? 'bg-[#095c54] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Showing {filteredPredictions.length} predictive forecasts
            </div>
          </div>

          {/* Predictions Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredPredictions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
              <CloudRain className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No seasonal predictions found for this filter.</p>
              <p className="text-xs text-slate-500">Switch filter to "All 4 Seasons" to review entire year's model predictions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredPredictions.map(pred => (
                <div
                  key={pred.id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          pred.risk_level === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : pred.risk_level === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          {pred.risk_level} RISK · {pred.probability_score}% PROBABILITY
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                          Ward {pred.ward_number}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{pred.predicted_window}</span>
                      </div>
                    </div>

                    {/* Title & Category */}
                    <div>
                      <h3 className="text-base font-extrabold text-[#0f2925] tracking-tight">
                        {pred.season_name}
                      </h3>
                      <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-[#095c54]" />
                        <span>{pred.category}</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-bold">{pred.historical_incidents_count} verified historical complaints</span>
                      </div>
                    </div>

                    {/* Location Card */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-extrabold text-slate-800">{pred.primary_location}</p>
                          <p className="text-slate-500 font-medium">{pred.landmark} (GPS: {pred.latitude}, {pred.longitude})</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Root Cause Diagnosis */}
                    <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-900">
                        <BrainCircuit className="w-3.5 h-3.5 text-teal-700" />
                        <span>AI Root-Cause Analysis:</span>
                      </div>
                      <p className="text-xs text-teal-950 font-medium leading-relaxed">
                        {pred.ai_root_cause}
                      </p>
                    </div>

                    {/* Preventive Actions Checklist */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-extrabold text-slate-700 block">Recommended Preemptive Actions:</span>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {pred.preventive_actions.map((act, idx) => (
                          <li key={idx} className="flex items-start gap-2 font-medium">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-slate-500">
                      Recommended: <strong className="text-slate-800">{pred.recommended_squad_type}</strong>
                    </span>

                    <button
                      onClick={() => handleCreateCommunityProblemFromAI(
                        pred.season_name,
                        pred.category,
                        pred.primary_location,
                        pred.landmark,
                        `[AI Seasonal Risk Warning] ${pred.ai_root_cause}`,
                        pred.preventive_actions.join(' '),
                        pred.latitude,
                        pred.longitude
                      )}
                      disabled={actionLoadingId === `prob-${pred.primary_location}`}
                      className="px-3.5 py-2 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{actionLoadingId === `prob-${pred.primary_location}` ? 'Posting...' : 'Add Problem for Community'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Sub-Tab 2: AI STAR PERFORMERS & RECOGNITION */}
      {activeSubTab === 'performers' && (
        <div className="space-y-5">
          {/* Cohort Selector (Workers vs Communities vs Citizens) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Evaluation Cohort:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPerformerCohort('workers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                    performerCohort === 'workers'
                      ? 'bg-[#095c54] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sanitation Workers ({performersData.top_workers.length})</span>
                </button>

                <button
                  onClick={() => setPerformerCohort('communities')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                    performerCohort === 'communities'
                      ? 'bg-[#095c54] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Community Groups & Heads ({performersData.top_communities.length})</span>
                </button>

                <button
                  onClick={() => setPerformerCohort('citizens')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                    performerCohort === 'citizens'
                      ? 'bg-[#095c54] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Citizen Volunteers ({performersData.top_citizens.length})</span>
                </button>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Real-time calculations from verified PostgreSQL logs
            </span>
          </div>

          {/* Workers Grid */}
          {performerCohort === 'workers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performersData.top_workers.map((w, idx) => (
                <div
                  key={w.worker_id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={w.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80'}
                            alt={w.full_name}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                          />
                          <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            #{idx + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                            {w.full_name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {w.designation} · {w.worker_code}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Score</span>
                        <span className="text-2xl font-black text-[#095c54]">
                          {w.composite_score}<span className="text-xs text-slate-400 font-bold">/100</span>
                        </span>
                      </div>
                    </div>

                    {/* AI Accolade Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{w.ai_accolade}</span>
                    </div>

                    {/* Performance Metrics Breakdown */}
                    <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Completed</span>
                        <span className="text-xs font-extrabold text-slate-800">{w.tasks_completed}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Turnaround</span>
                        <span className="text-xs font-extrabold text-emerald-700">{w.avg_turnaround_hours}h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Truth Score</span>
                        <span className="text-xs font-extrabold text-blue-700">{w.avg_truth_score_pct}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Geofence</span>
                        <span className="text-xs font-extrabold text-slate-800">{w.geofence_match_pct}%</span>
                      </div>
                    </div>

                    {/* AI Reason Summary */}
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                      💡 {w.ai_reason}
                    </p>
                  </div>

                  {/* 1-Click Recognition Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold">
                      Ward {w.ward_number} Field Staff
                    </span>

                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        w.full_name,
                        w.designation,
                        w.ai_accolade,
                        `${w.tasks_completed} Tasks Resolved · ${w.avg_truth_score_pct}% Photo Truth Score`,
                        w.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${w.full_name}`}
                      className="px-3.5 py-2 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${w.full_name}` ? 'Broadcasting...' : 'Post Recognition to Feed'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Communities Grid */}
          {performerCohort === 'communities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performersData.top_communities.map((c, idx) => (
                <div
                  key={c.community_id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center font-black text-lg shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                            {c.community_name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Led by {c.head_name} · Ward {c.ward_number}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Impact</span>
                        <span className="text-2xl font-black text-teal-700">
                          {c.composite_score}<span className="text-xs text-slate-400 font-bold">/100</span>
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-extrabold">
                      <Trophy className="w-3.5 h-3.5 text-teal-600" />
                      <span>{c.ai_accolade}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Drives Done</span>
                        <span className="text-xs font-extrabold text-slate-800">{c.drives_completed}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Volunteers</span>
                        <span className="text-xs font-extrabold text-emerald-700">{c.total_volunteers_attended}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Issues Solved</span>
                        <span className="text-xs font-extrabold text-blue-700">{c.ward_problems_resolved}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      🌟 {c.ai_reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold">
                      Citizen Satisfaction: {c.avg_satisfaction_rating} ★
                    </span>

                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        c.community_name,
                        'Community Organization',
                        c.ai_accolade,
                        `${c.drives_completed} Drives · ${c.total_volunteers_attended} Citizen Volunteers`,
                        c.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${c.community_name}`}
                      className="px-3.5 py-2 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${c.community_name}` ? 'Broadcasting...' : 'Broadcast Appreciation'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Citizens Grid */}
          {performerCohort === 'citizens' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {performersData.top_citizens.map((cit, idx) => (
                <div
                  key={cit.citizen_id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#095c54] flex items-center justify-center font-black text-sm">
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                            {cit.alias_display}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Anonymous Citizen Steward
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-[#095c54] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {cit.composite_score} pts
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{cit.ai_badge}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Events Attended</span>
                        <span className="text-xs font-black text-slate-800">{cit.events_attended_count} Verified</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Valid Reports</span>
                        <span className="text-xs font-black text-emerald-700">{cit.valid_complaints_count} Resolved</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      🛡️ {cit.ai_reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        cit.alias_display,
                        'Citizen Volunteer',
                        cit.ai_badge,
                        `${cit.events_attended_count} Events Attended · ${cit.valid_complaints_count} Verified Reports`,
                        cit.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${cit.alias_display}`}
                      className="w-full px-3 py-2 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${cit.alias_display}` ? 'Broadcasting...' : 'Nominate for Swachh Citizen Honor'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Sub-Tab 3: CHRONIC HOTSPOTS & REOPEN INTELLIGENCE */}
      {activeSubTab === 'chronic' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Chronic Recurrence Clustering:</strong> Identifies locations where waste dumping returns within 7 days of cleanup or complaints have been officially reopened.
              </span>
            </div>
            <span className="font-extrabold text-amber-900 shrink-0">
              {chronicData.high_reopen_spots_count} Chronic High-Reopen Clusters
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {chronicData.chronic_hotspots.map(spot => (
              <div
                key={spot.id}
                className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        spot.severity === 'CRITICAL_CHRONIC'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        {spot.severity === 'CRITICAL_CHRONIC' ? 'CRITICAL CHRONIC' : 'RECURRENT SPOT'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold border border-rose-200">
                        {spot.reopen_rate_pct}% Reopen Rate
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-500">
                      Repeats every ~{spot.avg_days_between_recurrence} days
                    </div>
                  </div>

                  {/* Location Info */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {spot.location_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span>{spot.landmark}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-700">Ward {spot.ward_number}</span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Incidents</span>
                      <span className="text-xs font-black text-slate-800">{spot.incident_count} Reports</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Reopened Work</span>
                      <span className="text-xs font-black text-rose-600">{spot.reopen_count} Reopens</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Category</span>
                      <span className="text-xs font-black text-[#095c54] truncate block">{spot.primary_category}</span>
                    </div>
                  </div>

                  {/* Root Cause Diagnosis */}
                  <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-900">
                      <BrainCircuit className="w-3.5 h-3.5 text-rose-700" />
                      <span>Why This Spot Recurrs (AI Diagnosis):</span>
                    </div>
                    <p className="text-xs text-rose-950 font-medium leading-relaxed">
                      {spot.ai_root_cause_diagnosis}
                    </p>
                  </div>

                  {/* Permanent Remediation Actions */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-extrabold text-slate-700 block">AI Permanent Remediation Plan:</span>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {spot.ai_permanent_remediation.map((rem, idx) => (
                        <li key={idx} className="flex items-start gap-2 font-medium">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{rem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Quick Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-slate-500">
                    Squad Needed: <strong className="text-slate-800">{spot.recommended_work_type}</strong>
                  </span>

                  <button
                    onClick={() => handleCreateCommunityProblemFromAI(
                      `Chronic Cleanliness Solution: ${spot.location_name}`,
                      spot.primary_category,
                      spot.location_name,
                      spot.landmark,
                      `[AI Chronic Hotspot Warning - ${spot.reopen_rate_pct}% Reopen Rate] ${spot.ai_root_cause_diagnosis}`,
                      spot.ai_permanent_remediation.join(' '),
                      spot.latitude,
                      spot.longitude
                    )}
                    disabled={actionLoadingId === `prob-${spot.location_name}`}
                    className="px-3.5 py-2 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{actionLoadingId === `prob-${spot.location_name}` ? 'Posting...' : 'Create Community Problem'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
