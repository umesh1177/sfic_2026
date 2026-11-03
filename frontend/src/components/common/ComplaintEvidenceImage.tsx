import React, { useState } from 'react';
import { Droplets, ExternalLink, ImageOff, Leaf, Trash2, Wrench } from 'lucide-react';

interface ComplaintEvidenceImageProps {
  src?: string | null;
  alt: string;
  categoryName?: string;
  after?: boolean;
  className?: string;
  showIllustrativeNotice?: boolean;
}

const imageCredits: Record<string, { label: string; href: string }> = {
  '/images/complaints/open-dumping.jpg': {
    label: 'Mussi Katz (CC0)',
    href: 'https://commons.wikimedia.org/wiki/File:Quibdo_Garbage_dump.jpg'
  },
  '/images/complaints/overflowing-bin.jpg': {
    label: 'Public domain - Wikimedia',
    href: 'https://commons.wikimedia.org/wiki/File:Overflowing_Hamburg_street_garbage_bin.jpg'
  },
  '/images/complaints/open-drain.jpg': {
    label: 'Ibnali1 (CC BY-SA 4.0)',
    href: 'https://commons.wikimedia.org/wiki/File:Alajo_Storm_Drain_01.jpg'
  },
  '/images/complaints/shoreline-litter.jpg': {
    label: 'Unsplash license',
    href: 'https://unsplash.com/license'
  }
};

const getCategoryIcon = (categoryName = ''): React.ReactNode => {
  const category = categoryName.toLowerCase();
  if (/water|drain|sewage|flood/.test(category)) return <Droplets className="h-9 w-9 opacity-80" />;
  if (/tree|green|garden|plant/.test(category)) return <Leaf className="h-9 w-9 opacity-80" />;
  if (/road|street|pothole|construction/.test(category)) return <Wrench className="h-9 w-9 opacity-80" />;
  return <Trash2 className="h-9 w-9 opacity-80" />;
};

export const ComplaintEvidenceImage: React.FC<ComplaintEvidenceImageProps> = ({
  src,
  alt,
  categoryName,
  after = false,
  className = '',
  showIllustrativeNotice = false
}) => {
  const [unavailableSrc, setUnavailableSrc] = useState<string | null>(null);
  const unavailable = Boolean(src && unavailableSrc === src);
  const isIllustrative = Boolean(src && src.startsWith('/images/complaints/'));
  const imageCredit = src ? imageCredits[src] : undefined;

  if (src && !unavailable) {
    return (
      <div className="relative h-full w-full">
        <img
          src={src}
          alt={isIllustrative ? `${alt} (illustrative photo, not complaint evidence)` : alt}
          className={className}
          onError={() => setUnavailableSrc(src)}
        />
        {showIllustrativeNotice && isIllustrative && (
          <div className="absolute bottom-2 right-2 z-20 flex max-w-[95%] flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-slate-950/80 px-2 py-1 text-[9px] font-bold text-white shadow-sm">
            {/* <span>Illustrative - not report evidence</span>
            {imageCredit && (
              <a
                href={imageCredit.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Image credit: ${imageCredit.label}`}
                title={imageCredit.label}
                onClick={event => event.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded p-0.5 underline decoration-white/50 underline-offset-2 hover:bg-white/20"
              >
                <ExternalLink className="h-3 w-3" />
                <span>{imageCredit.label}</span>
              </a>
            )} */}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e6f4f1] to-slate-100 text-[#095c54] ${className}`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {unavailable || after ? (
          <ImageOff className="h-8 w-8 opacity-70" />
        ) : (
          getCategoryIcon(categoryName)
        )}
        <span className="text-[10px] font-bold text-slate-500">
          {unavailable ? 'Image unavailable' : after ? 'No resolution photo available' : categoryName || 'Complaint photo'}
        </span>
      </div>
    </div>
  );
};
