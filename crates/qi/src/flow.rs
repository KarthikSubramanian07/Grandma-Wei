//! The qi flow field: how energy moves from the door through the room.
//!
//! We treat qi like a gentle fluid. The door is a source, windows are sinks,
//! furniture is solid. Solving Laplace's equation on a small grid gives a
//! potential whose gradient is a smooth, plausible flow that bends around
//! the bed and squeezes past the wardrobe. Clutter doesn't block qi, it
//! traps it: those cells are marked stagnant. A straight shot from the door
//! to a window, or from the door to the foot of a bed in the coffin
//! position, is marked as sha (cutting qi).
//!
//! Output is a flat f32 grid, 4 channels per cell: vx, vy, stagnant, sha.
//! The browser advects ink particles through it on the GPU.

use crate::scene::*;

pub const CHANNELS: usize = 4;

#[derive(Debug, Clone)]
pub struct Field {
    pub w: usize,
    pub h: usize,
    pub data: Vec<f32>,
}

impl Field {
    pub fn at(&self, x: usize, y: usize) -> [f32; 4] {
        let i = (y * self.w + x) * CHANNELS;
        [self.data[i], self.data[i + 1], self.data[i + 2], self.data[i + 3]]
    }
}

#[derive(Clone, Copy, PartialEq)]
enum Cell {
    Open,
    Solid,
    Source,
    Sink,
}

fn cell_of(x: f64, y: f64, w: usize, h: usize) -> (usize, usize) {
    let cx = ((x * w as f64).floor() as isize).clamp(0, w as isize - 1) as usize;
    let cy = ((y * h as f64).floor() as isize).clamp(0, h as isize - 1) as usize;
    (cx, cy)
}

/// Grid cells along a wall opening, one cell deep, inside the room.
fn opening_cells(wall: Wall, at: f64, size: f64, w: usize, h: usize) -> Vec<(usize, usize)> {
    let n = 7;
    let mut cells = vec![];
    for i in 0..n {
        let t = (at - size / 2.0 + size * i as f64 / (n - 1) as f64).clamp(0.0, 1.0);
        let (px, py) = wall_point(wall, t);
        let (ix, iy) = inward(wall);
        // Nudge just inside the wall so the cell is in the room.
        let c = cell_of(px + ix * 0.5 / w as f64, py + iy * 0.5 / h as f64, w, h);
        if !cells.contains(&c) {
            cells.push(c);
        }
    }
    cells
}

