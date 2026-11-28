import { editionCopy, type GalleryWork } from "../types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type OrdItem = {
  id?: string;
  name?: string | null;
  inscription?: number | null;
  inscriptionId?: string | null;
  image?: string | null;
  listingState?: string | null;
  price?: number | null;
  contentType?: string | null;
  rawContentType?: string | null;
};

type OrdPage = {
  items?: OrdItem[];
  pagination?: { hasNext?: boolean; nextCursor?: string | null };
};

function formatBtc(price: number | null | undefined): string | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return `${price.toFixed(8).replace(/\.?0+$/, "")} BTC`;
}

async function page(slug: string, cursor: string | null): Promise<OrdPage> {
  const url = new URL(`https://ord.net/api/collections/${encodeURIComponent(slug)}/items`);
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ord.net HTTP ${res.status}`);
  return (await res.json()) as OrdPage;
}

/**
 * A curated ord.net collection, not a contract. New inscriptions in the
 * collection show up on the next load. Media is the inscription itself.
 */
export async function fetchOrdCollection(slug: string): Promise<GalleryWork[]> {
  const items: OrdItem[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;

  for (let n = 0; n < 8; n += 1) {
    const body = await page(slug, cursor);
    const batch = body.items ?? [];
    let fresh = 0;
    for (const item of batch) {
      const id = item.inscriptionId || item.id || "";
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push(item);
      fresh += 1;
    }
    const next = body.pagination?.hasNext ? body.pagination.nextCursor : null;
    if (!next || !fresh) break;
    cursor = next;
  }

  const works: GalleryWork[] = [];
  for (const item of items) {
    if (item.contentType && item.contentType !== "image") continue;
    const id = item.inscriptionId || item.id;
    if (!id) continue;
    const mime = (item.rawContentType || "").toLowerCase();
    if (mime.startsWith("text") || mime.includes("html")) continue;
    const content = `https://ordinals.com/content/${id}`;
    const snapshot =
      item.image && item.image.startsWith("https://")
        ? item.image
        : `https://render.ord.net/v10/snapshots/${id}/512.webp`;
    const buyable = item.listingState === "buyable";
    const price = buyable ? formatBtc(item.price) : null;
    const number = item.inscription != null ? String(item.inscription) : id;
    works.push({
      tokenId: number,
      name: item.name?.trim() || `#${number}`,
      url: `https://ord.net/inscription/${number}`,
      kind: mime.includes("gif") ? "gif" : "image",
      urls: [content, snapshot],
      poster: [snapshot],
      width: null,
      height: null,
      forSale: Boolean(price),
      price,
      edition: editionCopy(1, false),
      minting: false,
      owner: null,
    });
  }

  return works.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
}
