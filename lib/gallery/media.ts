import { expandMediaUrls } from "@/lib/damsels/constants";
import type { WorkKind } from "./types";

const IPFS_GATEWAYS = [
  "https://ipfs.filebase.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
];

export function isStoredUri(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("ipfs://") || v.startsWith("ar://")) return true;
  if (/\/ipfs\//i.test(v)) return true;
  return /https?:\/\/(www\.)?(arweave\.net|g8way\.io|ar-io\.net)\//i.test(v);
}

export function kindFrom(mime: string | null | undefined, uri: string): WorkKind | "html" {
  const m = (mime || "").toLowerCase();
  const path = uri.toLowerCase().split("?")[0];
  if (m.startsWith("video") || /\.(mp4|webm|mov)$/.test(path)) return "video";
  if (m === "image/gif" || path.endsWith(".gif")) return "gif";
  if (m.includes("html") || path.endsWith(".html") || path.endsWith(".htm")) return "html";
  return "image";
}

export function parseDimensions(value: unknown): { width: number; height: number } | null {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height };
}

export function gatewayUrls(uri: string | null | undefined): string[] {
  if (!uri || !isStoredUri(uri)) return [];
  return expandMediaUrls([uri]).slice(0, 4);
}

type TokenMeta = {
  name?: string;
  image?: string;
  animation_url?: string;
  media?: { uri?: string; mimeType?: string; dimensions?: string };
};

export function pickFromMetadata(meta: TokenMeta): {
  name: string | null;
  uri: string;
  mime: string;
  poster: string | null;
  width: number | null;
  height: number | null;
} | null {
  const mediaUri = typeof meta.media?.uri === "string" ? meta.media.uri : "";
  const mime = meta.media?.mimeType || "";
  const image = typeof meta.image === "string" ? meta.image : "";
  const animation = typeof meta.animation_url === "string" ? meta.animation_url : "";
  const dims = parseDimensions(meta.media?.dimensions);
  const mediaKind = mediaUri ? kindFrom(mime, mediaUri) : null;

  let uri = "";
  let useMime = mime;
  let poster: string | null = null;

  if (mediaUri && isStoredUri(mediaUri) && mediaKind !== "html") {
    uri = mediaUri;
    if (image && isStoredUri(image) && image !== mediaUri) poster = image;
  } else if (animation && isStoredUri(animation) && kindFrom("", animation) !== "html") {
    uri = animation;
    useMime = "";
    if (image && isStoredUri(image)) poster = image;
  } else if (image && isStoredUri(image)) {
    uri = image;
    useMime = "";
  }

  if (!uri) return null;
  return {
    name: meta.name?.trim() || null,
    uri,
    mime: useMime,
    poster,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
  };
}

function ipfsPath(uri: string): string | null {
  const value = uri.trim();
  if (value.startsWith("ipfs://")) return value.slice("ipfs://".length).replace(/^\/+/, "");
  const marker = "/ipfs/";
  const at = value.indexOf(marker);
  if (at >= 0) return value.slice(at + marker.length).replace(/^\/+/, "");
  return null;
}

export async function fetchIpfsJson(uri: string): Promise<TokenMeta | null> {
  const path = ipfsPath(uri);
  if (!path) return null;
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const res = await fetch(gateway + path, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as TokenMeta;
      if (json && typeof json === "object") return json;
    } catch {
      /* try the next gateway */
    }
  }
  return null;
}

export async function mapPool<T, R>(
  items: T[],
  size: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}
