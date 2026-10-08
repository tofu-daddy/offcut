import type { ToolMode } from "../editor/types";
import { CircleShapeIcon, SquareShapeIcon, TriangleShapeIcon, VerticalSlicesShapeIcon } from "./icons/Icons";

interface ShapeSelectorProps {
  activeShape: ToolMode;
  onSelect: (shape: ToolMode) => void;
}

const CANONICAL_ORDER: ToolMode[] = ["circle", "square", "triangle", "vertical-slices"];

const ICONS: Record<ToolMode, (props: { width?: number; height?: number }) => React.ReactElement> = {
  circle: CircleShapeIcon,
  square: SquareShapeIcon,
  triangle: TriangleShapeIcon,
  "vertical-slices": VerticalSlicesShapeIcon,
};

const LABELS: Record<ToolMode, string> = {
  circle: "Circle",
  square: "Square",
  triangle: "Triangle",
  "vertical-slices": "Vertical slices",
};

function carouselOrder(active: ToolMode): ToolMode[] {
  const idx = CANONICAL_ORDER.indexOf(active);
  const prev = CANONICAL_ORDER[(idx + CANONICAL_ORDER.length - 1) % CANONICAL_ORDER.length];
  const next = CANONICAL_ORDER[(idx + 1) % CANONICAL_ORDER.length];
  return [prev, active, next];
}

export function ShapeSelector({ activeShape, onSelect }: ShapeSelectorProps) {
  const order = carouselOrder(activeShape);
  const activeIndex = CANONICAL_ORDER.indexOf(activeShape);

  return (
    <div className="shape-selector">
      <div className="shape-row" role="group" aria-label="Slice shape">
        <div className="shape-row-edge-fade shape-row-edge-fade-left" aria-hidden="true" />
        {order.map((shape) => {
          const Icon = ICONS[shape];
          const isActive = shape === activeShape;
          return (
            <button
              key={shape}
              type="button"
              className={isActive ? "shape-button shape-button-active" : "shape-button"}
              onClick={() => onSelect(shape)}
              aria-pressed={isActive}
              aria-label={`Select ${LABELS[shape]} shape`}
            >
              <Icon width={isActive ? 48 : 36} height={isActive ? 48 : 36} />
            </button>
          );
        })}
        <div className="shape-row-edge-fade shape-row-edge-fade-right" aria-hidden="true" />
      </div>
      <div className="dot-indicators" aria-hidden="true">
        {CANONICAL_ORDER.map((shape, i) => (
          <span key={shape} className={i === activeIndex ? "dot dot-active" : "dot"} />
        ))}
      </div>
    </div>
  );
}
