//! Chores: the fixes Grandma assigns, and exactly how many points each is worth.
//!
//! A chore's points are not a guess. We apply the fix to a copy of the facts,
//! score again, and take the difference. If a chore wouldn't move the score,
//! she doesn't assign it.

use crate::rules::{evaluate, raw_scores, status, Status};
use crate::scene::*;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Effort {
    TwoMinutes,
    TwentyMinutes,
    AnHour,
    AnAfternoon,
    AWeekend,
}

impl Effort {
    pub fn minutes(self) -> u32 {
        match self {
            Effort::TwoMinutes => 2,
            Effort::TwentyMinutes => 20,
            Effort::AnHour => 60,
            Effort::AnAfternoon => 180,
            Effort::AWeekend => 600,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Chore {
    pub id: &'static str,
    /// The rules this chore fixes (only the ones that were actually wrong).
    pub because: Vec<&'static str>,
    pub effort: Effort,
    /// Whole points the overall score gains if you do just this chore.
    pub points: u32,
    /// For the elements chore: which element to bring in.
    pub element: Option<&'static str>,
}

struct Def {
    id: &'static str,
    rules: &'static [&'static str],
    effort: fn(&Facts) -> Effort,
    apply: fn(&mut Facts) -> Option<&'static str>,
}

const fn fixed(e: Effort) -> fn(&Facts) -> Effort {
    match e {
        Effort::TwoMinutes => |_| Effort::TwoMinutes,
        Effort::TwentyMinutes => |_| Effort::TwentyMinutes,
        Effort::AnHour => |_| Effort::AnHour,
        Effort::AnAfternoon => |_| Effort::AnAfternoon,
        Effort::AWeekend => |_| Effort::AWeekend,
    }
}

/// Element preference when the room is missing several: things that are easy to add first.
const ELEMENT_ORDER: [&str; 5] = ["wood", "earth", "water", "metal", "fire"];

const DEFS: &[Def] = &[
    Def {
        id: "move_bed",
        rules: &["bed_door", "headboard", "over_bed", "bed_access"],
        effort: fixed(Effort::AnHour),
        apply: |f| {
            if !matches!(f.bed_door, BedDoor::Unseen | BedDoor::Na) {
                f.bed_door = BedDoor::Commanding;
            }
            if !matches!(f.headboard, Headboard::Unseen | Headboard::Na) {
                f.headboard = Headboard::SolidWall;
            }
            if f.over_bed == TriNa::Yes {
                f.over_bed = TriNa::No;
            }
            if f.bed_access == BedAccess::OneSide {
                f.bed_access = BedAccess::BothSides;
            }
            None
        },
    },
    Def {
        id: "solid_headboard",
        rules: &["headboard_solid"],
        effort: fixed(Effort::AnAfternoon),
        apply: |f| {
            if f.headboard_solid == TriNa::No {
                f.headboard_solid = TriNa::Yes;
            }
            None
        },
    },
    Def {
        id: "move_desk",
        rules: &["desk"],
        effort: fixed(Effort::AnHour),
        apply: |f| {
            if matches!(f.desk, Desk::BackToDoor | Desk::FacingWall) {
                f.desk = Desk::Commanding;
            }
            None
        },
    },
    Def {
        id: "declutter",
        rules: &["clutter"],
        effort: |f| if f.clutter == Clutter::Heavy { Effort::AWeekend } else { Effort::AnHour },
        apply: |f| {
            f.clutter = Clutter::Minimal;
            None
        },
    },
    Def {
        id: "clear_door_path",
        rules: &["door_path"],
        effort: fixed(Effort::TwentyMinutes),
        apply: |f| {
            if matches!(f.door_path, DoorPath::PartlyBlocked | DoorPath::Blocked) {
                f.door_path = DoorPath::Clear;
            }
            None
        },
    },
    Def {
        id: "free_the_door",
        rules: &["door_opens_fully"],
        effort: fixed(Effort::TwoMinutes),
        apply: |f| {
            if f.door_opens_fully == Tri::No {
                f.door_opens_fully = Tri::Yes;
            }
            None
        },
    },
    Def {
        id: "clear_under_bed",
        rules: &["under_bed"],
        effort: fixed(Effort::TwentyMinutes),
        apply: |f| {
            if matches!(f.under_bed, UnderBed::Cluttered | UnderBed::TidyStorage) {
                f.under_bed = UnderBed::Clear;
            }
            None
        },
    },
    Def {
        id: "break_the_line",
        rules: &["door_window_aligned"],
        effort: fixed(Effort::TwentyMinutes),
        apply: |f| {
            if f.door_window_aligned == Tri::Yes {
                f.door_window_aligned = Tri::No;
            }
            None
        },
    },
    Def {
        id: "turn_the_mirror",
        rules: &["mirror_facing_bed"],
        effort: fixed(Effort::TwoMinutes),
        apply: |f| {
            if f.mirror_facing_bed == TriNa::Yes {
                f.mirror_facing_bed = TriNa::No;
            }
            None
        },
    },
    Def {
        id: "screens_out",
        rules: &["electronics_near_bed"],
        effort: fixed(Effort::TwoMinutes),
        apply: |f| {
            if matches!(f.electronics_near_bed, Electronics::Some | Electronics::Lots) {
                f.electronics_near_bed = Electronics::None;
            }
            None
        },
    },
    Def {
        id: "soften_corners",
        rules: &["sharp_corners"],
        effort: fixed(Effort::TwentyMinutes),
        apply: |f| {
            if f.sharp_corners == Tri::Yes {
                f.sharp_corners = Tri::No;
            }
            None
        },
    },
    Def {
        id: "let_light_in",
        rules: &["natural_light"],
        effort: fixed(Effort::TwoMinutes),
        apply: |f| {
            // Honest: opening curtains takes a dim room to "some", not to a sunroom.
            if f.natural_light == NaturalLight::Dim {
                f.natural_light = NaturalLight::Some;
            }
            None
        },
    },
    Def {
        id: "warm_lamp",
        rules: &["artificial_light"],
        effort: fixed(Effort::AnAfternoon),
        apply: |f| {
            if matches!(f.artificial_light, ArtificialLight::SingleOverhead | ArtificialLight::Harsh) {
                f.artificial_light = ArtificialLight::LayeredWarm;
            }
            None
        },
    },
    Def {
        id: "real_plant",
        rules: &["plants"],
        effort: fixed(Effort::TwentyMinutes),
        apply: |f| {
            f.plants = Plants::Healthy;
            // A living plant is also wood.
            if f.elements.wood == Presence::Absent {
                f.elements.wood = Presence::Present;
            }
            None
        },
    },
    Def {
        id: "balance_elements",
        rules: &["elements"],
        effort: fixed(Effort::TwentyMinutes),
        apply: |f| {
            let mut dominant: Vec<&str> =
                f.elements.all().iter().filter(|(_, p)| *p == Presence::Dominant).map(|(n, _)| *n).collect();
            // Tone down all but the first loud element.
            if dominant.len() > 1 {
                for n in dominant.drain(1..) {
                    f.elements.set(n, Presence::Present);
                }
            }
            let missing = ELEMENT_ORDER.iter().find(|n| {
                f.elements.all().iter().any(|(m, p)| m == *n && *p == Presence::Absent)
            });
            if let Some(n) = missing {
                f.elements.set(n, Presence::Present);
                return Some(*n);
            }
            None
        },
    },
];

/// Every chore that would raise the score, biggest first.
pub fn chores_for(f: &Facts) -> Vec<Chore> {
    let evals = evaluate(f);
    let (base, _) = raw_scores(&evals);
    let Some(base) = base else { return vec![] };

    let mut out = vec![];
    for def in DEFS {
        let because: Vec<&'static str> = def
            .rules
            .iter()
            .copied()
            .filter(|r| {
                evals.iter().any(|e| e.rule == *r && matches!(status(e.quality), Status::Warn | Status::Bad))
            })
            .collect();
        if because.is_empty() {
            continue;
        }
        let effort = (def.effort)(f);
        let mut g = f.clone();
        let element = (def.apply)(&mut g);
        let (after, _) = raw_scores(&evaluate(&g));
        let gain = after.unwrap_or(base) - base;
        // Points are the rounded difference of rounded scores, so the chore list
        // adds up the way people check it: "41 + 22 = 63".
        let points = (after.unwrap_or(base).round() - base.round()).max(0.0) as u32;
        if gain > 1e-9 && points > 0 {
            out.push(Chore { id: def.id, because, effort, points, element });
        }
    }
    out.sort_by(|a, b| b.points.cmp(&a.points).then(a.effort.cmp(&b.effort)).then(a.id.cmp(b.id)));
    out
}

/// Apply chores by id to a copy of the facts: the "what if I did these" preview.
pub fn apply_chores(f: &Facts, ids: &[&str]) -> Facts {
    let mut g = f.clone();
    for def in DEFS {
        if ids.contains(&def.id) {
            (def.apply)(&mut g);
        }
    }
    g
}

pub fn all_chore_ids() -> Vec<&'static str> {
    DEFS.iter().map(|d| d.id).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::*;

    #[test]
    fn a_perfect_room_has_no_chores() {
        assert!(chores_for(&perfect_facts()).is_empty());
    }

    #[test]
    fn the_coffin_room_gets_move_bed_first() {
        let chores = chores_for(&messy_facts());
        assert_eq!(chores[0].id, "move_bed");
        assert!(chores[0].because.contains(&"bed_door"));
    }

    #[test]
    fn chores_are_sorted_by_points() {
        let chores = chores_for(&messy_facts());
        for w in chores.windows(2) {
            assert!(w[0].points >= w[1].points);
        }
    }

    #[test]
    fn doing_every_chore_never_lowers_any_pillar() {
        let f = messy_facts();
        let (_, before) = raw_scores(&evaluate(&f));
        let ids: Vec<&str> = chores_for(&f).iter().map(|c| c.id).collect();
        let g = apply_chores(&f, &ids);
        let (_, after) = raw_scores(&evaluate(&g));
        for i in 0..5 {
            if let (Some(b), Some(a)) = (before[i], after[i]) {
                assert!(a >= b - 1e-9, "pillar {i}: {b} -> {a}");
            }
        }
    }

    #[test]
    fn each_chore_alone_raises_the_score_by_its_points() {
        let f = messy_facts();
        let base = raw_scores(&evaluate(&f)).0.unwrap().round() as i64;
        for c in chores_for(&f) {
            let g = apply_chores(&f, &[c.id]);
            let after = raw_scores(&evaluate(&g)).0.unwrap().round() as i64;
            assert_eq!(after - base, c.points as i64, "chore {}", c.id);
        }
    }

    #[test]
    fn elements_chore_names_the_missing_element() {
        let mut f = perfect_facts();
        f.elements.water = Presence::Absent;
        f.elements.metal = Presence::Absent;
        let c = chores_for(&f).into_iter().find(|c| c.id == "balance_elements").unwrap();
        assert_eq!(c.element, Some("water"));
    }

    #[test]
    fn opening_curtains_is_honest_about_light() {
        let mut f = perfect_facts();
        f.natural_light = NaturalLight::Dim;
        let g = apply_chores(&f, &["let_light_in"]);
        assert_eq!(g.natural_light, NaturalLight::Some);
    }
}
