import { z } from "zod";
import { Scene } from "./scene";

type Json = { [k: string]: unknown };

/**
 * The Scene as a JSON Schema the model's structured output can be held to:
 * every object closed (additionalProperties: false) with every key required,
 * and no keywords structured outputs doesn't need.
 */
export function sceneJsonSchema(): Json {
  const raw = z.toJSONSchema(Scene, { target: "draft-2020-12", io: "output" }) as Json;
  delete raw.$schema;
  return close(raw) as Json;
}

function close(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(close);
  if (!node || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node as Json)) out[k] = close(v);
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as Json);
  }
  return out;
}
