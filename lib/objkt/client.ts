const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";

export interface ObjktTokenInfo {
  name: string | null;
  tokenId: string;
  faContract: string;
  supply: number;
  thumbnailUri: string | null;
  displayUri: string | null;
  creators: Array<{ address: string; alias: string | null }>;
}

export interface ObjktHolder {
  address: string;
  quantity: number;
  alias: string | null;
}

export async function objktGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(OBJKT_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`objkt API HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("objkt API returned no data");
  }
  return json.data;
}

const TOKEN_QUERY = `
query TokenByRef($fa: String!, $tokenId: String!) {
  by_contract: token(
    where: { fa_contract: { _eq: $fa }, token_id: { _eq: $tokenId } }
    limit: 1
  ) {
    name
    token_id
    fa_contract
    supply
    thumbnail_uri
    display_uri
    creators {
      creator_address
      holder { alias }
    }
  }
  by_path: token(
    where: { fa: { path: { _eq: $fa } }, token_id: { _eq: $tokenId } }
    limit: 1
  ) {
    name
    token_id
    fa_contract
    supply
    thumbnail_uri
    display_uri
    creators {
      creator_address
      holder { alias }
    }
  }
}
`;

type RawToken = {
  name: string | null;
  token_id: string;
  fa_contract: string;
  supply: number;
  thumbnail_uri: string | null;
  display_uri: string | null;
  creators: Array<{
    creator_address: string;
    holder: { alias: string | null } | null;
  }>;
};

function mapToken(t: RawToken): ObjktTokenInfo {
  return {
    name: t.name,
    tokenId: t.token_id,
    faContract: t.fa_contract,
    supply: t.supply,
    thumbnailUri: t.thumbnail_uri,
    displayUri: t.display_uri,
    creators: (t.creators ?? []).map((c) => ({
      address: c.creator_address,
      alias: c.holder?.alias ?? null,
    })),
  };
}

export async function fetchTokenInfo(
  faOrPath: string,
  tokenId: string,
): Promise<ObjktTokenInfo | null> {
  const data = await objktGraphql<{
    by_contract: RawToken[];
    by_path: RawToken[];
  }>(TOKEN_QUERY, { fa: faOrPath, tokenId });

  const raw = data.by_contract[0] ?? data.by_path[0];
  return raw ? mapToken(raw) : null;
}

const HOLDERS_PAGE = 500;

const HOLDERS_QUERY = `
query TokenHolders($fa: String!, $tokenId: String!, $limit: Int!, $offset: Int!) {
  token(
    where: {
      _or: [
        { fa_contract: { _eq: $fa }, token_id: { _eq: $tokenId } }
        { fa: { path: { _eq: $fa } }, token_id: { _eq: $tokenId } }
      ]
    }
    limit: 1
  ) {
    name
    token_id
    fa_contract
    supply
    thumbnail_uri
    display_uri
    creators {
      creator_address
      holder { alias }
    }
    holders(
      where: { quantity: { _gt: "0" } }
      order_by: { holder_address: asc }
      limit: $limit
      offset: $offset
    ) {
      holder_address
      quantity
      holder { alias }
    }
  }
}
`;

export async function fetchTokenWithHolders(
  faOrPath: string,
  tokenId: string,
): Promise<{ token: ObjktTokenInfo; holders: ObjktHolder[] } | null> {
  const allHolders: ObjktHolder[] = [];
  let token: ObjktTokenInfo | null = null;
  let offset = 0;

  // Paginate — objkt caps at 500 rows per request
  for (;;) {
    const data = await objktGraphql<{
      token: Array<
        RawToken & {
          holders: Array<{
            holder_address: string;
            quantity: string | number;
            holder: { alias: string | null } | null;
          }>;
        }
      >;
    }>(HOLDERS_QUERY, {
      fa: faOrPath,
      tokenId,
      limit: HOLDERS_PAGE,
      offset,
    });

    const row = data.token[0];
    if (!row) return null;

    if (!token) token = mapToken(row);

    const page = row.holders.map((h) => ({
      address: h.holder_address,
      // quantity can arrive as string/decimal from GraphQL
      quantity: Math.max(0, Math.floor(Number(h.quantity))),
      alias: h.holder?.alias ?? null,
    }));

    allHolders.push(...page.filter((h) => h.quantity > 0));

    if (page.length < HOLDERS_PAGE) break;
    offset += HOLDERS_PAGE;
  }

  return { token: token!, holders: allHolders };
}

export function ipfsToHttp(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}
