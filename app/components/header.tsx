import { getRole } from "@/lib/role";
import { SiteHeader } from "./site-header";

export async function Header() {
  const role = await getRole();
  return <SiteHeader role={role} />;
}
