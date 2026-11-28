export type GalleryPlatform = "objkt" | "manifold" | "transient" | "superrare";
export type GalleryChain = "ethereum" | "base";

export type GalleryConfig = {
  id: string;
  title: string;
  description: string;
  platform: GalleryPlatform;
  /** EVM chain. Objkt galleries ignore this. */
  chain: GalleryChain;
  contract: string;
};

/**
 * One entry is one carousel, top to bottom.
 * A new mint on a contract listed here shows up on the next gallery load.
 *
 * platform: where the listing link goes
 * contract: the collection to read (KT1… or 0x…)
 */
export const galleries: GalleryConfig[] = [
  {
    id: "fusion",
    title: "fusion",
    description:
      "Painting-focused works fusing traditional oil painting with digital and AI process.",
    platform: "superrare",
    chain: "ethereum",
    contract: "0x3caabfcad9c7bb04f62a1d0703fb202cb31d9dd4",
  },
];
