import { PILLAR_HINT, PILLAR_LABEL, PILLARS, type Pillar, type RuleId } from "@gw/schema/src/reading";
import { RULE_NAME, WHY } from "@gw/voice";
import { Grandma } from "../components/Grandma";
import { PhotoPicker } from "../components/PhotoPicker";

const RULES: Record<Pillar, RuleId[]> = {
  command: ["bed_door", "headboard", "headboard_solid", "desk"],
  flow: ["clutter", "door_path", "door_opens_fully", "under_bed", "door_window_aligned"],
  rest: ["mirror_facing_bed", "over_bed", "electronics_near_bed", "bed_access", "sharp_corners"],
  light: ["natural_light", "artificial_light"],
  balance: ["plants", "elements"],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What she checks, in plain words, with the practical reason behind each rule. */
export function How() {
  return (
    <main className="shell how fade-in">
      <header className="page-head">
        <h1>How she judges</h1>
        <p>
          Grandma Wei uses the practical side of feng shui: the parts that also make sense to an architect, a sleep doctor,
          or anyone who has walked into a dark room and stubbed a toe. Five things, eighteen rules, one score out of 100.
        </p>
      </header>

      <div className="how-grid">
        {PILLARS.map((p) => (
          <section key={p} className="paper how-card">
            <h2>{PILLAR_LABEL[p]}</h2>
            <p className="how-hint">{PILLAR_HINT[p]}</p>
            <dl>
              {RULES[p].map((r) => (
                <div key={r}>
                  <dt>{cap(RULE_NAME[r])}</dt>
                  <dd>{WHY[r]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section className="how-notes">
        <h2>A few things she's honest about</h2>
        <ul>
          <li>
            <strong>The score is math, not mood.</strong> The AI only describes what it sees: where the bed is, what's on the
            floor. A fixed set of rules turns that into the score, so the same room always gets the same number.
          </li>
          <li>
            <strong>She won't guess.</strong> If she can't see your door, the door rules are left out, and she asks for a better
            angle instead of making something up.
          </li>
          <li>
            <strong>Some things are deal-breakers.</strong> A bed in the coffin position (feet pointing out the door) caps the
            room at 49 until you move it. Heavy clutter or a blocked doorway caps it at 59.
          </li>
          <li>
            <strong>No compass, no birthdays.</strong> Some schools of feng shui use compass directions and birth years. A photo
            can't tell which way is north, so she leaves those out rather than pretend.
          </li>
        </ul>
      </section>

      <section className="shared-cta">
        <Grandma mood="proud" size={110} />
        <div>
          <h2>Ready?</h2>
          <PhotoPicker />
        </div>
      </section>
    </main>
  );
}
