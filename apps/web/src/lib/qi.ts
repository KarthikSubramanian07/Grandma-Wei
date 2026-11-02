/** The qi engine in the browser: the same Rust that scores on the server. */
import init, { diff, flowField, imagine, read, suggestBed } from "@gw/qi";
import wasmUrl from "@gw/qi/qi_bg.wasm?url";
import type { Diff, Layout, Reading, Scene } from "@gw/schema";

let ready: Promise<unknown> | null = null;
export const qiReady = () => (ready ??= init({ module_or_path: wasmUrl }));

export const qi = {
  read: (s: Scene): Reading => JSON.parse(read(JSON.stringify(s))),
  diff: (a: Scene, b: Scene): Diff => JSON.parse(diff(JSON.stringify(a), JSON.stringify(b))),
  imagine: (s: Scene, chores: string[]): Scene => JSON.parse(imagine(JSON.stringify(s), JSON.stringify(chores))),
  suggestBed: (s: Scene): Layout["pieces"][number] | null => JSON.parse(suggestBed(JSON.stringify(s))),
  field: (s: Scene, w: number, h: number): Float32Array => flowField(JSON.stringify(s), w, h),
};
