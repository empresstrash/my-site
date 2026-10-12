import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { BlobNotFoundError, del, get, issueSignedToken, list, presignUrl } from "@vercel/blob";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";
import {
  BLOB_PREFIX,
  type BoothImage,
  type ImageKind,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  displayName,
  extensionFor,
  isBoothPath,
  kindFromName,
  nameFromPath,
  randomId,
  sniffImage,
} from "@/lib/vr/image-kind";

export type ImageMode = "file" | "blob" | "off";

type StoredImage = BoothImage & { file: string };

type ImageFailure = { error: string; status: number };

const root = path.join(process.cwd(), "data", "vr-images");
const filesDir = path.join(root, "files");
const manifestPath = path.join(root, "manifest.json");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// Vercel functions do not share a disk between your computer and the headset.
// A connected Blob store does. `next dev` keeps the files on this computer.
export function imageStorageMode(): ImageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return "blob";
  if (process.env.VERCEL) return "off";
  return "file";
}

export async function lockedResponse(): Promise<Response | null> {
  const jar = await cookies();
  if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) {
    return Response.json({ error: "The booth is locked." }, { status: 401, headers: { "cache-control": "private, no-store" } });
  }
  return null;
}

export function imageJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function isStored(value: unknown): value is StoredImage {
  if (!value || typeof value !== "object") return false;
  const item = value as StoredImage;
  return (
    typeof item.id === "string" &&
    /^[a-f0-9]{16}$/.test(item.id) &&
    typeof item.name === "string" &&
    (item.contentType === "image/png" || item.contentType === "image/jpeg" || item.contentType === "image/gif") &&
    typeof item.bytes === "number" &&
    typeof item.at === "number" &&
    item.file === `${item.id}.${extensionFor(item.contentType)}`
  );
}

async function readManifest(): Promise<StoredImage[]> {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStored);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeManifest(images: StoredImage[]): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(manifestPath, JSON.stringify(images));
}

function encodePathId(pathname: string): string {
  return Buffer.from(pathname, "utf8").toString("base64url");
}

function decodePathId(id: string): string | null {
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(id)) return null;
  const pathname = Buffer.from(id, "base64url").toString("utf8");
  return isBoothPath(pathname) ? pathname : null;
}

function toPublic(image: StoredImage): BoothImage {
  return { id: image.id, name: image.name, contentType: image.contentType, bytes: image.bytes, at: image.at };
}

export async function listLocalImages(): Promise<BoothImage[]> {
  const images = await readManifest();
  return images.map(toPublic).sort((a, b) => b.at - a.at);
}

export async function saveLocalImage(originalName: string, bytes: Uint8Array): Promise<BoothImage | ImageFailure> {
  if (bytes.byteLength === 0) return { error: "That file is empty.", status: 400 };
  if (bytes.byteLength > MAX_IMAGE_BYTES) return { error: "That file is over 20 MB.", status: 413 };
  const kind = sniffImage(bytes);
  if (!kind) return { error: "Use a png, jpg, or gif.", status: 400 };
  return withLock(async () => {
    const images = await readManifest();
    if (images.length >= MAX_IMAGE_COUNT) return { error: "Remove an image first. This tab holds 40.", status: 409 };
    const id = randomId();
    const file = `${id}.${extensionFor(kind)}`;
    const stored: StoredImage = {
      id,
      name: displayName(originalName, kind),
      contentType: kind,
      bytes: bytes.byteLength,
      at: Date.now(),
      file,
    };
    await mkdir(filesDir, { recursive: true });
    await writeFile(path.join(filesDir, file), Buffer.from(bytes));
    try {
      await writeManifest([stored, ...images]);
    } catch (error) {
      await rm(path.join(filesDir, file), { force: true });
      throw error;
    }
    return toPublic(stored);
  });
}

export async function readLocalImage(id: string): Promise<{ image: StoredImage; bytes: Buffer } | null> {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  const images = await readManifest();
  const image = images.find((item) => item.id === id);
  if (!image) return null;
  try {
    const bytes = await readFile(path.join(filesDir, image.file));
    return { image, bytes };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteLocalImage(id: string): Promise<boolean> {
  if (!/^[a-f0-9]{16}$/.test(id)) return false;
  return withLock(async () => {
    const images = await readManifest();
    const image = images.find((item) => item.id === id);
    if (!image) return false;
    await writeManifest(images.filter((item) => item.id !== id));
    await rm(path.join(filesDir, image.file), { force: true });
    return true;
  });
}

export function fileResponse(bytes: Buffer, kind: ImageKind): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": kind,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}



async function collectBlobImages(): Promise<BoothImage[]> {
  const images: BoothImage[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: BLOB_PREFIX, cursor, limit: 100 });
    for (const blob of page.blobs) {
      if (!isBoothPath(blob.pathname)) continue;
      const kind = kindFromName(blob.pathname);
      if (!kind) continue;
      images.push({
        id: encodePathId(blob.pathname),
        name: nameFromPath(blob.pathname),
        contentType: kind,
        bytes: blob.size,
        at: blob.uploadedAt.getTime(),
      });
    }
    cursor = page.hasMore && page.cursor ? page.cursor : undefined;
  } while (cursor && images.length < 200);
  return images.sort((a, b) => b.at - a.at);
}

export async function listBlobImages(): Promise<BoothImage[]> {
  return (await collectBlobImages()).slice(0, MAX_IMAGE_COUNT);
}

export async function prepareBlobUpload(pathname: string) {
  if (!isBoothPath(pathname)) throw new Error("Use a png, jpg, or gif.");
  const kind = kindFromName(pathname);
  if (!kind) throw new Error("Use a png, jpg, or gif.");
  if ((await collectBlobImages()).length >= MAX_IMAGE_COUNT) {
    throw new Error("Remove an image first. This tab holds 40.");
  }
  const validUntil = Date.now() + 10 * 60 * 1000;
  const token = await issueSignedToken({
    pathname,
    operations: ["put"],
    allowedContentTypes: [kind],
    maximumSizeInBytes: MAX_IMAGE_BYTES,
    validUntil,
  });
  return {
    token,
    urlOptions: {
      allowedContentTypes: [kind],
      maximumSizeInBytes: MAX_IMAGE_BYTES,
      addRandomSuffix: false,
      allowOverwrite: false,
    },
  };
}

export async function openImage(id: string): Promise<Response> {
  const denied = await lockedResponse();
  if (denied) return denied;
  const mode = imageStorageMode();
  if (mode === "file") {
    const found = await readLocalImage(id);
    if (!found) return imageJson({ error: "That image is gone." }, 404);
    return fileResponse(found.bytes, found.image.contentType);
  }
  if (mode !== "blob") return imageJson({ error: "That image is gone." }, 404);
  const pathname = decodePathId(id);
  const kind = pathname ? kindFromName(pathname) : null;
  if (!pathname || !kind) return imageJson({ error: "That image is gone." }, 404);
  let result;
  try {
    result = await get(pathname, { access: "private" });
  } catch (error) {
    if (error instanceof BlobNotFoundError) return imageJson({ error: "That image is gone." }, 404);
    throw error;
  }
  if (!result || result.statusCode !== 200 || !result.stream) return imageJson({ error: "That image is gone." }, 404);
  return new Response(result.stream, {
    headers: {
      "content-type": kind,
      "content-length": String(result.blob.size),
      "cache-control": "private, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function deleteBlobImage(id: string): Promise<boolean> {
  const pathname = decodePathId(id);
  if (!pathname) return false;
  try {
    await del(pathname);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    throw error;
  }
  return true;
}
