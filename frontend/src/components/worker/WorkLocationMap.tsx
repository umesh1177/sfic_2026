import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Clock,
  Truck,
  Compass,
  LocateFixed,
  Layers,
  Info
} from 'lucide-react';
import { WorkAssignment } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

// Fix default Leaflet icon paths
const taskIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const workerLiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { animate: true });
  }, [center, map]);
  return null;
}

interface WorkLocationMapProps {
  assignments: WorkAssignment[];
  initialTaskId?: string;
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const WorkLocationMap: React.FC<WorkLocationMapProps> = ({
  assignments,
  initialTaskId,
  onNavigateTab,
  lang
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTaskId || assignments[0]?.id || ''
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const selectedTask = assignments.find(a => a.id === selectedTaskId) || assignments[0];
  const centerCoord: [number, number] = [
    selectedTask?.latitude || 20.9485,
    selectedTask?.longitude || 72.9260
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => console.warn('Could not acquire live position for map overlay')
      );
    }
  }, []);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centerCoord[0]},${centerCoord[1]}`;

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0f2925] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#095c54]" />
            <span>Work Location & GIS Geofence Navigation</span>
          </h2>
          <p className="text-xs text-[#64748b] mt-1">
            Navsari Municipal Ward 3 GIS Boundaries · PostGIS Radial Boundary
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="text-xs px-3.5 py-2 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl font-bold text-[#0f2925] focus:ring-2 focus:ring-[#095c54] outline-none"
          >
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.task_code} - {a.location_name}
              </option>
            ))}
          </select>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#095c54] hover:bg-[#06423c] text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition shrink-0 shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3 text-white/70" />
          </a>
        </div>
      </div>

      {/* 2. Map & Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map View */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden h-[480px] relative">
          <MapContainer
            center={centerCoord}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter center={centerCoord} />

            {/* Task Site Pin */}
            {selectedTask && (
              <>
                <Marker position={centerCoord} icon={taskIcon}>
                  <Popup>
                    <div className="text-xs space-y-1 p-1">
                      <p className="font-bold text-slate-900">{selectedTask.title}</p>
                      <p className="text-slate-600">{selectedTask.location_name}</p>
                      <p className="text-emerald-700 font-semibold">
                        Geofence Radius: {selectedTask.attendance_radius_meters}m
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Geofence Perimeter Circle */}
                <Circle
                  center={centerCoord}
                  radius={selectedTask.attendance_radius_meters || 100}
                  pathOptions={{
                    color: '#059669',
                    fillColor: '#10b981',
                    fillOpacity: 0.18,
                    weight: 2,
                    dashArray: '4, 4'
                  }}
                />
              </>
            )}

            {/* Worker Live Location Pin */}
            {userLocation && (
              <Marker position={userLocation} icon={workerLiveIcon}>
                <Popup>
                  <div className="text-xs p-1">
                    <p className="font-bold text-blue-700">Your Current Position</p>
                    <p className="text-slate-500">Live Device GPS Sensor</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow text-[11px] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span className="font-semibold text-slate-700">Assigned Worksite (Target)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span className="font-semibold text-slate-700">You (Device Location)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
              <span className="text-slate-500">100m Attendance Perimeter</span>
            </div>
          </div>
        </div>

        {/* Right: Site Details */}
        <div className="lg:col-span-4 space-y-4">
          {selectedTask && (
            <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#64748b] bg-[#f8faf9] border border-[#e2e8f0] px-2.5 py-1 rounded-xl">
                  {selectedTask.task_code}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                  Ward {selectedTask.ward_number} - {selectedTask.ward_name}
                </span>
              </div>

              <div>
                <h3 className="font-black text-[#0f2925] text-base">{selectedTask.title}</h3>
                <p className="text-xs text-[#64748b] mt-1">{selectedTask.description}</p>
              </div>

              <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0] space-y-2 text-xs">
                <div>
                  <span className="text-[#64748b] font-medium block">Exact Landmark / Address:</span>
                  <span className="font-bold text-[#0f2925] block mt-0.5">{selectedTask.address}</span>
                </div>
                <div className="pt-2 border-t border-[#e2e8f0] flex justify-between text-[#64748b]">
                  <span>Coordinates:</span>
                  <span className="font-mono">{selectedTask.latitude.toFixed(5)}, {selectedTask.longitude.toFixed(5)}</span>
                </div>
                <div className="flex justify-between text-[#64748b]">
                  <span>Geofence Radius:</span>
                  <span className="font-bold text-[#047857]">{selectedTask.attendance_radius_meters} meters</span>
                </div>
                <div className="flex justify-between text-[#64748b]">
                  <span>Shift Reporting Time:</span>
                  <span className="font-bold text-[#0f2925]">{selectedTask.scheduled_start_time}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('attendance', selectedTask.id)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Clock className="w-4 h-4" />
                  <span>Check In at this Location</span>
                </button>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Turn-by-Turn GPS Directions</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

