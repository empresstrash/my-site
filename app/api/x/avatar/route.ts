import { NextResponse } from "next/server";

export const revalidate = 600;

export async function GET() {
  try {
    const response = await fetch("https://api.fxtwitter.com/EmpressTrash", {
      next: { revalidate: 600 },
      headers: { Accept: "application/json", "User-Agent": "empresstrash.com" },
    });
    if (!response.ok) return new NextResponse(null, { status: 502 });
    const data = (await response.json()) as { user?: { avatar_url?: string } };
    const avatar = (data.user?.avatar_url ?? "").replace("_normal.", "_400x400.");
    if (!avatar.startsWith("https://pbs.twimg.com/")) return new NextResponse(null, { status: 404 });
    const image = await fetch(avatar, { next: { revalidate: 600 } });
    if (!image.ok) return new NextResponse(null, { status: 502 });
    return new NextResponse(await image.arrayBuffer(), {
      headers: {
        "content-type": image.headers.get("content-type") || "image/jpeg",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
