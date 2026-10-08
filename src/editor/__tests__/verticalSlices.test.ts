import { describe, expect, it } from "vitest";
import { DEFAULT_VERTICAL_SLICES, VERTICAL_SLICES_GAP, type VerticalSlicesSettings } from "../types";
import { computeVerticalSlicesLayout, verticalSlicesBoundingBox } from "../verticalSlices";

const IMAGE_W = 848;
const IMAGE_H = 1264;

function settings(overrides: Partial<VerticalSlicesSettings> = {}): VerticalSlicesSettings {
  return { ...DEFAULT_VERTICAL_SLICES, ...overrides };
}

describe("computeVerticalSlicesLayout", () => {
  it("produces exactly N equal-width strips with the fixed gap between them", () => {
    const layout = computeVerticalSlicesLayout(settings({ sliceCount: 5 }), IMAGE_W, IMAGE_H);
    expect(layout.strips).toHaveLength(5);

    const widths = new Set(layout.strips.map((s) => Math.round(s.width * 1000)));
    expect(widths.size).toBe(1); // all strips are the same width

    for (let i = 1; i < layout.strips.length; i++) {
      const prev = layout.strips[i - 1];
      const curr = layout.strips[i];
      const gap = curr.x - (prev.x + prev.width);
      expect(gap).toBeCloseTo(VERTICAL_SLICES_GAP, 5);
    }
  });

  it("staggers even strips up and odd strips down by the offset, so adjacent strips differ by 2x", () => {
    const layout = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: 22 }), IMAGE_W, IMAGE_H);
    const [s0, s1, s2] = layout.strips;
    // even (0) shifted up (smaller y), odd (1) shifted down (larger y)
    expect(s1.y - s0.y).toBeCloseTo(44, 5);
    expect(s1.y - s2.y).toBeCloseTo(44, 5);
    // strip height itself is unaffected by offset
    expect(s0.height).toBeCloseTo(s1.height, 5);
  });

  it("reverses the stagger direction for a negative offset", () => {
    const positive = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: 22 }), IMAGE_W, IMAGE_H);
    const negative = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: -22 }), IMAGE_W, IMAGE_H);
    // strip 0 (even) moves up (smaller y) for +offset and down (larger y) for -offset
    expect(positive.strips[0].y).toBeLessThan(negative.strips[0].y);
    expect(negative.strips[0].y - positive.strips[0].y).toBeCloseTo(44, 5);
  });

  it("produces a valid layout at the minimum (2) and maximum (10) slice counts", () => {
    for (const sliceCount of [2, 10]) {
      const layout = computeVerticalSlicesLayout(settings({ sliceCount }), IMAGE_W, IMAGE_H);
      expect(layout.strips).toHaveLength(sliceCount);
      for (const strip of layout.strips) {
        expect(strip.width).toBeGreaterThan(0);
        expect(strip.height).toBeGreaterThan(0);
      }
    }
  });

  it("sizes the backdrop with enough vertical margin to support the max offset slide", () => {
    const layout = computeVerticalSlicesLayout(settings({ offsetPx: 80 }), IMAGE_W, IMAGE_H);
    const strip = layout.strips[0];
    // the shifted strip's far edge must still be within the backdrop's local bounds
    const backdropTop = layout.backdrop.local.y;
    const backdropBottom = layout.backdrop.local.y + layout.backdrop.local.height;
    expect(strip.y).toBeGreaterThanOrEqual(backdropTop - 0.001);
    expect(strip.y + strip.height).toBeLessThanOrEqual(backdropBottom + 0.001);
  });

  it("maps rotationDeg to radians and passes flip flags through unchanged", () => {
    const layout = computeVerticalSlicesLayout(
      settings({ rotationDeg: 90, flipH: true, flipV: false }),
      IMAGE_W,
      IMAGE_H,
    );
    expect(layout.rotationRad).toBeCloseTo(Math.PI / 2, 5);
    expect(layout.flipH).toBe(true);
    expect(layout.flipV).toBe(false);
  });
});

describe("verticalSlicesBoundingBox", () => {
  it("is axis-aligned and symmetric about the center when rotation is 0", () => {
    const layout = computeVerticalSlicesLayout(settings({ rotationDeg: 0, sliceCount: 5 }), IMAGE_W, IMAGE_H);
    const bbox = verticalSlicesBoundingBox(layout);
    // symmetric: right edge distance from 0 equals -left edge distance
    expect(bbox.x + bbox.width).toBeCloseTo(-bbox.x, 4);
  });

  it("grows when the composition is rotated", () => {
    const flat = verticalSlicesBoundingBox(computeVerticalSlicesLayout(settings({ rotationDeg: 0 }), IMAGE_W, IMAGE_H));
    const rotated = verticalSlicesBoundingBox(
      computeVerticalSlicesLayout(settings({ rotationDeg: 45 }), IMAGE_W, IMAGE_H),
    );
    // a 45-degree rotation of a wide, flat strip arrangement increases its axis-aligned extent
    expect(rotated.width + rotated.height).toBeGreaterThan(flat.width + flat.height);
  });

  it("produces the same bounding box for flipH as unflipped (flip is a reflection about center)", () => {
    const unflipped = verticalSlicesBoundingBox(
      computeVerticalSlicesLayout(settings({ flipH: false, rotationDeg: 30 }), IMAGE_W, IMAGE_H),
    );
    const flipped = verticalSlicesBoundingBox(
      computeVerticalSlicesLayout(settings({ flipH: true, rotationDeg: 30 }), IMAGE_W, IMAGE_H),
    );
    expect(flipped.width).toBeCloseTo(unflipped.width, 3);
    expect(flipped.height).toBeCloseTo(unflipped.height, 3);
  });
});
