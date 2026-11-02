import { useEffect, useRef, useState } from "react";

/** A number that rolls from where it was to where it is. */
export function Odometer({ value, duration = 1100, className = "" }: { value: number | null; duration?: number; className?: string }) {
  const [shown, setShown] = useState<number | null>(value === null ? null : 0);
  const from = useRef(0);
  useEffect(() => {
    if (value === null) {
      setShown(null);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{shown === null ? "?" : shown}</span>;
}
