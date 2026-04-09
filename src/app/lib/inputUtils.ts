const CONTROL_CHARACTERS_REGEX = /[\u0000-\u001F\u007F]/g;

export function stripControlCharacters(input: string): string {
  return input.replace(CONTROL_CHARACTERS_REGEX, "");
}

export function sanitize(input: string): string {
  return stripControlCharacters(input).trim();
}

export function sanitizeText(input: string): string {
  return sanitize(input).replace(/\s+/g, " ");
}

export function sanitizeEmail(input: string): string {
  return sanitize(input).toLowerCase();
}

export function isValidEmail(input: string): boolean {
  const email = sanitizeEmail(input);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
