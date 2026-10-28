"use client";

import { SgdsMainnav, SgdsMainnavItem } from "@govtechsg/sgds-web-component/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/role";

const BUILDER_LINKS = [
  { href: "/start", label: "New plan", paths: ["/start", "/plan"] },
  { href: "/projects", label: "Saved projects", paths: ["/projects"] },
];

const ROLE_LINKS: Partial<Record<Role, { href: string; label: string; paths: string[] }>> = {
  admin: { href: "/admin", label: "Admin", paths: ["/admin"] },
  verifier: { href: "/verify", label: "Verify", paths: ["/verify"] },
};

/** The SGDS main navigation. Links stay real Next links so moving between pages is instant. */
export function MainNav({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const roleLink = ROLE_LINKS[role];
  const links = roleLink ? [...BUILDER_LINKS, roleLink] : BUILDER_LINKS;
  return (
    <SgdsMainnav brandHref="/start">
      <span slot="brand" className="sgds:text-subtitle-sm sgds:font-semibold">
        Build plan
      </span>
      {links.map(link => (
        <SgdsMainnavItem key={link.href} active={link.paths.some(p => pathname === p || pathname.startsWith(`${p}/`))}>
          <Link href={link.href}>{link.label}</Link>
        </SgdsMainnavItem>
      ))}
      <div slot="end" className="sgds:flex sgds:flex-wrap sgds:items-center sgds:gap-sm" suppressHydrationWarning>
        {children}
      </div>
    </SgdsMainnav>
  );
}
