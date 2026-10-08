import { describe, expect, it } from "vitest";
import { createViewport, imageToPreview, previewToImage } from "../viewport";

describe("createViewport", () => {
  it("computes a uniform scale that fits the image into the preview box", () => {
    const vp = createViewport(1000, 500, 200, 100);
    expect(vp.scale).toBeCloseTo(0.2);
    expect(vp.offsetX).toBeCloseTo(0);
    expect(vp.offsetY).toBeCloseTo(0);
  });

  it("letterboxes and centers when the preview aspect ratio differs", () => {
    const vp = createViewport(100, 100, 200, 100);
    // scale limited by height (100/100=1), leaving horizontal letterbox
    expect(vp.scale).toBeCloseTo(1);
    expect(vp.offsetX).toBeCloseTo(50);
    expect(vp.offsetY).toBeCloseTo(0);
  });

  it("falls back to a safe default for degenerate (zero) dimensions", () => {
    const vp = createViewport(0, 0, 200, 100);
    expect(vp.scale).toBe(1);
  });
});

describe("imageToPreview / previewToImage", () => {
  it("round-trips a point through image -> preview -> image", () => {
    const vp = createViewport(848, 1264, 354, 515);
    const imagePoint = { x: 400, y: 900 };
    const preview = imageToPreview(vp, imagePoint);
    const back = previewToImage(vp, preview);
    expect(back.x).toBeCloseTo(imagePoint.x, 5);
    expect(back.y).toBeCloseTo(imagePoint.y, 5);
  });

  it("maps image origin to the letterbox offset in preview space", () => {
    const vp = createViewport(100, 100, 200, 100);
    const preview = imageToPreview(vp, { x: 0, y: 0 });
    expect(preview.x).toBeCloseTo(vp.offsetX);
    expect(preview.y).toBeCloseTo(vp.offsetY);
  });
});
