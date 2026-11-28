import { galleries, type GalleryConfig } from "./galleries";
import { fetchEvmContract } from "./sources/evm";
import { fetchObjktContract } from "./sources/objkt";
import { fetchOrdCollection } from "./sources/ordinals";
import { fetchSuperRareMarket, type SuperRareCard } from "./sources/superrare";
import { fetchTransientEditions } from "./sources/transient";
import type { GalleryPayload, GalleryWork } from "./types";

function findGallery(id: string): GalleryConfig | undefined {
  return galleries.find((gallery) => gallery.id === id);
}

type Loaded = {
  works: GalleryWork[];
  title?: string | null;
  description?: string | null;
};

async function loadWorks(gallery: GalleryConfig): Promise<Loaded> {
  if (gallery.platform === "ord") return { works: await fetchOrdCollection(gallery.contract) };
  if (gallery.kind === "editions") return { works: await fetchTransientEditions(gallery.contract) };
  if (gallery.platform === "objkt") return fetchObjktContract(gallery.contract);
  return { works: await fetchEvmContract(gallery.platform, gallery.chain, gallery.contract) };
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
    const loaded = await loadWorks(gallery);
    const titled: GalleryConfig = {
      ...gallery,
      title: loaded.title?.trim() || gallery.title,
      description: loaded.description?.trim() || gallery.description,
    };
    return payload(
      titled,
      loaded.works,
      loaded.works.length ? null : "Nothing in this gallery yet.",
    );
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
