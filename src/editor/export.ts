import { renderDocument } from "./render";
import type { EditorDocument } from "./types";

export type ExportFormat = "png" | "jpeg";

export interface ExportOptions {
  format: ExportFormat;
  /** 0-1, only used for jpeg. */
  quality?: number;
  /** Max edge length of the output; omit for full original resolution. */
  maxEdge?: number;
}

export interface ExportResult {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Renders the document model (never a screenshot of the live preview) at the
 * requested output resolution, omitting all editor-only selection overlays.
 */
export async function exportDocument(doc: EditorDocument, options: ExportOptions): Promise<ExportResult> {
  if (!doc.original) {
    throw new Error("No image loaded");
  }

  const { width: originalWidth, height: originalHeight } = doc.original;
  let outWidth = originalWidth;
  let outHeight = originalHeight;

  if (options.maxEdge && options.maxEdge > 0) {
    const longEdge = Math.max(originalWidth, originalHeight);
    if (longEdge > options.maxEdge) {
      const scale = options.maxEdge / longEdge;
      outWidth = Math.round(originalWidth * scale);
      outHeight = Math.round(originalHeight * scale);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas context");

  const scale = outWidth / originalWidth;
  ctx.save();
  ctx.scale(scale, scale);
  // selectedLayerId intentionally omitted: export never draws selection handles.
  renderDocument(ctx, doc);
  ctx.restore();

  const mimeType = options.format === "png" ? "image/png" : "image/jpeg";
  const quality = options.format === "jpeg" ? options.quality ?? 0.92 : undefined;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if (!blob) throw new Error("Export failed: could not encode image");

  return { blob, width: outWidth, height: outHeight };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Slice & Place" });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "shared";
      // fall through to download on share failure
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}
