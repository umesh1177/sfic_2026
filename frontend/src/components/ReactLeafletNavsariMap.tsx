import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  Filter,
  Flame,
  Info,
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  List,
  Map as MapIcon,
  ShieldCheck,
  Building,
  User,
  Phone,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api.js';
import { ComplaintCategory } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';
import {
  MAP_CONFIG,
  OFFICIAL_NAVSARI_WARDS_GEOJSON,
  isWithinNavsariBoundary
} from '../config/mapConfig.js';

interface ReactLeafletNavsariMapProps {
  categories: ComplaintCategory[];
  lang: Language;
}

// Controller component inside MapContainer for programmatically updating view
function MapViewUpdater({
  center,
  zoom
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Map event listener for manual location selection
function MapClickHandler({
  enabled,
  onLocationSelect
}: {
  enabled: boolean;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export const ReactLeafletNavsariMap: React.FC<ReactLeafletNavsariMapProps> = ({
  categories,
  lang
}) => {
  const t = translations[lang];

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CONFIG.center);
  const [mapZoom, setMapZoom] = useState<number>(MAP_CONFIG.defaultZoom);
  const [selectedTilePreset, setSelectedTilePreset] = useState<number>(0);

  // Data states
  const [wardsGeoJson, setWardsGeoJson] = useState<any>(OFFICIAL_NAVSARI_WARDS_GEOJSON);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Filters & Toggles
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);

  // User interactive inspection states
  const [activeWardInfo, setActiveWardInfo] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    wardName?: string;
    wardNumber?: number;
  } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [manualPinMode, setManualPinMode] = useState<boolean>(false);
  const [manualPinLocation, setManualPinLocation] = useState<{
    lat: number;
    lng: number;
    wardName?: string;
    wardNumber?: number;
    address?: string;
  } | null>(null);
  const [boundaryAlert, setBoundaryAlert] = useState<string | null>(null);

  // Load backend map data on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMapData = async () => {
      setIsLoading(true);
      try {
        const [wardsRes, complaintsRes, hotspotsRes] = await Promise.all([
          api.getWardsGeoJson().catch(() => ({ data: OFFICIAL_NAVSARI_WARDS_GEOJSON })),
          api.getPublicComplaints().catch(() => ({ data: [] })),
          api.getHotspots().catch(() => ({ data: [] }))
        ]);

        if (isMounted) {
          if (wardsRes?.data?.features?.length > 0) {
            setWardsGeoJson(wardsRes.data);
          }
          setComplaints(complaintsRes?.data || []);
          setHotspots(hotspotsRes?.data || []);
        }
      } catch (err) {
        console.error('Error fetching map data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMapData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter complaints based on user controls
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (selectedWard !== 'all' && c.ward_number.toString() !== selectedWard) return false;
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && c.category_name !== selectedCategory) return false;
      return true;
    });
  }, [complaints, selectedWard, selectedStatus, selectedCategory]);

  // Handle Ward selection zoom & center
  const handleWardFilterChange = (wardNum: string) => {
    setSelectedWard(wardNum);
    if (wardNum === 'all') {
      setMapCenter(MAP_CONFIG.center);
      setMapZoom(13);
      setActiveWardInfo(null);
    } else {
      const wardFeature = wardsGeoJson?.features?.find(
        (f: any) => f.properties.ward_number.toString() === wardNum
      );
      if (wardFeature) {
        setActiveWardInfo(wardFeature.properties);
        const coords = wardFeature.geometry.coordinates[0];
        // Calculate center of polygon
        const lats = coords.map((c: number[]) => c[1]);
        const lngs = coords.map((c: number[]) => c[0]);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        setMapCenter([centerLat, centerLng]);
        setMapZoom(15);
      }
    }
  };

  // GPS Location Detection with PostGIS validation
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setBoundaryAlert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingUser(true);
    setBoundaryAlert(null);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } = position.coords;

        // Center directly on user location
        try {
          const valRes = await api.validateLocation(latitude, longitude);
          setUserLocation({
            lat: latitude,
            lng: longitude,
            accuracy,
            wardName: valRes.data?.ward_name || 'Navsari Municipal Area',
            wardNumber: valRes.data?.ward_number || 1
          });
          setMapCenter([latitude, longitude]);
          setMapZoom(16);
        } catch {
          setUserLocation({
            lat: latitude,
            lng: longitude,
            accuracy,
            wardName: 'Current Location'
          });
          setMapCenter([latitude, longitude]);
          setMapZoom(16);
        } finally {
          setIsLocatingUser(false);
        }
      },
      error => {
        setIsLocatingUser(false);
        setBoundaryAlert(`GPS location error: ${error.message}. Please select your location manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Manual pin placement on map click
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setBoundaryAlert(null);

    if (!isWithinNavsariBoundary(lat, lng)) {
      setBoundaryAlert(
        `Selected coordinates (${lat.toFixed(4)}, ${lng.toFixed(
          4
        )}) are outside the verified Navsari Municipal Corporation limits.`
      );
      return;
    }

    try {
      const valRes = await api.validateLocation(lat, lng);
      if (valRes.data.is_inside_nmc) {
        setManualPinLocation({
          lat,
          lng,
          wardName: valRes.data.ward_name,
          wardNumber: valRes.data.ward_number,
          address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
        });
      } else {
        setBoundaryAlert('Location outside NMC ward polygon.');
      }
    } catch {
      setManualPinLocation({
        lat,
        lng,
        wardName: 'Navsari Municipal Area',
        address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
      });
    }
  };

  // GeoJSON polygon styling by cleanliness score
  const getWardStyle = (feature: any) => {
    const score = feature.properties.cleanliness_score || 8.0;
    const isSelected = selectedWard === feature.properties.ward_number.toString();

    let strokeColor = '#095c54';
    let fillColor = '#095c54';

    if (score >= 9.0) {
      strokeColor = '#10b981';
      fillColor = '#10b981';
    } else if (score < 8.0) {
      strokeColor = '#d97706';
      fillColor = '#d97706';
    }

    return {
      color: isSelected ? '#05443e' : strokeColor,
      weight: isSelected ? 3.5 : 2,
      fillColor,
      fillOpacity: isSelected ? 0.35 : 0.12,
      dashArray: isSelected ? '' : '4, 4'
    };
  };

  // Custom complaint marker icon creation
  const createComplaintIcon = (status: string) => {
    const statusColor =
      status === 'resolved'
        ? '#10b981'
        : status === 'in_progress'
        ? '#0284c7'
        : '#d97706';

    return L.divIcon({
      className: 'custom-complaint-marker',
      html: `
        <div style="
          background-color: ${statusColor};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 11px;
        ">
          ●
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  };

  // Custom user location pin icon
  const userPinIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        background-color: #095c54;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 0 16px rgba(9, 92, 84, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 13px;
      ">
        📍
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });

  // Current active tile provider configuration
  const activeTileConfig = MAP_CONFIG.presets[selectedTilePreset] || MAP_CONFIG.presets[0];

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & INTERACTIVE MAP CONTROLS                 */}
      {/* ======================================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-[#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="pill-badge">
              <span className="badge-dot" />
              NMC Verified Geographic GIS
            </span>
            <span className="text-xs text-[#64748b] font-medium hidden sm:inline">
              PostgreSQL PostGIS ST_Contains Point-in-Polygon Engine
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] mt-1">
            {t.map_title}
          </h2>
          <p className="text-xs text-[#64748b]">
            Official 13 Administrative Wards · Database Coordinates · Privacy-Shielded
          </p>
        </div>

        {/* Action Buttons: GPS, Manual Pin, and View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* GPS Button */}
          <button
            onClick={handleDetectGPS}
            disabled={isLocatingUser}
            className="btn-outline-custom px-3 py-2 text-xs font-bold hover:bg-[#e6f4f1] text-[#095c54] border-[#b8e0d7]"
            title="Detect current GPS location using device geolocation"
          >
            {isLocatingUser ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#095c54]" />
            ) : (
              <Compass className="w-4 h-4 text-[#095c54]" />
            )}
            <span>{isLocatingUser ? 'Detecting GPS...' : 'Locate My Ward'}</span>
          </button>

          {/* Manual Pin Selection Toggle */}
          <button
            onClick={() => {
              setManualPinMode(!manualPinMode);
              if (!manualPinMode) {
                setBoundaryAlert('Tap or click anywhere inside Navsari to drop a pin.');
              } else {
                setBoundaryAlert(null);
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              manualPinMode
                ? 'bg-[#095c54] text-white shadow-md'
                : 'bg-white border border-[#e2e8f0] text-[#0f2925] hover:bg-[#f0f6f4]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{manualPinMode ? 'Pinning Mode Active' : 'Drop Pin Manually'}</span>
          </button>

          {/* Map vs List View Switcher */}
          <div className="bg-[#f0f6f4] p-1 rounded-2xl flex items-center border border-[#e2e8f0]">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'map'
                  ? 'bg-white text-[#095c54] shadow-sm'
                  : 'text-[#64748b] hover:text-[#095c54]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-white text-[#095c54] shadow-sm'
                  : 'text-[#64748b] hover:text-[#095c54]'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Boundary / GPS Notification Alert Banner */}
      {boundaryAlert && (
        <div className="p-3.5 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-xs font-bold text-[#b91c1c] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#dc2626]" />
            <span>{boundaryAlert}</span>
          </div>
          <button
            onClick={() => setBoundaryAlert(null)}
            className="text-[#991b1b] hover:underline text-[11px] font-extrabold ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. FILTER & LAYER CONTROL BAR                            */}
      {/* ======================================================== */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Ward Selector */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="font-extrabold text-[#095c54] flex items-center gap-1 shrink-0">
            <Building className="w-3.5 h-3.5" /> Ward:
          </span>
          <select
            value={selectedWard}
            onChange={e => handleWardFilterChange(e.target.value)}
            className="flex-1 bg-[#f8faf9] border border-[#e2e8f0] rounded-xl px-2.5 py-1.5 font-bold text-[#0f2925] focus:outline-none focus:border-[#095c54]"
          >
            <option value="all">All 13 Navsari Municipal Wards</option>
            {wardsGeoJson?.features?.map((w: any) => (
              <option key={w.properties.id} value={w.properties.ward_number.toString()}>
                Ward {w.properties.ward_number}: {w.properties.ward_name} (
                {w.properties.cleanliness_score}/10)
              </option>
            ))}
          </select>
        </div>

        {/* Complaint Status Filter */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[#64748b]">Status:</span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-[#f8faf9] border border-[#e2e8f0] rounded-xl px-2.5 py-1.5 font-bold text-[#0f2925] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[#64748b]">Category:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#f8faf9] border border-[#e2e8f0] rounded-xl px-2.5 py-1.5 font-bold text-[#0f2925] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.category_name}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>

        {/* Layer Toggles: Hotspots & Boundaries */}
        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 font-bold text-[#dc2626] cursor-pointer">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={e => setShowHotspots(e.target.checked)}
              className="rounded text-[#dc2626] focus:ring-0"
            />
            <Flame className="w-3.5 h-3.5" /> Hotspots ({hotspots.length})
          </label>

          <label className="flex items-center gap-1.5 font-bold text-[#095c54] cursor-pointer">
            <input
              type="checkbox"
              checked={showBoundaries}
              onChange={e => setShowBoundaries(e.target.checked)}
              className="rounded text-[#095c54] focus:ring-0"
            />
            <Layers className="w-3.5 h-3.5" /> Ward Polygons
          </label>

          {/* Configurable Tile Provider Selector */}
          <select
            value={selectedTilePreset}
            onChange={e => setSelectedTilePreset(Number(e.target.value))}
            className="bg-[#f0f6f4] border border-[#b8e0d7] rounded-xl px-2 py-1 font-bold text-[#095c54] text-[11px]"
            title="Switch map tile provider URL"
          >
            {MAP_CONFIG.presets.map((preset, idx) => (
              <option key={idx} value={idx}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. REACT LEAFLET MAP VIEWPORT                            */}
      {/* ======================================================== */}
      {viewMode === 'map' ? (
        <div className="relative rounded-3xl overflow-hidden border border-[#e2e8f0] shadow-xl bg-slate-100 h-[560px] sm:h-[620px]">
          {/* React Leaflet Container */}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            minZoom={3}
            maxZoom={19}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 10 }}
          >
            {/* View controller & Map Click Handlers */}
            <MapViewUpdater center={mapCenter} zoom={mapZoom} />
            <MapClickHandler
              enabled={manualPinMode}
              onLocationSelect={handleMapLocationSelect}
            />

            {/* Configurable Tile Layer */}
            <TileLayer
              url={activeTileConfig.url}
              attribution={activeTileConfig.attribution}
              subdomains={activeTileConfig.subdomains || ['a', 'b', 'c']}
              maxZoom={19}
            />

            {/* 1. Official 13 Ward Boundary GeoJSON Layer */}
            {showBoundaries && wardsGeoJson && (
              <GeoJSON
                key={`geojson-layer-${selectedWard}-${showBoundaries}`}
                data={wardsGeoJson}
                style={getWardStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties;
                  layer.on({
                    click: () => {
                      setActiveWardInfo(props);
                      setSelectedWard(props.ward_number.toString());
                    },
                    mouseover: (e: any) => {
                      const l = e.target;
                      l.setStyle({ fillOpacity: 0.35, weight: 3 });
                    },
                    mouseout: (e: any) => {
                      const l = e.target;
                      l.setStyle(getWardStyle(feature));
                    }
                  });

                  layer.bindTooltip(
                    `<strong>Ward ${props.ward_number}: ${props.ward_name}</strong><br/>Cleanliness Score: ${props.cleanliness_score}/10`,
                    { sticky: true, className: 'leaflet-custom-tooltip' }
                  );
                }}
              />
            )}

            {/* 2. Public Complaint Database Markers */}
            {filteredComplaints.map(c => (
              <Marker
                key={c.id}
                position={[c.latitude, c.longitude]}
                icon={createComplaintIcon(c.status)}
              >
                {/* Privacy-Protected Marker Popup (NO phone, NO email, NO private officer notes) */}
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[200px] text-xs font-sans">
                    <div className="flex items-center justify-between text-[10px] text-[#64748b] font-extrabold uppercase tracking-wider mb-1">
                      <span>{c.complaint_number}</span>
                      <span className="text-[#095c54]">Ward {c.ward_number}</span>
                    </div>
                    <div className="font-extrabold text-[#095c54] text-sm leading-snug">
                      {c.category_name}
                    </div>
                    <p className="text-[#0f2925] text-xs mt-1 mb-2">
                      📍 {c.address}
                    </p>
                    <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                          c.status === 'resolved'
                            ? 'bg-[#ecfdf5] text-[#047857]'
                            : c.status === 'in_progress'
                            ? 'bg-[#f0f9ff] text-[#0284c7]'
                            : 'bg-[#fef3c7] text-[#b45309]'
                        }`}
                      >
                        ● {c.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[#94a3b8]">
                        {new Date(c.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 3. Chronic Recurring Cleanliness Hotspots Layer */}
            {showHotspots &&
              hotspots.map(h => (
                <CircleMarker
                  key={h.id}
                  center={[h.latitude, h.longitude]}
                  radius={12}
                  pathOptions={{
                    color: '#dc2626',
                    fillColor: '#ef4444',
                    fillOpacity: 0.8,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[210px] text-xs font-sans">
                      <div className="flex items-center gap-1.5 text-[#dc2626] font-extrabold text-[11px] mb-1">
                        <Flame className="w-4 h-4 shrink-0" />
                        <span>RECURRING CLEANLINESS HOTSPOT</span>
                      </div>
                      <div className="font-extrabold text-[#0f2925] text-xs mb-1">
                        {h.title}
                      </div>
                      <div className="text-[11px] text-[#64748b] mb-1">
                        <strong>Issue:</strong> {h.frequency}
                      </div>
                      <div className="text-[11px] text-[#095c54] font-semibold">
                        <strong>Cleanup Schedule:</strong> {h.cleanup_schedule}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {/* 4. Detected User GPS Marker */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={userPinIcon}
              >
                <Popup>
                  <div className="p-1 text-xs font-sans">
                    <div className="font-extrabold text-[#095c54] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                      <span>Your Detected GPS Location</span>
                    </div>
                    <div className="text-xs text-[#0f2925] mt-1 font-semibold">
                      {userLocation.wardName ? `Ward: ${userLocation.wardName}` : 'Inside Navsari Municipal Limits'}
                    </div>
                    <div className="text-[10px] text-[#64748b] mt-0.5">
                      Accuracy: ±{Math.round(userLocation.accuracy)}m
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 5. Manually Placed Pin */}
            {manualPinLocation && (
              <Marker
                position={[manualPinLocation.lat, manualPinLocation.lng]}
                icon={userPinIcon}
              >
                <Popup>
                  <div className="p-1 text-xs font-sans">
                    <div className="font-extrabold text-[#095c54] flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-[#095c54]" />
                      <span>Manually Selected Location</span>
                    </div>
                    <div className="text-xs font-bold text-[#05443e] mt-1">
                      {manualPinLocation.wardName || 'Verified Navsari NMC Location'}
                    </div>
                    <div className="text-[11px] text-[#64748b]">
                      {manualPinLocation.address}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Floating Ward Information Card */}
          {activeWardInfo && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-[20] bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-[#b8e0d7] animate-scaleUp">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#e6f4f1] text-[#095c54]">
                    Ward {activeWardInfo.ward_number}
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#095c54] mt-1">
                    {activeWardInfo.ward_name}
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    {activeWardInfo.ward_name_gu}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-[#10b981]">
                    {activeWardInfo.cleanliness_score}/10
                  </div>
                  <div className="text-[10px] text-[#64748b] font-bold">
                    Cleanliness Index
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#e2e8f0] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#94a3b8] font-bold block">
                    Ward Officer
                  </span>
                  <span className="font-extrabold text-[#0f2925]">
                    {activeWardInfo.ward_officer_name || 'NMC Sanitation Officer'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94a3b8] font-bold block">
                    Contact Helpline
                  </span>
                  <span className="font-extrabold text-[#095c54]">
                    {activeWardInfo.contact_phone || '+91 98251 01000'}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-[#64748b] flex items-center justify-between">
                <span>📍 {activeWardInfo.office_address || 'Navsari Municipal Ward Office'}</span>
                <button
                  onClick={() => setActiveWardInfo(null)}
                  className="text-[11px] text-[#095c54] font-extrabold hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Map Legend Overlay */}
          <div className="absolute top-4 right-4 z-[20] bg-white/90 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-[#e2e8f0] text-[11px] space-y-1.5 hidden md:block">
            <span className="font-black text-[#095c54] block mb-1">
              GIS Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              <span>Clean Score ≥ 9.0 (High)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#095c54]"></span>
              <span>Clean Score 8.0 - 8.9 (Good)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
              <span>Clean Score &lt; 8.0 (Attention)</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]"></span>
              <span>Recurring Waste Hotspot</span>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 4. LIST VIEW ALTERNATIVE                                 */
        /* ======================================================== */
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-3xl border border-[#e2e8f0] shadow-sm flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#095c54]">
              Public Complaints Directory ({filteredComplaints.length})
            </h3>
            <span className="text-xs text-[#64748b]">
              Strictly sanitized for citizen privacy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredComplaints.map(c => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm hover:border-[#095c54] transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-extrabold text-[#64748b]">
                      {c.complaint_number}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                        c.status === 'resolved'
                          ? 'bg-[#ecfdf5] text-[#047857]'
                          : c.status === 'in_progress'
                          ? 'bg-[#f0f9ff] text-[#0284c7]'
                          : 'bg-[#fef3c7] text-[#b45309]'
                      }`}
                    >
                      ● {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#095c54]">
                    {c.category_name}
                  </h4>
                  <p className="text-xs text-[#0f2925] mt-1">
                    📍 Ward {c.ward_number}: {c.address}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] text-[#64748b]">
                  <span>Submitted: {new Date(c.submitted_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => {
                      setViewMode('map');
                      setMapCenter([c.latitude, c.longitude]);
                      setMapZoom(16);
                    }}
                    className="font-extrabold text-[#095c54] hover:underline"
                  >
                    View on Map →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security and Privacy Shield Disclaimer */}
      <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0] flex items-center gap-2 text-xs text-[#64748b]">
        <ShieldCheck className="w-4 h-4 text-[#095c54] shrink-0" />
        <span>
          <strong>Citizen Privacy Shield:</strong> Public GIS markers display only complaint categories, municipal wards, and status. Citizen identities, phone numbers, and private internal notes are strictly protected.
        </span>
      </div>
    </div>
  );
};
