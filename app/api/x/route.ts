import { NextResponse } from "next/server";

export const revalidate = 600;

export async function GET() {
  try {
    const response = await fetch("https://api.fxtwitter.com/EmpressTrash", {
      next: { revalidate: 600 },
      headers: { Accept: "application/json", "User-Agent": "empresstrash.com" },
    });
    if (!response.ok) return NextResponse.json({ name: "", bio: "", avatar: "" }, { status: 502 });
    const data = (await response.json()) as {
      user?: { name?: string; description?: string; avatar_url?: string };
    };
    const user = data.user ?? {};
    const avatar = (user.avatar_url ?? "").replace("_normal.", "_400x400.");
    return NextResponse.json({
      name: user.name || "Empress Trash",
      bio: user.description || "",
      avatar: avatar.startsWith("https://") ? avatar : "",
    });
  } catch {
    return NextResponse.json({ name: "", bio: "", avatar: "" }, { status: 502 });
  }
}
