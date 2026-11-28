export type GalleryPlatform = "objkt" | "manifold" | "transient" | "superrare" | "ord";
export type GalleryChain = "ethereum" | "base" | "bitcoin";

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
 * contract: the collection to read (an ord.net slug, a KT1…, or a 0x…)
 */
export const galleries: GalleryConfig[] = [
  {
    id: "genesis",
    title: "genesis oeuvre",
    description:
      "Empress Trash’s Genesis Ordinals (20 Jan 2024 – 3 Mar 2026) are the artist’s first Bitcoin inscriptions: images, texts, gifs, and hybrid AI works that place glitch, painting, and personal record on-chain as a permanent early archive.",
    platform: "ord",
    chain: "bitcoin",
    contract: "genesis-oeuvre",
  },
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
    title: "transient editions",
    description:
      "Hand-animated GIFs drawn in Procreate. Memes and character silliness.",
    platform: "transient",
    chain: "ethereum",
    contract: "0xe278959dfbbf88227651222526814e280397274f",
    kind: "editions",
  },
  {
    id: "self-portraits",
    title: "royal self portraits",
    description: "",
    platform: "objkt",
    chain: "ethereum",
    contract: "KT1QK69Z94UxoxCSux36aEKjD6fWHKg7CsQG",
  },
];
