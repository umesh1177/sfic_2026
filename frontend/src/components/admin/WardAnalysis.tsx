import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  MapPin,
  Flame,
  BrainCircuit,
  FileText,
  Users,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Phone,
  Building2,
  TrendingUp,
  Layers,
  Eye,
  X,
  Calendar,
  Award,
  Sparkles,
  HeartHandshake,
  UserCheck,
  Wrench,
  CloudRain,
  RotateCcw,
  Navigation,
  Filter,
  ChevronRight,
  Check,
  Image as ImageIcon,
  Bell
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  Tooltip,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../services/api.js';
import { Language } from '../../i18n/translations.js';
import { TablePagination } from '../common/TablePagination.js';
import { ComplaintsTrendView } from '../ward/ComplaintsTrendView.js';
import { ChronicHotspotsMapView } from '../ward/ChronicHotspotsMapView.js';
import { SeasonalPredictionView } from '../ward/SeasonalPredictionView.js';
import { WardWiseSeasonalResult } from '../../types/index.js';

interface WardAnalysisProps {
  lang: Language;
  initialWardNumber?: number;
  onNavigateToBoundary?: (wardNumber?: number) => void;
}

type AnalysisSubTab = 'overview' | 'hotspots' | 'ai_analytics' | 'problems' | 'operations';

// Leaflet controller: fit ward polygon or fly to selected hotspot
function WardMapController({
  polygon,
  focusPoint,
  wardNumber
}: {
  polygon: [number, number][];
  focusPoint: [number, number] | null;
  wardNumber: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusPoint) {
      map.flyTo(focusPoint, 16, { duration: 0.9 });
    }
  }, [focusPoint, map]);

  useEffect(() => {
    if (polygon && polygon.length >= 3) {
      try {
        const bounds = L.latLngBounds(polygon.map(p => L.latLng(p[0], p[1])));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
        }
      } catch {
        // ignore invalid bounds
      }
    }
  }, [wardNumber, polygon, map]);

  return null;
}

