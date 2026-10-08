import { describe, expect, it, vi } from "vitest";
import { DEFAULT_VERTICAL_SLICES, type EditorDocument } from "../types";
import { computeVerticalSlicesLayout, verticalSlicesBoundingBox } from "../verticalSlices";

vi.mock("../render", () => ({
  renderDocument: vi.fn(),
  drawVerticalSlices: vi.fn(),
}));

import { exportDocument } from "../export";
import { drawVerticalSlices, renderDocument } from "../render";

function fakeCanvas() {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
  };
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (cb: (b: Blob | null) => void, type?: string) => {
      cb(new Blob(["fake"], { type: type ?? "image/png" }));
    },
    _ctx: ctx,
  };
}

function makeDoc(): EditorDocument {
  return {
    original: { bitmap: {} as ImageBitmap, width: 800, height: 400 },
    layers: [
      {
        id: "a",
        shape: "circle",
        source: { x: 0, y: 0, size: 100 },
        destination: { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
        order: 0,
      },
    ],
    selectedLayerId: "a",
    activeShape: "circle",
    verticalSlices: { ...DEFAULT_VERTICAL_SLICES },
  };
}

describe("exportDocument", () => {
  it("renders without passing selectedLayerId, so export never draws selection overlays", async () => {
    const canvas = fakeCanvas();
    vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

    const doc = makeDoc();
    await exportDocument(doc, { format: "png" });

    expect(renderDocument).toHaveBeenCalledTimes(1);
    const [, , options] = (renderDocument as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options).toBeUndefined();

    vi.restoreAllMocks();
  });

  it("exports at full original resolution when no maxEdge is given", async () => {
    const canvas = fakeCanvas();
    vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

    const doc = makeDoc();
    const result = await exportDocument(doc, { format: "png" });

    expect(result.width).toBe(800);
    expect(result.height).toBe(400);
    vi.restoreAllMocks();
  });

  it("downsamples proportionally when maxEdge is smaller than the image", async () => {
    const canvas = fakeCanvas();
    vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

    const doc = makeDoc();
    const result = await exportDocument(doc, { format: "jpeg", maxEdge: 400 });

    expect(result.width).toBe(400);
    expect(result.height).toBe(200);
    vi.restoreAllMocks();
  });

  it("throws when there is no original image", async () => {
    const doc = makeDoc();
    doc.original = null;
    await expect(exportDocument(doc, { format: "png" })).rejects.toThrow();
  });

  describe("vertical-slices mode", () => {
    function makeVerticalSlicesDoc(): EditorDocument {
      return {
        original: { bitmap: {} as ImageBitmap, width: 800, height: 400 },
        layers: [],
        selectedLayerId: null,
        activeShape: "vertical-slices",
        verticalSlices: { ...DEFAULT_VERTICAL_SLICES },
      };
    }

    it("sizes the output canvas to the rotated strips' bounding box, not the full image", async () => {
      const canvas = fakeCanvas();
      vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

      const doc = makeVerticalSlicesDoc();
      const layout = computeVerticalSlicesLayout(doc.verticalSlices, 800, 400);
      const bbox = verticalSlicesBoundingBox(layout);

      const result = await exportDocument(doc, { format: "png" });

      expect(result.width).toBe(Math.round(bbox.width));
      expect(result.height).toBe(Math.round(bbox.height));
      // bounding box is tighter than the full (hidden) original image
      expect(result.width).toBeLessThan(800);
      vi.restoreAllMocks();
    });

    it("calls drawVerticalSlices (not renderDocument's normal layer path)", async () => {
      const canvas = fakeCanvas();
      vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

      const doc = makeVerticalSlicesDoc();
      await exportDocument(doc, { format: "png" });

      expect(drawVerticalSlices).toHaveBeenCalledTimes(1);
      expect(renderDocument).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("translates the composition so the bounding box's top-left lands at the canvas origin", async () => {
      const canvas = fakeCanvas();
      vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

      const doc = makeVerticalSlicesDoc();
      const layout = computeVerticalSlicesLayout(doc.verticalSlices, 800, 400);
      const bbox = verticalSlicesBoundingBox(layout);

      await exportDocument(doc, { format: "png" });

      const [, passedLayout] = (drawVerticalSlices as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedLayout.center.x).toBeCloseTo(-bbox.x, 4);
      expect(passedLayout.center.y).toBeCloseTo(-bbox.y, 4);
      vi.restoreAllMocks();
    });

    it("downsamples the bounding-box export proportionally when maxEdge is smaller", async () => {
      const canvas = fakeCanvas();
      vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);

      const doc = makeVerticalSlicesDoc();
      const layout = computeVerticalSlicesLayout(doc.verticalSlices, 800, 400);
      const bbox = verticalSlicesBoundingBox(layout);
      const longEdge = Math.max(bbox.width, bbox.height);

      const result = await exportDocument(doc, { format: "png", maxEdge: longEdge / 2 });

      expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(Math.round(longEdge / 2) + 1);
      vi.restoreAllMocks();
    });
  });
});
