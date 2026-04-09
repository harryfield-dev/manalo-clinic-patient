import { sanitize } from "./inputUtils";

export function normalizePhonePH(input: string): string {
  let digits = sanitize(input).replace(/\D/g, "");

  if (digits.startsWith("09")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("639")) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 10);
}

export function formatPhonePH(input: string): string {
  const digits = normalizePhonePH(input);
  const parts: string[] = [];

  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));

  return parts.join("-");
}

export function isValidPhonePH(input: string): boolean {
  const digits = normalizePhonePH(input);
  return /^9\d{9}$/.test(digits);
}

export function toInternationalPH(input: string): string {
  const digits = normalizePhonePH(input);
  return digits ? `+63${digits}` : "";
}
