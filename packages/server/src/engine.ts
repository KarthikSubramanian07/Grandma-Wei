/** Typed wrapper over the qi WebAssembly engine. */

import { initSync, read as qiRead, diff as qiDiff, imagine as qiImagine, suggestBed as qiSuggestBed, rulesVersion } from "@gw/qi";
import type { Diff, Layout, Reading, Scene } from "@gw/schema";

let ready = false;

/** Call once per isolate with the compiled module (Workers) or raw bytes (Bun tests). */
export function initEngine(module: WebAssembly.Module | BufferSource): void {
  if (ready) return;
  initSync({ module });
  ready = true;
}

export const engine = {
  read: (s: Scene): Reading => JSON.parse(qiRead(JSON.stringify(s))),
  diff: (a: Scene, b: Scene): Diff => JSON.parse(qiDiff(JSON.stringify(a), JSON.stringify(b))),
  imagine: (s: Scene, chores: string[]): Scene => JSON.parse(qiImagine(JSON.stringify(s), JSON.stringify(chores))),
  suggestBed: (s: Scene): Layout["pieces"][number] | null => JSON.parse(qiSuggestBed(JSON.stringify(s))),
  version: () => rulesVersion(),
};
