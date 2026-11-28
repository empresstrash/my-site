import { loadGalleries } from "@/lib/gallery/load";
import type { GalleryPayload } from "@/lib/gallery/types";

export const revalidate = 30;

let cache: { at: number; galleries: GalleryPayload[] } | null = null;

export async function GET() {
  const now = Date.now();
  if (!cache || now - cache.at > 30_000) {
    cache = { at: now, galleries: await loadGalleries() };
  }
  return Response.json(
    { galleries: cache.galleries },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
