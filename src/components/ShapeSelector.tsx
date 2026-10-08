import type { ShapeType } from "../editor/types";
import { CircleShapeIcon, SquareShapeIcon, TriangleShapeIcon } from "./icons/Icons";

interface ShapeSelectorProps {
  activeShape: ShapeType;
  onSelect: (shape: ShapeType) => void;
}

const CANONICAL_ORDER: ShapeType[] = ["circle", "square", "triangle"];

const ICONS: Record<ShapeType, (props: { width?: number; height?: number }) => React.ReactElement> = {
  circle: CircleShapeIcon,
  square: SquareShapeIcon,
  triangle: TriangleShapeIcon,
};

const LABELS: Record<ShapeType, string> = {
  circle: "Circle",
  square: "Square",
  triangle: "Triangle",
};

function carouselOrder(active: ShapeType): ShapeType[] {
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
      </div>
      <div className="dot-indicators" aria-hidden="true">
        {CANONICAL_ORDER.map((shape, i) => (
          <span key={shape} className={i === activeIndex ? "dot dot-active" : "dot"} />
        ))}
      </div>
    </div>
  );
}
