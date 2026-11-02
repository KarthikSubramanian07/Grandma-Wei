//! # qi
//!
//! Grandma Wei's rules engine. Everything that decides a score lives here,
//! in plain deterministic Rust, so the same room always gets the same verdict,
//! on the server and in the browser alike (via WebAssembly).

pub mod chores;
pub mod flow;
mod fixtures;
pub mod magnets;
pub mod place;
pub mod reading;
pub mod rules;
pub mod scene;

pub use chores::{apply_chores, chores_for, Chore, Effort};
pub use flow::{solve as flow_field, Field};
pub use magnets::{diff, Diff, ALL_MAGNETS};
pub use place::suggest_bed;
pub use reading::{read, Reading, State};
pub use scene::Scene;

/// Bumped whenever scoring changes, so stored readings can say which rules judged them.
pub const RULES_VERSION: u32 = 1;

pub fn parse_scene(json: &str) -> Result<Scene, String> {
    serde_json::from_str(json).map_err(|e| format!("scene: {e}"))
}

#[cfg(feature = "wasm")]
mod wasm {
    use super::*;
    use wasm_bindgen::prelude::*;

    fn err(e: impl std::fmt::Display) -> JsError {
        JsError::new(&e.to_string())
    }

    /// Score a scene. Takes and returns JSON strings.
    #[wasm_bindgen(js_name = read)]
    pub fn read_js(scene_json: &str) -> Result<String, JsError> {
        let scene = parse_scene(scene_json).map_err(err)?;
        serde_json::to_string(&read(&scene)).map_err(err)
    }

    /// Compare two scenes: what changed, by how much, which magnets were earned.
    #[wasm_bindgen(js_name = diff)]
    pub fn diff_js(prev_json: &str, next_json: &str) -> Result<String, JsError> {
        let prev = parse_scene(prev_json).map_err(err)?;
        let next = parse_scene(next_json).map_err(err)?;
        serde_json::to_string(&diff(&prev, &next)).map_err(err)
    }

    /// "What if I did these chores": returns a scene with the fixes applied,
    /// including the bed moved to Grandma's suggested spot on the sketch.
    #[wasm_bindgen(js_name = imagine)]
    pub fn imagine_js(scene_json: &str, chore_ids_json: &str) -> Result<String, JsError> {
        let scene = parse_scene(scene_json).map_err(err)?;
        let ids: Vec<String> = serde_json::from_str(chore_ids_json).map_err(err)?;
        let refs: Vec<&str> = ids.iter().map(String::as_str).collect();
        serde_json::to_string(&imagine(&scene, &refs)).map_err(err)
    }

    /// Grandma's suggested bed spot, or null.
    #[wasm_bindgen(js_name = suggestBed)]
    pub fn suggest_bed_js(scene_json: &str) -> Result<String, JsError> {
        let scene = parse_scene(scene_json).map_err(err)?;
        serde_json::to_string(&suggest_bed(&scene)).map_err(err)
    }

    /// The qi flow field as a flat Float32Array: [vx, vy, stagnant, sha] per cell, row-major.
    #[wasm_bindgen(js_name = flowField)]
    pub fn flow_field_js(scene_json: &str, w: usize, h: usize) -> Result<Vec<f32>, JsError> {
        let scene = parse_scene(scene_json).map_err(err)?;
        Ok(flow_field(&scene, w, h, 500).data)
    }

    #[wasm_bindgen(js_name = rulesVersion)]
    pub fn rules_version_js() -> u32 {
        RULES_VERSION
    }
}

/// Apply chores to a scene, moving furniture on the sketch where the chore implies it.
pub fn imagine(scene: &Scene, ids: &[&str]) -> Scene {
    let mut out = scene.clone();
    out.facts = apply_chores(&scene.facts, ids);
    if ids.contains(&"move_bed") {
        if let Some(spot) = suggest_bed(scene) {
            if let Some(bed) = out.layout.pieces.iter_mut().find(|p| p.kind == scene::ItemKind::Bed) {
                *bed = spot;
            }
        }
    }
    if ids.contains(&"declutter") {
        out.layout.pieces.retain(|p| p.kind != scene::ItemKind::Clutter);
    }
    if ids.contains(&"clear_door_path") {
        out.layout.pieces.retain(|p| p.kind != scene::ItemKind::Clutter);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn imagine_moves_the_bed_and_clears_clutter() {
        let s = fixtures::messy_scene();
        let after = imagine(&s, &["move_bed", "declutter"]);
        let bed_before = s.layout.pieces.iter().find(|p| p.kind == scene::ItemKind::Bed).unwrap();
        let bed_after = after.layout.pieces.iter().find(|p| p.kind == scene::ItemKind::Bed).unwrap();
        assert_ne!(bed_before, bed_after);
        assert!(after.layout.pieces.iter().all(|p| p.kind != scene::ItemKind::Clutter));
        assert!(read(&after).score > read(&s).score);
    }

    #[test]
    fn scene_json_round_trips() {
        let s = fixtures::messy_scene();
        let json = serde_json::to_string(&s).unwrap();
        assert_eq!(parse_scene(&json).unwrap(), s);
    }
}

#[cfg(test)]
pub(crate) mod export_for_fixture_files {
    /// Writes the test scenes as JSON so the TypeScript side can check it parses the same shape.
    #[test]
    fn write_shared_fixture() {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/contract");
        std::fs::create_dir_all(dir).unwrap();
        for (name, s) in [("messy", super::fixtures::messy_scene()), ("perfect", super::fixtures::perfect_scene())] {
            let mut v = serde_json::to_value(&s).unwrap();
            v["items"] = serde_json::json!([{ "id": "bed", "kind": "bed", "detail": "the bed", "box": [0.3, 0.4, 0.4, 0.3] }]);
            std::fs::write(format!("{dir}/{name}.scene.json"), serde_json::to_string_pretty(&v).unwrap() + "\n").unwrap();
            let r = super::read(&serde_json::from_value(v).unwrap());
            std::fs::write(format!("{dir}/{name}.reading.json"), serde_json::to_string_pretty(&r).unwrap() + "\n").unwrap();
        }
    }
}
