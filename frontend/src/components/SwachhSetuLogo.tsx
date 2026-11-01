import React from 'react';

interface SwachhSetuLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
}

export const SwachhSetuIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Rich emerald-to-mint gradient */}
        <linearGradient id="setuGradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#095c54" />
          <stop offset="50%" stopColor="#0d6e65" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        <linearGradient id="goldSun" x1="24" y1="6" x2="24" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        <linearGradient id="leafGrad" x1="16" y1="12" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Outer rounded squircle background */}
      <rect width="48" height="48" rx="14" fill="url(#setuGradient)" />

      {/* Decorative subtle civic ring */}
      <circle cx="24" cy="24" r="19" stroke="white" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 2" />

      {/* Rising Sun of Purity / Swachhata */}
      <circle cx="24" cy="14" r="3.5" fill="url(#goldSun)" />
      <path d="M24 7V9" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19.5 9.5L20.8 10.8" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28.5 9.5L27.2 10.8" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />

      {/* The Setu (Arching Civic Bridge) */}
      <path
        d="M9 35C15 26 33 26 39 35"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Bridge Deck & Railing */}
      <path
        d="M11 36H37"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* Suspension / Pillar Cables */}
      <line x1="18" y1="28.5" x2="18" y2="35" stroke="white" strokeWidth="1.2" strokeOpacity="0.8" />
      <line x1="24" y1="26" x2="24" y2="35" stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
      <line x1="30" y1="28.5" x2="30" y2="35" stroke="white" strokeWidth="1.2" strokeOpacity="0.8" />

      {/* Twin Swachhata Leaves above bridge */}
      <path
        d="M24 23C20 18 20 13 24 12C28 13 28 18 24 23Z"
        fill="white"
        fillOpacity="0.92"
      />
      <path
        d="M24 14V22"
        stroke="#0d6e65"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Ripple / Clean Wave below bridge */}
      <path
        d="M14 40C18 39 21 41 24 40C27 39 30 41 34 40"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
    </svg>
  );
};

export const SwachhSetuLogo: React.FC<SwachhSetuLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  light = false
}) => {
  const iconSizes = {
    sm: 30,
    md: 40,
    lg: 48,
    xl: 56
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className="relative shrink-0 transform transition hover:scale-105 duration-200">
        <SwachhSetuIcon size={iconSizes[size]} />
      </div>

      {showText && (
        <div className="leading-tight min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-tight ${textSizes[size]} ${
                light ? 'text-white' : 'text-[#095c54]'
              }`}
            >
              Swachh Setu
            </span>
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                light
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-[#e6f4f1] text-[#047857] border border-[#a7f3d0]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              NMC
            </span>
          </div>
          <p
            className={`text-[10px] font-bold tracking-tight truncate ${
              light ? 'text-white/80' : 'text-[#64748b]'
            }`}
          >
            Navsari Municipal Cleanliness Portal
          </p>
        </div>
      )}
    </div>
  );
};

