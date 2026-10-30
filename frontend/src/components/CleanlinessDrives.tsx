import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Check,
  X
} from 'lucide-react';
import { api } from '../services/api.js';
import { CleanlinessDrive } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface CleanlinessDrivesProps {
  lang: Language;
}

export const CleanlinessDrives: React.FC<CleanlinessDrivesProps> = ({ lang }) => {
  const [drives, setDrives] = useState<CleanlinessDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const t = translations[lang];

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await api.getDrives();
      setDrives(res.data);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleRegister = async (driveId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.registerForDrive(driveId);
      setActionSuccess(res.message);
      fetchDrives();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCancelRegistration = async (driveId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.cancelDriveRegistration(driveId);
      setActionSuccess(res.message);
      fetchDrives();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const filtered = drives.filter(d => {
    if (selectedWard !== 'all' && !d.ward_name.includes(selectedWard)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.location_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#10b981]" />
            {t.drives_title}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            {t.drives_desc}
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#ecfdf5] text-[#10b981] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-[#fee2e2] text-[#dc2626] text-xs font-bold flex items-center gap-2">
          <X className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white p-3 rounded-2xl border border-[#e2e8f0] flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search drives (e.g. Dudhiya Talao, Dandi Beach)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
          />
        </div>
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-[#64748b]">
          Loading upcoming municipal cleanliness drives...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] text-xs text-[#64748b]">
          No drives found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const percentFilled = Math.min(100, Math.round((d.registered_volunteers_count / d.max_volunteers) * 100));

            return (
              <div
                key={d.id}
                className="rounded-3xl border border-[#e2e8f0] bg-white shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-100">
                    <img src={d.banner_url} alt={d.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#095c54] text-white">
                        {d.ward_name}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <h3 className="font-extrabold text-sm text-[#095c54]">
                      {d.title}
                    </h3>
                    <p className="text-xs text-[#0f2925] line-clamp-2">
                      {d.description}
                    </p>

                    <div className="text-xs text-[#64748b] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                        <span>{d.location_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#095c54]" />
                        <span>{new Date(d.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#64748b] font-medium flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#095c54]" /> Volunteers
                        </span>
                        <span className="font-extrabold text-[#095c54]">
                          {d.registered_volunteers_count} / {d.max_volunteers} ({percentFilled}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#095c54] to-[#10b981] h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  {d.is_registered ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 py-2 rounded-xl bg-[#ecfdf5] text-[#10b981] text-xs font-extrabold flex items-center justify-center gap-1 border border-[#a7f3d0]">
                        <Check className="w-3.5 h-3.5" /> {t.registered_badge}
                      </div>
                      <button
                        onClick={() => handleCancelRegistration(d.id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-[#dc2626] border border-[#fca5a5] hover:bg-[#fee2e2] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(d.id)}
                      className="w-full btn-primary-custom py-2.5 text-xs font-bold"
                    >
                      {t.register_btn}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
