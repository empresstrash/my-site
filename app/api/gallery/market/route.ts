import { loadGalleryMarket, type MarketItem } from "@/lib/gallery/load";

export const revalidate = 120;

/** Collector names and buy prices. Not on the art response, so the fan can paint first. */

const marketCache = new Map<string, { at: number; items: MarketItem[] }>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const tokenIds = (url.searchParams.get("tokens") ?? "")
    .split(",")
    .map((tokenId) => tokenId.trim())
    .filter(Boolean);
  if (!id) return Response.json({ error: "Missing gallery." }, { status: 400 });
  const cacheKey = `${id}:${[...tokenIds].sort().join(",")}`;

  const now = Date.now();
  const hit = marketCache.get(cacheKey);
  if (hit && now - hit.at < 180_000) {
    return Response.json(
      { id, items: hit.items },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  }

  const items = await loadGalleryMarket(id, tokenIds);
  marketCache.set(cacheKey, { at: now, items });
  return Response.json(
    { id, items },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
  );
}
