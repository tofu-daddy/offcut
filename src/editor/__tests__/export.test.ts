import { describe, expect, it, vi } from "vitest";
import type { EditorDocument } from "../types";

vi.mock("../render", () => ({
  renderDocument: vi.fn(),
}));

import { exportDocument } from "../export";
import { renderDocument } from "../render";

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
});
