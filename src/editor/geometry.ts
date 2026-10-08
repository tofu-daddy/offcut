import type { DestinationTransform, ShapeType } from "./types";
import type { Point } from "./viewport";

const DEG2RAD = Math.PI / 180;

/**
 * Transforms a point from ORIGINAL IMAGE space into the slice's local,
 * unrotated/unflipped/unscaled space, where the slice occupies
 * [-0.5, 0.5] x [-0.5, 0.5]. This is the inverse of the draw transform,
 * and is the basis for accurate hit-testing of rotated/flipped shapes.
 */
export function worldToLocal(point: Point, dest: DestinationTransform): Point {
  const dx = point.x - dest.cx;
  const dy = point.y - dest.cy;
  const rad = -dest.rotation * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let x = dx * cos - dy * sin;
  let y = dx * sin + dy * cos;
  // Undo scale to unit square.
  x /= dest.size;
  y /= dest.size;
  // Undo flips (flip is self-inverse).
  if (dest.flipH) x = -x;
  if (dest.flipV) y = -y;
  return { x, y };
}

export function localToWorld(point: Point, dest: DestinationTransform): Point {
  let x = point.x;
  let y = point.y;
  if (dest.flipH) x = -x;
  if (dest.flipV) y = -y;
  x *= dest.size;
  y *= dest.size;
  const rad = dest.rotation * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const wx = x * cos - y * sin;
  const wy = x * sin + y * cos;
  return { x: wx + dest.cx, y: wy + dest.cy };
}

/** Hit-test a point (in original-image coords) against a shape's local unit-square mask. */
export function pointInShapeLocal(local: Point, shape: ShapeType): boolean {
  const { x, y } = local;
  if (x < -0.5 || x > 0.5 || y < -0.5 || y > 0.5) return false;
  switch (shape) {
    case "square":
      return true;
    case "circle":
      return x * x + y * y <= 0.25;
    case "triangle":
      return pointInUpwardTriangleUnitSquare(x, y);
  }
}

/**
 * Upright, centered triangle inscribed in the unit square [-0.5,0.5]^2:
 * apex at top-center, base along the bottom edge.
 */
function pointInUpwardTriangleUnitSquare(x: number, y: number): boolean {
  // Vertices: apex (0, -0.5), base-left (-0.5, 0.5), base-right (0.5, 0.5)
  const apex = { x: 0, y: -0.5 };
  const left = { x: -0.5, y: 0.5 };
  const right = { x: 0.5, y: 0.5 };
  return sameSide(x, y, apex, left, right) && sameSide(x, y, left, right, apex) && sameSide(x, y, right, apex, left);
}

function sameSide(px: number, py: number, a: Point, b: Point, ref: Point): boolean {
  const cross1 = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
  const cross2 = (b.x - a.x) * (ref.y - a.y) - (b.y - a.y) * (ref.x - a.x);
  return cross1 * cross2 >= 0;
}

export function hitTestLayer(point: Point, shape: ShapeType, dest: DestinationTransform): boolean {
  const local = worldToLocal(point, dest);
  return pointInShapeLocal(local, shape);
}

/** Builds the Path2D for a shape's mask within a local, axis-aligned size x size square centered at origin. */
export function shapeClipPath(shape: ShapeType, size: number): Path2D {
  const path = new Path2D();
  const half = size / 2;
  switch (shape) {
    case "square":
      path.rect(-half, -half, size, size);
      break;
    case "circle":
      path.arc(0, 0, half, 0, Math.PI * 2);
      break;
    case "triangle":
      path.moveTo(0, -half);
      path.lineTo(-half, half);
      path.lineTo(half, half);
      path.closePath();
      break;
  }
  return path;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Normalizes a drag rectangle (any direction) into a square source region clamped within image bounds. */
export function normalizeDragToSquare(
  start: Point,
  end: Point,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; size: number } {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  const size = Math.max(w, h);

  let x = minX;
  let y = minY;

  // Keep the square anchored to the drag start corner nearest it, then clamp to bounds.
  if (end.x < start.x) x = start.x - size;
  else x = start.x;
  if (end.y < start.y) y = start.y - size;
  else y = start.y;

  const maxSize = Math.min(imageWidth, imageHeight);
  const clampedSize = clamp(size, 0, maxSize);
  x = clamp(x, 0, Math.max(0, imageWidth - clampedSize));
  y = clamp(y, 0, Math.max(0, imageHeight - clampedSize));

  return { x, y, size: clampedSize };
}
