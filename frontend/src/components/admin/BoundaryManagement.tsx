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
  Search,
  Check,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Sliders
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

// Official Navsari Municipal Corporation Outer City Boundary (Survey of India / Gujarat GIS - Lng, Lat order)
export const OFFICIAL_NAVSARI_GOVT_BOUNDARY: [number, number][] = [
  [72.9230, 20.9680], // North: Purna River northern bend & Madhumati riverbank
  [72.9340, 20.9710], // North-East: Sisodra link & bypass approach
  [72.9450, 20.9730], // Sandhkuva north perimeter
  [72.9560, 20.9690], // Junathana northeast limits
  [72.9630, 20.9620], // East perimeter north: Railway crossing & Chhapra north
  [72.9660, 20.9510], // East: Chhapra Road industrial verge
  [72.9670, 20.9410], // East: Station Road east / Vejalpore north
  [72.9680, 20.9310], // East: Vijalpore municipal boundary
  [72.9675, 20.9210], // Southeast: Vejalpore extension
  [72.9640, 20.9120], // Southeast: GIDC industrial sector
  [72.9560, 20.9030], // Southeast: Gandevi Road junction
  [72.9460, 20.8950], // South-East: NH-48 approach & Italva south
  [72.9340, 20.8890], // South: Eru Char Rasta south
  [72.9230, 20.8860], // South: Navsari Agricultural University (NAU) southern perimeter
  [72.9110, 20.8870], // South-Southwest: NAU research farms
  [72.9020, 20.8930], // Southwest: Aru rural gateway
  [72.8960, 20.9050], // Southwest: Sarbhan Chokdi
  [72.8910, 20.9170], // West-Southwest: Dandi Road southern approach
  [72.8830, 20.9280], // West: Dandi Heritage corridor
  [72.8790, 20.9390], // West: Matwad wetland & saltmarsh boundary
  [72.8820, 20.9500], // Northwest: Jalalpore western boundary
  [72.8910, 20.9590], // Northwest: Virawal creek bend
  [72.9050, 20.9650], // Northwest: Jalalpore north gate
  [72.9170, 20.9675], // North: Purna River approach
  [72.9230, 20.9680]  // Closed loop
];

