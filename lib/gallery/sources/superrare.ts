import { mapPool } from "../media";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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

/** Pull the buy-now price for one token out of a SuperRare artwork page. */
export function parseSuperRarePrice(html: string, tokenId: string): string | null {
  const marker = `\\"tokenId\\":${tokenId},\\"contractAddress\\":\\"`;
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const window = html.slice(at, at + 14000);
  const state = window.indexOf(`\\"__typename\\":\\"NftState\\"`);
  if (state < 0) return null;
  const slice = window.slice(state, state + 1800);
  if (slice.includes(`\\"listings\\":[]`)) return null;
  const amount = slice.match(/\\"cryptoAmount\\":\\"(\d+)\\"/);
  if (!amount) return null;
  return formatWeiEth(amount[1]);
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

export async function fetchSuperRarePrices(
  contract: string,
  tokenIds: string[],
): Promise<Map<string, string>> {
  const prices = new Map<string, string>();
  await mapPool(tokenIds, 6, async (tokenId) => {
    try {
      const html = await fetchArtworkHtml(contract, tokenId);
      if (!html) return;
      const price = parseSuperRarePrice(html, tokenId);
      if (price) prices.set(tokenId, price);
    } catch {
      /* a missing page just means we show view, not buy */
    }
  });
  return prices;
}
