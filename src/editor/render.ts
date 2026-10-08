import { shapeClipPath } from "./geometry";
import type { EditorDocument, OriginalImage, SliceLayer } from "./types";
import { computeVerticalSlicesLayout, type VerticalSlicesLayout } from "./verticalSlices";

export interface RenderOptions {
  /** When set, draws selection handles/outline for this layer. Omit for export. */
  selectedLayerId?: string | null;
}

/**
 * Draws the full document (original + slices) onto a canvas context whose
 * coordinate space is already original-image pixels (caller sets up the
 * ctx transform/scale before calling, e.g. via devicePixelRatio + CSS size).
 *
 * In "vertical-slices" mode the original photo and any square/circle/
 * triangle layers are hidden (per the design frame) and only the sliced
 * composition is drawn — this is an entirely separate mode, not a layer
 * type, so the normal layer-compositing path below is untouched.
 */
export function renderDocument(ctx: CanvasRenderingContext2D, doc: EditorDocument, options: RenderOptions = {}): void {
  const { original, layers } = doc;
  if (!original) return;

  if (doc.activeShape === "vertical-slices") {
    const layout = computeVerticalSlicesLayout(doc.verticalSlices, original.width, original.height);
    ctx.save();
    ctx.clearRect(0, 0, original.width, original.height);
    drawVerticalSlices(ctx, layout, original);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, original.width, original.height);
  ctx.drawImage(original.bitmap as CanvasImageSource, 0, 0, original.width, original.height);

  const ordered = [...layers].sort((a, b) => a.order - b.order);
  for (const layer of ordered) {
    drawSliceLayer(ctx, layer, original);
  }
  ctx.restore();

  if (options.selectedLayerId) {
    const selected = layers.find((l) => l.id === options.selectedLayerId);
    if (selected) drawSelectionOverlay(ctx, selected);
  }
}

/**
 * Draws the vertical-slices composition: a single fixed "backdrop" image,
 * revealed through per-strip clip windows that are themselves staggered
 * vertically — i.e. "the image stays fixed and the strips act as windows
 * that slide over it," so a strip's source and destination windows always
 * coincide (same rect, just clipped differently per strip).
 */
export function drawVerticalSlices(
  ctx: CanvasRenderingContext2D,
  layout: VerticalSlicesLayout,
  original: OriginalImage,
): void {
  ctx.save();
  ctx.translate(layout.center.x, layout.center.y);
  ctx.rotate(layout.rotationRad);
  ctx.scale(layout.flipH ? -1 : 1, layout.flipV ? -1 : 1);

  const { backdrop } = layout;
  for (const strip of layout.strips) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(strip.x, strip.y, strip.width, strip.height);
    ctx.clip();
    ctx.drawImage(
      original.bitmap as CanvasImageSource,
      backdrop.source.x,
      backdrop.source.y,
      backdrop.source.width,
      backdrop.source.height,
      backdrop.local.x,
      backdrop.local.y,
      backdrop.local.width,
      backdrop.local.height,
    );
    ctx.restore();
  }

  ctx.restore();
}

function drawSliceLayer(ctx: CanvasRenderingContext2D, layer: SliceLayer, original: EditorDocument["original"]): void {
  if (!original) return;
  const { source, destination, shape } = layer;

  ctx.save();
  ctx.translate(destination.cx, destination.cy);
  ctx.rotate((destination.rotation * Math.PI) / 180);
  ctx.scale(destination.flipH ? -1 : 1, destination.flipV ? -1 : 1);

  const clip = shapeClipPath(shape, destination.size);
  ctx.clip(clip);

  const half = destination.size / 2;
  ctx.drawImage(
    original.bitmap as CanvasImageSource,
    source.x,
    source.y,
    source.size,
    source.size,
    -half,
    -half,
    destination.size,
    destination.size,
  );
  ctx.restore();
}

const SELECTION_COLOR = "#2563eb";

function drawSelectionOverlay(ctx: CanvasRenderingContext2D, layer: SliceLayer): void {
  const { destination } = layer;
  ctx.save();
  ctx.translate(destination.cx, destination.cy);
  ctx.rotate((destination.rotation * Math.PI) / 180);

  const half = destination.size / 2;
  const lineWidth = Math.max(1, destination.size * 0.01);

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.setLineDash([lineWidth * 3, lineWidth * 2]);
  ctx.strokeRect(-half, -half, destination.size, destination.size);
  ctx.setLineDash([]);

  const handleRadius = Math.max(4, destination.size * 0.035);
  const corners: [number, number][] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  ctx.fillStyle = "#ffffff";
  for (const [hx, hy] of corners) {
    ctx.beginPath();
    ctx.arc(hx, hy, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Rotation handle above the top edge.
  const rotHandleDist = half + handleRadius * 3;
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(0, -rotHandleDist);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -rotHandleDist, handleRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/** Rotation handle center in original-image coordinates, for hit-testing pointer gestures. */
export function rotationHandleWorldPosition(layer: SliceLayer): { x: number; y: number } {
  const { destination } = layer;
  const half = destination.size / 2;
  const handleRadius = Math.max(4, destination.size * 0.035);
  const dist = half + handleRadius * 3;
  const rad = (destination.rotation * Math.PI) / 180;
  return {
    x: destination.cx + Math.sin(rad) * dist,
    y: destination.cy - Math.cos(rad) * dist,
  };
}

export function cornerHandleWorldPositions(layer: SliceLayer): { x: number; y: number }[] {
  const { destination } = layer;
  const half = destination.size / 2;
  const rad = (destination.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const local: [number, number][] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  return local.map(([lx, ly]) => ({
    x: destination.cx + lx * cos - ly * sin,
    y: destination.cy + lx * sin + ly * cos,
  }));
}
