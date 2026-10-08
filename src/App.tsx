import { useCallback, useEffect, useRef, useState } from "react";
import { ExportSheet } from "./components/ExportSheet";
import { Header } from "./components/Header";
import { OffsetSlider } from "./components/OffsetSlider";
import { PhotoCanvas } from "./components/PhotoCanvas";
import { PhotoPicker } from "./components/PhotoPicker";
import { RotationSlider } from "./components/RotationSlider";
import { ShapeSelector } from "./components/ShapeSelector";
import { SliceCountStepper } from "./components/SliceCountStepper";
import { TransformToolbar } from "./components/TransformToolbar";
import { releaseOriginalImage } from "./editor/imageLoader";
import { DEFAULT_VERTICAL_SLICES, type OriginalImage } from "./editor/types";
import { useEditorDocument } from "./hooks/useEditorDocument";
import "./App.css";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export default function App() {
  const editor = useEditorDocument();
  const { doc } = editor;

  const [exportOpen, setExportOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const previousOriginalRef = useRef<OriginalImage | null>(null);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const handleImageLoaded = useCallback(
    (image: OriginalImage) => {
      releaseOriginalImage(previousOriginalRef.current);
      previousOriginalRef.current = image;
      editor.setOriginal(image);
      announce("Photo loaded");
    },
    [editor, announce],
  );

  useEffect(() => {
    return () => {
      releaseOriginalImage(previousOriginalRef.current);
    };
  }, []);

  const hasVerticalSlicesEdits =
    JSON.stringify(doc.verticalSlices) !== JSON.stringify(DEFAULT_VERTICAL_SLICES);

  const handleBack = useCallback(() => {
    if (doc.layers.length > 0 || hasVerticalSlicesEdits) {
      setDiscardConfirmOpen(true);
    } else {
      releaseOriginalImage(previousOriginalRef.current);
      previousOriginalRef.current = null;
      editor.reset();
    }
  }, [doc.layers.length, hasVerticalSlicesEdits, editor]);

  const confirmDiscard = useCallback(() => {
    setDiscardConfirmOpen(false);
    releaseOriginalImage(previousOriginalRef.current);
    previousOriginalRef.current = null;
    editor.reset();
  }, [editor]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || exportOpen || discardConfirmOpen) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && doc.selectedLayerId) {
        e.preventDefault();
        editor.deleteSelected();
        announce("Slice deleted");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, doc.selectedLayerId, exportOpen, discardConfirmOpen, announce]);

  if (!doc.original) {
    return <PhotoPicker onImageLoaded={handleImageLoaded} />;
  }

  const hasSelection = doc.selectedLayerId !== null;
  const isVerticalSlices = doc.activeShape === "vertical-slices";
  // Vertical-slices mode has no "selected layer" — the whole composition is
  // always the implicit transform target, so flip/rotate stay enabled.
  const canTransform = isVerticalSlices ? true : hasSelection;

  return (
    <div className="app-shell">
      <Header onBack={handleBack} onExport={() => setExportOpen(true)} exportDisabled={false} />

      <div className="canvas-area">
        <PhotoCanvas editor={editor} onAnnounce={announce} />
        {isVerticalSlices && (
          <OffsetSlider
            offsetPx={doc.verticalSlices.offsetPx}
            onBeginGesture={editor.beginGesture}
            onChange={(offsetPx) => editor.updateVerticalSlices({ offsetPx })}
            onCommitGesture={editor.commitGesture}
          />
        )}
      </div>

      <div className={isVerticalSlices ? "bottom-controls bottom-controls-vertical-slices" : "bottom-controls"}>
        <TransformToolbar
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          hasSelection={canTransform}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onFlipHorizontal={() =>
            isVerticalSlices ? editor.flipVerticalSlices("horizontal") : editor.flipSelected("horizontal")
          }
          onFlipVertical={() =>
            isVerticalSlices ? editor.flipVerticalSlices("vertical") : editor.flipSelected("vertical")
          }
          onRotate={isVerticalSlices ? editor.rotateVerticalSlices90 : editor.rotateSelected90}
        />
        {isVerticalSlices && (
          <>
            <SliceCountStepper count={doc.verticalSlices.sliceCount} onChange={editor.setSliceCount} />
            <RotationSlider
              rotationDeg={doc.verticalSlices.rotationDeg}
              onBeginGesture={editor.beginGesture}
              onChange={(rotationDeg) => editor.updateVerticalSlices({ rotationDeg })}
              onCommitGesture={editor.commitGesture}
            />
          </>
        )}
        <ShapeSelector activeShape={doc.activeShape} onSelect={editor.setActiveShape} />
      </div>

      {exportOpen && <ExportSheet doc={doc} onClose={() => setExportOpen(false)} />}

      {discardConfirmOpen && (
        <div className="export-sheet-overlay" onClick={() => setDiscardConfirmOpen(false)}>
          <div className="export-sheet" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="discard-title" className="export-sheet-title">
              Discard edits?
            </h2>
            <p className="photo-picker-subtitle">This photo has unsaved slice edits that will be lost.</p>
            <div className="export-sheet-actions">
              <button type="button" className="photo-picker-button photo-picker-button-secondary" onClick={() => setDiscardConfirmOpen(false)}>
                Keep editing
              </button>
              <button type="button" className="photo-picker-button" onClick={confirmDiscard}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}
