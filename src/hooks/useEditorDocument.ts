import { useCallback, useRef, useState } from "react";
import { History } from "../editor/history";
import {
  createLayerId,
  snapshotOf,
  type DestinationTransform,
  type EditorDocument,
  type OriginalImage,
  type ShapeType,
  type SliceLayer,
  type SourceRegion,
} from "../editor/types";

function emptyDocument(): EditorDocument {
  return { original: null, layers: [], selectedLayerId: null, activeShape: "square" };
}

export interface EditorApi {
  doc: EditorDocument;
  canUndo: boolean;
  canRedo: boolean;
  setOriginal: (original: OriginalImage) => void;
  setActiveShape: (shape: ShapeType) => void;
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
      setDoc(() => ({ original, layers: [], selectedLayerId: null, activeShape: "square" }));
    },
    [setDoc, syncHistoryFlags],
  );

  const setActiveShape = useCallback(
    (shape: ShapeType) => {
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
    const changed = JSON.stringify(baseline.layers) !== JSON.stringify(docRef.current.layers);
    if (!changed) return;
    historyRef.current.push(baseline);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const cancelGesture = useCallback(() => {
    const baseline = gestureBaselineRef.current;
    gestureBaselineRef.current = null;
    if (!baseline) return;
    setDoc((prev) => ({ ...prev, layers: baseline.layers, selectedLayerId: baseline.selectedLayerId }));
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
    undo,
    redo,
    reset,
  };
}
