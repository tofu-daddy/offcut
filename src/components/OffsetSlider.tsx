import { useRef } from "react";
import { VERTICAL_SLICES_OFFSET_MAX } from "../editor/types";

interface OffsetSliderProps {
  offsetPx: number;
  onBeginGesture: () => void;
  onChange: (offsetPx: number) => void;
  onCommitGesture: () => void;
}

const MAX = VERTICAL_SLICES_OFFSET_MAX;

export function OffsetSlider({ offsetPx, onBeginGesture, onChange, onCommitGesture }: OffsetSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fraction = (offsetPx + MAX) / (2 * MAX);

  const valueFromPointer = (clientY: number): number => {
    const track = trackRef.current;
    if (!track) return offsetPx;
    const rect = track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(t * (2 * MAX) - MAX);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    onBeginGesture();
    onChange(valueFromPointer(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    onChange(valueFromPointer(e.clientY));
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onCommitGesture();
  };

  const sign = offsetPx > 0 ? "+" : "";

  return (
    <div className="offset-slider-column">
      <div className="offset-label-block">
        <span className="control-label">Offset</span>
        <span className="control-value">
          {sign}
          {offsetPx} px
        </span>
      </div>
      <div
        ref={trackRef}
        className="offset-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="offset-end-glyph offset-end-glyph-top" aria-hidden="true">
          −
        </span>
        <div className="offset-track-bg" />
        <div
          className="offset-track-fill"
          style={
            fraction >= 0.5
              ? { top: "50%", height: `${(fraction - 0.5) * 100}%` }
              : { top: `${fraction * 100}%`, height: `${(0.5 - fraction) * 100}%` }
          }
        />
        <div className="offset-center-tick" />
        <div
          className="offset-thumb"
          role="slider"
          tabIndex={0}
          aria-label="Offset"
          aria-orientation="vertical"
          aria-valuemin={-MAX}
          aria-valuemax={MAX}
          aria-valuenow={offsetPx}
          aria-valuetext={`${sign}${offsetPx} pixels`}
          style={{ top: `${fraction * 100}%` }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              onBeginGesture();
              onChange(offsetPx + (e.key === "ArrowUp" ? -1 : 1));
              onCommitGesture();
            }
          }}
        />
        <span className="offset-end-glyph offset-end-glyph-bottom" aria-hidden="true">
          +
        </span>
      </div>
    </div>
  );
}
