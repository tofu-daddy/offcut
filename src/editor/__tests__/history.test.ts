import { describe, expect, it } from "vitest";
import { History } from "../history";
import { DEFAULT_VERTICAL_SLICES, type DocumentSnapshot } from "../types";

function snap(n: number): DocumentSnapshot {
  return {
    layers: [
      {
        id: `layer-${n}`,
        shape: "square",
        source: { x: 0, y: 0, size: 10 },
        destination: { cx: n, cy: n, size: 10, rotation: 0, flipH: false, flipV: false },
        order: 0,
      },
    ],
    selectedLayerId: `layer-${n}`,
    activeShape: "square",
    verticalSlices: { ...DEFAULT_VERTICAL_SLICES },
  };
}

describe("History", () => {
  it("starts with nothing to undo or redo", () => {
    const h = new History();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("undo returns the previously pushed state and enables redo", () => {
    const h = new History();
    h.push(snap(1));
    const result = h.undo(snap(2));
    expect(result?.selectedLayerId).toBe("layer-1");
    expect(h.canRedo()).toBe(true);
    expect(h.canUndo()).toBe(false);
  });

  it("redo replays the undone state", () => {
    const h = new History();
    h.push(snap(1));
    h.undo(snap(2));
    const redone = h.redo(snap(1));
    expect(redone?.selectedLayerId).toBe("layer-2");
  });

  it("a new push after undo clears the redo branch", () => {
    const h = new History();
    h.push(snap(1));
    h.undo(snap(2));
    expect(h.canRedo()).toBe(true);

    h.push(snap(1));
    expect(h.canRedo()).toBe(false);
  });

  it("undo on an empty stack returns null and does not throw", () => {
    const h = new History();
    expect(h.undo(snap(1))).toBeNull();
  });

  it("clear() resets both stacks", () => {
    const h = new History();
    h.push(snap(1));
    h.undo(snap(2));
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("mutating the snapshot object after push does not affect stored history (deep clone)", () => {
    const h = new History();
    const s = snap(1);
    h.push(s);
    s.layers[0].destination.cx = 999;
    const result = h.undo(snap(2));
    expect(result?.layers[0].destination.cx).toBe(1);
  });
});
