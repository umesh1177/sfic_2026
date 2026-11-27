import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  User,
  X,
  Camera,
  Layers,
  Award
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Language, translations } from '../../i18n/translations.js';
import { TablePagination } from './TablePagination.js';

interface CitizenFeedbackItem {
  id: string;
  complaint_id: string;
  citizen_id: string;
  rating: number;
  feedback_text: string;
  resolution_satisfactory: boolean;
  created_at: string;
  complaint_number: string;
  category_id?: string;
  category_name: string;
  complaint_description?: string;
  complaint_address: string;
  ward_number: number;
  ward_name: string;
  complaint_status: string;
  complaint_before_image?: string;
  complaint_after_image?: string;
  complaint_resolved_at?: string;
  assigned_officer_name?: string;
  citizen_name: string;
  citizen_phone?: string;
  citizen_avatar?: string;
}

interface CitizenFeedbackViewProps {
  lang: Language;
  wardNumber?: number;
  onNavigateComplaint?: (complaintId: string) => void;
}

export const CitizenFeedbackView: React.FC<CitizenFeedbackViewProps> = ({
  lang,
  wardNumber,
  onNavigateComplaint
}) => {
  const t = translations[lang] || {};
  const [feedbacks, setFeedbacks] = useState<CitizenFeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | 'critical'>('all');
  const [selectedWard, setSelectedWard] = useState<number | 'all'>(wardNumber || 'all');
  const [satisfactionFilter, setSatisfactionFilter] = useState<'all' | 'satisfied' | 'unsatisfied'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Complaint Details Modal
  const [inspectedFeedback, setInspectedFeedback] = useState<CitizenFeedbackItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fetchFeedbackList = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetWard = selectedWard !== 'all' ? selectedWard : undefined;
      const res = await api.getCitizenFeedback(targetWard);
      if (res.success && Array.isArray(res.data)) {
        setFeedbacks(res.data);
      } else {
        setFeedbacks([]);
      }
    } catch (err: any) {
      console.error('Failed to load citizen feedback:', err);
      setError(err.message || 'Failed to load citizen satisfaction reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackList();
  }, [selectedWard]);

  // Metric computations
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0
    ? (feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0) / totalCount).toFixed(1)
    : '5.0';
  const satisfiedCount = feedbacks.filter(f => f.resolution_satisfactory !== false && (f.rating >= 3)).length;
  const satisfactionRate = totalCount > 0 ? Math.round((satisfiedCount / totalCount) * 100) : 100;
  const fiveStarCount = feedbacks.filter(f => Number(f.rating) === 5).length;
  const fourStarCount = feedbacks.filter(f => Number(f.rating) === 4).length;
  const threeStarCount = feedbacks.filter(f => Number(f.rating) === 3).length;
  const lowStarCount = feedbacks.filter(f => Number(f.rating) <= 2).length;

  // Filtered List
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      // Rating filter
      if (ratingFilter === '5' && Number(f.rating) !== 5) return false;
      if (ratingFilter === '4' && Number(f.rating) !== 4) return false;
      if (ratingFilter === '3' && Number(f.rating) !== 3) return false;
      if (ratingFilter === 'critical' && Number(f.rating) > 2) return false;

      // Satisfaction filter
      if (satisfactionFilter === 'satisfied' && (f.resolution_satisfactory === false || f.rating < 3)) return false;
      if (satisfactionFilter === 'unsatisfied' && (f.resolution_satisfactory !== false && f.rating >= 3)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const compNum = (f.complaint_number || '').toLowerCase();
        const cat = (f.category_name || '').toLowerCase();
        const name = (f.citizen_name || '').toLowerCase();
        const text = (f.feedback_text || '').toLowerCase();
        const addr = (f.complaint_address || '').toLowerCase();
        const wardStr = `ward ${f.ward_number}`;
        if (
          !compNum.includes(q) &&
          !cat.includes(q) &&
          !name.includes(q) &&
          !text.includes(q) &&
          !addr.includes(q) &&
          !wardStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [feedbacks, ratingFilter, satisfactionFilter, searchQuery]);

  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFeedbacks.slice(start, start + pageSize);
  }, [filteredFeedbacks, currentPage, pageSize]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Summary Stats */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#095c54] border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                Citizen Feedback &amp; Review Catalogue
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                Resolved Problems Only
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight">
              Citizen Satisfaction &amp; Quality Reviews
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Verified post-resolution satisfaction reviews submitted by citizens across Navsari. Every feedback entry is linked directly to its resolved municipal complaint.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchFeedbackList}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shrink-0"
              title="Refresh Feedback"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Analytics KPI Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#f0faf7] to-white border border-[#cde6df]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Quality Score</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#095c54]">{avgRating}</span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(Number(avgRating))
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-200'
                  }`}
                />
              ))}
              <span className="text-[10px] text-slate-500 font-bold ml-1.5">Rating Index</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/60 to-white border border-teal-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Reviews</span>
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0f2925]">{totalCount}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Recorded in PostgreSQL DB
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rating Breakdown</span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span className="text-emerald-700 font-bold">5★: {fiveStarCount}</span>
              <span className="text-teal-700 font-bold">4★: {fourStarCount}</span>
              <span className="text-amber-700 font-bold">3★: {threeStarCount}</span>
              <span className="text-rose-700 font-bold">≤2★: {lowStarCount}</span>
            </div>
            <div className="flex h-1.5 w-full rounded-full overflow-hidden mt-2.5 bg-slate-100">
              <div style={{ width: `${totalCount ? (fiveStarCount / totalCount) * 100 : 0}%` }} className="bg-emerald-500" />
              <div style={{ width: `${totalCount ? (fourStarCount / totalCount) * 100 : 0}%` }} className="bg-teal-400" />
              <div style={{ width: `${totalCount ? (threeStarCount / totalCount) * 100 : 0}%` }} className="bg-amber-400" />
              <div style={{ width: `${totalCount ? (lowStarCount / totalCount) * 100 : 0}%` }} className="bg-rose-500" />
            </div>
          </div>
        </div>

        {/* 2. Interactive Search and Filter Ribbon */}
        <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by complaint #, citizen name, category, or review text..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#095c54] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 flex-wrap">
            {/* Rating Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
              {(['all', '5', '4', '3', 'critical'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setRatingFilter(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    ratingFilter === tab
                      ? 'bg-white text-[#095c54] shadow-xs'
                      : 'text-slate-600 hover:text-[#095c54]'
                  }`}
                >
                  {tab === 'all'
                    ? 'All Ratings'
                    : tab === 'critical'
                    ? '≤ 2★ Needs Attention'
                    : `${tab}★ Stars`}
                </button>
              ))}
            </div>

            {/* Ward Selector Dropdown */}
            {!wardNumber && (
              <select
                value={selectedWard}
                onChange={e => {
                  setSelectedWard(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 focus:outline-none focus:border-[#095c54]"
              >
                <option value="all">All Navsari Wards</option>
                {Array.from({ length: 13 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>
                    Ward {w}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 3. Feedback Cards Grid */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto" />
          <h4 className="text-sm font-black text-slate-700">Loading Citizen Feedback Reviews...</h4>
          <p className="text-xs text-slate-400">Fetching verified resolution reviews from database.</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-[#0f2925]">No Citizen Feedback Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || ratingFilter !== 'all' || satisfactionFilter !== 'all'
              ? 'No reviews match your selected filter criteria. Try resetting your search or filters.'
              : 'No resolved complaints have recorded feedback reviews yet. When citizens review resolved complaints in My Complaints, their satisfaction reviews will be catalogued here.'}
          </p>
          {(searchQuery || ratingFilter !== 'all' || satisfactionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRatingFilter('all');
                setSatisfactionFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedFeedbacks.map(item => {
              const rating = Number(item.rating) || 5;
              const isSatisfied = item.resolution_satisfactory !== false && rating >= 3;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Top: Citizen Info & Rating Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.citizen_avatar ? (
                          <img
                            src={item.citizen_avatar}
                            alt={item.citizen_name}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-[#095c54] text-white flex items-center justify-center font-black text-sm shrink-0">
                            {item.citizen_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-[#0f2925] truncate">
                              {item.citizen_name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase">
                              Verified Citizen
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Submitted on {new Date(item.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Satisfaction Pill */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 border ${
                          isSatisfied
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isSatisfied ? (
                          <>
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            <span>Satisfied</span>
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="w-3 h-3 text-rose-600" />
                            <span>Needs Attention</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Star Rating & Comment */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= rating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-[#0f2925] ml-1">
                          {rating}.0 / 5.0
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {rating === 5
                            ? '· Excellent Resolution'
                            : rating === 4
                            ? '· Good Work'
                            : rating === 3
                            ? '· Satisfactory'
                            : '· Sub-optimal'}
                        </span>
                      </div>

                      {item.feedback_text ? (
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium italic leading-relaxed">
                          &quot;{item.feedback_text}&quot;
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-400 italic">
                          No written comment provided by citizen with this rating.
                        </div>
                      )}
                    </div>

                    {/* Complaint Reference Card */}
                    <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-slate-200/90 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-black text-[#095c54] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {item.complaint_number}
                        </span>
                        <span className="font-black text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                          Ward {item.ward_number} · {item.ward_name}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-black text-[#0f2925]">
                          {item.category_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{item.complaint_address}</span>
                        </div>
                      </div>

                      {/* Photo Previews if available */}
                      {(item.complaint_before_image || item.complaint_after_image) && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                          {item.complaint_before_image && (
                            <div
                              onClick={() =>
                                setPreviewImage({
                                  url: item.complaint_before_image!,
                                  title: `Before Resolution — ${item.complaint_number}`
                                })
                              }
                              className="relative rounded-xl overflow-hidden aspect-video bg-slate-100 cursor-pointer group border border-slate-200"
                            >
                              <img
                                src={item.complaint_before_image}
                                alt="Reported issue"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-black uppercase">
                                Reported
                              </span>
                            </div>
                          )}
                          {item.complaint_after_image && (
                            <div
                              onClick={() =>
                                setPreviewImage({
                                  url: item.complaint_after_image!,
                                  title: `Cleaned & Resolved — ${item.complaint_number}`
                                })
                              }
                              className="relative rounded-xl overflow-hidden aspect-video bg-slate-100 cursor-pointer group border border-emerald-300"
                            >
                              <img
                                src={item.complaint_after_image}
                                alt="Resolved site"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-emerald-700 text-white text-[9px] font-black uppercase">
                                Resolved
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Status: <strong className="text-emerald-700 font-bold uppercase">{item.complaint_status}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectedFeedback(item)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#095c54] border border-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <span>View Details</span>
                      <ExternalLink className="w-3 h-3 text-[#095c54]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredFeedbacks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="feedback reviews"
          />
        </div>
      )}

      {/* 4. Full Feedback & Complaint Details Modal */}
      {inspectedFeedback && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#095c54] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0f2925]">
                    Citizen Satisfaction Review Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complaint {inspectedFeedback.complaint_number} · Ward {inspectedFeedback.ward_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedFeedback(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Citizen Rating Review Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#095c54]" />
                    <span className="font-black text-xs text-[#0f2925]">
                      {inspectedFeedback.citizen_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {new Date(inspectedFeedback.created_at).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= inspectedFeedback.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-[#095c54]">
                    {inspectedFeedback.rating}/5 Stars
                  </span>
                </div>

                {inspectedFeedback.feedback_text && (
                  <p className="text-xs text-slate-800 font-medium italic bg-white p-3 rounded-xl border border-emerald-100">
                    &quot;{inspectedFeedback.feedback_text}&quot;
                  </p>
                )}
              </div>

              {/* Resolved Complaint Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-[#0f2925] uppercase tracking-wider">
                  Resolved Municipal Issue Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                    <strong className="text-slate-800">{inspectedFeedback.category_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ward Location</span>
                    <strong className="text-slate-800">Ward {inspectedFeedback.ward_number} ({inspectedFeedback.ward_name})</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Address</span>
                    <span className="text-slate-700">{inspectedFeedback.complaint_address}</span>
                  </div>
                  {inspectedFeedback.complaint_description && (
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Original Issue Description</span>
                      <p className="text-slate-700 mt-0.5">{inspectedFeedback.complaint_description}</p>
                    </div>
                  )}
                  {inspectedFeedback.assigned_officer_name && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Sanitary Officer</span>
                      <strong className="text-[#095c54]">{inspectedFeedback.assigned_officer_name}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-side Before/After Images */}
              {(inspectedFeedback.complaint_before_image || inspectedFeedback.complaint_after_image) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-[#0f2925] uppercase tracking-wider">
                    Site Photographic Evidence
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {inspectedFeedback.complaint_before_image && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Reported Problem</span>
                        <div className="rounded-2xl overflow-hidden aspect-video border border-slate-200">
                          <img
                            src={inspectedFeedback.complaint_before_image}
                            alt="Before"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {inspectedFeedback.complaint_after_image && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved Quality Proof</span>
                        <div className="rounded-2xl overflow-hidden aspect-video border border-emerald-300">
                          <img
                            src={inspectedFeedback.complaint_after_image}
                            alt="After"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectedFeedback(null)}
                className="px-5 py-2.5 rounded-xl bg-[#095c54] text-white hover:bg-[#074741] text-xs font-black transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Image Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full border border-slate-200 shadow-2xl space-y-3 p-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-[#0f2925]">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden rounded-2xl flex items-center justify-center bg-slate-900">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
