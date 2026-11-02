import { Scene } from "@gw/schema";
import attic from "../../../fixtures/rooms/attic.json";
import teak from "../../../fixtures/rooms/teak.json";
import traveler from "../../../fixtures/rooms/traveler.json";

/** The practice rooms anyone can try without a photo or an API key. */
export const SAMPLES: Record<string, { title: string; photo: string; scene: Scene }> = {
  traveler: { title: "The Traveler", photo: "/samples/traveler.jpg", scene: Scene.parse(traveler) },
  attic: { title: "The Attic", photo: "/samples/attic.jpg", scene: Scene.parse(attic) },
  teak: { title: "The Teak Room", photo: "/samples/teak.jpg", scene: Scene.parse(teak) },
};
