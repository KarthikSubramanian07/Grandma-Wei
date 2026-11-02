/**
 * Save the scorecard as an image, rendered in the browser with the same
 * template and renderer the build uses. Loaded only when someone taps save.
 */
import type { CardData, CardFormat } from "@gw/card";
import { MAGNETS } from "@gw/voice";
import type { ReadingResult, SharePayload } from "./api";

/** The same text-only payload the server stores for a share, built locally for image saves. */
export function payloadOf(r: ReadingResult): SharePayload {
  return {
    id: r.id,
    created: Date.now(),
    rules_version: r.rules_version,
    sample: r.sample,
    kind: r.scene.kind,
    score: r.reading.score,
    grade: r.voice.grade,
    headline: r.voice.headline,
    aside: r.voice.aside,
    pillars: r.reading.pillars,
    chores: r.reading.chores.slice(0, 3).map((c) => ({
      text: r.voice.chores.find((v) => v.id === c.id)?.text ?? "",
      points: c.points,
      effort: c.effort,
      later: c.blocked_by !== null,
    })),
    potential: r.reading.potential,
    magnets: [...r.reading.magnets, ...(r.diff?.magnets ?? [])].map((m) => ({ id: m, name: MAGNETS[m].name })),
    retake: r.voice.retake,
    delta: r.diff?.delta ?? null,
  };
}

export function cardData(p: SharePayload): CardData {
  return {
    score: p.score,
    grade: p.grade,
    headline: p.headline,
    kind: p.kind,
    pillars: p.pillars,
    chores: p.chores.map((c) => ({ text: c.text, points: c.points, later: c.later })),
    delta: p.delta,
    sample: p.sample,
  };
}

let fontsP: Promise<Uint8Array[]> | null = null;

export async function renderCardPng(data: CardData, format: CardFormat): Promise<Blob> {
  const [{ cardSvg }, render, wasm, ...fontUrls] = await Promise.all([
    import("@gw/card/src/card"),
    import("@gw/card/src/render"),
    import("@resvg/resvg-wasm/index_bg.wasm?url"),
    import("@gw/card/fonts/Newsreader-Light.ttf?url"),
    import("@gw/card/fonts/Newsreader-Regular.ttf?url"),
    import("@gw/card/fonts/Newsreader-Medium.ttf?url"),
    import("@gw/card/fonts/Newsreader-Italic.ttf?url"),
    import("@gw/card/fonts/GeistMono-Regular.ttf?url"),
    import("@gw/card/fonts/GeistMono-Medium.ttf?url"),
    import("@gw/card/fonts/Kalam-Bold.ttf?url"),
  ]);
  await render.initRenderer(await (await fetch(wasm.default)).arrayBuffer());
  fontsP ??= Promise.all(fontUrls.map(async (u) => new Uint8Array(await (await fetch(u.default)).arrayBuffer())));
  const svg = cardSvg(data, format, location.host || "grandma-wei.pages.dev", { grain: false });
  const png = await render.renderPng(svg, await fontsP);
  return new Blob([png as BlobPart], { type: "image/png" });
}

/** Share the image with the OS share sheet when possible, else download it. */
export async function deliverImage(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
