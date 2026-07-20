import type {
  ApplicationProfileRecord,
  ApplicationSession,
  AuthIdentity,
  ResolveApplicationSessionResult
} from "@/src/server/auth/types";

export function normalizeEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase() ?? "";
  return value.length > 0 ? value : null;
}

export function isVerifiedAuthIdentity(identity: AuthIdentity) {
  return Boolean(identity.email && identity.emailConfirmedAt);
}

function getDisplayName(identity: AuthIdentity, profile: ApplicationProfileRecord) {
  const metadataDisplayName =
    typeof identity.userMetadata.display_name === "string"
      ? identity.userMetadata.display_name
      : typeof identity.userMetadata.full_name === "string"
        ? identity.userMetadata.full_name
        : null;

  return profile.displayName || metadataDisplayName || profile.fullName || profile.email || identity.email || "Používateľ";
}

export function buildApplicationSession(identity: AuthIdentity, profile: ApplicationProfileRecord): ApplicationSession {
  return {
    authUserId: identity.id,
    displayName: getDisplayName(identity, profile),
    email: profile.email ?? identity.email ?? "",
    isActive: true,
    profileId: profile.id,
    role: profile.role
  };
}

export async function resolveApplicationSessionCore({
  findProfileByAuthUserId,
  findProfileByNormalizedEmail,
  identity,
  linkProfileAuthUserId
}: {
  findProfileByAuthUserId: (authUserId: string) => Promise<ApplicationProfileRecord | null>;
  findProfileByNormalizedEmail: (normalizedEmail: string) => Promise<ApplicationProfileRecord | null>;
  identity: AuthIdentity | null;
  linkProfileAuthUserId: (profileId: string, authUserId: string) => Promise<ApplicationProfileRecord | null>;
}): Promise<ResolveApplicationSessionResult> {
  if (!identity) {
    return {
      isAuthenticated: false,
      session: null,
      status: "anonymous"
    };
  }

  if (!isVerifiedAuthIdentity(identity)) {
    return {
      authUser: identity,
      isAuthenticated: true,
      profile: null,
      session: null,
      status: "unverified"
    };
  }

  let profile = await findProfileByAuthUserId(identity.id);

  if (!profile) {
    const normalizedEmail = normalizeEmail(identity.email);

    if (normalizedEmail) {
      const emailProfile = await findProfileByNormalizedEmail(normalizedEmail);

      if (emailProfile) {
        profile = emailProfile.authUserId === null
          ? await linkProfileAuthUserId(emailProfile.id, identity.id) ?? {
              ...emailProfile,
              authUserId: identity.id
            }
          : emailProfile.authUserId === identity.id
            ? emailProfile
            : null;
      }
    }
  }

  if (!profile) {
    return {
      authUser: identity,
      isAuthenticated: true,
      profile: null,
      session: null,
      status: "no_profile"
    };
  }

  if (!profile.isActive) {
    return {
      authUser: identity,
      isAuthenticated: true,
      profile,
      session: null,
      status: "disabled"
    };
  }

  return {
    authUser: identity,
    isAuthenticated: true,
    profile,
    session: buildApplicationSession(identity, profile),
    status: "active"
  };
}
