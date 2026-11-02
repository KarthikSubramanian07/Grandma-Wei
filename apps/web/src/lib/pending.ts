/** Hand-off between "you picked a photo" and the reading page. In memory only. */
import type { Visit } from "./history";

export interface Pending {
  file: File;
  prev?: Visit;
}

let pending: Pending | null = null;
let seq = 0;
/** Each new photo gets a fresh reading screen, even when one is already showing. */
export const pendingSeq = () => seq;
export const setPending = (p: Pending) => {
  seq++;
  pending = p;
};
export const takePending = () => {
  const p = pending;
  pending = null;
  return p;
};
