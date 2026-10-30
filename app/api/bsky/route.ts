import { NextResponse } from "next/server";

export const revalidate = 300;

const ACTOR = "empresstrash.bsky.social";

type FeedItem = {
  post?: {
    uri?: string;
    author?: { handle?: string; avatar?: string };
    record?: { text?: string; createdAt?: string };
  };
};

export async function GET() {
  try {
    const [profileRes, feedRes] = await Promise.all([
      fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${ACTOR}`, {
        next: { revalidate: 300 },
        headers: { Accept: "application/json" },
      }),
      fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${ACTOR}&limit=5&filter=posts_no_replies`,
        { next: { revalidate: 300 }, headers: { Accept: "application/json" } },
      ),
    ]);
    const profile = profileRes.ok ? ((await profileRes.json()) as { avatar?: string }) : {};
    const feed = feedRes.ok ? ((await feedRes.json()) as { feed?: FeedItem[] }) : { feed: [] };
    const posts = (feed.feed ?? []).flatMap((item) => {
      const post = item.post;
      const text = post?.record?.text?.trim() || "";
      const rkey = (post?.uri ?? "").split("/").pop();
      const handle = post?.author?.handle || ACTOR;
      if (!text || !rkey) return [];
      return [{ text, href: `https://bsky.app/profile/${handle}/post/${rkey}`, date: post?.record?.createdAt || "" }];
    });
    const avatar = profile.avatar?.startsWith("https://") ? profile.avatar : "";
    return NextResponse.json({ avatar, posts });
  } catch {
    return NextResponse.json({ avatar: "", posts: [] }, { status: 502 });
  }
}
