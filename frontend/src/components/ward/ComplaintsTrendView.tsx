import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  Filter,
  RefreshCw,
  Calendar,
  Sliders,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers
} from 'lucide-react';
import { api } from '../../services/api.js';
import {
  ComplaintsTrendResult,
  ComplaintTrendCandle
} from '../../types/index.js';

interface ComplaintsTrendViewProps {
  wardNumber?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ComplaintsTrendView: React.FC<ComplaintsTrendViewProps> = ({ wardNumber = 0 }) => {
  // Filter states
  const [filterMode, setFilterMode] = useState<'month' | 'year' | 'range'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Bar toggles
  const [showRaisedBars, setShowRaisedBars] = useState<boolean>(true);
  const [showFallenBars, setShowFallenBars] = useState<boolean>(true);

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [trendData, setTrendData] = useState<ComplaintsTrendResult | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ComplaintTrendCandle | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchTrend = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaintsTrend({
        ward: wardNumber === 0 ? undefined : wardNumber,
        category: selectedCategory,
        filter_mode: filterMode,
        year: selectedYear,
        month: filterMode === 'month' ? selectedMonth : undefined,
        start_date: filterMode === 'range' ? startDate : undefined,
        end_date: filterMode === 'range' ? endDate : undefined
      });
      if (res?.success && res.data) {
        setTrendData(res.data);
      }
    } catch (err) {
      console.error('Failed to load complaints trend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrend();
  }, [wardNumber, filterMode, selectedYear, selectedMonth, startDate, endDate, selectedCategory]);

  const series = trendData?.series || [];

  // Bar Chart Dimensions
  const chartHeight = 280;
  const chartWidth = 840;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 45;
  const drawableWidth = chartWidth - paddingLeft - paddingRight;

  const { maxVal } = useMemo(() => {
    if (series.length === 0) return { maxVal: 10 };
    const maxR = Math.max(...series.map(s => s.raised_count ?? s.volume ?? 0), 1);
    const maxF = Math.max(...series.map(s => s.fallen_count ?? s.resolved_volume ?? 0), 1);
    const highest = Math.max(maxR, maxF);
    // Round to a clean upper step
    const stepped = Math.ceil(highest * 1.15);
    return { maxVal: Math.max(5, stepped) };
  }, [series]);

  const slotWidth = series.length > 0 ? drawableWidth / series.length : drawableWidth;
  const bothActive = showRaisedBars && showFallenBars;
  const barWidth = bothActive
    ? Math.max(3, Math.min(18, slotWidth * 0.36))
    : Math.max(4, Math.min(26, slotWidth * 0.6));
  const barGap = bothActive ? Math.max(1, barWidth * 0.15) : 0;

  const getY = (val: number) => {
    const h = (val / maxVal) * chartHeight;
    return paddingTop + chartHeight - h;
  };

  const getBarHeight = (val: number) => {
    return Math.max(2, (val / maxVal) * chartHeight);
  };

  const activePoint = hoveredPoint || (series.length > 0 ? series[series.length - 1] : null);

