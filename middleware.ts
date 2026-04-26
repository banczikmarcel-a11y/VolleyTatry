import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/supabase/env";
import { updateSession } from "@/supabase/middleware";

const protectedRoutes = ["/dashboard", "/matches", "/stats", "/profile", "/admin"];
const authRoutes = ["/login", "/register"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  if (!getSupabaseConfig().isConfigured) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && matchesRoute(pathname, protectedRoutes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  if (user && matchesRoute(pathname, authRoutes)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
