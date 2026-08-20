export const DAMSELS_ETH_CONTRACT =
  "0x6fc0d5077425a22e6033cd905ca973597449455b";
export const DAMSELS_TEZ_CONTRACT = "KT1XFux589Np2umqZgcBpquJe4zB437K3ALC";

export const EMPRESS_ETH = "0x8469b7b08d30c63fea3a248a198de9d634b63d70";
export const EMPRESS_TZ = "tz1YbJAyfmSwqLbLwCrUTfEMeLgCncM9jj3z";

export const OPENSEA_COLLECTION = "https://opensea.io/collection/damsels";
export const OBJKT_COLLECTION = `https://objkt.com/collection/${DAMSELS_TEZ_CONTRACT}`;
export const LEGACY_PAGE = "https://empresstrash.neocities.org/damsels";

export const PARAGRAPH_BIRTH =
  "https://paragraph.com/@empresstrash/the-birth-of-damsels-1";
export const PARAGRAPH_DEUX =
  "https://paragraph.com/@empresstrash/damsels-part-deux";

export function paragraphEmbedPath(url: string, from = "/damsels"): string {
  const params = new URLSearchParams({ paragraph: url, from });
  return `/?${params.toString()}`;
}

export const DAMSELS_TOTAL = 666;

export type DamselChain = "eth" | "tez";
export type DamselStatus = "primary" | "secondary" | "collected";

export type DamselToken = {
  chain?: DamselChain;
  name: string;
  tokenId: string;
  damselNumber: number;
  image: string | null;
  images?: string[];
  url: string | null;
  forSale: boolean;
  primary: boolean;
  status: DamselStatus;
  price?: string;
};

const IPFS_GATEWAYS = [
  "https://ipfs.filebase.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
];

const ARWEAVE_GATEWAYS = [
  "https://arweave.net/",
  "https://g8way.io/",
  "https://ar-io.net/",
];

export function expandMediaUrls(uris: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  for (const raw of uris) {
    if (!raw) continue;
    const value = raw.trim();
    if (!value) continue;

    if (value.startsWith("ipfs://") || value.includes("/ipfs/")) {
      const cid = value.includes("/ipfs/")
        ? value.split("/ipfs/")[1]
        : value.slice("ipfs://".length);
      const path = cid.replace(/^\/+/, "");
      for (const gw of IPFS_GATEWAYS) add(gw + path);
      continue;
    }

    if (
      value.startsWith("ar://") ||
      /https?:\/\/(www\.)?(arweave\.net|g8way\.io|ar-io\.net)\//i.test(value)
    ) {
      const path = value.replace(/^ar:\/\//, "").replace(/^https?:\/\/[^/]+\//, "");
      for (const gw of ARWEAVE_GATEWAYS) add(gw + path);
      continue;
    }

    add(value);
  }

  return out;
}
