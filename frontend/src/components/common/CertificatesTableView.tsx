import React, { useState, useMemo } from 'react';
import {
  Award,
  Search,
  Eye,
  Printer,
  Download,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Calendar,
  X,
  RefreshCw,
  Sparkles,
  FileText,
  User,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CertificateCard,
  DriveCertificateData,
  printCertificate,
  downloadCertificateHtml
} from './CertificateCard.js';

interface CertificatesTableViewProps {
  certificates: DriveCertificateData[];
  loading?: boolean;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  role?: 'citizen' | 'community_head' | string;
}

export const CertificatesTableView: React.FC<CertificatesTableViewProps> = ({
  certificates = [],
  loading = false,
  onRefresh,
  title = 'Issued Cleanliness Drive Certificates',
  subtitle = 'Official digitally-verified certificates issued by Navsari Municipal Corporation for cleanliness drive participation and leadership.',
  role
}) => {
  const [search, setSearch] = useState('');
  const [selectedCert, setSelectedCert] = useState<DriveCertificateData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = (cert: DriveCertificateData) => {
    printCertificate(cert);
  };

  const handleDownload = (cert: DriveCertificateData) => {
    downloadCertificateHtml(cert);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const filteredCertificates = useMemo(() => {
    if (!search.trim()) return certificates;
    const q = search.toLowerCase().trim();
    return certificates.filter(c =>
      (c.certificate_code || '').toLowerCase().includes(q) ||
      (c.recipient_name || '').toLowerCase().includes(q) ||
      (c.drive_title || '').toLowerCase().includes(q) ||
      (c.community_name || '').toLowerCase().includes(q) ||
      (c.location_name || '').toLowerCase().includes(q)
    );
  }, [certificates, search]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{title}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#095c54] border border-emerald-200 text-xs font-black">
              {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code, drive, name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#095c54] outline-hidden transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              title="Refresh certificate list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Content: Table on Desktop, Cards on Mobile */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
          <RefreshCw className="w-8 h-8 text-[#095c54] animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading verified certificates...</p>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="p-10 sm:p-14 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-extrabold text-[#0f2925]">
            {search ? 'No Certificates Found' : 'No Certificates Issued Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {search
              ? `No certificate matched "${search}". Try searching for another name or code.`
              : 'Participate in NMC-approved community cleanliness drives! Once the Ward Officer inspects and verifies the drive, your official QR-verified certificate will be generated and listed here.'}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md and up) */}
          <div className="hidden md:block bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8faf9] border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Certificate ID</th>
                    <th className="py-3.5 px-4">Cleanliness Drive / Event</th>
                    <th className="py-3.5 px-4">Recipient &amp; Community</th>
                    <th className="py-3.5 px-4">Issued On</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredCertificates.map((cert, idx) => {
                    const isLeader = cert.recipient_role === 'community_head';
                    return (
                      <tr
                        key={cert.id || cert.certificate_code || idx}
                        className="hover:bg-slate-50/80 transition duration-150"
                      >
                        {/* Index */}
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Certificate ID */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2 py-0.5 rounded-md text-[11px]">
                              {cert.certificate_code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(cert.certificate_code)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title="Copy Certificate ID"
                            >
                              {copiedId === cert.certificate_code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Cleanliness Drive Title & Details */}
                        <td className="py-4 px-4 max-w-xs">
                          <div className="space-y-1">
                            <p className="font-extrabold text-[#0f2925] text-xs leading-snug line-clamp-1">
                              {cert.drive_title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#095c54]" />
                                <span>Ward {cert.ward_number || 3} · {cert.location_name || cert.ward_name || 'Navsari'}</span>
                              </span>
                              {cert.drive_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{cert.drive_date}</span>
                                </span>
                              )}
                            </div>
                            {cert.waste_cleared && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                Impact: {cert.waste_cleared}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Recipient & Role */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <p className="font-bold text-[#0f2925] text-xs">
                              {cert.recipient_name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  isLeader
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-teal-50 text-[#095c54] border-teal-200'
                                }`}
                              >
                                {isLeader ? 'Community Head' : 'Citizen Volunteer'}
                              </span>
                              {cert.community_name && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {cert.community_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Issued Date & Officer */}
                        <td className="py-4 px-4 whitespace-nowrap text-[11px]">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 block">
                              {cert.issued_at
                                ? new Date(cert.issued_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : 'Today'}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                              {cert.issued_by_officer || 'Ward Officer'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified NMC</span>
                          </span>
                        </td>

                        {/* Actions (View, Print, Download) */}
                        <td className="py-4 px-4 text-right pr-6 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* View Option */}
                            <button
                              type="button"
                              onClick={() => setSelectedCert(cert)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                              title="View full certificate preview with QR code"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#095c54]" />
                              <span>View</span>
                            </button>

                            {/* Print Option */}
                            <button
                              type="button"
                              onClick={() => handlePrint(cert)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                              title="Print certificate or save as PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>

                            {/* Download Option */}
                            <button
                              type="button"
                              onClick={() => handleDownload(cert)}
                              className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1 transition shadow-2xs"
                              title="Download standalone HTML certificate"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE RESPONSIVE CARDS VIEW (< md screens) */}
          <div className="block md:hidden space-y-3">
            {filteredCertificates.map((cert, idx) => {
              const isLeader = cert.recipient_role === 'community_head';
              return (
                <div
                  key={cert.id || cert.certificate_code || idx}
                  className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-xs space-y-3"
                >
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2 py-0.5 rounded-md text-[11px]">
                        {cert.certificate_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(cert.certificate_code)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        {copiedId === cert.certificate_code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified NMC</span>
                    </span>
                  </div>

                  {/* Drive Info */}
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0f2925] leading-snug">
                      {cert.drive_title}
                    </h4>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      Presented to: <span className="text-[#095c54] font-black">{cert.recipient_name}</span>
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#095c54]" />
                        <span>Ward {cert.ward_number || 3} · {cert.location_name || cert.ward_name || 'Navsari'}</span>
                      </span>
                      {cert.drive_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{cert.drive_date}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar for Mobile (View, Print, Download) */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCert(cert)}
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#095c54]" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(cert)}
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(cert)}
                      className="py-2 px-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center justify-center gap-1 transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 3. Certificate View Dialog Modal */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#f8faf9] border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#095c54] text-amber-300 flex items-center justify-center shadow-2xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f2925]">
                    Official Digitally-Verified Certificate
                  </h3>
                  <p className="text-[11px] font-mono text-[#095c54] font-bold">
                    {selectedCert.certificate_code}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedCert.certificate_code)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition"
                  title="Copy Certificate ID"
                >
                  {copiedId === selectedCert.certificate_code ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedId === selectedCert.certificate_code ? 'Copied' : 'Copy ID'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded Certificate Card Canvas */}
            <div className="p-4 sm:p-6 bg-slate-50 max-h-[75vh] overflow-y-auto">
              <CertificateCard certificate={selectedCert} />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Verified Navsari Municipal Corporation Digital Credential
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(selectedCert)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(selectedCert)}
                  className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
