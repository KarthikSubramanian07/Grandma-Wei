import { initWasm, Resvg } from "@resvg/resvg-wasm";

let ready: Promise<void> | null = null;

/** Initialize resvg once per isolate, with a compiled module (Workers) or bytes (Bun). */
export function initRenderer(module: WebAssembly.Module | BufferSource): Promise<void> {
  ready ??= initWasm(module).catch((e: unknown) => {
    // Already initialized in this isolate is fine.
    if (!String(e).includes("Already initialized")) throw e;
  });
  return ready;
}

/** Rasterize a card SVG to PNG using only the bundled card fonts. */
export async function renderPng(svg: string, fonts: Uint8Array[]): Promise<Uint8Array> {
  if (!ready) throw new Error("call initRenderer first");
  await ready;
  const r = new Resvg(svg, {
    font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: "GW Serif" },
    shapeRendering: 2,
    textRendering: 1,
  } as ConstructorParameters<typeof Resvg>[1]);
  const img = r.render();
  const png = img.asPng();
  img.free();
  r.free();
  return png;
}
