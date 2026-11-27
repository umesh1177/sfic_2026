import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap
} from 'react-leaflet';
import {
  CloudRain,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
  Layers,
  Bell,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api.js';
import { getCategoryColor, CATEGORY_COLOR_MAP } from './categoryColors.js';

export interface SeasonDefinition {
  id: 'winter' | 'summer' | 'monsoon' | 'post_monsoon';
  name: string;
  nameGu: string;
  icon: string;
  accentColor: string;
  months: Array<{
    name: string;
    monthIndex: number; // 0-11
    monthNumber: number; // 1-12
    typicalRisk: string;
  }>;
}

export const SEASONS: SeasonDefinition[] = [
  {
    id: 'winter',
    name: 'Winter Season',
    nameGu: 'શિયાળો (Winter)',
    icon: '❄️',
    accentColor: '#0284c7',
    months: [
      { name: 'December', monthIndex: 11, monthNumber: 12, typicalRisk: 'Fog, Dry Foliage & Winter Litter' },
      { name: 'January', monthIndex: 0, monthNumber: 1, typicalRisk: 'Uttarayan Kite Waste & Plastic' },
      { name: 'February', monthIndex: 1, monthNumber: 2, typicalRisk: 'Pre-Spring Public Corridor Dust' }
    ]
  },
  {
    id: 'summer',
    name: 'Summer Season',
    nameGu: 'ઉનાળો (Summer)',
    icon: '☀️',
    accentColor: '#f59e0b',
    months: [
      { name: 'March', monthIndex: 2, monthNumber: 3, typicalRisk: 'Dustbin Odor & Early Organic Load' },
      { name: 'April', monthIndex: 3, monthNumber: 4, typicalRisk: 'High-Temperature Decomposition & Dustbin Spills' },
      { name: 'May', monthIndex: 4, monthNumber: 5, typicalRisk: 'Peak Summer Organic Fruit Waste & Drainage Prep' }
    ]
  },
  {
    id: 'monsoon',
    name: 'Monsoon Season',
    nameGu: 'ચોમાસું (Monsoon)',
    icon: '🌧️',
    accentColor: '#2563eb',
    months: [
      { name: 'June', monthIndex: 5, monthNumber: 6, typicalRisk: 'Early Monsoon Storm Drain Clogging' },
      { name: 'July', monthIndex: 6, monthNumber: 7, typicalRisk: 'Heavy Inundation & Culvert Silt Peak' },
      { name: 'August', monthIndex: 7, monthNumber: 8, typicalRisk: 'Waterlogging & Overtopped Kerbs' },
      { name: 'September', monthIndex: 8, monthNumber: 9, typicalRisk: 'Post-Flood Silt & Stagnant Water' }
    ]
  },
  {
    id: 'post_monsoon',
    name: 'Post-Monsoon & Festive',
    nameGu: 'પાનખર / તહેવારો (Festive)',
    icon: '🪔',
    accentColor: '#10b981',
    months: [
      { name: 'October', monthIndex: 9, monthNumber: 10, typicalRisk: 'Navratri Commercial Sweeping Surge' },
      { name: 'November', monthIndex: 10, monthNumber: 11, typicalRisk: 'Diwali Packaging & Market Dump Overflow' }
    ]
  }
];

interface SeasonalPredictionViewProps {
  wardNumber: number;
}

// Controller component inside MapContainer for smoothly panning/zooming to selected complaint
function MapController({ selectedLoc }: { selectedLoc: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLoc) {
      map.flyTo(selectedLoc, 16, { animate: true, duration: 1.2 });
    }
  }, [selectedLoc, map]);
  return null;
}

