import React, { useState, useEffect, useMemo } from 'react';
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
  Maximize2
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api.js';
import { Language } from '../../i18n/translations.js';

// Default Navsari outer boundary coordinates [lng, lat]
const DEFAULT_NAVSARI_BOUNDARY: [number, number][] = [
  [72.8750, 20.8850],
  [72.9650, 20.8850],
  [72.9650, 20.9750],
  [72.8750, 20.9750],
  [72.8750, 20.8850]
];

// Custom vertex pin icon for drawing
const vertexIcon = new L.DivIcon({
  className: 'custom-vertex-pin',
  html: `<div style="background-color: #095c54; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const activeVertexIcon = new L.DivIcon({
  className: 'custom-active-vertex-pin',
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: pointer;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({
  isDrawing,
  onAddPoint
}: {
  isDrawing: boolean;
  onAddPoint: (point: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        // [lng, lat] format
        onAddPoint([e.latlng.lng, e.latlng.lat]);
      }
    }
  });
  return null;
}

interface BoundaryManagementProps {
  lang: Language;
  initialWardNumber?: number;
}

export const BoundaryManagement: React.FC<BoundaryManagementProps> = ({
  lang,
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

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);

  // Map center: Navsari center default [20.9325, 72.9280]
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.9325, 72.9280]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  const fetchBoundaryData = async () => {
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
        // fallback approximation
        setCityBoundary([
          [72.8750, 20.8850],
          [72.9650, 20.8850],
          [72.9650, 20.9750],
          [72.8750, 20.9750],
          [72.8750, 20.8850]
        ]);
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
  };

  useEffect(() => {
    fetchBoundaryData();
  }, []);

  useEffect(() => {
    if (initialWardNumber) {
      setMode('ward');
      setSelectedWardNumber(initialWardNumber);
    }
  }, [initialWardNumber]);

  // Selected ward
  const currentWard = useMemo(() => {
    return wards.find(w => w.ward_number === selectedWardNumber) || wards[0];
  }, [wards, selectedWardNumber]);

  // Center map when ward changes
  useEffect(() => {
    if (mode === 'ward' && currentWard?.boundary_coordinates?.length > 0) {
      const coords = currentWard.boundary_coordinates;
      const avgLng = coords.reduce((acc: number, c: number[]) => acc + c[0], 0) / coords.length;
      const avgLat = coords.reduce((acc: number, c: number[]) => acc + c[1], 0) / coords.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(15);
      if (!isDrawing) {
        setDrawnPoints(currentWard.boundary_coordinates);
      }
    } else if (mode === 'city') {
      setMapCenter([20.9325, 72.9280]);
      setMapZoom(13);
      if (!isDrawing) {
        setDrawnPoints(cityBoundary);
      }
    }
  }, [mode, currentWard, cityBoundary, isDrawing]);

  // Add click point
  const handleAddPoint = (point: [number, number]) => {
    setDrawnPoints(prev => [...prev, point]);
  };

  // Drag vertex handler
  const handleVertexDrag = (index: number, newLatLng: L.LatLng) => {
    setDrawnPoints(prev => {
      const next = [...prev];
      next[index] = [newLatLng.lng, newLatLng.lat];
      return next;
    });
  };

  const handleStartRedraw = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    setStatusMessage('Drawing Mode Active: Click on the map to add boundary points around the perimeter.');
  };

  const handleEditExistingVertices = () => {
    setIsDrawing(true);
    if (mode === 'city') {
      setDrawnPoints(cityBoundary);
    } else {
      setDrawnPoints(currentWard?.boundary_coordinates || []);
    }
    setStatusMessage('Edit Mode Active: Drag existing vertex markers or click to add new boundary vertices.');
  };

  const handleUndoPoint = () => {
    setDrawnPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDrawnPoints([]);
  };

  const handleResetDefault = () => {
    if (mode === 'city') {
      const defaultBorder: [number, number][] = [
        [72.8750, 20.8850],
        [72.9650, 20.8850],
        [72.9650, 20.9750],
        [72.8750, 20.9750],
        [72.8750, 20.8850]
      ];
      setDrawnPoints(defaultBorder);
    } else if (currentWard) {
      setDrawnPoints(currentWard.boundary_coordinates || []);
    }
    setIsDrawing(false);
    setStatusMessage('Reset to initial default boundary.');
  };

  const handleSaveBoundary = async () => {
    if (drawnPoints.length < 3) {
      setError('A polygon must have at least 3 points to enclose an area.');
      return;
    }

    // Ensure polygon is closed (first and last points match)
    let finalPoints = [...drawnPoints];
    const first = finalPoints[0];
    const last = finalPoints[finalPoints.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      finalPoints.push([first[0], first[1]]);
    }

    setSaving(true);
    setError(null);
    try {
      if (mode === 'city') {
        const res = await api.updateCityBoundary(finalPoints);
        if (res.success) {
          setCityBoundary(finalPoints);
          setIsDrawing(false);
          setStatusMessage('Navsari City Geofence Boundary saved! Complaints outside this boundary will now be rejected.');
          setTimeout(() => setStatusMessage(null), 5000);
        }
      } else {
        if (!currentWard) return;
        const res = await api.updateWardBoundary(currentWard.id, finalPoints);
        if (res.success) {
          setIsDrawing(false);
          setStatusMessage(`Ward ${currentWard.ward_number} (${currentWard.ward_name}) boundary updated successfully.`);
          setTimeout(() => setStatusMessage(null), 5000);
          fetchBoundaryData();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save boundary coordinates');
    } finally {
      setSaving(false);
    }
  };

  // Convert points for Leaflet Polygon: [lat, lng]
  const currentPolygonLatLngs = useMemo(() => {
    const pts = isDrawing ? drawnPoints : (mode === 'city' ? cityBoundary : (currentWard?.boundary_coordinates || []));
    return pts.map((p: number[] | [number, number]) => [p[1], p[0]] as [number, number]);
  }, [isDrawing, drawnPoints, mode, cityBoundary, currentWard]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Mode Switcher */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-xs font-black border border-teal-200">
              GEOFENCING & SPATIAL BORDER ENGINE
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
            City & Ward Boundary Geofencing
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Draw and adjust outer Navsari city limits or expand ward zones. Out-of-bounds complaints are strictly rejected.
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 shrink-0">
          <button
            onClick={() => {
              setMode('city');
              setIsDrawing(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              mode === 'city'
                ? 'bg-[#095c54] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Navsari City Boundary</span>
          </button>

          <button
            onClick={() => {
              setMode('ward');
              setIsDrawing(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              mode === 'ward'
                ? 'bg-[#095c54] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Ward Area Boundaries</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Ward (1 to 13)</label>
                <select
                  value={selectedWardNumber}
                  onChange={e => {
                    setSelectedWardNumber(Number(e.target.value));
                    setIsDrawing(false);
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
                  ? 'Citizens submitting complaints outside this outer boundary receive an automatic rejection (HTTP 422).'
                  : 'Adjusting this boundary ensures that any complaint lodged in newly added areas maps automatically to this ward.'}
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
                    Active: Click on map to add points ({drawnPoints.length} points placed).
                  </div>

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

        {/* Right Map Canvas */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden h-[600px] relative">
            {/* Map Canvas */}
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              className="h-full w-full z-0"
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapClickHandler isDrawing={isDrawing} onAddPoint={handleAddPoint} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* All Wards (shown in faint outline when viewing city or other wards) */}
              {wards.map(ward => {
                const isSelected = mode === 'ward' && ward.ward_number === selectedWardNumber;
                if (!ward.boundary_coordinates || ward.boundary_coordinates.length < 3) return null;
                const latLngs = ward.boundary_coordinates.map((p: number[]) => [p[1], p[0]] as [number, number]);

                return (
                  <Polygon
                    key={ward.id}
                    positions={latLngs}
                    pathOptions={{
                      color: isSelected ? '#095c54' : '#14b8a6',
                      fillColor: isSelected ? '#095c54' : '#2dd4bf',
                      fillOpacity: isSelected ? 0.35 : 0.08,
                      weight: isSelected ? 3 : 1,
                      dashArray: isSelected ? undefined : '4, 4'
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-bold text-[#0f2925]">
                        <div className="font-black text-sm">Ward {ward.ward_number}: {ward.ward_name}</div>
                        <div className="text-slate-500 font-medium">{ward.office_address}</div>
                        <div className="text-[#095c54] mt-1 font-bold">Officer: {ward.ward_officer_name}</div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Navsari City Outer Boundary Polygon */}
              {cityBoundary.length > 2 && (
                <Polygon
                  positions={cityBoundary.map(p => [p[1], p[0]] as [number, number])}
                  pathOptions={{
                    color: '#043e39',
                    fillColor: '#095c54',
                    fillOpacity: mode === 'city' ? 0.15 : 0.02,
                    weight: mode === 'city' ? 3 : 1.5,
                    dashArray: mode === 'city' ? undefined : '6, 6'
                  }}
                >
                  <Popup>
                    <div className="text-xs font-bold text-[#0f2925]">
                      <div className="font-black text-sm">Navsari Municipal Corporation (NMC)</div>
                      <div className="text-slate-500">Official Municipal Jurisdiction Limits</div>
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* Active Drawn / Edited Polygon */}
              {isDrawing && currentPolygonLatLngs.length > 2 && (
                <Polygon
                  positions={currentPolygonLatLngs}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.25,
                    weight: 2
                  }}
                />
              )}

              {/* Vertex Markers for interactive dragging */}
              {isDrawing &&
                drawnPoints.map((pt, idx) => (
                  <Marker
                    key={idx}
                    position={[pt[1], pt[0]]}
                    draggable={true}
                    icon={idx === 0 ? activeVertexIcon : vertexIcon}
                    eventHandlers={{
                      dragend: e => {
                        handleVertexDrag(idx, e.target.getLatLng());
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-bold">
                        Vertex #{idx + 1}
                        <br />
                        <span className="text-slate-500">Drag to adjust boundary position</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>

            {/* Floating Status Pill over Map */}
            <div className="absolute top-4 left-4 z-1000 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 shadow-md flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDrawing ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>
                {isDrawing
                  ? `Drawing Active (${drawnPoints.length} vertices) · Click map to add`
                  : mode === 'city'
                  ? 'Navsari City Geofence Active (Outside complaints blocked)'
                  : `Ward ${selectedWardNumber} Boundary Visible`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