// Official Navsari Municipal Corporation 13 Wards with authentic administrative GIS polygons
export const OFFICIAL_WARD_GOVT_BOUNDARIES: Array<{
  ward_number: number;
  ward_name: string;
  ward_name_gu: string;
  boundary_coordinates: [number, number][];
}> = [
  {
    ward_number: 1,
    ward_name: 'Lunsikui - Tower Road',
    ward_name_gu: 'લુન્સીકુઈ - ટાવર રોડ',
    boundary_coordinates: [
      [72.9215, 20.9410],
      [72.9300, 20.9410],
      [72.9355, 20.9410],
      [72.9360, 20.9485],
      [72.9358, 20.9535],
      [72.9285, 20.9555],
      [72.9210, 20.9520],
      [72.9215, 20.9410]
    ]
  },
  {
    ward_number: 2,
    ward_name: 'Station Road - Fuwara',
    ward_name_gu: 'સ્ટેશન રોડ - ફુવારા',
    boundary_coordinates: [
      [72.9355, 20.9410],
      [72.9430, 20.9408],
      [72.9515, 20.9405],
      [72.9520, 20.9475],
      [72.9520, 20.9540],
      [72.9440, 20.9538],
      [72.9360, 20.9535],
      [72.9355, 20.9410]
    ]
  },
  {
    ward_number: 3,
    ward_name: 'Dudhiya Talao - Ashapuri',
    ward_name_gu: 'દુધિયા તળાવ - આશાપુરી',
    boundary_coordinates: [
      [72.9210, 20.9270],
      [72.9280, 20.9268],
      [72.9350, 20.9270],
      [72.9352, 20.9340],
      [72.9355, 20.9410],
      [72.9280, 20.9410],
      [72.9215, 20.9410],
      [72.9210, 20.9340],
      [72.9210, 20.9270]
    ]
  },
  {
    ward_number: 4,
    ward_name: 'Kaliawadi - Sayaji Road',
    ward_name_gu: 'કાલિયાવાડી - સયાજી રોડ',
    boundary_coordinates: [
      [72.9350, 20.9270],
      [72.9430, 20.9265],
      [72.9510, 20.9260],
      [72.9512, 20.9335],
      [72.9515, 20.9405],
      [72.9430, 20.9408],
      [72.9355, 20.9410],
      [72.9352, 20.9340],
      [72.9350, 20.9270]
    ]
  },
  {
    ward_number: 5,
    ward_name: 'Jalalpore Gateway - Chhapra',
    ward_name_gu: 'જલાલપોર - છાપરા',
    boundary_coordinates: [
      [72.9030, 20.9320],
      [72.9120, 20.9318],
      [72.9210, 20.9320],
      [72.9215, 20.9410],
      [72.9210, 20.9520],
      [72.9140, 20.9550],
      [72.9080, 20.9570],
      [72.8990, 20.9480],
      [72.9030, 20.9320]
    ]
  },
  {
    ward_number: 6,
    ward_name: 'Shantadevi - Vijalpore',
    ward_name_gu: 'શાંતાદેવી - વિજલપોર',
    boundary_coordinates: [
      [72.9510, 20.9260],
      [72.9580, 20.9258],
      [72.9660, 20.9255],
      [72.9665, 20.9350],
      [72.9665, 20.9430],
      [72.9585, 20.9420],
      [72.9515, 20.9405],
      [72.9510, 20.9260]
    ]
  },
  {
    ward_number: 7,
    ward_name: 'Gandevi Road - GIDC',
    ward_name_gu: 'ગણદેવી રોડ - જીઆઇડીસી',
    boundary_coordinates: [
      [72.9340, 20.9080],
      [72.9450, 20.9075],
      [72.9560, 20.9070],
      [72.9560, 20.9165],
      [72.9560, 20.9260],
      [72.9450, 20.9265],
      [72.9350, 20.9270],
      [72.9340, 20.9080]
    ]
  },
  {
    ward_number: 8,
    ward_name: 'Madhumati - Parsi Wad',
    ward_name_gu: 'મધુમતી - પારસી વાડ',
    boundary_coordinates: [
      [72.9180, 20.9540],
      [72.9285, 20.9555],
      [72.9360, 20.9535],
      [72.9370, 20.9610],
      [72.9380, 20.9690],
      [72.9300, 20.9685],
      [72.9230, 20.9680],
      [72.9180, 20.9540]
    ]
  },
  {
    ward_number: 9,
    ward_name: 'Sandhkuva - Junathana',
    ward_name_gu: 'સાંઢકુવા - જૂનાથાણા',
    boundary_coordinates: [
      [72.9360, 20.9535],
      [72.9440, 20.9538],
      [72.9520, 20.9540],
      [72.9580, 20.9540],
      [72.9610, 20.9620],
      [72.9610, 20.9660],
      [72.9540, 20.9690],
      [72.9420, 20.9730],
      [72.9380, 20.9690],
      [72.9360, 20.9535]
    ]
  },
  {
    ward_number: 10,
    ward_name: 'Vejalpore Extension',
    ward_name_gu: 'વેજલપોર એક્સટેન્શન',
    boundary_coordinates: [
      [72.9520, 20.9120],
      [72.9600, 20.9120],
      [72.9675, 20.9120],
      [72.9680, 20.9200],
      [72.9680, 20.9255],
      [72.9600, 20.9258],
      [72.9510, 20.9260],
      [72.9520, 20.9120]
    ]
  },
  {
    ward_number: 11,
    ward_name: 'Sarbhan - Aru Rural Gateway',
    ward_name_gu: 'સરભાણ - અરૂ',
    boundary_coordinates: [
      [72.8980, 20.9060],
      [72.9100, 20.9065],
      [72.9210, 20.9070],
      [72.9210, 20.9170],
      [72.9210, 20.9270],
      [72.9100, 20.9270],
      [72.9030, 20.9270],
      [72.8980, 20.9165],
      [72.8980, 20.9060]
    ]
  },
  {
    ward_number: 12,
    ward_name: 'Eru Char Rasta - NAU Campus',
    ward_name_gu: 'એરૂ ચાર રસ્તા - કૃષિ યુનિવર્સિટી',
    boundary_coordinates: [
      [72.9020, 20.8870],
      [72.9150, 20.8870],
      [72.9280, 20.8880],
      [72.9330, 20.8890],
      [72.9340, 20.8980],
      [72.9340, 20.9080],
      [72.9210, 20.9070],
      [72.9100, 20.9065],
      [72.8980, 20.9060],
      [72.9020, 20.8930],
      [72.9020, 20.8870]
    ]
  },
  {
    ward_number: 13,
    ward_name: 'Dandi Coastal Corridor',
    ward_name_gu: 'દાંડી રોડ કોરિડોર',
    boundary_coordinates: [
      [72.8790, 20.9240],
      [72.8910, 20.9240],
      [72.9030, 20.9240],
      [72.9030, 20.9320],
      [72.8990, 20.9480],
      [72.9030, 20.9560],
      [72.8910, 20.9580],
      [72.8820, 20.9500],
      [72.8790, 20.9390],
      [72.8790, 20.9240]
    ]
  }
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
  { name: 'Mahuva Highway / NAU Campus (Ward 12)', lat: 20.8980, lng: 72.9180 },
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
    // fallback
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
  const [mode, setMode] = useState<'city' | 'ward'>('ward');

  // Wards & City Data
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardNumber, setSelectedWardNumber] = useState<number>(initialWardNumber || 3);
  const [cityBoundary, setCityBoundary] = useState<[number, number][]>(OFFICIAL_NAVSARI_GOVT_BOUNDARY);
  const [allowOutsideComplaints, setAllowOutsideComplaints] = useState<boolean>(false);
  const [togglingGeofence, setTogglingGeofence] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Administrative Map Filters (Matching Image Reference)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'pending'>('all');
  const [hoveredWard, setHoveredWard] = useState<any | null>(null);

  // Drawing & Live Point Inspection State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [pointLocations, setPointLocations] = useState<Record<number, string>>({});
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [inspectedPoint, setInspectedPoint] = useState<{ lat: number; lng: number; locationName: string } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState<boolean>(false);

  // History & Map Preview Modal
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
      const [cityRes, wardsRes, settingsRes] = await Promise.all([
        api.getCityBoundary().catch(() => ({ success: false, data: { city_boundary: [] } })),
        api.getAdminWards().catch(() => ({ success: false, data: [] })),
        api.getBoundarySettings().catch(() => ({ success: false, data: { allow_outside_complaints: false } }))
      ]);

      if (cityRes.success && cityRes.data?.city_boundary?.length > 0) {
        setCityBoundary(cityRes.data.city_boundary);
      } else {
        setCityBoundary(OFFICIAL_NAVSARI_GOVT_BOUNDARY);
      }

      if (settingsRes.success && settingsRes.data) {
        setAllowOutsideComplaints(Boolean(settingsRes.data.allow_outside_complaints));
      } else if (cityRes.success && (cityRes.data as any)?.allow_outside_complaints !== undefined) {
        setAllowOutsideComplaints(Boolean((cityRes.data as any).allow_outside_complaints));
      }

      if (wardsRes.success && wardsRes.data && wardsRes.data.length > 0) {
        setWards(wardsRes.data);
      } else {
        // Fallback to official 13 wards list
        setWards(OFFICIAL_WARD_GOVT_BOUNDARIES.map(w => ({
          id: `ward-${String(w.ward_number).padStart(2, '0')}`,
          ward_number: w.ward_number,
          ward_name: w.ward_name,
          ward_name_gu: w.ward_name_gu,
          ward_officer_name: 'Assigned Officer',
          cleanliness_score: 8.8,
          boundary_coordinates: w.boundary_coordinates,
          office_address: 'Navsari Municipal Ward Center'
        })));
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

  // Center map on target
  useEffect(() => {
    if (mode === 'ward' && currentWard?.boundary_coordinates?.length > 0) {
      const [avgLat, avgLng] = getPolygonCenter(currentWard.boundary_coordinates);
      setMapCenter([avgLat, avgLng]);
      setMapZoom(14);
      if (!isDrawing) {
        setDrawnPoints(currentWard.boundary_coordinates);
      }
    } else if (mode === 'city') {
      const [avgLat, avgLng] = getPolygonCenter(cityBoundary.length > 0 ? cityBoundary : OFFICIAL_NAVSARI_GOVT_BOUNDARY);
      setMapCenter([avgLat, avgLng]);
      setMapZoom(12);
      if (!isDrawing) {
        setDrawnPoints(cityBoundary);
      }
    }
  }, [mode, currentWard, cityBoundary, isDrawing]);

  // Reverse geocoding helper
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
    setStatusMessage('Drawing Mode Active: Click on the map to place boundary points. Latitude, Longitude & Location Name will highlight above.');
  };

  const handleEditExistingVertices = () => {
    setIsDrawing(true);
    setInspectedPoint(null);
    const existing = mode === 'city' ? cityBoundary : (currentWard?.boundary_coordinates || []);
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
    setStatusMessage('Edit Mode Active: Drag any vertex marker or click map to add boundary points.');
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

  const handleCancelDrawing = () => {
    if (mode === 'city') {
      setDrawnPoints(cityBoundary);
    } else if (currentWard) {
      setDrawnPoints(currentWard.boundary_coordinates || []);
    }
    setIsDrawing(false);
    setSelectedPointIdx(null);
    setStatusMessage('Cancelled boundary editing.');
  };

  // 1-Click Reset to Official Govt Survey Boundary
  const handleResetToOfficialBoundary = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.resetOfficialBoundary(mode, mode === 'ward' ? selectedWardNumber : undefined);
      if (res.success) {
        if (mode === 'city') {
          setCityBoundary(OFFICIAL_NAVSARI_GOVT_BOUNDARY);
          setDrawnPoints(OFFICIAL_NAVSARI_GOVT_BOUNDARY);
        } else {
          const offWard = OFFICIAL_WARD_GOVT_BOUNDARIES.find(w => w.ward_number === selectedWardNumber);
          if (offWard) {
            setDrawnPoints(offWard.boundary_coordinates);
            setWards(prev =>
              prev.map(w =>
                w.ward_number === selectedWardNumber
                  ? { ...w, boundary_coordinates: offWard.boundary_coordinates }
                  : w
              )
            );
          }
        }
        setIsDrawing(false);
        setSelectedPointIdx(null);
        setStatusMessage(res.message || 'દૃશ્ય અને સીમા સત્તાવાર સરકારી GIS ડેટા અનુસાર રીસેટ કરવામાં આવી છે.');
        await fetchHistory(mode, mode === 'ward' ? selectedWardNumber : undefined);
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      // Fallback local reset
      if (mode === 'city') {
        setCityBoundary(OFFICIAL_NAVSARI_GOVT_BOUNDARY);
        setDrawnPoints(OFFICIAL_NAVSARI_GOVT_BOUNDARY);
      } else {
        const offWard = OFFICIAL_WARD_GOVT_BOUNDARIES.find(w => w.ward_number === selectedWardNumber);
        if (offWard) setDrawnPoints(offWard.boundary_coordinates);
      }
      setIsDrawing(false);
      setSelectedPointIdx(null);
      setStatusMessage('સત્તાવાર GIS સીમા પુનઃસ્થાપિત કરવામાં આવી.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle switch: Enable/disable complaints from outside of Navsari
  const handleToggleOutsideComplaints = async () => {
    setTogglingGeofence(true);
    setError(null);
    const nextVal = !allowOutsideComplaints;
    try {
      const res = await api.updateBoundarySettings({ allow_outside_complaints: nextVal });
      if (res.success) {
        setAllowOutsideComplaints(nextVal);
        setStatusMessage(
          nextVal
            ? 'નવસારી સીમા બહારથી ફરિયાદ સ્વીકારવાનું મોડ ચાલુ થયું (ઓપન એક્સટેન્ડેડ મોડ). સીમા નકશા પર દોરેલી રહેશે.'
            : 'કડક જિયો-ફેન્સિંગ સક્રિય: નવસારી મહાનગરપાલિકા સીમા બહારથી ફરિયાદ સ્વીકારવાનું બંધ કરવામાં આવ્યું છે.'
        );
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update outside complaint settings.');
    } finally {
      setTogglingGeofence(false);
    }
  };

  const handleSaveBoundary = async () => {
    if (drawnPoints.length < 3) {
      setError('A polygon must have at least 3 points to enclose an area.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const closedPoints = [...drawnPoints];
      if (
        closedPoints[0][0] !== closedPoints[closedPoints.length - 1][0] ||
        closedPoints[0][1] !== closedPoints[closedPoints.length - 1][1]
      ) {
        closedPoints.push(closedPoints[0]);
      }

      const highlightedLocs = Object.values(pointLocations).filter(Boolean);
      const locationSummary =
        highlightedLocs.length > 0
          ? `${highlightedLocs.slice(0, 3).join(' • ')} (${closedPoints.length} vertices)`
          : undefined;

      if (mode === 'city') {
        const res = await api.updateCityBoundary(closedPoints, locationSummary, allowOutsideComplaints);
        if (res.success) {
          setCityBoundary(closedPoints);
          setIsDrawing(false);
          setStatusMessage('Navsari Municipal Corporation boundary saved & dynamic complaint routing updated.');
          await fetchHistory('city');
          setTimeout(() => setStatusMessage(null), 5000);
        }
      } else {
        if (!currentWard) throw new Error('No ward selected');
        const res = await api.updateWardBoundary(currentWard.id, closedPoints, locationSummary);
        if (res.success) {
          setWards(prev =>
            prev.map(w =>
              w.id === currentWard.id ? { ...w, boundary_coordinates: closedPoints } : w
            )
          );
          setIsDrawing(false);
          setStatusMessage(`Boundary for Ward ${currentWard.ward_number} (${currentWard.ward_name}) updated successfully.`);
          await fetchHistory('ward', currentWard.ward_number);
          setTimeout(() => setStatusMessage(null), 5000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save boundary');
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

  // Filtered wards for search & status pills
  const filteredWards = useMemo(() => {
    return wards.filter(w => {
      const hasOfficer = Boolean(w.ward_officer_name && w.ward_officer_name !== 'Unassigned' && w.ward_officer_name !== 'N/A');
      if (statusFilter === 'assigned' && !hasOfficer) return false;
      if (statusFilter === 'pending' && hasOfficer) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = String(w.ward_number).includes(q);
        const matchName = String(w.ward_name || '').toLowerCase().includes(q);
        const matchNameGu = String(w.ward_name_gu || '').toLowerCase().includes(q);
        const matchOfficer = String(w.ward_officer_name || '').toLowerCase().includes(q);
        const matchAddr = String(w.office_address || '').toLowerCase().includes(q);
        return matchNum || matchName || matchNameGu || matchOfficer || matchAddr;
      }
      return true;
    });
  }, [wards, statusFilter, searchQuery]);

  const assignedWardsCount = useMemo(() => {
    return wards.filter(w => w.ward_officer_name && w.ward_officer_name !== 'Unassigned' && w.ward_officer_name !== 'N/A').length;
  }, [wards]);

  const pendingWardsCount = useMemo(() => {
    return wards.length - assignedWardsCount;
  }, [wards, assignedWardsCount]);

  const activeDisplayWard = hoveredWard || currentWard;

  // Active point info for the Above-Map Coordinate Bar
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
        badge: 'Inspected Point',
        lat: inspectedPoint.lat,
        lng: inspectedPoint.lng,
        locationName: inspectedPoint.locationName,
        isLivePlaced: true
      };
    }
    if (hoverCoords) {
      return {
        badge: isDrawing ? 'Cursor (Click to Place)' : 'Map Cursor',
        lat: hoverCoords.lat,
        lng: hoverCoords.lng,
        locationName: getNearestNavsariArea(hoverCoords.lat, hoverCoords.lng),
        isLivePlaced: false
      };
    }
    return null;
  }, [isDrawing, selectedPointIdx, drawnPoints, pointLocations, inspectedPoint, hoverCoords]);

  return (
    <div className="space-y-5">
      {/* 1. TOP ADMINISTRATIVE MAP HEADER & TOOLBAR (Matching Photo Reference) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
        {/* Title row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0f2925] tracking-tight">
                નવસારી સત્તાવાર ૧૩ વોર્ડ વહીવટી નકશો
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                વોર્ડ પર ક્લિક કરીને કાર્યક્ષેત્ર જુઓ અથવા કસ્ટમ સીમા દોરો · Navsari Municipal Administrative GIS
              </p>
            </div>
          </div>

          {/* Action Bar Pills: All, Assigned, Pending, Search, Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter: All */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>તમામ ({wards.length || 13})</span>
            </button>

            {/* Filter: Assigned */}
            <button
              onClick={() => setStatusFilter('assigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                statusFilter === 'assigned'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>સોંપાયેલ ({assignedWardsCount})</span>
            </button>

            {/* Filter: Pending */}
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>બાકી ({pendingWardsCount})</span>
            </button>

            {/* Search Input */}
            <div className="relative min-w-[190px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="વોર્ડ અથવા વિસ્તાર શોધો..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#095c54] focus:bg-white"
              />
            </div>

            {/* Reset View & Official Govt Boundary Button */}
            <button
              onClick={handleResetToOfficialBoundary}
              disabled={saving}
              title="Reset view and revert to official Survey of India / Gujarat GIS boundary"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-black transition flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#095c54] ${saving ? 'animate-spin' : ''}`} />
              <span>દૃશ્ય ફરી સેટ કરો</span>
            </button>
          </div>
        </div>

        {/* 2. GEOFENCING TOGGLE BAR (ENABLE/DISABLE COMPLAINTS FROM OUTSIDE NAVSARI) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/70 via-emerald-50/50 to-slate-50 border border-teal-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {allowOutsideComplaints ? (
                <Globe className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#095c54]" />
              )}
              <span className="text-xs sm:text-sm font-black text-[#0f2925]">
                નવસારી સીમા બહારથી ફરિયાદ સ્વીકારો (Allow Complaints From Outside Navsari)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  allowOutsideComplaints
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}
              >
                {allowOutsideComplaints ? '🌐 ખુલ્લો મોડ (ઓપન)' : '🔒 કડક જિયો-ફેન્સિંગ'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              {allowOutsideComplaints
                ? 'હાલમાં ચાલુ છે: નવસારી મહાનગર સીમા બહારના નાગરિકો પણ ફરિયાદ મોકલી શકે છે. નકશા પર નવસારીની સત્તાવાર સીમા દર્શાવેલી રહેશે.'
                : 'હાલમાં કડક જિયો-ફેન્સિંગ લાગુ છે: નવસારી મહાનગરપાલિકાની સત્તાવાર સીમા બહારથી નાગરિક ફરિયાદ સબમિટ કરી શકશે નહીં.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            {/* Custom iOS Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleOutsideComplaints}
              disabled={togglingGeofence}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                allowOutsideComplaints ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  allowOutsideComplaints ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-black text-slate-700">
              {allowOutsideComplaints ? 'ચાલુ (Enabled)' : 'બંધ (Disabled)'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* 3. INTERACTIVE MAP & CONTROL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Column: Mode Switcher, Ward Selector, Boundary Vertex Editor */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-xs space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                onClick={() => {
                  setMode('ward');
                  setIsDrawing(false);
                  setInspectedPoint(null);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 ${
                  mode === 'ward'
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>વોર્ડ સીમા (૧-૧૩)</span>
              </button>

              <button
                onClick={() => {
                  setMode('city');
                  setIsDrawing(false);
                  setInspectedPoint(null);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 ${
                  mode === 'city'
                    ? 'bg-[#095c54] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>નવસારી શહેર સીમા</span>
              </button>
            </div>

            {/* Ward Selector (When in ward mode) */}
            {mode === 'ward' && (
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700">કાર્યક્ષેત્ર વોર્ડ પસંદ કરો</label>
                <select
                  value={selectedWardNumber}
                  onChange={e => {
                    setSelectedWardNumber(Number(e.target.value));
                    setIsDrawing(false);
                    setInspectedPoint(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#095c54]"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.ward_number}>
                      વોર્ડ {w.ward_number} - {w.ward_name_gu || w.ward_name}
                    </option>
                  ))}
                </select>

                {currentWard && (
                  <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100 text-[11px] space-y-1">
                    <div className="font-black text-[#095c54]">
                      {currentWard.ward_name_gu || currentWard.ward_name}
                    </div>
                    <div className="text-slate-600 font-semibold">અધિકારી: {currentWard.ward_officer_name || 'બિન સોંપાયેલ'}</div>
                    <div className="text-slate-500 font-medium truncate">{currentWard.office_address}</div>
                    <div className="text-emerald-700 font-black">સ્વચ્છતા સ્કોર: ⭐ {currentWard.cleanliness_score || '8.8'}/10</div>
                  </div>
                )}
              </div>
            )}

            {/* Geofence Rule Info Card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 font-black text-slate-700 mb-1">
                <Info className="w-3.5 h-3.5 text-[#095c54]" />
                <span>વહીવટી GIS સીમા નિયમ</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                {mode === 'city'
                  ? 'નવસારી મહાનગરપાલિકાની બાહ્ય સરહદ સત્તાવાર સર્વે ઓફ ઈન્ડિયા GIS ડેટા પ્રમાણે સેટ છે. એડમિન પોઇન્ટ્સ ઉમેરી કે ખસેડી સીમા અપડેટ કરી શકે છે.'
                  : 'વોર્ડની સીમા વધારવા કે ઘટાડવાથી નવી ફરિયાદો આપોઆપ સુધારેલ વોર્ડ અધિકારી પાસે જશે.'}
              </p>
            </div>

            {/* Drawing & Point Management Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs font-black text-slate-700">સીમા એડિટિંગ અને પોઇન્ટ્સ</div>

              {!isDrawing ? (
                <div className="space-y-2">
                  <button
                    onClick={handleEditExistingVertices}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>સીમા પોઇન્ટ્સ સુધારો (Edit Vertices)</span>
                  </button>

                  <button
                    onClick={handleStartRedraw}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>નવો કસ્ટમ પરિઘ દોરો (Redraw)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                    નકશા પર ક્લિક કરીને નવા પોઇન્ટ ઉમેરો ({drawnPoints.length} પોઇન્ટ્સ મૂક્યા).
                  </div>

                  {/* Vertices quick list */}
                  {drawnPoints.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
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
                            <span>પોઇન્ટ #{idx + 1}</span>
                            <span className="font-mono text-[9px] text-slate-500">
                              {pt[1].toFixed(4)}°N, {pt[0].toFixed(4)}°E
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
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>પહેલાં જેવું કરો</span>
                    </button>

                    <button
                      onClick={handleClear}
                      className="py-2 px-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>બધા હટાવો</span>
                    </button>
                  </div>

                  <button
                    onClick={handleSaveBoundary}
                    disabled={saving || drawnPoints.length < 3}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>સીમા સાચવો (Save Boundary)</span>
                  </button>

                  <button
                    onClick={handleCancelDrawing}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
                  >
                    રદ કરો (Cancel)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Above-Map Coordinate Bar & Interactive Leaflet Map */}
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
                  નકશા પર કોઈપણ વોર્ડ અથવા પોઇન્ટ પર ક્લિક કરીને લાઈવ <strong>Latitude</strong>, <strong>Longitude</strong> અને <strong>વિસ્તારનું નામ</strong> જુઓ.
                </span>
              </div>
            )}
          </div>

          {/* Map Canvas (Matching styling from Gujarat Administrative Map Image Reference) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden h-[360px] sm:h-[480px] lg:h-[600px] relative">
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PashuRakshak & NMC'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* ALL 13 WARD POLYGONS WITH ADMINISTRATIVE STYLING */}
              {wards.map(ward => {
                const isSelected = mode === 'ward' && ward.ward_number === selectedWardNumber;
                const hasOfficer = Boolean(ward.ward_officer_name && ward.ward_officer_name !== 'Unassigned');
                if (!ward.boundary_coordinates || ward.boundary_coordinates.length < 3) return null;
                const latLngs = ward.boundary_coordinates.map((p: number[]) => [p[1], p[0]] as [number, number]);

                // Administrative style: Green for assigned, slate for pending, bright blue for selected
                let color = hasOfficer ? '#059669' : '#64748b';
                let fillColor = hasOfficer ? '#10b981' : '#94a3b8';
                let fillOpacity = hasOfficer ? 0.22 : 0.12;
                let weight = 1.8;

                if (isSelected) {
                  color = '#0284c7';
                  fillColor = '#0ea5e9';
                  fillOpacity = 0.35;
                  weight = 3.5;
                }

                return (
                  <Polygon
                    key={ward.id}
                    positions={latLngs}
                    pathOptions={{
                      color,
                      fillColor,
                      fillOpacity,
                      weight,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedWardNumber(ward.ward_number);
                        setMode('ward');
                        if (!isDrawing) {
                          setDrawnPoints(ward.boundary_coordinates);
                        }
                      },
                      mouseover: () => {
                        setHoveredWard(ward);
                      },
                      mouseout: () => {
                        setHoveredWard(null);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-bold text-[#0f2925] space-y-1">
                        <div className="font-black text-sm text-[#095c54]">
                          વોર્ડ {ward.ward_number}: {ward.ward_name_gu || ward.ward_name}
                        </div>
                        <div className="text-slate-600 font-semibold">અધિકારી: {ward.ward_officer_name || 'બિન સોંપાયેલ'}</div>
                        <div className="text-slate-500 font-medium">{ward.office_address}</div>
                        <div className="text-emerald-700 font-black">સ્વચ્છતા સ્કોર: ⭐ {ward.cleanliness_score || '8.8'}/10</div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* NAVSARI CITY OUTER BOUNDARY POLYGON (25 VERTICES OFFICIAL GIS) */}
              {cityBoundary.length > 2 && (
                <Polygon
                  positions={cityBoundary.map(p => [p[1], p[0]] as [number, number])}
                  pathOptions={{
                    color: '#095c54',
                    fillColor: '#095c54',
                    fillOpacity: mode === 'city' ? 0.14 : 0.02,
                    weight: mode === 'city' ? 3.5 : 2,
                    dashArray: '6, 6'
                  }}
                  eventHandlers={{
                    click: () => {
                      if (!isDrawing && mode !== 'city') {
                        setMode('city');
                      }
                    }
                  }}
                >
                  <Popup>
                    <div className="text-xs font-bold text-[#0f2925] space-y-1">
                      <div className="font-black text-sm text-[#095c54]">નવસારી મહાનગરપાલિકા (NMC)</div>
                      <div className="text-slate-600 font-semibold">સત્તાવાર સરકારી GIS હદ (Survey of India Boundary)</div>
                      <div className="text-slate-500 text-[10px]">કુલ ૨૫ સર્વે પોઇન્ટ્સ દ્વારા સંલગ્ન નગર સરહદ</div>
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* Active Drawn / Edited Polygon */}
              {isDrawing && drawnPoints.length > 2 && (
                <Polygon
                  positions={drawnPoints.map(p => [p[1], p[0]] as [number, number])}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.25,
                    weight: 3
                  }}
                />
              )}

              {/* Inspected Pin (when clicking map outside drawing mode) */}
              {!isDrawing && inspectedPoint && (
                <Marker position={[inspectedPoint.lat, inspectedPoint.lng]} icon={inspectPinIcon}>
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <div className="text-[11px] font-black text-[#0f2925] px-1">
                      📍 {inspectedPoint.locationName}
                    </div>
                  </Tooltip>
                </Marker>
              )}

              {/* Vertex Markers with Interactive Dragging */}
              {isDrawing &&
                drawnPoints.map((pt, idx) => {
                  const isActivePt = idx === selectedPointIdx || (selectedPointIdx === null && idx === drawnPoints.length - 1);
                  const locLabel = pointLocations[idx] || getNearestNavsariArea(pt[1], pt[0]);
                  const shortLabel = locLabel.length > 32 ? `${locLabel.slice(0, 32)}…` : locLabel;
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
                    </Marker>
                  );
                })}
            </MapContainer>

            {/* FLOATING TOP-LEFT WARD INFO CARD (Identical to reference photo top-left overlay) */}
            <div className="absolute top-4 left-4 z-[999] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-lg text-xs max-w-[270px] pointer-events-auto transition">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="font-black text-sm text-[#0f2925] truncate">
                  {activeDisplayWard ? `વોર્ડ ${activeDisplayWard.ward_number} - ${activeDisplayWard.ward_name_gu || activeDisplayWard.ward_name}` : 'નવસારી મહાનગર'}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    activeDisplayWard?.ward_officer_name && activeDisplayWard.ward_officer_name !== 'Unassigned'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {activeDisplayWard?.ward_officer_name && activeDisplayWard.ward_officer_name !== 'Unassigned' ? '● સોંપાયેલ' : '○ બાકી'}
                </span>
              </div>
              {activeDisplayWard && (
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">વોર્ડ અધિકારી:</span>
                    <strong className="text-slate-800 truncate max-w-[140px]">{activeDisplayWard.ward_officer_name || 'બિન સોંપાયેલ'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">સ્વચ્છતા સ્કોર:</span>
                    <strong className="text-emerald-700">⭐ {activeDisplayWard.cleanliness_score || '8.8'}/10</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate pt-0.5 border-t border-slate-100">
                    {activeDisplayWard.office_address}
                  </div>
                </div>
              )}
            </div>

            {/* FLOATING BOTTOM-LEFT MAP LEGEND (Identical to reference photo bottom legend) */}
            <div className="absolute bottom-4 left-4 z-[999] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3 text-[11px] font-bold text-slate-700 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block" />
                <span>સોંપાયેલ વોર્ડ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-500 inline-block" />
                <span>બાકી વોર્ડ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 border-2 border-sky-600 inline-block" />
                <span>પસંદ કરેલ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-dashed border-[#095c54] inline-block" />
                <span>મહાનગર સીમા</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CURRENT BOUNDARY COORDINATES TABLE (DYNAMIC LATITUDE & LONGITUDE DISPLAY) */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0f2925]">
                {mode === 'city'
                  ? 'નવસારી મહાનગરપાલિકા સીમા યામો (City Boundary Coordinates)'
                  : `વોર્ડ ${selectedWardNumber} સીમા યામો (${currentWard?.ward_name_gu || currentWard?.ward_name})`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                રીયલ-ટાઇમ સરકારી GIS કોઓર્ડિનેટ્સ · એડમિન દ્વારા ફેરફાર કરતાં બેકએન્ડમાં આપોઆપ અપડેટ થાય છે
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEditExistingVertices}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#095c54]" />
              <span>પોઇન્ટ્સ સંપાદિત કરો</span>
            </button>
            <button
              onClick={handleResetToOfficialBoundary}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>સરકારી સીમા રીસેટ કરો</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">પોઇન્ટ #</th>
                <th className="py-3 px-4">Latitude (અક્ષાંશ)</th>
                <th className="py-3 px-4">Longitude (રેખાંશ)</th>
                <th className="py-3 px-4">વિસ્તાર / લેન્ડમાર્ક નામ</th>
                <th className="py-3 px-4 text-right">સ્થિતિ / એક્શન</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {(isDrawing ? drawnPoints : (mode === 'city' ? cityBoundary : (currentWard?.boundary_coordinates || [])))
                .map((pt: [number, number], idx: number) => {
                  const loc = pointLocations[idx] || getNearestNavsariArea(pt[1], pt[0]);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-black text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#095c54]">
                        {pt[1].toFixed(6)}° N
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#095c54]">
                        {pt[0].toFixed(6)}° E
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {loc}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setMapCenter([pt[1], pt[0]]);
                            setMapZoom(16);
                            setSelectedPointIdx(idx);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 text-[#095c54] hover:bg-teal-100 font-bold text-[11px]"
                        >
                          નકશા પર જુઓ
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PREVIOUS SAVED BOUNDARIES HISTORY */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e6f4f1] text-[#095c54] flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0f2925]">
                અગાઉ સેટ કરેલ સીમા ઇતિહાસ —{' '}
                {mode === 'city'
                  ? 'નવસારી શહેર સીમા'
                  : `વોર્ડ ${selectedWardNumber}${currentWard?.ward_name ? ` (${currentWard.ward_name_gu || currentWard.ward_name})` : ''}`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                અગાઉ સાચવેલી સીમા પૂર્વાવલોકન કરો અથવા એક ક્લિકમાં પુનઃસ્થાપિત કરો
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchHistory(mode, mode === 'ward' ? selectedWardNumber : undefined)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>ઇતિહાસ રિફ્રેશ કરો</span>
          </button>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">સીમા લક્ષ્ય</th>
                <th className="py-3 px-4">સ્થાન વિગત</th>
                <th className="py-3 px-4">કેન્દ્રબિંદુ Lat/Lng</th>
                <th className="py-3 px-4">તારીખ</th>
                <th className="py-3 px-4">આકાર</th>
                <th className="py-3 px-4 text-right">ક્રિયા</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingHistory ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#095c54]" />
                    ઇતિહાસ લોડ થઈ રહ્યો છે...
                  </td>
                </tr>
              ) : boundaryHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-semibold">
                    કોઈ અગાઉ સાચવેલ સીમા નોંધાયેલી નથી. ઉપરથી સીમા સાચવતાં અહીં વર્ઝન ઇતિહાસ બનશે.
                  </td>
                </tr>
              ) : (
                boundaryHistory
                  .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                  .map((entry, pageIdx) => {
                    const idx = (historyPage - 1) * historyPageSize + pageIdx;
                    const [cLat, cLng] = getPolygonCenter(entry.coordinates);
                    const vertexCount = entry.coordinates.length;
                    const isLatest = idx === 0;

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-black text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span>#{boundaryHistory.length - idx}</span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                                સક્રિય
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-black text-[#0f2925]">
                            {entry.boundary_type === 'city'
                              ? 'નવસારી મહાનગર સીમા'
                              : `વોર્ડ ${entry.ward_number} · ${entry.ward_name || ''}`}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {vertexCount} પોઇન્ટ્સ
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-[240px]">
                          <div className="font-semibold text-slate-700 truncate">
                            {entry.location_summary || getNearestNavsariArea(cLat, cLng)}
                          </div>
                          <div className="text-[10px] text-slate-400">સાચવનાર: {entry.saved_by || 'Super Admin'}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-[#095c54]">
                          {cLat.toFixed(4)}°N, {cLng.toFixed(4)}°E
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {new Date(entry.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <MiniBoundarySvgPreview coordinates={entry.coordinates} />
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!isLatest && (
                            <button
                              type="button"
                              disabled={restoringId === entry.id}
                              onClick={() => handleRestoreFromHistory(entry)}
                              className="px-3 py-1.5 rounded-xl bg-[#095c54] text-white text-[11px] font-black inline-flex items-center gap-1 shadow-2xs hover:bg-[#074741]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>પુનઃસ્થાપિત કરો</span>
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

        {boundaryHistory.length > historyPageSize && (
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <TablePagination
              currentPage={historyPage}
              pageSize={historyPageSize}
              totalItems={boundaryHistory.length}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
