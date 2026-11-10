import { Group, type Mesh } from "three";
import { PARTS, type PartId } from "@/lib/plan/hotel";

/** The colours of the drawing. The blue line is for drawing only, never for text. */
export const HOTEL_COLOURS = { ground: "#f6f8fa", line: "#5f86b3", fill: "#eef3f9", light: "#ffc879" } as const;

/** What a builder can use to put things into its piece. `scene.ts` provides it; the test needs none of it. */
export interface Kit {
  /** A model from the Kenney kits. Centred on (x, z) and sitting on y unless `centre` is false. */
  put(url: string, x: number, y: number, z: number, rot: number, parent: Group, scale?: number, centre?: boolean): Promise<Group>;
  box(w: number, h: number, d: number, colour: string, x: number, y: number, z: number, parent: Group): Mesh;
  cyl(radius: number, h: number, colour: string, x: number, y: number, z: number, parent: Group, rotX?: number): Mesh;
}

/** Builds one piece of a part, in the coordinates of the hotel. */
export type Builder = (kit: Kit) => Promise<Group>;

const B = "/models/hotel/building/";
const F = "/models/hotel/furniture/";
const FS = 1.8;
const LV = 2.5;
const lv = (i: number) => i * LV;
const R90 = Math.PI / 2;

const BUILDING_MODELS = [
  "column",
  "floor",
  "roof-flat-center",
  "wall",
  "wall-doorway-square",
  "wall-doorway-wide-square",
  "wall-window-square",
  "wall-window-square-detailed",
  "wall-window-wide-square",
] as const;
const FURNITURE_MODELS = [
  "bedDouble",
  "bookcaseClosedWide",
  "cabinetTelevision",
  "cardboardBoxClosed",
  "chairDesk",
  "computerScreen",
  "desk",
  "kitchenBar",
  "lampRoundTable",
  "rugDoormat",
  "rugRounded",
  "sideTable",
  "televisionModern",
] as const;
const building = (name: (typeof BUILDING_MODELS)[number]) => `${B}${name}.glb`;
const furniture = (name: (typeof FURNITURE_MODELS)[number]) => `${F}${name}.glb`;

const piece =
  (fill: (g: Group, k: Kit) => Promise<unknown> | void): Builder =>
  async kit => {
    const g = new Group();
    await fill(g, kit);
    return g;
  };

const fur = (k: Kit, name: (typeof FURNITURE_MODELS)[number], x: number, y: number, z: number, rot: number, g: Group) => k.put(furniture(name), x, y, z, rot, g, FS);
const wall = (k: Kit, name: (typeof BUILDING_MODELS)[number], x: number, y: number, z: number, rot: number, g: Group) => k.put(building(name), x, y, z, rot, g, 1, false);

/** A level of back walls (along z = -3) or left walls (along x = -4). */
const wallType = (i: number): (typeof BUILDING_MODELS)[number] => (i < 0 ? "wall" : i === 0 ? "wall-window-square" : "wall-window-wide-square");
const back = (i: number) =>
  piece(async (g, k) => {
    for (const x of [-3, -1, 1, 3]) await wall(k, i === 0 && x === 1 ? "wall-window-square-detailed" : wallType(i), x, lv(i) + 0.1, -3, R90, g);
  });
const left = (i: number) =>
  piece(async (g, k) => {
    for (const z of [-2, 0, 2]) await wall(k, i === 0 && z === 2 ? "wall-doorway-square" : wallType(i), -4, lv(i) + 0.1, z, 0, g);
  });
const partition = (i: number) =>
  piece(async (g, k) => {
    for (const z of [-2, 2]) await wall(k, "wall", 0, lv(i) + 0.1, z, 0, g);
    await wall(k, "wall-doorway-square", 0, lv(i) + 0.1, 0, 0, g);
  });
