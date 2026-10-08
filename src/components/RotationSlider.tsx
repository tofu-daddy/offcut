import { useRef } from "react";
import { VERTICAL_SLICES_ROTATION_MAX } from "../editor/types";
import { RotateCcwIcon, RotateCwIcon } from "./icons/Icons";

interface RotationSliderProps {
  /** The true stored rotation (may exceed the slider's own range after a 90° press). */
  rotationDeg: number;
  onBeginGesture: () => void;
  onChange: (rotationDeg: number) => void;
  onCommitGesture: () => void;
}

const MAX = VERTICAL_SLICES_ROTATION_MAX;

export function RotationSlider({ rotationDeg, onBeginGesture, onChange, onCommitGesture }: RotationSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // The thumb/fill clamp to the slider's own range for display; the true
  // value (shown in the label) can sit outside it after a Rotate 90° press.
  const clamped = Math.max(-MAX, Math.min(MAX, rotationDeg));
  const fraction = (clamped + MAX) / (2 * MAX);

  const valueFromPointer = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return clamped;
    const rect = track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(t * (2 * MAX) - MAX);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    onBeginGesture();
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onCommitGesture();
  };

  const sign = rotationDeg > 0 ? "+" : "";

  return (
    <div className="rotation-slider-row">
      <div className="rotation-label-row">
        <span className="control-label">Rotation</span>
        <span className="control-value">
          {sign}
          {rotationDeg}°
        </span>
      </div>
      <div
        ref={trackRef}
        className="rotation-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <RotateCcwIcon className="rotation-end-icon rotation-end-icon-left" width={11} height={11} />
        <div className="rotation-track-bg" />
        <div
          className="rotation-track-fill"
          style={
            fraction >= 0.5
              ? { left: "50%", width: `${(fraction - 0.5) * 100}%` }
              : { left: `${fraction * 100}%`, width: `${(0.5 - fraction) * 100}%` }
          }
        />
        <div className="rotation-center-tick" />
        <div
          className="rotation-thumb"
          role="slider"
          tabIndex={0}
          aria-label="Rotation"
          aria-valuemin={-MAX}
          aria-valuemax={MAX}
          aria-valuenow={clamped}
          aria-valuetext={`${sign}${rotationDeg} degrees`}
          style={{ left: `${fraction * 100}%` }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              onBeginGesture();
              onChange(rotationDeg + (e.key === "ArrowLeft" ? -1 : 1));
              onCommitGesture();
            }
          }}
        />
        <RotateCwIcon className="rotation-end-icon rotation-end-icon-right" width={11} height={11} />
      </div>
    </div>
  );
}
