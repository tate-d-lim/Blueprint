"use client";

import { Button } from "@/app/ui/button";
import { arrangeRooms, roomName, type Room } from "@/lib/plan/floor-plan";
import type { PlanProgress } from "@/lib/plan/progress";

/**
 * The plan as a building: one room per requirement family, sized by how many requirements it has. Each room's
 * floor is drawn in areas sized by count, using drawing conventions: hatch = built by your tools, solid = done,
 * dense hatch = in progress, dashed = to do, dotted = doesn't apply, revision cloud = a question. A room that is
 * all yours is a dashed outline until your tools or your work build it. Choosing a room narrows the lists below.
 */
export function FloorPlan({
  rooms,
  selected,
  onSelect,
  progress,
}: {
  rooms: Room[];
  selected: string | null;
  onSelect: (family: string | null) => void;
  /** Present on a saved project, where tasks have a status. */
  progress?: PlanProgress;
}) {
  const sum = (key: keyof Omit<Room, "family">) => rooms.reduce((n, r) => n + r[key], 0);
  const total = sum("total");
  const built = sum("built");
  const yours = sum("done") + sum("inProgress") + sum("todo");
  const open = sum("openQuestions");

  const heading = progress
    ? `${progress.tasks.done} of ${progress.tasks.total} tasks done`
    : `${built} of ${total} requirements are already built`;
  const caption = progress
    ? `${progress.tasks.inProgress} in progress, ${progress.tasks.todo} to do. ${
        progress.questions.answered === progress.questions.total
          ? `All ${progress.questions.total} questions answered.`
          : `${progress.questions.answered} of ${progress.questions.total} questions answered.`
      }`
    : `${yours} are yours to build${open ? `, and ${open} are questions to answer first` : ""}. Tick tools to build more rooms.`;

  return (
    <section aria-labelledby="floor-plan-title" className="rounded-xs border border-ink bg-paper">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-ink px-5 py-4">
        <div className="flex flex-col gap-1">
          <h2 id="floor-plan-title" className="tnum text-heading font-semibold">
            {heading}
          </h2>
          <p className="text-body text-ink-soft">{caption}</p>
        </div>
        <Legend tracking={!!progress} />
      </div>

      <div className="p-5">
        {/* Outer walls are drawn heavy and the walls between rooms light, as on a real plan. */}
        <div className="flex flex-col divide-y divide-ink border-2 border-ink">
          {arrangeRooms(rooms, 3).map((row, i) => (
            <div key={i} className="flex divide-x divide-ink">
              {row.map(room => (
                <RoomButton
                  key={room.family}
                  room={room}
                  tracking={!!progress}
                  selected={selected === room.family}
                  onClick={() => onSelect(selected === room.family ? null : room.family)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule px-5 py-2">
        {/* One element for both messages, so screen readers announce every change of room. */}
        <p className={`text-body ${selected ? "text-ink" : "text-ink-soft"}`} role="status">
          {selected ? (
            <>
              Showing <span className="font-semibold">{roomName(selected)}</span> only.
            </>
          ) : (
            "Showing all rooms. Choose a room to see only its requirements."
          )}
        </p>
        {selected && (
          <Button variant="quiet" size="sm" onClick={() => onSelect(null)}>
            Show all rooms
          </Button>
        )}
      </div>
    </section>
  );
}

const AREAS = {
  built: "hatch-built",
  done: "bg-blueprint",
  inProgress: "hatch-progress",
  todo: "border border-dashed border-blueprint",
  settled: "border border-dotted border-ink-soft",
  openQuestions: "revision-cloud",
} as const;

function RoomButton({ room, tracking, selected, onClick }: { room: Room; tracking: boolean; selected: boolean; onClick: () => void }) {
  const name = roomName(room.family);
  const yours = room.done + room.inProgress + room.todo;
  const status: string[] = [];
  if (yours) status.push(tracking ? `${room.done} of ${yours} done` : `${yours} yours`);
  if (room.openQuestions) status.push(`${room.openQuestions} to answer`);
  if (!status.length) status.push(room.settled && !room.built ? "Doesn't apply" : "Built");

  const label = [
    `${name}.`,
    `${room.built} built by your tools,`,
    tracking ? `${room.done} of ${yours} of yours done, ${room.inProgress} in progress,` : `${yours} yours,`,
    `${room.openQuestions} questions to answer.`,
  ].join(" ");

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      style={{ flexGrow: room.total, flexBasis: 0 }}
      className={`group relative flex min-h-[132px] min-w-[112px] cursor-pointer items-start p-3 text-left focus-visible:-outline-offset-4 ${
        selected ? "bg-blueprint-wash" : ""
      }`}
    >
      {/* The floor. Every kind of area is always there, so a change of count grows or shrinks it in place. */}
      <span aria-hidden="true" className="absolute top-2 right-[5px] bottom-2 left-2 flex">
        {(Object.keys(AREAS) as (keyof typeof AREAS)[]).map(kind => (
          <span
            key={kind}
            style={{ flexGrow: room[kind], flexBasis: 0 }}
            className="relative min-w-0 overflow-hidden transition-[flex-grow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          >
            <span className={`absolute inset-y-0 right-[3px] left-0 ${AREAS[kind]}`} />
          </span>
        ))}
      </span>

      {/* The room's name plate, lettered over the floor. */}
      <span
        className={`relative flex flex-col border px-2.5 py-1.5 transition-colors ${
          selected ? "border-blueprint bg-blueprint text-paper" : "border-ink bg-paper text-ink group-hover:border-blueprint group-hover:text-blueprint"
        }`}
      >
        <span className="font-display text-lead leading-tight font-semibold">{name}</span>
        <span className={`tnum text-small ${selected ? "text-paper/85" : "text-ink-soft"}`}>{status.join(", ")}</span>
      </span>
    </button>
  );
}

function Legend({ tracking }: { tracking: boolean }) {
  const keys = [
    { label: "Built by your tools", swatch: AREAS.built },
    ...(tracking
      ? [
          { label: "Done", swatch: AREAS.done },
          { label: "In progress", swatch: AREAS.inProgress },
        ]
      : []),
    { label: tracking ? "To do" : "Yours", swatch: AREAS.todo },
    { label: "Doesn't apply", swatch: AREAS.settled },
    { label: "Question", swatch: `${AREAS.openQuestions} revision-cloud-sm` },
  ];
  return (
    <ul aria-label="Key" className="flex flex-wrap gap-x-5 gap-y-1.5 text-small text-ink-soft">
      {keys.map(k => (
        <li key={k.label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block h-4 w-6 ${k.swatch}`} />
          {k.label}
        </li>
      ))}
    </ul>
  );
}
