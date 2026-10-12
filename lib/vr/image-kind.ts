export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 40;
export const BLOB_PREFIX = "vr-booth/";

export type ImageKind = "image/png" | "image/jpeg" | "image/gif";

export type BoothImage = {
  id: string;
  name: string;
  contentType: ImageKind;
  bytes: number;
  at: number;
};

export function kindFromName(name: string): ImageKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

export function imageFileUrl(image: Pick<BoothImage, "id" | "name">, attempt = 0): string {
  const name = `${attempt > 0 ? `again-${attempt}-` : ""}${encodeURIComponent(image.name)}`;
  return `/api/vr/images/${image.id}/${name}`;
}

export function extensionFor(kind: ImageKind): "png" | "jpg" | "gif" {
  if (kind === "image/png") return "png";
  if (kind === "image/gif") return "gif";
  return "jpg";
}

export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6) {
    let head = "";
    for (let index = 0; index < 6; index += 1) head += String.fromCharCode(bytes[index]);
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  return null;
}

export function kindOfFile(name: string, type: string): ImageKind | null {
  const claimed = type === "image/jpg" ? "image/jpeg" : type;
  const fromName = kindFromName(name);
  if (claimed === "image/png" || claimed === "image/jpeg" || claimed === "image/gif") {
    if (fromName && fromName !== claimed) return null;
    return claimed;
  }
  return fromName;
}

export function safeFileName(name: string): string | null {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+/, "").replace(/^\.+/, "").slice(0, 80);
  if (!cleaned || !/^[A-Za-z0-9]/.test(cleaned) || !kindFromName(cleaned)) return null;
  return cleaned;
}

export function fallbackName(kind: ImageKind): string {
  return `image.${extensionFor(kind)}`;
}

export function displayName(original: string, kind: ImageKind): string {
  const safe = safeFileName(original);
  if (safe && kindFromName(safe) === kind) return safe;
  const stem = (safe ?? "image").replace(/\.[^.]+$/, "").replace(/^_+/, "") || "image";
  return `${stem}.${extensionFor(kind)}`;
}

export function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isBoothPath(pathname: string): boolean {
  if (pathname.includes("..") || pathname.includes("\\") || pathname.includes("//")) return false;
  const match = /^vr-booth\/([a-f0-9]{16})-([A-Za-z0-9][A-Za-z0-9._-]{0,120})$/.exec(pathname);
  if (!match) return false;
  return kindFromName(match[2]) !== null;
}

export function nameFromPath(pathname: string): string {
  const base = pathname.slice(BLOB_PREFIX.length);
  const name = base.slice(base.indexOf("-") + 1);
  return name || "image";
}
