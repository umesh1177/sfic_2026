import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  Globe,
  MoreHorizontal,
  Sparkles,
  Download,
  X,
  Share2,
  Heart,
  Smile,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DriveCertificateData, QrCodeSvg, printCertificate, downloadCertificateHtml } from './CertificateCard.js';

interface LinkedInCertificateShareModalProps {
  certificate: DriveCertificateData;
  onClose: () => void;
  onOpenFullCertificate?: () => void;
}

export const LinkedInCertificateShareModal: React.FC<LinkedInCertificateShareModalProps> = ({
  certificate,
  onClose,
  onOpenFullCertificate
}) => {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:5173';
  const verifyUrl = `${origin}/?verify_cert=${encodeURIComponent(certificate.certificate_code)}`;

  const defaultPostText = `🎉 Proud to share that I have received an official Certificate of Appreciation from the Navsari Municipal Corporation (NMC) under the Swachh Bharat Mission (Urban)! 🌿🧹

I had the privilege of actively participating in the "${certificate.drive_title}" cleanliness drive at ${certificate.location_name || 'Navsari'}, Ward ${certificate.ward_number || 3}.

Together with our civic authorities and community members, we took active responsibility for our locality's hygiene and public cleanliness. Every small initiative creates a cleaner, greener, and healthier city for all! 🇮🇳✨

📜 Verification ID: ${certificate.certificate_code}
🔗 Verify Official Document: ${verifyUrl}

#SwachhBharat #CleanNavsari #CivicEngagement #Sustainability #CommunityImpact #NavsariMunicipalCorporation #ProudCitizen`;

  const [postText, setPostText] = useState(defaultPostText);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(48);

  const handleToggleLike = () => {
    setLiked(prev => !prev);
    setLikeCount(prev => (liked ? prev - 1 : prev + 1));
  };

  const handleCopyPost = () => {
    navigator.clipboard?.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShareToLinkedIn = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
    window.open(shareUrl, '_blank', 'width=620,height=600');
  };

  const handleShareToWhatsApp = () => {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(postText)}`;
    window.open(waUrl, '_blank');
  };

  const handleShareToTwitter = () => {
    const text = `Honoured to receive an official Certificate of Appreciation from Navsari Municipal Corporation for "${certificate.drive_title}"! 🌿🧹 #SwachhBharat`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(verifyUrl)}`;
    window.open(twUrl, '_blank', 'width=600,height=500');
  };

  // Generate user initials for avatar
  const initials = (certificate.recipient_name || 'Citizen')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  const isLeader = certificate.recipient_role === 'community_head';

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#f3f2ef] rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto flex flex-col max-h-[94vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header: LinkedIn Brand Bar */}
        <div className="bg-[#0a66c2] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-[#0a66c2] font-black text-lg flex items-center justify-center shadow-xs select-none">
              in
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-none flex items-center gap-2">
                <span>LinkedIn Post Preview</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                  Live Preview
                </span>
              </h2>
              <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                Share your certified civic milestone with your professional network
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
            aria-label="Close post preview modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4">
          {/* Main LinkedIn Feed Post Card */}
          <div className="bg-white rounded-2xl border border-slate-300/80 shadow-xs overflow-hidden">
            {/* 1. LinkedIn Post Author Header */}
            <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Profile Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#095c54] to-[#10b981] text-white font-black text-base flex items-center justify-center shrink-0 ring-2 ring-emerald-100 shadow-xs select-none">
                  {initials}
                </div>

                {/* Profile Name & Professional Headline */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-[#0f2925] text-sm hover:text-[#0a66c2] hover:underline cursor-pointer truncate">
                      {certificate.recipient_name}
                    </h3>
                    <span className="text-slate-400 text-xs">• 1st</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                    {isLeader
                      ? `Civic Leader & Head · ${certificate.community_name || 'Community Organization'}`
                      : `Active Citizen Volunteer · Swachh Bharat Mission (Urban)`}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>Just now</span>
                    <span>•</span>
                    <Globe className="w-3 h-3 text-slate-500" />
                  </p>
                </div>
              </div>

              {/* Three dots / action menu */}
              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingCaption(prev => !prev)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition text-xs font-bold flex items-center gap-1"
                  title="Edit post caption"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isEditingCaption ? 'Done' : 'Edit'}</span>
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. LinkedIn Post Body Text */}
            <div className="px-4 sm:px-5 pb-3">
              {isEditingCaption ? (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-blue-300 focus:border-[#0a66c2] outline-none text-xs text-slate-800 font-sans leading-relaxed bg-blue-50/20"
                    placeholder="Write your LinkedIn caption..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Markdown/emojis supported</span>
                    <button
                      type="button"
                      onClick={() => setPostText(defaultPostText)}
                      className="text-[#0a66c2] hover:underline font-bold"
                    >
                      Reset Default Caption
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line font-sans">
                  {postText}
                </p>
              )}
            </div>

            {/* 3. Embedded Certificate Card Attachment (LinkedIn Media Asset) */}
            <div className="mx-3 sm:mx-5 mb-3 rounded-2xl border-2 border-[#cde6df] bg-gradient-to-b from-[#f7fbf9] to-white p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
              {/* Top Watermark Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[#d8ece6] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center shrink-0">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#095c54] block leading-none">
                      Navsari Municipal Corporation
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                      Swachh Bharat Mission (Urban) · Government of Gujarat
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-black uppercase">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  QR-Verified
                </span>
              </div>

              {/* Certificate Inner Card */}
              <div className="bg-white rounded-xl border border-amber-200/80 p-3 sm:p-4 space-y-2.5 shadow-2xs">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                    Certificate of {isLeader ? 'Civic Leadership' : 'Civic Participation'}
                  </p>
                  <p className="text-xs text-slate-500">This official award is presented to</p>
                  <h4 className="text-lg sm:text-xl font-black text-[#095c54] tracking-tight">
                    {certificate.recipient_name}
                  </h4>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                    {certificate.attendance_status === 'absent'
                      ? 'Registered Participant'
                      : '✓ Verified Present & Completed'}
                  </div>
                </div>

                <p className="text-xs text-slate-600 text-center leading-relaxed">
                  for outstanding civic contribution in the cleanliness drive{' '}
                  <strong className="text-[#0f2925]">"{certificate.drive_title}"</strong> at{' '}
                  <span className="text-[#095c54] font-bold">{certificate.location_name || 'Navsari'}</span> (Ward {certificate.ward_number || 3}).
                </p>

                {/* Footer Details: QR Code + Digital Signature */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  {/* Left: Scannable QR Code */}
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <QrCodeSvg value={verifyUrl} size={54} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono font-bold text-[#095c54] bg-[#f0f7f5] px-1.5 py-0.5 rounded block">
                        {certificate.certificate_code}
                      </span>
                      <span className="text-[8px] text-slate-400 block">
                        Scan QR to verify authentic record
                      </span>
                    </div>
                  </div>

                  {/* Right: Ward Officer Digital Signature */}
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">
                      Issuing Authority
                    </span>
                    <div className="inline-block py-0.5">
                      {certificate.digital_signature ? (
                        <img
                          src={certificate.digital_signature}
                          alt="Ward Officer Signature"
                          className="h-7 max-w-[100px] object-contain ml-auto"
                        />
                      ) : (
                        <span className="font-serif italic font-bold text-xs text-[#095c54] block">
                          {certificate.issued_by_officer || `Ward ${certificate.ward_number || 3} Officer`}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-extrabold text-slate-700 block">
                      Ward {certificate.ward_number || 3} Officer · NMC
                    </span>
                  </div>
                </div>
              </div>

              {/* Media URL Banner at bottom of preview */}
              <div className="mt-2.5 pt-2 border-t border-[#d8ece6] flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold truncate">
                  swachhsetu.navsari.gov.in · Official Verification Portal
                </span>
                <span className="font-bold text-[#0a66c2] hover:underline cursor-pointer shrink-0">
                  Verify &rarr;
                </span>
              </div>
            </div>

            {/* 4. LinkedIn Social Reaction Counts */}
            <div className="px-4 sm:px-5 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -space-x-1">
                  <span className="w-4 h-4 rounded-full bg-[#0a66c2] text-white flex items-center justify-center text-[9px] shadow-2xs">
                    👍
                  </span>
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-2xs">
                    👏
                  </span>
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] shadow-2xs">
                    ❤️
                  </span>
                </div>
                <span className="font-medium text-slate-600">{likeCount}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-500">
                <span>14 comments</span>
                <span>•</span>
                <span>8 reposts</span>
              </div>
            </div>

            {/* 5. LinkedIn Action Bar (Like, Comment, Repost, Send) */}
            <div className="px-2 sm:px-4 py-1.5 border-t border-slate-100 grid grid-cols-4 gap-1 text-slate-600 text-xs font-bold">
              <button
                type="button"
                onClick={handleToggleLike}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                  liked
                    ? 'text-[#0a66c2] font-black bg-blue-50/70'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-[#0a66c2]' : ''}`} />
                <span className="hidden sm:inline">Like</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingCaption(prev => !prev)}
                className="py-2 rounded-xl hover:bg-slate-100 flex items-center justify-center gap-1.5 transition text-slate-600"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Comment</span>
              </button>

              <button
                type="button"
                onClick={handleShareToLinkedIn}
                className="py-2 rounded-xl hover:bg-slate-100 flex items-center justify-center gap-1.5 transition text-slate-600"
              >
                <Repeat2 className="w-4 h-4" />
                <span className="hidden sm:inline">Repost</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPost}
                className="py-2 rounded-xl hover:bg-slate-100 flex items-center justify-center gap-1.5 transition text-slate-600"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>

          {/* Social Platform Quick Share Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-300/80 shadow-xs space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Share Direct to Your Social Networks
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* LinkedIn Button */}
              <button
                type="button"
                onClick={handleShareToLinkedIn}
                className="px-4 py-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <div className="w-4 h-4 rounded bg-white text-[#0a66c2] font-black text-[10px] flex items-center justify-center">
                  in
                </div>
                <span>Share on LinkedIn</span>
              </button>

              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="px-4 py-2.5 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </button>

              {/* Twitter / X Button */}
              <button
                type="button"
                onClick={handleShareToTwitter}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <span className="font-black text-sm">𝕏</span>
                <span>Share on X</span>
              </button>
            </div>

            {/* Copy Post Text & Link Toolbar */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyPost}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Caption & Link Copied!' : 'Copy Caption & Link'}</span>
                </button>

                {onOpenFullCertificate && (
                  <button
                    type="button"
                    onClick={onOpenFullCertificate}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition"
                  >
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>View Framed Certificate</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
