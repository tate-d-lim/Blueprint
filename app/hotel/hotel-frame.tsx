/**
 * The two-column frame of steps 4 and 5 at the full height of the window under the header. Left, about 60%: the hotel,
 * which does not scroll. Right, about 40%: the side panel, the only column that scrolls, with the main action at its
 * foot, always in view.
 */
export function HotelFrame({ hotel, panel, foot }: { hotel: React.ReactNode; panel: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div
      style={{ height: "calc(100dvh - var(--header-h))" }}
      className="-mx-8 -mt-8 -mb-16 grid grid-cols-[3fr_2fr] overflow-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden px-8 py-6">{hotel}</div>
      <div className="flex min-h-0 min-w-0 flex-col border-l border-rule bg-paper">
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">{panel}</div>
        <div className="border-t border-rule bg-paper px-8 py-4">{foot}</div>
      </div>
    </div>
  );
}
