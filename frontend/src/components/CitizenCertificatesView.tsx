import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ShieldCheck, Sparkles, RefreshCw, Users, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { api } from '../services/api.js';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';
import { CertificatesTableView } from './common/CertificatesTableView.js';
import { DriveCertificateData } from './common/CertificateCard.js';

interface CitizenCertificatesViewProps {
  lang: Language;
  user: Profile | null;
  onBack?: () => void;
  onExploreDrives?: () => void;
}

export const CitizenCertificatesView: React.FC<CitizenCertificatesViewProps> = ({
  lang,
  user,
  onBack,
  onExploreDrives
}) => {
  const t = translations[lang];
  const [certificates, setCertificates] = useState<DriveCertificateData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyCertificates();
      if (res.success && Array.isArray(res.data)) {
        setCertificates(res.data);
      } else {
        setCertificates([]);
      }
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
      setError(err.message || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [user?.id]);

  const presentCerts = certificates.filter(c => c.attendance_status === 'present' || c.recipient_role === 'community_head');
  const totalImpactKg = certificates.reduce((acc, c) => {
    const m = (c.waste_cleared || '').match(/(\d+(\.\d+)?)/);
    return acc + (m ? parseFloat(m[1]) : 0);
  }, 0);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-3 sm:px-6 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#095c54] via-[#0d6e65] to-[#10b981] p-6 sm:p-8 text-white shadow-lg">
        {/* Decorative background circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute right-24 -bottom-16 w-56 h-56 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-black uppercase tracking-wider text-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Official NMC Civic Recognition</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {t.nav_certificates || 'My Verified Certificates'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed font-medium">
              Every certificate issued here is backed by real-time GPS metadata, official Ward Officer verification, and an ISO/IEC QR code scannable by anyone to confirm your civic contribution.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchCertificates}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl bg-white text-[#095c54] hover:bg-emerald-50 text-xs font-extrabold shadow-md transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 2. Highlight Metric Pills */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/20 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-emerald-200 block text-[10px] uppercase font-black tracking-wider">Total Certificates</span>
            <strong className="text-xl sm:text-2xl font-black text-white">{certificates.length}</strong>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-emerald-200 block text-[10px] uppercase font-black tracking-wider">Verified Participations</span>
            <strong className="text-xl sm:text-2xl font-black text-white">{presentCerts.length} Drives</strong>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
            <span className="text-emerald-200 block text-[10px] uppercase font-black tracking-wider">Estimated Waste Cleared</span>
            <strong className="text-xl sm:text-2xl font-black text-white">{totalImpactKg > 0 ? `${totalImpactKg} kg` : 'Active'}</strong>
          </div>
        </div>
      </div>

      {/* 3. Certificates Table / Cards View */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      <CertificatesTableView
        certificates={certificates}
        loading={loading}
        onRefresh={fetchCertificates}
        title="My Issued Certificates"
        subtitle="View, print high-resolution certificate copies, or download offline HTML files anytime."
        role="citizen"
      />
    </div>
  );
};
