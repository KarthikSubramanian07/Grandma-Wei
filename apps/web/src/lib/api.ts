import type { Envelope, SharePayload } from "@gw/server";

export type { Envelope, ReadingResult, SharePayload } from "@gw/server";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("offline", "I can't reach you. Check your internet and try again.", 0);
  }
  const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!res.ok) {
    throw new ApiError(body?.error ?? "unknown", body?.message ?? "Something went wrong. Try again in a minute.", res.status);
  }
  return body as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export interface Health {
  ok: boolean;
  eyes: boolean;
  fridge: boolean;
  rules_version: number;
}

export const api = {
  health: () => call<Health>("/api/health"),
  sample: (name: string) => call<Envelope>(`/api/sample/${encodeURIComponent(name)}`),
  read: (image: string, mediaType: string, prev?: { signed: string; sig: string }) =>
    call<Envelope>("/api/read", json({ image, media_type: mediaType, prev })),
  share: (signed: string, sig: string) =>
    call<{ id: string; path: string; delete_token: string; payload: SharePayload }>("/api/share", json({ signed, sig })),
  getShare: (id: string) => call<SharePayload>(`/api/share/${encodeURIComponent(id)}`),
  deleteShare: (id: string, token: string) =>
    call<{ deleted: boolean }>(`/api/share/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-delete-token": token } }),
};
