//! The rules Grandma judges by, and how a room's facts become a score.
//!
//! Each rule maps a fact to a quality between 0 (she's worried) and 1
//! (she has nothing to say). Rules that don't apply to the room, or that
//! she couldn't see, are left out entirely: no guessing.

use crate::scene::*;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Hash, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Pillar {
    Command,
    Flow,
    Rest,
    Light,
    Balance,
}

impl Pillar {
    pub const ALL: [Pillar; 5] = [Pillar::Command, Pillar::Flow, Pillar::Rest, Pillar::Light, Pillar::Balance];

    /// How much each pillar counts toward the overall score.
    pub fn weight(self) -> f64 {
        match self {
            Pillar::Command => 0.30,
            Pillar::Flow => 0.25,
            Pillar::Rest => 0.20,
            Pillar::Light => 0.12,
            Pillar::Balance => 0.13,
        }
    }
}

/// One rule's verdict for one room.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Eval {
    pub rule: &'static str,
    pub pillar: Pillar,
    pub weight: f64,
    /// None = she couldn't see it. Rules that don't apply are not emitted at all.
    pub quality: Option<f64>,
}

fn seen(rule: &'static str, pillar: Pillar, weight: f64, q: f64) -> Option<Eval> {
    Some(Eval { rule, pillar, weight, quality: Some(q) })
}

fn unseen(rule: &'static str, pillar: Pillar, weight: f64) -> Option<Eval> {
    Some(Eval { rule, pillar, weight, quality: None })
}

