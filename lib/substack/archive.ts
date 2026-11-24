const IMAGE_FETCH = "https://substackcdn.com/image/fetch/";
const THUMB = "w_960,c_limit,f_jpg,q_auto:good";
const ARCHIVE = "https://empresstrash.substack.com/api/v1/archive";
const PAGE_SIZE = 20;
const MAX_PAGES = 12;

export type ArchiveItem = {
  title?: string;
  subtitle?: string | null;
  slug?: string;
  post_date?: string;
  canonical_url?: string;
  cover_image?: string | null;
};

type ArchivePage = {
  posts?: ArchiveItem[];
  nextCursor?: string | null;
};

function unwrapFetch(url: string): string | null {
  if (!url.startsWith(IMAGE_FETCH)) return null;
  const rest = url.slice(IMAGE_FETCH.length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  try {
    return decodeURIComponent(rest.slice(slash + 1));
  } catch {
    return null;
  }
}

function stillUpload(url: string): string | null {
  const video = url.match(/^https:\/\/substackcdn\.com\/video\/upload\/(?:[^/]+\/)?([A-Za-z0-9_-]+)\.[a-z0-9]+$/i);
  if (video) return `https://substackcdn.com/video/upload/${THUMB}/${video[1]}.jpg`;
  const image = url.match(/^https:\/\/substackcdn\.com\/image\/upload\/(?:[^/]+\/)?([A-Za-z0-9_-]+)$/);
  if (image) return `https://substackcdn.com/image/upload/${THUMB}/${image[1]}`;
  return null;
}

export function coverThumb(url: string): string {
  if (!url.startsWith("https://")) return "";
  const source = unwrapFetch(url) ?? url;
  return stillUpload(source) ?? `${IMAGE_FETCH}${THUMB}/${encodeURIComponent(source)}`;
}

export async function fetchArchive(): Promise<ArchiveItem[]> {
  const posts: ArchiveItem[] = [];
  const seenCursors = new Set<string>();
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ sort: "new", limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`${ARCHIVE}?${params.toString()}`, {
      next: { revalidate: 600 },
      headers: { Accept: "application/json", "User-Agent": "empresstrash.com" },
    });
    if (!response.ok) throw new Error(`archive ${response.status}`);

    const payload = (await response.json()) as ArchivePage | ArchiveItem[];
    const batch = Array.isArray(payload) ? payload : Array.isArray(payload.posts) ? payload.posts : [];
    posts.push(...batch);

    const next = !Array.isArray(payload) && typeof payload.nextCursor === "string" ? payload.nextCursor : "";
    if (!next || batch.length === 0 || seenCursors.has(next)) break;
    seenCursors.add(next);
    cursor = next;
  }

  return posts;
}
