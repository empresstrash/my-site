import { cookies } from "next/headers";
import { cookieIsValid, gateToken, passwordMatches, VR_COOKIE } from "@/lib/vr/gate";

export async function GET() {
  const jar = await cookies();
  return Response.json({ ok: cookieIsValid(jar.get(VR_COOKIE)?.value) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !passwordMatches(body.password)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(VR_COOKIE, gateToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}
