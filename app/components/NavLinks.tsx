"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseLinks = [
  { href: "/", label: "Clients" },
  { href: "/pipeline", label: "Pipeline" },
];

const managerLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/team", label: "Team" },
];

export function NavLinks({ isManager = false }: { isManager?: boolean }) {
  const pathname = usePathname();
  const links = isManager ? [...baseLinks, ...managerLinks] : baseLinks;

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/" || pathname.startsWith("/clients")
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-2.5 sm:px-3 py-1.5 text-[13px] sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              isActive
                ? "text-(--accent) bg-(--accent)/10"
                : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--accent)/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
