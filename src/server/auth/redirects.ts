import type { ResolveApplicationSessionResult } from "@/src/server/auth/types";

export function getSafeNext(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function getVerificationRedirect(next: string, email?: string | null) {
  const params = new URLSearchParams();
  params.set("next", next);

  if (email) {
    params.set("email", email);
  }

  return `/auth/verify-email?${params.toString()}`;
}

export function getPostAuthRedirectPath(session: ResolveApplicationSessionResult, next: string) {
  if (!session.isAuthenticated) {
    return `/login?next=${encodeURIComponent(next)}`;
  }

  if (session.status === "unverified") {
    return getVerificationRedirect(next, session.authUser.email);
  }

  if (session.status === "no_profile") {
    return "/auth/access-denied";
  }

  if (session.status === "disabled") {
    return "/auth/account-disabled";
  }

  return next;
}
