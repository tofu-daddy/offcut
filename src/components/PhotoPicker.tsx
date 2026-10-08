import { useCallback, useRef, useState } from "react";
import samplePhotoUrl from "../assets/sample-photo.jpg";
import { ImageLoadError, loadImageFromFile, loadImageFromUrl } from "../editor/imageLoader";
import type { OriginalImage } from "../editor/types";

interface PhotoPickerProps {
  onImageLoaded: (image: OriginalImage) => void;
}

export function PhotoPicker({ onImageLoaded }: PhotoPickerProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (fn: () => Promise<OriginalImage>) => {
      setStatus("loading");
      setError(null);
      try {
        const image = await fn();
        setStatus("idle");
        onImageLoaded(image);
      } catch (err) {
        setStatus("error");
        setError(err instanceof ImageLoadError ? err.message : "Something went wrong loading this photo.");
      }
    },
    [onImageLoaded],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      load(() => loadImageFromFile(file));
    },
    [load],
  );

  const handleSample = useCallback(() => {
    load(() => loadImageFromUrl(samplePhotoUrl));
  }, [load]);

  return (
    <div className="photo-picker">
      <div className="photo-picker-title-block">
        <h1 className="photo-picker-title">Slice &amp; Place</h1>
        <p className="photo-picker-subtitle">Choose a photo to begin slicing</p>
      </div>

      <div
        className={isDragOver ? "photo-dropzone photo-dropzone-active" : "photo-dropzone"}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {status === "loading" ? (
          <p className="photo-picker-status" role="status">
            Loading photo…
          </p>
        ) : (
          <>
            <p className="photo-picker-hint">Drag a photo here</p>
            <button type="button" className="photo-picker-button" onClick={() => inputRef.current?.click()}>
              Choose a photo
            </button>
            <button type="button" className="photo-picker-button photo-picker-button-secondary" onClick={handleSample}>
              Use sample photo
            </button>
          </>
        )}
      </div>

      {status === "error" && error && (
        <p className="photo-picker-error" role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="photo-picker-input"
        onChange={(e) => handleFiles(e.target.files)}
        aria-label="Choose a photo file"
      />
    </div>
  );
}
