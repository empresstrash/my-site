import { galleries, type GalleryConfig } from "./galleries";
import { fetchEvmContract } from "./sources/evm";
import { fetchObjktContract } from "./sources/objkt";
import { fetchSuperRareMarket, type SuperRareCard } from "./sources/superrare";
import { fetchTransientEditions } from "./sources/transient";
import type { GalleryPayload, GalleryWork } from "./types";

function findGallery(id: string): GalleryConfig | undefined {
  return galleries.find((gallery) => gallery.id === id);
}

async function loadWorks(gallery: GalleryConfig): Promise<GalleryWork[]> {
  if (gallery.kind === "editions") return fetchTransientEditions(gallery.contract);
  if (gallery.platform === "objkt") return fetchObjktContract(gallery.contract);
  return fetchEvmContract(gallery.platform, gallery.chain, gallery.contract);
}

function payload(gallery: GalleryConfig, works: GalleryWork[], error: string | null): GalleryPayload {
  return {
    id: gallery.id,
    title: gallery.title,
    description: gallery.description,
    platform: gallery.platform,
    chain: gallery.chain,
    contract: gallery.contract,
    works,
    error,
  };
}

export async function loadGallery(id: string): Promise<GalleryPayload | null> {
  const gallery = findGallery(id);
  if (!gallery) return null;
  try {
    const works = await loadWorks(gallery);
    return payload(gallery, works, works.length ? null : "No works with IPFS or Arweave media on this contract.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "This gallery didn’t load.";
    return payload(gallery, [], message);
  }
}

export async function loadGalleries(): Promise<GalleryPayload[]> {
  const loaded = await Promise.all(galleries.map((gallery) => loadGallery(gallery.id)));
  return loaded.filter((gallery): gallery is GalleryPayload => gallery !== null);
}

export type MarketItem = {
  tokenId: string;
  forSale: boolean;
  price: string | null;
  owner: string | null;
};

/** Listing price and collector name. Kept off the art response so the fan can paint first. */
export async function loadGalleryMarket(id: string, tokenIds: string[]): Promise<MarketItem[]> {
  const gallery = findGallery(id);
  if (!gallery || gallery.platform !== "superrare") return [];
  const market: Map<string, SuperRareCard> = await fetchSuperRareMarket(gallery.contract, tokenIds);
  return [...market.entries()].map(([tokenId, card]) => ({
    tokenId,
    forSale: Boolean(card.price),
    price: card.price,
    owner: card.owner,
  }));
}
