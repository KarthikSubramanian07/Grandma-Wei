//! A full reading: score, grade, pillars, findings, chores, magnets.

use crate::chores::{chores_for, Chore};
use crate::magnets::reading_magnets;
use crate::rules::*;
use crate::scene::*;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum State {
    /// A proper reading.
    Ok,
    /// The photo isn't a room.
    NotARoom,
    /// She could see too little to judge fairly.
    NeedBetterPhoto,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Finding {
    pub rule: &'static str,
    pub pillar: Pillar,
    pub status: Status,
    pub quality: Option<f64>,
    /// How much this rule drags the room down (weight × shortfall). Drives her headline.
    pub drag: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Reading {
    pub state: State,
    pub score: Option<u32>,
    pub grade: Option<&'static str>,
    pub pillars: PillarScores,
    pub findings: Vec<Finding>,
    pub chores: Vec<Chore>,
    /// The rule she'll lead with: the biggest problem in the room.
    pub headline: Option<&'static str>,
    /// Important things she couldn't see, so she can ask for another angle.
    pub unseen: Vec<&'static str>,
    pub magnets: Vec<&'static str>,
    /// Score if every chore were done.
    pub potential: Option<u32>,
}

/// Rules worth asking for a better photo about, in the order she'd ask.
const ASK_ABOUT: [&str; 5] = ["bed_door", "door_path", "desk", "mirror_facing_bed", "under_bed"];

/// Fewer than this many seen rules and she won't put a number on it.
const MIN_SEEN: usize = 4;

pub fn read(scene: &Scene) -> Reading {
    if !scene.is_room {
        return empty(State::NotARoom);
    }
    let f = &scene.facts;
    let evals = evaluate(f);
    let seen_count = evals.iter().filter(|e| e.quality.is_some()).count();
    let unseen: Vec<&'static str> = ASK_ABOUT
        .iter()
        .copied()
        .filter(|r| evals.iter().any(|e| e.rule == *r && e.quality.is_none()))
        .collect();
    if seen_count < MIN_SEEN {
        return Reading { unseen, ..empty(State::NeedBetterPhoto) };
    }

    let (overall, raw) = raw_scores(&evals);
    let score = overall.map(|v| v.round().clamp(0.0, 100.0) as u32);
    let findings: Vec<Finding> = evals
        .iter()
        .map(|e| Finding {
            rule: e.rule,
            pillar: e.pillar,
            status: status(e.quality),
            quality: e.quality,
            drag: round3(e.quality.map(|q| e.weight * e.pillar.weight() * (1.0 - q)).unwrap_or(0.0)),
        })
        .collect();
    let headline = findings
        .iter()
        .filter(|f| f.drag > 0.0 && matches!(f.status, Status::Bad | Status::Warn))
        // Biggest drag wins; ties go to the earlier rule (stable order).
        .fold(None::<&Finding>, |best, f| match best {
            Some(b) if b.drag >= f.drag => Some(b),
            _ => Some(f),
        })
        .map(|f| f.rule);

    let chores = chores_for(f);
    let all: Vec<&str> = chores.iter().map(|c| c.id).collect();
    let potential = raw_scores(&evaluate(&crate::chores::apply_chores(f, &all)))
        .0
        .map(|v| v.round().clamp(0.0, 100.0) as u32);

    let mut reading = Reading {
        state: State::Ok,
        score,
        grade: score.map(grade),
        pillars: pillar_scores(raw),
        findings,
        chores,
        headline,
        unseen,
        magnets: vec![],
        potential,
    };
    reading.magnets = reading_magnets(scene, &reading);
    reading
}

fn empty(state: State) -> Reading {
    Reading {
        state,
        score: None,
        grade: None,
        pillars: PillarScores::default(),
        findings: vec![],
        chores: vec![],
        headline: None,
        unseen: vec![],
        magnets: vec![],
        potential: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::*;

    #[test]
    fn same_scene_same_reading() {
        let s = messy_scene();
        assert_eq!(read(&s), read(&s));
    }

    #[test]
    fn coffin_room_leads_with_the_bed() {
        let r = read(&messy_scene());
        assert_eq!(r.state, State::Ok);
        assert_eq!(r.headline, Some("bed_door"));
        assert!(r.score.unwrap() < 50, "score {:?}", r.score);
        assert!(r.potential.unwrap() > r.score.unwrap());
    }

    #[test]
    fn not_a_room_has_no_score() {
        let mut s = messy_scene();
        s.is_room = false;
        let r = read(&s);
        assert_eq!(r.state, State::NotARoom);
        assert_eq!(r.score, None);
    }

    #[test]
    fn too_little_seen_asks_for_a_better_photo() {
        let mut s = messy_scene();
        let f = &mut s.facts;
        f.bed_door = BedDoor::Unseen;
        f.headboard = Headboard::Unseen;
        f.headboard_solid = TriNa::Unseen;
        f.desk = Desk::Na;
        f.door_path = DoorPath::Unseen;
        f.door_opens_fully = Tri::Unseen;
        f.under_bed = UnderBed::Unseen;
        f.door_window_aligned = Tri::Unseen;
        f.mirror_facing_bed = TriNa::Unseen;
        f.over_bed = TriNa::Unseen;
        f.electronics_near_bed = Electronics::Unseen;
        f.bed_access = BedAccess::Unseen;
        f.sharp_corners = Tri::Unseen;
        f.natural_light = NaturalLight::Unseen;
        f.artificial_light = ArtificialLight::Unseen;
        // Only clutter, plants and elements remain: three rules.
        let r = read(&s);
        assert_eq!(r.state, State::NeedBetterPhoto);
        assert!(r.unseen.contains(&"bed_door"));
    }

    #[test]
    fn perfect_room_has_no_headline_and_no_chores() {
        let r = read(&perfect_scene());
        assert_eq!(r.score, Some(100));
        assert_eq!(r.grade, Some("id_sleep_here"));
        assert_eq!(r.headline, None);
        assert!(r.chores.is_empty());
        assert_eq!(r.potential, Some(100));
    }
}
