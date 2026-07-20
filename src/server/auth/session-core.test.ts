import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEmail, resolveApplicationSessionCore } from "@/src/server/auth/session-core";
import type { ApplicationProfileRecord, AuthIdentity } from "@/src/server/auth/types";

const VERIFIED_IDENTITY: AuthIdentity = {
  email: "Player@example.com",
  emailConfirmedAt: "2026-07-20T10:00:00.000Z",
  id: "auth-user-1",
  userMetadata: {
    full_name: "Player One"
  }
};

function makeProfile(overrides?: Partial<ApplicationProfileRecord>): ApplicationProfileRecord {
  return {
    authUserId: "auth-user-1",
    displayName: "Player One",
    email: "player@example.com",
    emailNormalized: "player@example.com",
    firstName: "Player",
    fullName: "Player One",
    id: "profile-1",
    isActive: true,
    lastName: "One",
    role: "user",
    ...overrides
  };
}

test("normalizeEmail trims whitespace and compares case-insensitively", () => {
  assert.equal(normalizeEmail("  Player@Example.COM "), "player@example.com");
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail(null), null);
});

test("resolves an active application profile by auth_user_id", async () => {
  const profile = makeProfile();
  const result = await resolveApplicationSessionCore({
    async findProfileByAuthUserId() {
      return profile;
    },
    async findProfileByNormalizedEmail() {
      return null;
    },
    identity: VERIFIED_IDENTITY,
    async linkProfileAuthUserId() {
      return null;
    }
  });

  assert.equal(result.isAuthenticated, true);
  if (!result.isAuthenticated) {
    assert.fail("Expected an authenticated session.");
  }

  assert.equal(result.status, "active");
  assert.equal(result.session?.profileId, "profile-1");
  assert.equal(result.session?.role, "user");
});

test("falls back to matching by normalized email and links auth_user_id safely", async () => {
  const profile = makeProfile({ authUserId: null, id: "profile-email" });
  let linked = false;

  const result = await resolveApplicationSessionCore({
    async findProfileByAuthUserId() {
      return null;
    },
    async findProfileByNormalizedEmail() {
      return profile;
    },
    identity: VERIFIED_IDENTITY,
    async linkProfileAuthUserId(profileId, authUserId) {
      linked = true;
      return makeProfile({ authUserId, id: profileId });
    }
  });

  assert.equal(linked, true);
  assert.equal(result.isAuthenticated, true);
  if (!result.isAuthenticated) {
    assert.fail("Expected an authenticated session.");
  }

  assert.equal(result.status, "active");
  assert.equal(result.session?.authUserId, "auth-user-1");
});

test("returns no_profile when a verified identity has no matching application profile", async () => {
  const result = await resolveApplicationSessionCore({
    async findProfileByAuthUserId() {
      return null;
    },
    async findProfileByNormalizedEmail() {
      return null;
    },
    identity: VERIFIED_IDENTITY,
    async linkProfileAuthUserId() {
      return null;
    }
  });

  assert.equal(result.isAuthenticated, true);
  if (!result.isAuthenticated) {
    assert.fail("Expected an authenticated session.");
  }

  assert.equal(result.status, "no_profile");
  assert.equal(result.session, null);
});

test("returns disabled when a matching profile is inactive", async () => {
  const result = await resolveApplicationSessionCore({
    async findProfileByAuthUserId() {
      return makeProfile({ isActive: false });
    },
    async findProfileByNormalizedEmail() {
      return null;
    },
    identity: VERIFIED_IDENTITY,
    async linkProfileAuthUserId() {
      return null;
    }
  });

  assert.equal(result.isAuthenticated, true);
  if (!result.isAuthenticated) {
    assert.fail("Expected an authenticated session.");
  }

  assert.equal(result.status, "disabled");
});

test("returns unverified when the authenticated email is not confirmed", async () => {
  const result = await resolveApplicationSessionCore({
    async findProfileByAuthUserId() {
      return makeProfile();
    },
    async findProfileByNormalizedEmail() {
      return null;
    },
    identity: {
      ...VERIFIED_IDENTITY,
      emailConfirmedAt: null
    },
    async linkProfileAuthUserId() {
      return null;
    }
  });

  assert.equal(result.isAuthenticated, true);
  if (!result.isAuthenticated) {
    assert.fail("Expected an authenticated session.");
  }

  assert.equal(result.status, "unverified");
});
