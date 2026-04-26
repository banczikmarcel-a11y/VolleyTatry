"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";
import { formatFullName } from "@/lib/player-name";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import type { TeamMembershipStatus, TeamRole } from "@/types/entities";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(message: string): never {
  redirect(`/admin/players?error=${encodeURIComponent(message)}`);
}

function isTeamRole(value: string): value is TeamRole {
  return value === "owner" || value === "coach" || value === "player";
}

function isMembershipStatus(value: string): value is TeamMembershipStatus {
  return value === "active" || value === "invited" || value === "inactive";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "Nepodarilo sa vytvoriť hráča.";
  }

  return "Nepodarilo sa vytvoriť hráča.";
}

async function getExistingAuthUserIdByEmail(email: string) {
  const supabase = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const user = data.users.find((authUser) => authUser.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      return user.id;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function upsertMembership({
  profileId,
  role,
  status,
  teamId
}: {
  profileId: string;
  role: TeamRole;
  status: TeamMembershipStatus;
  teamId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("team_memberships").upsert(
    {
      joined_at: status === "active" ? new Date().toISOString() : null,
      profile_id: profileId,
      role,
      status,
      team_id: teamId
    },
    { onConflict: "team_id,profile_id" }
  );

  return error;
}

async function updateAuthUserProfile({
  email,
  firstName,
  fullName,
  lastName,
  profileId
}: {
  email: string | null;
  firstName: string;
  fullName: string;
  lastName: string;
  profileId: string;
}) {
  if (!getSupabaseConfig().serviceRoleKey) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(profileId, {
    ...(email ? { email, email_confirm: true } : {}),
    user_metadata: {
      first_name: firstName,
      full_name: fullName,
      last_name: lastName
    }
  });

  if (error) {
    throw error;
  }
}

export async function createPlayer(formData: FormData) {
  await requireAdminUser("/admin/players");

  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const email = getString(formData, "email").toLowerCase();
  const fullName = formatFullName(firstName, lastName, null);
  const teamId = getString(formData, "team_id");
  const role = getString(formData, "role");
  const status = getString(formData, "status");

  if (!firstName || !lastName) {
    redirectWithError("Zadaj meno aj priezvisko hráča.");
  }

  if (email && !isEmail(email)) {
    redirectWithError("Zadaj platný e-mail hráča.");
  }

  if (!teamId) {
    redirectWithError("Vyber predvolený tím.");
  }

  if (!isTeamRole(role)) {
    redirectWithError("Vyber platnú rolu.");
  }

  if (!isMembershipStatus(status)) {
    redirectWithError("Vyber platný stav členstva.");
  }

  if (!getSupabaseConfig().serviceRoleKey) {
    redirectWithError("Pre vytvorenie hráča doplň do .env.local premennú SUPABASE_SERVICE_ROLE_KEY.");
  }

  const generatedEmail = email || `hrac-${randomUUID()}@internal.volejbaltatry.local`;
  let message = "Hráč bol vytvorený a rola bola priradená.";

  try {
    const supabase = createAdminClient();
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", generatedEmail)
      .limit(1)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    let profileId = existingProfile?.id ?? null;

    if (!profileId) {
      const existingAuthUserId = email ? await getExistingAuthUserIdByEmail(email) : null;

      if (existingAuthUserId) {
        profileId = existingAuthUserId;
        message = "Používateľ už existoval, profil a rola boli doplnené.";
      } else {
        const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: generatedEmail,
          email_confirm: true,
          password: randomUUID(),
          user_metadata: {
            first_name: firstName,
            full_name: fullName,
            last_name: lastName
          }
        });

        if (createUserError) {
          throw createUserError;
        }

        profileId = createdUser.user.id;
      }

    } else {
      message = "Hráč už existoval, rola bola priradená.";
    }

    const { error: profileUpsertError } = await supabase.from("profiles").upsert({
      email: email || null,
      first_name: firstName,
      full_name: fullName,
      id: profileId,
      last_name: lastName
    });

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    const membershipError = await upsertMembership({ profileId, role, status, teamId });

    if (membershipError) {
      throw membershipError;
    }
  } catch (error) {
    console.error("[players:create]", { email: generatedEmail, error });
    redirectWithError(getErrorMessage(error));
  }

  revalidatePath("/admin/players");
  redirect(`/admin/players?message=${encodeURIComponent(message)}`);
}

export async function savePlayerRole(formData: FormData) {
  await requireAdminUser("/admin/players");

  const profileId = getString(formData, "profile_id");
  const teamId = getString(formData, "team_id");
  const role = getString(formData, "role");
  const status = getString(formData, "status");

  if (!profileId || !teamId) {
    redirectWithError("Chýba hráč alebo tím.");
  }

  if (!isTeamRole(role)) {
    redirectWithError("Vyber platnú rolu.");
  }

  if (!isMembershipStatus(status)) {
    redirectWithError("Vyber platný stav členstva.");
  }

  const error = await upsertMembership({ profileId, role, status, teamId });

  if (error) {
    console.error("[players:admin]", { error, profileId, teamId });
    redirectWithError(error.message);
  }

  revalidatePath("/admin/players");
  redirect(`/admin/players?message=${encodeURIComponent("Rola bola uložená.")}`);
}

export async function updatePlayer(formData: FormData) {
  await requireAdminUser("/admin/players");

  const profileId = getString(formData, "profile_id");
  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const email = getString(formData, "email").toLowerCase();
  const teamId = getString(formData, "team_id");
  const role = getString(formData, "role");
  const status = getString(formData, "status");
  const fullName = formatFullName(firstName, lastName, null);

  if (!profileId || !firstName || !lastName) {
    redirectWithError("Vyplň meno, priezvisko a hráča.");
  }

  if (email && !isEmail(email)) {
    redirectWithError("Zadaj platný e-mail hráča.");
  }

  if (!teamId) {
    redirectWithError("Vyber predvolené družstvo.");
  }

  if (!isTeamRole(role)) {
    redirectWithError("Vyber platnú rolu.");
  }

  if (!isMembershipStatus(status)) {
    redirectWithError("Vyber platný stav členstva.");
  }

  try {
    const supabase = createAdminClient();
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        email: email || null,
        first_name: firstName,
        full_name: fullName,
        last_name: lastName
      })
      .eq("id", profileId);

    if (profileError) {
      throw profileError;
    }

    await updateAuthUserProfile({
      email: email || null,
      firstName,
      fullName,
      lastName,
      profileId
    });

    const membershipError = await upsertMembership({ profileId, role, status, teamId });

    if (membershipError) {
      throw membershipError;
    }
  } catch (error) {
    console.error("[players:update]", { error, profileId });
    redirectWithError(getErrorMessage(error));
  }

  revalidatePath("/admin/players");
  redirect(`/admin/players?message=${encodeURIComponent("Údaje hráča boli uložené.")}`);
}

