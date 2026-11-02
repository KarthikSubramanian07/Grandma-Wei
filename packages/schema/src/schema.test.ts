import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Scene, sanitizeScene, sceneJsonSchema } from "./index";

const contract = join(import.meta.dir, "../../../fixtures/contract");

describe("scene contract with the Rust engine", () => {
  for (const name of ["messy", "perfect"]) {
    test(`${name} scene written by Rust parses in TypeScript`, () => {
      const json = JSON.parse(readFileSync(join(contract, `${name}.scene.json`), "utf8"));
      const parsed = Scene.parse(json);
      expect(parsed.kind).toBe("bedroom");
    });
  }
});

describe("sanitizeScene", () => {
  test("clamps coordinates and drops broken boxes", () => {
    const json = JSON.parse(readFileSync(join(contract, "messy.scene.json"), "utf8"));
    json.items = [
      { id: "a", kind: "bed", detail: "bed", box: [-0.2, 0.5, 2, 0.9] },
      { id: "b", kind: "lamp", detail: "lamp", box: [0.1, 0.1] },
    ];
    json.layout.pieces[0].x = 5;
    const s = sanitizeScene(Scene.parse(json));
    expect(s.items).toHaveLength(1);
    const [x, y, w, h] = s.items[0]!.box;
    expect(x).toBe(0);
    expect(x! + w!).toBeLessThanOrEqual(1);
    expect(y! + h!).toBeLessThanOrEqual(1);
    const p = s.layout.pieces[0]!;
    expect(p.x + p.w).toBeLessThanOrEqual(1);
  });
});

describe("model JSON schema", () => {
  const schema = sceneJsonSchema();
  test("every object is closed with every key required", () => {
    const walk = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (o.type === "object" && o.properties) {
        expect(o.additionalProperties).toBe(false);
        expect(o.required).toEqual(Object.keys(o.properties as object));
      }
      Object.values(o).forEach(walk);
    };
    walk(schema);
  });
  test("has no $schema header", () => {
    expect(schema.$schema).toBeUndefined();
  });
});
