//! Fridge magnets (achievements) and the before/after diff.

use crate::reading::{read, Reading, State};
use crate::rules::evaluate;
use crate::scene::*;
use serde::Serialize;

/// Magnets earned by a single reading.
pub fn reading_magnets(scene: &Scene, r: &Reading) -> Vec<&'static str> {
    let f = &scene.facts;
    let mut m = vec![];
    if f.bed_door == BedDoor::Commanding || f.desk == Desk::Commanding {
        m.push("commanding_officer");
    }
    if f.plants == Plants::Healthy {
        m.push("plant_parent");
    }
    if f.under_bed == UnderBed::Clear {
        m.push("clean_under_there");
    }
    if f.elements.all().iter().all(|(_, p)| *p != Presence::Absent) {
        m.push("five_elements");
    }
    if r.score.is_some_and(|s| s >= 80) {
        m.push("eighty_club");
    }
    if r.score.is_some_and(|s| s >= 92) {
        m.push("id_sleep_here");
    }
    m
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Diff {
    pub before: Option<u32>,
    pub after: Option<u32>,
    pub delta: Option<i32>,
    /// Rules that got better, in rule order.
    pub improved: Vec<&'static str>,
    /// Rules that got worse. She will notice.
    pub worsened: Vec<&'static str>,
    /// Magnets earned by the change itself.
    pub magnets: Vec<&'static str>,
    /// The two photos don't look like the same room.
    pub different_room: bool,
}

pub fn diff(prev: &Scene, next: &Scene) -> Diff {
    let (a, b) = (read(prev), read(next));
    let before = a.score.filter(|_| a.state == State::Ok);
    let after = b.score.filter(|_| b.state == State::Ok);
    let delta = match (before, after) {
        (Some(x), Some(y)) => Some(y as i32 - x as i32),
        _ => None,
    };

    let ea = evaluate(&prev.facts);
    let eb = evaluate(&next.facts);
    let mut improved = vec![];
    let mut worsened = vec![];
    for e in &eb {
        let Some(qb) = e.quality else { continue };
        let Some(qa) = ea.iter().find(|x| x.rule == e.rule).and_then(|x| x.quality) else { continue };
        if qb > qa + 1e-9 {
            improved.push(e.rule);
        } else if qb + 1e-9 < qa {
            worsened.push(e.rule);
        }
    }

    let (pf, nf) = (&prev.facts, &next.facts);
    let mut magnets = vec![];
    if pf.bed_door == BedDoor::Coffin && !matches!(nf.bed_door, BedDoor::Coffin | BedDoor::Unseen | BedDoor::Na) {
        magnets.push("out_of_the_coffin");
    }
    if pf.mirror_facing_bed == TriNa::Yes && nf.mirror_facing_bed == TriNa::No {
        magnets.push("mirror_mirror");
    }
    if improved.contains(&"clutter") {
        magnets.push("tidy_up");
    }
    if improved.contains(&"electronics_near_bed") && nf.electronics_near_bed == Electronics::None {
        magnets.push("screens_down");
    }
    if improved.contains(&"door_path") && nf.door_path == DoorPath::Clear {
        magnets.push("open_door_policy");
    }
    if delta.is_some_and(|d| d >= 20) {
        magnets.push("glow_up");
    }

    let bed = |s: &Scene| s.facts.bed_door != BedDoor::Na;
    let different_room = prev.kind != next.kind || bed(prev) != bed(next);

    Diff { before, after, delta, improved, worsened, magnets, different_room }
}

/// Every magnet that exists, for the fridge's empty slots.
pub const ALL_MAGNETS: [&str; 12] = [
    "first_reading",
    "out_of_the_coffin",
    "mirror_mirror",
    "clean_under_there",
    "commanding_officer",
    "plant_parent",
    "tidy_up",
    "screens_down",
    "open_door_policy",
    "five_elements",
    "glow_up",
    "eighty_club",
];

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chores::apply_chores;
    use crate::fixtures::*;

    #[test]
    fn doing_the_chores_earns_the_right_magnets() {
        let prev = messy_scene();
        let mut next = prev.clone();
        next.facts = apply_chores(&prev.facts, &["move_bed", "turn_the_mirror", "declutter"]);
        let d = diff(&prev, &next);
        assert!(d.delta.unwrap() > 0);
        assert!(d.magnets.contains(&"out_of_the_coffin"));
        assert!(d.magnets.contains(&"mirror_mirror"));
        assert!(d.magnets.contains(&"tidy_up"));
        assert!(d.improved.contains(&"bed_door"));
        assert!(d.worsened.is_empty());
        assert!(!d.different_room);
    }

    #[test]
    fn making_it_worse_is_noticed() {
        let prev = perfect_scene();
        let mut next = prev.clone();
        next.facts.clutter = Clutter::Heavy;
        let d = diff(&prev, &next);
        assert_eq!(d.worsened, vec!["clutter"]);
        assert!(d.delta.unwrap() < 0);
    }

    #[test]
    fn a_different_room_is_flagged() {
        let prev = messy_scene();
        let mut next = perfect_scene();
        next.kind = RoomKind::Office;
        next.facts = office_facts();
        assert!(diff(&prev, &next).different_room);
    }

    #[test]
    fn same_photo_twice_changes_nothing() {
        let s = messy_scene();
        let d = diff(&s, &s);
        assert_eq!(d.delta, Some(0));
        assert!(d.improved.is_empty() && d.worsened.is_empty() && d.magnets.is_empty());
    }
}
