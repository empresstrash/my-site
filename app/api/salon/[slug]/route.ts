import { NextResponse } from "next/server";
import { fetchArchive } from "@/lib/substack/archive";
import { renderXPosts } from "@/lib/substack/embeds";

export const revalidate = 600;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POST_ORIGIN = "https://empresstrash.substack.com/p/";
const MEDIA_FRAME = /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|open\.spotify\.com)\//i;

type RawPost = {
  title?: string;
  subtitle?: string | null;
  slug?: string;
  post_date?: string;
  canonical_url?: string;
  body_html?: string;
};

function sanitize(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (frame) => {
      const src = frame.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
      return MEDIA_FRAME.test(src) ? frame : "";
    })
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

type KnownPost = { slug: string; url: string };

async function knownPosts(): Promise<KnownPost[]> {
  let items: { slug?: string; canonical_url?: string }[];
  try {
    items = await fetchArchive();
  } catch {
    return [];
  }
  const posts: KnownPost[] = [];
  for (const item of items) {
    const slug = item.slug ?? "";
    if (!SLUG.test(slug)) continue;
    const canonical = item.canonical_url ?? "";
    posts.push({ slug, url: canonical.startsWith(POST_ORIGIN) ? canonical : `${POST_ORIGIN}${slug}` });
  }
  return posts;
}

function rewriteParagraphLinks(html: string, posts: KnownPost[]): string {
  return html.replace(
    /https?:\/\/(?:www\.)?paragraph\.com\/@empresstrash\/([a-z0-9-]+)/gi,
    (full, raw: string) => {
      const slug = raw.toLowerCase();
      const exact = posts.find((post) => post.slug === slug);
      if (exact) return exact.url;
      const prefixes = posts
        .filter((post) => slug.startsWith(post.slug) && post.slug.length >= 24)
        .sort((a, b) => b.slug.length - a.slug.length);
      return prefixes[0]?.url ?? full;
    },
  );
}

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  if (!SLUG.test(slug) || slug.length > 180) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }

  try {
    const response = await fetch(`https://empresstrash.substack.com/api/v1/posts/${slug}`, {
      next: { revalidate: 600 },
      headers: { Accept: "application/json", "User-Agent": "empresstrash.com" },
    });
    if (!response.ok) return NextResponse.json({ error: "missing" }, { status: 502 });
    const post = (await response.json()) as RawPost;
    if (post.slug && post.slug !== slug) return NextResponse.json({ error: "missing" }, { status: 404 });
    const canonical = post.canonical_url ?? "";
    const posts = await knownPosts();
    return NextResponse.json({
      title: post.title?.trim() || slug,
      subtitle: post.subtitle?.trim() || "",
      date: post.post_date || "",
      url: canonical.startsWith(POST_ORIGIN) ? canonical : `${POST_ORIGIN}${slug}`,
      html: renderXPosts(rewriteParagraphLinks(sanitize(post.body_html || ""), posts)),
    });
  } catch {
    return NextResponse.json({ error: "missing" }, { status: 502 });
  }
}
