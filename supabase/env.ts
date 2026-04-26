export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    anonKey,
    isConfigured: Boolean(url && anonKey),
    serviceRoleKey,
    url
  };
}

export function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.MAIL_FROM;

  return {
    from,
    host,
    isConfigured: Boolean(host && port && user && password && from),
    password,
    port,
    secure,
    user
  };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return {
    anonKey: config.anonKey,
    url: config.url
  };
}

export function requireSupabaseAdminConfig() {
  const config = getSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return {
    serviceRoleKey: config.serviceRoleKey,
    url: config.url
  };
}
