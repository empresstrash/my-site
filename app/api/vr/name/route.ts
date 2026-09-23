import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function GET(request: Request) {
  const jar = await cookies();
  if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const address = (new URL(request.url).searchParams.get("address") || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return Response.json({ name: "someone" });
  try {
    const response = await fetch(`https://peer.decentraland.org/lambdas/profiles/${address}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return Response.json({ name: shortAddress(address) });
    const json: unknown = await response.json();
    const record = Array.isArray(json) ? json[0] : json;
    const avatars =
      record && typeof record === "object" && "avatars" in record
        ? (record as { avatars?: { name?: string }[] }).avatars
        : undefined;
    return Response.json({ name: avatars?.[0]?.name?.trim() || shortAddress(address) });
  } catch {
    return Response.json({ name: shortAddress(address) });
  }
}
