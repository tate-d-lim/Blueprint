"use server";

import { cookies } from "next/headers";
import { ROLE_COOKIE, parseRole } from "@/lib/role";

export async function setRole(role: string) {
  (await cookies()).set(ROLE_COOKIE, parseRole(role), { path: "/", sameSite: "lax" });
}