/// Every rule, in a fixed order. This order is part of the contract:
/// it decides tie-breaks, so it never changes casually.
pub fn evaluate(f: &Facts) -> Vec<Eval> {
    use Pillar::*;
    let mut out: Vec<Option<Eval>> = Vec::with_capacity(20);

    out.push(match f.bed_door {
        BedDoor::Commanding => seen("bed_door", Command, 3.0, 1.0),
        BedDoor::InLineHead => seen("bed_door", Command, 3.0, 0.5),
        BedDoor::NoView => seen("bed_door", Command, 3.0, 0.35),
        BedDoor::Coffin => seen("bed_door", Command, 3.0, 0.0),
        BedDoor::Unseen => unseen("bed_door", Command, 3.0),
        BedDoor::Na => None,
    });
    out.push(match f.headboard {
        Headboard::SolidWall => seen("headboard", Command, 1.5, 1.0),
        Headboard::Floating => seen("headboard", Command, 1.5, 0.4),
        Headboard::Window => seen("headboard", Command, 1.5, 0.3),
        Headboard::Unseen => unseen("headboard", Command, 1.5),
        Headboard::Na => None,
    });
    out.push(match f.headboard_solid {
        TriNa::Yes => seen("headboard_solid", Command, 0.8, 1.0),
        TriNa::No => seen("headboard_solid", Command, 0.8, 0.5),
        TriNa::Unseen => unseen("headboard_solid", Command, 0.8),
        TriNa::Na => None,
    });
    out.push(match f.desk {
        Desk::Commanding => seen("desk", Command, 2.0, 1.0),
        Desk::FacingWall => seen("desk", Command, 2.0, 0.5),
        Desk::BackToDoor => seen("desk", Command, 2.0, 0.15),
        Desk::Unseen => unseen("desk", Command, 2.0),
        Desk::Na => None,
    });

    out.push(match f.door_path {
        DoorPath::Clear => seen("door_path", Flow, 2.0, 1.0),
        DoorPath::PartlyBlocked => seen("door_path", Flow, 2.0, 0.5),
        DoorPath::Blocked => seen("door_path", Flow, 2.0, 0.0),
        DoorPath::Unseen => unseen("door_path", Flow, 2.0),
    });
    out.push(match f.door_opens_fully {
        Tri::Yes => seen("door_opens_fully", Flow, 1.0, 1.0),
        Tri::No => seen("door_opens_fully", Flow, 1.0, 0.3),
        Tri::Unseen => unseen("door_opens_fully", Flow, 1.0),
    });
    out.push(match f.clutter {
        Clutter::Minimal => seen("clutter", Flow, 2.5, 1.0),
        Clutter::Some => seen("clutter", Flow, 2.5, 0.55),
        Clutter::Heavy => seen("clutter", Flow, 2.5, 0.1),
    });
    out.push(match f.under_bed {
        UnderBed::Clear => seen("under_bed", Flow, 1.2, 1.0),
        UnderBed::TidyStorage => seen("under_bed", Flow, 1.2, 0.75),
        UnderBed::Cluttered => seen("under_bed", Flow, 1.2, 0.1),
        UnderBed::Unseen => unseen("under_bed", Flow, 1.2),
        UnderBed::Na => None,
    });
    out.push(match f.door_window_aligned {
        Tri::No => seen("door_window_aligned", Flow, 0.8, 1.0),
        Tri::Yes => seen("door_window_aligned", Flow, 0.8, 0.4),
        Tri::Unseen => unseen("door_window_aligned", Flow, 0.8),
    });

    out.push(match f.mirror_facing_bed {
        TriNa::No => seen("mirror_facing_bed", Rest, 1.6, 1.0),
        TriNa::Yes => seen("mirror_facing_bed", Rest, 1.6, 0.1),
        TriNa::Unseen => unseen("mirror_facing_bed", Rest, 1.6),
        TriNa::Na => None,
    });
    out.push(match f.over_bed {
        TriNa::No => seen("over_bed", Rest, 1.4, 1.0),
        TriNa::Yes => seen("over_bed", Rest, 1.4, 0.2),
        TriNa::Unseen => unseen("over_bed", Rest, 1.4),
        TriNa::Na => None,
    });
    out.push(match f.electronics_near_bed {
        Electronics::None => seen("electronics_near_bed", Rest, 1.4, 1.0),
        Electronics::Some => seen("electronics_near_bed", Rest, 1.4, 0.6),
        Electronics::Lots => seen("electronics_near_bed", Rest, 1.4, 0.15),
        Electronics::Unseen => unseen("electronics_near_bed", Rest, 1.4),
        Electronics::Na => None,
    });
    out.push(match f.bed_access {
        BedAccess::BothSides => seen("bed_access", Rest, 0.6, 1.0),
        BedAccess::OneSide => seen("bed_access", Rest, 0.6, 0.55),
        BedAccess::Unseen => unseen("bed_access", Rest, 0.6),
        BedAccess::Na => None,
    });
    out.push(match f.sharp_corners {
        Tri::No => seen("sharp_corners", Rest, 0.8, 1.0),
        Tri::Yes => seen("sharp_corners", Rest, 0.8, 0.3),
        Tri::Unseen => unseen("sharp_corners", Rest, 0.8),
    });

    out.push(match f.natural_light {
        NaturalLight::Bright => seen("natural_light", Light, 2.0, 1.0),
        NaturalLight::Some => seen("natural_light", Light, 2.0, 0.7),
        NaturalLight::Dim => seen("natural_light", Light, 2.0, 0.3),
        NaturalLight::Unseen => unseen("natural_light", Light, 2.0),
    });
    out.push(match f.artificial_light {
        ArtificialLight::LayeredWarm => seen("artificial_light", Light, 1.2, 1.0),
        ArtificialLight::SingleOverhead => seen("artificial_light", Light, 1.2, 0.5),
        ArtificialLight::Harsh => seen("artificial_light", Light, 1.2, 0.25),
        ArtificialLight::Unseen => unseen("artificial_light", Light, 1.2),
    });

    out.push(match f.plants {
        Plants::Healthy => seen("plants", Balance, 1.2, 1.0),
        Plants::None => seen("plants", Balance, 1.2, 0.6),
        Plants::Artificial => seen("plants", Balance, 1.2, 0.5),
        Plants::Struggling => seen("plants", Balance, 1.2, 0.2),
    });
    out.push(seen("elements", Balance, 2.0, elements_quality(&f.elements)));

    out.into_iter().flatten().collect()
}

/// Five elements: reward variety, gently penalize one element shouting over the rest.
pub fn elements_quality(e: &Elements) -> f64 {
    let all = e.all();
    let present = all.iter().filter(|(_, p)| *p != Presence::Absent).count() as f64;
    let dominant = all.iter().filter(|(_, p)| *p == Presence::Dominant).count();
    let variety = present / 5.0 * 0.85;
    let calm = if dominant <= 1 { 0.15 } else { 0.0 };
    round3(variety + calm)
}

pub fn round3(x: f64) -> f64 {
    (x * 1000.0).round() / 1000.0
}

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize)]
pub struct PillarScores {
    pub command: Option<u32>,
    pub flow: Option<u32>,
    pub rest: Option<u32>,
    pub light: Option<u32>,
    pub balance: Option<u32>,
}

impl PillarScores {
    pub fn get(&self, p: Pillar) -> Option<u32> {
        match p {
            Pillar::Command => self.command,
            Pillar::Flow => self.flow,
            Pillar::Rest => self.rest,
            Pillar::Light => self.light,
            Pillar::Balance => self.balance,
        }
    }

    fn set(&mut self, p: Pillar, v: Option<u32>) {
        match p {
            Pillar::Command => self.command = v,
            Pillar::Flow => self.flow = v,
            Pillar::Rest => self.rest = v,
            Pillar::Light => self.light = v,
            Pillar::Balance => self.balance = v,
        }
    }
}

