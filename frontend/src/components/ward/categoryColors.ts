export interface CategoryColorConfig {
  name: string;
  hex: string;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
}

export const CATEGORY_COLOR_MAP: Record<string, CategoryColorConfig> = {
  'open garbage dumping': {
    name: 'Open Garbage Dumping',
    hex: '#ef4444',
    bg: 'bg-red-500',
    border: 'border-red-600',
    text: 'text-red-600',
    badgeBg: 'bg-red-50 text-red-700 border-red-200'
  },
  'overflowing dustbins': {
    name: 'Overflowing Dustbins',
    hex: '#f97316',
    bg: 'bg-orange-500',
    border: 'border-orange-600',
    text: 'text-orange-600',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  'drainage issues': {
    name: 'Drainage Issues',
    hex: '#0284c7',
    bg: 'bg-sky-500',
    border: 'border-sky-600',
    text: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  'waterlogging': {
    name: 'Waterlogging & Flood',
    hex: '#2563eb',
    bg: 'bg-blue-600',
    border: 'border-blue-700',
    text: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  'potholes': {
    name: 'Potholes / Degraded Road',
    hex: '#eab308',
    bg: 'bg-amber-500',
    border: 'border-amber-600',
    text: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  'dead animal removal': {
    name: 'Dead Animal Removal',
    hex: '#a855f7',
    bg: 'bg-purple-500',
    border: 'border-purple-600',
    text: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  'roadside garbage': {
    name: 'Roadside Garbage / Littering',
    hex: '#10b981',
    bg: 'bg-emerald-500',
    border: 'border-emerald-600',
    text: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  'construction debris': {
    name: 'Construction Debris',
    hex: '#78716c',
    bg: 'bg-stone-500',
    border: 'border-stone-600',
    text: 'text-stone-600',
    badgeBg: 'bg-stone-50 text-stone-700 border-stone-200'
  }
};

export function getCategoryColor(category: string = ''): CategoryColorConfig {
  const cat = category.toLowerCase().trim();
  for (const [key, cfg] of Object.entries(CATEGORY_COLOR_MAP)) {
    if (cat.includes(key) || key.includes(cat)) {
      return cfg;
    }
  }
  if (cat.includes('drain') || cat.includes('sewage')) return CATEGORY_COLOR_MAP['drainage issues'];
  if (cat.includes('water') || cat.includes('overtop') || cat.includes('flood')) return CATEGORY_COLOR_MAP['waterlogging'];
  if (cat.includes('bin') || cat.includes('dustbin') || cat.includes('overflow')) return CATEGORY_COLOR_MAP['overflowing dustbins'];
  if (cat.includes('dump') || cat.includes('garbage')) return CATEGORY_COLOR_MAP['open garbage dumping'];
  if (cat.includes('road') || cat.includes('pothole') || cat.includes('street')) return CATEGORY_COLOR_MAP['potholes'];
  if (cat.includes('animal') || cat.includes('carcass')) return CATEGORY_COLOR_MAP['dead animal removal'];
  if (cat.includes('litter') || cat.includes('clean') || cat.includes('sweep')) return CATEGORY_COLOR_MAP['roadside garbage'];
  if (cat.includes('debris') || cat.includes('c&d')) return CATEGORY_COLOR_MAP['construction debris'];

  return {
    name: category || 'Civic Sanitation',
    hex: '#095c54',
    bg: 'bg-[#095c54]',
    border: 'border-[#06423c]',
    text: 'text-[#095c54]',
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200'
  };
}
