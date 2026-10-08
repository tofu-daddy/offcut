import { describe, expect, it } from "vitest";
import { DEFAULT_VERTICAL_SLICES, VERTICAL_SLICES_GAP, type VerticalSlicesSettings } from "../types";
import { computeVerticalSlicesLayout, verticalSlicesBoundingBox } from "../verticalSlices";

const IMAGE_W = 848;
const IMAGE_H = 1264;

function settings(overrides: Partial<VerticalSlicesSettings> = {}): VerticalSlicesSettings {
  return { ...DEFAULT_VERTICAL_SLICES, ...overrides };
}

describe("computeVerticalSlicesLayout", () => {
  it("produces exactly N equal-width strips with the fixed gap between destinations", () => {
    const layout = computeVerticalSlicesLayout(settings({ sliceCount: 5 }), IMAGE_W, IMAGE_H);
    expect(layout.strips).toHaveLength(5);

    const widths = new Set(layout.strips.map((s) => Math.round(s.destination.width * 1000)));
    expect(widths.size).toBe(1); // all strips are the same width

    for (let i = 1; i < layout.strips.length; i++) {
      const prev = layout.strips[i - 1].destination;
      const curr = layout.strips[i].destination;
      const gap = curr.x - (prev.x + prev.width);
      expect(gap).toBeCloseTo(VERTICAL_SLICES_GAP, 5);
    }
  });

  it("gives each strip a distinct, non-overlapping, contiguous source band of the image", () => {
    const layout = computeVerticalSlicesLayout(settings({ sliceCount: 5 }), IMAGE_W, IMAGE_H);
    for (let i = 1; i < layout.strips.length; i++) {
      const prevSource = layout.strips[i - 1].source;
      const currSource = layout.strips[i].source;
      // contiguous: this strip's source starts exactly where the previous one's ends
      // (the gap is purely a destination/display concept, not a hole in sampled content)
      expect(currSource.x).toBeCloseTo(prevSource.x + prevSource.width, 3);
      // every strip samples the full source height (no per-strip vertical cropping)
      expect(currSource.height).toBeCloseTo(prevSource.height, 5);
      expect(currSource.y).toBeCloseTo(prevSource.y, 5);
    }
    // no two strips sample the same source pixels
    const xs = layout.strips.map((s) => Math.round(s.source.x * 100));
    expect(new Set(xs).size).toBe(layout.strips.length);
  });

  it("keeps each strip's source fixed regardless of offset — only the destination shifts", () => {
    const noOffset = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: 0 }), IMAGE_W, IMAGE_H);
    const withOffset = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: 60 }), IMAGE_W, IMAGE_H);

    for (let i = 0; i < 5; i++) {
      // the fixed slice of the photo this piece carries never changes...
      expect(withOffset.strips[i].source).toEqual(noOffset.strips[i].source);
      // ...only where it's drawn does.
      expect(withOffset.strips[i].destination.y).not.toBeCloseTo(noOffset.strips[i].destination.y, 1);
    }
  });

  it("staggers even strips' destinations up and odd strips' down by the offset, so adjacent strips differ by 2x", () => {
    const layout = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: 22 }), IMAGE_W, IMAGE_H);
    const [s0, s1, s2] = layout.strips.map((s) => s.destination);
    // even (0) shifted up (smaller y), odd (1) shifted down (larger y)
    expect(s1.y - s0.y).toBeCloseTo(44, 5);
    expect(s1.y - s2.y).toBeCloseTo(44, 5);
    // strip height itself is unaffected by offset
    expect(s0.height).toBeCloseTo(s1.height, 5);
  });

  it("reverses the stagger direction for a negative offset", () => {
    const positive = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: 22 }), IMAGE_W, IMAGE_H);
    const negative = computeVerticalSlicesLayout(settings({ sliceCount: 5, offsetPx: -22 }), IMAGE_W, IMAGE_H);
    const posY = positive.strips[0].destination.y;
    const negY = negative.strips[0].destination.y;
    // strip 0 (even) moves up (smaller y) for +offset and down (larger y) for -offset
    expect(posY).toBeLessThan(negY);
    expect(negY - posY).toBeCloseTo(44, 5);
  });

  it("produces a valid layout at the minimum (2) and maximum (10) slice counts", () => {
    for (const sliceCount of [2, 10]) {
      const layout = computeVerticalSlicesLayout(settings({ sliceCount }), IMAGE_W, IMAGE_H);
      expect(layout.strips).toHaveLength(sliceCount);
      for (const strip of layout.strips) {
        expect(strip.destination.width).toBeGreaterThan(0);
        expect(strip.destination.height).toBeGreaterThan(0);
        expect(strip.source.width).toBeGreaterThan(0);
        expect(strip.source.height).toBeGreaterThan(0);
      }
    }
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
