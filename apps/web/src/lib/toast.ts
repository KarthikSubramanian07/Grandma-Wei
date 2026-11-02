import { useEffect, useState } from "react";

type Listener = (msg: string | null) => void;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string, ms = 3200) {
  listeners.forEach((l) => l(msg));
  clearTimeout(timer);
  timer = setTimeout(() => listeners.forEach((l) => l(null)), ms);
}

export function useToast(): string | null {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    listeners.add(setMsg);
    return () => void listeners.delete(setMsg);
  }, []);
  return msg;
}
