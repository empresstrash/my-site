import { imageJson, openImage } from "@/lib/vr/image-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; name: string }> };

// The filename is part of the address so the headset sees a normal .png, .jpg, or .gif.
export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    return await openImage(id);
  } catch {
    return imageJson({ error: "That image did not open." }, 502);
  }
}
