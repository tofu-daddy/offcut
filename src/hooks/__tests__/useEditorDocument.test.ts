import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEditorDocument } from "../useEditorDocument";

function setOriginal(hook: ReturnType<typeof renderHook<ReturnType<typeof useEditorDocument>, unknown>>) {
  act(() => {
    hook.result.current.setOriginal({ bitmap: {} as ImageBitmap, width: 800, height: 600 });
  });
}

describe("useEditorDocument", () => {
  it("creating a slice pushes one history entry and selects it", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });

    expect(hook.result.current.doc.layers).toHaveLength(1);
    expect(hook.result.current.doc.selectedLayerId).toBe(hook.result.current.doc.layers[0].id);
    expect(hook.result.current.canUndo).toBe(true);
    expect(hook.result.current.canRedo).toBe(false);
  });

  it("a full move gesture (begin -> many updates -> commit) creates exactly one history entry", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });

    act(() => {
      hook.result.current.beginGesture();
      hook.result.current.updateSelectedDestination({ cx: 60, cy: 60 });
      hook.result.current.updateSelectedDestination({ cx: 70, cy: 70 });
      hook.result.current.updateSelectedDestination({ cx: 80, cy: 80 });
      hook.result.current.commitGesture();
    });

    expect(hook.result.current.doc.layers[0].destination.cx).toBe(80);

    // Exactly one undo step should revert the whole gesture, back to pre-move.
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.doc.layers[0].destination.cx).toBe(50);
  });

  it("a gesture that ends without any net change does not create a history entry", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });
    const undoCountAfterCreate = hook.result.current.canUndo;
    expect(undoCountAfterCreate).toBe(true);

    act(() => {
      hook.result.current.beginGesture();
      hook.result.current.commitGesture();
    });

    // Undo once should go all the way back to "no layers" (the create), not
    // leave a spurious no-op entry in between.
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.doc.layers).toHaveLength(0);
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("selecting a layer or changing the active shape does not add history", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });

    act(() => {
      hook.result.current.selectLayer(null);
      hook.result.current.setActiveShape("circle");
    });

    // Still only the one history entry from createSlice.
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.doc.layers).toHaveLength(0);
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("flip and rotate each create independent, undoable history entries", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });

    act(() => {
      hook.result.current.flipSelected("horizontal");
    });
    expect(hook.result.current.doc.layers[0].destination.flipH).toBe(true);

    act(() => {
      hook.result.current.rotateSelected90();
    });
    expect(hook.result.current.doc.layers[0].destination.rotation).toBe(90);

    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.doc.layers[0].destination.rotation).toBe(0);
    expect(hook.result.current.doc.layers[0].destination.flipH).toBe(true);

    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.doc.layers[0].destination.flipH).toBe(false);
  });

  it("a new edit after undo clears the redo branch", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });
    act(() => {
      hook.result.current.rotateSelected90();
    });
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.canRedo).toBe(true);

    act(() => {
      hook.result.current.flipSelected("vertical");
    });
    expect(hook.result.current.canRedo).toBe(false);
  });

  it("deleteSelected removes the layer and is itself undoable", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    act(() => {
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      );
    });

    act(() => {
      hook.result.current.deleteSelected();
    });
    expect(hook.result.current.doc.layers).toHaveLength(0);
    expect(hook.result.current.doc.selectedLayerId).toBeNull();

    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.doc.layers).toHaveLength(1);
  });
});
