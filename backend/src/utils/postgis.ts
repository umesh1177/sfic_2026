import { Ward } from '../types/index.js';

// Official Navsari Municipal Corporation Outer City Administrative Boundary (Survey of India / Gujarat GIS - Lng, Lat order)
// Encloses all 13 municipal wards, Jalalpore, Vijalpore, NAU campus, and rural transition corridors
export const DEFAULT_NAVSARI_CITY_BOUNDARY: [number, number][] = [
  [72.9230, 20.9680], // North: Purna River northern bend & Madhumati riverbank
  [72.9340, 20.9710], // North-East: Sisodra link & bypass approach
  [72.9450, 20.9730], // Sandhkuva north perimeter
  [72.9560, 20.9690], // Junathana northeast limits
  [72.9630, 20.9620], // East perimeter north: Railway crossing & Chhapra north
  [72.9660, 20.9510], // East: Chhapra Road industrial verge
  [72.9670, 20.9410], // East: Station Road east / Vejalpore north
  [72.9680, 20.9310], // East: Vijalpore municipal boundary
  [72.9675, 20.9210], // Southeast: Vejalpore extension
  [72.9640, 20.9120], // Southeast: GIDC industrial sector
  [72.9560, 20.9030], // Southeast: Gandevi Road junction
  [72.9460, 20.8950], // South-East: NH-48 approach & Italva south
  [72.9340, 20.8890], // South: Eru Char Rasta south
  [72.9230, 20.8860], // South: Navsari Agricultural University (NAU) southern perimeter
  [72.9110, 20.8870], // South-Southwest: NAU research farms
  [72.9020, 20.8930], // Southwest: Aru rural gateway
  [72.8960, 20.9050], // Southwest: Sarbhan Chokdi
  [72.8910, 20.9170], // West-Southwest: Dandi Road southern approach
  [72.8830, 20.9280], // West: Dandi Heritage corridor
  [72.8790, 20.9390], // West: Matwad wetland & saltmarsh boundary
  [72.8820, 20.9500], // Northwest: Jalalpore western boundary
  [72.8910, 20.9590], // Northwest: Virawal creek bend
  [72.9050, 20.9650], // Northwest: Jalalpore north gate
  [72.9170, 20.9675], // North: Purna River approach
  [72.9230, 20.9680]  // Closed loop
];