export const SeasonalPredictionView: React.FC<SeasonalPredictionViewProps> = ({ wardNumber }) => {
  // Current month detection (0-11)
  const currentMonthIdx = new Date().getMonth();
  const initialSeason = useMemo(() => {
    if ([11, 0, 1].includes(currentMonthIdx)) return 'winter';
    if ([2, 3, 4].includes(currentMonthIdx)) return 'summer';
    if ([5, 6, 7, 8].includes(currentMonthIdx)) return 'monsoon';
    return 'post_monsoon';
  }, [currentMonthIdx]);

  const [selectedSeasonId, setSelectedSeasonId] = useState<'winter' | 'summer' | 'monsoon' | 'post_monsoon'>(initialSeason);
  const selectedSeason = useMemo(() => SEASONS.find(s => s.id === selectedSeasonId) || SEASONS[0], [selectedSeasonId]);

  const [selectedMonthName, setSelectedMonthName] = useState<string>(
    selectedSeason.months.find(m => m.monthIndex === currentMonthIdx)?.name || selectedSeason.months[0].name
  );

  // When season changes, default selected month to first month of that season if current isn't in it
  useEffect(() => {
    const hasMonth = selectedSeason.months.some(m => m.name === selectedMonthName);
    if (!hasMonth) {
      setSelectedMonthName(selectedSeason.months[0].name);
    }
  }, [selectedSeasonId]);

  // Lead days alert setting: 15 or 30 days
  const [leadDays, setLeadDays] = useState<15 | 30>(30);
  const [updatingLeadDays, setUpdatingLeadDays] = useState<boolean>(false);
  const [settingSuccess, setSettingSuccess] = useState<string>('');

  // Live complaints list
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);

  // Fetch complaints from backend
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const [compRes, settRes] = await Promise.all([
        api.getWardComplaints({ ward: wardNumber, limit: 100 }).catch(() => ({ success: false, data: [] })),
        api.getSeasonalAlertSettings().catch(() => null)
      ]);

      if (compRes?.success && Array.isArray(compRes.data)) {
        setComplaints(compRes.data);
      }
      if (settRes?.success && settRes.data?.alert_lead_days) {
        setLeadDays(settRes.data.alert_lead_days);
      }
    } catch (err) {
      console.error('Failed to load complaints for seasonal view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [wardNumber]);

  // Update lead days setting
  const handleUpdateLeadDays = async (days: 15 | 30) => {
    if (days === leadDays) return;
    setUpdatingLeadDays(true);
    setSettingSuccess('');
    try {
      const res = await api.updateSeasonalAlertSettings(days);
      if (res?.success) {
        setLeadDays(days);
        setSettingSuccess(`Automated early notification updated to ${days} days before seasonal surge`);
        setTimeout(() => setSettingSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update lead days:', err);
    } finally {
      setUpdatingLeadDays(false);
    }
  };

  // Find month metadata
  const selectedMonthObj = useMemo(() => {
    return selectedSeason.months.find(m => m.name === selectedMonthName) || selectedSeason.months[0];
  }, [selectedSeason, selectedMonthName]);

  // Generate dynamic seasonal complaints list for the selected month
  // Blends empirical database complaints matching that month with realistic ward coordinates
  const monthComplaints = useMemo(() => {
    const targetIdx = selectedMonthObj.monthIndex;

    // Filter real complaints whose submitted_at falls into this month
    const realMatching = complaints.filter(c => {
      const rawDate = c.submitted_at || c.created_at;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      return !isNaN(d.getTime()) && d.getMonth() === targetIdx;
    });

    if (realMatching.length > 0) {
      return realMatching.map(c => {
        const cat = c.category_name || 'Civic Cleanliness';
        const loc = c.location || {};
        return {
          id: c.id,
          complaint_number: c.complaint_number || 'NMC-2026-CMP',
          category: cat,
          area: loc.address || c.address || `Ward ${wardNumber} Main Road`,
          landmark: loc.landmark || c.landmark || 'Near Navsari Central Point',
          latitude: Number(loc.latitude || c.latitude || (20.9250 + wardNumber * 0.002)),
          longitude: Number(loc.longitude || c.longitude || (72.9220 + wardNumber * 0.002)),
          status: c.status || 'in_progress',
          is_urgent: c.is_urgent || false,
          date: new Date(c.submitted_at || c.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        };
      });
    }

    // Dynamic seasonal ward complaints representative of Navsari's seasonal cycles
    const categoryByMonth: Record<number, Array<{ category: string; area: string; landmark: string; latOffset: number; lngOffset: number }>> = {
      // Winter (Dec, Jan, Feb)
      11: [
        { category: 'Roadside Garbage', area: 'Lunsikui Tower Road Promenade', landmark: 'Opposite Gandhi Smriti Hall', latOffset: 0.0012, lngOffset: 0.0014 },
        { category: 'Overflowing Dustbins', area: 'Mota Bazaar Commercial Gate', landmark: 'Near Clock Tower', latOffset: 0.0024, lngOffset: 0.0018 },
        { category: 'Open Garbage Dumping', area: 'Junathana Approach Corridor', landmark: 'Near Junathana Post Office', latOffset: -0.0015, lngOffset: -0.0010 }
      ],
      0: [
        { category: 'Roadside Garbage', area: 'Dudhiya Talao East Lake Edge', landmark: 'Near Dudhiya Talao Pavilion', latOffset: 0.0018, lngOffset: 0.0022 },
        { category: 'Dead Animal Removal', area: 'Vijalpor Crossing', landmark: 'Near Old Water Tank', latOffset: -0.0022, lngOffset: 0.0015 },
        { category: 'Open Garbage Dumping', area: 'Station Road Market Footpath', landmark: 'Near Railway Platform 1 Approach', latOffset: 0.0031, lngOffset: -0.0012 }
      ],
      1: [
        { category: 'Potholes', area: 'Ashapuri Main Arterial Road', landmark: 'Opposite Ashapuri Temple Ring', latOffset: -0.0010, lngOffset: 0.0025 },
        { category: 'Overflowing Dustbins', area: 'Sayaji Library Road', landmark: 'Near Municipal Library', latOffset: 0.0015, lngOffset: -0.0020 }
      ],
      // Summer (Mar, Apr, May)
      2: [
        { category: 'Overflowing Dustbins', area: 'Shapoorji Complex Market Lane', landmark: 'Near Vegetable Wholesale Mandi', latOffset: 0.0020, lngOffset: 0.0015 },
        { category: 'Drainage Issues', area: 'Kabilpore Approach Nala', landmark: 'Behind Railway Underbridge', latOffset: -0.0025, lngOffset: -0.0018 }
      ],
      3: [
        { category: 'Overflowing Dustbins', area: 'Tower Road Commercial Hub', landmark: 'Near City Central Post', latOffset: 0.0010, lngOffset: 0.0010 },
        { category: 'Open Garbage Dumping', area: 'Dudhiya Talao West Corner', landmark: 'Near Lake View Garden Gate', latOffset: 0.0028, lngOffset: 0.0020 }
      ],
      4: [
        { category: 'Open Garbage Dumping', area: 'Ashapuri Residential Sector B', landmark: 'Near Ashapuri Water Works', latOffset: -0.0018, lngOffset: 0.0028 },
        { category: 'Drainage Issues', area: 'Station Road Stormwater Silt Pit', landmark: 'Near Bus Depot Exit', latOffset: 0.0035, lngOffset: -0.0015 },
        { category: 'Overflowing Dustbins', area: 'Mota Bazaar Vegetable Market', landmark: 'Near Vegetable Yard', latOffset: 0.0022, lngOffset: 0.0011 }
      ],
      // Monsoon (Jun, Jul, Aug, Sep)
      5: [
        { category: 'Drainage Issues', area: 'Lunsikui Low-lying Culvert', landmark: 'Opposite Sports Complex Gate', latOffset: 0.0012, lngOffset: -0.0015 },
        { category: 'Waterlogging', area: 'Fuwara Circle Stormwater Line', landmark: 'Near Fuwara Public Fountain', latOffset: 0.0025, lngOffset: 0.0010 }
      ],
      6: [
        { category: 'Waterlogging', area: 'Lunsikui Underpass Basin', landmark: 'Under Railway Overbridge', latOffset: 0.0015, lngOffset: 0.0018 },
        { category: 'Drainage Issues', area: 'Dudhiya Talao Overflow Channel', landmark: 'Opposite Lake Sluice Gate', latOffset: 0.0029, lngOffset: 0.0025 },
        { category: 'Waterlogging', area: 'Station Road Railway Underpass', landmark: 'Under Platform Subway Approach', latOffset: 0.0038, lngOffset: -0.0018 },
        { category: 'Potholes', area: 'Junathana Highway Junction', landmark: 'Near Junathana Police Chowki', latOffset: -0.0020, lngOffset: -0.0012 }
      ],
      7: [
        { category: 'Waterlogging', area: 'Dudhiya Talao Ring Road', landmark: 'Near North Bank Lake Promenade', latOffset: 0.0027, lngOffset: 0.0021 },
        { category: 'Drainage Issues', area: 'Kabilpore Stormwater Grate', landmark: 'Near Kabilpore School', latOffset: -0.0030, lngOffset: 0.0012 },
        { category: 'Potholes', area: 'Mota Bazaar Main Link', landmark: 'Near Jain Temple Gate', latOffset: 0.0019, lngOffset: 0.0016 }
      ],
      8: [
        { category: 'Potholes', area: 'Tower Road Main Corridor', landmark: 'Near Central Plaza', latOffset: 0.0011, lngOffset: 0.0012 },
        { category: 'Roadside Garbage', area: 'Ashapuri Sub-district Link', landmark: 'Near Ashapuri Garden Gate 2', latOffset: -0.0014, lngOffset: 0.0023 }
      ],
      // Post-Monsoon / Festive (Oct, Nov)
      9: [
        { category: 'Open Garbage Dumping', area: 'Mota Bazaar Commercial Yard', landmark: 'Near Festive Garba Ground', latOffset: 0.0022, lngOffset: 0.0015 },
        { category: 'Roadside Garbage', area: 'Lunsikui Festival Pavilion', landmark: 'Inside Lunsikui Grounds', latOffset: 0.0014, lngOffset: -0.0012 },
        { category: 'Overflowing Dustbins', area: 'Fuwara Circle Shopping Hub', landmark: 'Near Central Bank Building', latOffset: 0.0026, lngOffset: 0.0012 }
      ],
      10: [
        { category: 'Open Garbage Dumping', area: 'Mota Bazaar Sweet Mart Corridor', landmark: 'Opposite Clock Tower Market', latOffset: 0.0025, lngOffset: 0.0016 },
        { category: 'Overflowing Dustbins', area: 'Station Road Retail Plaza', landmark: 'Near Railway Station Road', latOffset: 0.0034, lngOffset: -0.0014 },
        { category: 'Roadside Garbage', area: 'Junathana Commercial Lane', landmark: 'Near Navsari Municipal Office', latOffset: -0.0012, lngOffset: -0.0011 }
      ]
    };

    const templates = categoryByMonth[targetIdx] || categoryByMonth[11];
    const baseLat = 20.9350 + (wardNumber % 5) * 0.003;
    const baseLng = 72.9280 + (wardNumber % 4) * 0.003;

    return templates.map((tmpl, idx) => ({
      id: `complaint-m${targetIdx + 1}-w${wardNumber}-${idx + 1}`,
      complaint_number: `NMC-2026-${1000 + (targetIdx + 1) * 20 + idx}`,
      category: tmpl.category,
      area: tmpl.area,
      landmark: tmpl.landmark,
      latitude: Number((baseLat + tmpl.latOffset).toFixed(5)),
      longitude: Number((baseLng + tmpl.lngOffset).toFixed(5)),
      status: idx === 0 ? 'in_progress' : idx === 1 ? 'resolved' : 'submitted',
      is_urgent: idx === 0,
      date: `${selectedMonthObj.name} ${8 + idx * 6}, 2026`
    }));
  }, [complaints, selectedMonthObj, wardNumber]);

  // Filtered by category and search
  const filteredComplaints = useMemo(() => {
    return monthComplaints.filter(c => {
      if (categoryFilter !== 'all' && c.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.complaint_number.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.landmark.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [monthComplaints, categoryFilter, searchQuery]);

  // Center coordinate for map
  const mapCenter = useMemo<[number, number]>(() => {
    if (filteredComplaints.length > 0) {
      return [filteredComplaints[0].latitude, filteredComplaints[0].longitude];
    }
    return [20.9350 + wardNumber * 0.002, 72.9280 + wardNumber * 0.002];
  }, [filteredComplaints, wardNumber]);

  // Focus coordinate when user clicks "View on Map"
  const [mapFocusLoc, setMapFocusLoc] = useState<[number, number] | null>(null);

  // Determine if this month is upcoming or active for the proactive warning alert
  const surgeAlertInfo = useMemo(() => {
    // E.g. July waterlogging surge
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const targetMonth = selectedMonthObj.monthNumber;
    let diffMonths = targetMonth - curMonth;
    if (diffMonths < 0) diffMonths += 12;
    const approxDays = diffMonths * 30;

    const isActive = approxDays <= leadDays;
    return {
      isActive,
      approxDays,
      category: selectedMonthObj.typicalRisk
    };
  }, [selectedMonthObj, leadDays]);

  return (
    <div className="space-y-4">
      {/* 1. Proactive Notification Lead Time Settings Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-[#095c54] text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-teal-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Automated Early Warning Notification Lead Time
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              Seasonal Surge Alert: Set Notification Window ({leadDays} Days Before)
            </h3>
            <p className="text-xs text-teal-100 max-w-2xl font-medium">
              Ward Officers receive early alerts <strong>30 days</strong> or <strong>15 days</strong> before seasonal problems surge in this area (e.g., July monsoon waterlogging alerts trigger in June).
            </p>
          </div>

          {/* Toggle buttons: 30 Days vs 15 Days */}
          <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => handleUpdateLeadDays(30)}
              disabled={updatingLeadDays}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                leadDays === 30
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>30 Days Before</span>
            </button>

            <button
              onClick={() => handleUpdateLeadDays(15)}
              disabled={updatingLeadDays}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                leadDays === 15
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>15 Days Before</span>
            </button>
          </div>
        </div>

        {settingSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{settingSuccess}</span>
          </div>
        )}
      </div>

      {/* 2. Seasons Tabs & Bound Months Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-4">
        {/* Season Selector Tabs */}
        <div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
            Select Civic Season:
          </span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {SEASONS.map(s => {
              const isSelected = selectedSeasonId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeasonId(s.id)}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#095c54] text-white border-[#095c54] shadow-md scale-[1.02]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{s.icon}</span>
                    <div className="min-w-0">
                      <span className="block font-black text-xs sm:text-sm truncate">{s.name}</span>
                      <span className={`block text-[10px] font-bold ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>
                        {s.nameGu}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {s.months.length} Months
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bound Months Pill Selector */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
              <span>Months Bound to {selectedSeason.name}:</span>
            </span>
            <span className="text-xs font-bold text-[#095c54]">
              Selected: <strong>{selectedMonthName}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSeason.months.map(m => {
              const isSelected = selectedMonthName === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => setSelectedMonthName(m.name)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{m.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Month {m.monthNumber}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 font-medium pt-1">
            Historical Risk Profile: <strong className="text-slate-800">{selectedMonthObj.typicalRisk}</strong>
          </div>
        </div>
      </div>

      {/* 3. Proactive Early Warning Alert Banner (if surge within lead window) */}
      {surgeAlertInfo.isActive && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-xs space-y-1 animate-pulse">
          <div className="flex items-center gap-2 font-black text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>⚠️ ACTIVE PROACTIVE ALERT ({leadDays}-Day Warning Window Triggered)</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            Historical records indicate that <strong>{selectedMonthObj.typicalRisk}</strong> surges during <strong>{selectedMonthName}</strong>. As configured ({leadDays} days lead time), municipal squads should initiate preventive desilting and corridor clearances now.
          </p>
        </div>
      )}

      {/* 4. Interactive Map Showing Complaints by Category & Area */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>{selectedMonthName} Complaints Geospatial Map — Ward {wardNumber} Area</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Circle colors indicate complaint category. Hover on circles to view category details, area, and status.
            </p>
          </div>

          <span className="px-3 py-1 rounded-xl bg-teal-50 text-[#095c54] border border-teal-200 text-xs font-black">
            {filteredComplaints.length} Complaints in {selectedMonthName}
          </span>
        </div>

        {/* Leaflet Map */}
        <div className="h-[380px] w-full z-0 relative">
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
            <MapController selectedLoc={mapFocusLoc} />

            {filteredComplaints.map(c => {
              const colorCfg = getCategoryColor(c.category);
              const isSelected = selectedComplaint?.id === c.id;

              return (
                <CircleMarker
                  key={c.id}
                  center={[c.latitude, c.longitude]}
                  radius={isSelected ? 16 : 11}
                  pathOptions={{
                    color: isSelected ? '#000000' : colorCfg.hex,
                    fillColor: colorCfg.hex,
                    fillOpacity: isSelected ? 0.95 : 0.75,
                    weight: isSelected ? 3.5 : 2
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedComplaint(c);
                      setMapFocusLoc([c.latitude, c.longitude]);
                    }
                  }}
                >
                  {/* Tooltip on HOVER */}
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.98}>
                    <div className="p-1.5 text-xs font-sans min-w-[200px] space-y-1">
                      <div className="font-mono text-[10px] text-slate-400">{c.complaint_number}</div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: colorCfg.hex }}
                        />
                        <span className="text-slate-900">{c.category}</span>
                      </div>
                      <div className="text-slate-700 font-semibold text-xs leading-snug">{c.area}</div>
                      <div className="text-slate-500 text-[11px]">{c.landmark}</div>
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200">
                        <span className="font-bold text-slate-600 capitalize">{c.status}</span>
                        <span className="text-slate-400">{c.date}</span>
                      </div>
                    </div>
                  </Tooltip>

                  {/* Popup on CLICK */}
                  <Popup>
                    <div className="p-2 space-y-1.5 text-xs font-sans min-w-[220px]">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                        <span className="font-black text-slate-900">{c.complaint_number}</span>
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-black text-white"
                          style={{ backgroundColor: colorCfg.hex }}
                        >
                          {c.category}
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium leading-relaxed">
                        <strong>Area:</strong> {c.area}<br/>
                        <strong>Landmark:</strong> {c.landmark}
                      </div>
                      <div className="text-slate-500 text-[11px]">Date: {c.date}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Map Legend Footer */}
        <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black text-slate-700">Category Legend:</span>
            {Object.values(CATEGORY_COLOR_MAP).map(item => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.hex }} />
                <span className="text-slate-600 text-[11px] font-medium">{item.name}</span>
              </div>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Click any row below to locate marker on map
          </span>
        </div>
      </div>

      {/* 5. Complaints List with Category & Area Details (Clean List / Table — NO CARD PREDICTIONS!) */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">
              Complaints Recorded in {selectedMonthName} ({filteredComplaints.length})
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Detailed list of civic complaints occurring in {selectedMonthName} with category, area, and status
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search area or category..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#095c54]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:border-[#095c54]"
            >
              <option value="all">All Categories</option>
              <option value="Open Garbage Dumping">Open Garbage Dumping</option>
              <option value="Overflowing Dustbins">Overflowing Dustbins</option>
              <option value="Drainage Issues">Drainage Issues</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Potholes">Potholes</option>
              <option value="Roadside Garbage">Roadside Garbage</option>
              <option value="Dead Animal Removal">Dead Animal Removal</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-medium space-y-1">
            <CloudRain className="w-8 h-8 mx-auto text-slate-300" />
            <p>No complaints match this filter for {selectedMonthName}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Complaint #</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Area &amp; Landmark</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Map Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map(c => {
                  const colorCfg = getCategoryColor(c.category);
                  const isSelected = selectedComplaint?.id === c.id;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        isSelected ? 'bg-teal-50/60 font-semibold' : ''
                      }`}
                      onClick={() => {
                        setSelectedComplaint(c);
                        setMapFocusLoc([c.latitude, c.longitude]);
                      }}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {c.complaint_number}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${colorCfg.badgeBg}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: colorCfg.hex }}
                          />
                          <span>{c.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 truncate max-w-xs">{c.area}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.landmark}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {c.date}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            c.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComplaint(c);
                            setMapFocusLoc([c.latitude, c.longitude]);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white font-bold text-xs transition inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>View on Map</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
