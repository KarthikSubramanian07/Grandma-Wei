import { SEAL_ADVANCE, SEAL_ASCENT, SEAL_PATH, SEAL_UPM } from "@gw/card/src/seal";

/** Grandma's red seal with her name, 魏 (Wei). Drawn as a path so it looks the same everywhere. */
export function Seal({ size = 96, rotate = 8, className = "" }: { size?: number; rotate?: number; className?: string }) {
  const box = 100;
  const scale = (box * 0.74 * 0.86) / SEAL_UPM;
  const gx = (box - SEAL_ADVANCE * scale) / 2;
  const gy = (box - SEAL_ASCENT * scale) / 2 + 2;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`seal ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      role="img"
      aria-label="Grandma Wei's seal"
    >
      <g filter="url(#gw-bleed)">
        <rect x="2" y="2" width="96" height="96" rx="7" fill="#C23A22" />
        <rect x="9" y="9" width="82" height="82" rx="3" fill="none" stroke="#F3EDE2" strokeWidth="2.6" />
        <path transform={`translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale.toFixed(5)})`} d={SEAL_PATH} fill="#F3EDE2" />
      </g>
    </svg>
  );
}
