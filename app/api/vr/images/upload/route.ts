import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";
import { imageJson, imageStorageMode, lockedResponse, prepareBlobUpload } from "@/lib/vr/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (imageStorageMode() !== "blob") return imageJson({ error: "Use the image uploader." }, 409);
  const body = (await request.json().catch(() => null)) as HandleUploadPresignedBody | null;
  if (!body || typeof body !== "object" || !("type" in body)) return imageJson({ error: "Upload did not start." }, 400);
  if (body.type === "blob.generate-presigned-url") {
    const denied = await lockedResponse();
    if (denied) return denied;
  }

  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const jar = await cookies();
        if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) throw new Error("The booth is locked.");
        return prepareBlobUpload(pathname);
      },
    });
    return imageJson(result);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Upload did not start.";
    const status = message === "The booth is locked." ? 401 : 400;
    return imageJson({ error: message }, status);
  }
}
