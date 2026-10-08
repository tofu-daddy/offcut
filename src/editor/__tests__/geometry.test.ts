import { describe, expect, it } from "vitest";
import {
  hitTestLayer,
  localToWorld,
  normalizeDragToSquare,
  pointInShapeLocal,
  worldToLocal,
} from "../geometry";
import type { DestinationTransform } from "../types";

function baseDestination(overrides: Partial<DestinationTransform> = {}): DestinationTransform {
  return { cx: 100, cy: 100, size: 50, rotation: 0, flipH: false, flipV: false, ...overrides };
}

describe("worldToLocal / localToWorld", () => {
  it("round-trips an unrotated, unflipped destination", () => {
    const dest = baseDestination();
    const world = { x: 110, y: 90 };
    const local = worldToLocal(world, dest);
    const back = localToWorld(local, dest);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it("places the destination center at local origin", () => {
    const dest = baseDestination();
    const local = worldToLocal({ x: dest.cx, y: dest.cy }, dest);
    expect(local.x).toBeCloseTo(0);
    expect(local.y).toBeCloseTo(0);
  });

  it("round-trips through a rotated, flipped destination", () => {
    const dest = baseDestination({ rotation: 37, flipH: true, flipV: true });
    const world = { x: 123, y: 64 };
    const local = worldToLocal(world, dest);
    const back = localToWorld(local, dest);
    expect(back.x).toBeCloseTo(world.x, 5);
    expect(back.y).toBeCloseTo(world.y, 5);
  });

  it("maps the unrotated top-right corner to local (0.5, -0.5)", () => {
    const dest = baseDestination();
    // top-right corner in world space: cx + size/2, cy - size/2
    const local = worldToLocal({ x: dest.cx + 25, y: dest.cy - 25 }, dest);
    expect(local.x).toBeCloseTo(0.5);
    expect(local.y).toBeCloseTo(-0.5);
  });
});

describe("pointInShapeLocal", () => {
  it("accepts any point inside the unit square for 'square'", () => {
    expect(pointInShapeLocal({ x: 0.49, y: -0.49 }, "square")).toBe(true);
    expect(pointInShapeLocal({ x: -0.5, y: 0.5 }, "square")).toBe(true);
  });

  it("rejects points outside the unit square bounds entirely", () => {
    expect(pointInShapeLocal({ x: 0.6, y: 0 }, "square")).toBe(false);
  });

  it("circle: accepts center and points within radius 0.5, rejects corners", () => {
    expect(pointInShapeLocal({ x: 0, y: 0 }, "circle")).toBe(true);
    expect(pointInShapeLocal({ x: 0.49, y: 0 }, "circle")).toBe(true);
    // corner of the bounding square is outside the inscribed circle
    expect(pointInShapeLocal({ x: 0.49, y: 0.49 }, "circle")).toBe(false);
  });

  it("triangle: accepts the apex-adjacent center, rejects the top corners", () => {
    expect(pointInShapeLocal({ x: 0, y: 0.4 }, "triangle")).toBe(true);
    // top-left / top-right corners of the bounding square are outside the triangle
    expect(pointInShapeLocal({ x: -0.49, y: -0.49 }, "triangle")).toBe(false);
    expect(pointInShapeLocal({ x: 0.49, y: -0.49 }, "triangle")).toBe(false);
    // apex itself is on the triangle
    expect(pointInShapeLocal({ x: 0, y: -0.5 }, "triangle")).toBe(true);
  });
});

describe("hitTestLayer", () => {
  it("hits a rotated square at its rotated corner region but not the original axis-aligned corner", () => {
    const dest = baseDestination({ rotation: 45 });
    // The original (unrotated) top-right corner world point should now fall
    // outside the diamond-rotated square's footprint along that axis.
    const originalCorner = { x: dest.cx + 24, y: dest.cy - 24 };
    expect(hitTestLayer(originalCorner, "square", dest)).toBe(false);

    // The center is always inside regardless of rotation.
    expect(hitTestLayer({ x: dest.cx, y: dest.cy }, "square", dest)).toBe(true);
  });

  it("hit-tests a flipped triangle using the correct (mirrored) mask", () => {
    const dest = baseDestination({ flipV: true });
    const offset = 0.4 * dest.size;
    // Off-center so the point only falls inside the triangle near the wide
    // base, not the narrow apex (x=0 is on the centerline and always inside,
    // so it wouldn't actually exercise the flip).
    // Unflipped, local (0.4, 0.4) (near the wide base) is inside; flipping
    // vertically mirrors the mask, so the corresponding point near the TOP
    // of the bounding box should now be inside instead, and the bottom
    // should now be outside.
    const nearTopWorld = { x: dest.cx + offset, y: dest.cy - offset };
    expect(hitTestLayer(nearTopWorld, "triangle", dest)).toBe(true);

    const nearBottomWorld = { x: dest.cx + offset, y: dest.cy + offset };
    expect(hitTestLayer(nearBottomWorld, "triangle", dest)).toBe(false);
  });
});

describe("normalizeDragToSquare", () => {
  it("normalizes a drag in any direction, anchoring one corner at the drag start", () => {
    // size is the larger of |dx| and |dy| (40 vs 20), and the region is
    // anchored so its corner at the drag-start point is exact, extending by
    // that uniform size in the direction of the drag on both axes.
    const region = normalizeDragToSquare({ x: 50, y: 50 }, { x: 10, y: 30 }, 1000, 1000);
    expect(region.size).toBeCloseTo(40);
    expect(region.x).toBeCloseTo(10);
    expect(region.y).toBeCloseTo(10);
  });

  it("uses the larger dimension to keep the region square", () => {
    const region = normalizeDragToSquare({ x: 0, y: 0 }, { x: 30, y: 10 }, 1000, 1000);
    expect(region.size).toBeCloseTo(30);
  });

  it("clamps the region within image bounds", () => {
    const region = normalizeDragToSquare({ x: 90, y: 90 }, { x: 150, y: 150 }, 100, 100);
    expect(region.x + region.size).toBeLessThanOrEqual(100);
    expect(region.y + region.size).toBeLessThanOrEqual(100);
    expect(region.size).toBeLessThanOrEqual(100);
  });

  it("never produces a negative size", () => {
    const region = normalizeDragToSquare({ x: 5, y: 5 }, { x: 5, y: 5 }, 100, 100);
    expect(region.size).toBeGreaterThanOrEqual(0);
  });
});
