import {
  BoxGeometry,
  Box3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OrthographicCamera,
  PCFSoftShadowMap,
  PointLight,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { LABEL_RESERVE } from "./labels";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PARTS, type Look, type PartId } from "@/lib/plan/hotel";
import { ANCHORS, BUILDERS, FLOOR_MODEL, HOTEL_COLOURS, ROOF_MODEL, type Builder, type Kit } from "./models";

export interface ScenePart {
  id: PartId;
  look: Look;
  solidPieces: number;
}

/**
 * Where the camera looks. `left` and `right` are the pixels at each edge of the stage that the building must stay out
 * of (the label columns, a card). With `focus`, the camera moves in on that part until it fills the free space.
 */
export interface SceneView {
  left: number;
  right: number;
  focus: PartId | null;
}

export interface HotelScene {
  /** Sets how built each part is. With `animate`, changed pieces drop in and the light fades on. */
  setParts(parts: ScenePart[], animate: boolean): void;
  /** Shows one part on its own (the others and the floors fade), or the whole hotel again with null. */
  isolate(id: PartId | null): void;
  /** Moves the camera to a new view. It eases there (at once with reduced motion) and resolves when it arrives. */
  view(next: SceneView): Promise<void>;
  /** Where a part's anchor is, in pixels inside the stage. Null when the part is not in the hotel. */
  anchorOnScreen(id: PartId): { x: number; y: number } | null;
  partAt(clientX: number, clientY: number): PartId | null;
  resize(): void;
  dispose(): void;
}

const LV = 2.5;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/** The walls and the frame change without the drop. */
const NO_DROP: PartId[] = ["walls", "frame"];
const DROP = 0.35;
const DIM = 0.12;
/** How close the camera goes on each part, as a share of the whole-hotel view. 1 is the whole building. */
const FOCUS: Record<PartId, number> = {
  rules: 0.34,
  cctv: 0.34,
  rooms: 0.5,
  walls: 1,
  keycards: 0.34,
  assistant: 0.3,
  inspection: 0.32,
  entrance: 0.36,
  deliveries: 0.4,
  safe: 0.32,
  generator: 0.32,
  frame: 1,
};

interface PieceRec {
  group: Group;
  meshes: Mesh[];
  solid: boolean;
  /** 0 to 1: how far the drop-in has got. */
  t: number;
}

interface PartRec {
  id: PartId;
  group: Group;
  pieces: PieceRec[];
  lamp: PointLight;
  lit: boolean;
  lightT: number;
  dim: boolean;
  ghost: MeshBasicMaterial;
  edge: LineBasicMaterial;
}

const NOOP_SCENE: HotelScene = {
  setParts: () => {},
  isolate: () => {},
  view: () => Promise.resolve(),
  anchorOnScreen: () => null,
  partAt: () => null,
  resize: () => {},
  dispose: () => {},
};

/**
 * The hotel: an orthographic, isometric cutaway drawn with Three.js from the Kenney kits. Imperative and client only.
 * Each part is a list of pieces; the first `solidPieces` show with their real materials, the rest as blue-line ghosts.
 */
