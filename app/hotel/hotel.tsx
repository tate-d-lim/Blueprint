"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PARTS, type PartId, type PartState } from "@/lib/plan/hotel";
import { LABEL_EDGE, LABEL_HEIGHT, LABEL_PLACES, LABEL_RESERVE, LABEL_WIDTH } from "./labels";
import type { HotelScene } from "./scene";

type Status = "loading" | "ready" | "fallback";

const anchorsOf = (scene: HotelScene) =>
  Object.fromEntries(PARTS.flatMap(p => (scene.anchorOnScreen(p.id) ? [[p.id, scene.anchorOnScreen(p.id)!]] : []))) as Partial<
    Record<PartId, { x: number; y: number }>
  >;

/**
 * The hotel: a Three.js cutaway drawn from the part states. Three.js loads only here, on the pages that show the
 * hotel. Until the models are ready (and for good if WebGL or a model fails) a still image takes its place.
 *
 * Without `onPick`, the labels and their lines are decoration for the pointer, and the page gives a list for the
 * keyboard and screen readers. With `onPick` (step 4), each label is a button, a click on a part picks it too, and
 * `view` moves the camera in on the picked part.
 */
export function Hotel({
  parts,
  selected,
  onSelect,
  interactive,
  card,
  onPick,
  view,
  labels = "shown",
}: {
  parts: PartState[];
  selected: PartId | null;
  onSelect: (id: PartId | null) => void;
  interactive: boolean;
  /** Step 5: shown next to the selected part. */
  card?: ReactNode;
  /** Step 4: a click on a part, or on its label. */
  onPick?: (id: PartId) => void;
  /** Step 4: the pixels a card covers at the left of the stage, and the part to move in on. */
  view?: { inset: number; focus: PartId | null };
  /** Step 4's tour: no labels yet, or the labels coming in one by one. */
  labels?: "shown" | "hidden" | "enter";
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [scene, setScene] = useState<HotelScene | null>(null);
  const [anchors, setAnchors] = useState<Partial<Record<PartId, { x: number; y: number }>>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const applied = useRef(false);
  const hover = useRef<PartId | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedRef.current = selected;
  });

  // The parts that are in this hotel are fixed for the life of the page (the assistant needs the GenAI answer).
  const visibleKey = parts.map(p => p.id).join(",");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let live: HotelScene | null = null;
    let cancelled = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./scene").then(
      ({ createHotelScene }) => {
        if (cancelled) return;
        live = createHotelScene(host, {
          reducedMotion,
          visible: visibleKey.split(",") as PartId[],
          onReady: () => !cancelled && setStatus("ready"),
          onError: () => !cancelled && setStatus("fallback"),
        });
        setScene(live);
      },
      () => !cancelled && setStatus("fallback"),
    );
    return () => {
      cancelled = true;
      live?.dispose();
      setScene(null);
      applied.current = false;
    };
  }, [visibleKey]);

  // Follow the part states. The first set is shown at once; later ones animate.
  useEffect(() => {
    if (!scene) return;
    scene.setParts(
      parts.map(p => ({ id: p.id, look: p.look, solidPieces: p.solidPieces })),
      applied.current,
    );
    applied.current = true;
  }, [scene, parts]);

  useEffect(() => {
    scene?.isolate(selected);
  }, [scene, selected]);

  // The stage size, kept up to date on resize. The labels need it before the models load.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setSize({ w: stage.clientWidth, h: stage.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // The anchors, when the hotel is ready and after every resize.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !scene || status !== "ready") return;
    const measure = () => setAnchors(anchorsOf(scene));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [scene, status]);

  // Step 4's camera: clear of the card and the label columns, or close in on the picked part. The labels and their
  // lines wait until the camera arrives.
  const inset = view?.inset ?? 0;
  const focus = view?.focus ?? null;
  const viewKey = view ? `${inset}|${focus ?? ""}|${size.w}x${size.h}|${status}` : "";
  const [arrivedAt, setArrivedAt] = useState("");
  useEffect(() => {
    if (!scene || !viewKey) return;
    let live = true;
    const gap = 24;
    scene
      .view(focus ? { left: inset + gap, right: gap, focus } : { left: inset + LABEL_RESERVE, right: LABEL_RESERVE, focus: null })
      .then(() => {
        if (!live) return;
        setAnchors(anchorsOf(scene));
        setArrivedAt(viewKey);
      });
    return () => {
      live = false;
    };
    // The key holds every input of the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, viewKey]);
  const still = !viewKey || !scene || status === "fallback" || arrivedAt === viewKey;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onSelectRef.current(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const point = (e: React.PointerEvent) => {
    if (!scene || !interactive) return;
    const id = scene.partAt(e.clientX, e.clientY);
    if (onPick && stageRef.current) stageRef.current.style.cursor = id ? "pointer" : "";
    if (id === hover.current) return;
    const previous = hover.current;
    hover.current = id;
    if (id) onSelectRef.current(id);
    else if (selectedRef.current === previous) onSelectRef.current(null);
  };
  const leave = () => {
    const previous = hover.current;
    hover.current = null;
    // A part pressed in the list stays; one only pointed at goes away with the pointer.
    if (previous && selectedRef.current === previous) onSelectRef.current(null);
  };

  const click = (e: React.MouseEvent) => {
    if (!scene || !interactive || !onPick) return;
    const id = scene.partAt(e.clientX, e.clientY);
    if (id) onPick(id);
  };

  const states = useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);
  const ready = status === "ready";

  const place = (id: PartId) => {
    const spot = LABEL_PLACES[id];
    const top = Math.max(0, Math.min(spot.y * size.h, size.h - LABEL_HEIGHT));
    return { spot, top, left: spot.side === "left" ? inset + LABEL_EDGE : size.w - LABEL_EDGE - LABEL_WIDTH };
  };

  const anchor = selected ? anchors[selected] : undefined;

  return (
    <div
      ref={stageRef}
      data-hotel={status}
      data-selected={selected ?? ""}
      data-focus={focus ?? ""}
      onPointerMove={point}
      onPointerLeave={leave}
      onClick={click}
      className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-rule bg-ground"
    >
      <div ref={hostRef} className="absolute inset-0" />
      {/* The still image is a plain picture of the hotel, so it is not worth the image optimiser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!ready && <img src="/models/hotel/still.png" alt="" className="absolute inset-0 h-full w-full object-contain" />}

      {(ready || onPick) && size.w > 0 && (
        <>
          {/* Step 4 hides the labels while it is close in on a part, and fades them while the camera moves. They are
              visible again at once on the way out, so a label can take the keyboard focus back. */}
          <div
            className={
              focus || labels === "hidden"
                ? "invisible opacity-0 [transition:opacity_200ms,visibility_0s_200ms]"
                : `visible [transition:opacity_200ms] ${still ? "opacity-100" : "pointer-events-none opacity-0"}`
            }
          >
            {ready && (
              <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full ${labels === "enter" ? "label-in" : ""}`} style={labels === "enter" ? { animationDelay: `${parts.length * 45 + 100}ms` } : undefined}>
                {parts.map(p => {
                  const a = anchors[p.id];
                  if (!a) return null;
                  const { spot, top, left } = place(p.id);
                  const x = spot.side === "left" ? left + LABEL_WIDTH : left;
                  return (
                    <line key={p.id} x1={x} y1={top + LABEL_HEIGHT / 2} x2={a.x} y2={a.y} stroke="#1c2b3a" strokeWidth={1} opacity={selected && selected !== p.id ? 0.2 : 0.8} />
                  );
                })}
              </svg>
            )}
            {parts.map((p, i) => {
              const { spot, top, left } = place(p.id);
              const state = states.get(p.id)!;
              const chosen = selected === p.id;
              const words = (
                <>
                  <span className="font-semibold text-ink">
                    {state.question && <span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-redline align-middle" />}
                    {state.line1}
                  </span>
                  <span className="tnum text-ink-soft">{state.line2}</span>
                  {onPick && state.question && <span className="sr-only">Has open questions.</span>}
                </>
              );
              const className = `narrow absolute flex flex-col justify-center overflow-hidden rounded-sm border bg-paper px-2 text-[12px] leading-[1.2] ${
                spot.side === "right" ? "text-right" : "text-left"
              } ${chosen ? "border-ink" : "border-rule"} ${selected && !chosen ? "opacity-40" : ""} ${labels === "enter" ? "label-in" : ""}`;
              const style = { top, left, width: LABEL_WIDTH, height: LABEL_HEIGHT, ...(labels === "enter" ? { animationDelay: `${i * 45}ms` } : {}) };
              // Pointing at a label shows its part, the same as pointing at the part itself.
              const enter = () => {
                if (!interactive) return;
                hover.current = p.id;
                onSelectRef.current(p.id);
              };
              if (onPick)
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-label={p.id}
                    data-part={p.id}
                    onPointerEnter={enter}
                    onPointerMove={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      onPick(p.id);
                    }}
                    style={style}
                    className={`${className} cursor-pointer hover:border-ink`}
                  >
                    {words}
                  </button>
                );
              return (
                <div
                  key={p.id}
                  data-label={p.id}
                  aria-hidden="true"
                  onPointerEnter={enter}
                  onPointerMove={e => e.stopPropagation()}
                  style={style}
                  className={`${className} ${interactive ? "cursor-default" : "pointer-events-none"}`}
                >
                  {words}
                </div>
              );
            })}
          </div>
          {card && anchor && (
            <div
              className="absolute w-64 rounded-sm border border-rule-strong bg-paper px-4 py-3"
              style={{ left: Math.min(anchor.x + 16, size.w - 268), top: Math.max(8, Math.min(anchor.y - 30, size.h - 170)) }}
            >
              {card}
            </div>
          )}
        </>
      )}
    </div>
  );
}
