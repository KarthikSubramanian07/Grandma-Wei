//! The room as Grandma's eyes report it. Mirrors packages/schema/src/scene.ts.

use serde::{Deserialize, Serialize};

macro_rules! fact_enum {
    ($name:ident { $($variant:ident),+ $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
        #[serde(rename_all = "snake_case")]
        pub enum $name { $($variant),+ }
    };
}

fact_enum!(Tri { Yes, No, Unseen });
fact_enum!(TriNa { Yes, No, Unseen, Na });
fact_enum!(BedDoor { Commanding, Coffin, InLineHead, NoView, Unseen, Na });
fact_enum!(Headboard { SolidWall, Window, Floating, Unseen, Na });
fact_enum!(UnderBed { Clear, TidyStorage, Cluttered, Unseen, Na });
fact_enum!(BedAccess { BothSides, OneSide, Unseen, Na });
fact_enum!(Electronics { None, Some, Lots, Unseen, Na });
fact_enum!(Desk { Commanding, BackToDoor, FacingWall, Unseen, Na });
fact_enum!(DoorPath { Clear, PartlyBlocked, Blocked, Unseen });
fact_enum!(Clutter { Minimal, Some, Heavy });
fact_enum!(NaturalLight { Bright, Some, Dim, Unseen });
fact_enum!(ArtificialLight { LayeredWarm, SingleOverhead, Harsh, Unseen });
fact_enum!(Plants { Healthy, None, Struggling, Artificial });
fact_enum!(Presence { Absent, Present, Dominant });
fact_enum!(Wall { Near, Far, Left, Right });
fact_enum!(Confidence { Low, Medium, High });
fact_enum!(RoomKind { Bedroom, Studio, LivingRoom, Office, KidsRoom, Dorm, Other });
fact_enum!(ItemKind {
    Bed, Desk, Chair, Sofa, Mirror, Door, Window, Plant, Clutter,
    Wardrobe, Shelf, Lamp, Tv, Table, Rug, Art, Other,
});

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Elements {
    pub wood: Presence,
    pub fire: Presence,
    pub earth: Presence,
    pub metal: Presence,
    pub water: Presence,
}

impl Elements {
    pub fn all(&self) -> [(&'static str, Presence); 5] {
        [
            ("wood", self.wood),
            ("fire", self.fire),
            ("earth", self.earth),
            ("metal", self.metal),
            ("water", self.water),
        ]
    }

    pub fn set(&mut self, name: &str, p: Presence) {
        match name {
            "wood" => self.wood = p,
            "fire" => self.fire = p,
            "earth" => self.earth = p,
            "metal" => self.metal = p,
            "water" => self.water = p,
            _ => {}
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Facts {
    pub bed_door: BedDoor,
    pub headboard: Headboard,
    pub headboard_solid: TriNa,
    pub over_bed: TriNa,
    pub mirror_facing_bed: TriNa,
    pub under_bed: UnderBed,
    pub bed_access: BedAccess,
    pub electronics_near_bed: Electronics,
    pub desk: Desk,
    pub door_path: DoorPath,
    pub door_opens_fully: Tri,
    pub door_window_aligned: Tri,
    pub clutter: Clutter,
    pub sharp_corners: Tri,
    pub natural_light: NaturalLight,
    pub artificial_light: ArtificialLight,
    pub plants: Plants,
    pub elements: Elements,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub kind: ItemKind,
    pub detail: String,
    pub r#box: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Opening {
    pub wall: Wall,
    pub at: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Window {
    pub wall: Wall,
    pub at: f64,
    pub size: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Piece {
    pub kind: ItemKind,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub head: Option<Wall>,
}

impl Piece {
    pub fn center(&self) -> (f64, f64) {
        (self.x + self.w / 2.0, self.y + self.h / 2.0)
    }

    pub fn overlaps(&self, o: &Piece, pad: f64) -> bool {
        self.x < o.x + o.w - pad
            && o.x < self.x + self.w - pad
            && self.y < o.y + o.h - pad
            && o.y < self.y + self.h - pad
    }

    /// Furniture that qi has to flow around (rugs and art don't block anything).
    pub fn blocks(&self) -> bool {
        !matches!(self.kind, ItemKind::Rug | ItemKind::Art | ItemKind::Clutter | ItemKind::Door | ItemKind::Window)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Layout {
    pub door: Option<Opening>,
    pub windows: Vec<Window>,
    pub pieces: Vec<Piece>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Scene {
    pub is_room: bool,
    pub kind: RoomKind,
    pub people_present: bool,
    pub confidence: Confidence,
    pub facts: Facts,
    pub items: Vec<Item>,
    pub layout: Layout,
    pub observations: Vec<String>,
}

/// A point on a wall, in room coordinates (x left→right, y far→near).
pub fn wall_point(wall: Wall, at: f64) -> (f64, f64) {
    match wall {
        Wall::Far => (at, 0.0),
        Wall::Near => (at, 1.0),
        Wall::Left => (0.0, at),
        Wall::Right => (1.0, at),
    }
}

/// Unit vector pointing from a wall into the room.
pub fn inward(wall: Wall) -> (f64, f64) {
    match wall {
        Wall::Far => (0.0, 1.0),
        Wall::Near => (0.0, -1.0),
        Wall::Left => (1.0, 0.0),
        Wall::Right => (-1.0, 0.0),
    }
}
