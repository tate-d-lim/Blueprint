/**
 * The frame of steps 4 and 5, with the step bar across the top at the full height of the window under the header. The hotel takes every pixel the side
 * panel does not, and does not scroll. The side panel has a fixed width, is the only part that scrolls, and keeps the
 * main action at its foot, always in view.
 */
export function HotelFrame({ bar, hotel, panel, foot }: { bar?: React.ReactNode; hotel: React.ReactNode; panel: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div
      style={{ height: "calc(100dvh - var(--header-h))" }}
      className="-mx-8 -mt-8 -mb-16 flex flex-col overflow-hidden"
    >
      {bar && <div className="border-b border-rule bg-paper px-8 py-3">{bar}</div>}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-0 min-w-0 flex-col p-4">{hotel}</div>
        <div className="flex min-h-0 min-w-0 flex-col border-l border-rule bg-paper">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{panel}</div>
          <div className="border-t border-rule bg-paper px-6 py-4">{foot}</div>
        </div>
      </div>
    </div>
  );
}
