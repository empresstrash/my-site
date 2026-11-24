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
