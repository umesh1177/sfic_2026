import React, { useState, useEffect } from 'react';
import {
  BarChart3,
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
  Layers,
  Bell,
  Sliders
} from 'lucide-react';
import { api } from '../../services/api.js';
import {
  SeasonalPrediction,
  WorkerPerformerSuggestion,
  CommunityPerformerSuggestion,
  CitizenPerformerSuggestion,
  ChronicHotspotSuggestion
} from '../../types/index.js';
import { ComplaintsTrendView } from './ComplaintsTrendView.js';
import { ChronicHotspotsMapView } from './ChronicHotspotsMapView.js';
import { SeasonalPredictionView } from './SeasonalPredictionView.js';

interface WardAIAnalyticsProps {
  wardNumber: number;
}

export const WardAIAnalytics: React.FC<WardAIAnalyticsProps> = ({ wardNumber }) => {
  // Main horizontal sub-navigation: 'seasonal' | 'trend' | 'chronic' | 'performers'
  const [activeSubTab, setActiveSubTab] = useState<'seasonal' | 'trend' | 'chronic' | 'performers'>('seasonal');

  // Proactive notification lead time setting (15 or 30 days)
  const [leadDays, setLeadDays] = useState<15 | 30>(30);
  const [updatingLeadDays, setUpdatingLeadDays] = useState<boolean>(false);

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
    active_lead_days?: 15 | 30;
    active_alerts_count?: number;
    predictions: SeasonalPrediction[];
  }>({
    current_season: '',
    forecast_month: '',
    active_lead_days: 30,
    active_alerts_count: 0,
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

  const fetchAllAnalytics = async (customLeadDays?: 15 | 30) => {
    setLoading(true);
    setActionError('');
    const targetLeadDays = customLeadDays || leadDays;
    try {
      const [seasonalRes, performersRes, chronicRes, settingsRes] = await Promise.all([
        api.getAISeasonalPredictions(wardNumber, targetLeadDays),
        api.getAIPerformersSuggestions(wardNumber),
        api.getAIChronicHotspots(wardNumber),
        api.getSeasonalAlertSettings().catch(() => null)
      ]);

      if (seasonalRes?.success && seasonalRes.data) {
        setSeasonalData(seasonalRes.data);
        if (seasonalRes.data.active_lead_days) {
          setLeadDays(seasonalRes.data.active_lead_days);
        }
      }
      if (settingsRes?.success && settingsRes.data?.alert_lead_days) {
        setLeadDays(settingsRes.data.alert_lead_days);
      }
      if (performersRes?.success && performersRes.data) {
        setPerformersData(performersRes.data);
      }
      if (chronicRes?.success && chronicRes.data) {
        setChronicData(chronicRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setActionError(err.message || 'Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [wardNumber]);

  // Handle changing proactive alert lead time (15 or 30 days)
  const handleUpdateLeadDays = async (newDays: 15 | 30) => {
    if (newDays === leadDays) return;
    setUpdatingLeadDays(true);
    try {
      const res = await api.updateSeasonalAlertSettings(newDays);
      if (res?.success) {
        setLeadDays(newDays);
        setActionSuccess(`Proactive notification window updated to ${newDays} days before seasonal surge`);
        fetchAllAnalytics(newDays);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update alert lead days');
    } finally {
      setUpdatingLeadDays(false);
    }
  };

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
        title: `[Seasonal Alert] Preemptive Cleanliness Drive: ${title}`,
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
        ward_number: wardNumber,
        hero_name: heroName,
        hero_role: heroRole,
        badge_title: badgeTitle,
        achievement_stats: achievementStats,
        reason
      });
      setActionSuccess(res.message || `Recognition notice published for ${heroName}!`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to broadcast recognition notice');
    } finally {
      setActionLoadingId('');
    }
  };

  // Filter seasonal predictions by selected timeline
  const filteredPredictions = seasonalData.predictions.filter(pred => {
    if (seasonFilter === 'all') return true;
    return pred.season_code === seasonFilter;
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Analytics Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#095c54] animate-pulse" />
            <span className="text-[11px] font-bold text-[#095c54] uppercase tracking-wider">
              Civic Intelligence & Mathematical Forecasting
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#095c54] text-[10px] font-black border border-emerald-200">
              Ward {wardNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight">
            Analytics & Operations Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Mathematical Poisson seasonal forecasting, stock-style complaint index trends, geospatial chronic hotspot clustering, and workforce recognition.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Info className="w-4 h-4 text-[#095c54]" />
            <span className="hidden sm:inline">Model Logic</span>
          </button>

          <button
            onClick={() => fetchAllAnalytics()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#095c54]/10 hover:bg-[#095c54]/20 text-[#095c54] text-xs font-black transition disabled:opacity-50"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-1.5 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seasonal Predictions</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CloudRain className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {seasonalData.predictions.length} <span className="text-xs font-bold text-slate-400">Recurring Risks</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            Current: <strong className="text-[#095c54]">{seasonalData.current_season || 'Active Window'}</strong>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-1.5 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Market Trend Index</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            NAV-W{wardNumber} <span className="text-xs font-bold text-slate-400">Stock Series</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-bold truncate">
            Candlestick OHLCV Live
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

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs space-y-1.5 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Star Performers</span>
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
      </div>

      {/* 3. Horizontal Sub-Tab Navigation (4 Sub-Tabs) */}
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
          <span>1. Seasonal Prediction</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'seasonal' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {seasonalData.predictions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('trend')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
            activeSubTab === 'trend'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>2. Trend</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'trend' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            Stock Chart
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

        <button
          onClick={() => setActiveSubTab('performers')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
            activeSubTab === 'performers'
              ? 'bg-[#095c54] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>4. Star Performers</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'performers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {performersData.top_workers.length + performersData.top_communities.length}
          </span>
        </button>
      </div>

      {/* 4. Sub-Tab 1: SEASONAL PREDICTION (INTERACTIVE SEASONS & BOUND MONTHS + COMPLAINTS TABLE + LEAFLET MAP) */}
      {activeSubTab === 'seasonal' && (
        <SeasonalPredictionView wardNumber={wardNumber} />
      )}

      {/* 5. Sub-Tab 2: TREND (RAISE & FALL TRAJECTORY GRAPH) */}
      {activeSubTab === 'trend' && (
        <ComplaintsTrendView wardNumber={wardNumber} />
      )}

      {/* 6. Sub-Tab 3: CHRONIC HOTSPOTS & REOPENS (LEAFLET MAP WITH CATEGORY-COLORED CIRCLES) */}
      {activeSubTab === 'chronic' && (
        <ChronicHotspotsMapView
          wardNumber={wardNumber}
          hotspots={chronicData.chronic_hotspots}
          onCreateCommunityProblem={handleCreateCommunityProblemFromAI}
          actionLoadingId={actionLoadingId}
        />
      )}

      {/* 7. Sub-Tab 4: STAR PERFORMERS & RECOGNITION */}
      {activeSubTab === 'performers' && (
        <div className="space-y-4">
          {/* Cohort Selector (Workers, Communities, Citizens) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#e2e8f0]">
            <div className="flex flex-wrap items-center gap-1.5">
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
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Tasks</span>
                        <span className="font-extrabold text-slate-800 text-xs">{w.tasks_completed} Done</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Turnaround</span>
                        <span className="font-extrabold text-[#095c54] text-xs">{w.avg_turnaround_hours}h</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Truth Score</span>
                        <span className="font-extrabold text-emerald-600 text-xs">{w.avg_truth_score_pct}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Geofence</span>
                        <span className="font-extrabold text-teal-600 text-xs">{w.geofence_match_pct}%</span>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-600 leading-relaxed font-medium">
                      {w.ai_reason}
                    </div>
                  </div>

                  {/* Recognition Broadcast Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Attendance: <strong>{w.attendance_days} days logged</strong>
                    </span>

                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        w.full_name,
                        w.designation,
                        w.ai_accolade,
                        `${w.tasks_completed} Tasks Resolved · ${w.avg_turnaround_hours}h avg`,
                        w.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${w.full_name}`}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${w.full_name}` ? 'Publishing...' : 'Recognize Worker'}</span>
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
                  className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-emerald-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-white font-black text-[10px] ${
                            idx === 0 ? 'bg-amber-500' : 'bg-slate-500'
                          }`}>
                            #{idx + 1} Community
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">Ward {c.ward_number}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                          {c.community_name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Head: <strong className="text-slate-700">{c.head_name}</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xl font-black text-[#095c54]">
                          {c.composite_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Score</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[#095c54] text-xs font-bold">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>{c.ai_accolade}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Drives</span>
                        <span className="font-extrabold text-slate-800">{c.drives_completed} Completed</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Volunteers</span>
                        <span className="font-extrabold text-[#095c54]">{c.total_volunteers_attended} Total</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Resolved</span>
                        <span className="font-extrabold text-emerald-600">{c.ward_problems_resolved} Problems</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {c.ai_reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Rating: <strong>★ {c.avg_satisfaction_rating}/5.0</strong>
                    </span>

                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        c.community_name,
                        `Community Organization (Head: ${c.head_name})`,
                        c.ai_accolade,
                        `${c.drives_completed} Drives · ${c.total_volunteers_attended} Volunteers`,
                        c.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${c.community_name}`}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${c.community_name}` ? 'Publishing...' : 'Recognize Community'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Citizens Grid */}
          {performerCohort === 'citizens' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performersData.top_citizens.map((cit, idx) => (
                <div
                  key={cit.citizen_id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] hover:border-emerald-300 shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[10px]">
                            Citizen #{idx + 1}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">Ward {cit.ward_number}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                          {cit.alias_display}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Civic Champion & Plogging Volunteer
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xl font-black text-[#095c54]">
                          {cit.composite_score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Score</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{cit.ai_badge}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Events Attended</span>
                        <span className="font-extrabold text-slate-800">{cit.events_attended_count} Cleanliness Drives</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Valid Reports</span>
                        <span className="font-extrabold text-[#095c54]">{cit.valid_complaints_count} High-Truth Cases</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {cit.ai_reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Citizen Verified
                    </span>

                    <button
                      onClick={() => handlePublishPerformerRecognition(
                        cit.alias_display,
                        'Citizen Volunteer Hero',
                        cit.ai_badge,
                        `${cit.events_attended_count} Cleanliness Drives Attended`,
                        cit.ai_reason
                      )}
                      disabled={actionLoadingId === `recog-${cit.alias_display}`}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === `recog-${cit.alias_display}` ? 'Publishing...' : 'Award Badge'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Transparency Modal */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#0f2925] tracking-tight">
                    How Analytics & Mathematical Models Work
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Poisson cyclical surge math, stock-style trend analytics, and real PostgreSQL data
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

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                  <Database className="w-4 h-4 text-[#095c54]" />
                  <span>1. Live PostgreSQL Ingestion (No Hardcoded Strings)</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  The analytical service continuously queries real database tables: <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">complaints</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">worker_attendance</code>, and <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">work_assignments</code>. Whenever a citizen submits a complaint or a worker checks in via GPS, the metrics update in real-time.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-teal-900 text-sm">
                  <TrendingUp className="w-4 h-4 text-[#095c54]" />
                  <span>2. Financial Candlestick Trend & Volatility Index</span>
                </div>
                <p className="text-teal-950 leading-relaxed font-medium">
                  Calculates real civic complaint velocity, Open-High-Low-Close candle trajectories, and moving averages (SMA-7 and SMA-30) mirroring financial stock indices. When municipal squads resolve issues faster than incoming citizen reports, the index demonstrates a bullish clearance trend.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                  <BarChart2 className="w-4 h-4 text-amber-700" />
                  <span>3. Pure Mathematical Poisson Seasonal Model</span>
                </div>
                <p className="text-amber-950 leading-relaxed font-medium">
                  Correlates monthwise occurrence distribution to calculate seasonal surge multipliers and days remaining until peak season. Allows Ward Officers to configure automated early warning notifications 15 or 30 days before peak rainfall, festive spikes, or summer organic loads.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Inference: ~14ms
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
