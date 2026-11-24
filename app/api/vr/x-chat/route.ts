import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";
import { readXChat, xChatConfigured } from "@/lib/vr/x-broadcast";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: Request) {
  const jar = await cookies();
  if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.has("probe")) {
    return Response.json({ ready: xChatConfigured() });
  }
  const body = await readXChat(url.searchParams.get("since") || "");
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}
