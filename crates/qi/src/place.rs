//! Where should the bed go? Grandma's answer, drawn on the sketch.
//!
//! We try the bed against every wall that isn't the door wall, slide it
//! along, and keep spots that: fit in the room, don't hit other furniture,
//! don't block the door, don't put the headboard under a window, and aren't
//! in line with the door. Of those, the best spot sees the door diagonally,
//! sits far from it, and needs the least moving.

use crate::scene::*;

pub fn suggest_bed(scene: &Scene) -> Option<Piece> {
    let layout = &scene.layout;
    let door = layout.door?;
    let bed_idx = layout.pieces.iter().position(|p| p.kind == ItemKind::Bed)?;
    let bed = &layout.pieces[bed_idx];
    let long = bed.w.max(bed.h);
    let short = bed.w.min(bed.h);
    let (dx, dy) = wall_point(door.wall, door.at);
    let (bcx, bcy) = bed.center();
    let gap = 0.01;

    let mut best: Option<(f64, Piece)> = None;
    for wall in [Wall::Far, Wall::Left, Wall::Right, Wall::Near] {
        if wall == door.wall {
            continue;
        }
        for step in 0..=14 {
            let t = 0.15 + 0.05 * step as f64;
            let p = match wall {
                Wall::Far => Piece { kind: ItemKind::Bed, x: t - short / 2.0, y: gap, w: short, h: long, head: Some(wall) },
                Wall::Near => Piece { kind: ItemKind::Bed, x: t - short / 2.0, y: 1.0 - long - gap, w: short, h: long, head: Some(wall) },
                Wall::Left => Piece { kind: ItemKind::Bed, x: gap, y: t - short / 2.0, w: long, h: short, head: Some(wall) },
                Wall::Right => Piece { kind: ItemKind::Bed, x: 1.0 - long - gap, y: t - short / 2.0, w: long, h: short, head: Some(wall) },
            };
            if p.x < 0.0 || p.y < 0.0 || p.x + p.w > 1.0 || p.y + p.h > 1.0 {
                continue;
            }
            let hits_furniture = layout
                .pieces
                .iter()
                .enumerate()
                .any(|(i, o)| i != bed_idx && o.blocks() && p.overlaps(o, 0.005));
            if hits_furniture {
                continue;
            }
            // Keep the door's swing clear.
            let (nx, ny) = (dx.clamp(p.x, p.x + p.w), dy.clamp(p.y, p.y + p.h));
            if ((nx - dx).powi(2) + (ny - dy).powi(2)).sqrt() < 0.2 {
                continue;
            }
            // No headboard under a window.
            let under_window = layout.windows.iter().any(|win| {
                win.wall == wall && (win.at - t).abs() < (win.size + short) / 2.0
            });
            if under_window {
                continue;
            }
            // The foot of the bed, and which way it points.
            let (fx, fy) = inward(wall);
            let (cx, cy) = p.center();
            let foot = (cx + fx * long / 2.0, cy + fy * long / 2.0);
            let (vx, vy) = (dx - foot.0, dy - foot.1);
            let forward = vx * fx + vy * fy;
            let lateral = (vx * fy - vy * fx).abs();
            let coffin = forward > 0.0 && lateral < short / 2.0 + 0.05;
            if coffin {
                continue;
            }
            // Can you see the door from the pillow? Angle between the bed's axis and the door.
            let (hx, hy) = (cx - fx * long / 2.0, cy - fy * long / 2.0);
            let (ux, uy) = (dx - hx, dy - hy);
            let dist = (ux * ux + uy * uy).sqrt().max(1e-9);
            let cos = (ux * fx + uy * fy) / dist;
            if cos <= 0.05 {
                continue; // door is behind or beside the pillow: no view
            }
            let angle = cos.clamp(-1.0, 1.0).acos().to_degrees();
            let view = 1.0 - ((angle - 40.0).abs() / 50.0).min(1.0);
            let moved = ((cx - bcx).powi(2) + (cy - bcy).powi(2)).sqrt();
            let score = view * 2.0 + dist * 0.8 - moved * 0.35;
            if best.as_ref().is_none_or(|(s, _)| score > *s + 1e-12) {
                best = Some((score, p));
            }
        }
    }
    best.map(|(_, p)| p)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::*;

    #[test]
    fn suggests_a_spot_out_of_the_coffin() {
        let s = messy_scene();
        let p = suggest_bed(&s).expect("a spot");
        assert_ne!(p.head, Some(Wall::Near), "never against the door wall");
        assert!(p.x >= 0.0 && p.y >= 0.0 && p.x + p.w <= 1.0 && p.y + p.h <= 1.0);
        let others: Vec<_> = s.layout.pieces.iter().filter(|o| o.kind != ItemKind::Bed && o.blocks()).collect();
        assert!(others.iter().all(|o| !p.overlaps(o, 0.005)));
    }

    #[test]
    fn no_bed_no_suggestion() {
        let mut s = messy_scene();
        s.layout.pieces.retain(|p| p.kind != ItemKind::Bed);
        assert!(suggest_bed(&s).is_none());
    }

    #[test]
    fn suggestion_is_deterministic() {
        let s = messy_scene();
        assert_eq!(suggest_bed(&s), suggest_bed(&s));
    }
}
