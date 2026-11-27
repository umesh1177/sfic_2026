import React, { useMemo, useRef, useState } from 'react';
import { Award, CheckCircle2, Copy, Download, Printer, ShieldCheck, Check, MapPin, Calendar } from 'lucide-react';

// =============================================================================
// Compact, Zero-Dependency Real ISO/IEC 18004 QR Code Encoder (Byte Mode, EC-L)
// Generates crisp, genuinely camera-scannable SVG QR codes offline.
// =============================================================================
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) {
      res[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return res;
}

// Version specs (Version 1..6, EC Level L, 1 block for v1..v5, 2 blocks for v6)
const QR_VERSIONS = [
  { ver: 1, size: 21, dataBytes: 19, ecBytes: 7, align: [] as number[] },
  { ver: 2, size: 25, dataBytes: 34, ecBytes: 10, align: [6, 18] },
  { ver: 3, size: 29, dataBytes: 55, ecBytes: 15, align: [6, 22] },
  { ver: 4, size: 33, dataBytes: 80, ecBytes: 20, align: [6, 26] },
  { ver: 5, size: 37, dataBytes: 108, ecBytes: 26, align: [6, 30] },
];

function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text.slice(0, 104));
  const spec = QR_VERSIONS.find(v => bytes.length + 2 <= v.dataBytes) || QR_VERSIONS[QR_VERSIONS.length - 1];
  const { size, dataBytes, ecBytes, align } = spec;

  // Build bit buffer: Mode 0100 (Byte), 8-bit length, payload, terminator, pad bytes
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  const maxBits = dataBytes * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  let padToggle = true;
  while (bits.length < maxBits) {
    pushBits(padToggle ? 0xec : 0x11, 8);
    padToggle = !padToggle;
  }

  const data = new Uint8Array(dataBytes);
  for (let i = 0; i < dataBytes; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
    data[i] = v;
  }
  const ec = rsEncode(data, ecBytes);
  const full = new Uint8Array(dataBytes + ecBytes);
  full.set(data, 0);
  full.set(ec, dataBytes);

  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunc = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val;
      isFunc[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunc(r0 + r, c0 + c, inside && (border || core));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment pattern
  if (align.length >= 2) {
    const ar = align[align.length - 1];
    const ac = align[align.length - 1];
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const val = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        setFunc(ar + r, ac + c, val);
      }
    }
  }

  // Reserve format info areas & dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = size - 8; i < size; i++) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(size - 8, 8, true);

  // Place data bits in zigzag columns with Mask 0 ((r + c) % 2 === 0)
  let bitIdx = 0;
  const totalBits = full.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const c = right - dx;
        if (!isFunc[r][c]) {
          let bit = false;
          if (bitIdx < totalBits) {
            bit = ((full[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Mask 0: invert if (r + c) % 2 === 0
          modules[r][c] = ((r + c) % 2 === 0) ? !bit : bit;
        }
      }
    }
    upward = !upward;
  }

  // Format information for EC Level L (01) + Mask 0 (000) => precomputed 15-bit BCH + XOR mask = 0x77c4
  const formatBits = 0x77c4;
  for (let i = 0; i <= 5; i++) modules[8][i] = ((formatBits >> (14 - i)) & 1) === 1;
  modules[8][7] = ((formatBits >> 8) & 1) === 1;
  modules[8][8] = ((formatBits >> 7) & 1) === 1;
  modules[7][8] = ((formatBits >> 6) & 1) === 1;
  for (let i = 9; i < 15; i++) modules[14 - i][8] = ((formatBits >> (14 - i)) & 1) === 1;

  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = ((formatBits >> i) & 1) === 1;
  for (let i = 0; i < 7; i++) modules[size - 7 + i][8] = ((formatBits >> (14 - i)) & 1) === 1;

  return modules;
}

function buildQrSvgMarkup(value: string, size: number = 116): string {
  const matrix = generateQrMatrix(value);
  const n = matrix.length;
  const quiet = 2;
  const viewBoxSize = n + quiet * 2;
  const rects: string[] = [
    `<rect x="0" y="0" width="${viewBoxSize}" height="${viewBoxSize}" fill="#ffffff"/>`
  ];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        rects.push(`<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1" fill="#0f2925"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges" style="display:block;margin:0 auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${rects.join('')}</svg>`;
}

export const QrCodeSvg: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 112,
  className = ''
}) => {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);
  const n = matrix.length;
  const quiet = 2;
  const viewBoxSize = n + quiet * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      data-qr-code="true"
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className={className}
      aria-label={`Verification QR Code for ${value}`}
    >
      <rect x={0} y={0} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect key={`${r}-${c}`} x={c + quiet} y={r + quiet} width={1} height={1} fill="#0f2925" />
          ) : null
        )
      )}
    </svg>
  );
};

