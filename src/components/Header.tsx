import { CheckIcon, ChevronLeftIcon } from "./icons/Icons";

interface HeaderProps {
  onBack: () => void;
  onExport: () => void;
  exportDisabled: boolean;
}

export function Header({ onBack, onExport, exportDisabled }: HeaderProps) {
  return (
    <header className="app-header">
      <button type="button" className="header-icon-button" onClick={onBack} aria-label="Back to photo selection">
        <ChevronLeftIcon />
      </button>
      <p className="app-title">Slice &amp; Place</p>
      <button
        type="button"
        className="header-icon-button"
        onClick={onExport}
        aria-label="Export composition"
        disabled={exportDisabled}
      >
        <CheckIcon />
      </button>
    </header>
  );
}
