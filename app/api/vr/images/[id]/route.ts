import { deleteBlobImage, deleteLocalImage, imageJson, imageStorageMode, lockedResponse, openImage } from "@/lib/vr/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    return await openImage(id);
  } catch {
    return imageJson({ error: "That image did not open." }, 502);
  }
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
