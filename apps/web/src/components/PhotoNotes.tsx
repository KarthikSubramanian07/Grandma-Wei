import type { Item } from "@gw/schema";
import type { Note } from "@gw/voice";

interface Props {
  src: string;
  items: Item[];
  notes: Note[];
  /** Delay before the first note lands, in ms. */
  delay?: number;
  alt: string;
}

/** The room photo with Grandma's sticky notes taped to the things she's talking about. */
/** Place notes near their item, nudging any that would land on top of an earlier one. */
function layout(items: Item[], notes: Note[]) {
  const placed: { left: number; top: number }[] = [];
  return notes.map((n) => {
    const it = items.find((x) => x.id === n.item_id);
    if (!it) return null;
    const [x, y, w] = it.box as [number, number, number, number];
    let left = Math.min(0.74, Math.max(0.02, x + w / 2 - 0.1));
    let top = Math.min(0.86, Math.max(0.03, y + 0.03));
    for (let tries = 0; tries < 6; tries++) {
      const hit = placed.find((p) => Math.abs(p.left - left) < 0.24 && Math.abs(p.top - top) < 0.09);
      if (!hit) break;
      top = top + 0.1 > 0.88 ? Math.max(0.03, top - 0.2) : top + 0.1;
    }
    placed.push({ left, top });
    return { left, top };
  });
}

export function PhotoNotes({ src, items, notes, delay = 0, alt }: Props) {
  const spots = layout(items, notes);
  let circled = 0;
  return (
    <div className="photo-notes">
      <img src={src} alt={alt} draggable={false} />
      <svg className="circles" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {notes.map((n, i) => {
          const it = items.find((x) => x.id === n.item_id);
          if (!it || n.tone !== "bad" || circled >= 2) return null;
          circled++;
          const [x, y, w, h] = it.box as [number, number, number, number];
          const cx = (x + w / 2) * 100;
          const cy = (y + h / 2) * 100;
          const rx = Math.min(30, Math.max(5, (w / 2) * 100 * 0.92));
          const ry = Math.min(30, Math.max(5, (h / 2) * 100 * 0.92));
          return (
            <ellipse
              key={n.item_id}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              transform={`rotate(${i % 2 ? -4 : 3} ${cx} ${cy})`}
              className="circle"
              style={{ animationDelay: `${delay + i * 520}ms` }}
              pathLength={1}
            />
          );
        })}
      </svg>
      {notes.map((n, i) => {
        const spot = spots[i];
        if (!spot) return null;
        const { left, top } = spot;
        return (
          <div
            key={n.item_id}
            className={`note landed ${n.tone}`}
            style={{
              left: `${left * 100}%`,
              top: `${top * 100}%`,
              animationDelay: `${delay + i * 520 + 220}ms`,
              ["--r" as string]: `${(i % 2 ? -1 : 1) * (2 + (i % 3))}deg`,
            }}
          >
            {n.text}
          </div>
        );
      })}
    </div>
  );
}
