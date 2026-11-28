export type GalleryPlatform = "objkt" | "manifold" | "transient" | "superrare";
export type GalleryChain = "ethereum" | "base";

export type GalleryKind = "works" | "editions";

export type GalleryConfig = {
  id: string;
  title: string;
  description: string;
  platform: GalleryPlatform;
  /** EVM chain. Objkt galleries ignore this. */
  chain: GalleryChain;
  contract: string;
  /**
   * works: one card per token (Fusion).
   * editions: one card per artwork, with a mint count and a live mint link.
   */
  kind?: GalleryKind;
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
    kind: "works",
  },
  {
    id: "editions",
    title: "editions",
    description: "Open editions on Transient. Each piece shows once, with how many were minted.",
    platform: "transient",
    chain: "ethereum",
    contract: "0xe278959dfbbf88227651222526814e280397274f",
    kind: "editions",
  },
];
