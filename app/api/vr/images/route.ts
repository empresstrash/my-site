import { imageJson, imageStorageMode, listBlobImages, listLocalImages, lockedResponse, saveLocalImage } from "@/lib/vr/image-store";
import { MAX_IMAGE_BYTES } from "@/lib/vr/image-kind";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFF = "Image storage is not connected on this server yet.";

export async function GET() {
  const denied = await lockedResponse();
  if (denied) return denied;
  const mode = imageStorageMode();
  try {
    if (mode === "file") return imageJson({ mode, images: await listLocalImages() });
    if (mode === "blob") return imageJson({ mode, images: await listBlobImages() });
    return imageJson({ mode, images: [] });
  } catch {
    return imageJson({ error: "Images did not load." }, 502);
  }
}

export async function POST(request: Request) {
  const denied = await lockedResponse();
  if (denied) return denied;
  const mode = imageStorageMode();
  if (mode === "off") return imageJson({ error: OFF }, 503);
  if (mode !== "file") return imageJson({ error: "Use the image uploader." }, 409);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return imageJson({ error: "Choose an image." }, 400);
  if (file.size > MAX_IMAGE_BYTES) return imageJson({ error: "That file is over 20 MB." }, 413);
  const saved = await saveLocalImage(file.name, new Uint8Array(await file.arrayBuffer()));
  if ("error" in saved) return imageJson({ error: saved.error }, saved.status);
  return imageJson({ image: saved });
}
