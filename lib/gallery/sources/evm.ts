import type { GalleryChain, GalleryPlatform } from "../galleries";
import {
  fetchIpfsJson,
  gatewayUrls,
  isStoredUri,
  kindFrom,
  mapPool,
  pickFromMetadata,
} from "../media";
import type { GalleryWork, WorkKind } from "../types";

const ALCHEMY_HOST: Record<GalleryChain, string> = {
  ethereum: "eth-mainnet",
  base: "base-mainnet",
};

/**
 * SuperRare's shared contracts hold every artist. Reading one of those
 * whole would pull other people's work, so a gallery on them is refused
 * until it can be filtered by creator. Dedicated contracts (Fusion) are
 * read in full.
 */
const SHARED_SUPERRARE = new Set([
  "0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0",
  "0x41a322b28d0ff354040e2cbc676f0320d8c8850d",
]);

type AlchemyNft = {
  tokenId?: string;
  name?: string;
  image?: { contentType?: string; originalUrl?: string };
  animation?: { contentType?: string; originalUrl?: string };
  raw?: {
    tokenUri?: string;
    metadata?: {
      name?: string;
      image?: string;
      animation_url?: string;
      original_image_url?: string;
      original_animation_url?: string;
    };
  };
};

function alchemyKey(): string {
  return process.env.ALCHEMY_API_KEY || "demo";
}

function normalizeTokenId(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("0x")) return BigInt(value).toString(10);
  return value;
}

export function listingUrl(
  platform: GalleryPlatform,
  chain: GalleryChain,
  contract: string,
  tokenId: string,
): string {
  if (platform === "superrare") {
    return `https://superrare.com/artwork/eth/${contract}/${tokenId}`;
  }
  if (platform === "manifold") {
    const slug = chain === "base" ? "base" : "ethereum";
    return `https://manifold.xyz/nft/${slug}/${contract}/${tokenId}`;
  }
  if (platform === "transient") {
    const chainId = chain === "base" ? "8453" : "1";
    return `https://www.transient.xyz/token/${chainId}/${contract}/${tokenId}`;
  }
  return `https://objkt.com/tokens/${contract}/${tokenId}`;
}

function fallbackFromAlchemy(nft: AlchemyNft): {
  uri: string;
  mime: string;
  poster: string | null;
} | null {
  const meta = nft.raw?.metadata;
  const animationUri = meta?.original_animation_url || "";
  const imageUri = meta?.original_image_url || (isStoredUri(meta?.image) ? meta?.image || "" : "");
  const animationType = nft.animation?.contentType || "";
  const imageType = nft.image?.contentType || "";
  const animationKind = animationUri ? kindFrom(animationType, animationUri) : null;

  if (animationUri && isStoredUri(animationUri) && animationKind && animationKind !== "html") {
    return {
      uri: animationUri,
      mime: animationType,
      poster: imageUri && isStoredUri(imageUri) && imageUri !== animationUri ? imageUri : null,
    };
  }
  if (imageUri && isStoredUri(imageUri)) {
    return { uri: imageUri, mime: imageType, poster: null };
  }
  return null;
}

async function resolveNft(
  nft: AlchemyNft,
  platform: GalleryPlatform,
  chain: GalleryChain,
  contract: string,
): Promise<GalleryWork | null> {
  const rawId = nft.tokenId || "";
  if (!rawId) return null;
  const tokenId = normalizeTokenId(rawId);
  const tokenUri = nft.raw?.tokenUri || "";
  const meta = tokenUri && isStoredUri(tokenUri) ? await fetchIpfsJson(tokenUri) : null;
  const picked = meta ? pickFromMetadata(meta) : null;
  const fallback = picked ? null : fallbackFromAlchemy(nft);
  const uri = picked?.uri || fallback?.uri;
  if (!uri) return null;

  const mime = picked?.mime || fallback?.mime || "";
  const kind = kindFrom(mime, uri);
  if (kind === "html") return null;
  const urls = gatewayUrls(uri);
  if (!urls.length) return null;

  const name =
    picked?.name ||
    nft.raw?.metadata?.name?.trim() ||
    nft.name?.trim() ||
    `#${tokenId}`;

  return {
    tokenId,
    name,
    url: listingUrl(platform, chain, contract, tokenId),
    kind: kind as WorkKind,
    urls,
    poster: gatewayUrls(picked?.poster || fallback?.poster),
    width: picked?.width ?? null,
    height: picked?.height ?? null,
    forSale: false,
    price: null,
  };
}

async function fetchAlchemyPage(
  chain: GalleryChain,
  contract: string,
  pageKey?: string,
): Promise<{ nfts: AlchemyNft[]; pageKey?: string }> {
  const url = new URL(
    `https://${ALCHEMY_HOST[chain]}.g.alchemy.com/nft/v3/${alchemyKey()}/getNFTsForContract`,
  );
  url.searchParams.set("contractAddress", contract);
  url.searchParams.set("withMetadata", "true");
  url.searchParams.set("limit", "100");
  if (pageKey) url.searchParams.set("pageKey", pageKey);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`alchemy HTTP ${res.status}`);
  const json = (await res.json()) as { nfts?: AlchemyNft[]; pageKey?: string };
  return { nfts: json.nfts ?? [], pageKey: json.pageKey };
}

export async function fetchEvmContract(
  platform: GalleryPlatform,
  chain: GalleryChain,
  contract: string,
): Promise<GalleryWork[]> {
  const normalized = contract.toLowerCase();
  if (platform === "superrare" && SHARED_SUPERRARE.has(normalized)) {
    throw new Error(
      "This SuperRare contract is shared with other artists. Use the dedicated collection contract.",
    );
  }

  const nfts: AlchemyNft[] = [];
  let pageKey: string | undefined;
  for (let page = 0; page < 8; page += 1) {
    const batch = await fetchAlchemyPage(chain, contract, pageKey);
    nfts.push(...batch.nfts);
    pageKey = batch.pageKey;
    if (!pageKey) break;
  }

  const works = await mapPool(nfts, 8, (nft) => resolveNft(nft, platform, chain, contract));
  return works
    .filter((work): work is GalleryWork => work !== null)
    .sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
}
