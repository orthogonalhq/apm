interface PanelBarProps {
  label: string;
  meta?: string;
}

export function PanelBar({ label, meta }: PanelBarProps) {
  return (
    <div className="border-b border-white/[0.06] px-6 md:px-10 py-3 flex items-center justify-between">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] t-panel-label">
        {label}
      </span>
      {meta && (
        <span className="font-mono text-[10px] t-meta">{meta}</span>
      )}
    </div>
  );
}
