import React, { useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap
} from 'react-leaflet';
import {
  MapPin,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
  CheckCircle2
} from 'lucide-react';
import { ChronicHotspotSuggestion } from '../../types/index.js';
import { getCategoryColor, CATEGORY_COLOR_MAP } from './categoryColors.js';

interface ChronicHotspotsMapViewProps {
  wardNumber: number;
  hotspots: ChronicHotspotSuggestion[];
  onCreateCommunityProblem: (
    title: string,
    category: string,
    location: string,
    landmark: string,
    diagnosis: string,
    remediation: string,
    lat: number,
    lng: number
  ) => void;
  actionLoadingId?: string;
}

// Controller component to smoothly pan/zoom to selected hotspot
function MapController({ selectedSpot }: { selectedSpot: ChronicHotspotSuggestion | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (selectedSpot && Number.isFinite(selectedSpot.latitude) && Number.isFinite(selectedSpot.longitude)) {
      map.flyTo([selectedSpot.latitude, selectedSpot.longitude], 16, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedSpot, map]);
  return null;
}

export const ChronicHotspotsMapView: React.FC<ChronicHotspotsMapViewProps> = ({
  wardNumber,
  hotspots,
  onCreateCommunityProblem,
  actionLoadingId
}) => {
  const [selectedSpot, setSelectedSpot] = useState<ChronicHotspotSuggestion | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardExpansion = (id: string) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Center coordinate calculation
  const mapCenter = useMemo<[number, number]>(() => {
    if (hotspots.length > 0 && hotspots[0].latitude && hotspots[0].longitude) {
      return [hotspots[0].latitude, hotspots[0].longitude];
    }
    // Default Navsari coordinates with ward offset
    return [20.9250 + wardNumber * 0.002, 72.9220 + wardNumber * 0.002];
  }, [hotspots, wardNumber]);

  // Filtered hotspots by category if selected
  const filteredHotspots = useMemo(() => {
    if (selectedCategoryFilter === 'all') return hotspots;
    return hotspots.filter(h => h.primary_category.toLowerCase() === selectedCategoryFilter.toLowerCase());
  }, [hotspots, selectedCategoryFilter]);

  // Unique categories in dataset with counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of hotspots) {
      const cat = h.primary_category || 'Civic Sanitation';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [hotspots]);

  return (
    <div className="space-y-4">
      {/* 1. Category Filter & Map Legend Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Chronic Hotspots Geospatial Distribution</span>
              <span className="text-xs text-slate-400 font-normal">
                ({filteredHotspots.length} recurring spots in Ward {wardNumber})
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Hover on circles to view category details, incident counts & reopen rate. Different circle colors indicate distinct complaint types.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold">Total Reopened:</span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-black">
              {hotspots.reduce((sum, h) => sum + h.reopen_count, 0)} reopens
            </span>
          </div>
        </div>

        {/* Dynamic Category Color Badges Filter */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Categories ({hotspots.length})</span>
          </button>

          {Object.entries(categoryCounts).map(([cat, count]) => {
            const colorCfg = getCategoryColor(cat);
            const isSelected = selectedCategoryFilter.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  isSelected
                    ? `${colorCfg.bg} text-white shadow-xs border-transparent`
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colorCfg.hex }}
                />
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Leaflet Map Container */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden relative">
        <div className="h-[420px] w-full z-0">
          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController selectedSpot={selectedSpot} />

            {filteredHotspots.map(spot => {
              const colorCfg = getCategoryColor(spot.primary_category);
              const radius = Math.max(14, Math.min(28, 12 + spot.incident_count * 2.5));
              const isSelected = selectedSpot?.id === spot.id;

              return (
                <CircleMarker
                  key={spot.id}
                  center={[spot.latitude, spot.longitude]}
                  radius={radius}
                  pathOptions={{
                    color: isSelected ? '#000000' : colorCfg.hex,
                    fillColor: colorCfg.hex,
                    fillOpacity: isSelected ? 0.9 : 0.65,
                    weight: isSelected ? 4 : 2.5
                  }}
                  eventHandlers={{
                    click: () => setSelectedSpot(spot)
                  }}
                >
                  {/* Tooltip shown on HOVER */}
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.98}>
                    <div className="p-1.5 text-xs font-sans min-w-[210px] space-y-1">
                      <div className="font-black text-slate-900 text-sm leading-snug">
                        {spot.location_name}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: colorCfg.hex }}
                        />
                        <span className="text-slate-800">{spot.primary_category}</span>
                      </div>
                      <div className="text-slate-600 font-medium">
                        {spot.incident_count} Recurring Reports · {spot.reopen_count} Reopened
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                        <span className="font-black text-rose-600">
                          Reopen Rate: {spot.reopen_rate_pct}%
                        </span>
                        <span className="text-slate-400 font-bold uppercase text-[9px]">
                          {spot.severity}
                        </span>
                      </div>
                    </div>
                  </Tooltip>

                  {/* Popup shown on CLICK */}
                  <Popup>
                    <div className="p-2 space-y-2 text-xs font-sans min-w-[240px]">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <span className="font-black text-slate-900 text-sm">{spot.location_name}</span>
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-black text-white"
                          style={{ backgroundColor: colorCfg.hex }}
                        >
                          {spot.primary_category}
                        </span>
                      </div>
                      <div className="text-slate-600 text-xs leading-relaxed">
                        <strong className="text-slate-800 block mb-0.5">Root Cause:</strong>
                        {spot.ai_root_cause_diagnosis}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Repeats ~{spot.avg_days_between_recurrence} days
                        </span>
                        <button
                          onClick={() => onCreateCommunityProblem(
                            `Chronic Cleanliness Solution: ${spot.location_name}`,
                            spot.primary_category,
                            spot.location_name,
                            spot.landmark,
                            `[AI Chronic Hotspot Warning - ${spot.reopen_rate_pct}% Reopen Rate] ${spot.ai_root_cause_diagnosis}`,
                            spot.ai_permanent_remediation.join(' '),
                            spot.latitude,
                            spot.longitude
                          )}
                          className="px-2.5 py-1.5 rounded-lg bg-[#095c54] text-white font-bold text-xs hover:bg-[#074741] transition"
                        >
                          Create Problem
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Floating Map Legend Overlay */}
        <div className="p-3 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black text-slate-700">Category Circle Legend:</span>
            {Object.values(CATEGORY_COLOR_MAP).map(item => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.hex }} />
                <span className="text-slate-600 text-[11px] font-medium">{item.name}</span>
              </div>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Radius ∝ Incident Frequency
          </span>
        </div>
      </div>

      {/* 3. Hotspot Cards Grid (with Map Highlight Sync) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Detailed Hotspot Remediation Cards ({filteredHotspots.length})
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            Click "Highlight on Map" to navigate map directly to the recurring cluster
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredHotspots.map(spot => {
            const isExpanded = !!expandedCardIds[spot.id];
            const isSelected = selectedSpot?.id === spot.id;
            const colorCfg = getCategoryColor(spot.primary_category);

            return (
              <div
                key={spot.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 space-y-3.5 flex flex-col justify-between transition shadow-2xs ${
                  isSelected ? 'border-[#095c54] ring-2 ring-[#095c54]/20 shadow-md' : 'border-[#e2e8f0] hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-black border border-slate-200">
                          Ward {spot.ward_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${colorCfg.badgeBg}`}
                        >
                          {spot.primary_category}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#0f2925] tracking-tight leading-snug">
                        {spot.location_name}
                      </h3>
                    </div>

                    <button
                      onClick={() => setSelectedSpot(spot)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'bg-[#095c54] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Fly to marker on map"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Highlighted' : 'Highlight on Map'}</span>
                    </button>
                  </div>

                  {/* Landmark & Coordinates */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">{spot.landmark}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 text-[11px]">Repeats ~{spot.avg_days_between_recurrence} days</span>
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
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Reopen Rate</span>
                      <span className="font-extrabold text-rose-700">{spot.reopen_rate_pct}%</span>
                    </div>
                  </div>

                  {/* Progressive Disclosure Toggle */}
                  <button
                    onClick={() => toggleCardExpansion(spot.id)}
                    className="w-full flex items-center justify-between py-1 px-1 text-xs font-bold text-[#095c54] hover:text-[#074741] transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      {isExpanded ? 'Hide Diagnosis & Fixes' : 'View Root-Cause Diagnosis & Permanent Fixes'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Expanded Diagnosis */}
                  {isExpanded && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 animate-fadeIn">
                      <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 font-medium leading-relaxed">
                        <strong className="font-black text-rose-900 block mb-1">Why It Recurrs (Diagnosis):</strong>
                        {spot.ai_root_cause_diagnosis}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Permanent Remediation Steps:</span>
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
                    onClick={() => onCreateCommunityProblem(
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
    </div>
  );
};
