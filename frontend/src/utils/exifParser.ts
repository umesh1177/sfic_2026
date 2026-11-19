/**
 * Zero-dependency, high-performance binary EXIF GPS metadata parser.
 * Works seamlessly with JPEG and PNG camera photos directly in browser or Node.js.
 */

export interface GeoTagResult {
  hasGeoTag: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  dateTime?: string;
  source?: string;
  error?: string;
}

/**
 * Extracts GPS coordinates (latitude, longitude, altitude) from an image File or ArrayBuffer.
 */
export async function extractExifGeoTag(source: File | Blob | ArrayBuffer): Promise<GeoTagResult> {
  try {
    let buffer: ArrayBuffer;
    if (source instanceof ArrayBuffer) {
      buffer = source;
    } else if (source instanceof Blob) {
      buffer = await source.arrayBuffer();
    } else {
      return { hasGeoTag: false, error: 'Invalid input source for EXIF extraction' };
    }

    const dataView = new DataView(buffer);

    // 1. Check for JPEG (SOI 0xFFD8)
    if (dataView.byteLength >= 2 && dataView.getUint16(0) === 0xffd8) {
      return parseJpegExif(dataView);
    }

    // 2. Check for PNG (PNG signature 0x89504E47)
    if (dataView.byteLength >= 8 && dataView.getUint32(0) === 0x89504e47) {
      return parsePngExif(dataView);
    }

    return {
      hasGeoTag: false,
      error: 'Image format does not contain EXIF container (only JPEG and PNG supported).'
    };
  } catch (err: any) {
    return {
      hasGeoTag: false,
      error: `Failed to parse EXIF metadata: ${err?.message || err}`
    };
  }
}

function parseJpegExif(dataView: DataView): GeoTagResult {
  let offset = 2;
  const length = dataView.byteLength;

  while (offset + 4 < length) {
    if (dataView.getUint8(offset) !== 0xff) {
      break;
    }
    const marker = dataView.getUint8(offset + 1);

    // 0xFFE1 = APP1 marker (contains Exif)
    if (marker === 0xe1) {
      const app1Length = dataView.getUint16(offset + 2);
      // Check Exif identifier: 'Exif\0\0' (0x45786966 0x0000)
      if (
        dataView.byteLength >= offset + 10 &&
        dataView.getUint32(offset + 4) === 0x45786966 &&
        dataView.getUint16(offset + 8) === 0x0000
      ) {
        const tiffOffset = offset + 10;
        return parseTiffGps(dataView, tiffOffset);
      }
      offset += 2 + app1Length;
    } else if (marker === 0xd9 || marker === 0xda) {
      // EOI or SOS (start of scan) - no EXIF follows
      break;
    } else {
      const markerLength = dataView.getUint16(offset + 2);
      offset += 2 + markerLength;
    }
  }

  return {
    hasGeoTag: false,
    error: 'No GPS metadata found in photo EXIF.'
  };
}

function parsePngExif(dataView: DataView): GeoTagResult {
  let offset = 8;
  const length = dataView.byteLength;

  while (offset + 8 < length) {
    const chunkLength = dataView.getUint32(offset);
    const chunkType = String.fromCharCode(
      dataView.getUint8(offset + 4),
      dataView.getUint8(offset + 5),
      dataView.getUint8(offset + 6),
      dataView.getUint8(offset + 7)
    );

    if (chunkType === 'eXIf') {
      const tiffOffset = offset + 8;
      return parseTiffGps(dataView, tiffOffset);
    }
    offset += 8 + chunkLength + 4; // chunk length + type(4) + len(4) + crc(4)
  }

  return {
    hasGeoTag: false,
    error: 'No GPS metadata found in PNG eXIf chunk.'
  };
}

