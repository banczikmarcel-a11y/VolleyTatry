"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { navigationItems } from "@/lib/navigation";

type MobileNavProps = {
  userLabel: string | null;
};

export function MobileNav({ userLabel }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSignedIn = Boolean(userLabel);
  const items = [...navigationItems, ...(isSignedIn ? [] : [{ href: "/login", label: "Prihlásenie" }, { href: "/register", label: "Registrácia" }])];

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-[8px] bg-court-ink text-white"
        aria-expanded={isOpen}
        aria-label="Otvoriť menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-2.5 w-60 rounded-[8px] border border-court-line bg-white p-1.5 shadow-panel">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="focus-ring block rounded-[8px] px-3 py-2.5 text-[13px] font-bold text-court-blue hover:bg-court-ice hover:text-court-ink"
            >
              {item.label}
            </Link>
          ))}

          {isSignedIn ? (
            <div className="mt-2 border-t border-court-line pt-2">
              <div className="rounded-[8px] bg-court-ice px-3 py-2.5">
                <p className="text-[11px] font-black uppercase text-court-blue">Prihlásený</p>
                <p className="truncate text-[13px] font-black text-court-ink">{userLabel}</p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  onClick={() => setIsOpen(false)}
                  className="focus-ring mt-2 block w-full rounded-[8px] px-3 py-2.5 text-left text-[13px] font-bold text-court-blue hover:bg-court-ice hover:text-court-ink"
                >
                  Odhlásiť
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
