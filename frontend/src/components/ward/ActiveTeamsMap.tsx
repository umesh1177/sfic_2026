import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

interface ActiveTeamsMapProps {
  teams: any[];
  highlightedTeamId: string | null;
  highlightedCoords: [number, number] | null;
}

const activeSquadIcon = L.divIcon({
  className: 'custom-squad-marker',
  html: `<div style="background-color: #059669; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45); border: 2.5px solid #ffffff; cursor: pointer;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

const depotIcon = L.divIcon({
  className: 'custom-depot-marker',
  html: `<div style="background-color: #0284c7; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45); border: 2.5px solid #ffffff; cursor: pointer;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const MapController: React.FC<{ targetCoords: [number, number] | null }> = ({ targetCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords[0] && targetCoords[1]) {
      map.flyTo(targetCoords, 15, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
};

export const ActiveTeamsMap: React.FC<ActiveTeamsMapProps> = ({
  teams,
  highlightedTeamId,
  highlightedCoords
}) => {
  const defaultCenter: [number, number] = [20.9390, 72.9280];
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  useEffect(() => {
    if (highlightedTeamId && markerRefs.current[highlightedTeamId]) {
      markerRefs.current[highlightedTeamId]?.openPopup();
    }
  }, [highlightedTeamId, highlightedCoords]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#095c54]" />
          <h3 className="text-sm font-extrabold text-[#0f2925]">
            Active Teams Geolocation Map
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
          Live Field Sites
        </span>
      </div>

      {/* Map View */}
      <div className="relative h-[340px] w-full z-0">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController targetCoords={highlightedCoords} />

          {teams.map(team => {
            const loc = team.current_location || {};
            const lat = Number(loc.latitude) || 20.9312;
            const lng = Number(loc.longitude) || 72.9284;
            const isActive = team.is_active || team.status === 'active';

            return (
              <Marker
                key={team.id}
                position={[lat, lng]}
                icon={isActive ? activeSquadIcon : depotIcon}
                ref={el => {
                  markerRefs.current[team.id] = el;
                }}
              >
                <Popup className="custom-popup" minWidth={240}>
                  <div className="p-1 space-y-1.5 text-xs text-[#0f2925]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'
                      }`}>
                        {isActive ? 'ACTIVE SQUAD SITE' : 'DEPOT STANDBY'}
                      </span>
                    </div>
                    <div className="font-extrabold text-sm text-[#0f2925]">
                      {team.team_name}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Leader:</strong> {team.temporary_leader_name || team.leader_name || 'Designated Leader'}
                    </div>
                    {team.assigned_work && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <div className="font-bold text-[#095c54]">Task:</div>
                        <div className="line-clamp-2">{team.assigned_work.title}</div>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-medium">
                      {loc.address || loc.name}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] font-bold">
                      <span className="text-slate-500">Attendance:</span>
                      <span className="text-emerald-700">
                        {team.attendance?.percentage || 100}%
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Footer Legend */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Active Squad Site
          </span>
          <span className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
            Depot Standby
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Click marker for details
        </span>
      </div>
    </div>
  );
};
