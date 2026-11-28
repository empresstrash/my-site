import { createHmac, timingSafeEqual } from "crypto";

export const VR_COOKIE = "vr_booth";

function boothPassword(): string | null {
  const value = process.env.VR_BOOTH_PASSWORD?.trim();
  return value || null;
}

function localBooth(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function passwordMatches(input: string): boolean {
  if (localBooth()) return input.trim().length > 0;
  const expected = boothPassword();
  if (!expected) return false;
  const given = input.trim();
  const a = Buffer.from(given.toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function gateToken(): string {
  const password = boothPassword();
  if (!password) return "";
  return createHmac("sha256", password).update("vr-booth").digest("hex");
}

export function cookieIsValid(value: string | undefined): boolean {
  if (localBooth()) return true;
  if (!value || !boothPassword()) return false;
  const expected = gateToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
