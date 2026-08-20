import {
  DAMSELS_ETH_CONTRACT,
  DAMSELS_TEZ_CONTRACT,
  DAMSELS_TOTAL,
  EMPRESS_ETH,
  EMPRESS_TZ,
  expandMediaUrls,
  type DamselToken,
} from "./constants";

export type { DamselToken } from "./constants";

const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";
const OPENSEA_GQL = "https://gql.opensea.io/graphql";
const ALCHEMY_NFT =
  "https://base-mainnet.g.alchemy.com/nft/v3/demo/getNFTsForContract";

function mediaSet(uris: Array<string | null | undefined>): { image: string | null; images: string[] } {
  const images = expandMediaUrls(uris).slice(0, 4);
  return { image: images[0] ?? null, images };
}

function sameAddr(a: string | null | undefined, b: string): boolean {
  return (a || "").toLowerCase() === b.toLowerCase();
}

async function fetchFresh(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, cache: "no-store" });
}

function formatTez(mutez: string | number): string | undefined {
  const n = Number(mutez);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const tez = n / 1_000_000;
  const label = Number.isInteger(tez) ? String(tez) : tez.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${label} $xtz`;
}

function formatEth(amount: number): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const label = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
  return `${label} $eth`;
}

export function damselNumberFrom(name: string | null | undefined): number | null {
  const s = String(name || "").trim();
  if (!s) return null;
  const named =
    s.match(/^damsels?\s*#?\s*(\d+)$/i) ||
    s.match(/^(\d+)$/) ||
    s.match(/damsels?\s*#?\s*(\d+)/i);
  if (!named) return null;
  const n = Number.parseInt(named[1], 10);
  return n >= 1 && n <= DAMSELS_TOTAL ? n : null;
}

function listingStatus(
  seller: string | null | undefined,
  artist: string,
  price?: string,
): Pick<DamselToken, "status" | "primary" | "forSale" | "price"> {
  if (!seller) {
    return { status: "collected", primary: false, forSale: false };
  }
  const primary = sameAddr(seller, artist);
  return {
    status: primary ? "primary" : "secondary",
    primary,
    forSale: true,
    price,
  };
}

async function objktQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetchFresh(OBJKT_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`objkt HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("objkt returned no data");
  return json.data;
}

type ObjktRow = {
  name: string | null;
  token_id: string;
  thumbnail_uri: string | null;
  display_uri: string | null;
  artifact_uri: string | null;
  listings: Array<{ price: string | number; seller_address: string }>;
};

async function fetchTezDamsels(): Promise<DamselToken[]> {
  const data = await objktQuery<{ token: ObjktRow[] }>(
    `query DamselsAll($fa: String!) {
      token(
        where: { fa_contract: { _eq: $fa } }
        order_by: { token_id: asc }
        limit: 500
      ) {
        name
        token_id
        thumbnail_uri
        display_uri
        artifact_uri
        listings(where: { status: { _eq: "active" } }, order_by: { price: asc }, limit: 8) {
          price
          seller_address
        }
      }
    }`,
    { fa: DAMSELS_TEZ_CONTRACT },
  );

  return (data.token ?? []).flatMap((row) => {
    const damselNumber = damselNumberFrom(row.name?.trim() || "");
    if (damselNumber == null) return [];
    const { image, images } = mediaSet([
      `https://assets.objkt.media/file/assets-003/${DAMSELS_TEZ_CONTRACT}/${row.token_id}/thumb400`,
      `https://assets.objkt.media/file/assets-003/${DAMSELS_TEZ_CONTRACT}/${row.token_id}/thumb288`,
      row.display_uri,
      row.artifact_uri,
      row.thumbnail_uri,
    ]);
    const artistListing = (row.listings ?? []).find((l) => sameAddr(l.seller_address, EMPRESS_TZ));
    const cheapest = row.listings?.[0];
    const listed = artistListing ?? cheapest;
    const market = listingStatus(
      listed?.seller_address,
      EMPRESS_TZ,
      listed ? formatTez(listed.price) : undefined,
    );
    return [{
      chain: "tez" as const,
      name: `Damsel ${damselNumber}`,
      tokenId: row.token_id,
      damselNumber,
      image,
      images,
      url: `https://objkt.com/tokens/${DAMSELS_TEZ_CONTRACT}/${row.token_id}`,
      ...market,
    }];
  });
}