function parseTiffGps(dataView: DataView, tiffOffset: number): GeoTagResult {
  if (dataView.byteLength < tiffOffset + 8) {
    return { hasGeoTag: false, error: 'Truncated TIFF header' };
  }

  // Byte order: 0x4949 = Little Endian ('II'), 0x4D4D = Big Endian ('MM')
  const byteOrder = dataView.getUint16(tiffOffset);
  let littleEndian = false;
  if (byteOrder === 0x4949) {
    littleEndian = true;
  } else if (byteOrder === 0x4d4d) {
    littleEndian = false;
  } else {
    return { hasGeoTag: false, error: 'Invalid byte order in TIFF header' };
  }

  // Check 42 (0x002A)
  if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 0x002a) {
    return { hasGeoTag: false, error: 'Invalid TIFF identifier' };
  }

  const ifd0Offset = dataView.getUint32(tiffOffset + 4, littleEndian);
  if (tiffOffset + ifd0Offset + 2 > dataView.byteLength) {
    return { hasGeoTag: false, error: 'Invalid IFD0 offset' };
  }

  // Find GPSInfo IFD pointer (Tag 0x8825)
  const gpsInfoOffset = findTagValue(dataView, tiffOffset, tiffOffset + ifd0Offset, 0x8825, littleEndian);
  if (gpsInfoOffset === null) {
    return {
      hasGeoTag: false,
      error: 'No GPS IFD pointer (Tag 0x8825) found in EXIF'
    };
  }

  const gpsIfdStart = tiffOffset + gpsInfoOffset;
  if (gpsIfdStart + 2 > dataView.byteLength) {
    return { hasGeoTag: false, error: 'Invalid GPS IFD offset' };
  }

  // Parse GPS tags
  // 0x0001: GPSLatitudeRef ('N' or 'S')
  // 0x0002: GPSLatitude (3 Rationals: Deg, Min, Sec)
  // 0x0003: GPSLongitudeRef ('E' or 'W')
  // 0x0004: GPSLongitude (3 Rationals: Deg, Min, Sec)
  // 0x0005: GPSAltitudeRef
  // 0x0006: GPSAltitude (1 Rational)
  const latRefStr = readAsciiTag(dataView, tiffOffset, gpsIfdStart, 0x0001, littleEndian);
  const latCoords = readRationalCoords(dataView, tiffOffset, gpsIfdStart, 0x0002, littleEndian);
  const lngRefStr = readAsciiTag(dataView, tiffOffset, gpsIfdStart, 0x0003, littleEndian);
  const lngCoords = readRationalCoords(dataView, tiffOffset, gpsIfdStart, 0x0004, littleEndian);

  if (latCoords === null || lngCoords === null) {
    return {
      hasGeoTag: false,
      error: 'EXIF GPS tags are present but incomplete (missing latitude/longitude values).'
    };
  }

  let lat = latCoords;
  if (latRefStr && latRefStr.trim().toUpperCase() === 'S') {
    lat = -lat;
  }

  let lng = lngCoords;
  if (lngRefStr && lngRefStr.trim().toUpperCase() === 'W') {
    lng = -lng;
  }

  // Sanity check coordinates
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
    return {
      hasGeoTag: false,
      error: 'EXIF coordinates are invalid or zero.'
    };
  }

  // Altitude
  let altitude: number | undefined = undefined;
  const altRational = readSingleRational(dataView, tiffOffset, gpsIfdStart, 0x0006, littleEndian);
  if (altRational !== null) {
    altitude = Number(altRational.toFixed(1));
  }

  return {
    hasGeoTag: true,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    altitude,
    source: 'exif'
  };
}

function findTagValue(
  dataView: DataView,
  _tiffOffset: number,
  ifdStart: number,
  targetTag: number,
  littleEndian: boolean
): number | null {
  if (ifdStart + 2 > dataView.byteLength) return null;
  const numEntries = dataView.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) return null;
    const tag = dataView.getUint16(entryOffset, littleEndian);
    if (tag === targetTag) {
      return dataView.getUint32(entryOffset + 8, littleEndian);
    }
  }
  return null;
}

function readAsciiTag(
  dataView: DataView,
  tiffOffset: number,
  ifdStart: number,
  targetTag: number,
  littleEndian: boolean
): string | null {
  if (ifdStart + 2 > dataView.byteLength) return null;
  const numEntries = dataView.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) return null;
    const tag = dataView.getUint16(entryOffset, littleEndian);
    if (tag === targetTag) {
      const charCode = dataView.getUint8(entryOffset + 8);
      return String.fromCharCode(charCode);
    }
  }
  return null;
}

function readRationalCoords(
  dataView: DataView,
  tiffOffset: number,
  ifdStart: number,
  targetTag: number,
  littleEndian: boolean
): number | null {
  if (ifdStart + 2 > dataView.byteLength) return null;
  const numEntries = dataView.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) return null;
    const tag = dataView.getUint16(entryOffset, littleEndian);
    if (tag === targetTag) {
      const count = dataView.getUint32(entryOffset + 4, littleEndian);
      if (count !== 3) return null;
      const valOffset = tiffOffset + dataView.getUint32(entryOffset + 8, littleEndian);
      if (valOffset + 24 > dataView.byteLength) return null;

      const degNum = dataView.getUint32(valOffset, littleEndian);
      const degDen = dataView.getUint32(valOffset + 4, littleEndian) || 1;
      const minNum = dataView.getUint32(valOffset + 8, littleEndian);
      const minDen = dataView.getUint32(valOffset + 12, littleEndian) || 1;
      const secNum = dataView.getUint32(valOffset + 16, littleEndian);
      const secDen = dataView.getUint32(valOffset + 20, littleEndian) || 1;

      const deg = degNum / degDen;
      const min = minNum / minDen;
      const sec = secNum / secDen;

      return deg + min / 60 + sec / 3600;
    }
  }
  return null;
}

function readSingleRational(
  dataView: DataView,
  tiffOffset: number,
  ifdStart: number,
  targetTag: number,
  littleEndian: boolean
): number | null {
  if (ifdStart + 2 > dataView.byteLength) return null;
  const numEntries = dataView.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) return null;
    const tag = dataView.getUint16(entryOffset, littleEndian);
    if (tag === targetTag) {
      const valOffset = tiffOffset + dataView.getUint32(entryOffset + 8, littleEndian);
      if (valOffset + 8 > dataView.byteLength) return null;
      const num = dataView.getUint32(valOffset, littleEndian);
      const den = dataView.getUint32(valOffset + 4, littleEndian) || 1;
      return num / den;
    }
  }
  return null;
}