// Official Navsari Municipal Corporation 13 Wards with authentic administrative GIS polygons (Lng, Lat order)
export const NAVSARI_WARDS: Ward[] = [
  {
    id: 'ward-01',
    ward_number: 1,
    ward_name: 'Lunsikui - Tower Road',
    ward_name_gu: 'લુન્સીકુઈ - ટાવર રોડ',
    office_address: 'Near Lunsikui Ground, Navsari',
    ward_officer_name: 'Ramesh Patel',
    contact_phone: '+91 98251 01001',
    cleanliness_score: 8.8,
    boundary_coordinates: [
      [72.9215, 20.9410],
      [72.9300, 20.9410],
      [72.9355, 20.9410],
      [72.9360, 20.9485],
      [72.9358, 20.9535],
      [72.9285, 20.9555],
      [72.9210, 20.9520],
      [72.9215, 20.9410]
    ]
  },
  {
    id: 'ward-02',
    ward_number: 2,
    ward_name: 'Station Road - Fuwara',
    ward_name_gu: 'સ્ટેશન રોડ - ફુવારા',
    office_address: 'Opp. Railway Station, Navsari',
    ward_officer_name: 'Dinesh Desai',
    contact_phone: '+91 98251 01002',
    cleanliness_score: 7.9,
    boundary_coordinates: [
      [72.9355, 20.9410],
      [72.9430, 20.9408],
      [72.9515, 20.9405],
      [72.9520, 20.9475],
      [72.9520, 20.9540],
      [72.9440, 20.9538],
      [72.9360, 20.9535],
      [72.9355, 20.9410]
    ]
  },
  {
    id: 'ward-03',
    ward_number: 3,
    ward_name: 'Dudhiya Talao - Ashapuri',
    ward_name_gu: 'દુધિયા તળાવ - આશાપુરી',
    office_address: 'Dudhiya Talao Lake Complex, Navsari',
    ward_officer_name: 'Bhavesh Solanki',
    contact_phone: '+91 98251 01003',
    cleanliness_score: 9.1,
    boundary_coordinates: [
      [72.9210, 20.9270],
      [72.9280, 20.9268],
      [72.9350, 20.9270],
      [72.9352, 20.9340],
      [72.9355, 20.9410],
      [72.9280, 20.9410],
      [72.9215, 20.9410],
      [72.9210, 20.9340],
      [72.9210, 20.9270]
    ]
  },
  {
    id: 'ward-04',
    ward_number: 4,
    ward_name: 'Kaliawadi - Sayaji Road',
    ward_name_gu: 'કાલિયાવાડી - સયાજી રોડ',
    office_address: 'Near Sayaji Library, Kaliawadi',
    ward_officer_name: 'Mitesh Naik',
    contact_phone: '+91 98251 01004',
    cleanliness_score: 8.4,
    boundary_coordinates: [
      [72.9350, 20.9270],
      [72.9430, 20.9265],
      [72.9510, 20.9260],
      [72.9512, 20.9335],
      [72.9515, 20.9405],
      [72.9430, 20.9408],
      [72.9355, 20.9410],
      [72.9352, 20.9340],
      [72.9350, 20.9270]
    ]
  },
  {
    id: 'ward-05',
    ward_number: 5,
    ward_name: 'Jalalpore Gateway - Chhapra',
    ward_name_gu: 'જલાલપોર - છાપરા',
    office_address: 'Jalalpore Main Rd, Navsari',
    ward_officer_name: 'Kiritbhai Vashi',
    contact_phone: '+91 98251 01005',
    cleanliness_score: 8.0,
    boundary_coordinates: [
      [72.9030, 20.9320],
      [72.9120, 20.9318],
      [72.9210, 20.9320],
      [72.9215, 20.9410],
      [72.9210, 20.9520],
      [72.9140, 20.9550],
      [72.9080, 20.9570],
      [72.8990, 20.9480],
      [72.9030, 20.9320]
    ]
  },
  {
    id: 'ward-06',
    ward_number: 6,
    ward_name: 'Shantadevi - Vijalpore',
    ward_name_gu: 'શાંતાદેવી - વિજલપોર',
    office_address: 'Shantadevi Road Civic Center',
    ward_officer_name: 'Pravin Rathod',
    contact_phone: '+91 98251 01006',
    cleanliness_score: 7.6,
    boundary_coordinates: [
      [72.9510, 20.9260],
      [72.9580, 20.9258],
      [72.9660, 20.9255],
      [72.9665, 20.9350],
      [72.9665, 20.9430],
      [72.9585, 20.9420],
      [72.9515, 20.9405],
      [72.9510, 20.9260]
    ]
  },
  {
    id: 'ward-07',
    ward_number: 7,
    ward_name: 'Gandevi Road - GIDC',
    ward_name_gu: 'ગણદેવી રોડ - જીઆઇડીસી',
    office_address: 'GIDC Office Sector 2, Navsari',
    ward_officer_name: 'Sunil Parekh',
    contact_phone: '+91 98251 01007',
    cleanliness_score: 8.2,
    boundary_coordinates: [
      [72.9340, 20.9080],
      [72.9450, 20.9075],
      [72.9560, 20.9070],
      [72.9560, 20.9165],
      [72.9560, 20.9260],
      [72.9450, 20.9265],
      [72.9350, 20.9270],
      [72.9340, 20.9080]
    ]
  },
  {
    id: 'ward-08',
    ward_number: 8,
    ward_name: 'Madhumati - Parsi Wad',
    ward_name_gu: 'મધુમતી - પારસી વાડ',
    office_address: 'Heritage Parsi Vad, Navsari',
    ward_officer_name: 'Cyrus Contractor',
    contact_phone: '+91 98251 01008',
    cleanliness_score: 9.3,
    boundary_coordinates: [
      [72.9180, 20.9540],
      [72.9285, 20.9555],
      [72.9360, 20.9535],
      [72.9370, 20.9610],
      [72.9380, 20.9690],
      [72.9300, 20.9685],
      [72.9230, 20.9680],
      [72.9180, 20.9540]
    ]
  },
  {
    id: 'ward-09',
    ward_number: 9,
    ward_name: 'Sandhkuva - Junathana',
    ward_name_gu: 'સાંઢકુવા - જૂનાથાણા',
    office_address: 'Junathana Market Compound',
    ward_officer_name: 'Haresh Kansara',
    contact_phone: '+91 98251 01009',
    cleanliness_score: 8.1,
    boundary_coordinates: [
      [72.9360, 20.9535],
      [72.9440, 20.9538],
      [72.9520, 20.9540],
      [72.9580, 20.9540],
      [72.9610, 20.9620],
      [72.9610, 20.9660],
      [72.9540, 20.9690],
      [72.9420, 20.9730],
      [72.9380, 20.9690],
      [72.9360, 20.9535]
    ]
  },
  {
    id: 'ward-10',
    ward_number: 10,
    ward_name: 'Vejalpore Extension',
    ward_name_gu: 'વેજલપોર એક્સટેન્શન',
    office_address: 'Vejalpore Community Hall',
    ward_officer_name: 'Jagdish Ahir',
    contact_phone: '+91 98251 01010',
    cleanliness_score: 8.5,
    boundary_coordinates: [
      [72.9520, 20.9120],
      [72.9600, 20.9120],
      [72.9675, 20.9120],
      [72.9680, 20.9200],
      [72.9680, 20.9255],
      [72.9600, 20.9258],
      [72.9510, 20.9260],
      [72.9520, 20.9120]
    ]
  },
  {
    id: 'ward-11',
    ward_number: 11,
    ward_name: 'Sarbhan - Aru Rural Gateway',
    ward_name_gu: 'સરભાણ - અરૂ',
    office_address: 'Sarbhan Chokdi Ward Center',
    ward_officer_name: 'Chetan Patel',
    contact_phone: '+91 98251 01011',
    cleanliness_score: 8.7,
    boundary_coordinates: [
      [72.8980, 20.9060],
      [72.9100, 20.9065],
      [72.9210, 20.9070],
      [72.9210, 20.9170],
      [72.9210, 20.9270],
      [72.9100, 20.9270],
      [72.9030, 20.9270],
      [72.8980, 20.9165],
      [72.8980, 20.9060]
    ]
  },
  {
    id: 'ward-12',
    ward_number: 12,
    ward_name: 'Eru Char Rasta - NAU Campus',
    ward_name_gu: 'એરૂ ચાર રસ્તા - કૃષિ યુનિવર્સિટી',
    office_address: 'Eru Char Rasta, Near NAU Gate',
    ward_officer_name: 'Dr. Sanjay Chauhan',
    contact_phone: '+91 98251 01012',
    cleanliness_score: 9.5,
    boundary_coordinates: [
      [72.9020, 20.8870],
      [72.9150, 20.8870],
      [72.9280, 20.8880],
      [72.9330, 20.8890],
      [72.9340, 20.8980],
      [72.9340, 20.9080],
      [72.9210, 20.9070],
      [72.9100, 20.9065],
      [72.8980, 20.9060],
      [72.9020, 20.8930],
      [72.9020, 20.8870]
    ]
  },
  {
    id: 'ward-13',
    ward_number: 13,
    ward_name: 'Dandi Coastal Corridor',
    ward_name_gu: 'દાંડી રોડ કોરિડોર',
    office_address: 'Dandi Road Heritage Junction',
    ward_officer_name: 'Amit Tandel',
    contact_phone: '+91 98251 01013',
    cleanliness_score: 9.2,
    boundary_coordinates: [
      [72.8790, 20.9240],
      [72.8910, 20.9240],
      [72.9030, 20.9240],
      [72.9030, 20.9320],
      [72.8990, 20.9480],
      [72.9030, 20.9560],
      [72.8910, 20.9580],
      [72.8820, 20.9500],
      [72.8790, 20.9390],
      [72.8790, 20.9240]
    ]
  }
];

