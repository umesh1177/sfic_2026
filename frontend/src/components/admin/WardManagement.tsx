import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MapPin,
  UserCheck,
  Users,
  AlertCircle,
  CheckCircle2,
  Phone,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  X,
  Compass
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Ward } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { TablePagination } from '../common/TablePagination.js';

interface WardManagementProps {
  lang: Language;
  onNavigateToBoundary: (wardNumber?: number) => void;
}

export const WardManagement: React.FC<WardManagementProps> = ({ lang, onNavigateToBoundary }) => {
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  const fetchWards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminWards();
      if (res.success && res.data) {
        setWards(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load wards:', err);
      setError(err.message || 'Failed to fetch ward data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const filteredWards = wards.filter(w => {
    const query = searchQuery.toLowerCase();
    return (
      (w.ward_name || '').toLowerCase().includes(query) ||
      (w.ward_name_gu || '').toLowerCase().includes(query) ||
      String(w.ward_number).includes(query) ||
      (w.ward_officer_name || '').toLowerCase().includes(query) ||
      (w.office_address || '').toLowerCase().includes(query) ||
      (w.assigned_officers || []).some((o: any) => (o.name || '').toLowerCase().includes(query))
    );
  });

  const paginatedWards = filteredWards.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* 1. Header & Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-[10px] sm:text-xs font-black border border-teal-200">
              MUNICIPAL WARDS DIRECTORY
            </span>
            <span className="text-slate-400 text-[11px] font-bold">13 Divisions</span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-[#0f2925] tracking-tight">
            Navsari Ward Management
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by ward #, name, officer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
            />
          </div>
          <button
            onClick={fetchWards}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Wards List: Compact Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        {/* Mobile Card View (< md) — Zero Horizontal Scroll */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && wards.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-bold">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#095c54]" />
              Loading municipal wards...
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold">
              No wards found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            paginatedWards.map(ward => (
              <div key={ward.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-[#095c54] inline-flex items-center justify-center font-black text-xs shrink-0">
                      {ward.ward_number}
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-[#0f2925] text-xs truncate">{ward.ward_name}</div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {ward.ward_officer_name || 'Unassigned'} · {ward.contact_phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-0.5 font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200 shrink-0">
                    {ward.cleanliness_score || 90.0}%
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className={`px-2 py-0.5 rounded-full ${ward.active_complaints_count > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {ward.active_complaints_count} Active
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {ward.total_workers_count ?? 0} Workers
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedWard(ward)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => onNavigateToBoundary(ward.ward_number)}
                      className="px-2.5 py-1 rounded-lg bg-[#095c54] text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Boundary</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ward #</th>
                <th className="py-3.5 px-4">Ward Name & Area</th>
                <th className="py-3.5 px-4">Administrative Office</th>
                <th className="py-3.5 px-4">Ward Officer</th>
                <th className="py-3.5 px-4 text-center">Active Complaints</th>
                <th className="py-3.5 px-4 text-center">Workers</th>
                <th className="py-3.5 px-4 text-center">Cleanliness Score</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && wards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#095c54]" />
                    Loading municipal wards from database...
                  </td>
                </tr>
              ) : filteredWards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    No wards found matching &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                paginatedWards.map(ward => (
                  <tr key={ward.id} className="hover:bg-slate-50/80 transition group">
                    {/* Ward # */}
                    <td className="py-3.5 px-4 font-black text-[#0f2925]">
                      <span className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-[#095c54] inline-flex items-center justify-center font-black text-xs">
                        {ward.ward_number}
                      </span>
                    </td>

                    {/* Ward Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-[#0f2925] text-sm">{ward.ward_name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{ward.ward_name_gu}</div>
                    </td>

                    {/* Office Address */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-600 font-medium text-xs truncate flex items-center gap-1.5" title={ward.office_address}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{ward.office_address}</span>
                      </div>
                    </td>

                    {/* Officer & Phone */}
                    <td className="py-3.5 px-4">
                      {Array.isArray(ward.assigned_officers) && ward.assigned_officers.length > 0 ? (
                        <div className="space-y-1">
                          {ward.assigned_officers.map((off: any, idx: number) => (
                            <div key={off.id || idx}>
                              <div className="font-bold text-[#0f2925]">{off.name}</div>
                              <div className="text-[11px] text-[#095c54] font-bold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#095c54]" />
                                <span>{off.phone || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-[#0f2925]">{ward.ward_officer_name || 'Unassigned'}</div>
                          <div className="text-[11px] text-[#095c54] font-bold flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#095c54]" />
                            <span>{ward.contact_phone || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </td>

                    {/* Active Complaints */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black ${
                          ward.active_complaints_count > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {ward.active_complaints_count} Active
                      </span>
                    </td>

                    {/* Workers */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full text-[11px]">
                        <Users className="w-3 h-3 text-slate-500" />
                        {ward.total_workers_count ?? 0}
                      </span>
                    </td>

                    {/* Cleanliness Score */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {ward.cleanliness_score || 90.0}%
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedWard(ward)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onNavigateToBoundary(ward.ward_number)}
                          className="px-2.5 py-1 rounded-lg bg-[#095c54] hover:bg-[#074741] text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                          title="View / Edit Boundary Polygon"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Boundary</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredWards.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="wards"
        />
      </div>

      {/* 4. Ward Details Modal */}
      {selectedWard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedWard(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#095c54] flex items-center justify-center font-black text-base shadow-2xs">
                {selectedWard.ward_number}
              </span>
              <div>
                <h3 className="text-base font-black text-[#0f2925]">{selectedWard.ward_name}</h3>
                <p className="text-xs text-slate-500 font-bold">{selectedWard.ward_name_gu}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Administrative Office:</span>
                <span className="font-black text-[#0f2925] text-right">{selectedWard.office_address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Ward Officer In-charge:</span>
                <span className="font-black text-[#0f2925]">{selectedWard.ward_officer_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Emergency Contact:</span>
                <span className="font-black text-[#095c54]">{selectedWard.contact_phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Field Sanitation Workers:</span>
                <span className="font-black text-[#0f2925]">{selectedWard.total_workers_count || 4} Personnel</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Active Grievances:</span>
                <span className="font-black text-amber-700">{selectedWard.active_complaints_count || 0} Open</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Cleanliness Performance:</span>
                <span className="font-black text-emerald-700">{selectedWard.cleanliness_score || 90.0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-500">Boundary Geofence:</span>
                <span className="font-black text-slate-700">
                  {selectedWard.boundary_coordinates?.length || 0} polygon coordinates defined
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedWard(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const num = selectedWard.ward_number;
                  setSelectedWard(null);
                  onNavigateToBoundary(num);
                }}
                className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Adjust Ward Boundary on Map</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

