import { mapPool } from "../media";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Her own wallets and names. A work she still holds is not shown as sold. */
const ARTIST_NAMES = /^(empresstrash|empresstrashvault)(\.eth)?$/i;
const ARTIST_ADDRESSES = new Set([
  "0x8469b7b08d30c63fea3a248a198de9d634b63d70",
  "0x4071284610ce3974b2999613980e043542862a37",
]);

export type SuperRareCard = {
  price: string | null;
  owner: string | null;
};

export function formatWeiEth(wei: string): string | null {
  let value: bigint;
  try {
    value = BigInt(wei);
  } catch {
    return null;
  }
  if (value <= BigInt(0)) return null;
  const base = BigInt(10) ** BigInt(18);
  const whole = value / base;
  const frac = (value % base).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return frac ? `${whole.toString()}.${frac} ETH` : `${whole.toString()} ETH`;
}

function displayName(value: string | undefined): string | null {
  if (!value || value === "null") return null;
  const name = value.trim();
  if (!name || name.toLowerCase().startsWith("0x") || ARTIST_NAMES.test(name)) return null;
  return name;
}

function readOwner(chunk: string): { name: string | null; address: string | null } {
  const at = chunk.indexOf('\\"owner\\":{');
  if (at < 0) return { name: null, address: null };
  const slice = chunk.slice(at, at + 500);
  const address = slice.match(/\\"defaultAddress\\":\\"([^\\"]+)\\"/)?.[1] ?? null;
  const username = slice.match(/\\"username\\":\\"([^\\"]*)\\"/)?.[1];
  const fullName = slice.match(/\\"fullName\\":\\"([^\\"]*)\\"/)?.[1];
  const artist = address ? ARTIST_ADDRESSES.has(address.toLowerCase()) : false;
  return {
    name: artist ? null : displayName(username) || displayName(fullName),
    address: artist ? null : address,
  };
}

function readPrice(after: string): string | null {
  const state = after.indexOf('\\"state\\":{\\"auctions\\"');
  // The token's own state follows its id. Later states belong to other cards.
  if (state < 0 || state > 4000) return null;
  const slice = after.slice(state, state + 2200);
  const listingsAt = slice.indexOf('\\"listings\\":');
  if (listingsAt < 0) return null;
  const list = slice.slice(listingsAt, listingsAt + 450);
  if (list.startsWith('\\"listings\\":[]')) return null;
  const offersAt = list.indexOf('\\"offers\\"');
  const body = offersAt > 0 ? list.slice(0, offersAt) : list;
  const amount = body.match(/\\"cryptoAmount\\":\\"(\d+)\\"/);
  if (!amount) return null;
  return formatWeiEth(amount[1]);
}

type Parsed = { price: string | null; owner: string | null; address: string | null };

/** One artwork page lists the token plus nearby works, each with owner and listing. */
export function parseSuperRarePage(html: string, contract: string): Map<string, Parsed> {
  const out = new Map<string, Parsed>();
  const wanted = contract.toLowerCase();
  const re = /\\"tokenId\\":(\d+),\\"contractAddress\\":\\"([^\\"]+)\\"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    if (match[2].toLowerCase() !== wanted) continue;
    const pos = match.index;
    const next = html.slice(pos + 20).search(/\\"tokenId\\":\d+,\\"contractAddress\\":\\"/);
    const end = next >= 0 ? pos + 20 + next : pos + 2400;
    const after = html.slice(pos, end);
    const before = html.slice(Math.max(0, pos - 1200), pos);
    const owner = readOwner(after.slice(0, 900));
    const earlier = owner.address || owner.name ? owner : readOwner(before.slice(-1000));
    const prev = out.get(match[1]);
    out.set(match[1], {
      price: readPrice(after) || prev?.price || null,
      owner: earlier.name || prev?.owner || null,
      address: earlier.address || prev?.address || null,
    });
  }
  return out;
}

async function fetchArtworkHtml(contract: string, tokenId: string): Promise<string | null> {
  const res = await fetch(`https://superrare.com/artwork/eth/${contract}/${tokenId}`, {
    headers: { "user-agent": UA, accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  return res.text();
}

async function ensName(address: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string };
    return displayName(json.name);
  } catch {
    return null;
  }
}

/**
 * Prices and collector names. A few artwork pages cover the series, so this
 * does not download one full page per token.
 */
export async function fetchSuperRareMarket(
  contract: string,
  tokenIds: string[],
): Promise<Map<string, SuperRareCard>> {
  const need = new Set(tokenIds);
  const found = new Map<string, Parsed>();
  const seen = new Set<string>();

  for (let round = 0; round < 8 && need.size; round += 1) {
    const missing = [...need].sort((a, b) => Number(b) - Number(a));
    const picks = [missing[0], missing[Math.floor(missing.length / 2)], missing[missing.length - 1]];
    const batch: string[] = [];
    for (const id of picks) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      batch.push(id);
    }
    if (!batch.length) break;
    const pages = await mapPool(batch, 4, async (id) => {
      try {
        return await fetchArtworkHtml(contract, id);
      } catch {
        return null;
      }
    });
    pages.forEach((html, index) => {
      const requested = batch[index];
      if (!html) {
        seen.delete(requested);
        return;
      }
      const parsed = parseSuperRarePage(html, contract);
      if (!parsed.has(requested)) seen.delete(requested);
      for (const [id, card] of parsed) {
        if (!tokenIds.includes(id)) continue;
        const prev = found.get(id);
        found.set(id, {
          price: card.price || prev?.price || null,
          owner: card.owner || prev?.owner || null,
          address: card.address || prev?.address || null,
        });
        need.delete(id);
      }
    });
  }

  if (need.size) {
    const rest = [...need];
    const pages = await mapPool(rest, 4, async (id) => {
      try {
        return await fetchArtworkHtml(contract, id);
      } catch {
        return null;
      }
    });
    for (const html of pages) {
      if (!html) continue;
      for (const [id, card] of parseSuperRarePage(html, contract)) {
        if (!tokenIds.includes(id)) continue;
        const prev = found.get(id);
        found.set(id, {
          price: card.price || prev?.price || null,
          owner: card.owner || prev?.owner || null,
          address: card.address || prev?.address || null,
        });
      }
    }
  }

  const unnamed = [...found.entries()].filter(([, card]) => !card.price && !card.owner && card.address);
  await mapPool(unnamed, 6, async ([id, card]) => {
    const name = card.address ? await ensName(card.address) : null;
    if (name) found.set(id, { ...card, owner: name });
  });

  const market = new Map<string, SuperRareCard>();
  for (const [id, card] of found) {
    market.set(id, { price: card.price, owner: card.price ? null : card.owner });
  }
  return market;
}