export function createHotelScene(
  stage: HTMLElement,
  opts: { reducedMotion: boolean; visible: PartId[]; onReady(): void; onError(e: unknown): void },
): HotelScene {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true });
  } catch (e) {
    queueMicrotask(() => opts.onError(e));
    return NOOP_SCENE;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;
  stage.prepend(renderer.domElement);
  renderer.domElement.style.display = "block";

  const scene = new Scene();
  scene.background = new Color(HOTEL_COLOURS.ground);
  const camera = new OrthographicCamera(-1, 1, 1, -1, -200, 200);
  camera.position.set(20, 15.5, 20);
  camera.lookAt(1.2, 3.9, 0);
  // Half the visible height in world units: the whole hotel, roof open, fits the stage height.
  const ZOOM = 9.8;
  // The building's width in world units, and how far its centre sits from the view centre. The camera keeps the
  // building clear of the two label columns; the ground block and the dock may run under them.
  const BUILDING_WIDTH = 11.5;
  const BUILDING_SHIFT = -1.2;
  /** How long the camera takes to move in on a part, or back out, in seconds. */
  const MOVE = 0.9;

  let disposed = false;
  let dirty = true;
  let built = false;
  let view: SceneView = { left: LABEL_RESERVE, right: LABEL_RESERVE, focus: null };
  // The camera is a centre and a half height, in camera space. A move goes from `from` to `to`.
  type Cam = { cx: number; cy: number; z: number };
  let cam: Cam = { cx: BUILDING_SHIFT, cy: 0, z: ZOOM };
  let from: Cam = cam;
  let to: Cam = cam;
  let camT = 1;
  let arrived: (() => void)[] = [];

  const point = new Vector3();
  /** The camera for the current view and stage size. */
  const aim = (): Cam => {
    const W = stage.clientWidth || 1;
    const H = stage.clientHeight || 1;
    const free = Math.max(1, W - view.left - view.right);
    // How far the middle of the free space is from the middle of the stage, in pixels.
    const off = view.left + free / 2 - W / 2;
    const rec = view.focus ? recs.get(view.focus) : undefined;
    if (!rec || !built) {
      const z = Math.max(ZOOM, (BUILDING_WIDTH * H) / (2 * free));
      return { cx: BUILDING_SHIFT - (off * 2 * z) / H, cy: 0, z };
    }
    // Close in on the part's anchor (the point its label line goes to). A part that runs through the whole building
    // gets the whole building, a little closer.
    const share = FOCUS[rec.id];
    if (share >= 1) {
      const z = Math.max(ZOOM * 0.9, (BUILDING_WIDTH * H) / (2 * free));
      return { cx: BUILDING_SHIFT - (off * 2 * z) / H, cy: 0, z };
    }
    camera.updateMatrixWorld();
    point.set(...ANCHORS[rec.id]).applyMatrix4(camera.matrixWorldInverse);
    const z = ZOOM * share;
    return { cx: point.x - (off * 2 * z) / H, cy: point.y, z };
  };

  const place = (c: Cam) => {
    const a = (stage.clientWidth || 1) / (stage.clientHeight || 1);
    Object.assign(camera, { left: -c.z * a + c.cx, right: c.z * a + c.cx, top: c.z + c.cy, bottom: -c.z + c.cy });
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const land = () => {
    camT = 1;
    cam = to;
    place(cam);
    const done = arrived;
    arrived = [];
    done.forEach(f => f());
  };

  const fit = () => {
    renderer.setSize(stage.clientWidth || 1, stage.clientHeight || 1);
    // A resize lands the camera at once, wherever it was going.
    to = aim();
    land();
  };
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(stage);

  scene.add(new HemisphereLight("#fffaf0", "#b8b09c", 1.5));
  const sun = new DirectionalLight("#fff2dc", 2.2);
  sun.position.set(-6, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 4;
  scene.add(sun);

  // ---------- kit ----------
  const loader = new GLTFLoader();
  const cache = new Map<string, Promise<Object3D>>();
  const load = (url: string) => {
    let p = cache.get(url);
    if (!p) {
      p = loader.loadAsync(url).then(g => g.scene);
      cache.set(url, p);
    }
    return p;
  };
  const stdMat = (colour: string) => new MeshStandardMaterial({ color: colour, roughness: 0.9 });
  const kit: Kit = {
    async put(url, x, y, z, rot, parent, scale = 1, centre = true) {
      const source = await load(url);
      const model = source.clone(true);
      model.traverse(o => {
        const mesh = o as Mesh;
        if (mesh.isMesh) {
          mesh.material = (mesh.material as Material).clone();
          mesh.castShadow = mesh.receiveShadow = true;
        }
      });
      const g = new Group();
      g.add(model);
      model.scale.setScalar(scale);
      if (centre) {
        const b = new Box3().setFromObject(model);
        const c = b.getCenter(new Vector3());
        model.position.set(-c.x, -b.min.y, -c.z);
      }
      g.position.set(x, y, z);
      g.rotation.y = rot;
      parent.add(g);
      return g;
    },
    box(w, h, d, colour, x, y, z, parent) {
      const m = new Mesh(new BoxGeometry(w, h, d), stdMat(colour));
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    },
    cyl(radius, h, colour, x, y, z, parent, rotX = 0) {
      const m = new Mesh(new CylinderGeometry(radius, radius, h, 24), stdMat(colour));
      m.position.set(x, y, z);
      m.rotation.x = rotX;
      m.castShadow = true;
      parent.add(m);
      return m;
    },
  };

  // ---------- the ground, cut flush with the hotel front, and the floors ----------
  const world = new Group();
  scene.add(world);
  for (const [w, d, x, z] of [[5, 10, -6.5, -2], [5, 10, 6.5, -2], [8, 4, 0, -5]]) {
    kit.box(w, 2.6, d, "#8b6f55", x, -1.3, z, world);
    kit.box(w, 0.12, d, "#b9c79a", x, 0.06, z, world);
  }
  kit.box(18, 0.6, 10, "#6f5843", 0, -2.9, -2, world);
  kit.box(5, 0.06, 3.6, "#cfccc4", 6.5, 0.13, 1, world);

  const slabs = new Group();
  scene.add(slabs);
  for (let i = -1; i <= 2; i++) {
    kit.box(8, 0.1, 0.04, "#3b3a42", 0, i * LV + 0.05, 3.02, slabs);
    kit.box(0.04, 0.1, 6, "#3b3a42", 4.02, i * LV + 0.05, 0, slabs);
  }

  const roof = new Group();
  roof.position.set(0, 3 * LV + 0.1, -3);
  scene.add(roof);
  kit.box(8.2, 0.25, 0.2, "#55525e", 0, 0.12, 0, roof);
  kit.box(0.2, 0.25, 6.2, "#55525e", -4, 0.12, 3, roof);
  let roofT = opts.reducedMotion ? 1 : 0;
  // Close in on a part, the roof fades away so it does not hide the top floor. 1 is the roof as drawn.
  let roofShow = 1;
  let roofTo = 1;
  const showRoof = (v: number) => {
    roofShow = v;
    roof.visible = v > 0;
    roof.traverse(o => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as Material;
      m.transparent = v < 1;
      m.opacity = v;
      m.depthWrite = v >= 1;
    });
    dirty = true;
  };
  roof.rotation.x = -ease(roofT) * 1.02;

  // ---------- parts ----------
  const recs = new Map<PartId, PartRec>();
  for (const def of PARTS) {
    if (!opts.visible.includes(def.id)) continue;
    const group = new Group();
    group.userData.partId = def.id;
    scene.add(group);
    const a = ANCHORS[def.id];
    const lamp = new PointLight(HOTEL_COLOURS.light, 0, 7, 1.6);
    lamp.position.set(a[0], a[1] + 0.4, a[2] - 0.4);
    scene.add(lamp);
    recs.set(def.id, {
      id: def.id,
      group,
      pieces: [],
      lamp,
      lit: false,
      lightT: 1,
      dim: false,
      ghost: new MeshBasicMaterial({ color: HOTEL_COLOURS.fill, transparent: true, opacity: 0.55, depthWrite: false }),
      edge: new LineBasicMaterial({ color: HOTEL_COLOURS.line, transparent: true, opacity: 0.9 }),
    });
  }

  const applyLook = (rec: PartRec, piece: PieceRec) => {
    for (const m of piece.meshes) {
      m.material = piece.solid ? m.userData.real : rec.ghost;
      (m.userData.edges as LineSegments).visible = !piece.solid;
      m.castShadow = piece.solid;
    }
  };

  const applyDim = (rec: PartRec) => {
    const close = view.focus === rec.id;
    rec.ghost.opacity = rec.dim ? 0.1 : close ? 0.8 : 0.55;
    rec.edge.opacity = rec.dim ? 0.15 : close ? 1 : 0.9;
    for (const piece of rec.pieces)
      for (const m of piece.meshes) {
        const real = m.userData.real as Material;
        real.transparent = rec.dim;
        real.opacity = rec.dim ? DIM : 1;
        real.depthWrite = !rec.dim;
        real.needsUpdate = true;
      }
  };

  const snap = (rec: PartRec, group: Group): PieceRec => {
    const meshes: Mesh[] = [];
    group.traverse(o => {
      const mesh = o as Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });
    for (const m of meshes) {
      m.userData.real = m.material;
      const edges = new LineSegments(new EdgesGeometry(m.geometry, 35), rec.edge);
      edges.raycast = () => {};
      m.add(edges);
      m.userData.edges = edges;
    }
    const piece: PieceRec = { group, meshes, solid: false, t: 1 };
    applyLook(rec, piece);
    return piece;
  };

  let pending: { parts: ScenePart[]; animate: boolean } | null = null;

  const apply = (parts: ScenePart[], animate: boolean) => {
    const moving = animate && !opts.reducedMotion;
    for (const sp of parts) {
      const rec = recs.get(sp.id);
      if (!rec) continue;
      rec.pieces.forEach((piece, i) => {
        const solid = i < sp.solidPieces;
        if (solid === piece.solid) return;
        piece.solid = solid;
        applyLook(rec, piece);
        piece.t = solid && moving && !NO_DROP.includes(rec.id) ? 0 : 1;
        piece.group.position.y = piece.t < 1 ? DROP : 0;
      });
      const lit = sp.look === "lit";
      if (lit !== rec.lit) {
        rec.lit = lit;
        rec.lightT = lit && moving ? 0 : 1;
      }
    }
    dirty = true;
  };

  const buildAll = async () => {
    // Floors and roof tiles are plain, always-built parts of the picture.
    for (let i = -1; i <= 2; i++)
      for (const x of [-3, -1, 1, 3]) for (const z of [-2, 0, 2]) await kit.put(FLOOR_MODEL, x, i * LV, z, 0, slabs, 1, false);
    for (const x of [-3, -1, 1, 3]) for (const z of [1, 3, 5]) await kit.put(ROOF_MODEL, x, 0, z, 0, roof, 1, false);
    for (const def of PARTS) {
      const rec = recs.get(def.id);
      if (!rec) continue;
      const builders = BUILDERS[def.id] as Record<string, Builder>;
      const groups = await Promise.all(def.pieces.map(name => builders[name](kit)));
      for (const g of groups) {
        rec.group.add(g);
        rec.pieces.push(snap(rec, g));
      }
    }
  };

  buildAll().then(
    () => {
      if (disposed) return;
      built = true;
      // A part picked while the models loaded gets its close view now.
      if (view.focus) {
        to = aim();
        land();
      }
      if (pending) apply(pending.parts, pending.animate);
      pending = null;
      dirty = true;
      opts.onReady();
    },
    e => {
      if (!disposed) opts.onError(e);
    },
  );

  // ---------- loop ----------
  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let moving = false;
    if (camT < 1) {
      camT = Math.min(1, camT + dt / MOVE);
      if (camT >= 1) land();
      else {
        // Ease out hard, and zoom on a log scale, so the move feels even from far out to close in.
        const k = 1 - Math.pow(1 - camT, 4);
        const z = Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * k);
        cam = { cx: from.cx + (to.cx - from.cx) * k, cy: from.cy + (to.cy - from.cy) * k, z };
        place(cam);
      }
      moving = true;
    }
    if (roofShow !== roofTo) {
      const step = dt / 0.35;
      showRoof(roofTo > roofShow ? Math.min(roofTo, roofShow + step) : Math.max(roofTo, roofShow - step));
      moving = true;
    }
    if (roofT < 1) {
      roofT = Math.min(1, roofT + dt / 1.4);
      roof.rotation.x = -ease(roofT) * 1.02;
      moving = true;
    }
    for (const rec of recs.values()) {
      for (const piece of rec.pieces) {
        if (piece.t >= 1) continue;
        piece.t = Math.min(1, piece.t + dt / 0.4);
        piece.group.position.y = (1 - ease(piece.t)) * DROP;
        moving = true;
      }
      if (rec.lightT < 1) {
        rec.lightT = Math.min(1, rec.lightT + dt / 0.7);
        moving = true;
      }
      rec.lamp.intensity = rec.lit ? ease(rec.lightT) * 9 : 0;
    }
    if (moving || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  };
  raf = requestAnimationFrame(frame);

  const ray = new Raycaster();
  const pointer = new Vector2();

  return {
    setParts(parts, animate) {
      if (!built) pending = { parts, animate };
      else apply(parts, animate);
    },
    isolate(id) {
      for (const rec of recs.values()) {
        rec.dim = id !== null && rec.id !== id;
        applyDim(rec);
      }
      slabs.traverse(o => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const m = mesh.material as Material;
        m.transparent = id !== null;
        m.opacity = id !== null ? DIM : 1;
        m.depthWrite = id === null;
        m.needsUpdate = true;
      });
      dirty = true;
    },
    view(next) {
      view = next;
      roofTo = next.focus ? 0 : 1;
      if (opts.reducedMotion) showRoof(roofTo);
      for (const rec of recs.values()) applyDim(rec);
      return new Promise<void>(resolve => {
        arrived.push(resolve);
        from = cam;
        to = aim();
        const near = Math.abs(to.cx - cam.cx) + Math.abs(to.cy - cam.cy) + Math.abs(to.z - cam.z) < 1e-3;
        if (opts.reducedMotion || disposed || near) land();
        else camT = 0;
      });
    },
    anchorOnScreen(id) {
      if (!recs.has(id)) return null;
      const v = new Vector3(...ANCHORS[id]).project(camera);
      return { x: ((v.x + 1) / 2) * stage.clientWidth, y: ((1 - v.y) / 2) * stage.clientHeight };
    },
    partAt(clientX, clientY) {
      const b = renderer.domElement.getBoundingClientRect();
      pointer.set(((clientX - b.left) / b.width) * 2 - 1, -((clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const targets = [...recs.values()].filter(r => r.id !== "walls").map(r => r.group);
      const hit = ray.intersectObjects(targets, true)[0];
      for (let o: Object3D | null = hit?.object ?? null; o; o = o.parent) if (o.userData.partId) return o.userData.partId as PartId;
      return null;
    },
    resize: fit,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      scene.traverse(o => {
        const mesh = o as Mesh;
        if (!mesh.isMesh && !(o as LineSegments).isLineSegments) return;
        mesh.geometry?.dispose();
      });
      for (const rec of recs.values()) {
        rec.ghost.dispose();
        rec.edge.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