const columns = (i: number) =>
  piece(async (g, k) => {
    for (const [x, z] of [[4, 3], [-4, 3], [4, -3]]) await wall(k, "column", x, lv(i) + 0.1, z, 0, g);
  });

const room = (cx: number) => ({
  bed: piece(async (g, k) => {
    await fur(k, "bedDouble", cx - 0.2, lv(1) + 0.1, -1.6, 0, g);
    await fur(k, "rugRounded", cx, lv(1) + 0.11, 0.6, 0, g);
  }),
  table: piece(async (g, k) => void (await fur(k, "sideTable", cx + 1.3, lv(1) + 0.1, -2.5, 0, g))),
  lamp: piece(async (g, k) => void (await fur(k, "lampRoundTable", cx + 1.3, lv(1) + 0.72, -2.5, 0, g))),
  tv: piece(async (g, k) => {
    await fur(k, "cabinetTelevision", cx + 0.4, lv(1) + 0.1, 2.4, Math.PI, g);
    await fur(k, "televisionModern", cx + 0.4, lv(1) + 0.9, 2.45, Math.PI, g);
  }),
});
const roomLeft = room(-2);
const roomRight = room(2);

const SCREENS: [number, number][] = [[-0.8, 0], [0, 0], [0.8, 0], [-0.4, 0.62], [0.4, 0.62]];
const screen = (n: number) =>
  piece((g, k) => {
    const [dx, dy] = SCREENS[n];
    k.box(0.72, 0.5, 0.06, "#2b2e36", 2 + dx, lv(2) + 1.25 + dy, -2.85, g);
    k.box(0.62, 0.4, 0.02, "#7fc4e8", 2 + dx, lv(2) + 1.25 + dy, -2.81, g);
  });

const BOXES: [number, number, number][] = [[6, 0, 0.4], [6.5, 0, 0.4], [6, 0.5, 0.4], [7.2, 0, 1.5], [6.4, 0, 1.6]];
const parcel = (n: number) => piece(async (g, k) => void (await fur(k, "cardboardBoxClosed", BOXES[n][0], 0.48 + BOXES[n][1], BOXES[n][2], 0, g)));

/** Where each part's label line meets the part, in the coordinates of the hotel. */
export const ANCHORS: Record<PartId, [number, number, number]> = {
  rules: [-2, lv(2) + 1.8, -1.6],
  cctv: [2, lv(2) + 1.6, -1.4],
  rooms: [-1, lv(1) + 1.6, 0],
  walls: [-4, lv(1) + 2, 1.6],
  keycards: [-1.2, 1.3, -1.4],
  assistant: [0.9, 1.5, 0.8],
  inspection: [2.2, 1.6, -2.2],
  entrance: [4.2, 2.3, 0.4],
  deliveries: [7.4, 2.1, 1.0],
  safe: [-2.4, lv(-1) + 2.1, 2.5],
  generator: [1.4, lv(-1) + 1.6, 2.5],
  frame: [-3.6, lv(-1) + 0.3, 3.2],
};

type PieceBuilders = { [P in (typeof PARTS)[number] as P["id"]]: Record<P["pieces"][number], Builder> };

