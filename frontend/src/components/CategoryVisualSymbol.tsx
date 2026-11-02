import React from 'react';

export interface CategoryVisualSymbolProps {
  categoryId?: string;
  categoryName?: string;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCheckBadge?: boolean;
}

/**
 * Returns a high-fidelity visual SVG illustration matching the Gujarat civic complaint
 * category symbols (circular illustrated badge with high contrast for citizens).
 */
export const CategoryVisualSymbol: React.FC<CategoryVisualSymbolProps> = ({
  categoryId = '',
  categoryName = '',
  isSelected = false,
  size = 'md',
  className = '',
  showCheckBadge = true
}) => {
  const normId = (categoryId || '').toLowerCase();
  const normName = (categoryName || '').toLowerCase();

  // Determine category key
  const isDustbin = normId === 'cat-03' || normName.includes('dustbin') || normName.includes('bin') || normName.includes('કચરાપેટી') || normName.includes('कूड़ेदान');
  const isDrainage = normId === 'cat-05' || normName.includes('drain') || normName.includes('gutter') || normName.includes('sewage') || normName.includes('નાલી') || normName.includes('ગટર');
  const isDump = normId === 'cat-02' || normName.includes('dump') || normName.includes('heap') || normName.includes('ઢગલો') || normName.includes('ढेर');
  const isRoadLitter = normId === 'cat-04' || normName.includes('roadside') || normName.includes('street') || normName.includes('ફૂટપાથ');
  const isLitter = normId === 'cat-01' || normName.includes('litter') || normName.includes('plastic') || normName.includes('પ્લાસ્ટિક');
  const isPothole = normId === 'cat-07' || normName.includes('pothole') || normName.includes('degraded road') || normName.includes('ખાડા') || normName.includes('गड्ढे');
  const isTree = normId === 'cat-08' || normName.includes('tree') || normName.includes('fallen') || normName.includes('ઝાડ') || normName.includes('વૃક્ષ') || normName.includes('पेड़');
  const isRailing = normId === 'cat-09' || normName.includes('railing') || normName.includes('parapet') || normName.includes('bridge') || normName.includes('રેલિંગ');
  const isOvertopped = normId === 'cat-10' || normName.includes('overtop') || normName.includes('flood') || normName.includes('waterlog') || normName.includes('પાણી ભરાવું');

  // Container dimensions
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-20 h-20 sm:w-24 sm:h-24'
  }[size];

  const ringStyles = isSelected
    ? 'border-[#095c54] ring-4 ring-[#095c54]/25 shadow-md shadow-[#095c54]/30 scale-105 bg-[#e6f4f1]'
    : 'border-[#f97316] hover:border-[#ea580c] shadow-xs bg-white';

  const renderIllustration = () => {
    // 1. Dustbin Overflow (ઉભરાતી કચરાપેટી)
    if (isDustbin) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          {/* Circular inner backdrop */}
          <circle cx="50" cy="50" r="44" fill="#fef3c7" opacity="0.6" />
          {/* Wheelie bin body */}
          <path d="M34 44 L40 82 C40.5 85 43 87 46 87 L54 87 C57 87 59.5 85 60 82 L66 44 Z" fill="#059669" stroke="#065f46" strokeWidth="2.5" />
          {/* Bin rib lines */}
          <line x1="44" y1="48" x2="47" y2="78" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="50" y1="48" x2="50" y2="78" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="56" y1="48" x2="53" y2="78" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
          {/* Wheels */}
          <circle cx="39" cy="84" r="5" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="61" cy="84" r="5" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
          {/* Overflowing Trash Bags & Waste */}
          <ellipse cx="46" cy="38" rx="10" ry="8" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
          <circle cx="56" cy="36" r="7" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <rect x="42" y="27" width="8" height="10" rx="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" transform="rotate(-15 46 32)" />
          {/* Tilted Open Lid */}
          <path d="M28 42 L68 30 L66 26 L26 38 Z" fill="#047857" stroke="#065f46" strokeWidth="2" />
          <rect x="44" y="26" width="6" height="3" rx="1" fill="#0f172a" transform="rotate(-17 47 27)" />
          {/* Spilling waste particles */}
          <circle cx="69" cy="46" r="2.5" fill="#ef4444" />
          <circle cx="30" cy="50" r="2" fill="#eab308" />
        </svg>
      );
    }

    // 2. Drainage / Choked Gutter (ગટર / નાલી કચરો)
    if (isDrainage) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#e0f2fe" opacity="0.7" />
          {/* Concrete drain edge */}
          <ellipse cx="50" cy="62" rx="38" ry="24" fill="#64748b" stroke="#334155" strokeWidth="2.5" />
          {/* Dark inner cavity */}
          <ellipse cx="50" cy="62" rx="32" ry="19" fill="#1e293b" />
          {/* Dirty stagnant water pool */}
          <ellipse cx="50" cy="65" rx="28" ry="14" fill="#0284c7" opacity="0.8" />
          <ellipse cx="50" cy="66" rx="22" ry="10" fill="#0369a1" />
          {/* Metal Grate Bars */}
          <line x1="28" y1="52" x2="28" y2="72" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="39" y1="46" x2="39" y2="78" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="44" x2="50" y2="80" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="61" y1="46" x2="61" y2="78" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="72" y1="52" x2="72" y2="72" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          {/* Floating garbage/choke debris */}
          <circle cx="44" cy="66" r="3" fill="#f97316" />
          <circle cx="55" cy="68" r="2.5" fill="#ef4444" />
          {/* Choking Pipe Spurt with Water Drops */}
          <path d="M50 20 Q54 32 50 42" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
          <circle cx="44" cy="34" r="2.5" fill="#38bdf8" />
          <circle cx="57" cy="30" r="2" fill="#38bdf8" />
          <circle cx="50" cy="45" r="3" fill="#0ea5e9" />
        </svg>
      );
    }

    // 3. Open Garbage Dumping (ખુલ્લામાં કચરો ઠાલવવો)
    if (isDump) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#ffedd5" opacity="0.7" />
          {/* Ground soil plane */}
          <path d="M12 78 Q50 72 88 78 L88 88 L12 88 Z" fill="#a16207" opacity="0.4" />
          <line x1="10" y1="78" x2="90" y2="78" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          {/* Huge garbage mound / pile */}
          <path d="M22 78 Q35 48 50 42 Q65 48 78 78 Z" fill="#d97706" opacity="0.3" />
          {/* Heap elements: bags, cartons, bottles */}
          {/* Black trash bag */}
          <ellipse cx="38" cy="68" rx="11" ry="9" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          {/* Orange bag */}
          <ellipse cx="60" cy="70" rx="10" ry="8" fill="#ea580c" stroke="#c2410c" strokeWidth="2" />
          {/* Yellow carton box */}
          <rect x="42" y="55" width="16" height="15" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="2" transform="rotate(8 50 62)" />
          {/* Blue bag on top */}
          <ellipse cx="50" cy="46" rx="9" ry="8" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          {/* Caution Alert Flag on Dump */}
          <path d="M50 42 L50 22 M50 22 L62 27 L50 32 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
          {/* Scattered debris */}
          <rect x="25" y="74" width="7" height="4" fill="#64748b" transform="rotate(-20 28 76)" />
          <circle cx="76" cy="74" r="3" fill="#10b981" />
        </svg>
      );
    }

    // 4. Roadside Garbage / Street Waste (રસ્તા કિનારે કચરો)
    if (isRoadLitter) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#f1f5f9" opacity="0.8" />
          {/* Road Asphalt */}
          <path d="M20 90 L38 25 L88 25 L75 90 Z" fill="#475569" stroke="#334155" strokeWidth="2" />
          {/* Yellow Lane Markings */}
          <line x1="54" y1="30" x2="52" y2="44" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="52" x2="48" y2="68" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
          <line x1="46" y1="76" x2="44" y2="88" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
          {/* Pedestrian Sidewalk Curb */}
          <path d="M12 90 L32 25 L38 25 L20 90 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Roadside uncollected trash items */}
          <ellipse cx="28" cy="65" rx="5" ry="4" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          <rect x="22" y="74" width="7" height="5" rx="1" fill="#f59e0b" transform="rotate(25 25 76)" />
          <circle cx="34" cy="78" r="3" fill="#3b82f6" />
          <circle cx="26" cy="50" r="2.5" fill="#10b981" />
        </svg>
      );
    }

    // 5. Littering / Plastic Waste (કચરો / પ્લાસ્ટિક ફેંકવું)
    if (isLitter) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#ecfdf5" opacity="0.8" />
          {/* Throwing Hand / Motion Arc */}
          <path d="M22 45 Q36 32 52 35 L50 42 Q40 40 28 49 Z" fill="#d97706" />
          <path d="M42 36 Q60 38 68 55" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
          {/* Plastic Water Bottle falling */}
          <g transform="translate(62, 52) rotate(35)">
            <rect x="0" y="4" width="9" height="15" rx="2" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
            <rect x="2.5" y="0" width="4" height="4" rx="1" fill="#0284c7" />
            <line x1="1" y1="10" x2="8" y2="10" stroke="#bae6fd" strokeWidth="1" />
          </g>
          {/* Crushed Drink Can */}
          <rect x="52" y="70" width="10" height="11" rx="2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" transform="rotate(-20 57 75)" />
          {/* Food wrapper */}
          <polygon points="36,75 44,70 48,78 40,82" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        </svg>
      );
    }

    // 6. Potholes / Degraded Road (ખાડા / તૂટેલો રસ્તો - Exact match to user screenshot)
    if (isPothole) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#f1f5f9" opacity="0.8" />
          {/* Perspective Asphalt Road */}
          <polygon points="26,90 38,20 62,20 74,90" fill="#334155" stroke="#1e293b" strokeWidth="2" />
          {/* Dashed Center Road Line */}
          <line x1="50" y1="22" x2="50" y2="34" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
          <line x1="50" y1="42" x2="50" y2="52" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="78" x2="50" y2="88" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
          {/* Deep Jagged Pothole Crater */}
          <path
            d="M38 58 Q42 54 48 56 Q56 52 64 57 Q66 64 60 67 Q54 70 44 68 Q36 66 38 58 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="2"
          />
          {/* Inner Depth / Crater Shadow */}
          <ellipse cx="51" cy="62" rx="9" ry="4" fill="#020617" />
          {/* Cracks branching out from pothole */}
          <path d="M48 56 L44 48 L46 44" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M60 67 L68 72 L72 74" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M38 64 L30 68" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Broken gravel pebbles */}
          <circle cx="56" cy="74" r="2" fill="#94a3b8" />
          <circle cx="42" cy="72" r="1.5" fill="#94a3b8" />
        </svg>
      );
    }

    // 7. Fallen Tree / Blockage (પડેલું ઝાડ / અવરોધ - Exact match to user screenshot)
    if (isTree) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#ecfdf5" opacity="0.8" />
          {/* Ground soil */}
          <ellipse cx="50" cy="80" rx="36" ry="10" fill="#a16207" opacity="0.3" />
          {/* Tree Stump */}
          <path d="M28 82 L34 68 L42 70 L40 84 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
          {/* Broken jagged snapped wood */}
          <polygon points="34,68 37,64 40,68 42,65 42,70" fill="#b45309" />
          {/* Fallen Main Trunk across path */}
          <path d="M38 68 L78 60 L80 68 L40 76 Z" fill="#92400e" stroke="#451a03" strokeWidth="2" />
          {/* Branches with Green Foliage Clouds */}
          <circle cx="68" cy="46" r="14" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
          <circle cx="56" cy="50" r="11" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
          <circle cx="78" cy="54" r="10" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
          {/* Leaves falling */}
          <ellipse cx="48" cy="56" rx="4" ry="2" fill="#84cc16" transform="rotate(30 48 56)" />
          <ellipse cx="72" cy="72" rx="4" ry="2" fill="#16a34a" transform="rotate(-20 72 72)" />
        </svg>
      );
    }

    // 8. Railing / Parapet Damaged (રેલિંગ / પુલ નુકસાન - Exact match to user screenshot)
    if (isRailing) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#fef2f2" opacity="0.8" />
          {/* Concrete Base Wall / Parapet */}
          <rect x="18" y="66" width="64" height="18" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          {/* Concrete brick divisions */}
          <line x1="38" y1="66" x2="38" y2="84" stroke="#475569" strokeWidth="1.5" />
          <line x1="62" y1="66" x2="62" y2="84" stroke="#475569" strokeWidth="1.5" />
          {/* Damaged crack on the base wall */}
          <path d="M48 66 L52 74 L49 84" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          {/* Metal Railing Posts */}
          <rect x="22" y="32" width="6" height="34" rx="1" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
          <rect x="72" y="32" width="6" height="34" rx="1" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
          {/* Bent / Broken Central Railing post */}
          <path d="M48 66 L46 48 L56 34" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          {/* Top Handrail - Broken / Disconnected in middle */}
          <line x1="20" y1="34" x2="44" y2="34" stroke="#1e40af" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="56" y1="40" x2="80" y2="34" stroke="#1e40af" strokeWidth="3.5" strokeLinecap="round" />
          {/* Middle Railing wires */}
          <line x1="22" y1="48" x2="42" y2="48" stroke="#60a5fa" strokeWidth="2" />
          <line x1="58" y1="52" x2="76" y2="48" stroke="#60a5fa" strokeWidth="2" />
          {/* Warning spark icon */}
          <polygon points="50,22 53,28 59,29 55,34 56,40 50,37 44,40 45,34 41,29 47,28" fill="#ef4444" />
        </svg>
      );
    }

    // 9. Road Overtopped / Flooding (રસ્તા પર પાણી ભરાવું - Match to user screenshot)
    if (isOvertopped) {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
          <circle cx="50" cy="50" r="44" fill="#e0f2fe" opacity="0.8" />
          {/* Submerged road lane */}
          <polygon points="20,86 36,36 64,36 80,86" fill="#475569" stroke="#334155" strokeWidth="2" />
          {/* Overtopping Water Waves */}
          <path
            d="M12 64 Q26 56 40 64 T68 64 T92 64 L92 88 L12 88 Z"
            fill="#38bdf8"
            opacity="0.8"
            stroke="#0284c7"
            strokeWidth="2"
          />
          <path
            d="M12 74 Q28 66 44 74 T74 74 T92 74 L92 88 L12 88 Z"
            fill="#0284c7"
            opacity="0.9"
          />
          {/* Splashing Wave Crests */}
          <path d="M26 60 Q32 52 38 60" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
          <path d="M54 60 Q60 52 66 60" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
          {/* Floating Warning Sign */}
          <polygon points="50,26 60,44 40,44" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
          <line x1="50" y1="32" x2="50" y2="38" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="41" r="1" fill="#0f172a" />
        </svg>
      );
    }

    // 10. Default / Other Cleanliness Issues (અન્ય સમસ્યાઓ)
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none">
        <circle cx="50" cy="50" r="44" fill="#f0fdf4" opacity="0.8" />
        {/* Civic Municipal Crest Badge */}
        <path d="M50 18 L76 28 C76 56 64 74 50 84 C36 74 24 56 24 28 Z" fill="#095c54" stroke="#043a35" strokeWidth="2.5" />
        {/* Inner clean shield */}
        <path d="M50 25 L70 33 C70 54 60 68 50 76 C40 68 30 54 30 33 Z" fill="#10b981" />
        {/* Broom / Sanitation Sweeper Silhouette */}
        <line x1="42" y1="62" x2="58" y2="36" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="M38 62 L48 62 L45 70 L35 70 Z" fill="#fef08a" stroke="#ffffff" strokeWidth="1" />
        {/* Sparkles of Cleanliness */}
        <polygon points="50,30 52,35 57,36 53,39 54,44 50,41 46,44 47,39 43,36 48,35" fill="#fef08a" />
      </svg>
    );
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer Circular Ring with energetic orange/amber border like in Gujarat PRAGATI portal */}
      <div
        className={`${dimensions} rounded-full border-2 p-1 transition-all duration-200 flex items-center justify-center shrink-0 ${ringStyles}`}
      >
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {renderIllustration()}
        </div>
      </div>

      {/* Floating Checkmark badge when category is actively selected */}
      {isSelected && showCheckBadge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#095c54] text-white flex items-center justify-center ring-2 ring-white shadow-md animate-scaleUp">
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
};
