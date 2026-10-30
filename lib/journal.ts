import { readFileSync } from "fs";
import path from "path";
import postsFile from "../data/journal/posts.json";

export const JOURNAL_SITE = "https://www.empresstrash.com";
export const JOURNAL_FEED_PATH = "/journal/feed.xml";
export const JOURNAL_FEED_URL = `${JOURNAL_SITE}${JOURNAL_FEED_PATH}`;

export type JournalPost = {
  slug: string;
  title: string;
  subtitle: string;
  publishedAt: string | null;
  draft: boolean;
  html: string;
  categories: string[];
};

export const journalPosts = postsFile.posts as JournalPost[];

export function getJournalPost(slug: string) {
  return journalPosts.find((post) => post.slug === slug);
}

export function journalFeedResponse() {
  const xml = readFileSync(path.join(process.cwd(), "data", "journal", "feed.xml"));
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
