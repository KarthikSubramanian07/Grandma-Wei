import type { GradeKey } from "@gw/schema";

export type Mood = "concerned" | "unimpressed" | "thinking" | "surprised" | "proud" | "delighted";

export function moodFor(grade: GradeKey | null | undefined): Mood {
  switch (grade) {
    case "oh_no":
    case "worrying":
      return "concerned";
    case "fine":
      return "unimpressed";
    case "acceptable":
      return "proud";
    case "lovely":
    case "id_sleep_here":
      return "delighted";
    default:
      return "thinking";
  }
}

interface Face {
  eyes: string;
  brows: [string, string];
  mouth: string;
  blush: boolean;
  tilt: number;
}

const FACES: Record<Mood, Face> = {
  concerned: {
    eyes: "M79 111 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M115 111 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
    brows: ["M70 92 C76 88 84 86 91 89", "M109 89 C116 86 124 88 130 92"],
    mouth: "M88 145 C94 141 106 141 112 145",
    blush: false,
    tilt: -2,
  },
  unimpressed: {
    eyes: "M77 112 H87 M113 112 H123",
    brows: ["M70 93 L91 93", "M109 93 L130 93"],
    mouth: "M89 144 H111",
    blush: false,
    tilt: 0,
  },
  thinking: {
    eyes: "M77 108 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M113 108 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
    brows: ["M70 90 C76 86 84 85 91 87", "M109 92 L130 94"],
    mouth: "M92 145 C98 143 104 145 108 142",
    blush: false,
    tilt: 3,
  },
  surprised: {
    eyes: "M78 111 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M114 111 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
    brows: ["M70 86 C76 81 84 80 91 83", "M109 83 C116 80 124 81 130 86"],
    mouth: "M100 140 a5 6 0 1 0 0.1 0",
    blush: false,
    tilt: 0,
  },
  proud: {
    eyes: "M77 112 C80 108 84 108 87 112 M113 112 C116 108 120 108 123 112",
    brows: ["M70 91 C76 88 84 88 91 90", "M109 90 C116 88 124 88 130 91"],
    mouth: "M88 141 C94 148 106 148 112 141",
    blush: true,
    tilt: -3,
  },
  delighted: {
    eyes: "M76 113 C79 107 85 107 88 113 M112 113 C115 107 121 107 124 113",
    brows: ["M70 89 C76 85 84 85 91 88", "M109 88 C116 85 124 85 130 89"],
    mouth: "M86 139 C92 151 108 151 114 139 C106 142 94 142 86 139 Z",
    blush: true,
    tilt: 2,
  },
};

interface Props {
  mood?: Mood;
  size?: number;
  className?: string;
  title?: string;
}

/** Grandma Wei, in ink. Original illustration: glasses on a chain, pearls, a jade cardigan. */
export function Grandma({ mood = "thinking", size = 160, className = "", title }: Props) {
  const f = FACES[mood];
  return (
    <svg
      viewBox="0 0 200 230"
      width={size}
      height={(size * 230) / 200}
      className={`grandma grandma-${mood} ${className}`}
      role="img"
      aria-label={title ?? `Grandma Wei, looking ${mood}`}
    >
      <g fill="none" stroke="#1C1B19" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#gw-ink)">
        {/* cardigan */}
        <path d="M24 232 C28 192 58 172 100 170 C142 172 172 192 176 232 Z" fill="#2E6A58" />
        <path d="M100 172 L84 172 C88 188 94 198 100 206 C106 198 112 188 116 172 Z" fill="#F4F2ED" />
        <path d="M100 206 V232" />
        <circle cx="100" cy="216" r="2.6" fill="#F4F2ED" strokeWidth="1.6" />
        <circle cx="100" cy="227" r="2.6" fill="#F4F2ED" strokeWidth="1.6" />
        <path d="M60 196 C64 206 66 218 66 232 M140 196 C136 206 134 218 134 232" strokeWidth="1.6" opacity="0.7" />

        <g transform={`rotate(${f.tilt} 100 120)`} style={{ transition: "transform .5s var(--ease-out)" }}>
          {/* neck and face */}
          <path d="M88 160 L88 174 M112 160 L112 174" />
          <path d="M60 100 C58 142 78 168 100 168 C122 168 142 142 140 100 C140 72 122 58 100 58 C78 58 60 72 60 100 Z" fill="#F5EEE6" />
          {/* ears and pearls */}
          <path d="M60 104 C52 102 52 118 61 120" fill="#F5EEE6" />
          <path d="M140 104 C148 102 148 118 139 120" fill="#F5EEE6" />
          <circle cx="58" cy="126" r="3.6" fill="#FBF8F1" strokeWidth="1.6" />
          <circle cx="142" cy="126" r="3.6" fill="#FBF8F1" strokeWidth="1.6" />
          {/* hair: a soft set of curls */}
          <path
            d="M58 100 C48 90 50 72 62 67 C58 52 74 42 88 47 C93 35 112 34 116 46 C129 39 147 50 141 66 C152 72 152 90 142 100 C137 88 127 82 118 84 C109 75 91 75 82 84 C73 80 63 87 58 100 Z"
            fill="#D3D2CE"
          />
          <path d="M70 66 c4 -4 9 -3 10 2 M92 52 c4 -4 10 -3 10 3 M118 54 c5 -3 10 0 9 5 M128 72 c4 -2 8 1 7 5" strokeWidth="1.8" />
          {/* brows */}
          <path d={f.brows[0]} style={{ transition: "d .4s" }} />
          <path d={f.brows[1]} style={{ transition: "d .4s" }} />
          {/* eyes */}
          <g className="grandma-eyes">
            <path d={f.eyes} fill="#1C1B19" strokeWidth="2.2" />
          </g>
          {/* glasses on a chain */}
          <circle cx="82" cy="110" r="15" fill="rgba(255,255,255,0.22)" />
          <circle cx="118" cy="110" r="15" fill="rgba(255,255,255,0.22)" />
          <path d="M97 109 Q100 105 103 109 M67 108 L60 105 M133 108 L140 105" />
          <path d="M71 101 l5 -3" stroke="#fff" strokeWidth="2" opacity="0.8" className="glint" />
          <path d="M60 106 C48 138 62 166 84 178 M140 106 C152 138 138 166 116 178" stroke="#4F6B8A" strokeWidth="1.6" strokeDasharray="0.5 4.5" />
          {/* nose, cheeks, mouth */}
          <path d="M100 114 C98 124 97 128 102 129" strokeWidth="2" />
          {f.blush && (
            <g fill="#B3272D" stroke="none" opacity="0.16">
              <circle cx="72" cy="132" r="8" />
              <circle cx="128" cy="132" r="8" />
            </g>
          )}
          <path d="M80 138 C78 142 79 146 82 148 M120 138 C122 142 121 146 118 148" strokeWidth="1.4" opacity="0.5" />
          <path d={f.mouth} fill={mood === "delighted" ? "#8E1F24" : mood === "surprised" ? "#8E1F24" : "none"} style={{ transition: "d .4s" }} />
        </g>
      </g>
    </svg>
  );
}

/** Shared SVG filters (ink bleed), rendered once near the root. */
export function InkDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="gw-ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" />
      </filter>
      <filter id="gw-bleed">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="3" />
      </filter>
      <filter id="gw-rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.03 0.09" numOctaves="2" seed="4" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="2.4" />
      </filter>
    </svg>
  );
}
