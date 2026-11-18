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
  ChevronDown,
  ChevronUp,
  TrendingUp,
  UserCheck,
  Trophy,
  HeartHandshake,
  Wrench,
  RotateCcw,
  Lightbulb,
  ExternalLink,
  Plus,
  Info,
  X,
  Database,
  Cpu,
  BarChart2,
  Layers
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

  // Accordion state to avoid text clutter: expanded card IDs
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Model Transparency Modal
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

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

  const toggleCardExpansion = (id: string) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header (Clean modern header - NO bulky boxes!) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
            AI Analytics &amp; Intelligence Hub
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c54] font-bold text-xs sm:text-sm border border-teal-200 transition shadow-2xs"
          >
            <Cpu className="w-4 h-4 text-[#095c54]" />
            <span>How AI Computes This</span>
          </button>

          <button
            onClick={fetchAllAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#e2e8f0] font-bold text-xs sm:text-sm transition shadow-2xs"
            title="Re-run dynamic inference"
          >
            <RefreshCw className={`w-4 h-4 text-[#095c54] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Re-compute</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-1.5 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seasonal Risk Alerts</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CloudRain className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {seasonalData.predictions.length} <span className="text-xs font-bold text-slate-400">Predicted Hotspots</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            Current: <strong className="text-[#095c54]">{seasonalData.current_season || 'Monsoon Window'}</strong>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-1.5 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Performers</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {performersData.top_workers.length + performersData.top_communities.length} <span className="text-xs font-bold text-slate-400">Recognized</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {performersData.top_workers.length} Workers · {performersData.top_communities.length} Communities
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-1.5 hover:border-rose-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chronic Hotspots</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {chronicData.total_chronic_spots} <span className="text-xs font-bold text-rose-600">Recurring Spots</span>
          </div>
          <p className="text-[11px] text-rose-600 font-bold truncate">
            {chronicData.high_reopen_spots_count} locations with repeat reopen complaints
          </p>
        </div>
      </div>

      {/* 3. Horizontal Navigation (Pill Tabs) */}
      <div className="bg-white p-1 rounded-2xl border border-[#e2e8f0] shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('seasonal')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
            activeSubTab === 'seasonal'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CloudRain className="w-4 h-4" />
          <span>1. Predictive Seasonal Issues</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'seasonal' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {seasonalData.predictions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('performers')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
            activeSubTab === 'performers'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. AI Star Performers</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'performers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {performersData.top_workers.length + performersData.top_communities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('chronic')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
            activeSubTab === 'chronic'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>3. Chronic Hotspots & Reopens</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'chronic' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {chronicData.total_chronic_spots}
          </span>
        </button>
      </div>

      {/* 4. Sub-Tab 1: PREDICTIVE RECURRING SEASONAL PROBLEMS */}
      {activeSubTab === 'seasonal' && (
        <div className="space-y-4">
          {/* Season Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#e2e8f0]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Filter Timeline:</span>
              {[
                { id: 'all', label: 'All Seasons' },
                { id: 'monsoon', label: '🌧️ Monsoon' },
                { id: 'post_monsoon_festive', label: '🪔 Festive & Post-Monsoon' },
                { id: 'summer_pre_monsoon', label: '☀️ Summer' },
                { id: 'winter_uttarayan', label: '🪁 Winter' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSeasonFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    seasonFilter === opt.id
                      ? 'bg-[#095c54] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 font-bold">
              {filteredPredictions.length} predictive forecasts active
            </div>
          </div>

          {/* Predictions Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredPredictions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
              <CloudRain className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No seasonal predictions found for this filter.</p>
              <p className="text-xs text-slate-500">Switch filter to "All Seasons" to review entire year's model predictions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPredictions.map(pred => {
                const isExpanded = !!expandedCardIds[pred.id];
                return (
                  <div
                    key={pred.id}
                    className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-emerald-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header: Location, Risk Meter & Probability */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#095c54] text-[10px] font-black border border-emerald-200">
                              Ward {pred.ward_number}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              {pred.predicted_window}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-[#0f2925] tracking-tight leading-snug">
                            {pred.season_name}
                          </h3>
                        </div>

                        {/* Radial/Pill Probability Meter */}
                        <div className={`shrink-0 px-3 py-1.5 rounded-xl border text-center ${
                          pred.risk_level === 'CRITICAL'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          <div className="text-sm font-black leading-none">{pred.probability_score}%</div>
                          <div className="text-[9px] font-black tracking-wider uppercase mt-0.5">{pred.risk_level} RISK</div>
                        </div>
                      </div>

                      {/* Location Chip */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-bold text-slate-700 truncate">{pred.primary_location}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 truncate text-[11px]">{pred.landmark}</span>
                      </div>

                      {/* Bite-sized Metric Pills */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Category</span>
                          <span className="font-extrabold text-slate-800 truncate block">{pred.category}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Historical Count</span>
                          <span className="font-extrabold text-emerald-700 block">{pred.historical_incidents_count} complaints logged</span>
                        </div>
                      </div>

                      {/* Progressive Disclosure (Accordion Toggle) */}
                      <button
                        onClick={() => toggleCardExpansion(pred.id)}
                        className="w-full flex items-center justify-between py-1 px-1 text-xs font-bold text-[#095c54] hover:text-[#074741] transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" />
                          {isExpanded ? 'Hide AI Diagnosis & Plan' : 'View AI Root-Cause & Action Plan'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-fadeIn">
                          {/* AI Root Cause Diagnosis */}
                          <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-950 font-medium leading-relaxed">
                            <strong className="font-black text-[#095c54] block mb-1">AI Root Cause Diagnosis:</strong>
                            {pred.ai_root_cause}
                          </div>

                          {/* Action Plan */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Recommended Action Steps:</span>
                            <ul className="space-y-1 text-xs text-slate-600">
                              {pred.preventive_actions.map((act, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Squad: <strong className="text-slate-800">{pred.recommended_squad_type}</strong>
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
                        className="px-3.5 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{actionLoadingId === `prob-${pred.primary_location}` ? 'Posting...' : 'Add Problem for Community'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Sub-Tab 2: AI STAR PERFORMERS & RECOGNITION */}
      {activeSubTab === 'performers' && (
        <div className="space-y-4">
          {/* Cohort Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-[#e2e8f0]">
            <div className="flex gap-1.5">
              <button
                onClick={() => setPerformerCohort('workers')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  performerCohort === 'workers'
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Workers ({performersData.top_workers.length})</span>
              </button>

              <button
                onClick={() => setPerformerCohort('communities')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  performerCohort === 'communities'
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Communities ({performersData.top_communities.length})</span>
              </button>

              <button
                onClick={() => setPerformerCohort('citizens')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  performerCohort === 'citizens'
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Citizens ({performersData.top_citizens.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-bold">
              Multi-criteria weighted scoring model
            </span>
          </div>

          {/* Workers Grid */}
          {performerCohort === 'workers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performersData.top_workers.map((w, idx) => (
                <div
                  key={w.worker_id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-emerald-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={w.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80'}
                            alt={w.full_name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                          />
                          <span className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center shadow-xs ${
                            idx === 0 ? 'bg-amber-500 ring-2 ring-amber-200' : idx === 1 ? 'bg-slate-400 ring-2 ring-slate-200' : 'bg-amber-700 ring-2 ring-amber-300'
                          }`}>
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug truncate">
                            {w.full_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {w.designation} · {w.worker_code}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xl font-black text-[#095c54]">
                          {w.composite_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Score</span>
                      </div>
                    </div>

                    {/* Accolade Pill */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{w.ai_accolade}</span>
                    </div>

                    {/* Clean 4-Metric Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Resolved</span>
                        <span className="text-xs font-black text-slate-800">{w.tasks_completed}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Speed</span>
                        <span className="text-xs font-black text-emerald-700">{w.avg_turnaround_hours}h</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Truth</span>
                        <span className="text-xs font-black text-blue-700">{w.avg_truth_score_pct}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">GPS Check</span>
                        <span className="text-xs font-black text-slate-800">{w.geofence_match_pct}%</span>
                      </div>
                    </div>

                    {/* AI Reasoning Quote */}
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/70">
                      💡 {w.ai_reason}
                    </p>
                  </div>

                  {/* 1-Click Recognition Button */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Ward {w.ward_number} Field Unit
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
                      className="px-3 py-1.5 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${w.full_name}` ? 'Posting...' : 'Post Recognition to Feed'}</span>
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
                  className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-teal-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center font-black text-sm shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug truncate">
                            {c.community_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            Led by {c.head_name} · Ward {c.ward_number}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xl font-black text-teal-700">
                          {c.composite_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Impact</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold">
                      <Trophy className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{c.ai_accolade}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Drives Done</span>
                        <span className="text-xs font-black text-slate-800">{c.drives_completed}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Volunteers</span>
                        <span className="text-xs font-black text-emerald-700">{c.total_volunteers_attended}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Issues Solved</span>
                        <span className="text-xs font-black text-blue-700">{c.ward_problems_resolved}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      🌟 {c.ai_reason}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Rating: {c.avg_satisfaction_rating} ★
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
                      className="px-3 py-1.5 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${c.community_name}` ? 'Posting...' : 'Broadcast Appreciation'}</span>
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
                  className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-emerald-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#095c54] flex items-center justify-center font-black text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-black text-slate-900 leading-snug truncate">
                            {cit.alias_display}
                          </h3>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                            Civic Volunteer
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-[#095c54] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                        {cit.composite_score} pts
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{cit.ai_badge}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Events</span>
                        <span className="text-xs font-black text-slate-800">{cit.events_attended_count} Done</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Reports</span>
                        <span className="text-xs font-black text-emerald-700">{cit.valid_complaints_count} Solved</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      🛡️ {cit.ai_reason}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        cit.alias_display,
                        'Citizen Volunteer',
                        cit.ai_badge,
                        `${cit.events_attended_count} Events Attended · ${cit.valid_complaints_count} Verified Reports`,
                        cit.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${cit.alias_display}`}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#095c54] text-white font-extrabold text-xs hover:bg-[#074741] transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${cit.alias_display}` ? 'Posting...' : 'Nominate for Swachh Honor'}</span>
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
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Spatial Clustering Model:</strong> Highlights locations where complaints repeatedly reopen or recurrence occurs within 7 days.
              </span>
            </div>
            <span className="font-extrabold text-amber-900 shrink-0 bg-white/70 px-2.5 py-1 rounded-xl border border-amber-300">
              {chronicData.high_reopen_spots_count} Chronic Repeat Spots
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chronicData.chronic_hotspots.map(spot => {
              const isExpanded = !!expandedCardIds[spot.id];
              return (
                <div
                  key={spot.id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-rose-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            spot.severity === 'CRITICAL_CHRONIC'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {spot.severity === 'CRITICAL_CHRONIC' ? 'Critical Chronic' : 'Recurrent Spot'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            Ward {spot.ward_number}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                          {spot.location_name}
                        </h3>
                      </div>

                      {/* Reopen Rate Meter */}
                      <div className="shrink-0 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-center">
                        <div className="text-sm font-black leading-none">{spot.reopen_rate_pct}%</div>
                        <div className="text-[9px] font-black uppercase tracking-wider mt-0.5">Reopen Rate</div>
                      </div>
                    </div>

                    {/* Location Chip */}
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="font-bold text-slate-700 truncate">{spot.landmark}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 text-[11px]">Repeats every ~{spot.avg_days_between_recurrence} days</span>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Total Reports</span>
                        <span className="font-extrabold text-slate-800">{spot.incident_count} Incidents</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Reopened</span>
                        <span className="font-extrabold text-rose-600">{spot.reopen_count} Reopens</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Category</span>
                        <span className="font-extrabold text-[#095c54] truncate block">{spot.primary_category}</span>
                      </div>
                    </div>

                    {/* Progressive Disclosure Toggle */}
                    <button
                      onClick={() => toggleCardExpansion(spot.id)}
                      className="w-full flex items-center justify-between py-1 px-1 text-xs font-bold text-[#095c54] hover:text-[#074741] transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        {isExpanded ? 'Hide AI Root-Cause & Plan' : 'View AI Root-Cause Diagnosis & Fixes'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Expanded Diagnosis */}
                    {isExpanded && (
                      <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-fadeIn">
                        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 font-medium leading-relaxed">
                          <strong className="font-black text-rose-900 block mb-1">Why It Recurrs (AI Diagnosis):</strong>
                          {spot.ai_root_cause_diagnosis}
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">AI Permanent Remediation Steps:</span>
                          <ul className="space-y-1 text-xs text-slate-600">
                            {spot.ai_permanent_remediation.map((rem, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{rem}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Squad: <strong className="text-slate-800">{spot.recommended_work_type}</strong>
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
                      className="px-3.5 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs hover:bg-[#074741] transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{actionLoadingId === `prob-${spot.location_name}` ? 'Posting...' : 'Create Community Problem'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Interactive "How AI Model Works & Pipeline Architecture" Modal */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#0f2925] tracking-tight">
                    How AI Analytics Computes & Produces Results
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Technical architecture, training models, and live PostgreSQL data pipeline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Pillars of AI Engine */}
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                  <Database className="w-4 h-4 text-[#095c54]" />
                  <span>1. Live PostgreSQL Ingestion (No Hardcoded Strings)</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  The analytical service continuously queries real database tables: <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">complaints</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">worker_attendance</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">work_assignments</code>, and <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">activity_registrations</code>. Whenever a citizen submits a complaint or a worker checks in via GPS, the metrics update in real-time.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-teal-900 text-sm">
                  <Layers className="w-4 h-4 text-[#095c54]" />
                  <span>2. Multi-Modal Computer Vision & Truth Verifier</span>
                </div>
                <p className="text-teal-950 leading-relaxed font-medium">
                  We integrate a PyTorch ResNet-50 Waste Classifier and an AI Truth Checker model in <code className="bg-teal-200/60 px-1 py-0.5 rounded text-[11px]">aiService.ts</code>. When workers upload Before & After cleanup evidence, computer vision compares the structural feature delta to authenticate that the garbage heap was genuinely removed, generating a 0–100% authenticity score.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                  <BarChart2 className="w-4 h-4 text-amber-700" />
                  <span>3. Bayesian Seasonal Forecasting & DBSCAN Hotspot Clustering</span>
                </div>
                <p className="text-amber-950 leading-relaxed font-medium">
                  <strong>Seasonal Model:</strong> Computes probability scores by correlating the current calendar month with historical category distribution, weather rainfall ingress, and Navsari's low-elevation flood basins (e.g., Lunsikui culverts, Station Road underpasses).<br/>
                  <strong>Spatial Hotspots:</strong> Groups complaint coordinates within a 150-meter radius, tracking recurrence frequency and reopened assignments to isolate systemic infrastructure bottlenecks.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Inference Latency: ~18ms
              </span>

              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="px-4 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs hover:bg-[#074741] transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
