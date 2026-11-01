import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api.js';

export const WardCommunityActivities: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await api.getCommunityActivities();
      // Filter or enrich for Ward 3
      setActivities(res.data || []);
    } catch (err) {
      console.error('Failed to load community activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleReview = async (id: string, decision: 'ward_approved' | 'changes_requested' | 'rejected') => {
    try {
      const mappedDecision = decision === 'ward_approved' ? 'approved' : decision;
      await api.officerReviewActivity(
        id,
        mappedDecision,
        `Ward 3 Officer decision: ${decision.replace('_', ' ')}`
      );
      setActionMessage(`Activity successfully updated to ${decision.replace('_', ' ')}.`);
      await fetchActivities();
      if (selectedActivity?.id === id) {
        setSelectedActivity({ ...selectedActivity, approval_status: decision });
      }
    } catch (err: any) {
      console.error('Review failed:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Community Cleanliness Drives
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review & Approve Citizen Drives Organised by Ward 3 Community Heads
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs self-start sm:self-auto"
          title="Refresh activities"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Activities Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
            <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 mt-2">Loading community activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-500 text-xs">
            No community activities found for Ward 3.
          </div>
        ) : (
          activities.map(act => (
            <div
              key={act.id}
              className="p-5 rounded-3xl bg-white border border-[#e2e8f0] hover:border-[#095c54] transition shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                      {act.activity_code || 'ACT-2026-01'}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        act.approval_status === 'ward_approved' || act.approval_status === 'nmc_admin_approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : act.approval_status === 'changes_requested'
                          ? 'bg-orange-50 text-orange-800 border border-orange-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {act.approval_status?.replace('_', ' ') || 'Submitted'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#0f2925] mt-1">{act.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{act.proposed_date || '2026-11-08'}</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">{act.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Location</span>
                    <span className="font-extrabold text-slate-800 truncate">{act.meeting_point || 'North Lake Promenade'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Volunteers Expected</span>
                    <span className="font-extrabold text-slate-800">{act.expected_participants || 100} Citizens</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Organized By</span>
                    <span className="font-extrabold text-slate-800 truncate">{act.community_name || 'Navsari Green Warriors'}</span>
                  </div>
                </div>
              </div>

              {/* Approval Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleReview(act.id, 'ward_approved')}
                  className="px-4 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Ward Approve</span>
                </button>
                <button
                  onClick={() => handleReview(act.id, 'changes_requested')}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-extrabold transition"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => handleReview(act.id, 'rejected')}
                  className="px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-extrabold transition"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
