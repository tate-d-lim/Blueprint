import { getRole } from "@/lib/role";
import { TitleBlock } from "./title-block";

/** `cells` are the sheet's own title-block cells, such as a saved project's name and owner. */
export async function Header({ cells }: { cells?: React.ReactNode }) {
  const role = await getRole();
  return <TitleBlock role={role} cells={cells} />;
}
