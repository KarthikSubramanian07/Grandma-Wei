/* tslint:disable */
/* eslint-disable */

/**
 * Compare two scenes: what changed, by how much, which magnets were earned.
 */
export function diff(prev_json: string, next_json: string): string;

/**
 * The qi flow field as a flat Float32Array: [vx, vy, stagnant, sha] per cell, row-major.
 */
export function flowField(scene_json: string, w: number, h: number): Float32Array;

/**
 * "What if I did these chores": returns a scene with the fixes applied,
 * including the bed moved to Grandma's suggested spot on the sketch.
 */
export function imagine(scene_json: string, chore_ids_json: string): string;

/**
 * Score a scene. Takes and returns JSON strings.
 */
export function read(scene_json: string): string;

export function rulesVersion(): number;

/**
 * Grandma's suggested bed spot, or null.
 */
export function suggestBed(scene_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly diff: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly flowField: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly imagine: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly read: (a: number, b: number) => [number, number, number, number];
    readonly rulesVersion: () => number;
    readonly suggestBed: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
