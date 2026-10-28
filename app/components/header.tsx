import { getRole } from "@/lib/role";
import { MainNav } from "./main-nav";
import { ResetButton } from "./reset-button";
import { RoleSwitcher } from "./role-switcher";

export async function Header() {
  const role = await getRole();
  return (
    <header>
      <MainNav role={role}>
        <RoleSwitcher role={role} />
        <ResetButton />
      </MainNav>
    </header>
  );
}