  return (
    <div className="space-y-5">
      {/* 1. Multi-Filter Strip: Month, Year, Date Range & Category */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e2e8f0] shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                filterMode === 'month'
                  ? 'bg-[#095c54] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>By Month</span>
            </button>

            <button
              onClick={() => setFilterMode('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                filterMode === 'year'
                  ? 'bg-[#095c54] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>By Year</span>
            </button>

            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                filterMode === 'range'
                  ? 'bg-[#095c54] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Start Date to End Date</span>
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#095c54] outline-none"
            >
              <option value="all">All Categories Combined</option>
              <option value="Roadside Garbage">Roadside Garbage</option>
              <option value="Open Garbage Dumping">Open Garbage Dumping</option>
              <option value="Overflowing Dustbins">Overflowing Dustbins</option>
              <option value="Drainage Issues">Drainage &amp; Waterlogging</option>
              <option value="Potholes">Potholes &amp; Road Wear</option>
              <option value="Dead Animal Removal">Dead Animal Removal</option>
            </select>
          </div>
        </div>

        {/* Dynamic Secondary Inputs based on selected filter mode */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {filterMode === 'month' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Select Month &amp; Year:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-black text-slate-800 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 outline-none"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="text-xs font-black text-slate-800 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 outline-none"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          )}

          {filterMode === 'year' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Select Year:</span>
              {[2026, 2025, 2024].map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    selectedYear === y
                      ? 'bg-[#095c54] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {y} {y === 2026 ? '(Current)' : ''}
                </button>
              ))}
            </div>
          )}

          {filterMode === 'range' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#095c54]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#095c54]"
                />
              </div>
            </div>
          )}

          {/* Bar Visibility Toggles */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setShowRaisedBars(!showRaisedBars)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                showRaisedBars
                  ? 'bg-rose-50 text-rose-800 border-rose-300 font-black shadow-2xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Raise Count (Red)</span>
            </button>

            <button
              onClick={() => setShowFallenBars(!showFallenBars)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                showFallenBars
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black shadow-2xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Fall / Resolved (Green)</span>
            </button>

            <button
              onClick={fetchTrend}
              disabled={loading}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="Refresh Trend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bar Chart Container */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs p-4 sm:p-6 space-y-4">
        {/* Chart Header & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#095c54]" />
              <span>Complaints Trend Bar Chart</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Side-by-side comparison of complaints raised vs complaints resolved
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
              <span>Raise Count</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
              <span>Fall (Resolved) Count</span>
            </div>
          </div>
        </div>

        {/* SVG Bar Chart Area */}
        {loading ? (
          <div className="h-64 rounded-2xl bg-slate-50 animate-pulse flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
            <BarChart2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No complaint records found for the selected period.</p>
            <p className="text-xs text-slate-400">Choose a different month, year, or custom date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight + paddingTop + paddingBottom}`}
                className="w-full min-w-[700px] h-[330px] select-none"
              >
                <defs>
                  {/* Subtle drop shadow for hover */}
                  <filter id="barShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Scale */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const yVal = Math.round(maxVal * pct);
                  const yPos = paddingTop + chartHeight - pct * chartHeight;
                  return (
                    <g key={i}>
                      <line
                        x1={paddingLeft}
                        y1={yPos}
                        x2={chartWidth - paddingRight}
                        y2={yPos}
                        stroke="#f1f5f9"
                        strokeDasharray={pct === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="700"
                        fill="#94a3b8"
                        fontFamily="monospace"
                      >
                        {yVal}
                      </text>
                    </g>
                  );
                })}

                {/* Base Axis Line */}
                <line
                  x1={paddingLeft}
                  y1={paddingTop + chartHeight}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop + chartHeight}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />

                {/* Render Bars per Interval */}
                {series.map((s, idx) => {
                  const xCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
                  const raisedVal = s.raised_count ?? s.volume ?? 0;
                  const fallenVal = s.fallen_count ?? s.resolved_volume ?? 0;
                  const hRaised = getBarHeight(raisedVal);
                  const hFallen = getBarHeight(fallenVal);
                  const yRaised = getY(raisedVal);
                  const yFallen = getY(fallenVal);

                  const isHovered = hoverIndex === idx;

                  // Bar X positions
                  let xRaised = xCenter;
                  let xFallen = xCenter;
                  if (bothActive) {
                    xRaised = xCenter - barWidth - barGap / 2;
                    xFallen = xCenter + barGap / 2;
                  } else {
                    xRaised = xCenter - barWidth / 2;
                    xFallen = xCenter - barWidth / 2;
                  }

                  const skipLabel = series.length > 20 && idx % Math.ceil(series.length / 15) !== 0 && idx !== series.length - 1;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => {
                        setHoveredPoint(s);
                        setHoverIndex(idx);
                      }}
                      onMouseLeave={() => {
                        setHoveredPoint(null);
                        setHoverIndex(null);
                      }}
                    >
                      {/* Highlight column on hover */}
                      {isHovered && (
                        <rect
                          x={paddingLeft + idx * slotWidth}
                          y={paddingTop}
                          width={slotWidth}
                          height={chartHeight}
                          fill="#f8fafc"
                          rx="4"
                        />
                      )}

                      {/* Raised Bar (Red/Rose) */}
                      {showRaisedBars && (
                        <g>
                          <rect
                            x={xRaised}
                            y={yRaised}
                            width={barWidth}
                            height={hRaised}
                            rx={barWidth > 6 ? 4 : 2}
                            fill={isHovered ? '#be123c' : '#e11d48'}
                            filter={isHovered ? 'url(#barShadow)' : undefined}
                            className="transition-colors duration-150"
                          />
                          {/* Value above bar if space permits */}
                          {raisedVal > 0 && (series.length <= 16 || isHovered) && (
                            <text
                              x={xRaised + barWidth / 2}
                              y={yRaised - 4}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="900"
                              fill="#be123c"
                              fontFamily="monospace"
                            >
                              {raisedVal}
                            </text>
                          )}
                        </g>
                      )}

                      {/* Fallen / Resolved Bar (Green/Emerald) */}
                      {showFallenBars && (
                        <g>
                          <rect
                            x={xFallen}
                            y={yFallen}
                            width={barWidth}
                            height={hFallen}
                            rx={barWidth > 6 ? 4 : 2}
                            fill={isHovered ? '#047857' : '#059669'}
                            filter={isHovered ? 'url(#barShadow)' : undefined}
                            className="transition-colors duration-150"
                          />
                          {/* Value above bar if space permits */}
                          {fallenVal > 0 && (series.length <= 16 || isHovered) && (
                            <text
                              x={xFallen + barWidth / 2}
                              y={yFallen - 4}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="900"
                              fill="#047857"
                              fontFamily="monospace"
                            >
                              {fallenVal}
                            </text>
                          )}
                        </g>
                      )}

                      {/* X-Axis Interval Label */}
                      {!skipLabel && (
                        <text
                          x={xCenter}
                          y={paddingTop + chartHeight + 18}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill={isHovered ? '#095c54' : '#64748b'}
                        >
                          {s.label}
                        </text>
                      )}

                      {/* Transparent Hover Hitbox */}
                      <rect
                        x={paddingLeft + idx * slotWidth}
                        y={paddingTop}
                        width={slotWidth}
                        height={chartHeight + 25}
                        fill="transparent"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Card */}
            {activePoint && (
              <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                    Selected Interval
                  </span>
                  <h4 className="text-sm font-black text-white">
                    {activePoint.date_formatted || activePoint.label}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Raised Complaints:</span>
                    <strong className="text-rose-400 text-sm font-black">
                      +{activePoint.raised_count ?? activePoint.volume ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Resolved Complaints:</span>
                    <strong className="text-emerald-400 text-sm font-black">
                      -{activePoint.fallen_count ?? activePoint.resolved_volume ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Net Difference:</span>
                    <strong
                      className={`text-sm font-black ${
                        (activePoint.net_change ?? 0) > 0 ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {(activePoint.net_change ?? 0) > 0
                        ? `+${activePoint.net_change}`
                        : activePoint.net_change ?? 0}
                    </strong>
                  </div>

                  {activePoint.top_category && (
                    <div className="hidden sm:block border-l border-slate-700 pl-3">
                      <span className="text-slate-400 text-[11px] block">Dominant Category:</span>
                      <span className="text-slate-200 text-xs font-bold truncate max-w-[180px] block">
                        {activePoint.top_category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
