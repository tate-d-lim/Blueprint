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
  cctv: { side: "right", y: 0.06 },
  assistant: { side: "right", y: 0.26 },
  inspection: { side: "right", y: 0.42 },
  entrance: { side: "right", y: 0.56 },
  deliveries: { side: "right", y: 0.7 },
  generator: { side: "right", y: 0.86 },
};

/** The width of a label in pixels. Labels are narrow Archivo, two lines. */
export const LABEL_WIDTH = 192;
export const LABEL_HEIGHT = 46;
export const LABEL_EDGE = 12;
