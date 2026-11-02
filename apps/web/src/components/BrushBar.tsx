const BRUSH =
  "M2 9 C 20 4, 60 12, 100 7 S 180 4, 240 8 S 330 12, 398 6 L 398 12 C 340 16, 280 13, 220 15 S 90 17, 40 14 S 6 15, 2 13 Z";

/** One pillar as an ink brush stroke, inked to its score. A ghost stroke shows a "what if". */
export function BrushBar({ value, ghost, color }: { value: number | null; ghost?: number | null; color: string }) {
  const v = value ?? 0;
  const g = ghost ?? null;
  return (
    <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="brush" aria-hidden="true">
      <line x1="0" y1="10" x2="400" y2="10" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      {g !== null && g > v && (
        <path d={BRUSH} fill={color} opacity="0.22" style={{ clipPath: `inset(0 ${100 - g}% 0 0)`, transition: "clip-path .8s var(--ease-out)" }} />
      )}
      <path
        d={BRUSH}
        fill={color}
        filter="url(#gw-bleed)"
        style={{ clipPath: `inset(0 ${100 - v}% 0 0)`, transition: "clip-path 1.1s var(--ease-out)" }}
      />
    </svg>
  );
}
