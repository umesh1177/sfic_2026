"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAVSARI_WARDS = void 0;
exports.isPointInPolygon = isPointInPolygon;
exports.findWardByCoordinates = findWardByCoordinates;
exports.calculateDistanceMeters = calculateDistanceMeters;
// Official Navsari Municipal Corporation 13 Wards with realistic boundary polygons (Lng, Lat order)
exports.NAVSARI_WARDS = [
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
            [72.9200, 20.9400],
            [72.9350, 20.9400],
            [72.9350, 20.9550],
            [72.9200, 20.9550],
            [72.9200, 20.9400],
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
            [72.9350, 20.9400],
            [72.9500, 20.9400],
            [72.9500, 20.9550],
            [72.9350, 20.9550],
            [72.9350, 20.9400],
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
            [72.9200, 20.9250],
            [72.9350, 20.9250],
            [72.9350, 20.9400],
            [72.9200, 20.9400],
            [72.9200, 20.9250],
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
            [72.9350, 20.9250],
            [72.9500, 20.9250],
            [72.9500, 20.9400],
            [72.9350, 20.9400],
            [72.9350, 20.9250],
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
            [72.9050, 20.9300],
            [72.9200, 20.9300],
            [72.9200, 20.9500],
            [72.9050, 20.9500],
            [72.9050, 20.9300],
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
            [72.9500, 20.9300],
            [72.9650, 20.9300],
            [72.9650, 20.9500],
            [72.9500, 20.9500],
            [72.9500, 20.9300],
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
            [72.9350, 20.9100],
            [72.9550, 20.9100],
            [72.9550, 20.9250],
            [72.9350, 20.9250],
            [72.9350, 20.9100],
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
            [72.9200, 20.9550],
            [72.9380, 20.9550],
            [72.9380, 20.9700],
            [72.9200, 20.9700],
            [72.9200, 20.9550],
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
            [72.9380, 20.9550],
            [72.9550, 20.9550],
            [72.9550, 20.9700],
            [72.9380, 20.9700],
            [72.9380, 20.9550],
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
            [72.9500, 20.9150],
            [72.9700, 20.9150],
            [72.9700, 20.9300],
            [72.9500, 20.9300],
            [72.9500, 20.9150],
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
            [72.9000, 20.9100],
            [72.9200, 20.9100],
            [72.9200, 20.9300],
            [72.9000, 20.9300],
            [72.9000, 20.9100],
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
            [72.9000, 20.8900],
            [72.9300, 20.8900],
            [72.9300, 20.9100],
            [72.9000, 20.9100],
            [72.9000, 20.8900],
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
            [72.8800, 20.9200],
            [72.9050, 20.9200],
            [72.9050, 20.9500],
            [72.8800, 20.9500],
            [72.8800, 20.9200],
        ]
    }
];
// Point-in-polygon ray casting algorithm (PostGIS ST_Contains equivalent in Node.js)
function isPointInPolygon(point, vs) {
    const x = point[0]; // lng
    const y = point[1]; // lat
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect)
            inside = !inside;
    }
    return inside;
}
// Find ward for given coordinates - gracefully assigns closest ward even for out-of-bounds locations
function findWardByCoordinates(lat, lng) {
    for (const ward of exports.NAVSARI_WARDS) {
        if (isPointInPolygon([lng, lat], ward.boundary_coordinates)) {
            return ward;
        }
    }
    // Find closest ward center
    let closestWard = exports.NAVSARI_WARDS[2]; // Ward 3 Dudhiya Talao default
    let minDistance = Infinity;
    for (const ward of exports.NAVSARI_WARDS) {
        const centerLng = (ward.boundary_coordinates[0][0] + ward.boundary_coordinates[2][0]) / 2;
        const centerLat = (ward.boundary_coordinates[0][1] + ward.boundary_coordinates[2][1]) / 2;
        const dist = calculateDistanceMeters(lat, lng, centerLat, centerLng);
        if (dist < minDistance) {
            minDistance = dist;
            closestWard = ward;
        }
    }
    return closestWard;
}
// Haversine distance formula in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
