import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Calendar,
  User,
  Users,
  Printer,
  Download,
  X,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Building2,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import {
  CertificateCard,
  DriveCertificateData,
  printCertificate,
  downloadCertificateHtml
} from './CertificateCard.js';

interface PublicCertificateVerificationModalProps {
  certificateCode: string;
  onClose: () => void;
}

export const PublicCertificateVerificationModal: React.FC<PublicCertificateVerificationModalProps> = ({
  certificateCode,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [certificate, setCertificate] = useState<DriveCertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullCertificate, setShowFullCertificate] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchCertificate = async () => {
    if (!certificateCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyCertificate(certificateCode);
      if (res.success && res.data) {
        setCertificate(res.data);
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
      } else {
        setError((res as any)?.error || 'Certificate not found or verification code is invalid.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to verification server. Please verify your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [certificateCode]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?verify_cert=${encodeURIComponent(certificateCode)}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (certificate) {
      printCertificate(certificate);
    }
  };

  const handleDownload = () => {
    if (certificate) {
      downloadCertificateHtml(certificate);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Municipal Seal Bar */}
        <div className="bg-gradient-to-r from-[#095c54] via-[#0b7066] to-[#10b981] p-4 sm:p-5 text-white flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-emerald-100">
                  Official Verification Portal
                </span>
                <span className="text-[10px] font-bold text-emerald-100">
                  Navsari Municipal Corporation
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black truncate mt-0.5">
                Swachh Bharat Cleanliness Certificate
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition shrink-0"
            aria-label="Close verification portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6 flex-1 overflow-y-auto max-h-[82vh]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-[#095c54] animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-[#0f2925]">
                Verifying Certificate Against Municipal Database...
              </p>
              <p className="text-xs text-slate-500 font-mono">{certificateCode}</p>
            </div>
          ) : error || !certificate ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-900">
                  Certificate Not Found or Unverified
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                  {error || 'No registered certificate was found matching code:'}
                </p>
                <div className="inline-block mt-2 font-mono text-xs font-black px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-700">
                  {certificateCode}
                </div>
              </div>

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={fetchCertificate}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Verification</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold"
                >
                  Return to Portal Home
                </button>
              </div>
            </div>
          ) : showFullCertificate ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#095c54]">
                  Full Certificate View
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullCertificate(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  &larr; Back to Verification Details
                </button>
              </div>
              <CertificateCard certificate={certificate} />
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in">
              {/* Authenticity Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-emerald-900 tracking-wide">
                      Authentic Municipal Certificate Verified
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black">
                      Official Record
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    This certificate is an official, tamper-proof record issued by Navsari Municipal Corporation under Swachh Bharat Mission (Urban).
                  </p>
                </div>
              </div>

              {/* Recipient Spotlight Card - Emphasizing Name */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-[#f0f7f5] border border-[#cde6df] text-center space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#095c54]">
                  This Cleanliness Award is Proudly Presented To
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight py-1">
                  {certificate.recipient_name}
                </h1>
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                  <span className="px-3 py-1 rounded-full font-black uppercase tracking-wider bg-white border border-[#cde6df] text-[#095c54] shadow-2xs">
                    {certificate.recipient_role === 'community_head'
                      ? 'Community Head & Civic Leader'
                      : 'Citizen Sanitation Volunteer'}
                  </span>
                  {certificate.community_name && (
                    <span className="px-3 py-1 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {certificate.community_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Drive Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Cleanliness Drive Event
                  </span>
                  <p className="text-xs font-black text-[#0f2925]">
                    {certificate.drive_title}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Ward &amp; Site Location
                  </span>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#095c54] shrink-0" />
                    <span>{certificate.location_name} · Ward {certificate.ward_number}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Verification Code
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-[#095c54]">
                      {certificate.certificate_code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-[10px] font-bold text-[#095c54] hover:underline"
                    >
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Attendance &amp; Verification
                  </span>
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {certificate.attendance_status === 'present'
                        ? 'Confirmed Present & Verified'
                        : certificate.recipient_role === 'community_head'
                        ? 'Lead Organizer Verified'
                        : 'Enrolled Participant'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Digital Signature & Issuance Authority */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Authorized Issuing Authority
                  </span>
                  <p className="text-xs font-extrabold text-[#0f2925]">
                    {certificate.issued_by_officer || `Ward ${certificate.ward_number} Officer`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Navsari Municipal Corporation · SBM Urban
                  </p>
                </div>

                {/* Ward Officer Digital Signature Preview */}
                <div className="text-right sm:text-right shrink-0">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Ward Officer Digital Signature
                  </span>
                  <div className="inline-block p-2 bg-[#f8faf9] rounded-xl border border-[#cde6df]">
                    {certificate.digital_signature ? (
                      <img
                        src={certificate.digital_signature}
                        alt="Ward Officer Digital Signature"
                        className="h-10 max-w-[140px] object-contain"
                      />
                    ) : (
                      <div className="font-serif italic font-bold text-[#095c54] text-sm px-3 py-1">
                        {certificate.issued_by_officer || 'Ward Officer'}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-emerald-700 block mt-0.5">
                    ✓ Cryptographically Validated
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowFullCertificate(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>View Framed Certificate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Download</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold"
                >
                  Close &amp; Enter Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
