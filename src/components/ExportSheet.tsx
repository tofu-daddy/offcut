import { useState } from "react";
import { exportDocument, shareOrDownload, type ExportFormat } from "../editor/export";
import type { EditorDocument } from "../editor/types";

interface ExportSheetProps {
  doc: EditorDocument;
  onClose: () => void;
}

export function ExportSheet({ doc, onClose }: ExportSheetProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [smaller, setSmaller] = useState(false);
  const [state, setState] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const original = doc.original;
  const isLarge = original ? Math.max(original.width, original.height) > 2000 : false;

  const handleExport = async () => {
    if (!original) return;
    setState("exporting");
    setMessage(null);
    try {
      const result = await exportDocument(doc, {
        format,
        maxEdge: smaller ? 1600 : undefined,
      });
      const ext = format === "png" ? "png" : "jpg";
      const outcome = await shareOrDownload(result.blob, `slice-and-place.${ext}`);
      setState("done");
      setMessage(outcome === "shared" ? "Shared successfully." : "Downloaded successfully.");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Export failed. Please try again.");
    }
  };

  return (
    <div className="export-sheet-overlay" onClick={onClose}>
      <div
        className="export-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="export-sheet-title" className="export-sheet-title">
          Export
        </h2>

        <fieldset className="export-field">
          <legend className="export-field-legend">Format</legend>
          <div className="export-format-row">
            <label className="export-radio">
              <input
                type="radio"
                name="format"
                checked={format === "png"}
                onChange={() => setFormat("png")}
              />
              PNG
            </label>
            <label className="export-radio">
              <input
                type="radio"
                name="format"
                checked={format === "jpeg"}
                onChange={() => setFormat("jpeg")}
              />
              JPEG
            </label>
          </div>
        </fieldset>

        {isLarge && (
          <label className="export-checkbox">
            <input type="checkbox" checked={smaller} onChange={(e) => setSmaller(e.target.checked)} />
            Use a smaller output size (faster, less memory)
          </label>
        )}

        {state === "exporting" && (
          <p className="export-status" role="status">
            Exporting…
          </p>
        )}
        {state === "done" && message && (
          <p className="export-status" role="status">
            {message}
          </p>
        )}
        {state === "error" && message && (
          <p className="export-status export-status-error" role="alert">
            {message}
          </p>
        )}

        <div className="export-sheet-actions">
          <button type="button" className="photo-picker-button photo-picker-button-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="photo-picker-button"
            onClick={handleExport}
            disabled={state === "exporting" || !original}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
