import { NextRequest, NextResponse } from "next/server";
import { fetchTokenInfo, ipfsToHttp } from "@/lib/objkt/client";
import { parseTokenInput } from "@/lib/tezos/parse";

export const dynamic = "force-dynamic";

/**
 * GET /api/objkt/token?url=…  or  ?fa=…&tokenId=…
 * Resolves an objkt URL / FA2 ref to token metadata.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const url = sp.get("url") ?? "";
    const faParam = sp.get("fa");
    const tokenIdParam = sp.get("tokenId");

    let fa: string;
    let tokenId: string;

    if (faParam && tokenIdParam) {
      fa = faParam;
      tokenId = tokenIdParam;
    } else {
      const parsed = parseTokenInput(url || `${faParam ?? ""}:${tokenIdParam ?? ""}`);
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              "Provide a valid objkt token URL or fa + tokenId (e.g. hicetnunc/734839)",
          },
          { status: 400 },
        );
      }
      fa = parsed.fa;
      tokenId = parsed.tokenId;
    }

    const token = await fetchTokenInfo(fa, tokenId);
    if (!token) {
      return NextResponse.json({ error: "Token not found on objkt" }, { status: 404 });
    }

    return NextResponse.json({
      token: {
        ...token,
        image: ipfsToHttp(token.displayUri || token.thumbnailUri),
      },
    });
  } catch (err) {
    console.error("[api/objkt/token]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve token" },
      { status: 500 },
    );
  }
}
