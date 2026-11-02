//! Hand-built rooms for tests. Mirrors fixtures/rooms in spirit.
#![cfg(test)]

use crate::scene::*;

pub fn perfect_facts() -> Facts {
    Facts {
        bed_door: BedDoor::Commanding,
        headboard: Headboard::SolidWall,
        headboard_solid: TriNa::Yes,
        over_bed: TriNa::No,
        mirror_facing_bed: TriNa::No,
        under_bed: UnderBed::Clear,
        bed_access: BedAccess::BothSides,
        electronics_near_bed: Electronics::None,
        desk: Desk::Commanding,
        door_path: DoorPath::Clear,
        door_opens_fully: Tri::Yes,
        door_window_aligned: Tri::No,
        clutter: Clutter::Minimal,
        sharp_corners: Tri::No,
        natural_light: NaturalLight::Bright,
        artificial_light: ArtificialLight::LayeredWarm,
        plants: Plants::Healthy,
        elements: Elements {
            wood: Presence::Present,
            fire: Presence::Present,
            earth: Presence::Dominant,
            metal: Presence::Present,
            water: Presence::Present,
        },
    }
}

pub fn messy_facts() -> Facts {
    Facts {
        bed_door: BedDoor::Coffin,
        headboard: Headboard::Window,
        headboard_solid: TriNa::No,
        over_bed: TriNa::No,
        mirror_facing_bed: TriNa::Yes,
        under_bed: UnderBed::Cluttered,
        bed_access: BedAccess::BothSides,
        electronics_near_bed: Electronics::Some,
        desk: Desk::BackToDoor,
        door_path: DoorPath::PartlyBlocked,
        door_opens_fully: Tri::Yes,
        door_window_aligned: Tri::Yes,
        clutter: Clutter::Heavy,
        sharp_corners: Tri::No,
        natural_light: NaturalLight::Some,
        artificial_light: ArtificialLight::SingleOverhead,
        plants: Plants::None,
        elements: Elements {
            wood: Presence::Present,
            fire: Presence::Absent,
            earth: Presence::Dominant,
            metal: Presence::Present,
            water: Presence::Absent,
        },
    }
}

pub fn office_facts() -> Facts {
    Facts {
        bed_door: BedDoor::Na,
        headboard: Headboard::Na,
        headboard_solid: TriNa::Na,
        over_bed: TriNa::Na,
        mirror_facing_bed: TriNa::Na,
        under_bed: UnderBed::Na,
        bed_access: BedAccess::Na,
        electronics_near_bed: Electronics::Na,
        desk: Desk::BackToDoor,
        ..perfect_facts()
    }
}

fn piece(kind: ItemKind, x: f64, y: f64, w: f64, h: f64, head: Option<Wall>) -> Piece {
    Piece { kind, x, y, w, h, head }
}

pub fn messy_scene() -> Scene {
    Scene {
        is_room: true,
        kind: RoomKind::Bedroom,
        people_present: false,
        confidence: Confidence::High,
        facts: messy_facts(),
        items: vec![],
        layout: Layout {
            door: Some(Opening { wall: Wall::Near, at: 0.5 }),
            windows: vec![Window { wall: Wall::Far, at: 0.5, size: 0.2 }],
            pieces: vec![
                piece(ItemKind::Bed, 0.38, 0.03, 0.24, 0.42, Some(Wall::Far)),
                piece(ItemKind::Desk, 0.06, 0.5, 0.14, 0.3, None),
                piece(ItemKind::Mirror, 0.97, 0.25, 0.02, 0.2, None),
                piece(ItemKind::Clutter, 0.64, 0.6, 0.16, 0.14, None),
                piece(ItemKind::Wardrobe, 0.75, 0.03, 0.22, 0.12, None),
            ],
        },
        observations: vec!["a laundry mountain on the chair".into()],
    }
}

pub fn perfect_scene() -> Scene {
    Scene {
        facts: perfect_facts(),
        layout: Layout {
            door: Some(Opening { wall: Wall::Near, at: 0.5 }),
            windows: vec![Window { wall: Wall::Far, at: 0.5, size: 0.2 }],
            pieces: vec![
                piece(ItemKind::Bed, 0.01, 0.08, 0.42, 0.24, Some(Wall::Left)),
                piece(ItemKind::Desk, 0.8, 0.45, 0.16, 0.3, None),
                piece(ItemKind::Plant, 0.85, 0.05, 0.1, 0.1, None),
            ],
        },
        ..messy_scene()
    }
}
