import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";
import { nowPlaying } from "@/lib/vr/now-playing";
import { stationById } from "@/lib/vr/stations";

export async function GET(request: Request) {
  const jar = await cookies();
  if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!stationById(id)) return Response.json({ error: "station" }, { status: 404 });
  return Response.json(await nowPlaying(id));
}