export interface DriveCertificateData {
  id: string;
  certificate_code: string;
  activity_id: string;
  drive_title: string;
  community_name?: string;
  ward_number?: number;
  ward_name?: string;
  drive_date?: string;
  location_name?: string;
  waste_cleared?: string;
  recipient_name: string;
  recipient_role: 'community_head' | 'citizen' | string;
  attendance_status?: 'present' | 'absent' | 'organizer_present' | string;
  issued_by_officer?: string;
  digital_signature?: string;
  signature_image?: string;
  verification_url?: string;
  issued_at?: string;
}

export function buildCertificatePrintHtml(certificate: DriveCertificateData, autoPrint: boolean = true): string {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:5173';
  const verifyUrl = `${origin}/?verify_cert=${encodeURIComponent(certificate.certificate_code)}`;

  const qrSvgMarkup = buildQrSvgMarkup(verifyUrl, 120);
  const isLeader = certificate.recipient_role === 'community_head';
  const isAbsent = certificate.attendance_status === 'absent';
  const issuedDateFormatted = certificate.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '2026';

  const attendanceBadgeHtml = isAbsent
    ? `<div style="display:inline-block;padding:5px 14px;background:#fee2e2;border:1.5px solid #ef4444;border-radius:999px;color:#991b1b;font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:6px auto 14px;">Official Attendance: ABSENT (Did Not Attend Field Drive)</div>`
    : isLeader
    ? `<div style="display:inline-block;padding:5px 14px;background:#fef3c7;border:1.5px solid #f59e0b;border-radius:999px;color:#92400e;font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:6px auto 14px;">Civic Leadership: ORGANIZER (PRESENT)</div>`
    : `<div style="display:inline-block;padding:5px 14px;background:#d1fae5;border:1.5px solid #10b981;border-radius:999px;color:#065f46;font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:6px auto 14px;">Official Attendance: PRESENT (Verified Field Volunteer)</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>NMC Certificate - ${certificate.certificate_code}</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
      body { margin: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 24px; }
      .actions-bar { width: 100%; max-width: 900px; margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px; }
      .btn { background: #095c54; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
      .btn:hover { background: #074741; }
      .cert-wrap { width: 100%; max-width: 900px; background: #ffffff; border: 8px double #095c54; border-radius: 20px; padding: 36px 44px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d1fae5; padding-bottom: 14px; }
      .org { color: #095c54; font-weight: 900; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; }
      .sub { color: #64748b; font-size: 11px; margin-top: 2px; }
      .title { text-align: center; margin: 24px 0 8px; font-size: 28px; font-weight: 900; color: #0f2925; letter-spacing: 1px; text-transform: uppercase; }
      .subtitle { text-align: center; font-size: 12px; font-weight: 700; color: #095c54; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px; }
      .present { text-align: center; font-size: 13px; color: #475569; }
      .name { text-align: center; font-size: 30px; font-weight: 900; color: #095c54; margin: 8px 0 10px; border-bottom: 2px solid #f59e0b; display: inline-block; padding: 0 24px 6px; }
      .name-wrap { text-align: center; }
      .body { text-align: center; font-size: 14px; color: #334155; line-height: 1.7; max-width: 720px; margin: 12px auto 24px; }
      .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 18px; gap: 16px; }
      .sig-line { border-top: 1.5px solid #0f2925; width: 210px; margin-bottom: 6px; }
      .sig-name { font-weight: 800; font-size: 13px; color: #0f2925; }
      .sig-role { font-size: 11px; color: #64748b; }
      .qr-box { text-align: center; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8faf9; }
      .code { font-family: monospace; font-size: 11px; font-weight: 800; color: #095c54; margin-top: 6px; }
      .scan-hint { font-size: 10px; color: #64748b; margin-top: 2px; }
      @media print {
        body { background: #ffffff; padding: 0; }
        .actions-bar { display: none !important; }
        .cert-wrap { box-shadow: none; border: 8px double #095c54; }
      }
    </style>
  </head>
  <body>
    <div class="actions-bar">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
    <div class="cert-wrap">
      <div class="top">
        <div>
          <div class="org">Navsari Municipal Corporation · SwachhSetu</div>
          <div class="sub">Official Digital Swachhata Recognition Certificate</div>
        </div>
        <div style="text-align:right">
          <div class="code" style="margin-top:0">${certificate.certificate_code}</div>
          <div class="sub">Ward ${certificate.ward_number || 3} · Navsari, Gujarat</div>
        </div>
      </div>
      <div class="title">Certificate of ${isLeader ? 'Civic Leadership' : 'Cleanliness Participation'}</div>
      <div class="subtitle">${isLeader ? 'Community Organization Excellence Award' : 'Swachh Navsari Volunteer Honour'}</div>
      <div class="present">This official municipal certificate is proudly presented to</div>
      <div class="name-wrap"><div class="name">${certificate.recipient_name}</div></div>
      <div style="text-align:center;">${attendanceBadgeHtml}</div>
      <div class="body">
        ${isLeader
          ? `Head of <strong>${certificate.community_name || 'Community Organization'}</strong>, in recognition of outstanding civic leadership in organizing and successfully completing the municipal cleanliness drive <strong>"${certificate.drive_title}"</strong>`
          : isAbsent
          ? `in recognition of registered volunteer enrolment with <strong>${certificate.community_name || 'Community Action Team'}</strong> for the municipal cleanliness drive <strong>"${certificate.drive_title}"</strong> (Official Attendance Recorded: <strong>ABSENT</strong>)`
          : `in grateful appreciation of active volunteer participation with <strong>${certificate.community_name || 'Community Action Team'}</strong> during the municipal cleanliness drive <strong>"${certificate.drive_title}"</strong>`}
        at <strong>${certificate.location_name || certificate.ward_name || 'Navsari'}</strong> on <strong>${certificate.drive_date || '2026'}</strong>.
        ${certificate.waste_cleared ? `<br/>Verified Impact: <strong>${certificate.waste_cleared}</strong>` : ''}
      </div>
      <div class="footer">
        <div>
          ${certificate.digital_signature ? `
            <div style="margin-bottom: 4px;">
              <img src="${certificate.digital_signature}" alt="Digital Signature" style="max-height: 48px; max-width: 170px; object-fit: contain;" />
            </div>
          ` : ''}
          <div class="sig-line"></div>
          <div class="sig-name">${certificate.issued_by_officer || 'Ward Sanitary Officer'}</div>
          <div class="sig-role">Ward ${certificate.ward_number || 3} Officer · Navsari Municipal Corporation</div>
          <div style="font-size: 10px; color: #10b981; font-weight: 800; margin-top: 3px;">✓ Digitally Signed &amp; QR Verified</div>
          <div class="sub" style="margin-top:2px;">Issued: ${issuedDateFormatted}</div>
        </div>
        <div class="qr-box">
          ${qrSvgMarkup}
          <div class="code">${certificate.certificate_code}</div>
          <div class="scan-hint">Scan QR to Verify Authenticity</div>
        </div>
      </div>
    </div>
    ${autoPrint ? `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 250);
      });
    </script>` : ''}
  </body>
</html>`;
}

