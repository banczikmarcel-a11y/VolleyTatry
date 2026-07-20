import test from "node:test";
import assert from "node:assert/strict";
import { getPostAuthRedirectPath, getSafeNext, getVerificationRedirect } from "@/src/server/auth/redirects";
import type { ResolveApplicationSessionResult } from "@/src/server/auth/types";

function createResolvedSession(status: ResolveApplicationSessionResult["status"]): ResolveApplicationSessionResult {
  if (status === "anonymous") {
    return {
      isAuthenticated: false,
      session: null,
      status
    };
  }

  const authUser = {
    email: "player@example.com",
    emailConfirmedAt: status === "unverified" ? null : "2026-07-20T08:00:00.000Z",
    id: "auth-1",
    userMetadata: {}
  };

  if (status === "no_profile" || status === "unverified") {
    return {
      authUser,
      isAuthenticated: true,
      profile: null,
      session: null,
      status
    };
  }

  if (status === "disabled") {
    return {
      authUser,
      isAuthenticated: true,
      profile: {
        authUserId: "auth-1",
        displayName: "Player",
        email: "player@example.com",
        emailNormalized: "player@example.com",
        firstName: "Player",
        fullName: "Player Example",
        id: "profile-1",
        isActive: false,
        lastName: "Example",
        role: "user"
      },
      session: null,
      status
    };
  }

  return {
    authUser,
    isAuthenticated: true,
    profile: {
      authUserId: "auth-1",
      displayName: "Player",
      email: "player@example.com",
      emailNormalized: "player@example.com",
      firstName: "Player",
      fullName: "Player Example",
      id: "profile-1",
      isActive: true,
      lastName: "Example",
      role: "user"
    },
    session: {
      authUserId: "auth-1",
      displayName: "Player",
      email: "player@example.com",
      isActive: true,
      profileId: "profile-1",
      role: "user"
    },
    status
  };
}

test("getSafeNext allows only local absolute paths", () => {
  assert.equal(getSafeNext("/dashboard"), "/dashboard");
  assert.equal(getSafeNext("https://evil.example"), "/dashboard");
  assert.equal(getSafeNext("//evil.example"), "/dashboard");
  assert.equal(getSafeNext(undefined), "/dashboard");
});

test("getVerificationRedirect preserves next and email", () => {
  assert.equal(
    getVerificationRedirect("/admin/tournaments", "admin@example.com"),
    "/auth/verify-email?next=%2Fadmin%2Ftournaments&email=admin%40example.com"
  );
});

test("post-auth redirect sends anonymous users back to login with next", () => {
  assert.equal(
    getPostAuthRedirectPath(createResolvedSession("anonymous"), "/admin/tournaments"),
    "/login?next=%2Fadmin%2Ftournaments"
  );
});

test("post-auth redirect sends unverified users to verify-email state", () => {
  assert.equal(
    getPostAuthRedirectPath(createResolvedSession("unverified"), "/dashboard"),
    "/auth/verify-email?next=%2Fdashboard&email=player%40example.com"
  );
});

test("post-auth redirect sends verified users without profile to access denied", () => {
  assert.equal(getPostAuthRedirectPath(createResolvedSession("no_profile"), "/dashboard"), "/auth/access-denied");
});

test("post-auth redirect sends disabled users to account-disabled", () => {
  assert.equal(getPostAuthRedirectPath(createResolvedSession("disabled"), "/dashboard"), "/auth/account-disabled");
});

test("post-auth redirect keeps the intended route for active users", () => {
  assert.equal(getPostAuthRedirectPath(createResolvedSession("active"), "/profile"), "/profile");
});