type OsItem = {
  name: string | null;
  tokenId: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  owner?: { address?: string | null } | null;
  bestListing?: {
    maker?: { address?: string | null } | null;
    pricePerItem?: { native?: { unit?: number | null; symbol?: string | null } | null } | null;
  } | null;
};

async function openSeaItems(offset: number, limit: number): Promise<OsItem[]> {
  const query = `query {
    collectionItems(
      collectionSlug: "damsels"
      sort: { by: CREATED_DATE, direction: ASC }
      limit: ${limit}
      offset: ${offset}
    ) {
      items {
        name
        tokenId
        imageUrl
        animationUrl
        owner { address }
        bestListing {
          maker { address }
          pricePerItem { native { unit symbol } }
        }
      }
    }
  }`;
  const res = await fetchFresh(OPENSEA_GQL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: "https://opensea.io",
      referer: "https://opensea.io/collection/damsels",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`opensea HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { collectionItems?: { items?: OsItem[] } };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data?.collectionItems?.items ?? [];
}

function ethTokenFromOs(row: OsItem): DamselToken | null {
  const damselNumber = damselNumberFrom(row.name);
  const tokenId = row.tokenId ? String(row.tokenId) : "";
  if (damselNumber == null || !tokenId) return null;
  const { image, images } = mediaSet([row.imageUrl, row.animationUrl]);
  const listing = row.bestListing;
  const unit = listing?.pricePerItem?.native?.unit;
  const market = listingStatus(
    listing?.maker?.address,
    EMPRESS_ETH,
    typeof unit === "number" ? formatEth(unit) : undefined,
  );
  return {
    chain: "eth",
    name: `Damsel ${damselNumber}`,
    tokenId,
    damselNumber,
    image,
    images,
    url: `https://opensea.io/item/base/${DAMSELS_ETH_CONTRACT}/${tokenId}`,
    ...market,
  };
}

async function fetchEthFromAlchemy(): Promise<DamselToken[]> {
  const tokens: DamselToken[] = [];
  let pageKey: string | undefined;
  for (let i = 0; i < 8; i++) {
    const url = new URL(ALCHEMY_NFT);
    url.searchParams.set("contractAddress", DAMSELS_ETH_CONTRACT);
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("limit", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);
    const res = await fetchFresh(url.toString());
    if (!res.ok) break;
    const json = (await res.json()) as {
      nfts?: Array<{
        tokenId?: string;
        name?: string;
        image?: { originalUrl?: string; cachedUrl?: string; pngUrl?: string };
        raw?: { metadata?: { name?: string; image?: string; animation_url?: string } };
      }>;
      pageKey?: string;
    };
    for (const nft of json.nfts ?? []) {
      const name = nft.name || nft.raw?.metadata?.name || "";
      const damselNumber = damselNumberFrom(name);
      const rawId = nft.tokenId || "";
      const tokenId = rawId.startsWith("0x")
        ? String(BigInt(rawId))
        : String(Number.parseInt(rawId, 10) || rawId);
      if (damselNumber == null || !tokenId) continue;
      const { image, images } = mediaSet([
        nft.raw?.metadata?.animation_url,
        nft.image?.originalUrl,
        nft.raw?.metadata?.image,
        nft.image?.cachedUrl,
        nft.image?.pngUrl,
      ]);
      tokens.push({
        chain: "eth",
        name: `Damsel ${damselNumber}`,
        tokenId: String(Number.parseInt(tokenId, 10) || tokenId),
        damselNumber,
        image,
        images,
        url: `https://opensea.io/item/base/${DAMSELS_ETH_CONTRACT}/${tokenId}`,
        forSale: false,
        primary: false,
        status: "collected",
      });
    }
    pageKey = json.pageKey;
    if (!pageKey) break;
  }
  return tokens;
}

async function fetchEthFromOpenSea(): Promise<DamselToken[]> {
  const pages = await Promise.all(
    [0, 100, 200, 300].map((offset) =>
      openSeaItems(offset, offset === 300 ? 50 : 100).catch(() => [] as OsItem[]),
    ),
  );
  const byId = new Map<string, DamselToken>();
  for (const rows of pages) {
    for (const row of rows) {
      const token = ethTokenFromOs(row);
      if (token) byId.set(token.tokenId, token);
    }
  }
  return [...byId.values()];
}

