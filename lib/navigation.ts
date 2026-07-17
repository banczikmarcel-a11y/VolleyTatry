export const publicNavigationItems = [
  { href: "/", label: "Domov" },
  { href: "/tournaments", label: "Turnaje" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/matches", label: "Zápasy" },
  { href: "/stats", label: "Štatistiky" },
  { href: "/profile", label: "Profil" }
] as const;

export const adminNavigationItems = [
  { href: "/admin/tournaments", label: "Admin turnaje" },
  { href: "/admin/players", label: "Hráči" }
] as const;
