import { NextResponse } from "next/server";
import { fetchArchive, type ArchiveItem } from "@/lib/substack/archive";

export const revalidate = 600;

const POST_ORIGIN = "https://empresstrash.substack.com/p/";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type RawPost = ArchiveItem;

type SalonPost = {
  title: string;
  subtitle: string;
  slug: string;
  date: string;
  url: string;
  image: string;
};

export async function GET() {
  let items: RawPost[];
  try {
    items = await fetchArchive();
  } catch {
    return NextResponse.json({ posts: [] }, { status: 502 });
  }

  const posts: SalonPost[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const slug = item.slug ?? "";
    if (!SLUG.test(slug) || slug.length > 180 || seen.has(slug)) continue;
    const canonical = item.canonical_url ?? "";
    const url = canonical.startsWith(POST_ORIGIN) ? canonical : `${POST_ORIGIN}${slug}`;
    const cover = item.cover_image ?? "";
    seen.add(slug);
    posts.push({
      title: item.title?.trim() || slug,
      subtitle: item.subtitle?.trim() || "",
      slug,
      date: item.post_date || "",
      url,
      image: cover.startsWith("https://") ? cover : "",
    });
  }

  return NextResponse.json({ posts });
}