pub fn solve(scene: &Scene, w: usize, h: usize, iterations: usize) -> Field {
    let w = w.clamp(8, 128);
    let h = h.clamp(8, 128);
    let layout = &scene.layout;
    let mut kind = vec![Cell::Open; w * h];
    let mut stagnant = vec![0f32; w * h];
    let mut sha = vec![0f32; w * h];
    let idx = |x: usize, y: usize| y * w + x;
    let center = |x: usize, y: usize| ((x as f64 + 0.5) / w as f64, (y as f64 + 0.5) / h as f64);

    for p in &layout.pieces {
        for y in 0..h {
            for x in 0..w {
                let (cx, cy) = center(x, y);
                let inside = cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h;
                if !inside {
                    continue;
                }
                if p.blocks() {
                    kind[idx(x, y)] = Cell::Solid;
                } else if p.kind == ItemKind::Clutter {
                    stagnant[idx(x, y)] = 1.0;
                }
            }
        }
    }
    // Heavy clutter with no pieces marked still stagnates the corners a little.
    if scene.facts.clutter == Clutter::Heavy {
        for y in 0..h {
            for x in 0..w {
                let (cx, cy) = center(x, y);
                let corner = (cx.min(1.0 - cx)).max(cy.min(1.0 - cy));
                if corner < 0.12 {
                    stagnant[idx(x, y)] = stagnant[idx(x, y)].max(0.5);
                }
            }
        }
    }

    let door = layout.door;
    let opposite = |w: Wall| match w {
        Wall::Near => Wall::Far,
        Wall::Far => Wall::Near,
        Wall::Left => Wall::Right,
        Wall::Right => Wall::Left,
    };
    let mut sources = vec![];
    let mut sinks = vec![];
    let mut weak_sink = false;
    if let Some(d) = door {
        // The usual case: qi enters at the door and leaves through the windows.
        sources = opening_cells(d.wall, d.at, 0.16, w, h);
        for win in &layout.windows {
            sinks.extend(opening_cells(win.wall, win.at, win.size.max(0.1), w, h));
        }
        // No window: qi still settles somewhere, weakly, at the wall across from the door.
        if sinks.is_empty() {
            weak_sink = true;
            sinks = opening_cells(opposite(d.wall), 0.5, 0.3, w, h);
        }
    } else if let Some(first) = layout.windows.first() {
        // No door in the photo: the room still breathes through its windows.
        weak_sink = true;
        for win in &layout.windows {
            sources.extend(opening_cells(win.wall, win.at, win.size.max(0.1), w, h));
        }
        sinks = opening_cells(opposite(first.wall), 0.5, 0.5, w, h);
    }
    for &(x, y) in &sources {
        kind[idx(x, y)] = Cell::Source;
    }
    for &(x, y) in &sinks {
        if kind[idx(x, y)] != Cell::Source {
            kind[idx(x, y)] = Cell::Sink;
        }
    }

    // Successive over-relaxation on the potential. Fixed iteration count and
    // fixed sweep order keep the result bit-for-bit deterministic.
    let mut phi = vec![0.5f64; w * h];
    for (i, k) in kind.iter().enumerate() {
        match k {
            Cell::Source => phi[i] = 1.0,
            Cell::Sink => phi[i] = 0.0,
            _ => {}
        }
    }
    let omega = 1.85;
    if sources.is_empty() {
        // No door and no window seen: no flow, only stagnation is meaningful.
        return pack(w, h, &vec![0.0; w * h], &vec![0.0; w * h], &stagnant, &sha);
    }
    for _ in 0..iterations {
        for y in 0..h {
            for x in 0..w {
                let i = idx(x, y);
                if kind[i] != Cell::Open {
                    continue;
                }
                let (mut sum, mut n) = (0.0, 0.0);
                for (dx, dy) in [(-1i32, 0i32), (1, 0), (0, -1), (0, 1)] {
                    let (nx, ny) = (x as i32 + dx, y as i32 + dy);
                    if nx < 0 || ny < 0 || nx >= w as i32 || ny >= h as i32 {
                        continue; // wall: no flux (Neumann)
                    }
                    let j = idx(nx as usize, ny as usize);
                    if kind[j] == Cell::Solid {
                        continue; // furniture: no flux
                    }
                    sum += phi[j];
                    n += 1.0;
                }
                if n > 0.0 {
                    phi[i] += omega * (sum / n - phi[i]);
                }
            }
        }
    }

    // Velocity = -grad(phi), central differences that respect solids and walls.
    let mut vx = vec![0f64; w * h];
    let mut vy = vec![0f64; w * h];
    let sample = |x: i32, y: i32, fallback: f64| -> f64 {
        if x < 0 || y < 0 || x >= w as i32 || y >= h as i32 {
            return fallback;
        }
        let j = idx(x as usize, y as usize);
        if kind[j] == Cell::Solid {
            fallback
        } else {
            phi[j]
        }
    };
    let mut max_speed: f64 = 1e-12;
    for y in 0..h {
        for x in 0..w {
            let i = idx(x, y);
            if kind[i] == Cell::Solid {
                continue;
            }
            let p = phi[i];
            let (xi, yi) = (x as i32, y as i32);
            let gx = (sample(xi + 1, yi, p) - sample(xi - 1, yi, p)) / 2.0;
            let gy = (sample(xi, yi + 1, p) - sample(xi, yi - 1, p)) / 2.0;
            vx[i] = -gx;
            vy[i] = -gy;
            max_speed = max_speed.max((gx * gx + gy * gy).sqrt());
        }
    }
    let scale = if weak_sink { 0.45 } else { 1.0 } / max_speed;
    for i in 0..w * h {
        vx[i] *= scale;
        vy[i] *= scale;
    }

    // Sha: a straight corridor from the door to a window directly opposite,
    // or from the door to a bed in the coffin position.
    if let Some(d) = door {
        let (dx, dy) = wall_point(d.wall, d.at);
        let mut targets: Vec<(f64, f64)> = vec![];
        if scene.facts.door_window_aligned == Tri::Yes {
            for win in &layout.windows {
                targets.push(wall_point(win.wall, win.at));
            }
        }
        if scene.facts.bed_door == BedDoor::Coffin {
            if let Some(bed) = layout.pieces.iter().find(|p| p.kind == ItemKind::Bed) {
                targets.push(bed.center());
            }
        }
        for (tx, ty) in targets {
            mark_corridor(&mut sha, w, h, (dx, dy), (tx, ty), 0.09);
        }
        // Sha never sits inside furniture.
        for i in 0..w * h {
            if kind[i] == Cell::Solid {
                sha[i] = 0.0;
            }
        }
    }

    pack(w, h, &vx, &vy, &stagnant, &sha)
}

