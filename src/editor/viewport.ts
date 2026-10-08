/**
 * Viewport: maps between original-image pixel coordinates and the on-screen
 * preview (CSS pixel) coordinates. Pointer events arrive in CSS pixels
 * relative to the canvas element's bounding box, which is the same space
 * this module calls "preview" coordinates.
 */

export interface Viewport {
  imageWidth: number;
  imageHeight: number;
  /** CSS pixel size of the preview element. */
  previewWidth: number;
  previewHeight: number;
  /** Scale from image pixels to preview (CSS) pixels. */
  scale: number;
  /** Offset (in preview CSS px) where image-space (0,0) lands — for letterboxing. */
  offsetX: number;
  offsetY: number;
}

export function createViewport(
  imageWidth: number,
  imageHeight: number,
  previewWidth: number,
  previewHeight: number,
): Viewport {
  if (imageWidth <= 0 || imageHeight <= 0 || previewWidth <= 0 || previewHeight <= 0) {
    return {
      imageWidth,
      imageHeight,
      previewWidth,
      previewHeight,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }
  // cover-fit: the photo fills the preview box exactly (box already matches aspect ratio
  // in this app since the canvas container sizes itself to the image's aspect ratio).
  const scale = Math.min(previewWidth / imageWidth, previewHeight / imageHeight);
  const offsetX = (previewWidth - imageWidth * scale) / 2;
  const offsetY = (previewHeight - imageHeight * scale) / 2;
  return { imageWidth, imageHeight, previewWidth, previewHeight, scale, offsetX, offsetY };
}

export interface Point {
  x: number;
  y: number;
}

export function imageToPreview(vp: Viewport, p: Point): Point {
  return {
    x: p.x * vp.scale + vp.offsetX,
    y: p.y * vp.scale + vp.offsetY,
  };
}

export function previewToImage(vp: Viewport, p: Point): Point {
  return {
    x: (p.x - vp.offsetX) / vp.scale,
    y: (p.y - vp.offsetY) / vp.scale,
  };
}

export function imageLengthToPreview(vp: Viewport, len: number): number {
  return len * vp.scale;
}

export function previewLengthToImage(vp: Viewport, len: number): number {
  return len / vp.scale;
}
