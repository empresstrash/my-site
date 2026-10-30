import { NextResponse } from "next/server";

export const revalidate = 600;

const ARCHIVE = "https://empresstrash.substack.com/api/v1/archive";
const POST_ORIGIN = "https://empresstrash.substack.com/p/";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type RawPost = {
  title?: string;
  subtitle?: string | null;
  slug?: string;
  post_date?: string;
  canonical_url?: string;
};

type SalonPost = {
  title: string;
  subtitle: string;
  slug: string;
  date: string;
  url: string;
};

function asPosts(payload: unknown): RawPost[] {
  if (Array.isArray(payload)) return payload as RawPost[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { posts?: unknown }).posts)) {
    return (payload as { posts: RawPost[] }).posts;
  }
  return [];
}

export async function GET() {
  const offsets = [0, 20, 40, 60];
  let batches: RawPost[][];
  try {
    batches = await Promise.all(
      offsets.map(async (offset) => {
        const response = await fetch(`${ARCHIVE}?sort=new&offset=${offset}&limit=20`, {
          next: { revalidate: 600 },
          headers: { Accept: "application/json", "User-Agent": "empresstrash.com" },
        });
        if (!response.ok) throw new Error(`archive ${response.status}`);
        return asPosts(await response.json());
      }),
    );
  } catch {
    return NextResponse.json({ posts: [] }, { status: 502 });
  }

  const posts: SalonPost[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const item of batch) {
      const slug = item.slug ?? "";
      if (!SLUG.test(slug) || slug.length > 180 || seen.has(slug)) continue;
      const canonical = item.canonical_url ?? "";
      const url = canonical.startsWith(POST_ORIGIN) ? canonical : `${POST_ORIGIN}${slug}`;
      seen.add(slug);
      posts.push({
        title: item.title?.trim() || slug,
        subtitle: item.subtitle?.trim() || "",
        slug,
        date: item.post_date || "",
        url,
      });
    }
  }

  return NextResponse.json({ posts });
}
