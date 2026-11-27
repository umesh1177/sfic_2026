import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Layers,
  Building2,
  Info,
  Maximize2,
  Eye,
  History,
  Navigation,
  X
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api.js';
import { Language } from '../../i18n/translations.js';
import { TablePagination } from '../common/TablePagination.js';

// Default Navsari outer boundary coordinates [lng, lat]
const DEFAULT_NAVSARI_BOUNDARY: [number, number][] = [
  [72.8750, 20.8850],
  [72.9650, 20.8850],
  [72.9650, 20.9750],
  [72.8750, 20.9750],
  [72.8750, 20.8850]
];

const NAVSARI_LANDMARKS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Lunsikui / Tower Road (Ward 1)', lat: 20.9475, lng: 72.9275 },
  { name: 'Station Road / Fuwara (Ward 2)', lat: 20.9475, lng: 72.9425 },
  { name: 'Dudhiya Talao / Ashapuri (Ward 3)', lat: 20.9325, lng: 72.9275 },
  { name: 'Kaliawadi / Sayaji Road (Ward 4)', lat: 20.9325, lng: 72.9425 },
  { name: 'Jalalpore Road / Shanta Devi (Ward 5)', lat: 20.9475, lng: 72.9100 },
  { name: 'Vijalpore North / Eru Char Rasta (Ward 6)', lat: 20.9175, lng: 72.9250 },
  { name: 'Vijalpore South / GIDC (Ward 7)', lat: 20.9175, lng: 72.9450 },
  { name: 'Madhumati / Parsi Wad (Ward 8)', lat: 20.9625, lng: 72.9290 },
  { name: 'Sandhkuva / Junathana (Ward 9)', lat: 20.9625, lng: 72.9450 },
  { name: 'Chhapra Road / Vejalpore (Ward 10)', lat: 20.9475, lng: 72.9625 },
  { name: 'Vansda Road / Italva (Ward 11)', lat: 20.9200, lng: 72.9625 },
  { name: 'Mahuva Highway / Chikhli Approach (Ward 12)', lat: 20.9000, lng: 72.9150 },
  { name: 'Dandi Coastal Corridor (Ward 13)', lat: 20.9350, lng: 72.8925 }
];

function getNearestNavsariArea(lat: number, lng: number): string {
  let closest = NAVSARI_LANDMARKS[0].name;
  let minD = Infinity;
  for (const lm of NAVSARI_LANDMARKS) {
    const d = (lat - lm.lat) ** 2 + (lng - lm.lng) ** 2;
    if (d < minD) {
      minD = d;
      closest = lm.name;
    }
  }
  return `Near ${closest}, Navsari`;
}

async function reverseGeocodePoint(lat: number, lng: number): Promise<string> {
  const fallback = getNearestNavsariArea(lat, lng);
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.residential || addr.amenity || addr.building,
        addr.neighbourhood || addr.suburb || addr.quarter || addr.village || addr.town,
        addr.city || addr.state_district
      ].filter(Boolean);
      if (parts.length > 0) {
        return Array.from(new Set(parts)).join(', ');
      }
      if (data?.display_name) {
        return String(data.display_name).split(',').slice(0, 3).join(', ').trim();
      }
    }
  } catch {
    // Use Navsari landmark fallback
  }
  return fallback;
}

function getPolygonCenter(coords: [number, number][]): [number, number] {
  if (!coords || coords.length === 0) return [20.9325, 72.9280];
  const uniquePts =
    coords.length > 1 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords.slice(0, -1)
      : coords;
  const avgLng = uniquePts.reduce((acc, c) => acc + c[0], 0) / Math.max(1, uniquePts.length);
  const avgLat = uniquePts.reduce((acc, c) => acc + c[1], 0) / Math.max(1, uniquePts.length);
  return [avgLat, avgLng];
}

