"use client";

import { useRouter } from "next/navigation";
import { Segmented } from "@/app/ui/segmented";

export function ProfileSwitch({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  return <Segmented label="Profile" value={value} options={options} onChange={id => router.push(`/admin/catalog?profile=${encodeURIComponent(id)}`, { scroll: false })} />;
}
