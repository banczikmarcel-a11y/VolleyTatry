export function splitFullName(fullName: string | null) {
  const value = fullName?.trim() ?? "";

  if (!value) {
    return {
      firstName: "",
      lastName: ""
    };
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: ""
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]
  };
}

export function formatFullName(firstName: string | null, lastName: string | null, fallback?: string | null) {
  const label = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
  return label || fallback?.trim() || "Bez mena";
}

export function formatSortName(firstName: string | null, lastName: string | null, fallback?: string | null) {
  const label = [lastName?.trim(), firstName?.trim()].filter(Boolean).join(" ").trim();
  return label || fallback?.trim() || "Bez mena";
}
