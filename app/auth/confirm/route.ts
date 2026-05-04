import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/supabase/server";

function getSafeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

const emailOtpTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function isEmailOtpType(value: string): value is EmailOtpType {
  return emailOtpTypes.has(value as EmailOtpType);
}

function redirectWithError(request: NextRequest, message: string) {
  const target = new URL("/login", request.url);
  target.searchParams.set("error", message);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (!tokenHash || !type || !isEmailOtpType(type)) {
    return redirectWithError(request, "Invalid confirmation link.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type
  });

  if (error) {
    return redirectWithError(request, error.message);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
