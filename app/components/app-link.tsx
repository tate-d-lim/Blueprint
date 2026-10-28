import { SgdsLink } from "@govtechsg/sgds-web-component/react";
import Link from "next/link";

/** An SGDS-styled link that still moves between pages without a reload. */
export function AppLink({ href, size, children }: { href: string; size?: "xs" | "sm" | "md" | "lg"; children: React.ReactNode }) {
  return (
    <SgdsLink size={size}>
      <Link href={href} suppressHydrationWarning>
        {children}
      </Link>
    </SgdsLink>
  );
}