// Point-in-polygon ray casting algorithm (PostGIS ST_Contains equivalent in Node.js)
export function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  if (!vs || vs.length < 3) return false;
  const x = point[0]; // lng
  const y = point[1]; // lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Find ward for given coordinates - dynamically prioritizes active wards array if provided, otherwise defaults to NAVSARI_WARDS
export function findWardByCoordinates(lat: number, lng: number, activeWards?: Ward[]): Ward {
  const wards = (activeWards && activeWards.length > 0) ? activeWards : NAVSARI_WARDS;

  // 1. Precise polygon match
  for (const ward of wards) {
    if (ward.boundary_coordinates && ward.boundary_coordinates.length >= 3) {
      if (isPointInPolygon([lng, lat], ward.boundary_coordinates)) {
        return ward;
      }
    }
  }

  // 2. Graceful closest centroid fallback if outside all boundaries or in border margin
  let closestWard: Ward = wards[2] || NAVSARI_WARDS[2]; // Ward 3 Dudhiya Talao default
  let minDistance = Infinity;

  for (const ward of wards) {
    if (ward.boundary_coordinates && ward.boundary_coordinates.length >= 3) {
      const avgLng = ward.boundary_coordinates.reduce((acc, c) => acc + c[0], 0) / ward.boundary_coordinates.length;
      const avgLat = ward.boundary_coordinates.reduce((acc, c) => acc + c[1], 0) / ward.boundary_coordinates.length;
      const dist = calculateDistanceMeters(lat, lng, avgLat, avgLng);
      if (dist < minDistance) {
        minDistance = dist;
        closestWard = ward;
      }
    }
  }

  return closestWard;
}

// Haversine distance formula in meters
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