export function printCertificate(certificate: DriveCertificateData): void {
  const html = buildCertificatePrintHtml(certificate, true);
  const win = window.open('', '_blank', 'width=980,height=740');
  if (!win) {
    alert('Please allow popups to print certificate.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function downloadCertificateHtml(certificate: DriveCertificateData): void {
  const html = buildCertificatePrintHtml(certificate, false);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NMC_Certificate_${certificate.certificate_code || 'Drive'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const CertificateCard: React.FC<{ certificate: DriveCertificateData; compact?: boolean }> = ({
  certificate,
  compact = false
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:5173';
  const verifyUrl = `${origin}/?verify_cert=${encodeURIComponent(certificate.certificate_code)}`;

  const isLeader = certificate.recipient_role === 'community_head';

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(certificate.certificate_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printCertificate(certificate);
  };

  return (
    <div className="space-y-3">
      {/* Ceremonial Certificate Canvas */}
      <div
        ref={certRef}
        className={`relative bg-white rounded-2xl border-4 border-double border-[#095c54] shadow-md overflow-hidden ${
          compact ? 'p-3.5 sm:p-5' : 'p-4 sm:p-8'
        }`}
      >
        {/* Subtle Gold & Teal Decorative Corner Accents */}
        <div className="pointer-events-none absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-[#095c54]/10 to-transparent rounded-br-full" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-28 h-28 bg-gradient-to-tl from-amber-500/10 to-transparent rounded-tl-full" />

        <div className="relative space-y-5">
          {/* Top Official Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#095c54] text-amber-300 flex items-center justify-center shadow-xs shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#095c54]">
                  Navsari Municipal Corporation · SwachhSetu
                </p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Official Digitally Verified Swachhata Certificate
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#095c54] border border-emerald-200 font-mono text-[11px] font-extrabold">
                {certificate.certificate_code}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
          </div>

          {/* Center Title & Recipient */}
          <div className="text-center space-y-2 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">
              {isLeader ? 'Community Leadership Excellence' : 'Swachh Navsari Volunteer Honour'}
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight uppercase">
              Certificate of {isLeader ? 'Civic Leadership' : 'Participation'}
            </h3>
            <p className="text-xs text-slate-500 font-medium pt-1">
              This certificate is proudly presented to
            </p>
            <div className="inline-block border-b-2 border-amber-400 px-6 pb-1.5 pt-0.5">
              <p className="text-2xl sm:text-3xl font-black text-[#095c54] tracking-tight">
                {certificate.recipient_name}
              </p>
            </div>

            {/* Official Attendance Status Stamped Badge */}
            <div className="pt-1.5 flex justify-center">
              {certificate.attendance_status === 'absent' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Official Record: ABSENT (Did Not Attend)
                </span>
              ) : isLeader ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Civic Leadership: ORGANIZER (PRESENT)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Official Attendance: PRESENT (Verified Field Volunteer)
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto pt-2">
              {isLeader ? (
                <>
                  representing <strong className="text-[#0f2925]">{certificate.community_name || 'Community Organization'}</strong>, for exemplary civic leadership in organizing and successfully completing the municipal cleanliness drive{' '}
                  <strong className="text-[#095c54]">"{certificate.drive_title}"</strong>.
                </>
              ) : certificate.attendance_status === 'absent' ? (
                <>
                  in recognition of registered volunteer enrolment with{' '}
                  <strong className="text-[#0f2925]">{certificate.community_name || 'Community Action Team'}</strong> for the municipal cleanliness drive{' '}
                  <strong className="text-[#095c54]">"{certificate.drive_title}"</strong> (Official Attendance Recorded: <strong className="text-rose-700">ABSENT</strong>).
                </>
              ) : (
                <>
                  in sincere appreciation of active volunteer contribution with{' '}
                  <strong className="text-[#0f2925]">{certificate.community_name || 'Community Action Team'}</strong> during the municipal cleanliness drive{' '}
                  <strong className="text-[#095c54]">"{certificate.drive_title}"</strong>.
                </>
              )}
            </p>
          </div>

          {/* Drive Metadata Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
              Ward {certificate.ward_number || 3} · {certificate.location_name || certificate.ward_name || 'Navsari'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#095c54]" />
              Drive Date: {certificate.drive_date || '2026'}
            </span>
            {certificate.waste_cleared && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Impact: {certificate.waste_cleared}
              </span>
            )}
          </div>

          {/* Bottom Signature & Real Scannable Unique QR Code */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              {certificate.digital_signature && (
                <div className="mb-1.5 flex justify-center sm:justify-start">
                  <img
                    src={certificate.digital_signature}
                    alt="Ward Officer Digital Signature"
                    className="max-h-12 max-w-[160px] object-contain"
                  />
                </div>
              )}
              <div className="w-44 border-b border-slate-400 mb-1.5 mx-auto sm:mx-0" />
              <p className="text-xs font-extrabold text-[#0f2925]">
                {certificate.issued_by_officer || 'Ward Sanitary Officer'}
              </p>
              <p className="text-[11px] text-slate-500">
                Ward {certificate.ward_number || 3} Officer · Navsari Municipal Corporation
              </p>
              <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Digitally Signed &amp; QR Verified</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Issued: {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-[#f7f9f8] border border-slate-200 max-w-full">
              <div className="p-1.5 bg-white rounded-lg border border-slate-200 shrink-0">
                <QrCodeSvg value={verifyUrl} size={compact ? 72 : 84} />
              </div>
              <div className="text-left space-y-1 min-w-0 max-w-[165px]">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#095c54] block">
                  QR Certificate Verification
                </span>
                <p className="font-mono text-[11px] font-bold text-[#0f2925] break-all">
                  {certificate.certificate_code}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Scan QR or verify code on NMC SwachhSetu portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Print / Download & Copy Verification Code */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleCopyCode}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Code Copied!' : 'Copy ID'}</span>
        </button>
        <button
          type="button"
          onClick={() => downloadCertificateHtml(certificate)}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          title="Download standalone HTML certificate"
        >
          <Download className="w-3.5 h-3.5 text-[#095c54]" />
          <span>Download</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>
  );
};
