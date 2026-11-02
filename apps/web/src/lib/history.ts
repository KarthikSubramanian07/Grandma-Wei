/**
 * The fridge: your readings, kept only in this browser (IndexedDB).
 * Photos stay here and never go back to the server.
 */
import { clear, createStore, del, entries, get, set } from "idb-keyval";
import type { MagnetId } from "@gw/schema";
import type { Envelope } from "./api";

const store = createStore("grandma-wei", "fridge");

export interface Visit {
  id: string;
  at: number;
  envelope: Envelope;
  /** Downscaled photo, local only. Absent for practice rooms. */
  photo?: Blob;
  /** The visit this one was a retake of. */
  prevId?: string;
  shares?: { id: string; token: string }[];
}

export const saveVisit = (v: Visit) => set(v.id, v, store);
export const getVisit = (id: string) => get<Visit>(id, store);
export const deleteVisit = (id: string) => del(id, store);
export const clearFridge = () => clear(store);

export async function allVisits(): Promise<Visit[]> {
  const all = await entries<string, Visit>(store);
  return all.map(([, v]) => v).sort((a, b) => b.at - a.at);
}

/** Every magnet earned across real (non-practice) visits, in order of first earning. */
export function magnetsOf(visits: Visit[]): { id: MagnetId; at: number }[] {
  const seen = new Map<MagnetId, number>();
  for (const v of [...visits].sort((a, b) => a.at - b.at)) {
    if (v.envelope.result.sample) continue;
    if (!seen.has("first_reading")) seen.set("first_reading", v.at);
    for (const m of [...v.envelope.result.reading.magnets, ...(v.envelope.result.diff?.magnets ?? [])]) {
      if (!seen.has(m)) seen.set(m, v.at);
    }
  }
  return [...seen].map(([id, at]) => ({ id, at }));
}
