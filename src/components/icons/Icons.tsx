/**
 * Thin, two-tone icon set traced from the approved Figma file (file key
 * dmVoCeYjGftDKds0XVmWq6). Geometry and stroke widths are copied exactly
 * from the downloaded design assets in src/assets/icons — nothing here was
 * redrawn or approximated.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M12.5 15L7.5 10L12.5 5" strokeWidth="2" stroke="currentColor" strokeLinecap="square" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M16.666 5L7.50025 14.166L3.334 9.99964" strokeWidth="2" stroke="currentColor" strokeLinecap="square" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g transform="translate(3.1 4.2)">
        <path d="M1.06 5.53H10.06C14.06 5.53 17.06 8.53 17.06 12.53V15.53" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M6.06 0.53L1.06 5.53L6.06 10.53" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g transform="translate(20.9 4.2) scale(-1 1)">
        <path d="M1.06 5.53H10.06C14.06 5.53 17.06 8.53 17.06 12.53V15.53" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M6.06 0.53L1.06 5.53L6.06 10.53" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function FlipHorizontalIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 2.99929H5C4.46957 2.99929 3.96086 3.21002 3.58579 3.58512C3.21071 3.96022 3 4.46897 3 4.99945V19.0006C3 20.1007 3.9 21.0007 5 21.0007H8M16 2.99929H19C19.5304 2.99929 20.0391 3.21002 20.4142 3.58512C20.7893 3.96022 21 4.46897 21 4.99945V19.0006C21 19.531 20.7893 20.0398 20.4142 20.4149C20.0391 20.79 19.5304 21.0007 19 21.0007H16M12 20.0006V22.0008M12 14.0002V16.0003M12 7.99969V9.99985M12 1.99921V3.99937"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FlipVerticalIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M21.0007 8V5C21.0007 4.46957 20.79 3.96086 20.4149 3.58579C20.0398 3.21071 19.531 3 19.0006 3H4.99944C4.46896 3 3.96021 3.21071 3.58511 3.58579C3.21001 3.96086 2.99928 4.46957 2.99928 5V8M21.0007 16V19C21.0007 19.5304 20.79 20.0391 20.4149 20.4142C20.0398 20.7893 19.531 21 19.0006 21H4.99944C4.46896 21 3.96021 20.7893 3.58511 20.4142C3.21001 20.0391 2.99928 19.5304 2.99928 19V16M3.99936 12H1.9992M9.99984 12H7.99968M16.0003 12H14.0002M22.0008 12H20.0006"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RotateCwIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M21 12C21 13.78 20.4722 15.5201 19.4832 17.0001C18.4943 18.4802 17.0887 19.6337 15.4442 20.3149C13.7996 20.9961 11.99 21.1743 10.2442 20.8271C8.49836 20.4798 6.89471 19.6226 5.63604 18.364C4.37737 17.1053 3.5202 15.5016 3.17294 13.7558C2.82567 12.01 3.0039 10.2004 3.68509 8.55585C4.36628 6.91131 5.51983 5.50571 6.99987 4.51677C8.47991 3.52784 10.22 3 12 3C14.52 3 16.93 4 18.74 5.74L21 8M16 8H21L21 3"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CircleShapeIcon(props: IconProps) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path
        d="M44.0016 24C44.0016 35.0466 35.0466 44.0016 24 44.0016C12.9534 44.0016 3.9984 35.0466 3.9984 24C3.9984 12.9534 12.9534 3.9984 24 3.9984C35.0466 3.9984 44.0016 12.9534 44.0016 24Z"
        strokeWidth="2"
        stroke="currentColor"
      />
    </svg>
  );
}

export function SquareShapeIcon(props: IconProps) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 6H38C40.2091 6 42 7.79086 42 10V38C42 40.2091 40.2091 42 38 42H10C7.79086 42 6 40.2091 6 38V10C6 7.79086 7.79086 6 10 6Z"
        strokeWidth="2"
        stroke="currentColor"
      />
    </svg>
  );
}

export function TriangleShapeIcon(props: IconProps) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path
        d="M27.4602 7.99784C27.1085 7.39164 26.6038 6.88847 25.9965 6.53869C25.3893 6.18891 24.7008 6.0048 24 6.0048C23.2992 6.0048 22.6107 6.18891 22.0035 6.53869C21.3962 6.88847 20.8915 7.39164 20.5398 7.99784L4.53912 35.9996C4.18821 36.6074 4.00338 37.2969 4.0032 37.9987C4.00302 38.7006 4.18749 39.3901 4.5381 39.9981C4.8887 40.6061 5.39309 41.1111 6.00063 41.4625C6.60816 41.8139 7.29745 41.9993 7.99928 42H40.0007C40.7026 41.9993 41.3918 41.8139 41.9994 41.4625C42.6069 41.1111 43.1113 40.6061 43.4619 39.9981C43.8125 39.3901 43.997 38.7006 43.9968 37.9987C43.9966 37.2969 43.8118 36.6074 43.4609 35.9996L27.4602 7.99784Z"
        strokeWidth="2"
        stroke="currentColor"
      />
    </svg>
  );
}

export function VerticalSlicesShapeIcon(props: IconProps) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" {...props}>
      <rect x="2" y="4" width="4" height="28" fill="currentColor" />
      <rect x="9" y="0" width="4" height="36" fill="currentColor" />
      <rect x="16" y="4" width="4" height="28" fill="currentColor" />
      <rect x="23" y="0" width="4" height="36" fill="currentColor" />
      <rect x="30" y="4" width="4" height="28" fill="currentColor" />
    </svg>
  );
}

export function RotateCcwIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 12C3 10.22 3.5278 8.4799 4.5168 6.9998C5.5057 5.5198 6.9113 4.3663 8.5558 3.6851C10.2004 3.0039 12.01 2.8257 13.7558 3.1729C15.5016 3.5202 17.1053 4.3774 18.364 5.636C19.6226 6.8947 20.4798 8.4984 20.8271 10.2442C21.1743 11.99 20.9961 13.7996 20.3149 15.4442C19.6337 17.0887 18.4802 18.4943 17.0001 19.4832C15.5201 20.4722 13.78 21 12 21C9.48 21 7.07 20 5.26 18.26L3 16"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 16H3V21" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 7H20M9 7V4.5C9 3.67157 9.67157 3 10.5 3H13.5C14.3284 3 15 3.67157 15 4.5V7M18 7L17.3 19.1C17.2 20.2 16.3 21 15.2 21H8.8C7.7 21 6.8 20.2 6.7 19.1L6 7"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
