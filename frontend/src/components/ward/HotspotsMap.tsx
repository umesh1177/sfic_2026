import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Filter,
  RefreshCw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Eye,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import { WardHotspot } from '../../types/index.js';
import { ComplaintDetailsModal } from './ComplaintDetailsModal.js';

export const HotspotsMap: React.FC = () => {
  const [hotspots, setHotspots] = useState<WardHotspot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHotspot, setSelectedHotspot] = useState<WardHotspot | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  const fetchHotspots = async () => {
    setLoading(true);
    try {
      const res = await api.getWardHotspots({
        category: categoryFilter,
        frequency: frequencyFilter,
        ward: 3
      });
      setHotspots(res.data || []);
      if (res.data && res.data.length > 0 && !selectedHotspot) {
        setSelectedHotspot(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load hotspots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();
  }, [categoryFilter, frequencyFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-600" />
            <span>Recurring Cleanliness Hotspots Map</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ward 3 & Navsari Municipal Problem Area Tracking · {hotspots.length} Recurring Clusters
          </p>
        </div>

        <button
          onClick={fetchHotspots}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto"
          title="Refresh hotspots"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Category</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-hidden"
            >
              <option value="all">All Categories</option>
              <option value="Dustbin">Overflowing Dustbin</option>
              <option value="Dumping">Open Garbage Dumping</option>
              <option value="Drainage">Drainage Blockage</option>
              <option value="Littering">Roadside Littering</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Repeat Frequency</span>
            <select
              value={frequencyFilter}
              onChange={e => setFrequencyFilter(e.target.value)}
              className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-hidden"
            >
              <option value="all">All Frequencies</option>
              <option value="high">High Frequency (10+ Reports)</option>
              <option value="medium">Medium Frequency (5-9 Reports)</option>
              <option value="low">Low Frequency (2-4 Reports)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>High Frequency</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Medium</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Emerging</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Hotspot Intelligence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View (2 Cols on lg) */}
        <div className="lg:col-span-2 rounded-3xl border border-[#e2e8f0] overflow-hidden bg-white shadow-xs relative flex flex-col h-[480px]">
          {selectedHotspot && (
            <iframe
              title="Hotspot Geographic View"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedHotspot.longitude - 0.006}%2C${
                selectedHotspot.latitude - 0.005
              }%2C${selectedHotspot.longitude + 0.006}%2C${
                selectedHotspot.latitude + 0.005
              }&layer=mapnik&marker=${selectedHotspot.latitude}%2C${selectedHotspot.longitude}`}
            />
          )}

          {/* Map Overlay Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-[#0f2925] shadow-md flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            <span>
              Target Location: <strong>{selectedHotspot?.locality || 'Ward 3'}</strong>
            </span>
          </div>

          {/* Quick Hotspot selector pills */}
          <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-xs p-2 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-2 overflow-x-auto no-scrollbar">
            {hotspots.map(hs => (
              <button
                key={hs.id}
                onClick={() => setSelectedHotspot(hs)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
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
                <span>{hs.title}</span>
                <span className="opacity-80 font-mono">({hs.total_complaints})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Hotspot Intelligence Dossier (1 Col) */}
        {selectedHotspot ? (
          <div className="p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-[10px] font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    {selectedHotspot.hotspot_code}
                  </span>
                  <h3 className="text-base font-extrabold text-[#0f2925] mt-1">{selectedHotspot.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedHotspot.address}</span>
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    selectedHotspot.frequency_level === 'high'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedHotspot.frequency_level}
                </span>
              </div>

              {/* Cluster Metrics */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Incidents</span>
                  <span className="text-base font-black text-[#0f2925]">{selectedHotspot.total_complaints}</span>
                </div>
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                  <span className="text-[10px] font-bold text-red-800 block uppercase">Active Right Now</span>
                  <span className="text-base font-black text-red-900">{selectedHotspot.active_complaints}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">Resolved</span>
                  <span className="text-base font-black text-emerald-900">{selectedHotspot.resolved_complaints}</span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-800 block uppercase">Reopen Count</span>
                  <span className="text-base font-black text-purple-900">{selectedHotspot.reopened_count}</span>
                </div>
              </div>

              {/* AI Trend & Pattern Summary */}
              {selectedHotspot.ai_summary && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                  <p className="text-[11px] font-extrabold text-[#095c54] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Pattern Analysis (SQL & PostGIS Calculated)</span>
                  </p>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {selectedHotspot.ai_summary}
                  </p>
                </div>
              )}

              {/* Linked Complaints Drilldown */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Linked Complaints at this Site ({selectedHotspot.linked_complaint_ids.length})
                </p>
                {selectedHotspot.linked_complaint_ids.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedHotspot.linked_complaint_ids.map(cId => (
                      <button
                        key={cId}
                        onClick={() => setSelectedComplaintId(cId)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-800 flex items-center justify-between transition text-left"
                      >
                        <span className="font-mono text-[#095c54]">Complaint ID: {cId}</span>
                        <span className="text-[11px] text-[#095c54] font-extrabold flex items-center gap-1">
                          <span>Inspect Dossier</span>
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

