import { gatewayUrls, isStoredUri, kindFrom, mapPool } from "../media";
import { formatWeiEth } from "./superrare";
import { editionCopy, type GalleryWork, type WorkKind } from "../types";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const API = "https://api.transient.xyz/v1/catalog";

type CatalogNft = {
  token_id: number;
  name?: string;
  image_uri?: string;
  image_mime_type?: string;
  media_uri?: string;
  media_mime_type?: string;
  media_type?: string;
};

type Stack = {
  name?: string;
  uri?: string;
  sale_state?: string;
  public_cost?: string;
  media_url?: string;
  media_type?: string;
  nft_token?: { token_id?: number } | null;
};

type Detail = { num_minted?: number; name?: string };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function stored(uri: string | undefined): string {
  if (!uri || !isStoredUri(uri)) return "";
  return uri;
}

function mediaOf(row: { image_uri?: string; image_mime_type?: string; media_uri?: string; media_mime_type?: string; media_type?: string }): {
  uri: string;
  mime: string;
  poster: string | null;
} | null {
  const image = stored(row.image_uri);
  const media = stored(row.media_uri);
  if (row.media_type === "VIDEO" && media) {
    return { uri: media, mime: row.media_mime_type || "video/mp4", poster: image || null };
  }
  if (image) return { uri: image, mime: row.image_mime_type || "", poster: null };
  if (media) return { uri: media, mime: row.media_mime_type || "", poster: null };
  return null;
}

function live(stack: Stack | undefined): boolean {
  return stack?.sale_state === "SALE" || stack?.sale_state === "PRESALE";
}

/**
 * One card per edition. New mints show up from the contract catalog, and a
 * mint page that is still open links there instead of the finished token.
 */
export async function fetchTransientEditions(contract: string): Promise<GalleryWork[]> {
  const address = contract.toLowerCase();
  const [nftPage, stackPage] = await Promise.all([
    getJson<{ results?: CatalogNft[] }>(`${API}/nfts?address=${address}&limit=100`),
    getJson<{ results?: Stack[] }>(`${API}/stacks?address=${address}&limit=100`),
  ]);
  const nfts = nftPage?.results ?? [];
  const stacks = stackPage?.results ?? [];
  const stackByToken = new Map<string, Stack>();
  for (const stack of stacks) {
    const id = stack.nft_token?.token_id;
    if (id != null) stackByToken.set(String(id), stack);
  }

  const details = await mapPool(nfts, 8, async (nft) => {
    const detail = await getJson<Detail>(`${API}/nfts/ethereum/${address}/${nft.token_id}`);
    return detail?.num_minted ?? null;
  });

  const works: GalleryWork[] = [];
  const seen = new Set<string>();

  nfts.forEach((nft, index) => {
    const tokenId = String(nft.token_id);
    seen.add(tokenId);
    const stack = stackByToken.get(tokenId);
    const picked = mediaOf(nft) || (stack ? mediaOf({ image_uri: stack.media_url, media_type: stack.media_type }) : null);
    if (!picked) return;
    const kind = kindFrom(picked.mime, picked.uri);
    if (kind === "html") return;
    const urls = gatewayUrls(picked.uri);
    if (!urls.length) return;
    const open = live(stack);
    const price = open ? formatWeiEth(stack?.public_cost || "") : null;
    const minted = details[index];
    works.push({
      tokenId,
      name: nft.name?.trim() || stack?.name?.trim() || `#${tokenId}`,
      url: open && stack?.uri
        ? `https://www.transient.xyz${stack.uri}`
        : `https://www.transient.xyz/nfts/ethereum/${address}/${tokenId}`,
      kind: kind as WorkKind,
      urls,
      poster: gatewayUrls(picked.poster),
      width: null,
      height: null,
      forSale: Boolean(open && price),
      price,
      edition: editionCopy(minted, open),
      minting: open,
      owner: null,
    });
  });

  for (const stack of stacks) {
    const tokenId = stack.nft_token?.token_id;
    if (tokenId == null || seen.has(String(tokenId)) || !live(stack)) continue;
    const picked = mediaOf({ image_uri: stack.media_url, media_type: stack.media_type });
    if (!picked || !stack.uri) continue;
    const kind = kindFrom(picked.mime, picked.uri);
    if (kind === "html") continue;
    const urls = gatewayUrls(picked.uri);
    if (!urls.length) continue;
    const price = formatWeiEth(stack.public_cost || "");
    works.push({
      tokenId: String(tokenId),
      name: stack.name?.trim() || `#${tokenId}`,
      url: `https://www.transient.xyz${stack.uri}`,
      kind: kind as WorkKind,
      urls,
      poster: gatewayUrls(picked.poster),
      width: null,
      height: null,
      forSale: Boolean(price),
      price,
      edition: null,
      minting: true,
      owner: null,
    });
  }

  return works.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
}