function mergeEthToken(base: DamselToken, overlay: DamselToken): DamselToken {
  const images = expandMediaUrls([
    ...(overlay.images ?? [overlay.image]),
    ...(base.images ?? [base.image]),
  ]).slice(0, 4);
  const useOverlayListing = overlay.forSale;
  return {
    ...base,
    url: overlay.url ?? base.url,
    images,
    image: images[0] ?? base.image,
    forSale: overlay.forSale || base.forSale,
    status: useOverlayListing ? overlay.status : base.status,
    primary: useOverlayListing ? overlay.primary : base.primary,
    price: useOverlayListing ? overlay.price : base.price,
  };
}

async function fetchEthMetadata(tokenId: string): Promise<DamselToken | null> {
  const url = new URL("https://base-mainnet.g.alchemy.com/nft/v3/demo/getNFTMetadata");
  url.searchParams.set("contractAddress", DAMSELS_ETH_CONTRACT);
  url.searchParams.set("tokenId", tokenId);
  const res = await fetchFresh(url.toString());
  if (!res.ok) return null;
  const nft = (await res.json()) as {
    tokenId?: string;
    name?: string;
    image?: { originalUrl?: string; cachedUrl?: string; pngUrl?: string };
    raw?: { metadata?: { name?: string; image?: string; animation_url?: string } };
  };
  const name = nft.name || nft.raw?.metadata?.name || `Damsel ${tokenId}`;
  const damselNumber = damselNumberFrom(name) ?? damselNumberFrom(tokenId);
  if (damselNumber == null) return null;
  const { image, images } = mediaSet([
    nft.raw?.metadata?.animation_url,
    nft.image?.originalUrl,
    nft.raw?.metadata?.image,
    nft.image?.cachedUrl,
    nft.image?.pngUrl,
  ]);
  return {
    chain: "eth",
    name: `Damsel ${damselNumber}`,
    tokenId: String(tokenId),
    damselNumber,
    image,
    images,
    url: `https://opensea.io/item/base/${DAMSELS_ETH_CONTRACT}/${tokenId}`,
    forSale: false,
    primary: false,
    status: "collected",
  };
}

async function fetchEthDamsels(): Promise<DamselToken[]> {
  const fromOs = await fetchEthFromOpenSea().catch(() => [] as DamselToken[]);
  const byId = new Map<string, DamselToken>();
  for (const token of fromOs) byId.set(token.tokenId, token);

  const missingIds: string[] = [];
  for (let n = 1; n <= 333; n++) {
    if (!byId.has(String(n))) missingIds.push(String(n));
  }

  if (missingIds.length) {
    const extras = await Promise.all(
      missingIds.map((id) => fetchEthMetadata(id).catch(() => null)),
    );
    for (const token of extras) {
      if (token) byId.set(token.tokenId, token);
    }
  }

  if (byId.size < 333) {
    const fromAlchemy = await fetchEthFromAlchemy().catch(() => [] as DamselToken[]);
    for (const token of fromAlchemy) {
      const existing = byId.get(token.tokenId);
      byId.set(token.tokenId, existing ? mergeEthToken(existing, token) : token);
    }
  }

  return [...byId.values()].sort((a, b) => a.damselNumber - b.damselNumber);
}

function sortTokens(tokens: DamselToken[]): DamselToken[] {
  return [...tokens].sort((a, b) => {
    if (a.damselNumber !== b.damselNumber) return a.damselNumber - b.damselNumber;
    if (a.chain === b.chain) return Number(a.tokenId) - Number(b.tokenId);
    return a.chain === "eth" ? -1 : 1;
  });
}

function uniqueInChain(tokens: DamselToken[]): DamselToken[] {
  const rank = (t: DamselToken) =>
    t.status === "primary" ? 0 : t.status === "secondary" ? 1 : 2;
  const byNumber = new Map<number, DamselToken>();
  for (const token of tokens) {
    const existing = byNumber.get(token.damselNumber);
    if (!existing) {
      byNumber.set(token.damselNumber, token);
      continue;
    }
    if (rank(token) < rank(existing)) byNumber.set(token.damselNumber, token);
  }
  return [...byNumber.values()];
}

export async function fetchDamselsCollection(): Promise<{
  all: DamselToken[];
  minted: number;
}> {
  const [eth, tez] = await Promise.all([
    fetchEthDamsels().catch(() => [] as DamselToken[]),
    fetchTezDamsels().catch(() => [] as DamselToken[]),
  ]);
  const all = sortTokens([...uniqueInChain(tez), ...uniqueInChain(eth)]);
  return { all, minted: all.length };
}
