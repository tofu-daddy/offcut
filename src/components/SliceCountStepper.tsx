import { VERTICAL_SLICES_COUNT_MAX, VERTICAL_SLICES_COUNT_MIN } from "../editor/types";

interface SliceCountStepperProps {
  count: number;
  onChange: (count: number) => void;
}

export function SliceCountStepper({ count, onChange }: SliceCountStepperProps) {
  return (
    <div className="slice-count-row">
      <span className="control-label">Slices</span>
      <div className="stepper" role="group" aria-label="Slice count">
        <button
          type="button"
          className="stepper-button"
          onClick={() => onChange(count - 1)}
          disabled={count <= VERTICAL_SLICES_COUNT_MIN}
          aria-label="Decrease slice count"
        >
          <span className="stepper-minus" />
        </button>
        <div className="stepper-count" aria-live="off">
          {count}
        </div>
        <button
          type="button"
          className="stepper-button"
          onClick={() => onChange(count + 1)}
          disabled={count >= VERTICAL_SLICES_COUNT_MAX}
          aria-label="Increase slice count"
        >
          <span className="stepper-plus">
            <span className="stepper-plus-v" />
            <span className="stepper-plus-h" />
          </span>
        </button>
      </div>
      <span className="control-hint">
        {VERTICAL_SLICES_COUNT_MIN}–{VERTICAL_SLICES_COUNT_MAX}
      </span>
    </div>
  );
}
