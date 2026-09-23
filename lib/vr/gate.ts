import { createHmac, timingSafeEqual } from "crypto";

export const VR_COOKIE = "vr_booth";

function boothPassword(): string {
  return process.env.VR_BOOTH_PASSWORD || "atelier";
}

export function passwordMatches(input: string): boolean {
  const expected = boothPassword();
  const given = input.trim();
  const a = Buffer.from(given.toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function gateToken(): string {
  return createHmac("sha256", boothPassword()).update("vr-booth").digest("hex");
}

export function cookieIsValid(value: string | undefined): boolean {
  if (!value) return false;
  const expected = gateToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
