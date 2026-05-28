"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavbarAccount } from "@/components/NavbarAccount";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Briefing" },
  { href: "/saved", label: "Saved" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-serif text-lg tracking-tight text-white transition-opacity hover:opacity-80"
        >
          Your News
        </Link>

        <div className="flex items-center gap-5 sm:gap-8">
          <div className="flex items-center gap-5 sm:gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm transition-colors",
                  pathname === link.href
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <NavbarAccount />
        </div>
      </nav>
    </header>
  );
}
