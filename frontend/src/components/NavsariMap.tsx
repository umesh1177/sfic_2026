import React from 'react';
import { ComplaintCategory } from '../types/index.js';
import { Language } from '../i18n/translations.js';
import { ReactLeafletNavsariMap } from './ReactLeafletNavsariMap.js';

interface NavsariMapProps {
  categories: ComplaintCategory[];
  lang: Language;
}

/**
 * Navsari Cleanliness Map
 * Implemented using React Leaflet, OpenStreetMap tiles, and PostgreSQL PostGIS.
 * Strictly restricts boundaries to Navsari Municipal Corporation, loads official 13 ward GeoJSON,
 * supports GPS location detection, manual pin selection, ward identification, and complaint filtering.
 */
export const NavsariMap: React.FC<NavsariMapProps> = ({ categories, lang }) => {
  return <ReactLeafletNavsariMap categories={categories} lang={lang} />;
};

export default NavsariMap;
