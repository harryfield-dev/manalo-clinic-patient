import { sanitizeEmail } from "./inputUtils";
import { supabase } from "./supabase";

export const DUPLICATE_EMAIL_MESSAGE =
  "This account is already registered. Please log in instead.";

type ErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export async function checkEmailExists(
  email: string,
  table = "patients",
): Promise<boolean> {
  const cleanEmail = sanitizeEmail(email);

  if (!cleanEmail) {
    return false;
  }

  const { count, error } = await supabase
    .from(table)
    .select("email", { count: "exact", head: true })
    .ilike("email", cleanEmail);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

export function isDuplicateEmailError(error: ErrorLike | null | undefined): boolean {
  if (!error) {
    return false;
  }

  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "23505" ||
    details.includes("unique_email") ||
    details.includes("duplicate key") ||
    details.includes("already registered") ||
    details.includes("already exists")
  );
}
