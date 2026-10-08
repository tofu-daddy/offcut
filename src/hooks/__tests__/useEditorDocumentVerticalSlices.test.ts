import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_VERTICAL_SLICES } from "../../editor/types";
import { useEditorDocument } from "../useEditorDocument";

function setOriginal(hook: ReturnType<typeof renderHook<ReturnType<typeof useEditorDocument>, unknown>>) {
  act(() => {
    hook.result.current.setOriginal({ bitmap: {} as ImageBitmap, width: 800, height: 600 });
  });
}

describe("useEditorDocument — vertical slices", () => {
  it("starts with the documented default settings", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    expect(hook.result.current.doc.verticalSlices).toEqual(DEFAULT_VERTICAL_SLICES);
  });

  it("setSliceCount clamps to [2, 10] and is a no-op outside that range", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => hook.result.current.setSliceCount(1));
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(2);

    act(() => hook.result.current.setSliceCount(99));
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(10);
  });

  it("setSliceCount pushes exactly one undo entry per call", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => hook.result.current.setSliceCount(6));
    act(() => hook.result.current.setSliceCount(7));
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(7);

    act(() => hook.result.current.undo());
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(6);

    act(() => hook.result.current.undo());
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(5);
  });

  it("calling setSliceCount with the current value does not push a no-op history entry", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    expect(hook.result.current.canUndo).toBe(false);

    act(() => hook.result.current.setSliceCount(5)); // already 5
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("a full rotation-slider drag (begin -> many updates -> commit) is exactly one undo step", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => {
      hook.result.current.beginGesture();
      hook.result.current.updateVerticalSlices({ rotationDeg: 10 });
      hook.result.current.updateVerticalSlices({ rotationDeg: 20 });
      hook.result.current.updateVerticalSlices({ rotationDeg: 30 });
      hook.result.current.commitGesture();
    });
    expect(hook.result.current.doc.verticalSlices.rotationDeg).toBe(30);

    act(() => hook.result.current.undo());
    expect(hook.result.current.doc.verticalSlices.rotationDeg).toBe(DEFAULT_VERTICAL_SLICES.rotationDeg);
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("an offset-slider drag clamps live updates to [-80, 80]", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => {
      hook.result.current.beginGesture();
      hook.result.current.updateVerticalSlices({ offsetPx: 500 });
    });
    expect(hook.result.current.doc.verticalSlices.offsetPx).toBe(80);

    act(() => {
      hook.result.current.updateVerticalSlices({ offsetPx: -500 });
      hook.result.current.commitGesture();
    });
    expect(hook.result.current.doc.verticalSlices.offsetPx).toBe(-80);
  });

  it("rotateVerticalSlices90 adds 90 degrees unbounded (not clamped to the slider's +/-45 range)", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => hook.result.current.rotateVerticalSlices90());
    // default rotation is 8 -> 98
    expect(hook.result.current.doc.verticalSlices.rotationDeg).toBe(98);

    act(() => hook.result.current.rotateVerticalSlices90());
    expect(hook.result.current.doc.verticalSlices.rotationDeg).toBe(188);
  });

  it("flipVerticalSlices toggles the given axis independently and is undoable", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => hook.result.current.flipVerticalSlices("horizontal"));
    expect(hook.result.current.doc.verticalSlices.flipH).toBe(true);
    expect(hook.result.current.doc.verticalSlices.flipV).toBe(false);

    act(() => hook.result.current.flipVerticalSlices("vertical"));
    expect(hook.result.current.doc.verticalSlices.flipH).toBe(true);
    expect(hook.result.current.doc.verticalSlices.flipV).toBe(true);

    act(() => hook.result.current.undo());
    expect(hook.result.current.doc.verticalSlices.flipV).toBe(false);
    expect(hook.result.current.doc.verticalSlices.flipH).toBe(true);
  });

  it("switching the active shape mode does not reset or lose vertical-slices settings", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() => hook.result.current.setSliceCount(9));
    act(() => hook.result.current.rotateVerticalSlices90());

    act(() => hook.result.current.setActiveShape("square"));
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(9);
    expect(hook.result.current.doc.verticalSlices.rotationDeg).toBe(98);

    act(() => hook.result.current.setActiveShape("vertical-slices"));
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(9);
    expect(hook.result.current.doc.verticalSlices.rotationDeg).toBe(98);
  });

  it("switching modes does not create a history entry", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);
    expect(hook.result.current.canUndo).toBe(false);

    act(() => hook.result.current.setActiveShape("vertical-slices"));
    act(() => hook.result.current.setActiveShape("circle"));
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("a square-mode slice and vertical-slices settings coexist independently through undo/redo", () => {
    const hook = renderHook(() => useEditorDocument());
    setOriginal(hook);

    act(() =>
      hook.result.current.createSlice(
        "square",
        { x: 0, y: 0, size: 100 },
        { cx: 50, cy: 50, size: 100, rotation: 0, flipH: false, flipV: false },
      ),
    );
    act(() => hook.result.current.setSliceCount(8));

    expect(hook.result.current.doc.layers).toHaveLength(1);
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(8);

    act(() => hook.result.current.undo()); // undoes setSliceCount only
    expect(hook.result.current.doc.verticalSlices.sliceCount).toBe(5);
    expect(hook.result.current.doc.layers).toHaveLength(1); // square slice untouched

    act(() => hook.result.current.undo()); // undoes createSlice
    expect(hook.result.current.doc.layers).toHaveLength(0);
  });
});
