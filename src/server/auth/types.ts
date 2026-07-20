export type ApplicationRole = "admin" | "user";

export type AuthResolutionStatus =
  | "anonymous"
  | "active"
  | "disabled"
  | "no_profile"
  | "oauth_error"
  | "unverified";

export type ApplicationProfileRecord = {
  authUserId: string | null;
  displayName: string;
  email: string | null;
  emailNormalized: string | null;
  firstName: string | null;
  fullName: string | null;
  id: string;
  isActive: boolean;
  lastName: string | null;
  role: ApplicationRole;
};

export type AuthIdentity = {
  email: string | null;
  emailConfirmedAt: string | null;
  id: string;
  userMetadata: Record<string, unknown>;
};

export type ApplicationSession = {
  authUserId: string;
  displayName: string;
  email: string;
  isActive: true;
  profileId: string;
  role: ApplicationRole;
};

export type ApplicationAuthState =
  | {
      isAuthenticated: false;
      session: null;
      status: "anonymous";
    }
  | {
      authUser: AuthIdentity;
      isAuthenticated: true;
      profile: ApplicationProfileRecord | null;
      session: ApplicationSession | null;
      status: Exclude<AuthResolutionStatus, "anonymous" | "oauth_error">;
    };

export type ResolveApplicationSessionResult = ApplicationAuthState;
