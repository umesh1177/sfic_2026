import React from 'react';
import {
  Award,
  X,
  Printer,
  ShieldCheck,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { DriveCompletionCertificate } from '../types/index.js';

interface CompletionCertificateModalProps {
  certificate: DriveCompletionCertificate;
  onClose: () => void;
}

export const CompletionCertificateModal: React.FC<CompletionCertificateModalProps> = ({
  certificate,
  onClose
}) => {
  const isCommunity = certificate.recipient_type === 'community';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-emerald-200 overflow-hidden my-6">
        {/* Top Controls Bar */}
        <div className="bg-[#095c54] text-white px-5 py-3 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 text-xs font-black tracking-wide">
            <Award className="w-4 h-4 text-amber-300" />
            <span>Official NMC Completion Certificate</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ceremonial Certificate Canvas */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-[#fdfef9] via-white to-[#f0fdf4]">
          <div className="border-4 border-double border-[#095c54]/50 rounded-2xl p-6 sm:p-8 relative bg-white/95 shadow-inner space-y-5 text-center">
            {/* Corner Ornament Accent */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
              <span>CERT NO: {certificate.certificate_id}</span>
              <span>SWACHH SETU · NAVSARI</span>
            </div>

            {/* Emblem & Header */}
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#095c54] to-emerald-600 text-amber-300 flex items-center justify-center shadow-lg ring-4 ring-amber-100">
                <Award className="w-9 h-9" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#095c54]">
                Navsari Municipal Corporation (NMC)
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
                {isCommunity ? 'Certificate of Civic Partnership' : 'Certificate of Appreciation'}
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                Cleanliness Drive Completion Award
              </p>
            </div>

            {/* Recipient Block */}
            <div className="py-3 space-y-1.5">
              <p className="text-xs text-slate-500 font-medium italic">
                This official municipal certificate is proudly presented to
              </p>
              <p className="text-2xl sm:text-3xl font-black text-[#095c54] border-b-2 border-amber-300/80 inline-block px-6 pb-1">
                {certificate.recipient_name}
              </p>
              <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto leading-relaxed pt-2">
                {isCommunity
                  ? 'in recognition of exemplary community leadership, volunteer mobilization, and successful execution of the cleanliness drive:'
                  : 'in recognition of active civic participation, voluntary service, and valuable contribution toward a cleaner Navsari during the cleanliness drive:'}
              </p>
            </div>

            {/* Drive Highlight Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-left max-w-lg mx-auto">
              <h3 className="text-sm sm:text-base font-black text-[#0f2925] text-center">
                &ldquo;{certificate.drive_title}&rdquo;
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600 font-bold">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                  {certificate.location_name} ({certificate.ward_name})
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
                  {new Date(certificate.completed_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {certificate.communities_involved && certificate.communities_involved.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/80 text-center space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Participating Communities
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {certificate.communities_involved.map((cName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-emerald-200 text-[11px] font-extrabold text-[#095c54]"
                      >
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        {cName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Points Awarded Highlight */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-black text-xs shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>
                +{certificate.points_awarded}{' '}
                {isCommunity ? 'Community Impact Points Awarded' : 'Civic Karma Points Awarded'}
              </span>
            </div>

            {/* Signature Footer */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 items-end text-xs">
              <div className="text-left">
                <p className="font-black text-[#0f2925]">{certificate.issued_by}</p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Ward {certificate.ward_number} Officer · NMC
                </p>
                <p className="text-[10px] text-slate-400">
                  Issued: {new Date(certificate.issued_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Digitally Verified</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Official Swachh Setu Record
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

