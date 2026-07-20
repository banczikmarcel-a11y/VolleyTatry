"use server";
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

function getApplicationRoleFromMembershipRole(role: TeamRole): "admin" | "user" {
  return role === "owner" || role === "coach" ? "admin" : "user";
}

async function updateAuthUserProfile({
  authUserId,
  email,
  firstName,
  fullName,
  lastName
}: {
  authUserId: string | null;
  email: string | null;
  firstName: string;
  fullName: string;
  lastName: string;
}) {
  if (!getSupabaseConfig().serviceRoleKey) {
    return;
  }

  const supabase = createAdminClient();
  if (!authUserId) {
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
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

  if (!email) {
    redirectWithError("Zadaj e-mail hráča.");
  }

  if (!isEmail(email)) {
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

  const generatedEmail = email;
  let message = "Hráč bol vytvorený. Prihlási sa cez e-mailový odkaz.";

  try {
    const supabase = createAdminClient();
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id,auth_user_id")
      .eq("email_normalized", generatedEmail)
      .limit(1)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    let profileId = existingProfile?.id ?? null;
    let authUserId = existingProfile?.auth_user_id ?? null;

    if (!profileId) {
      const existingAuthUserId = await getExistingAuthUserIdByEmail(email);

      if (existingAuthUserId) {
        authUserId = existingAuthUserId;
        message = "Používateľ už existoval, profil a rola boli doplnené.";
      }

    } else {
      message = "Hráč už existoval, rola bola priradená.";
    }

    if (authUserId && !profileId) {
      const { data: linkedProfile, error: linkedProfileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (linkedProfileError) {
        throw linkedProfileError;
      }

      profileId = linkedProfile?.id ?? null;
    }

    const applicationRole = getApplicationRoleFromMembershipRole(role);
    const profilePayload = {
      auth_user_id: authUserId,
      display_name: fullName,
      email: email || null,
      first_name: firstName,
      full_name: fullName,
      is_active: status !== "inactive",
      last_name: lastName,
      role: applicationRole
    };

    let profileUpsertError = null;

    if (profileId) {
      const { error } = await supabase.from("profiles").update(profilePayload).eq("id", profileId);
      profileUpsertError = error;
    } else {
      const { data: createdProfile, error } = await supabase
        .from("profiles")
        .insert(profilePayload)
        .select("id")
        .single();
      profileUpsertError = error;
      profileId = createdProfile?.id ?? null;
    }

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    if (!profileId) {
      throw new Error("Profil hráča sa nepodarilo vytvoriť.");
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

  const supabase = createAdminClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      is_active: status !== "inactive",
      role: getApplicationRoleFromMembershipRole(role)
    })
    .eq("id", profileId);

  if (profileError) {
    redirectWithError(profileError.message);
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
    const applicationRole = getApplicationRoleFromMembershipRole(role);
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: fullName,
        email: email || null,
        first_name: firstName,
        full_name: fullName,
        is_active: status !== "inactive",
        last_name: lastName
        ,
        role: applicationRole
      })
      .eq("id", profileId);

    if (profileError) {
      throw profileError;
    }

    const { data: profileRow, error: profileLookupError } = await supabase
      .from("profiles")
      .select("auth_user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    await updateAuthUserProfile({
      authUserId: profileRow?.auth_user_id ?? null,
      email: email || null,
      firstName,
      fullName,
      lastName
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
    const { data: profileRow, error: profileLookupError } = await supabase
      .from("profiles")
      .select("auth_user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

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

    if (profileRow?.auth_user_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profileRow.auth_user_id);

      if (authDeleteError) {
        throw authDeleteError;
      }
    }

    const { error: profileDeleteError } = await supabase.from("profiles").delete().eq("id", profileId);

    if (profileDeleteError) {
      throw profileDeleteError;
    }
  } catch (error) {
    console.error("[players:delete]", { error, profileId });
    redirectWithError(getErrorMessage(error));
  }

  revalidatePath("/admin/players");
  redirect(`/admin/players?message=${encodeURIComponent("Hráč bol zmazaný.")}`);
}
