import { loadGallery, loadGalleries } from "@/lib/gallery/load";
import type { GalleryPayload } from "@/lib/gallery/types";

export const revalidate = 5;

/** Art, edition size, and mint state. A reload a few seconds later checks again. */

const ART_TTL = 5_000;
const artCache = new Map<string, { at: number; gallery: GalleryPayload }>();

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const now = Date.now();

  if (id) {
    const hit = artCache.get(id);
    const gallery = hit && now - hit.at < ART_TTL ? hit.gallery : await loadGallery(id);
    if (!gallery) return Response.json({ error: "Unknown gallery." }, { status: 404 });
    if (!hit || now - hit.at >= ART_TTL) artCache.set(id, { at: now, gallery });
    return Response.json(
      { gallery },
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } },
    );
  }

  const galleries = await loadGalleries();
  return Response.json(
    { galleries },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } },
  );
}
