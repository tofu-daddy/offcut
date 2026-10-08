import { cloneSnapshot, type DocumentSnapshot } from "./types";

const MAX_HISTORY = 50;

export class History {
  private past: DocumentSnapshot[] = [];
  private future: DocumentSnapshot[] = [];

  /** Records `before` and clears the redo branch. Call once per completed user action/gesture. */
  push(before: DocumentSnapshot): void {
    this.past.push(cloneSnapshot(before));
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Given the current state, pops the last past state and pushes `current` onto redo. */
  undo(current: DocumentSnapshot): DocumentSnapshot | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(cloneSnapshot(current));
    if (this.future.length > MAX_HISTORY) this.future.shift();
    return prev;
  }

  redo(current: DocumentSnapshot): DocumentSnapshot | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(cloneSnapshot(current));
    if (this.past.length > MAX_HISTORY) this.past.shift();
    return next;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
