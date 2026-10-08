/**
 * Core document model for Slice & Place.
 *
 * The original image is never mutated. Every slice layer stores the
 * region it sampled from the original (source) separately from where it is
 * drawn (destination transform), so repeated edits never re-crop an
 * already-transformed bitmap.
 */

export type ShapeType = "square" | "circle" | "triangle";

/** The active tool/mode driving the shape selector — a drag-to-create shape, or the vertical-slices composition mode. */
export type ToolMode = ShapeType | "vertical-slices";

/** A square region in ORIGINAL IMAGE pixel coordinates that a slice samples from. */
export interface SourceRegion {
  x: number;
  y: number;
  size: number;
}

/** Where/how a slice is drawn, in ORIGINAL IMAGE pixel coordinates. */
export interface DestinationTransform {
  /** Center of the slice in original-image coordinates. */
  cx: number;
  cy: number;
  /** Edge length of the slice's destination square, in original-image pixels. */
  size: number;
  /** Rotation in degrees, clockwise, around (cx, cy). */
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export interface SliceLayer {
  id: string;
  shape: ShapeType;
  source: SourceRegion;
  destination: DestinationTransform;
  /** Lower draws first (bottom of stack). */
  order: number;
}

export interface OriginalImage {
  bitmap: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  /** Object URL backing this image, if any — caller owns revocation. */
  objectUrl?: string;
}

/**
 * Settings for the "Vertical slices" mode: splits the whole image into N
 * equal-width vertical strips with a fixed gap, staggered vertically in an
 * alternating pattern, and rotated/flipped as one rigid composition. Lives
 * on the document (not as a SliceLayer) so it persists independently of
 * whatever square/circle/triangle layers exist, satisfying "preserve each
 * mode's settings when switching between modes."
 */
export interface VerticalSlicesSettings {
  /** Number of strips, [VERTICAL_SLICES_COUNT_MIN, VERTICAL_SLICES_COUNT_MAX]. */
  sliceCount: number;
  /** Composition rotation in degrees. The slider clamps dragging to
   * [-VERTICAL_SLICES_ROTATION_MAX, +max], but Rotate 90° can push the
   * stored value beyond that range (unbounded, like other shapes'
   * rotation) — rendering handles any value via sin/cos. */
  rotationDeg: number;
  /** Vertical stagger in original-image pixels; even strips move up by
   * this amount, odd strips move down. [-MAX, +MAX]. */
  offsetPx: number;
  flipH: boolean;
  flipV: boolean;
}

export const VERTICAL_SLICES_COUNT_MIN = 2;
export const VERTICAL_SLICES_COUNT_MAX = 10;
export const VERTICAL_SLICES_ROTATION_MAX = 45;
export const VERTICAL_SLICES_OFFSET_MAX = 80;
/** Fixed visual gap between strips, in original-image pixels. */
export const VERTICAL_SLICES_GAP = 4;
/** Fraction of the image's own width/height the composition occupies before rotation/offset. */
export const VERTICAL_SLICES_WIDTH_FRACTION = 0.8;
export const VERTICAL_SLICES_HEIGHT_FRACTION = 0.75;

export const DEFAULT_VERTICAL_SLICES: VerticalSlicesSettings = {
  sliceCount: 5,
  rotationDeg: 8,
  offsetPx: 22,
  flipH: false,
  flipV: false,
};

export interface EditorDocument {
  original: OriginalImage | null;
  layers: SliceLayer[];
  selectedLayerId: string | null;
  activeShape: ToolMode;
  verticalSlices: VerticalSlicesSettings;
}

/** Serializable snapshot of document state used for undo/redo (excludes the image). */
export interface DocumentSnapshot {
  layers: SliceLayer[];
  selectedLayerId: string | null;
  activeShape: ToolMode;
  verticalSlices: VerticalSlicesSettings;
}

export const MIN_SOURCE_SIZE = 24;
export const MIN_DEST_SIZE = 24;

let nextLayerId = 1;
export function createLayerId(): string {
  return `slice-${nextLayerId++}-${Date.now().toString(36)}`;
}

export function cloneSnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return {
    layers: snapshot.layers.map((l) => ({
      ...l,
      source: { ...l.source },
      destination: { ...l.destination },
    })),
    selectedLayerId: snapshot.selectedLayerId,
    activeShape: snapshot.activeShape,
    verticalSlices: { ...snapshot.verticalSlices },
  };
}

export function snapshotOf(doc: EditorDocument): DocumentSnapshot {
  return cloneSnapshot({
    layers: doc.layers,
    selectedLayerId: doc.selectedLayerId,
    activeShape: doc.activeShape,
    verticalSlices: doc.verticalSlices,
  });
}
