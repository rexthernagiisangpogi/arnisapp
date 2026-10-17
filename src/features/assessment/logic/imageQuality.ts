import { toByteArray } from "base64-js";
import jpeg from "jpeg-js";
import type { ImagePixelsQuality } from "../types";

export function inspectJpegQuality(base64: string): ImagePixelsQuality | null {
  try {
    const bytes = toByteArray(base64.replace(/^data:image\/[^;]+;base64,/, ""));
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    const { width, height, data } = decoded;
    if (width < 3 || height < 3) return null;

    const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 50000)));
    const grayAt = (x: number, y: number) => {
      const offset = (y * width + x) * 4;
      return (
        0.299 * data[offset] +
        0.587 * data[offset + 1] +
        0.114 * data[offset + 2]
      );
    };
    let luminanceSum = 0;
    let luminanceCount = 0;
    let laplacianSum = 0;
    let laplacianSquaredSum = 0;
    let laplacianCount = 0;

    for (let y = 1; y < height - 1; y += stride) {
      for (let x = 1; x < width - 1; x += stride) {
        const center = grayAt(x, y);
        luminanceSum += center;
        luminanceCount += 1;
        const laplacian =
          4 * center -
          grayAt(x - 1, y) -
          grayAt(x + 1, y) -
          grayAt(x, y - 1) -
          grayAt(x, y + 1);
        laplacianSum += laplacian;
        laplacianSquaredSum += laplacian * laplacian;
        laplacianCount += 1;
      }
    }

    const mean = laplacianSum / Math.max(1, laplacianCount);
    return {
      meanLuminance: luminanceSum / Math.max(1, luminanceCount),
      sharpnessVariance:
        laplacianSquaredSum / Math.max(1, laplacianCount) - mean * mean,
    };
  } catch {
    return null;
  }
}
