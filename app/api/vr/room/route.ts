import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";

const SCENE_POINTER = "126,104";
const REALM = "main";

type SignedFetch = (
  url: string,
  init: {
    method: string;
    identity: unknown;
    metadata: Record<string, string>;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<Response>;

function pickSignedFetch(moduleValue: unknown): SignedFetch {
  if (typeof moduleValue === "function") return moduleValue as SignedFetch;
  if (moduleValue && typeof moduleValue === "object" && "default" in moduleValue) {
    const inner = (moduleValue as { default: unknown }).default;
    if (typeof inner === "function") return inner as SignedFetch;
    if (inner && typeof inner === "object" && "default" in inner && typeof inner.default === "function") {
      return inner.default as SignedFetch;
    }
  }
  throw new Error("Signed fetch did not load");
}

export async function GET() {
  const jar = await cookies();
  if (!cookieIsValid(jar.get(VR_COOKIE)?.value)) {
    return Response.json({ error: "locked" }, { status: 401 });
  }

  const [{ Wallet }, { Authenticator }] = await Promise.all([import("ethers"), import("@dcl/crypto")]);
  const signedFetch = pickSignedFetch(await import("decentraland-crypto-fetch"));

  const sceneResponse = await fetch(
    `https://peer.decentraland.org/content/entities/scene?pointer=${SCENE_POINTER}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!sceneResponse.ok) return Response.json({ error: "scene" }, { status: 502 });
  const scenes: { id?: string }[] = await sceneResponse.json();
  const sceneId = scenes[0]?.id;
  if (!sceneId) return Response.json({ error: "scene" }, { status: 502 });

  const owner = Wallet.createRandom();
  const ephemeral = Wallet.createRandom();
  const identity = await Authenticator.initializeAuthChain(
    owner.address,
    {
      address: ephemeral.address,
      privateKey: ephemeral.privateKey,
      publicKey: ephemeral.signingKey.publicKey,
    },
    30,
    (message: string) => owner.signMessage(message),
  );

  const response = await signedFetch("https://comms-gatekeeper.decentraland.org/get-scene-adapter", {
    method: "POST",
    identity,
    metadata: {
      signer: "decentraland-kernel-scene",
      sceneId,
      parcel: SCENE_POINTER,
      realmName: REALM,
    },
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok) return Response.json({ error: "room" }, { status: 502 });
  const body = (await response.json()) as { adapter?: string };
  const adapter = body.adapter ?? "";
  if (!adapter.startsWith("livekit:")) return Response.json({ error: "room" }, { status: 502 });
  const url = new URL(adapter.slice("livekit:".length));
  const token = url.searchParams.get("access_token");
  url.searchParams.delete("access_token");
  if (!token) return Response.json({ error: "room" }, { status: 502 });
  return Response.json({ serverUrl: url.toString(), token });
}
