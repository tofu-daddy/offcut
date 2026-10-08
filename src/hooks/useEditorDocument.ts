import { useCallback, useRef, useState } from "react";
import { History } from "../editor/history";
import {
  createLayerId,
  snapshotOf,
  DEFAULT_VERTICAL_SLICES,
  VERTICAL_SLICES_COUNT_MAX,
  VERTICAL_SLICES_COUNT_MIN,
  VERTICAL_SLICES_OFFSET_MAX,
  type DestinationTransform,
  type EditorDocument,
  type OriginalImage,
  type ShapeType,
  type SliceLayer,
  type SourceRegion,
  type ToolMode,
  type VerticalSlicesSettings,
} from "../editor/types";

function emptyDocument(): EditorDocument {
  return {
    original: null,
    layers: [],
    selectedLayerId: null,
    activeShape: "square",
    verticalSlices: { ...DEFAULT_VERTICAL_SLICES },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface EditorApi {
  doc: EditorDocument;
  canUndo: boolean;
  canRedo: boolean;
  setOriginal: (original: OriginalImage) => void;
  setActiveShape: (shape: ToolMode) => void;
  selectLayer: (id: string | null) => void;
  createSlice: (shape: ShapeType, source: SourceRegion, destination: DestinationTransform) => string;
  beginGesture: () => void;
  updateSelectedDestination: (patch: Partial<DestinationTransform>) => void;
  commitGesture: () => void;
  cancelGesture: () => void;
  flipSelected: (axis: "horizontal" | "vertical") => void;
  rotateSelected90: () => void;
  deleteSelected: () => void;
  deleteLayer: (id: string) => void;
  /** Discrete, immediately-committed step (one undo entry per +/- press). */
  setSliceCount: (count: number) => void;
  /** Live update during a slider drag; pair with beginGesture/commitGesture. */
  updateVerticalSlices: (patch: Partial<VerticalSlicesSettings>) => void;
  flipVerticalSlices: (axis: "horizontal" | "vertical") => void;
  rotateVerticalSlices90: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export function useEditorDocument(): EditorApi {
  const [doc, setDocState] = useState<EditorDocument>(emptyDocument);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const docRef = useRef(doc);
  const historyRef = useRef(new History());
  const gestureBaselineRef = useRef<ReturnType<typeof snapshotOf> | null>(null);

  // docRef.current is mutated synchronously here (not inside React's
  // deferred state updater) so that code reading it immediately after a
  // same-tick setDoc call — e.g. commitGesture's change-detection — always
  // sees the latest value, regardless of when React gets around to
  // reconciling the corresponding re-render.
  const setDoc = useCallback((updater: (prev: EditorDocument) => EditorDocument) => {
    const next = updater(docRef.current);
    docRef.current = next;
    setDocState(next);
  }, []);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const pushHistory = useCallback(() => {
    historyRef.current.push(snapshotOf(docRef.current));
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const setOriginal = useCallback(
    (original: OriginalImage) => {
      historyRef.current.clear();
      syncHistoryFlags();
      setDoc(() => ({
        original,
        layers: [],
        selectedLayerId: null,
        activeShape: "square",
        verticalSlices: { ...DEFAULT_VERTICAL_SLICES },
      }));
    },
    [setDoc, syncHistoryFlags],
  );

  const setActiveShape = useCallback(
    (shape: ToolMode) => {
      setDoc((prev) => ({ ...prev, activeShape: shape }));
    },
    [setDoc],
  );

  const selectLayer = useCallback(
    (id: string | null) => {
      setDoc((prev) => ({ ...prev, selectedLayerId: id }));
    },
    [setDoc],
  );

  const createSlice = useCallback(
    (shape: ShapeType, source: SourceRegion, destination: DestinationTransform): string => {
      pushHistory();
      const id = createLayerId();
      setDoc((prev) => {
        const maxOrder = prev.layers.reduce((m, l) => Math.max(m, l.order), -1);
        const layer: SliceLayer = { id, shape, source, destination, order: maxOrder + 1 };
        return { ...prev, layers: [...prev.layers, layer], selectedLayerId: id };
      });
      return id;
    },
    [pushHistory, setDoc],
  );

  const beginGesture = useCallback(() => {
    gestureBaselineRef.current = snapshotOf(docRef.current);
  }, []);

  const updateSelectedDestination = useCallback(
    (patch: Partial<DestinationTransform>) => {
      setDoc((prev) => {
        if (!prev.selectedLayerId) return prev;
        return {
          ...prev,
          layers: prev.layers.map((l) =>
            l.id === prev.selectedLayerId ? { ...l, destination: { ...l.destination, ...patch } } : l,
          ),
        };
      });
    },
    [setDoc],
  );

  const commitGesture = useCallback(() => {
    const baseline = gestureBaselineRef.current;
    gestureBaselineRef.current = null;
    if (!baseline) return;
    // Compare layers AND verticalSlices (not just layers) so a vertical-
    // slices rotation/offset drag — which never touches `layers` — is
    // still detected as a change and gets its own undo entry.
    const changed =
      JSON.stringify(baseline.layers) !== JSON.stringify(docRef.current.layers) ||
      JSON.stringify(baseline.verticalSlices) !== JSON.stringify(docRef.current.verticalSlices);
    if (!changed) return;
    historyRef.current.push(baseline);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const cancelGesture = useCallback(() => {
    const baseline = gestureBaselineRef.current;
    gestureBaselineRef.current = null;
    if (!baseline) return;
    setDoc((prev) => ({
      ...prev,
      layers: baseline.layers,
      selectedLayerId: baseline.selectedLayerId,
      verticalSlices: baseline.verticalSlices,
    }));
  }, [setDoc]);

  const flipSelected = useCallback(
    (axis: "horizontal" | "vertical") => {
      if (!docRef.current.selectedLayerId) return;
      pushHistory();
      setDoc((prev) => ({
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === prev.selectedLayerId
            ? {
                ...l,
                destination: {
                  ...l.destination,
                  flipH: axis === "horizontal" ? !l.destination.flipH : l.destination.flipH,
                  flipV: axis === "vertical" ? !l.destination.flipV : l.destination.flipV,
                },
              }
            : l,
        ),
      }));
    },
    [pushHistory, setDoc],
  );

  const rotateSelected90 = useCallback(() => {
    if (!docRef.current.selectedLayerId) return;
    pushHistory();
    setDoc((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === prev.selectedLayerId
          ? { ...l, destination: { ...l.destination, rotation: (l.destination.rotation + 90) % 360 } }
          : l,
      ),
    }));
  }, [pushHistory, setDoc]);

  const setSliceCount = useCallback(
    (count: number) => {
      const clamped = clamp(Math.round(count), VERTICAL_SLICES_COUNT_MIN, VERTICAL_SLICES_COUNT_MAX);
      if (clamped === docRef.current.verticalSlices.sliceCount) return;
      pushHistory();
      setDoc((prev) => ({ ...prev, verticalSlices: { ...prev.verticalSlices, sliceCount: clamped } }));
    },
    [pushHistory, setDoc],
  );

  const updateVerticalSlices = useCallback(
    (patch: Partial<VerticalSlicesSettings>) => {
      const safePatch = { ...patch };
      if (safePatch.offsetPx !== undefined) {
        safePatch.offsetPx = clamp(safePatch.offsetPx, -VERTICAL_SLICES_OFFSET_MAX, VERTICAL_SLICES_OFFSET_MAX);
      }
      setDoc((prev) => ({ ...prev, verticalSlices: { ...prev.verticalSlices, ...safePatch } }));
    },
    [setDoc],
  );

  const flipVerticalSlices = useCallback(
    (axis: "horizontal" | "vertical") => {
      pushHistory();
      setDoc((prev) => ({
        ...prev,
        verticalSlices: {
          ...prev.verticalSlices,
          flipH: axis === "horizontal" ? !prev.verticalSlices.flipH : prev.verticalSlices.flipH,
          flipV: axis === "vertical" ? !prev.verticalSlices.flipV : prev.verticalSlices.flipV,
        },
      }));
    },
    [pushHistory, setDoc],
  );

  const rotateVerticalSlices90 = useCallback(() => {
    pushHistory();
    setDoc((prev) => ({
      ...prev,
      verticalSlices: { ...prev.verticalSlices, rotationDeg: prev.verticalSlices.rotationDeg + 90 },
    }));
  }, [pushHistory, setDoc]);

  const deleteLayer = useCallback(
    (id: string) => {
      pushHistory();
      setDoc((prev) => ({
        ...prev,
        layers: prev.layers.filter((l) => l.id !== id),
        selectedLayerId: prev.selectedLayerId === id ? null : prev.selectedLayerId,
      }));
    },
    [pushHistory, setDoc],
  );

  const deleteSelected = useCallback(() => {
    const id = docRef.current.selectedLayerId;
    if (!id) return;
    deleteLayer(id);
  }, [deleteLayer]);

  const undo = useCallback(() => {
    const prevSnap = historyRef.current.undo(snapshotOf(docRef.current));
    if (!prevSnap) return;
    setDoc((prev) => ({
      ...prev,
      layers: prevSnap.layers,
      selectedLayerId: prevSnap.selectedLayerId,
      activeShape: prevSnap.activeShape,
      verticalSlices: prevSnap.verticalSlices,
    }));
    syncHistoryFlags();
  }, [setDoc, syncHistoryFlags]);

  const redo = useCallback(() => {
    const nextSnap = historyRef.current.redo(snapshotOf(docRef.current));
    if (!nextSnap) return;
    setDoc((prev) => ({
      ...prev,
      layers: nextSnap.layers,
      selectedLayerId: nextSnap.selectedLayerId,
      activeShape: nextSnap.activeShape,
      verticalSlices: nextSnap.verticalSlices,
    }));
    syncHistoryFlags();
  }, [setDoc, syncHistoryFlags]);

  const reset = useCallback(() => {
    historyRef.current.clear();
    syncHistoryFlags();
    setDoc(() => emptyDocument());
  }, [setDoc, syncHistoryFlags]);

  return {
    doc,
    canUndo,
    canRedo,
    setOriginal,
    setActiveShape,
    selectLayer,
    createSlice,
    beginGesture,
    updateSelectedDestination,
    commitGesture,
    cancelGesture,
    flipSelected,
    rotateSelected90,
    deleteSelected,
    deleteLayer,
    setSliceCount,
    updateVerticalSlices,
    flipVerticalSlices,
    rotateVerticalSlices90,
    undo,
    redo,
    reset,
  };
}
