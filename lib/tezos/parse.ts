/** Known objkt path aliases → FA2 contract addresses */
export const COLLECTION_PATHS: Record<string, string> = {
  hicetnunc: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
  hen: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
  teia: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
};

const TZ_ADDR = /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/;
const KT1_ADDR = /^KT1[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isTezosAddress(s: string): boolean {
  return TZ_ADDR.test(s.trim());
}

export function isContractAddress(s: string): boolean {
  return KT1_ADDR.test(s.trim());
}

export function isImplicitAddress(s: string): boolean {
  return /^(tz1|tz2|tz3)[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 1) return addr ?? "";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export interface ParsedTokenRef {
  /** FA2 contract or objkt collection path (e.g. hicetnunc) */
  fa: string;
  tokenId: string;
}

/**
 * Parse marketplace / explorer token links or `KT1…:tokenId` shorthand.
 *
 * Supported:
 *  - objkt.com/tokens|asset/{path|KT1}/{tokenId}
 *  - teia.art/objkt/{tokenId}  (HEN / shared FA2)
 *  - hicetnunc.xyz/objkt/{tokenId}
 *  - fxhash.xyz/gentk/{id} or ?id=
 *  - tzkt.io/{KT1}/tokens/{tokenId}  (+ api.tzkt.io)
 *  - better-call.dev/mainnet/{KT1}/… tokens/{id}
 *  - KT1…:tokenId  or  KT1… tokenId
 *
 * Under the hood everything resolves to FA2 (contract + token id). Any Tezos
 * marketplace is fine once we have that pair — the chain transfer is the same.
 */
export function parseTokenInput(input: string): ParsedTokenRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // objkt.com/tokens/{fa|path}/{tokenId} or legacy /asset/
  const objktMatch = trimmed.match(
    /objkt\.com\/(?:tokens|asset)\/([^/?#\s]+)\/(\d+)/i,
  );
  if (objktMatch) {
    return resolveFa(objktMatch[1], objktMatch[2]);
  }

  // teia / legacy HEN: /objkt/{tokenId} on shared HEN FA2
  const teiaMatch = trimmed.match(
    /(?:teia\.art|hicetnunc\.xyz|hicetnunc\.art)\/objkt\/(\d+)/i,
  );
  if (teiaMatch) {
    return { fa: COLLECTION_PATHS.hicetnunc, tokenId: teiaMatch[1]! };
  }

  // fxhash gentk (numeric id)
  const fxhashMatch =
    trimmed.match(/fxhash\.xyz\/gentk\/(\d+)/i) ||
    trimmed.match(/fxhash\.xyz\/gentk\/?\?[^#]*\bid=(\d+)/i);
  if (fxhashMatch) {
    // Resolve via objkt by path if needed — most fxhash works index as fa path
    // "fxhash" or contract; try path "fxhash" first via API (fa path lookup).
    return { fa: "fxhash", tokenId: fxhashMatch[1]! };
  }

  // TzKT explorer: …tzkt.io/KT1…/tokens/123 or /tokens/balances?…
  const tzktMatch = trimmed.match(
    /(?:api\.)?tzkt\.io\/(?:v1\/)?(?:mainnet\/)?(KT1[1-9A-HJ-NP-Za-km-z]{33})\/tokens\/(\d+)/i,
  );
  if (tzktMatch) {
    return { fa: tzktMatch[1]!, tokenId: tzktMatch[2]! };
  }

  // better-call.dev/mainnet/KT1…/…
  const bcdMatch = trimmed.match(
    /better-call\.dev\/(?:mainnet|ghostnet)\/(KT1[1-9A-HJ-NP-Za-km-z]{33}).*?\/tokens?\/(\d+)/i,
  );
  if (bcdMatch) {
    return { fa: bcdMatch[1]!, tokenId: bcdMatch[2]! };
  }

  // bare KT1 in URL anywhere + last /digits as token id
  const genericKt = trimmed.match(
    /(KT1[1-9A-HJ-NP-Za-km-z]{33})[^\d]*?\/(\d+)(?:[/?#]|$)/,
  );
  if (genericKt && /https?:\/\//i.test(trimmed)) {
    return { fa: genericKt[1]!, tokenId: genericKt[2]! };
  }

  // KT1…:id or path:id or KT1… id
  const colonMatch = trimmed.match(
    /^(KT1[1-9A-HJ-NP-Za-km-z]{33}|[a-zA-Z0-9_-]+)[:\s]+(\d+)$/,
  );
  if (colonMatch) {
    return resolveFa(colonMatch[1], colonMatch[2]);
  }

  return null;
}

function resolveFa(faOrPath: string, tokenId: string): ParsedTokenRef {
  const key = faOrPath.toLowerCase();
  if (COLLECTION_PATHS[key]) {
    return { fa: COLLECTION_PATHS[key], tokenId };
  }
  return { fa: faOrPath, tokenId };
}

/** Addresses that should never receive airdrops (burns, dead dumps). */
export const EXCLUDED_HOLDERS = new Set([
  "tz1burnburnburnburnburnburnburjAYjjX",
  "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU",
]);

export function shouldIncludeHolder(
  address: string,
  opts: { excludeContracts?: boolean; excludeBurns?: boolean } = {},
): boolean {
  const { excludeContracts = true, excludeBurns = true } = opts;
  if (excludeBurns && EXCLUDED_HOLDERS.has(address)) return false;
  if (excludeContracts && isContractAddress(address)) return false;
  return isTezosAddress(address);
}

export interface CsvRecipient {
  address: string;
  amount: number;
}

/** Parse CSV or line list: `address` or `address,amount` */
export function parseRecipientsCsv(text: string): {
  recipients: CsvRecipient[];
  errors: string[];
} {
  const recipients: CsvRecipient[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // skip header
    if (i === 0 && /address|wallet|recipient/i.test(line) && !isTezosAddress(line.split(/[,;\t]/)[0] ?? "")) {
      continue;
    }

    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    const address = parts[0] ?? "";
    const amountRaw = parts[1];

    if (!isTezosAddress(address)) {
      errors.push(`Line ${i + 1}: invalid address "${address.slice(0, 40)}"`);
      continue;
    }

    let amount = 1;
    if (amountRaw !== undefined && amountRaw !== "") {
      amount = Number(amountRaw);
      if (!Number.isFinite(amount) || amount < 1 || !Number.isInteger(amount)) {
        errors.push(`Line ${i + 1}: invalid amount "${amountRaw}"`);
        continue;
      }
    }

    const prev = seen.get(address);
    if (prev !== undefined) {
      // merge duplicate rows by summing amounts
      const idx = recipients.findIndex((r) => r.address === address);
      if (idx >= 0) recipients[idx]!.amount += amount;
      seen.set(address, (prev ?? 0) + amount);
    } else {
      seen.set(address, amount);
      recipients.push({ address, amount });
    }
  }

  return { recipients, errors };
}
