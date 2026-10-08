import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { hitTestLayer, normalizeDragToSquare } from "../editor/geometry";
import { cornerHandleWorldPositions, renderDocument, rotationHandleWorldPosition } from "../editor/render";
import { MIN_DEST_SIZE, MIN_SOURCE_SIZE, type DestinationTransform, type SliceLayer } from "../editor/types";
import { createViewport, imageToPreview, previewToImage, type Point } from "../editor/viewport";
import type { EditorApi } from "../hooks/useEditorDocument";
import { TrashIcon } from "./icons/Icons";

interface PhotoCanvasProps {
  editor: EditorApi;
  onAnnounce: (message: string) => void;
}

type GestureMode =
  | { kind: "none" }
  | { kind: "creating"; start: Point }
  | { kind: "moving"; pointerStart: Point; centerStart: Point }
  | { kind: "resizing"; centerStart: Point; distStart: number; sizeStart: number }
  | { kind: "rotating"; centerStart: Point };

const HANDLE_HIT_RADIUS = 18;

export function PhotoCanvas({ editor, onAnnounce }: PhotoCanvasProps) {
  const { doc } = editor;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });
  const modeRef = useRef<GestureMode>({ kind: "none" });
  const [dragGuide, setDragGuide] = useState<{ x: number; y: number; size: number } | null>(null);
  const dragGuideRef = useRef<{ x: number; y: number; size: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);
  const movedRef = useRef(false);

  const scheduleFrame = useCallback((fn: () => void) => {
    pendingRef.current = fn;
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      pendingRef.current?.();
      pendingRef.current = null;
    });
  }, []);

  // Track available space; the fitted box is computed from this + the image aspect ratio.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setWrapperSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const original0 = doc.original;
  const containerSize = useMemo(() => {
    if (!original0 || wrapperSize.width === 0 || wrapperSize.height === 0) {
      return { width: 0, height: 0 };
    }
    const ratio = original0.width / original0.height;
    const availableRatio = wrapperSize.width / wrapperSize.height;
    if (availableRatio > ratio) {
      const height = wrapperSize.height;
      return { width: height * ratio, height };
    }
    const width = wrapperSize.width;
    return { width, height: width / ratio };
  }, [original0, wrapperSize.width, wrapperSize.height]);

  // Pure function of (image size, box size) — safe to compute during render
  // and share between the paint effect and the pointer handlers below.
  const vp = useMemo(() => {
    if (!original0 || containerSize.width === 0 || containerSize.height === 0) return null;
    return createViewport(original0.width, original0.height, containerSize.width, containerSize.height);
  }, [original0, containerSize]);

  const selectedLayer: SliceLayer | undefined = doc.layers.find((l) => l.id === doc.selectedLayerId);

  const deleteButtonPos = useMemo(() => {
    if (!selectedLayer || !vp) return null;
    const topRight = cornerHandleWorldPositions(selectedLayer)[1];
    return imageToPreview(vp, topRight);
  }, [selectedLayer, vp]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const original = doc.original;
    if (!canvas || !original || !vp) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pixelWidth = Math.max(1, Math.round(containerSize.width * dpr));
    const pixelHeight = Math.max(1, Math.round(containerSize.height * dpr));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(vp.scale * dpr, 0, 0, vp.scale * dpr, vp.offsetX * dpr, vp.offsetY * dpr);
    ctx.clearRect(0, 0, original.width, original.height);
    renderDocument(ctx, doc, { selectedLayerId: doc.selectedLayerId });

    if (dragGuide) {
      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = Math.max(1, 2 / vp.scale);
      ctx.setLineDash([6 / vp.scale, 4 / vp.scale]);
      ctx.strokeRect(dragGuide.x, dragGuide.y, dragGuide.size, dragGuide.size);
      ctx.restore();
    }
  }, [doc, containerSize, dragGuide, vp]);

  useLayoutEffect(() => {
    draw();
  }, [draw]);

  const getPointerImagePoint = (e: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas || !vp) return null;
    const rect = canvas.getBoundingClientRect();
    const preview: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return previewToImage(vp, preview);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const original = doc.original;
    if (!original || !vp) return;
    const imagePoint = getPointerImagePoint(e);
    if (!imagePoint) return;

    movedRef.current = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    // 1. Handle hit-test (only when a layer is selected).
    if (selectedLayer) {
      const previewPoint: Point = { x: e.clientX, y: e.clientY };
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const localPreview: Point = { x: previewPoint.x - canvasRect.left, y: previewPoint.y - canvasRect.top };

      const rotHandle = imageToPreview(vp, rotationHandleWorldPosition(selectedLayer));
      if (Math.hypot(localPreview.x - rotHandle.x, localPreview.y - rotHandle.y) <= HANDLE_HIT_RADIUS) {
        editor.beginGesture();
        modeRef.current = { kind: "rotating", centerStart: { x: selectedLayer.destination.cx, y: selectedLayer.destination.cy } };
        return;
      }

      const corners = cornerHandleWorldPositions(selectedLayer);
      for (const corner of corners) {
        const p = imageToPreview(vp, corner);
        if (Math.hypot(localPreview.x - p.x, localPreview.y - p.y) <= HANDLE_HIT_RADIUS) {
          editor.beginGesture();
          const center = { x: selectedLayer.destination.cx, y: selectedLayer.destination.cy };
          modeRef.current = {
            kind: "resizing",
            centerStart: center,
            distStart: Math.hypot(imagePoint.x - center.x, imagePoint.y - center.y),
            sizeStart: selectedLayer.destination.size,
          };
          return;
        }
      }
    }

    // 2. Layer hit-test, topmost first.
    const ordered = [...doc.layers].sort((a, b) => b.order - a.order);
    for (const layer of ordered) {
      if (hitTestLayer(imagePoint, layer.shape, layer.destination)) {
        if (doc.selectedLayerId !== layer.id) editor.selectLayer(layer.id);
        editor.beginGesture();
        modeRef.current = {
          kind: "moving",
          pointerStart: imagePoint,
          centerStart: { x: layer.destination.cx, y: layer.destination.cy },
        };
        return;
      }
    }

    // 3. Empty space: deselect, and start a new slice if within photo bounds.
    if (doc.selectedLayerId) editor.selectLayer(null);
    const withinBounds =
      imagePoint.x >= 0 && imagePoint.x <= original.width && imagePoint.y >= 0 && imagePoint.y <= original.height;
    if (withinBounds) {
      dragGuideRef.current = null;
      modeRef.current = { kind: "creating", start: imagePoint };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const mode = modeRef.current;
    if (mode.kind === "none") return;
    const imagePoint = getPointerImagePoint(e);
    if (!imagePoint) return;
    const original = doc.original;
    if (!original) return;
    movedRef.current = true;

    if (mode.kind === "creating") {
      const region = normalizeDragToSquare(mode.start, imagePoint, original.width, original.height);
      dragGuideRef.current = region;
      scheduleFrame(() => {
        setDragGuide(region);
      });
    } else if (mode.kind === "moving") {
      const dx = imagePoint.x - mode.pointerStart.x;
      const dy = imagePoint.y - mode.pointerStart.y;
      scheduleFrame(() => {
        editor.updateSelectedDestination({ cx: mode.centerStart.x + dx, cy: mode.centerStart.y + dy });
      });
    } else if (mode.kind === "resizing") {
      const dist = Math.hypot(imagePoint.x - mode.centerStart.x, imagePoint.y - mode.centerStart.y);
      const ratio = mode.distStart > 0 ? dist / mode.distStart : 1;
      const newSize = Math.max(MIN_DEST_SIZE, mode.sizeStart * ratio);
      scheduleFrame(() => {
        editor.updateSelectedDestination({ size: newSize });
      });
    } else if (mode.kind === "rotating") {
      const dx = imagePoint.x - mode.centerStart.x;
      const dy = imagePoint.y - mode.centerStart.y;
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      scheduleFrame(() => {
        editor.updateSelectedDestination({ rotation: deg });
      });
    }
  };

  const finishGesture = () => {
    if (rafIdRef.current != null) {
      // A gesture can end (pointerup/cancel) before the browser's next
      // animation frame — don't drop the latest pending update, apply it
      // now so the gesture's final position/size/rotation isn't lost.
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      pending?.();
    }
    const mode = modeRef.current;
    const original = doc.original;

    if (mode.kind === "creating" && original) {
      const region = dragGuideRef.current;
      if (region && region.size >= MIN_SOURCE_SIZE) {
        const destination: DestinationTransform = {
          cx: region.x + region.size / 2,
          cy: region.y + region.size / 2,
          size: region.size,
          rotation: 0,
          flipH: false,
          flipV: false,
        };
        editor.createSlice(doc.activeShape, { x: region.x, y: region.y, size: region.size }, destination);
        onAnnounce(`${doc.activeShape} slice created`);
      }
      dragGuideRef.current = null;
      setDragGuide(null);
    } else if (mode.kind === "moving" || mode.kind === "resizing" || mode.kind === "rotating") {
      editor.commitGesture();
    }
    modeRef.current = { kind: "none" };
  };

  const handlePointerUp = () => finishGesture();
  const handlePointerCancel = () => {
    if (rafIdRef.current != null) {
      // A gesture can end (pointerup/cancel) before the browser's next
      // animation frame — don't drop the latest pending update, apply it
      // now so the gesture's final position/size/rotation isn't lost.
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      pending?.();
    }
    const mode = modeRef.current;
    if (mode.kind === "creating") {
      dragGuideRef.current = null;
      setDragGuide(null);
    } else {
      editor.cancelGesture();
    }
    modeRef.current = { kind: "none" };
  };

  const handleDeleteSelected = () => {
    if (!doc.selectedLayerId) return;
    editor.deleteSelected();
    onAnnounce("Slice deleted");
  };

  return (
    <div className="photo-canvas-wrapper" ref={wrapperRef}>
      <div
        className="photo-canvas-container"
        ref={containerRef}
        style={{ width: containerSize.width, height: containerSize.height }}
      >
        <canvas
          ref={canvasRef}
          className="photo-canvas"
          style={{ width: containerSize.width, height: containerSize.height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          role="img"
          aria-label={selectedLayer ? `Photo with ${selectedLayer.shape} slice selected` : "Photo preview"}
        />
        {doc.layers.length === 0 && !dragGuide && (
          <p className="canvas-hint" aria-hidden="true">
            Drag on the photo to create a slice
          </p>
        )}
        {selectedLayer && deleteButtonPos && (
          <button
            type="button"
            className="slice-delete-button"
            style={{ left: deleteButtonPos.x, top: deleteButtonPos.y }}
            onClick={handleDeleteSelected}
            aria-label="Delete selected slice"
          >
            <TrashIcon width={14} height={14} />
          </button>
        )}
      </div>
    </div>
  );
}
