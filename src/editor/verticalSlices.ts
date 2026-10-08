import {
  VERTICAL_SLICES_GAP,
  VERTICAL_SLICES_HEIGHT_FRACTION,
  VERTICAL_SLICES_WIDTH_FRACTION,
  type VerticalSlicesSettings,
} from "./types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VerticalSlicesStrip {
  /** Region sampled from the original image, in original-image pixel coordinates. */
  source: Rect;
  /**
   * Where this strip is drawn, local to the composition's own center (i.e.
   * (0,0) is the composition center — callers translate by `layout.center`
   * before drawing, then rotate/flip, matching the transform order the
   * existing per-layer renderer already uses).
   *
   * This is offset-shifted; `source` is not — each piece carries its own
   * fixed slice of the image with it as it moves, the same source/
   * destination separation every other slice shape already uses (moving a
   * square/circle/triangle slice never changes what it sampled).
   */
  destination: Rect;
}

/**
 * Layout for the vertical-slices composition, entirely in ORIGINAL IMAGE
 * coordinates, local to the composition's own center.
 */
export interface VerticalSlicesLayout {
  center: { x: number; y: number };
  rotationRad: number;
  flipH: boolean;
  flipV: boolean;
  strips: VerticalSlicesStrip[];
}

/**
 * Computes strip geometry for the given settings against an image of size
 * imageWidth x imageHeight. Pure and resolution-independent, so the exact
 * same layout (scaled only by the caller's canvas transform) drives both
 * the live preview and the full-resolution export.
 *
 * Each strip samples a fixed, non-overlapping vertical band of a cover-fit
 * crop of the whole image — strip i's source never changes with offset, so
 * offsetting staggers the strips as rigid pieces, each still showing its
 * own genuine slice of the photo, not a window sliding over one shared
 * backdrop.
 */
export function computeVerticalSlicesLayout(
  settings: VerticalSlicesSettings,
  imageWidth: number,
  imageHeight: number,
): VerticalSlicesLayout {
  const { sliceCount, offsetPx, rotationDeg, flipH, flipV } = settings;

  const compWidth = imageWidth * VERTICAL_SLICES_WIDTH_FRACTION;
  const windowHeight = imageHeight * VERTICAL_SLICES_HEIGHT_FRACTION;
  // Destination strips are narrower than the source cut, making room for
  // the visual gap between them; the source cut itself stays contiguous
  // (cutting the photo loses nothing — the gap is purely how the pieces
  // are displayed, not a skipped band of the image).
  const destStripWidth = (compWidth - (sliceCount - 1) * VERTICAL_SLICES_GAP) / sliceCount;
  const sourceStripWidthLocal = compWidth / sliceCount;

  // Cover-fit crop of the whole image into a compWidth x windowHeight box —
  // the "uncut" framing every strip's source is a sub-rectangle of.
  const coverScale = Math.max(compWidth / imageWidth, windowHeight / imageHeight);
  const coverSrcWidth = compWidth / coverScale;
  const coverSrcHeight = windowHeight / coverScale;
  const coverSrcX = (imageWidth - coverSrcWidth) / 2;
  const coverSrcY = (imageHeight - coverSrcHeight) / 2;
  // Scale factor from the local/composition space used for `compWidth` etc.
  // to original-image pixels, within that cover-fit crop.
  const localToSource = coverSrcWidth / compWidth;

  const strips: VerticalSlicesStrip[] = [];
  for (let i = 0; i < sliceCount; i++) {
    const sourceLocalX = -compWidth / 2 + i * sourceStripWidthLocal;
    const destLocalX = -compWidth / 2 + i * (destStripWidth + VERTICAL_SLICES_GAP);
    const shift = i % 2 === 0 ? -offsetPx : offsetPx;

    const source: Rect = {
      x: coverSrcX + (sourceLocalX + compWidth / 2) * localToSource,
      y: coverSrcY,
      width: sourceStripWidthLocal * localToSource,
      height: coverSrcHeight,
    };
    const destination: Rect = {
      x: destLocalX,
      y: -windowHeight / 2 + shift,
      width: destStripWidth,
      height: windowHeight,
    };
    strips.push({ source, destination });
  }

  return {
    center: { x: imageWidth / 2, y: imageHeight / 2 },
    rotationRad: (rotationDeg * Math.PI) / 180,
    flipH,
    flipV,
    strips,
  };
}

/**
 * The bounding box of all strips' destinations after rotation/flip, local
 * to the composition center — i.e. still relative to (0,0), not yet
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
    const { destination: d } = strip;
    const corners: [number, number][] = [
      [d.x, d.y],
      [d.x + d.width, d.y],
      [d.x, d.y + d.height],
      [d.x + d.width, d.y + d.height],
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
