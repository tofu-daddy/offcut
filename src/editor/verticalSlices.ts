import {
  VERTICAL_SLICES_GAP,
  VERTICAL_SLICES_HEIGHT_FRACTION,
  VERTICAL_SLICES_OFFSET_MAX,
  VERTICAL_SLICES_WIDTH_FRACTION,
  type VerticalSlicesSettings,
} from "./types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Layout for the vertical-slices composition, entirely in ORIGINAL IMAGE
 * coordinates, local to the composition's own center (i.e. (0,0) is the
 * composition center — callers translate by `center` before drawing, then
 * rotate/flip, matching the same transform order the existing per-layer
 * renderer already uses).
 */
export interface VerticalSlicesLayout {
  center: { x: number; y: number };
  rotationRad: number;
  flipH: boolean;
  flipV: boolean;
  /** The single fixed "backdrop" image placement every strip clips a window into. */
  backdrop: {
    /** Source rect sampled from the original image (cover-fit). */
    source: Rect;
    /** Where the backdrop is drawn, local to the composition center. */
    local: Rect;
  };
  /** Each strip's clip window, local to the composition center. */
  strips: Rect[];
}

/**
 * Computes strip/backdrop geometry for the given settings against an image
 * of size imageWidth x imageHeight. Pure and resolution-independent, so the
 * exact same layout (scaled only by the caller's canvas transform) drives
 * both the live preview and the full-resolution export.
 */
export function computeVerticalSlicesLayout(
  settings: VerticalSlicesSettings,
  imageWidth: number,
  imageHeight: number,
): VerticalSlicesLayout {
  const { sliceCount, offsetPx, rotationDeg, flipH, flipV } = settings;

  const compWidth = imageWidth * VERTICAL_SLICES_WIDTH_FRACTION;
  const windowHeight = imageHeight * VERTICAL_SLICES_HEIGHT_FRACTION;
  const stripWidth = (compWidth - (sliceCount - 1) * VERTICAL_SLICES_GAP) / sliceCount;

  // The backdrop must contain enough vertical source content to support
  // sliding the sampling window by up to the offset slider's max in either
  // direction without running past the source image's own bounds.
  const sourceBoxWidth = compWidth;
  const sourceBoxHeight = windowHeight + 2 * VERTICAL_SLICES_OFFSET_MAX;

  const coverScale = Math.max(sourceBoxWidth / imageWidth, sourceBoxHeight / imageHeight);
  const coverSrcWidth = sourceBoxWidth / coverScale;
  const coverSrcHeight = sourceBoxHeight / coverScale;
  const coverSrcX = (imageWidth - coverSrcWidth) / 2;
  const coverSrcY = (imageHeight - coverSrcHeight) / 2;

  const strips: Rect[] = [];
  for (let i = 0; i < sliceCount; i++) {
    const localX = -compWidth / 2 + i * (stripWidth + VERTICAL_SLICES_GAP);
    const shift = i % 2 === 0 ? -offsetPx : offsetPx;
    const localY = -windowHeight / 2 + shift;
    strips.push({ x: localX, y: localY, width: stripWidth, height: windowHeight });
  }

  return {
    center: { x: imageWidth / 2, y: imageHeight / 2 },
    rotationRad: (rotationDeg * Math.PI) / 180,
    flipH,
    flipV,
    backdrop: {
      source: { x: coverSrcX, y: coverSrcY, width: coverSrcWidth, height: coverSrcHeight },
      local: { x: -sourceBoxWidth / 2, y: -sourceBoxHeight / 2, width: sourceBoxWidth, height: sourceBoxHeight },
    },
    strips,
  };
}

/**
 * The bounding box of all strips after rotation/flip (flip alone doesn't
 * change the axis-aligned extent, but is accepted for symmetry/clarity),
 * local to the composition center — i.e. still relative to (0,0), not yet
 * translated by `layout.center`. Used to size the export canvas tightly
 * around just the visible strips, per "export bounds: the bounding box of
 * the rotated strips."
 */
export function verticalSlicesBoundingBox(layout: VerticalSlicesLayout): Rect {
  const cos = Math.cos(layout.rotationRad);
  const sin = Math.sin(layout.rotationRad);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const strip of layout.strips) {
    const corners: [number, number][] = [
      [strip.x, strip.y],
      [strip.x + strip.width, strip.y],
      [strip.x, strip.y + strip.height],
      [strip.x + strip.width, strip.y + strip.height],
    ];
    for (const [lx, ly] of corners) {
      // Flip is a reflection about the center, applied before rotation in
      // the draw transform; it maps the strip set onto itself as a whole
      // (strips are symmetric about the vertical/horizontal center lines
      // only in aggregate), so for a tight bounds we flip each corner too.
      const fx = layout.flipH ? -lx : lx;
      const fy = layout.flipV ? -ly : ly;
      const rx = fx * cos - fy * sin;
      const ry = fx * sin + fy * cos;
      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
