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
  /** Editions only: how many were minted. One card per artwork. */
  minted?: number | null;
  /** Collector name on a sold 1/1. Never a raw wallet. */
  owner?: string | null;
};

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
