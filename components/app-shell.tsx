import Link from "next/link";
import type { ReactNode } from "react";
import { Dumbbell, UserCircle } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { MobileNav } from "@/components/mobile-nav";
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
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <Link href="/" className="focus-ring flex items-center gap-2 rounded-[8px] sm:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-court-ink text-court-mint sm:h-10 sm:w-10">
              <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span>
              <span className="block text-[13px] font-black uppercase leading-none text-court-ink sm:text-sm">
                Volejbal
              </span>
              <span className="block text-[11px] font-bold leading-none text-court-blue sm:text-xs">Tatry</span>
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

          <MobileNav userLabel={userLabel} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
