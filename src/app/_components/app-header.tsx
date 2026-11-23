"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "হোম", short: "হোম", match: (p: string) => p === "/" || p === "/new" || p.startsWith("/p/") },
  { href: "/how-it-works", label: "কিভাবে কাজ করে", short: "কিভাবে", match: (p: string) => p.startsWith("/how-it-works") },
  { href: "/dashboard", label: "হাসপাতাল ড্যাশবোর্ড", short: "ড্যাশবোর্ড", match: (p: string) => p.startsWith("/dashboard") },
];

export function AppHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-[1000] border-b border-teal-800/20 bg-teal-700 text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xl">🦟</span>
          <span className="leading-tight">
            <span className="block text-lg font-bold">ডেঙ্গুসাথী</span>
            <span className="block text-[11px] tracking-wide opacity-80">DengueSathi</span>
          </span>
        </Link>
        <nav className="ml-auto flex gap-1 text-sm sm:text-base">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition sm:px-3 ${l.match(path) ? "bg-white/20" : "hover:bg-white/10"}`}
            >
              <span className="sm:hidden">{l.short}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