// Mini SVG preview thumbnail of any polygon boundary for the Previous Locations table
const MiniBoundarySvgPreview: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  if (!coordinates || coordinates.length < 3) {
    return <span className="text-[10px] text-slate-400">No shape</span>;
  }
  const lngs = coordinates.map(c => c[0]);
  const lats = coordinates.map(c => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = Math.max(0.0005, maxLng - minLng);
  const spanLat = Math.max(0.0005, maxLat - minLat);
  const pad = 5;
  const W = 68;
  const H = 44;

  const pts = coordinates
    .map(([lng, lat]) => {
      const x = pad + ((lng - minLng) / spanLng) * (W - pad * 2);
      const y = H - pad - ((lat - minLat) / spanLat) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="rounded-lg border border-teal-200 bg-[#f0faf7] shrink-0"
    >
      <polygon
        points={pts}
        fill="rgba(9, 92, 84, 0.22)"
        stroke="#095c54"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Custom vertex pin icons for drawing & highlight
const vertexIcon = new L.DivIcon({
  className: 'custom-vertex-pin',
  html: `<div style="background-color: #095c54; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const activeVertexIcon = new L.DivIcon({
  className: 'custom-active-vertex-pin',
  html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(239,68,68,0.55); cursor: pointer;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const inspectPinIcon = new L.DivIcon({
  className: 'custom-inspect-pin',
  html: `<div style="background-color: #0284c7; width: 16px; height: 16px; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(2,132,199,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.9 });
  }, [center, zoom, map]);
  return null;
}

function MapInteractionHandler({
  isDrawing,
  onAddPoint,
  onInspectPoint,
  onHoverCoords
}: {
  isDrawing: boolean;
  onAddPoint: (point: [number, number]) => void;
  onInspectPoint: (point: [number, number]) => void;
  onHoverCoords: (coords: { lat: number; lng: number } | null) => void;
}) {
  useMapEvents({
    click(e) {
      const pt: [number, number] = [e.latlng.lng, e.latlng.lat];
      if (isDrawing) {
        onAddPoint(pt);
      } else {
        onInspectPoint(pt);
      }
    },
    mousemove(e) {
      onHoverCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mouseout() {
      onHoverCoords(null);
    }
  });
  return null;
}

interface BoundaryHistoryEntry {
  id: string;
  boundary_type: 'city' | 'ward';
  ward_id?: string | null;
  ward_number?: number | null;
  ward_name?: string | null;
  coordinates: [number, number][];
  location_summary?: string;
  saved_by?: string;
  created_at: string;
}

interface BoundaryManagementProps {
  lang: Language;
  initialWardNumber?: number;
}

export const BoundaryManagement: React.FC<BoundaryManagementProps> = ({
  initialWardNumber
}) => {
  const [mode, setMode] = useState<'city' | 'ward'>('city');

  // Wards & City Data
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardNumber, setSelectedWardNumber] = useState<number>(initialWardNumber || 3);
  const [cityBoundary, setCityBoundary] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drawing & Live Point Inspection State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [pointLocations, setPointLocations] = useState<Record<number, string>>({});
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [inspectedPoint, setInspectedPoint] = useState<{ lat: number; lng: number; locationName: string } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState<boolean>(false);

  // Previous Boundaries History & Map Preview Modal
  const [boundaryHistory, setBoundaryHistory] = useState<BoundaryHistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyPageSize = 5;
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [previewHistoryEntry, setPreviewHistoryEntry] = useState<BoundaryHistoryEntry | null>(null);

  // Map center: Navsari center default [20.9325, 72.9280]
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.9325, 72.9280]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  const fetchBoundaryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cityRes, wardsRes] = await Promise.all([
        api.getCityBoundary().catch(() => ({ success: false, data: { city_boundary: [] } })),
        api.getAdminWards().catch(() => ({ success: false, data: [] }))
      ]);

      if (cityRes.success && cityRes.data?.city_boundary?.length > 0) {
        setCityBoundary(cityRes.data.city_boundary);
      } else {
        setCityBoundary(DEFAULT_NAVSARI_BOUNDARY);
      }

      if (wardsRes.success && wardsRes.data) {
        setWards(wardsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load boundary data:', err);
      setError(err.message || 'Failed to fetch boundaries');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (targetMode: 'city' | 'ward', wardNum?: number) => {
    setLoadingHistory(true);
    try {
      const res = await api.getBoundaryHistory(targetMode, targetMode === 'ward' ? wardNum : undefined);
      if (res.success && Array.isArray(res.data)) {
        setBoundaryHistory(res.data);
        setHistoryPage(1);
      } else {
        setBoundaryHistory([]);
        setHistoryPage(1);
      }
    } catch {
      setBoundaryHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchBoundaryData();
  }, [fetchBoundaryData]);

  useEffect(() => {
    fetchHistory(mode, selectedWardNumber);
  }, [mode, selectedWardNumber, fetchHistory]);

  useEffect(() => {
    if (initialWardNumber) {
      setMode('ward');
      setSelectedWardNumber(initialWardNumber);
    }
  }, [initialWardNumber]);

  const currentWard = useMemo(() => {
    return wards.find(w => w.ward_number === selectedWardNumber) || wards[0];
  }, [wards, selectedWardNumber]);

  useEffect(() => {
    if (mode === 'ward' && currentWard?.boundary_coordinates?.length > 0) {
      const [avgLat, avgLng] = getPolygonCenter(currentWard.boundary_coordinates);
      setMapCenter([avgLat, avgLng]);
      setMapZoom(15);
      if (!isDrawing) {
        setDrawnPoints(currentWard.boundary_coordinates);
      }
    } else if (mode === 'city') {
      const [avgLat, avgLng] = getPolygonCenter(cityBoundary.length > 0 ? cityBoundary : DEFAULT_NAVSARI_BOUNDARY);
      setMapCenter([avgLat, avgLng]);
      setMapZoom(13);
      if (!isDrawing) {
        setDrawnPoints(cityBoundary);
      }
    }
  }, [mode, currentWard, cityBoundary, isDrawing]);

  const resolveAndStorePointLocation = async (index: number, lng: number, lat: number) => {
    setPointLocations(prev => ({ ...prev, [index]: getNearestNavsariArea(lat, lng) }));
    setResolvingLocation(true);
    const resolved = await reverseGeocodePoint(lat, lng);
    setPointLocations(prev => ({ ...prev, [index]: resolved }));
    setResolvingLocation(false);
  };

  const handleAddPoint = (point: [number, number]) => {
    const nextIdx = drawnPoints.length;
    setDrawnPoints(prev => [...prev, point]);
    setSelectedPointIdx(nextIdx);
    setInspectedPoint(null);
    resolveAndStorePointLocation(nextIdx, point[0], point[1]);
  };

  const handleInspectPoint = async (point: [number, number]) => {
    const [lng, lat] = point;
    setInspectedPoint({ lat, lng, locationName: getNearestNavsariArea(lat, lng) });
    setResolvingLocation(true);
    const name = await reverseGeocodePoint(lat, lng);
    setInspectedPoint({ lat, lng, locationName: name });
    setResolvingLocation(false);
  };

  const handleVertexDrag = (index: number, newLatLng: L.LatLng) => {
    setDrawnPoints(prev => {
      const next = [...prev];
      next[index] = [newLatLng.lng, newLatLng.lat];
      return next;
    });
    setSelectedPointIdx(index);
    resolveAndStorePointLocation(index, newLatLng.lng, newLatLng.lat);
  };

  const handleStartRedraw = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    setPointLocations({});
    setSelectedPointIdx(null);
    setInspectedPoint(null);
    setStatusMessage('Drawing Mode Active: Click on the map to place boundary points. Latitude, Longitude & Location Name will highlight above and on the map.');
  };

  const handleEditExistingVertices = () => {
    setIsDrawing(true);
    setInspectedPoint(null);
    const existing = mode === 'city' ? cityBoundary : (currentWard?.boundary_coordinates || []);
    // Strip closing duplicate vertex while editing so dragging is intuitive
    const editable =
      existing.length > 1 &&
      existing[0][0] === existing[existing.length - 1][0] &&
      existing[0][1] === existing[existing.length - 1][1]
        ? existing.slice(0, -1)
        : existing;
    setDrawnPoints(editable);
    const initialLocs: Record<number, string> = {};
    editable.forEach((pt: [number, number], i: number) => {
      initialLocs[i] = getNearestNavsariArea(pt[1], pt[0]);
    });
    setPointLocations(initialLocs);
    setSelectedPointIdx(editable.length > 0 ? editable.length - 1 : null);
    if (editable.length > 0) {
      const lastPt = editable[editable.length - 1];
      resolveAndStorePointLocation(editable.length - 1, lastPt[0], lastPt[1]);
    }
    setStatusMessage('Edit Mode Active: Drag any vertex marker or click on the map to add new boundary points.');
  };

  const handleUndoPoint = () => {
    setDrawnPoints(prev => {
      const next = prev.slice(0, -1);
      setSelectedPointIdx(next.length > 0 ? next.length - 1 : null);
      return next;
    });
  };

  const handleClear = () => {
    setDrawnPoints([]);
    setPointLocations({});
    setSelectedPointIdx(null);
  };

  const handleResetDefault = () => {
    if (mode === 'city') {
      setDrawnPoints(DEFAULT_NAVSARI_BOUNDARY);
    } else if (currentWard) {
      setDrawnPoints(currentWard.boundary_coordinates || []);
    }
    setIsDrawing(false);
    setSelectedPointIdx(null);
    setStatusMessage('Cancelled drawing and reverted to active boundary.');
  };

  const handleSaveBoundary = async () => {
    if (drawnPoints.length < 3) {
      setError('A polygon must have at least 3 points to enclose an area.');
      return;
    }

    let finalPoints = [...drawnPoints];
    const first = finalPoints[0];
    const last = finalPoints[finalPoints.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      finalPoints.push([first[0], first[1]]);
    }

    // Build human-readable location summary from resolved point names
    const uniqueNames = Array.from(
      new Set(
        Object.values(pointLocations)
          .map(n => n.replace(/^Near\s+/i, '').split(',')[0].trim())
          .filter(Boolean)
      )
    ).slice(0, 4);
    const locationSummary =
      uniqueNames.length > 0
        ? uniqueNames.join(' · ')
        : mode === 'city'
        ? `Navsari City Perimeter (${finalPoints.length - 1} vertices)`
        : `Ward ${currentWard?.ward_number} — ${currentWard?.ward_name}`;

    setSaving(true);
    setError(null);
    try {
      if (mode === 'city') {
        const res = await api.updateCityBoundary(finalPoints, locationSummary);
        if (res.success) {
          setCityBoundary(finalPoints);
          setIsDrawing(false);
          setStatusMessage('Navsari City Geofence Boundary saved & recorded in Previous Locations history!');
          await fetchHistory('city');
          setTimeout(() => setStatusMessage(null), 5000);
        }
      } else {
        if (!currentWard) return;
        const res = await api.updateWardBoundary(currentWard.id, finalPoints, locationSummary);
        if (res.success) {
          setIsDrawing(false);
          setStatusMessage(`Ward ${currentWard.ward_number} (${currentWard.ward_name}) boundary saved & added to Previous Locations history!`);
          await Promise.all([fetchBoundaryData(), fetchHistory('ward', currentWard.ward_number)]);
          setTimeout(() => setStatusMessage(null), 5000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save boundary coordinates');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreFromHistory = async (entry: BoundaryHistoryEntry) => {
    setRestoringId(entry.id);
    setError(null);
    try {
      const res = await api.restoreBoundaryHistory(entry.id);
      if (res.success) {
        setIsDrawing(false);
        setPreviewHistoryEntry(null);
        setStatusMessage(
          res.message ||
            (entry.boundary_type === 'city'
              ? 'Previous Navsari City boundary restored successfully!'
              : `Previous Ward ${entry.ward_number} boundary restored successfully!`)
        );
        await Promise.all([
          fetchBoundaryData(),
          fetchHistory(mode, mode === 'ward' ? selectedWardNumber : undefined)
        ]);
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore previous boundary.');
    } finally {
      setRestoringId(null);
    }
  };

  const currentPolygonLatLngs = useMemo(() => {
    const pts = isDrawing ? drawnPoints : (mode === 'city' ? cityBoundary : (currentWard?.boundary_coordinates || []));
    return pts.map((p: number[] | [number, number]) => [p[1], p[0]] as [number, number]);
  }, [isDrawing, drawnPoints, mode, cityBoundary, currentWard]);

  // Active point info for the Above-Map Coordinate & Location Name Bar
  const activePointDisplay = useMemo(() => {
    if (isDrawing && selectedPointIdx !== null && drawnPoints[selectedPointIdx]) {
      const pt = drawnPoints[selectedPointIdx];
      return {
        badge: `Point #${selectedPointIdx + 1}`,
        lat: pt[1],
        lng: pt[0],
        locationName: pointLocations[selectedPointIdx] || getNearestNavsariArea(pt[1], pt[0]),
        isLivePlaced: true
      };
    }
    if (inspectedPoint) {
      return {
        badge: 'Map Pin',
        lat: inspectedPoint.lat,
        lng: inspectedPoint.lng,
        locationName: inspectedPoint.locationName,
        isLivePlaced: true
      };
    }
    if (hoverCoords) {
      return {
        badge: isDrawing ? 'Cursor (Click to Place)' : 'Cursor Position',
        lat: hoverCoords.lat,
        lng: hoverCoords.lng,
        locationName: getNearestNavsariArea(hoverCoords.lat, hoverCoords.lng),
        isLivePlaced: false
      };
    }
    return null;
  }, [isDrawing, selectedPointIdx, drawnPoints, pointLocations, inspectedPoint, hoverCoords]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Mode Switcher */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
            City &amp; Ward Boundary Geofencing
          </h2>
        </div>

        {/* Toggle Mode (2-col mobile safe, zero horizontal overflow) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center bg-slate-100 p-1 rounded-2xl gap-1 w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              setMode('city');
              setIsDrawing(false);
              setInspectedPoint(null);
            }}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center justify-center gap-1.5 min-w-0 ${
              mode === 'city'
                ? 'bg-[#095c54] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">City Boundary</span>
            <span className="hidden sm:inline">Navsari City Boundary</span>
          </button>

          <button
            onClick={() => {
              setMode('ward');
              setIsDrawing(false);
              setInspectedPoint(null);
            }}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center justify-center gap-1.5 min-w-0 ${
              mode === 'ward'
                ? 'bg-[#095c54] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">Ward Bounds</span>
            <span className="hidden sm:inline">Ward Area Boundaries</span>
          </button>
        </div>
      </div>

      {/* Notices */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Interactive Map & Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
            <h3 className="font-black text-sm text-[#0f2925] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#095c54]" />
              <span>{mode === 'city' ? 'Navsari Geofence Controls' : 'Ward Zone Controls'}</span>
            </h3>

            {mode === 'ward' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Ward ({wards.length} Wards)</label>
                <select
                  value={selectedWardNumber}
                  onChange={e => {
                    setSelectedWardNumber(Number(e.target.value));
                    setIsDrawing(false);
                    setInspectedPoint(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#095c54]"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.ward_number}>
                      Ward {w.ward_number} - {w.ward_name}
                    </option>
                  ))}
                </select>

                {currentWard && (
                  <div className="mt-3 p-3 bg-teal-50/60 rounded-2xl border border-teal-100 text-[11px] space-y-1">
                    <div className="font-black text-[#095c54]">{currentWard.ward_name}</div>
                    <div className="text-slate-600 font-medium">Officer: {currentWard.ward_officer_name}</div>
                    <div className="text-slate-500">Address: {currentWard.office_address}</div>
                  </div>
                )}
              </div>
            )}

            {/* Geofencing Status Card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                <Info className="w-3.5 h-3.5 text-[#095c54]" />
                <span>Geofencing Rules</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {mode === 'city'
                  ? 'Click any point on the map to verify its latitude, longitude & street name before saving the Navsari boundary.'
                  : 'Place boundary vertices around the ward perimeter. Each point highlights its exact street/area name on the map.'}
              </p>
            </div>

            {/* Drawing Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-700">Drawing Actions</div>

              {!isDrawing ? (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={handleStartRedraw}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Redraw Perimeter (Click Map)</span>
                  </button>

                  <button
                    onClick={handleEditExistingVertices}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Edit Existing Vertices</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                    Active: Click on map to place points ({drawnPoints.length} placed).
                  </div>

                  {/* Placed points quick selector */}
                  {drawnPoints.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-0.5">
                      {drawnPoints.map((pt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedPointIdx(idx);
                            setMapCenter([pt[1], pt[0]]);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[10px] transition ${
                            selectedPointIdx === idx
                              ? 'bg-[#e6f4f1] border-[#095c54] text-[#0f2925] font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Point #{idx + 1}</span>
                            <span className="font-mono text-[9px] text-slate-500">
                              {pt[1].toFixed(4)}, {pt[0].toFixed(4)}
                            </span>
                          </div>
                          <div className="truncate text-[10px] text-[#095c54]">
                            {pointLocations[idx] || getNearestNavsariArea(pt[1], pt[0])}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleUndoPoint}
                      disabled={drawnPoints.length === 0}
                      className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo Point</span>
                    </button>

                    <button
                      onClick={handleClear}
                      className="py-2 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  <button
                    onClick={handleSaveBoundary}
                    disabled={saving || drawnPoints.length < 3}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save {mode === 'city' ? 'City Geofence' : 'Ward Boundary'}</span>
                  </button>

                  <button
                    onClick={handleResetDefault}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
                  >
                    Cancel / Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Map Column: Above-Map Lat/Lng & Location Highlight Bar + Interactive Map */}
        <div className="lg:col-span-3 space-y-3">
          {/* LIVE LATITUDE, LONGITUDE & LOCATION NAME BAR DIRECTLY ABOVE THE MAP */}
          <div className="bg-white rounded-2xl border border-[#cde6df] shadow-2xs p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {activePointDisplay ? (
              <>
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activePointDisplay.isLivePlaced
                        ? 'bg-[#095c54] text-white'
                        : 'bg-teal-50 text-[#095c54] border border-teal-200'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-[#e6f4f1] text-[#095c54] text-[10px] font-black uppercase tracking-wider border border-[#a7f3d0]">
                        {activePointDisplay.badge}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-[#0f2925] truncate">
                        {activePointDisplay.locationName}
                      </span>
                      {resolvingLocation && (
                        <RefreshCw className="w-3 h-3 animate-spin text-[#095c54] shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono">
                    <span className="text-slate-400 font-sans font-bold uppercase text-[9px] mr-1.5">Lat</span>
                    <strong className="text-[#095c54]">{activePointDisplay.lat.toFixed(6)}° N</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono">
                    <span className="text-slate-400 font-sans font-bold uppercase text-[9px] mr-1.5">Lng</span>
                    <strong className="text-[#095c54]">{activePointDisplay.lng.toFixed(6)}° E</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                <MapPin className="w-4 h-4 text-[#095c54] shrink-0" />
                <span>
                  Click anywhere on the map (or start drawing) to view live <strong>Latitude</strong>, <strong>Longitude</strong>, and highlighted <strong>Location Name</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Interactive Map Canvas (Mobile-safe height) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden h-[320px] sm:h-[460px] lg:h-[560px] relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              className="h-full w-full z-0"
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapInteractionHandler
                isDrawing={isDrawing}
                onAddPoint={handleAddPoint}
                onInspectPoint={handleInspectPoint}
                onHoverCoords={setHoverCoords}
              />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* All Wards */}
              {wards.map(ward => {
                const isSelected = mode === 'ward' && ward.ward_number === selectedWardNumber;
                if (!ward.boundary_coordinates || ward.boundary_coordinates.length < 3) return null;
                const latLngs = ward.boundary_coordinates.map((p: number[]) => [p[1], p[0]] as [number, number]);

                return (
                  <Polygon
                    key={ward.id}
                    positions={latLngs}
                    interactive={!isDrawing}
                    eventHandlers={{
                      click: (e) => {
                        if (isDrawing) {
                          handleAddPoint([e.latlng.lng, e.latlng.lat]);
                        }
                      }
                    }}
                    pathOptions={{
                      color: isSelected ? '#095c54' : '#14b8a6',
                      fillColor: isSelected ? '#095c54' : '#2dd4bf',
                      fillOpacity: isSelected ? 0.3 : 0.07,
                      weight: isSelected ? 3 : 1,
                      dashArray: isSelected ? undefined : '4, 4'
                    }}
                  >
                    {!isDrawing && (
                      <Popup>
                        <div className="text-xs font-bold text-[#0f2925]">
                          <div className="font-black text-sm">Ward {ward.ward_number}: {ward.ward_name}</div>
                          <div className="text-slate-500 font-medium">{ward.office_address}</div>
                          <div className="text-[#095c54] mt-1 font-bold">Officer: {ward.ward_officer_name}</div>
                        </div>
                      </Popup>
                    )}
                  </Polygon>
                );
              })}

              {/* Navsari City Outer Boundary Polygon */}
              {cityBoundary.length > 2 && (
                <Polygon
                  positions={cityBoundary.map(p => [p[1], p[0]] as [number, number])}
                  interactive={!isDrawing}
                  eventHandlers={{
                    click: (e) => {
                      if (isDrawing) {
                        handleAddPoint([e.latlng.lng, e.latlng.lat]);
                      }
                    }
                  }}
                  pathOptions={{
                    color: '#043e39',
                    fillColor: '#095c54',
                    fillOpacity: mode === 'city' ? 0.14 : 0.02,
                    weight: mode === 'city' ? 3 : 1.5,
                    dashArray: mode === 'city' ? undefined : '6, 6'
                  }}
                >
                  {!isDrawing && (
                    <Popup>
                      <div className="text-xs font-bold text-[#0f2925]">
                        <div className="font-black text-sm">Navsari Municipal Corporation (NMC)</div>
                        <div className="text-slate-500">Official Municipal Jurisdiction Limits</div>
                      </div>
                    </Popup>
                  )}
                </Polygon>
              )}

              {/* Active Drawn / Edited Polygon */}
              {isDrawing && currentPolygonLatLngs.length > 2 && (
                <Polygon
                  positions={currentPolygonLatLngs}
                  interactive={false}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.22,
                    weight: 2.5
                  }}
                />
              )}

              {/* Inspected Pin (when clicking map outside drawing mode) with Permanent Highlighted Location Name */}
              {!isDrawing && inspectedPoint && (
                <Marker position={[inspectedPoint.lat, inspectedPoint.lng]} icon={inspectPinIcon}>
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <div className="text-[11px] font-black text-[#0f2925] px-1">
                      📍 {inspectedPoint.locationName}
                    </div>
                  </Tooltip>
                </Marker>
              )}

              {/* Vertex Markers with Permanent Highlighted Location Name Tooltips ON the Map */}
              {isDrawing &&
                drawnPoints.map((pt, idx) => {
                  const isActivePt = idx === selectedPointIdx || (selectedPointIdx === null && idx === drawnPoints.length - 1);
                  const locLabel = pointLocations[idx] || getNearestNavsariArea(pt[1], pt[0]);
                  const shortLabel = locLabel.length > 34 ? `${locLabel.slice(0, 34)}…` : locLabel;
                  return (
                    <Marker
                      key={idx}
                      position={[pt[1], pt[0]]}
                      draggable={true}
                      icon={isActivePt ? activeVertexIcon : vertexIcon}
                      eventHandlers={{
                        click: () => setSelectedPointIdx(idx),
                        dragend: e => {
                          handleVertexDrag(idx, e.target.getLatLng());
                        }
                      }}
                    >
                      <Tooltip permanent direction="top" offset={[0, -10]}>
                        <div className={`text-[10px] font-black px-0.5 ${isActivePt ? 'text-red-700' : 'text-[#095c54]'}`}>
                          #{idx + 1} · {shortLabel}
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="text-xs font-bold space-y-1">
                          <div className="font-black text-[#095c54]">Vertex #{idx + 1}</div>
                          <div>{locLabel}</div>
                          <div className="font-mono text-[10px] text-slate-600">
                            Lat: {pt[1].toFixed(6)}, Lng: {pt[0].toFixed(6)}
                          </div>
                          <div className="text-[10px] text-slate-400">Drag marker to adjust boundary</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>

            {/* Floating Status Pill over Map */}
            <div className="absolute top-4 left-14 z-[1000] bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 shadow-md flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDrawing ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>
                {isDrawing
                  ? `Drawing Active (${drawnPoints.length} vertices) · Click map to place point`
                  : mode === 'city'
                  ? 'Navsari City Geofence Active'
                  : `Ward ${selectedWardNumber} Boundary Active`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PREVIOUS SET LOCATIONS HISTORY TABLE (APPLICABLE TO BOTH NAVSARI CITY & WARD BOUNDARIES) */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0f2925]">
                Previous Set Boundaries —{' '}
                {mode === 'city'
                  ? 'Navsari City Boundary'
                  : `Ward ${selectedWardNumber}${currentWard?.ward_name ? ` (${currentWard.ward_name})` : ''}`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Preview any previous boundary on the map or click <strong>Set This Location</strong> to restore it immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchHistory(mode, mode === 'ward' ? selectedWardNumber : undefined)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh History</span>
          </button>
        </div>

        {/* Mobile Card View (< md) — Zero Horizontal Scroll */}
        <div className="md:hidden divide-y divide-slate-100">
          {loadingHistory ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#095c54]" />
              Loading previous saved boundaries...
            </div>
          ) : boundaryHistory.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 text-xs font-semibold">
              No previous boundary revisions recorded yet for{' '}
              {mode === 'city' ? 'Navsari City' : `Ward ${selectedWardNumber}`}.
            </div>
          ) : (
            boundaryHistory
              .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
              .map((entry, pageIdx) => {
                const idx = (historyPage - 1) * historyPageSize + pageIdx;
              const [cLat, cLng] = getPolygonCenter(entry.coordinates);
              const isLatest = idx === 0;
              return (
                <div key={entry.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-black text-slate-500">#{boundaryHistory.length - idx}</span>
                        <span className="font-black text-xs text-[#0f2925] truncate">
                          {entry.boundary_type === 'city' ? 'Navsari City' : `Ward ${entry.ward_number}`}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold line-clamp-1 mt-0.5">
                        {entry.location_summary || getNearestNavsariArea(cLat, cLng)}
                      </p>
                      <p className="text-[10px] font-mono text-[#095c54] font-bold">
                        {cLat.toFixed(4)}°N, {cLng.toFixed(4)}°E · {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <MiniBoundarySvgPreview coordinates={entry.coordinates} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewHistoryEntry(entry)}
                      className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-[#095c54] border border-teal-200 text-[11px] font-extrabold inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    {!isLatest && (
                      <button
                        type="button"
                        disabled={restoringId === entry.id}
                        onClick={() => handleRestoreFromHistory(entry)}
                        className="px-3 py-1.5 rounded-xl bg-[#095c54] text-white text-[11px] font-extrabold inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Set Location</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Boundary Target</th>
                <th className="py-3 px-4">Location / Highlighted Areas</th>
                <th className="py-3 px-4">Center Lat / Lng</th>
                <th className="py-3 px-4">Saved At</th>
                <th className="py-3 px-4">Preview</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingHistory ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#095c54]" />
                    Loading previous saved boundaries...
                  </td>
                </tr>
              ) : boundaryHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold">
                    No previous boundary revisions recorded yet for{' '}
                    {mode === 'city' ? 'Navsari City' : `Ward ${selectedWardNumber}`}. Save a boundary above to automatically build version history.
                  </td>
                </tr>
              ) : (
                boundaryHistory
              .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
              .map((entry, pageIdx) => {
                const idx = (historyPage - 1) * historyPageSize + pageIdx;
                  const [cLat, cLng] = getPolygonCenter(entry.coordinates);
                  const vertexCount =
                    entry.coordinates.length > 1 &&
                    entry.coordinates[0][0] === entry.coordinates[entry.coordinates.length - 1][0] &&
                    entry.coordinates[0][1] === entry.coordinates[entry.coordinates.length - 1][1]
                      ? entry.coordinates.length - 1
                      : entry.coordinates.length;
                  const isLatest = idx === 0;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-black text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>#{boundaryHistory.length - idx}</span>
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-[#0f2925]">
                          {entry.boundary_type === 'city'
                            ? 'Navsari City Boundary'
                            : `Ward ${entry.ward_number} · ${entry.ward_name || ''}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {vertexCount} Boundary Points
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[240px]">
                        <p className="font-bold text-slate-700 line-clamp-2">
                          {entry.location_summary || getNearestNavsariArea(cLat, cLng)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#095c54] font-bold whitespace-nowrap">
                        <div>{cLat.toFixed(5)}° N</div>
                        <div>{cLng.toFixed(5)}° E</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-bold">
                          {new Date(entry.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(entry.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {entry.saved_by ? ` · ${entry.saved_by}` : ''}
                        </div>
                      </td>

                      {/* Preview Column: Mini SVG shape + Interactive Map Preview Modal Button */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <MiniBoundarySvgPreview coordinates={entry.coordinates} />
                          <button
                            type="button"
                            onClick={() => setPreviewHistoryEntry(entry)}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c54] border border-teal-200 text-[11px] font-extrabold inline-flex items-center gap-1 transition whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Map</span>
                          </button>
                        </div>
                      </td>

                      {/* Action Column: Restore / Set Previous Boundary */}
                      <td className="py-3.5 px-4 text-right">
                        {isLatest ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Current Active</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={restoringId === entry.id}
                            onClick={() => handleRestoreFromHistory(entry)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] disabled:opacity-50 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition whitespace-nowrap"
                          >
                            {restoringId === entry.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Set This Location</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={historyPage}
          totalItems={boundaryHistory.length}
          pageSize={historyPageSize}
          onPageChange={setHistoryPage}
          itemLabel="saved locations"
        />
      </div>

      {/* 4. INTERACTIVE MAP PREVIEW MODAL FOR PREVIOUS BOUNDARY */}
      {previewHistoryEntry && (
        <div
          className="fixed inset-0 z-[1200] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewHistoryEntry(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-base font-black text-[#0f2925]">
                  Boundary Map Preview —{' '}
                  {previewHistoryEntry.boundary_type === 'city'
                    ? 'Navsari City Boundary'
                    : `Ward ${previewHistoryEntry.ward_number} (${previewHistoryEntry.ward_name || ''})`}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {previewHistoryEntry.location_summary} · Saved{' '}
                  {new Date(previewHistoryEntry.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewHistoryEntry(null)}
                className="p-2 rounded-xl bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-[420px] w-full relative">
              <MapContainer
                key={previewHistoryEntry.id}
                center={getPolygonCenter(previewHistoryEntry.coordinates)}
                zoom={previewHistoryEntry.boundary_type === 'city' ? 13 : 15}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polygon
                  positions={previewHistoryEntry.coordinates.map(p => [p[1], p[0]] as [number, number])}
                  pathOptions={{
                    color: '#095c54',
                    fillColor: '#10b981',
                    fillOpacity: 0.28,
                    weight: 3
                  }}
                />
                {previewHistoryEntry.coordinates.slice(0, -1).map((pt, i) => (
                  <Marker key={i} position={[pt[1], pt[0]]} icon={vertexIcon}>
                    <Tooltip permanent direction="top" offset={[0, -8]}>
                      <span className="text-[10px] font-black text-[#095c54]">
                        #{i + 1} ({pt[1].toFixed(4)}, {pt[0].toFixed(4)})
                      </span>
                    </Tooltip>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-mono">
                Center:{' '}
                <strong className="text-[#095c54]">
                  {getPolygonCenter(previewHistoryEntry.coordinates)[0].toFixed(6)}° N,{' '}
                  {getPolygonCenter(previewHistoryEntry.coordinates)[1].toFixed(6)}° E
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewHistoryEntry(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  disabled={restoringId === previewHistoryEntry.id}
                  onClick={() => handleRestoreFromHistory(previewHistoryEntry)}
                  className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm transition"
                >
                  {restoringId === previewHistoryEntry.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Set This Location as Active Boundary</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
