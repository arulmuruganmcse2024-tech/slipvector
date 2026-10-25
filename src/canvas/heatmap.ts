/**
 * 2D Gaussian Kernel Density Hazard Heatmap Overlay
 * Visualizes spatial collision probability density over the interactive UI stage.
 */

export function renderGaussianHeatmap(
  ctx: CanvasRenderingContext2D,
  endpoints: Float32Array,
  width: number,
  height: number,
  onlyDestructive: boolean = false
): void {
  const numPoints = endpoints.length / 3;
  if (numPoints === 0) return;

  // Offscreen low-res grid for fast rendering
  const scale = 4;
  const gridW = Math.ceil(width / scale);
  const gridH = Math.ceil(height / scale);

  const grid = new Float32Array(gridW * gridH);
  const radius = 18 / scale;
  const radiusSq = radius * radius;
  const twoSigmaSq = 2 * (radius / 2) * (radius / 2);

  for (let i = 0; i < numPoints; i++) {
    const x = endpoints[i * 3 + 0];
    const y = endpoints[i * 3 + 1];
    const hitCode = endpoints[i * 3 + 2];

    // If onlyDestructive is true, weight destructive hits much higher
    if (onlyDestructive && hitCode !== 1) continue;

    const gx = Math.round(x / scale);
    const gy = Math.round(y / scale);

    const minX = Math.max(0, Math.floor(gx - radius));
    const maxX = Math.min(gridW - 1, Math.ceil(gx + radius));
    const minY = Math.max(0, Math.floor(gy - radius));
    const maxY = Math.min(gridH - 1, Math.ceil(gy + radius));

    const weight = hitCode === 1 ? 2.5 : 0.8;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dSq = (px - gx) * (px - gx) + (py - gy) * (py - gy);
        if (dSq <= radiusSq) {
          const val = weight * Math.exp(-dSq / twoSigmaSq);
          grid[py * gridW + px] += val;
        }
      }
    }
  }

  // Find max density
  let maxDensity = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > maxDensity) maxDensity = grid[i];
  }
  if (maxDensity === 0) return;

  const imgData = ctx.createImageData(gridW, gridH);
  const data = imgData.data;

  for (let i = 0; i < grid.length; i++) {
    const norm = Math.min(1, grid[i] / (maxDensity * 0.75));
    if (norm > 0.05) {
      // Color ramp: Cyan -> Amber -> Crimson
      let r = 0, g = 0, b = 0;
      if (norm < 0.4) {
        // Cyan to Amber
        const t = norm / 0.4;
        r = Math.round(6 + (245 - 6) * t);
        g = Math.round(182 + (158 - 182) * t);
        b = Math.round(212 + (11 - 212) * t);
      } else {
        // Amber to Crimson
        const t = (norm - 0.4) / 0.6;
        r = Math.round(245 + (244 - 245) * t);
        g = Math.round(158 * (1 - t));
        b = Math.round(11 + (94 - 11) * t);
      }
      const alpha = Math.round(norm * 140); // semi-transparent

      const pIdx = i * 4;
      data[pIdx + 0] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = alpha;
    }
  }

  // Draw offscreen grid scaled up smoothly
  const offscreen = document.createElement('canvas');
  offscreen.width = gridW;
  offscreen.height = gridH;
  const offCtx = offscreen.getContext('2d');
  if (offCtx) {
    offCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, width, height);
    ctx.restore();
  }
}
