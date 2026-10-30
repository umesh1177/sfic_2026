import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Filter,
  Flame,
  Info,
  CheckCircle2,
  List,
  Map as MapIcon,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { api } from '../services/api.js';
import { ComplaintCategory } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface NavsariMapProps {
  categories: ComplaintCategory[];
  lang: Language;
}

export const NavsariMap: React.FC<NavsariMapProps> = ({ categories, lang }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [wardsData, setWardsData] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Filters
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [activeWardInfo, setActiveWardInfo] = useState<any>(null);

  const t = translations[lang];

  // Initialize Leaflet Map restricted to Navsari
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Navsari bounding box bounds: [South-West, North-East]
    const southWest = L.latLng(20.8700, 72.8600);
    const northEast = L.latLng(20.9900, 72.9900);
    const navsariBounds = L.latLngBounds(southWest, northEast);

    const map = L.map(mapContainerRef.current, {
      center: [20.9467, 72.9520], // Navsari City Center
      zoom: 13,
      minZoom: 12,
      maxZoom: 17,
      maxBounds: navsariBounds,
      maxBoundsViscosity: 1.0 // Strictly restrict panning outside Navsari!
    });

    // Clean OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Navsari Municipal Corporation',
      maxZoom: 19
    }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Wards GeoJSON, Complaints, Hotspots
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wardsRes, complaintsRes, hotspotsRes] = await Promise.all([
          api.getWardsGeoJson(),
          api.getPublicComplaints(),
          api.getHotspots()
        ]);

        setWardsData(wardsRes.data);
        setComplaints(complaintsRes.data);
        setHotspots(hotspotsRes.data);
      } catch (err) {
        console.error('Failed to load map data:', err);
      }
    };
    fetchData();
  }, []);

  // Render Ward Polygons and Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current || !wardsData) return;

    const layersGroup = layersGroupRef.current;
    layersGroup.clearLayers();

    // 1. Render Official 13 Ward Boundary Polygons
    const wardGeoJsonLayer = L.geoJSON(wardsData, {
      style: (feature: any) => {
        const score = feature.properties.cleanliness_score || 8.0;
        const color = score >= 9.0 ? '#10b981' : score >= 8.0 ? '#095c54' : '#d97706';
        return {
          color: color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.12,
          dashArray: '4'
        };
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const props = feature.properties;
        layer.on({
          click: () => {
            setActiveWardInfo(props);
          },
          mouseover: (e: any) => {
            e.target.setStyle({ fillOpacity: 0.28, weight: 3 });
          },
          mouseout: (e: any) => {
            wardGeoJsonLayer.resetStyle(e.target);
          }
        });
      }
    });

    layersGroup.addLayer(wardGeoJsonLayer);

    // 2. Render Public Complaint Markers
    const filteredComplaints = complaints.filter(c => {
      if (selectedWard !== 'all' && c.ward_number.toString() !== selectedWard) return false;
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      return true;
    });

    filteredComplaints.forEach(c => {
      const statusColor =
        c.status === 'resolved'
          ? '#10b981'
          : c.status === 'in_progress'
          ? '#0284c7'
          : '#d97706';

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="background-color: ${statusColor}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            •
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      // Sanitized Privacy Protected Marker Popup: NO phone, NO email, NO private officer notes
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px; min-width: 180px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">
            ${c.complaint_number}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #095c54; margin: 2px 0 4px;">
            ${c.category_name}
          </div>
          <div style="font-size: 11px; color: #0f2925; margin-bottom: 6px;">
            📍 Ward ${c.ward_number} · ${c.address}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; text-transform: capitalize;">
              ● ${c.status.replace('_', ' ')}
            </span>
            <span style="font-size: 10px; color: #94a3b8;">
              ${new Date(c.submitted_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      `);

      layersGroup.addLayer(marker);
    });

    // 3. Render Recurring Waste Hotspots
    if (showHotspots) {
      hotspots.forEach(h => {
        const hotspotIcon = L.divIcon({
          className: 'hotspot-icon',
          html: `
            <div style="background-color: #dc2626; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 14px rgba(220,38,38,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
              🔥
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const hotspotMarker = L.marker([h.latitude, h.longitude], { icon: hotspotIcon });
        hotspotMarker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
            <div style="font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase;">
              🚨 Municipal Hotspot
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #0f2925; margin: 2px 0;">
              ${h.title}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              Schedule: ${h.cleanup_schedule}
            </div>
          </div>
        `);
        layersGroup.addLayer(hotspotMarker);
      });
    }
  }, [wardsData, complaints, hotspots, selectedWard, selectedStatus, showHotspots]);

  return (
    <div className="space-y-4">
      {/* Title & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-[#10b981]" />
            {t.map_title}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            {t.map_subtitle} · Restricted to Navsari Municipal Boundary
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-[#f0f6f4] p-1 rounded-xl flex items-center border border-[#e2e8f0]">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-[#095c54] text-white shadow-sm' : 'text-[#64748b]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-[#095c54] text-white shadow-sm' : 'text-[#64748b]'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Directory
            </button>
          </div>
        </div>
      </div>

      {/* Filter Control Pills */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#e2e8f0] flex flex-wrap items-center gap-2.5 text-xs">
        <div className="flex items-center gap-1 font-bold text-[#64748b]">
          <Filter className="w-3.5 h-3.5" /> Filter Wards:
        </div>
        <select
          value={selectedWard}
          onChange={e => setSelectedWard(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
        >
          <option value="all">{t.filter_all_wards}</option>
          {Array.from({ length: 13 }, (_, i) => i + 1).map(w => (
            <option key={w} value={w.toString()}>
              Ward {w}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <button
          onClick={() => setShowHotspots(!showHotspots)}
          className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 ${
            showHotspots
              ? 'border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]'
              : 'border-[#e2e8f0] bg-white text-[#64748b]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Hotspots {showHotspots ? 'ON' : 'OFF'}</span>
        </button>

        <div className="ml-auto text-[11px] font-bold text-[#095c54] flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Citizen Privacy Protected</span>
        </div>
      </div>

      {/* Map or Directory View */}
      {viewMode === 'map' ? (
        <div className="relative rounded-3xl overflow-hidden border border-[#e2e8f0] shadow-sm bg-white">
          <div ref={mapContainerRef} className="w-full h-[520px] z-10" />

          {/* Active Ward Info Overlay Card */}
          {activeWardInfo && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-[#b8e0d7] animate-slideUp">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#095c54] text-white">
                  Ward {activeWardInfo.ward_number}
                </span>
                <button
                  onClick={() => setActiveWardInfo(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <h4 className="font-extrabold text-sm text-[#095c54]">
                {activeWardInfo.ward_name}
              </h4>
              <p className="text-xs text-[#0f2925] mt-1">
                Officer: <strong>{activeWardInfo.ward_officer_name}</strong>
              </p>
              <div className="mt-2 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs">
                <span className="text-[#64748b]">Cleanliness Index:</span>
                <span className="font-black text-[#10b981]">
                  {activeWardInfo.cleanliness_score} / 10
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {complaints.map(c => (
            <div key={c.id} className="p-4 rounded-2xl border border-[#e2e8f0] bg-white shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#095c54]">{c.complaint_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  c.status === 'resolved' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#e6f4f1] text-[#095c54]'
                }`}>
                  {c.status}
                </span>
              </div>
              <div className="font-bold text-sm text-[#0f2925]">{c.category_name}</div>
              <div className="text-xs text-[#64748b]">📍 Ward {c.ward_number} · {c.address}</div>
              <div className="text-[11px] text-[#94a3b8] pt-1 border-t border-[#e2e8f0]">
                Submitted: {new Date(c.submitted_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
