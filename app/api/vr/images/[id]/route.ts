import {
  deleteBlobImage,
  deleteLocalImage,
  fileResponse,
  imageJson,
  imageStorageMode,
  lockedResponse,
  readLocalImage,
  redirectBlob,
} from "@/lib/vr/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function wantsDownload(request: Request): boolean {
  return new URL(request.url).searchParams.get("download") === "1";
}

export async function GET(request: Request, context: Context) {
  const denied = await lockedResponse();
  if (denied) return denied;
  const { id } = await context.params;
  const mode = imageStorageMode();
  if (mode === "file") {
    const found = await readLocalImage(id);
    if (!found) return imageJson({ error: "That image is gone." }, 404);
    return fileResponse(found.bytes, found.image.contentType, found.image.name, wantsDownload(request));
  }
  if (mode === "blob") {
    try {
      return await redirectBlob(id, wantsDownload(request));
    } catch {
      return imageJson({ error: "That image did not open." }, 502);
    }
  }
  return imageJson({ error: "That image is gone." }, 404);
}

export async function DELETE(_request: Request, context: Context) {
  const denied = await lockedResponse();
  if (denied) return denied;
  const { id } = await context.params;
  const mode = imageStorageMode();
  try {
    const removed = mode === "blob" ? await deleteBlobImage(id) : mode === "file" ? await deleteLocalImage(id) : false;
    if (!removed) return imageJson({ error: "That image is gone." }, 404);
    return imageJson({ ok: true });
  } catch {
    return imageJson({ error: "That image did not get removed." }, 502);
  }
}
