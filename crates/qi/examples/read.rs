//! Print Grandma's reading for a scene JSON file: `cargo run --example read -- room.json [chore ...]`
fn main() {
    let mut args = std::env::args().skip(1);
    let path = args.next().expect("usage: read <scene.json> [chore ids to imagine...]");
    let json = std::fs::read_to_string(&path).expect("read scene file");
    let scene = qi::parse_scene(&json).expect("valid scene");
    let chores: Vec<String> = args.collect();
    let scene = if chores.is_empty() {
        scene
    } else {
        let refs: Vec<&str> = chores.iter().map(String::as_str).collect();
        qi::imagine(&scene, &refs)
    };
    let r = qi::read(&scene);
    println!("{}", serde_json::to_string_pretty(&r).unwrap());
}
