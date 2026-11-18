export interface ExtractedVisualFeatures {
  brightness: number;
  std_dev: number;
  edge_density: number;
  skin_ratio: number;
  green_ratio: number;
  blue_water_ratio: number;
  gray_road_ratio: number;
  brown_earth_ratio: number;
  white_ratio: number;
  saturation: number;
  vector: number[];
}

/**
 * Extracts compact pixel-level visual features + a 40-dimensional visual fingerprint
 * from any base64 image in <15ms using an offscreen HTMLCanvasElement.
 * Powers accurate category prediction, online incremental training, and
 * non-cleanliness photo rejection (selfies, blank walls, dark/covered camera, documents).
 */
export function extractImageVisualFeatures(dataUrl: string): Promise<ExtractedVisualFeatures | null> {
  return new Promise(resolve => {
    if (!dataUrl || typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 64;
        const H = 64;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, W, H);
        const { data } = ctx.getImageData(0, 0, W, H);
        const total = W * H;

        let lumSum = 0;
        let lumSqSum = 0;
        let satSum = 0;
        let skinCount = 0;
        let greenCount = 0;
        let blueWaterCount = 0;
        let grayRoadCount = 0;
        let brownEarthCount = 0;
        let whiteCount = 0;

        const histR = new Array(8).fill(0);
        const histG = new Array(8).fill(0);
        const histB = new Array(8).fill(0);
        const lum = new Float32Array(total);
        const gridSums = new Array(16).fill(0);
        const gridCounts = new Array(16).fill(0);

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const l = 0.299 * r + 0.587 * g + 0.114 * b;
            lum[y * W + x] = l;
            lumSum += l;
            lumSqSum += l * l;

            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const delta = maxC - minC;
            satSum += maxC > 0 ? delta / maxC : 0;

            histR[Math.min(7, r >> 5)] += 1;
            histG[Math.min(7, g >> 5)] += 1;
            histB[Math.min(7, b >> 5)] += 1;

            const gx = Math.min(3, Math.floor((x / W) * 4));
            const gy = Math.min(3, Math.floor((y / H) * 4));
            const gIdx = gy * 4 + gx;
            gridSums[gIdx] += l / 255;
            gridCounts[gIdx] += 1;

            // Skin tone detection (YCbCr / RGB heuristic)
            if (r > 95 && g > 40 && b > 20 && delta > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
              skinCount += 1;
            }
            // Vegetation / fallen tree foliage
            if (g > r + 14 && g > b + 14 && g > 55) {
              greenCount += 1;
            }
            // Water / waterlogging / bluish puddle reflections
            if (b > r + 12 && b > 65 && r < 165) {
              blueWaterCount += 1;
            }
            // Asphalt / road / concrete gray
            if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && r > 40 && r < 178) {
              grayRoadCount += 1;
            }
            // Soil / earth / garbage mound / dirty drainage brown
            if (r > g + 10 && g > b + 8 && r > 65 && r < 195 && b < 115) {
              brownEarthCount += 1;
            }
            // White paper / document / screenshot background
            if (r > 225 && g > 225 && b > 225) {
              whiteCount += 1;
            }
          }
        }

        let edgeAccum = 0;
        let edgePairs = 0;
        for (let y = 0; y < H - 1; y++) {
          for (let x = 0; x < W - 1; x++) {
            const c = lum[y * W + x];
            edgeAccum += Math.abs(c - lum[y * W + (x + 1)]) + Math.abs(c - lum[(y + 1) * W + x]);
            edgePairs += 2;
          }
        }

        const brightness = lumSum / total;
        const variance = Math.max(0, lumSqSum / total - brightness * brightness);
        const std_dev = Math.sqrt(variance);
        const edge_density = edgeAccum / Math.max(1, edgePairs * 255);

        const rawHist = [...histR, ...histG, ...histB];
        const norm = Math.sqrt(rawHist.reduce((acc, v) => acc + v * v, 0)) || 1;
        const normHist = rawHist.map(v => Number((v / norm).toFixed(5)));
        const gridVec = gridSums.map((s, i) => Number((s / Math.max(1, gridCounts[i])).toFixed(5)));

        resolve({
          brightness: Number(brightness.toFixed(2)),
          std_dev: Number(std_dev.toFixed(2)),
          edge_density: Number(edge_density.toFixed(4)),
          skin_ratio: Number((skinCount / total).toFixed(4)),
          green_ratio: Number((greenCount / total).toFixed(4)),
          blue_water_ratio: Number((blueWaterCount / total).toFixed(4)),
          gray_road_ratio: Number((grayRoadCount / total).toFixed(4)),
          brown_earth_ratio: Number((brownEarthCount / total).toFixed(4)),
          white_ratio: Number((whiteCount / total).toFixed(4)),
          saturation: Number((satSum / total).toFixed(4)),
          vector: [...normHist, ...gridVec]
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Local cleanliness relevance gate (runs even when offline or before server response)
 */
export function checkLocalCleanlinessRelevance(
  f: ExtractedVisualFeatures | null
): { isRelevant: boolean; reason?: string } {
  if (!f) return { isRelevant: true };
  if (f.brightness < 18 || f.brightness > 246 || f.std_dev < 13 || f.edge_density < 0.025) {
    return {
      isRelevant: false,
      reason: 'Captured photo is blank, too dark, or out of focus. This photo is not relevant to a cleanliness issue and cannot be submitted.'
    };
  }
  if (f.skin_ratio > 0.25 && f.gray_road_ratio < 0.28) {
    return {
      isRelevant: false,
      reason: 'This photo appears to show a person/selfie rather than a civic cleanliness issue and cannot be submitted.'
    };
  }
  if (f.white_ratio > 0.74 && f.edge_density > 0.05) {
    return {
      isRelevant: false,
      reason: 'This photo appears to be a document, blank wall, or screen capture rather than a cleanliness issue and cannot be submitted.'
    };
  }
  return { isRelevant: true };
}