fn mark_corridor(sha: &mut [f32], w: usize, h: usize, a: (f64, f64), b: (f64, f64), radius: f64) {
    let (abx, aby) = (b.0 - a.0, b.1 - a.1);
    let len2 = (abx * abx + aby * aby).max(1e-9);
    for y in 0..h {
        for x in 0..w {
            let (px, py) = ((x as f64 + 0.5) / w as f64, (y as f64 + 0.5) / h as f64);
            let t = (((px - a.0) * abx + (py - a.1) * aby) / len2).clamp(0.0, 1.0);
            let (qx, qy) = (a.0 + abx * t, a.1 + aby * t);
            let d = ((px - qx).powi(2) + (py - qy).powi(2)).sqrt();
            if d < radius {
                let v = (1.0 - d / radius) as f32;
                let i = y * w + x;
                sha[i] = sha[i].max(v);
            }
        }
    }
}

fn pack(w: usize, h: usize, vx: &[f64], vy: &[f64], stag: &[f32], sha: &[f32]) -> Field {
    let mut data = Vec::with_capacity(w * h * CHANNELS);
    for i in 0..w * h {
        data.push(vx[i] as f32);
        data.push(vy[i] as f32);
        data.push(stag[i]);
        data.push(sha[i]);
    }
    Field { w, h, data }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::*;

    #[test]
    fn field_has_the_right_shape() {
        let f = solve(&messy_scene(), 40, 32, 300);
        assert_eq!(f.data.len(), 40 * 32 * CHANNELS);
        assert!(f.data.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn qi_flows_away_from_the_door() {
        // Door on the near wall (bottom), window on the far wall (top):
        // in the open middle of the room, qi should be heading up (negative y).
        let s = perfect_scene();
        let f = solve(&s, 40, 32, 400);
        let [_, vy, _, _] = f.at(20, 20);
        assert!(vy < 0.0, "vy = {vy}");
    }

    #[test]
    fn furniture_is_still_water() {
        let s = messy_scene();
        let f = solve(&s, 40, 32, 300);
        let bed = s.layout.pieces.iter().find(|p| p.kind == ItemKind::Bed).unwrap();
        let (cx, cy) = bed.center();
        let [vx, vy, _, _] = f.at((cx * 40.0) as usize, (cy * 32.0) as usize);
        assert_eq!((vx, vy), (0.0, 0.0));
    }

    #[test]
    fn clutter_is_stagnant_and_coffin_is_sha() {
        let s = messy_scene();
        let f = solve(&s, 40, 32, 300);
        let stag = (0..40 * 32).filter(|i| f.data[i * CHANNELS + 2] > 0.5).count();
        let sha = (0..40 * 32).filter(|i| f.data[i * CHANNELS + 3] > 0.3).count();
        assert!(stag > 0, "expected stagnant cells");
        assert!(sha > 0, "expected sha cells in the coffin corridor");
    }

    #[test]
    fn same_input_same_field() {
        let s = messy_scene();
        assert_eq!(solve(&s, 40, 32, 300).data, solve(&s, 40, 32, 300).data);
    }

    #[test]
    fn no_door_breathes_through_windows() {
        let mut s = messy_scene();
        s.layout.door = None;
        let f = solve(&s, 20, 16, 200);
        assert!((0..20 * 16).any(|i| f.data[i * 4] != 0.0 || f.data[i * 4 + 1] != 0.0));
    }

    #[test]
    fn no_door_and_no_window_means_no_flow() {
        let mut s = messy_scene();
        s.layout.door = None;
        s.layout.windows.clear();
        let f = solve(&s, 20, 16, 100);
        assert!((0..20 * 16).all(|i| f.data[i * 4] == 0.0 && f.data[i * 4 + 1] == 0.0));
    }
}
