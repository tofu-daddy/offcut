import { FlipHorizontalIcon, FlipVerticalIcon, RedoIcon, RotateCwIcon, UndoIcon } from "./icons/Icons";

interface TransformToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate: () => void;
}

export function TransformToolbar({
  canUndo,
  canRedo,
  hasSelection,
  onUndo,
  onRedo,
  onFlipHorizontal,
  onFlipVertical,
  onRotate,
}: TransformToolbarProps) {
  return (
    <div className="transform-row" role="group" aria-label="Edit actions">
      <button type="button" className="transform-button" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
        <UndoIcon />
      </button>
      <button
        type="button"
        className="transform-button"
        onClick={onFlipHorizontal}
        disabled={!hasSelection}
        aria-label="Flip horizontally"
      >
        <FlipHorizontalIcon />
      </button>
      <button
        type="button"
        className="transform-button"
        onClick={onFlipVertical}
        disabled={!hasSelection}
        aria-label="Flip vertically"
      >
        <FlipVerticalIcon />
      </button>
      <button
        type="button"
        className="transform-button"
        onClick={onRotate}
        disabled={!hasSelection}
        aria-label="Rotate 90 degrees"
      >
        <RotateCwIcon />
      </button>
      <button type="button" className="transform-button" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
        <RedoIcon />
      </button>
    </div>
  );
}
