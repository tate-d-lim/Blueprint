import type { PartId } from "@/lib/plan/hotel";

/**
 * Where each part's label sits on the stage: on the left or right edge, at a fraction of the stage height. The places
 * are fixed so that no two labels overlap at 1280×800 or 1440×900, whatever the words say.
 */
export const LABEL_PLACES: Record<PartId, { side: "left" | "right"; y: number }> = {
  rules: { side: "left", y: 0.06 },
  rooms: { side: "left", y: 0.24 },
  walls: { side: "left", y: 0.4 },
  keycards: { side: "left", y: 0.56 },
  safe: { side: "left", y: 0.74 },
  frame: { side: "left", y: 0.9 },
  // The right column stays above the delivery dock (about 0.62 to 0.80 of the height) and picks up again below it.
  cctv: { side: "right", y: 0.04 },
  assistant: { side: "right", y: 0.15 },
  inspection: { side: "right", y: 0.26 },
  entrance: { side: "right", y: 0.37 },
  deliveries: { side: "right", y: 0.48 },
  generator: { side: "right", y: 0.88 },
};

/** The width of a label in pixels. Labels are narrow Archivo, two lines. */
export const LABEL_WIDTH = 192;
export const LABEL_HEIGHT = 46;
export const LABEL_EDGE = 12;

/** The room one label column takes from the edge of the stage, with a small gap before the building. */
export const LABEL_RESERVE = LABEL_EDGE + LABEL_WIDTH + 8;
