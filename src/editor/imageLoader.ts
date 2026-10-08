import type { OriginalImage } from "./types";

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Working-image cap: downsamples huge photos so mobile memory stays safe. */
export const MAX_WORKING_EDGE = 4096;

export class ImageLoadError extends Error {}

export async function loadImageFromFile(file: File): Promise<OriginalImage> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new ImageLoadError(`Unsupported file type: ${file.type || "unknown"}. Use JPEG, PNG, or WebP.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(objectUrl, objectUrl);
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err instanceof ImageLoadError ? err : new ImageLoadError("Could not read this image.");
  }
}

export async function loadImageFromUrl(url: string, ownedObjectUrl?: string): Promise<OriginalImage> {
  let bitmap: ImageBitmap | HTMLImageElement;
  let width: number;
  let height: number;

  try {
    if (typeof createImageBitmap === "function") {
      const response = await fetch(url);
      const blob = await response.blob();
      bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      width = bitmap.width;
      height = bitmap.height;
    } else {
      bitmap = await loadHtmlImage(url);
      width = bitmap.naturalWidth;
      height = bitmap.naturalHeight;
    }
  } catch {
    throw new ImageLoadError("This image could not be decoded. It may be corrupted or an unsupported format.");
  }

  const { bitmap: workingBitmap, width: workingWidth, height: workingHeight } = await downsampleIfNeeded(
    bitmap,
    width,
    height,
  );

  return { bitmap: workingBitmap, width: workingWidth, height: workingHeight, objectUrl: ownedObjectUrl };
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = url;
  });
}

async function downsampleIfNeeded(
  bitmap: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): Promise<{ bitmap: ImageBitmap | HTMLImageElement; width: number; height: number }> {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_WORKING_EDGE) {
    return { bitmap, width, height };
  }
  const scale = MAX_WORKING_EDGE / longEdge;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { bitmap, width, height };
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetWidth, targetHeight);

  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  if (typeof createImageBitmap === "function") {
    const resized = await createImageBitmap(canvas);
    return { bitmap: resized, width: targetWidth, height: targetHeight };
  }
  const img = await loadHtmlImage(canvas.toDataURL());
  return { bitmap: img, width: targetWidth, height: targetHeight };
}

export function releaseOriginalImage(original: OriginalImage | null): void {
  if (!original) return;
  if ("close" in original.bitmap && typeof original.bitmap.close === "function") {
    original.bitmap.close();
  }
  if (original.objectUrl) URL.revokeObjectURL(original.objectUrl);
}
