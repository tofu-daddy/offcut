/**
 * Core document model for Slice & Place.
 *
 * The original image is never mutated. Every slice layer stores the
 * region it sampled from the original (source) separately from where it is
 * drawn (destination transform), so repeated edits never re-crop an
 * already-transformed bitmap.
 */

export type ShapeType = "square" | "circle" | "triangle";

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

export interface EditorDocument {
  original: OriginalImage | null;
  layers: SliceLayer[];
  selectedLayerId: string | null;
  activeShape: ShapeType;
}

/** Serializable snapshot of document state used for undo/redo (excludes the image). */
export interface DocumentSnapshot {
  layers: SliceLayer[];
  selectedLayerId: string | null;
  activeShape: ShapeType;
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
  };
}

export function snapshotOf(doc: EditorDocument): DocumentSnapshot {
  return cloneSnapshot({
    layers: doc.layers,
    selectedLayerId: doc.selectedLayerId,
    activeShape: doc.activeShape,
  });
}
