import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";

const cache = new Map<string, string>();

export async function POST(request: Request) {
  const jar = await cookies();
  if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) {
    return Response.json({ error: "locked" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { text?: string; to?: string } | null;
  const text = body?.text?.trim().slice(0, 500) ?? "";
  const to = (body?.to || "en").toLowerCase().replace(/[^a-z-]/g, "").slice(0, 8) || "en";
  if (!text) return Response.json({ text: "" });

  const key = `${to}\n${text}`;
  const saved = cache.get(key);
  if (saved) return Response.json({ text: saved });

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return Response.json({ text }, { status: 200 });
  const data = (await response.json()) as unknown;
  const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  const translated = parts
    .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
    .join("")
    .trim();
  const result = translated || text;
  if (cache.size > 400) cache.clear();
  cache.set(key, result);
  return Response.json({ text: result });
}