/// Raw (unrounded) overall score and pillar scores. Rounding happens once, at the edge.
pub fn raw_scores(evals: &[Eval]) -> (Option<f64>, [Option<f64>; 5]) {
    let mut pillars = [None; 5];
    for (i, p) in Pillar::ALL.iter().enumerate() {
        let (mut num, mut den) = (0.0, 0.0);
        for e in evals.iter().filter(|e| e.pillar == *p) {
            if let Some(q) = e.quality {
                num += e.weight * q;
                den += e.weight;
            }
        }
        if den > 0.0 {
            pillars[i] = Some(100.0 * num / den);
        }
    }
    let (mut num, mut den) = (0.0, 0.0);
    for (i, p) in Pillar::ALL.iter().enumerate() {
        if let Some(v) = pillars[i] {
            num += p.weight() * v;
            den += p.weight();
        }
    }
    let overall = if den > 0.0 { Some(num / den) } else { None };
    (overall, pillars)
}

pub fn pillar_scores(raw: [Option<f64>; 5]) -> PillarScores {
    let mut out = PillarScores::default();
    for (i, p) in Pillar::ALL.iter().enumerate() {
        out.set(*p, raw[i].map(|v| v.round().clamp(0.0, 100.0) as u32));
    }
    out
}

/// Grandma's one-word verdict for a score.
pub fn grade(score: u32) -> &'static str {
    match score {
        0..=29 => "oh_no",
        30..=49 => "worrying",
        50..=64 => "fine",
        65..=79 => "acceptable",
        80..=91 => "lovely",
        _ => "id_sleep_here",
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Good,
    Warn,
    Bad,
    Unseen,
}

pub fn status(q: Option<f64>) -> Status {
    match q {
        None => Status::Unseen,
        Some(q) if q >= 0.9 => Status::Good,
        Some(q) if q >= 0.5 => Status::Warn,
        Some(_) => Status::Bad,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::*;

    #[test]
    fn perfect_room_scores_100() {
        let evals = evaluate(&perfect_facts());
        let (overall, _) = raw_scores(&evals);
        assert_eq!(overall.unwrap().round() as u32, 100);
    }

    #[test]
    fn coffin_is_the_worst_bed_position() {
        let mut f = perfect_facts();
        let mut scores = vec![];
        for bd in [BedDoor::Commanding, BedDoor::InLineHead, BedDoor::NoView, BedDoor::Coffin] {
            f.bed_door = bd;
            scores.push(raw_scores(&evaluate(&f)).0.unwrap());
        }
        for w in scores.windows(2) {
            assert!(w[0] > w[1], "{scores:?} must strictly decrease");
        }
    }

    #[test]
    fn unseen_rules_do_not_count_against_you() {
        let mut f = perfect_facts();
        f.bed_door = BedDoor::Unseen;
        f.door_path = DoorPath::Unseen;
        let (overall, _) = raw_scores(&evaluate(&f));
        assert_eq!(overall.unwrap().round() as u32, 100);
    }

    #[test]
    fn rooms_without_a_bed_skip_bed_rules() {
        let f = office_facts();
        let evals = evaluate(&f);
        assert!(evals.iter().all(|e| !e.rule.starts_with("bed") && e.rule != "under_bed"));
        assert!(evals.iter().any(|e| e.rule == "desk"));
    }

    #[test]
    fn grades_cover_every_score() {
        assert_eq!(grade(0), "oh_no");
        assert_eq!(grade(41), "worrying");
        assert_eq!(grade(64), "fine");
        assert_eq!(grade(78), "acceptable");
        assert_eq!(grade(91), "lovely");
        assert_eq!(grade(100), "id_sleep_here");
    }

    #[test]
    fn elements_reward_variety_and_calm() {
        let mut e = perfect_facts().elements;
        assert_eq!(elements_quality(&e), 1.0);
        e.fire = Presence::Dominant;
        e.metal = Presence::Dominant;
        assert!(elements_quality(&e) < 1.0);
        e = Elements { wood: Presence::Absent, fire: Presence::Absent, earth: Presence::Absent, metal: Presence::Absent, water: Presence::Absent };
        assert!(elements_quality(&e) <= 0.15);
    }

    #[test]
    fn every_quality_is_between_zero_and_one() {
        for f in [perfect_facts(), messy_facts(), office_facts()] {
            for e in evaluate(&f) {
                if let Some(q) = e.quality {
                    assert!((0.0..=1.0).contains(&q), "{} = {q}", e.rule);
                }
            }
        }
    }
}
