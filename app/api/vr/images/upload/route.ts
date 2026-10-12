import { presignUrl } from "@vercel/blob";
import { imageJson, imageStorageMode, lockedResponse, prepareBlobUpload } from "@/lib/vr/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The booth lists files by prefix, so it does not use the Blob upload webhook.
// A signed PUT URL is enough, and it works with the store's read-write token.
export async function POST(request: Request) {
  if (imageStorageMode() !== "blob") return imageJson({ error: "Use the image uploader." }, 409);
  const denied = await lockedResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { pathname?: string } | null;
  const pathname = body?.pathname;
  if (!pathname) return imageJson({ error: "Upload did not start." }, 400);

  try {
    const { token, urlOptions } = await prepareBlobUpload(pathname);
    const { presignedUrl } = await presignUrl(token, {
      access: "private",
      operation: "put",
      pathname,
      ...urlOptions,
    });
    return imageJson({ url: presignedUrl });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Upload did not start.";
    const status = message === "The booth is locked." ? 401 : 400;
    return imageJson({ error: message }, status);
  }
}
