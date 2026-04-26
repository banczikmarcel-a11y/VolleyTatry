import Link from "next/link";
import type { ReactNode } from "react";
import { Dumbbell, Menu, UserCircle } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { buttonClasses } from "@/components/ui/button";
import { navigationItems } from "@/lib/navigation";
import { formatFullName } from "@/lib/player-name";
import { getCurrentUser } from "@/supabase/server";

type AppShellProps = {
  children: ReactNode;
};

function getUserLabel(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) {
    return null;
  }

  const firstName = typeof user.user_metadata.first_name === "string" ? user.user_metadata.first_name : null;
  const lastName = typeof user.user_metadata.last_name === "string" ? user.user_metadata.last_name : null;
  const fullName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null;
  return formatFullName(firstName, lastName, fullName || user.email || "Prihlásený");
}

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const userLabel = getUserLabel(user);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-court-line bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="focus-ring flex items-center gap-3 rounded-[8px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-court-ink text-court-mint">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase text-court-ink">
                Volejbal
              </span>
              <span className="block text-xs font-bold text-court-blue">Tatry</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring rounded-[8px] px-3 py-2 text-sm font-bold text-court-blue transition hover:bg-court-ice hover:text-court-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex max-w-[260px] items-center gap-2 rounded-[8px] border border-court-line bg-court-ice px-3 py-2">
                <UserCircle className="h-5 w-5 shrink-0 text-court-mint" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-court-blue">Prihlásený</p>
                  <p className="truncate text-sm font-black text-court-ink">{userLabel}</p>
                </div>
              </div>
              <form action={signOut}>
                <button type="submit" className={buttonClasses({ variant: "secondary" })}>
                  Odhlásiť
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className={buttonClasses({ variant: "ghost" })}
              >
                Prihlásenie
              </Link>
              <Link
                href="/register"
                className={buttonClasses()}
              >
                Registrácia
              </Link>
            </div>
          )}

          <details className="relative md:hidden">
            <summary className="focus-ring flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[8px] bg-court-ink text-white [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <div className="absolute right-0 mt-3 w-64 rounded-[8px] border border-court-line bg-white p-2 shadow-panel">
              {[...navigationItems, ...(user ? [] : [{ href: "/login", label: "Prihlásenie" }, { href: "/register", label: "Registrácia" }])].map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="focus-ring block rounded-[8px] px-3 py-3 text-sm font-bold text-court-blue hover:bg-court-ice hover:text-court-ink"
                  >
                    {item.label}
                  </Link>
                )
              )}
              {user ? (
                <div className="mt-2 border-t border-court-line pt-2">
                  <div className="rounded-[8px] bg-court-ice px-3 py-3">
                    <p className="text-[11px] font-black uppercase text-court-blue">Prihlásený</p>
                    <p className="truncate text-sm font-black text-court-ink">{userLabel}</p>
                  </div>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="focus-ring mt-2 block w-full rounded-[8px] px-3 py-3 text-left text-sm font-bold text-court-blue hover:bg-court-ice hover:text-court-ink"
                    >
                      Odhlásiť
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </details>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