const createHotspotPin = (frequency: string, count: number, isSelected: boolean) => {
  const bg =
    frequency === 'high' ? '#dc2626' : frequency === 'medium' ? '#d97706' : '#059669';
  const ring = isSelected ? '0 0 0 4px rgba(9,92,84,0.35), 0 6px 14px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.3)';
  const size = isSelected ? 34 : 28;
  return L.divIcon({
    className: 'ward-analysis-hotspot-pin',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};color:#fff;font-weight:900;font-size:12px;
      border:2.5px solid #fff;box-shadow:${ring};
      display:flex;align-items:center;justify-content:center;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

const createComplaintDot = (status: string, slaBreached: boolean) => {
  const st = String(status || '').toLowerCase();
  const color = slaBreached
    ? '#dc2626'
    : ['resolved', 'closed', 'verified_complete'].includes(st)
    ? '#10b981'
    : st === 'rejected'
    ? '#64748b'
    : st === 'reopened'
    ? '#9333ea'
    : '#f59e0b';

  return L.divIcon({
    className: 'ward-analysis-complaint-dot',
    html: `<div style="
      width:14px;height:14px;border-radius:9999px;
      background:${color};border:2px solid #ffffff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8]
  });
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatShortDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

const statusBadgeClass = (status: string) => {
  const st = String(status || '').toLowerCase();
  if (['resolved', 'closed', 'verified_complete'].includes(st)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (['in_progress', 'assigned', 'team_assigned', 'approved', 'work_submitted'].includes(st)) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (st === 'reopened') {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (st === 'rejected') {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const prettyStatus = (status: string) =>
  String(status || 'submitted')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase());

const slaBadgeInfo = (slaStatus: string) => {
  switch (slaStatus) {
    case 'approval_breach':
      return { label: 'Approval SLA Breach', cls: 'bg-red-100 text-red-700 border-red-300' };
    case 'work_breach':
      return { label: 'Work Days SLA Breach', cls: 'bg-rose-100 text-rose-700 border-rose-300' };
    case 'resolved_on_time':
      return { label: 'Resolved On-Time', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'resolved_late':
      return { label: 'Resolved After SLA', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'rejected':
      return { label: 'Closed (Rejected)', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { label: 'Within SLA', cls: 'bg-teal-50 text-[#095c54] border-teal-200' };
  }
};

const LIFECYCLE_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'assigned', label: 'Team Assigned' },
  { key: 'in_progress', label: 'Work In Progress' },
  { key: 'resolved', label: 'Verified & Resolved' }
];

const getStepIndex = (status: string): number => {
  const st = String(status || '').toLowerCase();
  if (['resolved', 'closed', 'verified_complete'].includes(st)) return 4;
  if (['in_progress', 'work_submitted', 'reopened'].includes(st)) return 3;
  if (['assigned', 'team_assigned'].includes(st)) return 2;
  if (st === 'approved') return 1;
  return 0;
};

export const WardAnalysis: React.FC<WardAnalysisProps> = ({
  initialWardNumber,
  onNavigateToBoundary
}) => {
  const [wardsList, setWardsList] = useState<any[]>([]);
  const [selectedWardNumber, setSelectedWardNumber] = useState<number>(initialWardNumber || 3);
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>('overview');

  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Map filters & selection
  const [mapLayer, setMapLayer] = useState<'both' | 'hotspots' | 'complaints'>('both');
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>('all');
  const [mapSeverityFilter, setMapSeverityFilter] = useState<string>('all');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [mapFocusPoint, setMapFocusPoint] = useState<[number, number] | null>(null);
  const [hotspotPage, setHotspotPage] = useState<number>(1);

  // Analytics sub-tab state
  const [aiView, setAiView] = useState<'seasonal' | 'trend' | 'chronic' | 'performers'>('seasonal');
  const [performerTab, setPerformerTab] = useState<'workers' | 'communities' | 'citizens'>('workers');
  const [wardWiseSeasonal, setWardWiseSeasonal] = useState<WardWiseSeasonalResult | null>(null);
  const [adminLeadDays, setAdminLeadDays] = useState<15 | 30>(30);
  const [loadingWardWise, setLoadingWardWise] = useState<boolean>(false);

  const fetchWardWiseSeasonal = async (leadDaysVal: 15 | 30 = adminLeadDays) => {
    setLoadingWardWise(true);
    try {
      const res = await api.getWardWiseSeasonalPredictions(leadDaysVal);
      if (res?.success && res.data) {
        setWardWiseSeasonal(res.data);
        if (res.data.lead_days) setAdminLeadDays(res.data.lead_days);
      }
    } catch (err) {
      console.error('Failed to load ward-wise seasonal data:', err);
    } finally {
      setLoadingWardWise(false);
    }
  };

  const handleUpdateAdminLeadDays = async (newDays: 15 | 30) => {
    if (newDays === adminLeadDays) return;
    try {
      await api.updateSeasonalAlertSettings(newDays);
      setAdminLeadDays(newDays);
      fetchWardWiseSeasonal(newDays);
    } catch (err) {
      console.error('Failed to update lead days from admin:', err);
    }
  };

  // Problems list filters & pagination
  const [problemSearch, setProblemSearch] = useState<string>('');
  const [problemCategoryFilter, setProblemCategoryFilter] = useState<string>('all');
  const [problemStatusFilter, setProblemStatusFilter] = useState<string>('all');
  const [problemSlaFilter, setProblemSlaFilter] = useState<'all' | 'breached' | 'on_track'>('all');
  const [problemUrgentOnly, setProblemUrgentOnly] = useState<boolean>(false);
  const [problemsPage, setProblemsPage] = useState<number>(1);
  const problemsPageSize = 8;

  // Operations pagination
  const [workersPage, setWorkersPage] = useState<number>(1);

  // Complaint deep status-tracking modal
  const [trackingComplaintId, setTrackingComplaintId] = useState<string | null>(null);
  const [trackingDetails, setTrackingDetails] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);

  // Sync if parent navigates here with a specific ward
  useEffect(() => {
    if (initialWardNumber && initialWardNumber !== selectedWardNumber) {
      setSelectedWardNumber(initialWardNumber);
    }
  }, [initialWardNumber]);

  // Load ward directory for selector chips
  useEffect(() => {
    api
      .getAdminWards()
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const sorted = [...res.data].sort(
            (a, b) => Number(a.ward_number) - Number(b.ward_number)
          );
          setWardsList(sorted);
        }
      })
      .catch(() => {});
  }, []);

  const fetchWardAnalysis = async (wardNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminWardAnalysis(wardNum);
      if (res.success && res.data) {
        setAnalysis(res.data);
        setSelectedHotspotId(res.data.map_data?.hotspots?.[0]?.id || null);
        setMapFocusPoint(null);
        setProblemsPage(1);
        setHotspotPage(1);
        setWorkersPage(1);
      } else {
        setError('Unable to load ward analysis data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ward analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardAnalysis(selectedWardNumber);
  }, [selectedWardNumber]);

  useEffect(() => {
    if (activeSubTab === 'ai_analytics') {
      fetchWardWiseSeasonal(adminLeadDays);
    }
  }, [activeSubTab, adminLeadDays]);

  const openComplaintTracking = async (complaintId: string) => {
    setTrackingComplaintId(complaintId);
    setTrackingDetails(null);
    setTrackingLoading(true);
    try {
      const res = await api.getAdminComplaintTracking(complaintId);
      if (res.success && res.data) {
        setTrackingDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load complaint tracking details:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Derived filtered lists
  const allComplaints: any[] = analysis?.complaints || [];
  const allHotspots: any[] = analysis?.map_data?.hotspots || [];
  const allComplaintMarkers: any[] = analysis?.map_data?.complaint_markers || [];
  const categoryBreakdown: any[] = analysis?.category_breakdown || [];
  const statusBreakdown: any[] = analysis?.status_breakdown || [];
  const monthlyTrend: any[] = analysis?.monthly_trend || [];

  const filteredHotspots = useMemo(() => {
    return allHotspots.filter(h => {
      if (mapSeverityFilter !== 'all' && h.frequency_level !== mapSeverityFilter) return false;
      if (
        mapCategoryFilter !== 'all' &&
        String(h.dominant_category || '').toLowerCase() !== mapCategoryFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [allHotspots, mapSeverityFilter, mapCategoryFilter]);

  const filteredMapMarkers = useMemo(() => {
    return allComplaintMarkers.filter(m => {
      if (
        mapCategoryFilter !== 'all' &&
        String(m.category_name || '').toLowerCase() !== mapCategoryFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [allComplaintMarkers, mapCategoryFilter]);

  const filteredComplaints = useMemo(() => {
    const q = problemSearch.trim().toLowerCase();
    return allComplaints.filter(c => {
      if (
        problemCategoryFilter !== 'all' &&
        String(c.category_name || '').toLowerCase() !== problemCategoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (problemStatusFilter !== 'all') {
        if (problemStatusFilter === 'active_all') {
          if (['resolved', 'closed', 'verified_complete', 'rejected'].includes(c.status)) return false;
        } else if (problemStatusFilter === 'resolved_all') {
          if (!['resolved', 'closed', 'verified_complete'].includes(c.status)) return false;
        } else if (c.status !== problemStatusFilter) {
          return false;
        }
      }
      if (problemSlaFilter === 'breached' && !c.sla_breached) return false;
      if (problemSlaFilter === 'on_track' && c.sla_breached) return false;
      if (problemUrgentOnly && !c.is_urgent) return false;

      if (q) {
        const hay = `${c.complaint_number} ${c.category_name} ${c.landmark} ${c.address} ${c.citizen_name} ${c.description} ${c.assigned_team_name || ''} ${c.team_leader_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allComplaints,
    problemSearch,
    problemCategoryFilter,
    problemStatusFilter,
    problemSlaFilter,
    problemUrgentOnly
  ]);

  const paginatedComplaints = filteredComplaints.slice(
    (problemsPage - 1) * problemsPageSize,
    problemsPage * problemsPageSize
  );

  const paginatedHotspots = filteredHotspots.slice((hotspotPage - 1) * 5, hotspotPage * 5);
  const wardWorkers: any[] = analysis?.operations?.workers || [];
  const paginatedWorkers = wardWorkers.slice((workersPage - 1) * 6, workersPage * 6);

  const handleExportCsv = () => {
    if (!analysis) return;
    const headers = [
      'Complaint Number',
      'Ward',
      'Category',
      'Status',
      'SLA Status',
      'Days Elapsed',
      'Resolution Hours',
      'Priority',
      'Landmark',
      'Address',
      'Citizen',
      'Assigned Team',
      'Team Leader',
      'Submitted At',
      'Resolved At'
    ];
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredComplaints.map(c =>
      [
        c.complaint_number,
        `Ward ${selectedWardNumber}`,
        c.category_name,
        c.status,
        c.sla_status,
        c.days_elapsed,
        c.resolution_hours ?? '',
        c.priority,
        c.landmark,
        c.address,
        c.citizen_name,
        c.assigned_team_name || '',
        c.team_leader_name || '',
        c.submitted_at || '',
        c.resolved_at || ''
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ward-${selectedWardNumber}-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wardInfo = analysis?.ward;
  const summary = analysis?.summary;
  const aiData = analysis?.ai_analytics;
  const opsData = analysis?.operations;
  const maxTrendVal = Math.max(
    1,
    ...monthlyTrend.map(m => Math.max(m.reported || 0, m.resolved || 0))
  );
  const maxCategoryCount = Math.max(1, ...categoryBreakdown.map(c => c.total || 0));

  const selectedProblemSummary = allComplaints.find(c => c.id === trackingComplaintId);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 animate-in fade-in duration-200">
      {/* 1. Executive Banner + Dynamic Ward Selector */}
      <div className="bg-gradient-to-r from-[#095c54] via-[#0b6e65] to-[#043e39] text-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 relative z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-black tracking-wide border border-emerald-400/30 flex items-center gap-1">
                <BarChart3 className="w-3 h-3 shrink-0" />
                LIVE WARD INTELLIGENCE
              </span>
              {analysis?.generated_at && (
                <span className="text-white/70 text-[10px] sm:text-[11px] font-semibold hidden sm:inline">
                  Live Sync · {formatDateTime(analysis.generated_at)}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug">
              Ward Analysis
            </h1>
          </div>

          {/* Ward Dropdown + Actions (Mobile-First Stacked / Grid) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto shrink-0">
            <div className="flex items-center gap-2 bg-white/15 border border-white/25 rounded-xl px-2.5 sm:px-3 py-2 backdrop-blur-xs w-full sm:w-auto min-w-0">
              <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <select
                value={selectedWardNumber}
                onChange={e => setSelectedWardNumber(Number(e.target.value))}
                className="bg-transparent text-white text-xs sm:text-sm font-black outline-none cursor-pointer pr-1 w-full sm:w-auto min-w-0 truncate"
                aria-label="Select Municipal Ward"
              >
                {(wardsList.length > 0
                  ? wardsList
                  : Array.from({ length: 13 }, (_, i) => ({
                      ward_number: i + 1,
                      ward_name: `Ward ${i + 1}`
                    }))
                ).map(w => (
                  <option
                    key={w.ward_number}
                    value={w.ward_number}
                    className="text-[#0f2925] bg-white font-bold"
                  >
                    Ward {w.ward_number} — {w.ward_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => fetchWardAnalysis(selectedWardNumber)}
                disabled={loading}
                className="px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                title="Refresh live ward data"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={!analysis || filteredComplaints.length === 0}
                className="px-3 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-[#095c54] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition"
                title="Export filtered ward complaints as CSV"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Ward Switcher Strip (All 13 Wards) */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/15 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar relative z-10 max-w-full">
          {(wardsList.length > 0
            ? wardsList
            : Array.from({ length: 13 }, (_, i) => ({ ward_number: i + 1 }))
          ).map(w => {
            const isSel = Number(w.ward_number) === selectedWardNumber;
            return (
              <button
                key={w.ward_number}
                onClick={() => setSelectedWardNumber(Number(w.ward_number))}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isSel
                    ? 'bg-white text-[#095c54] shadow-sm'
                    : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/15'
                }`}
              >
                <span>Ward {w.ward_number}</span>
                {typeof w.active_complaints_count === 'number' && w.active_complaints_count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isSel ? 'bg-amber-100 text-amber-800' : 'bg-amber-400/25 text-amber-200'
                    }`}
                  >
                    {w.active_complaints_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchWardAnalysis(selectedWardNumber)}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !analysis && (
        <div className="p-10 bg-white rounded-3xl border border-[#e2e8f0] text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
          <p className="text-sm font-black text-[#0f2925]">
            Computing Live Analytics for Ward {selectedWardNumber}...
          </p>
          <p className="text-xs text-slate-500">
            Aggregating PostgreSQL complaints, SLA status, geospatial hotspots, and AI intelligence
          </p>
        </div>
      )}

      {analysis && wardInfo && summary && (
        <>
          {/* 2. Selected Ward Identity & Live Cleanliness Score Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#095c54] to-[#043e39] text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                <span className="text-[9px] font-bold uppercase text-emerald-200 leading-none">Ward</span>
                <span className="text-lg font-black leading-tight">{wardInfo.ward_number}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-[#0f2925] truncate">
                    {wardInfo.ward_name}
                  </h2>
                  {wardInfo.ward_name_gu && (
                    <span
                      data-no-translate="true"
                      className="text-xs font-bold text-[#095c54] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200"
                    >
                      {wardInfo.ward_name_gu}
                    </span>
                  )}
                  {summary.total_sla_breaches > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {summary.total_sla_breaches} SLA Breach{summary.total_sla_breaches > 1 ? 'es' : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      SLA Compliant
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#095c54]" />
                    Officer: <strong className="text-[#0f2925]">{wardInfo.primary_officer_name}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#095c54]" />
                    {wardInfo.primary_officer_phone}
                  </span>
                  {wardInfo.office_address && (
                    <span className="flex items-center gap-1 truncate max-w-xs sm:max-w-md">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{wardInfo.office_address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Live Computed Cleanliness Index Pill */}
            <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
              <div className="flex items-center gap-3 bg-[#f0faf8] border border-[#99f6e4] px-3.5 py-2 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#0d9488] block leading-none">
                    Live Cleanliness Score
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-[#095c54]">
                      {wardInfo.cleanliness_score}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 100</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#095c54] text-emerald-300 font-black text-sm flex items-center justify-center shadow-2xs">
                  {wardInfo.cleanliness_grade}
                </div>
              </div>

              {onNavigateToBoundary && (
                <button
                  onClick={() => onNavigateToBoundary(selectedWardNumber)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0f2925] text-xs font-extrabold flex items-center gap-1.5 transition"
                  title="Edit Geofence Boundary for this Ward"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#095c54]" />
                  <span className="hidden sm:inline">Geofence</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Sub-Tab Navigation Strip */}
          <div className="bg-white p-1.5 rounded-2xl border border-[#e2e8f0] shadow-2xs flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'overview', label: 'Overview', fullLabel: 'Overview & Categories', icon: BarChart3, badge: null },
              {
                id: 'hotspots',
                label: 'Hotspots',
                fullLabel: 'Hotspots Map',
                icon: Flame,
                badge: summary.total_hotspots
              },
              {
                id: 'ai_analytics',
                label: 'Analytics',
                fullLabel: 'Analytics',
                icon: BarChart3,
                badge: aiData?.seasonal?.predictions?.length || 0
              },
              {
                id: 'problems',
                label: 'Problems',
                fullLabel: 'Problems & Status Tracking',
                icon: FileText,
                badge: summary.total_complaints
              },
              {
                id: 'operations',
                label: 'Workforce',
                fullLabel: 'Workforce & Civic Ops',
                icon: Users,
                badge: summary.total_workers + summary.total_communities
              }
            ].map(tab => {
              const Icon = tab.icon;
              const isAct = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as AnalysisSubTab)}
                  className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition shrink-0 ${
                    isAct
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#0f2925]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isAct ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.fullLabel}</span>
                  {tab.badge !== null && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isAct ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ============================================================== */}
          {/* SUB-TAB 1: OVERVIEW & CATEGORY-WISE BREAKDOWN                  */}
          {/* ============================================================== */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* 6 Live KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div
                  onClick={() => {
                    setProblemStatusFilter('all');
                    setProblemCategoryFilter('all');
                    setActiveSubTab('problems');
                  }}
                  className="p-4 bg-white rounded-2xl border border-[#e2e8f0] hover:border-[#095c54] transition cursor-pointer shadow-2xs"
                >
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Problems</span>
                  <div className="text-2xl font-black text-[#0f2925] mt-1">{summary.total_complaints}</div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {summary.urgent_complaints} urgent open
                  </span>
                </div>

                <div
                  onClick={() => {
                    setProblemStatusFilter('active_all');
                    setActiveSubTab('problems');
                  }}
                  className="p-4 bg-white rounded-2xl border border-[#e2e8f0] hover:border-amber-400 transition cursor-pointer shadow-2xs"
                >
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Active / Open</span>
                  <div className="text-2xl font-black text-amber-600 mt-1">{summary.active_complaints}</div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {summary.pending_approval} pending · {summary.in_progress} active
                  </span>
                </div>

                <div
                  onClick={() => {
                    setProblemStatusFilter('resolved_all');
                    setActiveSubTab('problems');
                  }}
                  className="p-4 bg-white rounded-2xl border border-[#e2e8f0] hover:border-emerald-400 transition cursor-pointer shadow-2xs"
                >
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Resolved Rate</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {summary.resolution_rate_pct}%
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {summary.resolved_complaints} resolved · {summary.reopened_complaints} reopened
                  </span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Avg Resolution</span>
                  <div className="text-2xl font-black text-[#095c54] mt-1">
                    {summary.avg_resolution_hours > 0 ? `${summary.avg_resolution_hours}h` : '—'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {summary.avg_resolution_hours > 0 ? 'Live turnaround' : 'No closed tickets yet'}
                  </span>
                </div>

                <div
                  onClick={() => {
                    setProblemSlaFilter('breached');
                    setActiveSubTab('problems');
                  }}
                  className="p-4 bg-white rounded-2xl border border-[#e2e8f0] hover:border-red-400 transition cursor-pointer shadow-2xs"
                >
                  <span className="text-[10px] font-black uppercase text-slate-400 block">SLA Compliance</span>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      summary.sla_compliance_rate_pct >= 90
                        ? 'text-emerald-600'
                        : summary.sla_compliance_rate_pct >= 75
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {summary.sla_compliance_rate_pct}%
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {summary.total_sla_breaches} breach{summary.total_sla_breaches === 1 ? '' : 'es'}
                  </span>
                </div>

                <div
                  onClick={() => setActiveSubTab('hotspots')}
                  className="p-4 bg-white rounded-2xl border border-[#e2e8f0] hover:border-orange-400 transition cursor-pointer shadow-2xs"
                >
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Hotspots &amp; Crew</span>
                  <div className="text-2xl font-black text-orange-600 mt-1">{summary.total_hotspots}</div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {summary.high_risk_hotspots} high-risk · {summary.total_workers} staff
                  </span>
                </div>
              </div>

              {/* Cleanliness Formula Breakdown (100% Live Weighted Factors) */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#0f2925] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#095c54]" />
                      Dynamic Cleanliness Score Breakdown (Ward {wardInfo.ward_number})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Computed live from real database metrics: 40% Resolution + 25% SLA Compliance + 20% Hotspot Control + 15% Civic Participation
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-teal-50 text-[#095c54] font-black text-xs border border-teal-200 self-start sm:self-auto">
                    Score: {wardInfo.cleanliness_score} / 100 (Grade {wardInfo.cleanliness_grade})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Resolution Rate (40%)',
                      pct: wardInfo.score_breakdown.resolution_rate_pct,
                      pts: wardInfo.score_breakdown.resolution_component,
                      maxPts: 40,
                      barColor: 'bg-emerald-500'
                    },
                    {
                      label: 'SLA Compliance (25%)',
                      pct: wardInfo.score_breakdown.sla_compliance_pct,
                      pts: wardInfo.score_breakdown.sla_component,
                      maxPts: 25,
                      barColor: 'bg-[#095c54]'
                    },
                    {
                      label: 'Hotspot & Reopen Control (20%)',
                      pct: wardInfo.score_breakdown.hotspot_control_pct,
                      pts: wardInfo.score_breakdown.hotspot_control_component,
                      maxPts: 20,
                      barColor: 'bg-blue-500'
                    },
                    {
                      label: 'Civic & Drive Activity (15%)',
                      pct: wardInfo.score_breakdown.participation_pct,
                      pts: wardInfo.score_breakdown.participation_component,
                      maxPts: 15,
                      barColor: 'bg-teal-500'
                    }
                  ].map((item, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                        <span className="truncate">{item.label}</span>
                        <span className="font-black text-[#0f2925] shrink-0 ml-1">
                          {item.pts}/{item.maxPts}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.barColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, item.pct)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1">
                        Live factor score: {item.pct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category-Wise Count & SLA Breakdown */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#0f2925]">
                      Category-Wise Problem Count &amp; SLA Performance
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Click any category row to view its exact complaints &amp; status tracking timeline
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-[#095c54]">
                    {categoryBreakdown.filter(c => c.total > 0).length} Active Categories in Ward {wardInfo.ward_number}
                  </span>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                        <th className="py-2.5 pr-3">Category</th>
                        <th className="py-2.5 px-2 text-center">Total</th>
                        <th className="py-2.5 px-2 text-center">Active</th>
                        <th className="py-2.5 px-2 text-center">Resolved</th>
                        <th className="py-2.5 px-2 text-center">Reopened</th>
                        <th className="py-2.5 px-2 text-center">SLA Breaches</th>
                        <th className="py-2.5 px-2 text-center">Avg Hrs</th>
                        <th className="py-2.5 pl-3 w-48">Distribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {categoryBreakdown.map(cat => (
                        <tr
                          key={cat.category_id + cat.category_name}
                          onClick={() => {
                            setProblemCategoryFilter(cat.category_name);
                            setProblemStatusFilter('all');
                            setProblemsPage(1);
                            setActiveSubTab('problems');
                          }}
                          className="hover:bg-teal-50/50 cursor-pointer transition group"
                        >
                          <td className="py-3 pr-3">
                            <div className="font-black text-[#0f2925] group-hover:text-[#095c54] flex items-center gap-1.5">
                              <span>{cat.category_name}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#095c54] transition" />
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              SLA: {cat.max_approval_days}d approval · {cat.max_work_days}d work
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-black text-[#0f2925]">{cat.total}</td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                                cat.active > 0 ? 'bg-amber-50 text-amber-700' : 'text-slate-400'
                              }`}
                            >
                              {cat.active}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[11px]">
                              {cat.resolved}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-purple-600">
                            {cat.reopened}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {cat.sla_breaches > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-[11px]">
                                {cat.sla_breaches}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold">0</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-600">
                            {cat.avg_resolution_hours > 0 ? `${cat.avg_resolution_hours}h` : '—'}
                          </td>
                          <td className="py-3 pl-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-[#095c54] rounded-full"
                                  style={{
                                    width: `${Math.round((cat.total / maxCategoryCount) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-black text-slate-600 w-9 text-right">
                                {cat.share_pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2.5">
                  {categoryBreakdown.map(cat => (
                    <div
                      key={cat.category_id + cat.category_name}
                      onClick={() => {
                        setProblemCategoryFilter(cat.category_name);
                        setProblemStatusFilter('all');
                        setProblemsPage(1);
                        setActiveSubTab('problems');
                      }}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 active:scale-[0.99] transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-black text-xs text-[#0f2925] truncate">
                          {cat.category_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#095c54] text-white text-[10px] font-black shrink-0">
                          {cat.total} ({cat.share_pct}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 block">Active</span>
                          <span className="text-amber-600 font-black">{cat.active}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 block">Resolved</span>
                          <span className="text-emerald-600 font-black">{cat.resolved}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 block">Breach</span>
                          <span className={cat.sla_breaches > 0 ? 'text-red-600 font-black' : 'text-emerald-600 font-black'}>
                            {cat.sla_breaches}
                          </span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 block">Avg Hrs</span>
                          <span className="text-[#0f2925] font-black">
                            {cat.avg_resolution_hours > 0 ? `${cat.avg_resolution_hours}h` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution + 6-Month Dynamic Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Lifecycle Distribution */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925] mb-1">
                    Status Lifecycle Distribution
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">
                    Live complaint counts by workflow stage in Ward {wardInfo.ward_number}
                  </p>

                  {statusBreakdown.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">
                      No complaints recorded in Ward {wardInfo.ward_number} yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {statusBreakdown.map(st => (
                        <div key={st.status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[11px] font-black ${statusBadgeClass(
                                st.status
                              )}`}
                            >
                              {prettyStatus(st.status)}
                            </span>
                            <span className="font-black text-[#0f2925]">
                              {st.count}{' '}
                              <span className="text-slate-400 font-semibold">({st.share_pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#095c54]"
                              style={{ width: `${Math.max(4, st.share_pct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6-Month Reported vs Resolved Trend */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-[#0f2925]">
                        6-Month Activity Trend
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Real monthly reported vs resolved volume
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" /> Reported
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" /> Resolved
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 items-end h-44 pt-4">
                    {monthlyTrend.map(m => {
                      const repPct = Math.round(((m.reported || 0) / maxTrendVal) * 100);
                      const resPct = Math.round(((m.resolved || 0) / maxTrendVal) * 100);
                      return (
                        <div key={m.key} className="flex flex-col items-center h-full justify-end gap-1.5">
                          <div className="flex items-end gap-1 h-32 w-full justify-center">
                            <div className="flex flex-col items-center justify-end h-full w-4 sm:w-5">
                              {m.reported > 0 && (
                                <span className="text-[9px] font-black text-amber-700 mb-0.5">
                                  {m.reported}
                                </span>
                              )}
                              <div
                                className="w-full rounded-t-md bg-amber-400 transition-all duration-500"
                                style={{ height: `${m.reported > 0 ? Math.max(10, repPct) : 3}%` }}
                              />
                            </div>
                            <div className="flex flex-col items-center justify-end h-full w-4 sm:w-5">
                              {m.resolved > 0 && (
                                <span className="text-[9px] font-black text-emerald-700 mb-0.5">
                                  {m.resolved}
                                </span>
                              )}
                              <div
                                className="w-full rounded-t-md bg-emerald-600 transition-all duration-500"
                                style={{ height: `${m.resolved > 0 ? Math.max(10, resPct) : 3}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 truncate">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 2: INTERACTIVE WARD HOTSPOTS MAP                       */}
          {/* ============================================================== */}
          {activeSubTab === 'hotspots' && (
            <div className="space-y-4">
              {/* Map Controls Bar */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
                  <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-black w-full sm:w-auto">
                    {(
                      [
                        { id: 'both', label: 'All Layers' },
                        { id: 'hotspots', label: 'Hotspots' },
                        { id: 'complaints', label: 'Pins' }
                      ] as const
                    ).map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setMapLayer(mode.id)}
                        className={`px-2 py-1.5 sm:py-1 rounded-lg transition text-[11px] text-center ${
                          mapLayer === mode.id
                            ? 'bg-[#095c54] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={mapCategoryFilter}
                      onChange={e => {
                        setMapCategoryFilter(e.target.value);
                        setHotspotPage(1);
                      }}
                      className="w-full sm:w-auto min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#0f2925] outline-none focus:border-[#095c54]"
                    >
                      <option value="all">All Categories</option>
                      {categoryBreakdown.map(c => (
                        <option key={c.category_id + c.category_name} value={c.category_name}>
                          {c.category_name} ({c.total})
                        </option>
                      ))}
                    </select>

                    <select
                      value={mapSeverityFilter}
                      onChange={e => {
                        setMapSeverityFilter(e.target.value);
                        setHotspotPage(1);
                      }}
                      className="w-full sm:w-auto min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#0f2925] outline-none focus:border-[#095c54]"
                    >
                      <option value="all">All Severities</option>
                      <option value="high">High-Risk Hotspots</option>
                      <option value="medium">Medium Frequency</option>
                      <option value="low">Low Frequency</option>
                    </select>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> High Risk
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Low / Resolved
                  </span>
                </div>
              </div>

              {/* Map + Hotspot Details Side Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden relative z-0">
                  <div className="h-[300px] sm:h-[460px] w-full">
                    <MapContainer
                      center={analysis.map_data?.centroid || [20.9467, 72.952]}
                      zoom={14}
                      scrollWheelZoom={true}
                      className="h-full w-full z-0"
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <WardMapController
                        polygon={analysis.map_data?.ward_boundary || []}
                        focusPoint={mapFocusPoint}
                        wardNumber={selectedWardNumber}
                      />

                      {/* Selected Ward Exact Geofence Boundary */}
                      {analysis.map_data?.ward_boundary?.length >= 3 && (
                        <Polygon
                          positions={analysis.map_data.ward_boundary}
                          pathOptions={{
                            color: '#095c54',
                            weight: 3,
                            fillColor: '#0d9488',
                            fillOpacity: 0.09,
                            dashArray: '6 4'
                          }}
                        />
                      )}

                      {/* Dynamic Hotspot Circles & Markers */}
                      {(mapLayer === 'both' || mapLayer === 'hotspots') &&
                        filteredHotspots.map(hs => {
                          const color =
                            hs.frequency_level === 'high'
                              ? '#ef4444'
                              : hs.frequency_level === 'medium'
                              ? '#f59e0b'
                              : '#10b981';
                          const isSel = selectedHotspotId === hs.id;
                          return (
                            <React.Fragment key={hs.id}>
                              <Circle
                                center={[hs.latitude, hs.longitude]}
                                radius={Math.min(280, 90 + hs.total_complaints * 35)}
                                pathOptions={{
                                  color,
                                  fillColor: color,
                                  fillOpacity: isSel ? 0.28 : 0.16,
                                  weight: isSel ? 2.5 : 1.5
                                }}
                              />
                              <Marker
                                position={[hs.latitude, hs.longitude]}
                                icon={createHotspotPin(
                                  hs.frequency_level,
                                  hs.total_complaints,
                                  isSel
                                )}
                                eventHandlers={{
                                  click: () => {
                                    setSelectedHotspotId(hs.id);
                                    setMapFocusPoint([hs.latitude, hs.longitude]);
                                  }
                                }}
                              >
                                <Tooltip direction="top" offset={[0, -14]}>
                                  <span className="font-bold text-xs">
                                    {hs.locality} ({hs.total_complaints} complaints)
                                  </span>
                                </Tooltip>
                                <Popup>
                                  <div className="text-xs space-y-1 min-w-[190px]">
                                    <div className="font-black text-[#0f2925]">{hs.locality}</div>
                                    <div className="text-slate-500">{hs.dominant_category}</div>
                                    <div className="flex items-center gap-2 pt-1 font-bold">
                                      <span className="text-amber-700">{hs.active_complaints} Active</span>
                                      <span>·</span>
                                      <span className="text-emerald-700">{hs.resolved_complaints} Resolved</span>
                                    </div>
                                    <div className="text-[11px] font-black text-red-600">
                                      Risk Score: {hs.risk_score}/100
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            </React.Fragment>
                          );
                        })}

                      {/* Individual Complaint Pins */}
                      {(mapLayer === 'both' || mapLayer === 'complaints') &&
                        filteredMapMarkers.map(m => (
                          <Marker
                            key={m.id}
                            position={[m.latitude, m.longitude]}
                            icon={createComplaintDot(m.status, m.sla_breached)}
                          >
                            <Popup>
                              <div className="text-xs space-y-1.5 min-w-[200px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-[#095c54]">{m.complaint_number}</span>
                                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100">
                                    {prettyStatus(m.status)}
                                  </span>
                                </div>
                                <div className="font-bold text-[#0f2925]">{m.category_name}</div>
                                <div className="text-[11px] text-slate-600">
                                  {m.landmark || m.address}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openComplaintTracking(m.id)}
                                  className="w-full mt-1 py-1.5 px-2 rounded-lg bg-[#095c54] text-white font-bold text-[11px]"
                                >
                                  Inspect Status Tracking
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                    </MapContainer>
                  </div>
                </div>

                {/* Synced Hotspot List Panel */}
                <div className="bg-white p-4 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-[#0f2925] flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-600" />
                        Detected Hotspots ({filteredHotspots.length})
                      </h3>
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        Live Clusters
                      </span>
                    </div>

                    {filteredHotspots.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <p className="text-xs font-black text-[#0f2925]">No Matching Hotspots</p>
                        <p className="text-[11px] text-slate-500">
                          No recurring complaint clusters match the current filters in Ward {wardInfo.ward_number}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {paginatedHotspots.map(hs => {
                          const isSel = selectedHotspotId === hs.id;
                          return (
                            <div
                              key={hs.id}
                              onClick={() => {
                                setSelectedHotspotId(hs.id);
                                setMapFocusPoint([hs.latitude, hs.longitude]);
                              }}
                              className={`p-3 rounded-2xl border cursor-pointer transition ${
                                isSel
                                  ? 'bg-[#f0faf8] border-[#095c54] shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-[#0f2925] truncate">
                                    {hs.locality}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-semibold truncate">
                                    {hs.dominant_category}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                                    hs.frequency_level === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : hs.frequency_level === 'medium'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  Risk {hs.risk_score}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] font-bold mt-2 pt-2 border-t border-slate-200/70">
                                <span className="text-[#0f2925]">{hs.total_complaints} Total</span>
                                <span className="text-amber-700">{hs.active_complaints} Active</span>
                                <span className="text-emerald-700">{hs.resolved_complaints} Resolved</span>
                              </div>

                              {isSel && Array.isArray(hs.complaint_ids) && hs.complaint_ids.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-teal-200/70 flex flex-wrap gap-1.5">
                                  {hs.complaint_ids.slice(0, 4).map((cid: string, cIdx: number) => (
                                    <button
                                      key={cid}
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        openComplaintTracking(cid);
                                      }}
                                      className="px-2 py-0.5 rounded-lg bg-[#095c54] text-white text-[10px] font-bold hover:opacity-90"
                                    >
                                      {hs.complaint_numbers?.[cIdx] || 'Inspect'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {filteredHotspots.length > 5 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <TablePagination
                        currentPage={hotspotPage}
                        totalItems={filteredHotspots.length}
                        pageSize={5}
                        onPageChange={setHotspotPage}
                        itemLabel="hotspots"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 3: LIVE AI ANALYTICS FOR SELECTED WARD                 */}
          {/* ============================================================== */}
          {activeSubTab === 'ai_analytics' && aiData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Dynamic AI Executive Insights Cards */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#0f2925] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#095c54]" />
                      AI Executive Insights — Ward {wardInfo.ward_number}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Real-time findings synthesized strictly from Ward {wardInfo.ward_number}&apos;s live operational database
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#095c54] text-[10px] font-black border border-teal-200">
                    {aiData.seasonal?.forecast_month || 'Live'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(aiData.executive_insights || []).map((ins: any, idx: number) => {
                    const styles =
                      ins.type === 'critical'
                        ? 'bg-red-50/80 border-red-200 text-red-950'
                        : ins.type === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : ins.type === 'positive'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-[#0f2925]';
                    const badge =
                      ins.type === 'critical'
                        ? 'bg-red-600 text-white'
                        : ins.type === 'warning'
                        ? 'bg-amber-600 text-white'
                        : ins.type === 'positive'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#095c54] text-white';

                    return (
                      <div key={idx} className={`p-4 rounded-2xl border ${styles}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="text-xs sm:text-sm font-black">{ins.title}</h4>
                          {ins.metric && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${badge}`}>
                              {ins.metric}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium opacity-90 leading-relaxed">{ins.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Analytics Sub-Switcher Strip */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    id: 'seasonal',
                    label: `Seasonal Risk Matrix (${wardWiseSeasonal?.total_wards || 14} Wards)`,
                    icon: CloudRain
                  },
                  {
                    id: 'trend',
                    label: 'Complaint Trajectory Trend (Raise & Fall)',
                    icon: TrendingUp
                  },
                  {
                    id: 'chronic',
                    label: `Chronic Hotspots (${aiData.chronic?.chronic_hotspots?.length || 0})`,
                    icon: RotateCcw
                  },
                  {
                    id: 'performers',
                    label: 'Ward Top Performers',
                    icon: Award
                  }
                ].map(v => {
                  const Icon = v.icon;
                  const active = aiView === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setAiView(v.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
                        active
                          ? 'bg-[#095c54] text-white border-[#095c54] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#095c54]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{v.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Analytics View A: WARD-WISE SEASONAL RISK MATRIX & MATHEMATICAL PREDICTIONS */}
              {aiView === 'seasonal' && (
                <div className="space-y-4">
                  {/* Proactive Notification Lead Time Settings Banner */}
                  <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-[#095c54] text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-teal-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
                          <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                            Citywide Early Warning Notification Lead Time
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                          Automated Seasonal Warning Lead: {adminLeadDays} Days Prior to Surge
                        </h3>
                        <p className="text-xs text-teal-100 max-w-2xl font-medium">
                          Ward Officers and Headquarters receive proactive alerts <strong>15 days</strong> or <strong>30 days</strong> before cyclical historical problem peaks (e.g. July waterlogging alerts triggered June 1st or mid-June).
                        </p>
                      </div>

                      {/* Lead Days Toggle Buttons */}
                      <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-2xl border border-white/10 shrink-0">
                        <button
                          onClick={() => handleUpdateAdminLeadDays(30)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                            adminLeadDays === 30
                              ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>30 Days Before</span>
                        </button>

                        <button
                          onClick={() => handleUpdateAdminLeadDays(15)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                            adminLeadDays === 15
                              ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>15 Days Before</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Navsari Citywide WARD-WISE Seasonal Breakdown Matrix */}
                  <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <CloudRain className="w-4 h-4 text-[#095c54]" />
                          <span>Navsari Citywide Ward-Wise Seasonal Analysis & Alert Matrix</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Comparing cyclical mathematical predictions and proactive alert trigger states across all 14 wards
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        Active Lead: {adminLeadDays} Days
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">Ward</th>
                            <th className="py-2.5 px-3">Top Risk Category</th>
                            <th className="py-2.5 px-3">Peak Month</th>
                            <th className="py-2.5 px-3">Surge Multiplier</th>
                            <th className="py-2.5 px-3">Days to Surge</th>
                            <th className="py-2.5 px-3">Proactive Alert State</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(wardWiseSeasonal?.wards || []).map(w => {
                            const isCurrentWard = w.ward_number === selectedWardNumber;
                            return (
                              <tr
                                key={w.ward_number}
                                className={`hover:bg-slate-50/80 transition ${
                                  isCurrentWard ? 'bg-teal-50/50 font-bold' : ''
                                }`}
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-[#095c54]/10 text-[#095c54] font-black text-[11px] flex items-center justify-center shrink-0">
                                      W{w.ward_number}
                                    </span>
                                    <span className="font-extrabold text-slate-800">{w.ward_name}</span>
                                    {isCurrentWard && (
                                      <span className="px-1.5 py-0.2 rounded-md bg-[#095c54] text-white text-[9px] font-black">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-bold text-slate-700">{w.top_category}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-black">
                                    {w.peak_month}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-mono font-black text-rose-600">
                                    {w.surge_multiplier}x
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-mono text-slate-600">
                                    {w.days_until_surge} days
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {w.is_alert_active ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black animate-pulse">
                                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                                      <span>SURGE ALERT ({adminLeadDays}d Lead)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Scheduled ({w.days_until_surge}d)</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedWardNumber(w.ward_number)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                      isCurrentWard
                                        ? 'bg-[#095c54] text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {isCurrentWard ? 'Viewing' : 'Inspect'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Selected Ward Interactive Seasons & Months Prediction */}
                  <div className="pt-3">
                    <SeasonalPredictionView wardNumber={selectedWardNumber} />
                  </div>
                </div>
              )}

              {/* Analytics View B: COMPLAINT TRENDS (STOCK MARKET CANDLESTICK CHART) */}
              {aiView === 'trend' && (
                <ComplaintsTrendView wardNumber={selectedWardNumber} />
              )}

              {/* Analytics View C: CHRONIC HOTSPOTS GEOSPATIAL MAP */}
              {aiView === 'chronic' && (
                <ChronicHotspotsMapView
                  wardNumber={selectedWardNumber}
                  hotspots={aiData.chronic?.chronic_hotspots || []}
                  onCreateCommunityProblem={() => {}}
                />
              )}

              {/* AI View C: Real Ward Performers */}
              {aiView === 'performers' && (
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      {
                        id: 'workers',
                        label: `Workers (${aiData.performers?.top_workers?.length || 0})`,
                        icon: Wrench
                      },
                      {
                        id: 'communities',
                        label: `Communities (${aiData.performers?.top_communities?.length || 0})`,
                        icon: HeartHandshake
                      },
                      {
                        id: 'citizens',
                        label: `Citizens (${aiData.performers?.top_citizens?.length || 0})`,
                        icon: Users
                      }
                    ].map(pt => {
                      const Icon = pt.icon;
                      return (
                        <button
                          key={pt.id}
                          onClick={() => setPerformerTab(pt.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                            performerTab === pt.id
                              ? 'bg-[#095c54] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{pt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {performerTab === 'workers' && (
                    (aiData.performers?.top_workers || []).length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-slate-400">
                        No sanitation workers registered in Ward {wardInfo.ward_number} yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiData.performers.top_workers.map((w: any) => (
                          <div key={w.worker_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-black text-sm text-[#0f2925]">{w.full_name}</div>
                                <div className="text-[11px] font-bold text-slate-500">
                                  {w.worker_code} · {w.designation}
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl bg-[#095c54] text-emerald-300 font-black text-xs">
                                AI Score {w.composite_score}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">{w.ai_reason}</p>
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center text-[11px] font-bold">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Completed</span>
                                <span className="text-emerald-700 font-black">
                                  {w.tasks_completed}/{w.tasks_assigned}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Attendance</span>
                                <span className="text-[#0f2925] font-black">{w.attendance_days}d</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Geofence</span>
                                <span className="text-[#095c54] font-black">{w.geofence_match_pct}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {performerTab === 'communities' && (
                    (aiData.performers?.top_communities || []).length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-slate-400">
                        No approved community organizations in Ward {wardInfo.ward_number} yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiData.performers.top_communities.map((c: any) => (
                          <div key={c.community_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-black text-sm text-[#0f2925]">{c.community_name}</div>
                                <div className="text-[11px] font-bold text-slate-500">Head: {c.head_name}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl bg-[#095c54] text-emerald-300 font-black text-xs">
                                AI Score {c.composite_score}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">{c.ai_reason}</p>
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center text-[11px] font-bold">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Drives</span>
                                <span className="text-emerald-700 font-black">{c.drives_completed}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Volunteers</span>
                                <span className="text-[#0f2925] font-black">{c.total_volunteers_attended}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Problems Solved</span>
                                <span className="text-[#095c54] font-black">{c.ward_problems_resolved}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {performerTab === 'citizens' && (
                    (aiData.performers?.top_citizens || []).length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-slate-400">
                        No citizen participation records in Ward {wardInfo.ward_number} yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiData.performers.top_citizens.map((ct: any) => (
                          <div key={ct.citizen_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-black text-sm text-[#0f2925]">{ct.alias_display}</div>
                                <div className="text-[11px] font-bold text-emerald-700">{ct.ai_badge}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl bg-[#095c54] text-emerald-300 font-black text-xs">
                                AI Score {ct.composite_score}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">{ct.ai_reason}</p>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 4: PROBLEMS LIST & FULL STATUS TRACKING                */}
          {/* ============================================================== */}
          {activeSubTab === 'problems' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
                <div className="relative w-full lg:flex-1 lg:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={problemSearch}
                    onChange={e => {
                      setProblemSearch(e.target.value);
                      setProblemsPage(1);
                    }}
                    placeholder="Search complaint #, landmark, citizen, team..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-[#095c54] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                  <select
                    value={problemCategoryFilter}
                    onChange={e => {
                      setProblemCategoryFilter(e.target.value);
                      setProblemsPage(1);
                    }}
                    className="w-full sm:w-auto min-w-0 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-[#095c54]"
                  >
                    <option value="all">All Categories</option>
                    {categoryBreakdown.map(c => (
                      <option key={c.category_id + c.category_name} value={c.category_name}>
                        {c.category_name} ({c.total})
                      </option>
                    ))}
                  </select>

                  <select
                    value={problemStatusFilter}
                    onChange={e => {
                      setProblemStatusFilter(e.target.value);
                      setProblemsPage(1);
                    }}
                    className="w-full sm:w-auto min-w-0 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-[#095c54]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active_all">All Active / Open</option>
                    <option value="resolved_all">All Resolved</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="reopened">Reopened</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <select
                    value={problemSlaFilter}
                    onChange={e => {
                      setProblemSlaFilter(e.target.value as any);
                      setProblemsPage(1);
                    }}
                    className="w-full sm:w-auto min-w-0 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-[#095c54]"
                  >
                    <option value="all">All SLA</option>
                    <option value="breached">SLA Breached Only</option>
                    <option value="on_track">Within SLA Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setProblemUrgentOnly(!problemUrgentOnly);
                      setProblemsPage(1);
                    }}
                    className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-black border transition ${
                      problemUrgentOnly
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-400'
                    }`}
                  >
                    Urgent Only
                  </button>

                  {(problemSearch ||
                    problemCategoryFilter !== 'all' ||
                    problemStatusFilter !== 'all' ||
                    problemSlaFilter !== 'all' ||
                    problemUrgentOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setProblemSearch('');
                        setProblemCategoryFilter('all');
                        setProblemStatusFilter('all');
                        setProblemSlaFilter('all');
                        setProblemUrgentOnly(false);
                        setProblemsPage(1);
                      }}
                      className="px-2.5 py-2 rounded-xl text-xs font-extrabold text-red-600 hover:bg-red-50"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {filteredComplaints.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Filter className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-black text-[#0f2925]">No Matching Complaints</p>
                  <p className="text-xs text-slate-500">
                    No complaints in Ward {wardInfo.ward_number} match your active filter criteria.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                          <th className="py-2.5 pr-3">Complaint &amp; Category</th>
                          <th className="py-2.5 px-2">Location &amp; Citizen</th>
                          <th className="py-2.5 px-2">Status &amp; Progress</th>
                          <th className="py-2.5 px-2">SLA Tracking</th>
                          <th className="py-2.5 px-2">Assigned Team</th>
                          <th className="py-2.5 pl-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedComplaints.map(c => {
                          const sla = slaBadgeInfo(c.sla_status);
                          const stepIdx = getStepIndex(c.status);
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-[#095c54]">
                                    {c.complaint_number}
                                  </span>
                                  {c.is_urgent && (
                                    <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                                      Urgent
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-[#0f2925] mt-0.5">{c.category_name}</div>
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {formatShortDate(c.submitted_at)}
                                </div>
                              </td>

                              <td className="py-3 px-2 max-w-[210px]">
                                <div
                                  data-no-translate="true"
                                  className="font-bold text-[#0f2925] truncate"
                                  title={c.landmark || c.address}
                                >
                                  {c.landmark || c.address}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  By {c.citizen_name}
                                </div>
                              </td>

                              <td className="py-3 px-2">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-black ${statusBadgeClass(
                                    c.status
                                  )}`}
                                >
                                  {prettyStatus(c.status)}
                                </span>
                                {/* Mini 5-dot progress bar */}
                                <div className="flex items-center gap-1 mt-1.5">
                                  {LIFECYCLE_STEPS.map((st, sIdx) => (
                                    <span
                                      key={st.key}
                                      title={st.label}
                                      className={`h-1.5 w-4 rounded-full ${
                                        c.status === 'rejected'
                                          ? 'bg-slate-300'
                                          : sIdx <= stepIdx
                                          ? 'bg-[#095c54]'
                                          : 'bg-slate-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </td>

                              <td className="py-3 px-2">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-black ${sla.cls}`}
                                >
                                  {sla.label}
                                </span>
                                <div className="text-[10px] text-slate-500 font-semibold mt-1">
                                  {c.resolution_hours !== null
                                    ? `Closed in ${c.resolution_hours}h`
                                    : `${c.days_elapsed}d elapsed`}
                                </div>
                              </td>

                              <td className="py-3 px-2">
                                {c.assigned_team_name || c.team_leader_name ? (
                                  <div>
                                    <div className="font-bold text-[#0f2925] truncate max-w-[140px]">
                                      {c.assigned_team_name || 'Field Squad'}
                                    </div>
                                    {c.team_leader_name && (
                                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                        Lead: {c.team_leader_name}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-semibold">
                                    Not assigned yet
                                  </span>
                                )}
                              </td>

                              <td className="py-3 pl-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => openComplaintTracking(c.id)}
                                  className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074842] text-white text-[11px] font-black inline-flex items-center gap-1 transition shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Track Status</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2.5">
                    {paginatedComplaints.map(c => {
                      const sla = slaBadgeInfo(c.sla_status);
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-xs text-[#095c54]">
                                  {c.complaint_number}
                                </span>
                                {c.is_urgent && (
                                  <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <div className="font-black text-xs text-[#0f2925] mt-0.5">
                                {c.category_name}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-black shrink-0 ${statusBadgeClass(
                                c.status
                              )}`}
                            >
                              {prettyStatus(c.status)}
                            </span>
                          </div>

                          <div
                            data-no-translate="true"
                            className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 truncate"
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{c.landmark || c.address}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${sla.cls}`}
                            >
                              {sla.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => openComplaintTracking(c.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#095c54] text-white text-[11px] font-black inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Track</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <TablePagination
                    currentPage={problemsPage}
                    totalItems={filteredComplaints.length}
                    pageSize={problemsPageSize}
                    onPageChange={setProblemsPage}
                    itemLabel="complaints"
                  />
                </>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 5: WORKFORCE, TEAMS, COMMUNITIES & DRIVES              */}
          {/* ============================================================== */}
          {activeSubTab === 'operations' && opsData && (
            <div className="space-y-4 sm:space-y-6">
              {/* SLA Breaches Alert for Selected Ward */}
              {(opsData.sla_breaches || []).length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-red-50 border-2 border-red-200 space-y-3">
                  <div className="flex items-center gap-2 text-red-900">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <h3 className="text-sm sm:text-base font-black">
                      Active SLA Breaches in Ward {wardInfo.ward_number} ({opsData.sla_breaches.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {opsData.sla_breaches.map((b: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-2xl border border-red-200 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-[#0f2925]">{b.complaint_number}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              b.breach_type === 'work_sla'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {b.breach_type === 'work_sla' ? 'Work Days Breach' : 'Approval Breach'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-600">
                          {b.category_name} · Officer: {b.officer_name}
                        </div>
                        <div className="text-[11px] font-black text-red-700">
                          {b.days_pending} days elapsed (Limit:{' '}
                          {b.breach_type === 'work_sla'
                            ? `${b.max_work_days}d work`
                            : `${b.max_approval_days}d approval`}
                          )
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Officers & Field Teams */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925] mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#095c54]" />
                    Assigned Ward Officers ({(wardInfo.officers || []).length})
                  </h3>
                  {(wardInfo.officers || []).length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4">
                      No active Ward Officer assigned to Ward {wardInfo.ward_number}.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {wardInfo.officers.map((off: any) => (
                        <div
                          key={off.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-xs sm:text-sm text-[#0f2925] truncate">
                              {off.full_name}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              {off.designation || 'Ward Officer'} · {off.phone}
                            </div>
                          </div>
                          {off.flagged ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black shrink-0">
                              {off.overdue_count} Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black shrink-0">
                              On Track
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925] mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#095c54]" />
                    Sanitation Field Teams ({(opsData.teams || []).length})
                  </h3>
                  {(opsData.teams || []).length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4">
                      No field teams created for Ward {wardInfo.ward_number} yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {opsData.teams.map((tm: any) => (
                        <div
                          key={tm.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-xs sm:text-sm text-[#0f2925] truncate">
                              {tm.team_name || tm.name}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              {tm.specialization || 'General Sanitation'}
                              {tm.leader_name ? ` · Lead: ${tm.leader_name}` : ''}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-[#095c54] text-[11px] font-black shrink-0">
                            {Array.isArray(tm.member_ids) ? tm.member_ids.length : tm.members_count || 0} Members
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sanitation Workers Roster */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925] flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#095c54]" />
                    Ward Field Workers ({wardWorkers.length})
                  </h3>
                  <span className="text-xs font-bold text-emerald-700">
                    {summary.available_workers} Available
                  </span>
                </div>

                {wardWorkers.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400 py-6 text-center">
                    No sanitation workers assigned to Ward {wardInfo.ward_number}.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {paginatedWorkers.map((w: any) => (
                        <div
                          key={w.id || w.worker_code}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-xs text-[#0f2925] truncate">
                              {w.full_name || w.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                String(w.availability_status || 'available').toLowerCase() === 'available'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {prettyStatus(w.availability_status || 'available')}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-[#095c54]">
                            {w.worker_code || 'NMC-WRK'} · {w.designation || 'Sanitation Worker'}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            {w.phone || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    {wardWorkers.length > 6 && (
                      <TablePagination
                        currentPage={workersPage}
                        totalItems={wardWorkers.length}
                        pageSize={6}
                        onPageChange={setWorkersPage}
                        itemLabel="workers"
                      />
                    )}
                  </>
                )}
              </div>

              {/* Communities, Drives & Community Problems */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925] mb-3 flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-[#095c54]" />
                    Registered Communities ({(opsData.communities || []).length})
                  </h3>
                  {(opsData.communities || []).length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4">
                      No communities registered in Ward {wardInfo.ward_number} yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {opsData.communities.slice(0, 6).map((cm: any) => (
                        <div
                          key={cm.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-xs text-[#0f2925] truncate">
                              {cm.community_name}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 truncate">
                              {cm.organisation_type || 'Civic Partner'} · Head: {cm.head_name || 'N/A'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                              String(cm.approval_status || 'approved') === 'approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {prettyStatus(cm.approval_status || 'approved')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs">
                  <h3 className="text-sm sm:text-base font-black text-[#0f2925] mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#095c54]" />
                    Cleanliness Drives ({(opsData.drives || []).length})
                  </h3>
                  {(opsData.drives || []).length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4">
                      No cleanliness drives scheduled in Ward {wardInfo.ward_number} yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {opsData.drives.slice(0, 6).map((dr: any) => (
                        <div
                          key={dr.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-xs text-[#0f2925] truncate">
                              {dr.title}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 truncate">
                              {dr.community_name || 'Ward Drive'} · {formatShortDate(dr.event_date || dr.start_datetime)}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-[10px] font-black shrink-0">
                            {prettyStatus(dr.event_status || dr.status || 'scheduled')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* DEEP COMPLAINT STATUS TRACKING & EVIDENCE MODAL                      */}
      {/* ==================================================================== */}
      {trackingComplaintId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#f8fafc]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-[#095c54] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {trackingDetails?.complaint?.complaint_number ||
                      selectedProblemSummary?.complaint_number ||
                      'Tracking'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${statusBadgeClass(
                      trackingDetails?.complaint?.status || selectedProblemSummary?.status || ''
                    )}`}
                  >
                    {prettyStatus(
                      trackingDetails?.complaint?.status || selectedProblemSummary?.status || ''
                    )}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0f2925] mt-1 truncate">
                  {trackingDetails?.complaint?.category_name ||
                    selectedProblemSummary?.category_name ||
                    'Complaint Status Tracking'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setTrackingComplaintId(null);
                  setTrackingDetails(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-200/70 text-slate-500 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {trackingLoading ? (
                <div className="py-10 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">
                    Loading live status audit, team assignments &amp; evidence...
                  </p>
                </div>
              ) : (
                <>
                  {/* 5-Stage Lifecycle Stepper */}
                  {(() => {
                    const st =
                      trackingDetails?.complaint?.status ||
                      selectedProblemSummary?.status ||
                      'submitted';
                    const activeStep = getStepIndex(st);
                    return (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-3">
                          Lifecycle Progress
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {LIFECYCLE_STEPS.map((step, idx) => {
                            const done = st !== 'rejected' && idx <= activeStep;
                            return (
                              <div key={step.key} className="flex flex-col items-center text-center">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    done
                                      ? 'bg-[#095c54] text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <span
                                  className={`text-[9px] sm:text-[10px] font-bold mt-1 leading-tight ${
                                    done ? 'text-[#095c54]' : 'text-slate-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Citizen Complaint Info & Description */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">
                          Location
                        </span>
                        <span data-no-translate="true" className="font-bold text-[#0f2925]">
                          {selectedProblemSummary?.landmark ||
                            trackingDetails?.complaint?.location?.landmark ||
                            selectedProblemSummary?.address ||
                            '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">
                          Reported By &amp; Time
                        </span>
                        <span className="font-bold text-[#0f2925]">
                          {selectedProblemSummary?.citizen_name || 'Citizen'} ·{' '}
                          {formatDateTime(
                            trackingDetails?.complaint?.submitted_at ||
                              selectedProblemSummary?.submitted_at
                          )}
                        </span>
                      </div>
                    </div>

                    {(trackingDetails?.complaint?.description ||
                      selectedProblemSummary?.description) && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                          Citizen Description
                        </span>
                        <p
                          data-no-translate="true"
                          className="text-xs text-slate-700 font-medium leading-relaxed"
                        >
                          {trackingDetails?.complaint?.description ||
                            selectedProblemSummary?.description}
                        </p>
                      </div>
                    )}

                    {/* SLA Summary */}
                    {selectedProblemSummary && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${
                            slaBadgeInfo(selectedProblemSummary.sla_status).cls
                          }`}
                        >
                          {slaBadgeInfo(selectedProblemSummary.sla_status).label}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          SLA Limits: {selectedProblemSummary.max_approval_days}d approval /{' '}
                          {selectedProblemSummary.max_work_days}d work
                        </span>
                        <span className="text-[11px] font-bold text-[#095c54]">
                          {selectedProblemSummary.resolution_hours !== null
                            ? `Resolved in ${selectedProblemSummary.resolution_hours}h`
                            : `${selectedProblemSummary.days_elapsed} days elapsed`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Before & After Photos */}
                  {(trackingDetails?.complaint?.image_url ||
                    trackingDetails?.complaint?.resolved_image_url ||
                    selectedProblemSummary?.image_url) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(trackingDetails?.complaint?.image_url ||
                        selectedProblemSummary?.image_url) && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                          <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 flex items-center gap-1 bg-white border-b border-slate-100">
                            <ImageIcon className="w-3 h-3" /> Reported Photo (Before)
                          </div>
                          <img
                            src={
                              trackingDetails?.complaint?.image_url ||
                              selectedProblemSummary?.image_url
                            }
                            alt="Reported complaint"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}
                      {trackingDetails?.complaint?.resolved_image_url && (
                        <div className="rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50/30">
                          <div className="px-3 py-1.5 text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1 bg-white border-b border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" /> Resolution Photo (After)
                          </div>
                          <img
                            src={trackingDetails.complaint.resolved_image_url}
                            alt="Resolved proof"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Field Assignments & Attendance */}
                  {Array.isArray(trackingDetails?.assignments) &&
                    trackingDetails.assignments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase text-slate-500">
                          Field Work Assignments ({trackingDetails.assignments.length})
                        </h4>
                        {trackingDetails.assignments.map((asgn: any, aIdx: number) => (
                          <div
                            key={asgn.id || aIdx}
                            className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-[#0f2925]">
                                {asgn.team_name || 'Assigned Field Squad'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white border border-teal-200 text-[#095c54] text-[10px] font-black">
                                {prettyStatus(asgn.status || 'assigned')}
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-600">
                              Team Leader: <strong>{asgn.team_leader_name || 'Assigned Lead'}</strong>
                              {asgn.assigned_at ? ` · Assigned ${formatDateTime(asgn.assigned_at)}` : ''}
                            </div>
                            {Array.isArray(asgn.members) && asgn.members.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {asgn.members.map((m: any, mIdx: number) => (
                                  <span
                                    key={mIdx}
                                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                                  >
                                    {m.full_name || m.worker_name || 'Worker'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Complete Timestamped Status Tracking Timeline */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#095c54]" />
                      Status Tracking Audit Timeline
                    </h4>
                    <div className="space-y-2.5 pl-3 border-l-2 border-[#095c54]/25">
                      {(trackingDetails?.timeline?.length > 0
                        ? trackingDetails.timeline
                        : selectedProblemSummary?.status_timeline || []
                      ).map((ev: any, idx: number) => (
                        <div key={idx} className="relative pl-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#095c54] border-2 border-white shadow-2xs absolute -left-[18px] top-1" />
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-black text-[#0f2925]">
                                {prettyStatus(ev.status)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {formatDateTime(ev.timestamp || ev.created_at)}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-[#095c54] mt-0.5">
                              {ev.actor_name || ev.actor || 'NMC System'}
                              {ev.actor_role ? ` (${prettyStatus(ev.actor_role)})` : ''}
                            </div>
                            {ev.note && (
                              <p data-no-translate="true" className="text-[11px] text-slate-600 mt-1">
                                {ev.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