/** One builder per piece, in the order of the part table. A missing or extra piece is a type error. */
export const BUILDERS: PieceBuilders = {
  rules: {
    desk: piece(async (g, k) => void (await fur(k, "desk", -2.4, lv(2) + 0.1, -1.2, 0, g))),
    chair: piece(async (g, k) => void (await fur(k, "chairDesk", -2.4, lv(2) + 0.1, -0.3, Math.PI, g))),
    bookcase: piece(async (g, k) => void (await fur(k, "bookcaseClosedWide", -1, lv(2) + 0.1, -2.6, 0, g))),
    "rules-board": piece((g, k) => {
      k.box(1.3, 1, 0.05, "#fbf8f0", -2.6, lv(2) + 1.7, -2.86, g);
      for (let n = 0; n < 4; n++) k.box(0.9, 0.05, 0.02, "#8a857b", -2.6, lv(2) + 2 - n * 0.18, -2.83, g);
      k.box(1.36, 0.08, 0.06, "#c69c6d", -2.6, lv(2) + 2.24, -2.86, g);
    }),
  },
  cctv: {
    desk: piece(async (g, k) => void (await fur(k, "desk", 2, lv(2) + 0.1, -2.2, 0, g))),
    chair: piece(async (g, k) => void (await fur(k, "chairDesk", 2, lv(2) + 0.1, -1.3, Math.PI, g))),
    "screen-1": screen(0),
    "screen-2": screen(1),
    "screen-3": screen(2),
    "screen-4": screen(3),
    "screen-5": screen(4),
    camera: piece((g, k) => {
      const cam = new Group();
      cam.position.set(3.85, lv(1) - 0.3, 2.85);
      g.add(cam);
      k.box(0.12, 0.12, 0.3, "#e9e5dc", 0, 0, 0, cam);
      k.box(0.3, 0.18, 0.18, "#e9e5dc", 0.12, -0.12, 0.12, cam);
      k.box(0.04, 0.04, 0.02, "#c8372d", 0.12, -0.12, 0.22, cam);
    }),
  },
  rooms: {
    "bed-left": roomLeft.bed,
    "table-left": roomLeft.table,
    "lamp-left": roomLeft.lamp,
    "tv-left": roomLeft.tv,
    "bed-right": roomRight.bed,
    "table-right": roomRight.table,
    "lamp-right": roomRight.lamp,
    "tv-right": roomRight.tv,
  },
  walls: {
    "basement-back": back(-1),
    "basement-left": left(-1),
    "ground-back": back(0),
    "ground-left": left(0),
    "first-back": back(1),
    "first-left": left(1),
    "first-partition": partition(1),
    "top-back": back(2),
    "top-left": left(2),
    "top-partition": partition(2),
  },
  keycards: {
    "desk-left": piece(async (g, k) => void (await fur(k, "kitchenBar", -1.6, 0.1, -2, 0, g))),
    "desk-right": piece(async (g, k) => void (await fur(k, "kitchenBar", -0.4, 0.1, -2, 0, g))),
    screen: piece(async (g, k) => void (await fur(k, "computerScreen", -1.5, 1.75, -2.2, 0, g))),
    keycards: piece((g, k) => {
      for (const dx of [-0.6, -0.35, -0.1]) k.box(0.18, 0.02, 0.28, "#e8b44a", dx, 1.75, -1.75, g);
    }),
    chair: piece(async (g, k) => void (await fur(k, "chairDesk", -1, 0.1, -2.6, Math.PI, g))),
  },
  assistant: {
    stand: piece((g, k) => void k.box(0.4, 1.2, 0.3, "#59616d", 0.9, 0.7, 0.8, g)),
    screen: piece((g, k) => void k.box(0.34, 0.24, 0.02, "#7fc4e8", 0.9, 1.0, 0.96, g)),
    speaker: piece((g, k) => void k.cyl(0.1, 0.04, "#2b2a33", 0.9, 1.32, 0.8, g)),
  },
  inspection: {
    extinguisher: piece((g, k) => {
      k.cyl(0.16, 0.75, "#c8372d", 3.5, 0.5, -2.75, g);
      k.cyl(0.07, 0.12, "#2b2a33", 3.5, 0.93, -2.75, g);
    }),
    board: piece((g, k) => {
      k.box(0.06, 1.6, 0.06, "#4a4f5a", 2.2, 0.9, -2.5, g);
      k.box(0.9, 1.1, 0.05, "#fbf8f0", 2.2, 1.5, -2.46, g);
    }),
    checklist: piece((g, k) => {
      for (let n = 0; n < 4; n++) {
        k.box(0.12, 0.12, 0.02, n < 2 ? "#2f6b4f" : "#d5cfc2", 1.9, 1.85 - n * 0.22, -2.43, g);
        k.box(0.45, 0.05, 0.02, "#9a958b", 2.25, 1.85 - n * 0.22, -2.43, g);
      }
    }),
  },
  entrance: {
    doorway: piece(async (g, k) => void (await wall(k, "wall-doorway-wide-square", 4, 0.1, 0, 0, g))),
    "scanner-left": piece((g, k) => {
      k.box(0.18, 1.3, 0.5, "#4a4f5a", 3.2, 0.75, -0.55, g);
      k.box(0.18, 0.08, 0.5, "#6fd39a", 3.2, 1.44, -0.55, g);
    }),
    "scanner-right": piece((g, k) => {
      k.box(0.18, 1.3, 0.5, "#4a4f5a", 3.2, 0.75, 0.55, g);
      k.box(0.18, 0.08, 0.5, "#6fd39a", 3.2, 1.44, 0.55, g);
    }),
    doormat: piece(async (g, k) => void (await fur(k, "rugDoormat", 4.9, 0.12, 0, R90, g))),
  },
  deliveries: {
    platform: piece((g, k) => void k.box(2.6, 0.35, 2.4, "#b9b4aa", 6.6, 0.3, 1, g)),
    "box-1": parcel(0),
    "box-2": parcel(1),
    "box-3": parcel(2),
    "box-4": parcel(3),
    "box-5": parcel(4),
    sign: piece((g, k) => {
      k.box(0.8, 1, 0.08, "#4a4f5a", 7.6, 0.98, 0.3, g);
      k.box(0.06, 1.3, 0.06, "#4a4f5a", 7.2, 1.1, 0.3, g);
    }),
  },
  safe: {
    vault: piece((g, k) => void k.box(1.6, 1.8, 1.2, "#59616d", -2.4, lv(-1) + 1, 1.7, g)),
    door: piece((g, k) => void k.box(1.3, 1.5, 0.04, "#6c7582", -2.4, lv(-1) + 1, 2.31, g)),
    wheel: piece((g, k) => {
      k.cyl(0.28, 0.08, "#d4af37", -2.4, lv(-1) + 1.05, 2.35, g, R90);
      for (const a of [0, 1, 2]) k.box(0.42, 0.04, 0.04, "#d4af37", -2.4, lv(-1) + 1.05, 2.4, g).rotation.z = (a * Math.PI) / 3;
    }),
  },
  generator: {
    body: piece((g, k) => {
      k.box(2.2, 1.2, 1.1, "#e0a92e", 2, lv(-1) + 0.7, 1.8, g);
      k.box(2.24, 0.12, 1.14, "#2b2a33", 2, lv(-1) + 1.0, 1.8, g);
    }),
    exhaust: piece((g, k) => {
      k.box(0.5, 0.4, 0.5, "#3d424c", 1.3, lv(-1) + 1.5, 1.8, g);
      k.cyl(0.08, 1.4, "#7b7f88", 1.3, lv(-1) + 2.3, 1.8, g);
    }),
    panel: piece((g, k) => {
      for (const dx of [2.4, 2.7]) k.box(0.18, 0.18, 0.04, "#3a8f5c", dx, lv(-1) + 0.75, 2.37, g);
    }),
  },
  frame: {
    footing: piece((g, k) => void k.box(8.6, 0.35, 6.6, "#a9a49a", 0, lv(-1) - 0.18, 0, g)),
    "columns-basement": columns(-1),
    "columns-ground": columns(0),
    "columns-first": columns(1),
    "columns-top": columns(2),
  },
};

/** The floors and the roof tiles are plain, always-built parts of the picture, so they are not pieces of a part. */
export const FLOOR_MODEL = building("floor");
export const ROOF_MODEL = building("roof-flat-center");

/** Every model file the hotel loads. */
export const MODEL_URLS: string[] = [...BUILDING_MODELS.map(building), ...FURNITURE_MODELS.map(furniture)];
