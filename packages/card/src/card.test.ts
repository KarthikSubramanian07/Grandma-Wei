import { describe, expect, test } from "bun:test";
import { cardSvg, measure, wrap } from "./index";

const data = {
  score: 49,
  grade: "Worrying.",
  kind: "bedroom",
  headline: "Feet pointing straight out the door. That's how they carry you out. Move the bed.",
  pillars: { command: 45, flow: 85, rest: null, light: 70, balance: 74 },
  chores: [{ text: "Move the bed <now> & \"forever\"", points: 34, later: false }],
};

describe("text layout", () => {
  test("measure grows with text and size", () => {
    expect(measure("abc", "Newsreader-Regular", 20)).toBeLessThan(measure("abcdef", "Newsreader-Regular", 20));
    expect(measure("abc", "Newsreader-Regular", 40)).toBeCloseTo(measure("abc", "Newsreader-Regular", 20) * 2, 5);
  });

  test("wrap respects width and line limits, with an ellipsis", () => {
    const lines = wrap(data.headline, "Newsreader-Regular", 50, 500, 2);
    expect(lines).toHaveLength(2);
    for (const l of lines) expect(measure(l, "Newsreader-Regular", 50)).toBeLessThanOrEqual(500 + 1);
    expect(lines[1]!.endsWith("…")).toBe(true);
  });
});

describe("cardSvg", () => {
  for (const f of ["post", "story", "og"] as const) {
    test(`${f} is valid-looking SVG with escaped text`, () => {
      const svg = cardSvg(data, f);
      expect(svg.startsWith("<svg")).toBe(true);
      if (f !== "og") expect(svg).toContain("&lt;now&gt; &amp; &quot;forever&quot;");
      expect(svg).not.toContain("<now>");
    });
  }
  test("unknown pillars show a question mark", () => {
    expect(cardSvg(data, "post")).toContain(">?</text>");
  });
});