export async function deletePlayer(formData: FormData) {
  await requireAdminUser("/admin/players");

  const profileId = getString(formData, "profile_id");

  if (!profileId) {
    redirectWithError("Chýba hráč na zmazanie.");
  }

  if (!getSupabaseConfig().serviceRoleKey) {
    redirectWithError("Pre zmazanie hráča doplň do .env.local premennú SUPABASE_SERVICE_ROLE_KEY.");
  }

  try {
    const supabase = createAdminClient();

    const { error: lineupsError } = await supabase.from("match_lineups").delete().eq("profile_id", profileId);

    if (lineupsError && !lineupsError.message.includes("public.match_lineups")) {
      throw lineupsError;
    }

    const { error: responsesError } = await supabase.from("match_responses").delete().eq("profile_id", profileId);

    if (responsesError) {
      throw responsesError;
    }

    const { error: membershipsError } = await supabase.from("team_memberships").delete().eq("profile_id", profileId);

    if (membershipsError) {
      throw membershipsError;
    }

    const { error: matchesError } = await supabase.from("matches").update({ created_by: null }).eq("created_by", profileId);

    if (matchesError) {
      throw matchesError;
    }

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profileId);

    if (authDeleteError) {
      throw authDeleteError;
    }
  } catch (error) {
    console.error("[players:delete]", { error, profileId });
    redirectWithError(getErrorMessage(error));
  }

  revalidatePath("/admin/players");
  redirect(`/admin/players?message=${encodeURIComponent("Hráč bol zmazaný.")}`);
}
