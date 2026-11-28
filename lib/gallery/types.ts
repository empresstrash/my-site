import type { GalleryChain, GalleryPlatform } from "./galleries";

export type { GalleryChain, GalleryPlatform };

export type WorkKind = "image" | "gif" | "video";

export type GalleryWork = {
  tokenId: string;
  name: string;
  url: string;
  kind: WorkKind;
  urls: string[];
  poster: string[];
  width: number | null;
  height: number | null;
  forSale: boolean;
  price: string | null;
  /** "1/1 edition", "10/10 edition", or "2 minted" while a mint is still open. */
  edition?: string | null;
  /** True while a mint is open. The button says mint, and the label is a count. */
  minting?: boolean;
  /** Collector name on a sold 1/1, or "in the vault". Never a raw wallet. */
  owner?: string | null;
};

/** Closed works read "N/N edition". An open mint reads "N minted". */
export function editionCopy(count: number | null | undefined, minting: boolean): string | null {
  if (count == null || !Number.isFinite(count) || count < 0) return null;
  const n = Math.trunc(count);
  if (minting) return `${n} minted`;
  if (n < 1) return null;
  return `${n}/${n} edition`;
}

export type GalleryPayload = {
  id: string;
  title: string;
  description: string;
  platform: GalleryPlatform;
  chain: GalleryChain;
  contract: string;
  works: GalleryWork[];
  error: string | null;
};
