import { HotelTab } from "@/app/plan/hotel-tab";

/** The second tab of a saved project: the whole hotel, with a part close up when `?part=` names one. */
export default async function HotelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { part } = await searchParams;
  return <HotelTab initialPart={typeof part === "string" ? part : null} />;
}
