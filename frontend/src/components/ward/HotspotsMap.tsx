import React, { useState, useEffect } from 'react';
import {
  MapPin,
  RefreshCw,
  Flame,
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../services/api.js';
import { WardHotspot } from '../../types/index.js';
import { Language, translations } from '../../i18n/translations.js';
import { ComplaintDetailsModal } from './ComplaintDetailsModal.js';

interface HotspotsMapProps {
  ward?: number;
  lang?: Language;
}

// Controller component to animate map view when a hotspot is selected
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 1 });
  }, [center, map]);
  return null;
}

// Custom Leaflet DivIcon for pins based on frequency level
const createHotspotIcon = (frequency: string, isSelected: boolean) => {
  const color = frequency === 'high' ? '#ef4444' : frequency === 'medium' ? '#f59e0b' : '#10b981';
  const scale = isSelected ? 'scale(1.2)' : 'scale(1)';
  const zIndex = isSelected ? 1000 : 100;

  return L.divIcon({
    className: 'custom-hotspot-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) ${scale};
        border: 2.5px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
        z-index: ${zIndex};
      ">
        <div style="
          width: 9px;
          height: 9px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
};

export const HotspotsMap: React.FC<HotspotsMapProps> = ({ ward = 3, lang = 'en' }) => {
  const [hotspots, setHotspots] = useState<WardHotspot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHotspot, setSelectedHotspot] = useState<WardHotspot | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  const t = translations[lang];

  // Default coordinate center based on officer's ward
  const defaultWardCoords: [number, number] = ward === 8 ? [20.9410, 72.9350] : [20.9470, 72.9280];

  const fetchHotspots = async () => {
    setLoading(true);
    try {
      const res = await api.getWardHotspots({
        category: categoryFilter,
        frequency: frequencyFilter,
        ward: ward
      });

      // Filter strictly by the officer's ward
      const wardOnlyHotspots = (res.data || []).filter(
        (h: WardHotspot) =>
          !h.ward_number ||
          h.ward_number === ward ||
          ((h as any).ward_name && (h as any).ward_name.includes(String(ward)))
      );

      setHotspots(wardOnlyHotspots);
      if (wardOnlyHotspots.length > 0) {
        if (!selectedHotspot || !wardOnlyHotspots.some((h: WardHotspot) => h.id === selectedHotspot.id)) {
          setSelectedHotspot(wardOnlyHotspots[0]);
        }
      } else {
        setSelectedHotspot(null);
      }
    } catch (err) {
      console.error('Failed to load hotspots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();
  }, [categoryFilter, frequencyFilter, ward]);

  const mapCenter: [number, number] = selectedHotspot
    ? [selectedHotspot.latitude, selectedHotspot.longitude]
    : defaultWardCoords;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-600 shrink-0" />
            <span>{t.hotspots_title}</span>
          </h2>
        </div>

        <button
          onClick={fetchHotspots}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold"
          title="Refresh hotspots"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          <span className="sm:hidden">{t.action_refresh}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 text-xs w-full sm:w-auto">
          <div className="min-w-0 sm:min-w-[150px]">
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t.hotspots_category}</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="all">{t.hotspots_all_cats}</option>
              <option value="Dustbin">Overflowing Dustbin</option>
              <option value="Dumping">Open Garbage Dumping</option>
              <option value="Drainage">Drainage Blockage</option>
              <option value="Littering">Roadside Littering</option>
            </select>
          </div>

          <div className="min-w-0 sm:min-w-[150px]">
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t.hotspots_frequency}</span>
            <select
              value={frequencyFilter}
              onChange={e => setFrequencyFilter(e.target.value)}
              className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="all">{t.hotspots_all_freq}</option>
              <option value="high">{t.hotspots_high_freq}</option>
              <option value="medium">{t.hotspots_med_freq}</option>
              <option value="low">{t.hotspots_low_freq}</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 overflow-x-auto">
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>High (5+)</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Medium (2-4)</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Emerging (1)</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Hotspot Intelligence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Real Leaflet Map View (2 Cols on lg) */}
        <div className="lg:col-span-2 rounded-3xl border border-[#e2e8f0] overflow-hidden bg-white shadow-xs relative flex flex-col h-[360px] sm:h-[480px]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold p-4">
              <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mb-2" />
              <span>{t.loading}</span>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={15}
              scrollWheelZoom={false}
              className="h-full w-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {selectedHotspot && (
                <MapRecenter center={[selectedHotspot.latitude, selectedHotspot.longitude]} />
              )}

              {/* Render Every Hotspot in Officer's Ward with Permanent Location Name Tooltip */}
              {hotspots.map(hs => {
                const isSelected = selectedHotspot?.id === hs.id;
                const circleColor = hs.frequency_level === 'high' ? '#ef4444' : hs.frequency_level === 'medium' ? '#f59e0b' : '#10b981';

                return (
                  <React.Fragment key={hs.id}>
                    <Marker
                      position={[hs.latitude, hs.longitude]}
                      icon={createHotspotIcon(hs.frequency_level, isSelected)}
                      eventHandlers={{
                        click: () => setSelectedHotspot(hs)
                      }}
                    >
                      {/* Permanent Location Name Tooltip on Every Pin! */}
                      <Tooltip
                        permanent
                        direction="top"
                        offset={[0, -28]}
                        className="hotspot-permanent-tooltip"
                      >
                        <div className="font-black text-[11px] text-slate-900 bg-white/95 px-2.5 py-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hs.frequency_level === 'high'
                                ? 'bg-red-500 animate-pulse'
                                : hs.frequency_level === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>{hs.title || hs.locality || `Ward ${ward}`}</span>
                        </div>
                      </Tooltip>

                      <Popup>
                        <div className="p-1 space-y-1">
                          <p className="font-extrabold text-xs text-[#095c54]">{hs.title}</p>
                          <p className="text-[11px] text-slate-600">{hs.address}</p>
                          <p className="text-[10px] font-bold text-orange-700">
                            {hs.total_complaints} incidents · {hs.active_complaints} active
                          </p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Geofence area cluster indicator */}
                    <Circle
                      center={[hs.latitude, hs.longitude]}
                      radius={120}
                      pathOptions={{
                        color: circleColor,
                        fillColor: circleColor,
                        fillOpacity: isSelected ? 0.25 : 0.1,
                        weight: isSelected ? 2.5 : 1
                      }}
                    />
                  </React.Fragment>
                );
              })}
            </MapContainer>
          )}

          {/* Map Overlay Badge */}
          {selectedHotspot && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-[#0f2925] shadow-md flex items-center gap-2 max-w-[85%] z-10">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="truncate">
                {selectedHotspot.locality || selectedHotspot.title || `Ward ${ward}`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#095c54] text-white ml-1">
                Ward {ward}
              </span>
            </div>
          )}

          {/* Quick Hotspot selector pills */}
          {hotspots.length > 0 && (
            <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-xs p-2 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-2 overflow-x-auto scrollbar-none z-10">
              {hotspots.map(hs => (
                <button
                  key={hs.id}
                  onClick={() => setSelectedHotspot(hs)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                    selectedHotspot?.id === hs.id
                      ? 'bg-[#095c54] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hs.frequency_level === 'high'
                        ? 'bg-red-500'
                        : hs.frequency_level === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="truncate max-w-[140px] sm:max-w-none">{hs.title}</span>
                  <span className="opacity-80 font-mono">({hs.total_complaints})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Hotspot Intelligence Dossier (1 Col) */}
        {selectedHotspot ? (
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    {selectedHotspot.hotspot_code}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#0f2925] mt-1 truncate">{selectedHotspot.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedHotspot.address}</span>
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                    selectedHotspot.frequency_level === 'high'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : selectedHotspot.frequency_level === 'medium'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {selectedHotspot.frequency_level}
                </span>
              </div>

              {/* Cluster Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">{t.hotspots_total_incidents}</span>
                  <span className="text-base font-black text-[#0f2925]">{selectedHotspot.total_complaints}</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-2xl bg-red-50 border border-red-200">
                  <span className="text-[10px] font-bold text-red-800 block uppercase">{t.hotspots_active_now}</span>
                  <span className="text-base font-black text-red-900">{selectedHotspot.active_complaints}</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">{t.hotspots_resolved}</span>
                  <span className="text-base font-black text-emerald-900">{selectedHotspot.resolved_complaints}</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-800 block uppercase">{t.hotspots_reopen_count}</span>
                  <span className="text-base font-black text-purple-900">{selectedHotspot.reopened_count}</span>
                </div>
              </div>

              {/* AI Trend & Pattern Summary */}
              {selectedHotspot.ai_summary && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                  <p className="text-[11px] font-extrabold text-[#095c54] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.hotspots_ai_pattern}</span>
                  </p>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {selectedHotspot.ai_summary}
                  </p>
                </div>
              )}

              {/* Linked Complaints Drilldown */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {t.hotspots_linked_complaints} ({selectedHotspot.linked_complaint_ids?.length || 0})
                </p>
                {selectedHotspot.linked_complaint_ids && selectedHotspot.linked_complaint_ids.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedHotspot.linked_complaint_ids.map(cId => (
                      <button
                        key={cId}
                        onClick={() => setSelectedComplaintId(cId)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-800 flex items-center justify-between transition text-left"
                      >
                        <span className="font-mono text-[#095c54] truncate">ID: {cId}</span>
                        <span className="text-[11px] text-[#095c54] font-extrabold flex items-center gap-1 shrink-0 ml-2">
                          <span>{t.hotspots_inspect_dossier}</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No open complaints currently tied to this location.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] flex flex-col items-center justify-center text-slate-400">
            <Info className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs font-bold">Select a hotspot on the map to inspect details.</p>
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {selectedComplaintId && (
        <ComplaintDetailsModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onComplaintUpdated={fetchHotspots}
        />
      )}
    </div>
  );
};
