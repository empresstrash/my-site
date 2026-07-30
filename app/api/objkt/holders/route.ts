import { NextRequest, NextResponse } from "next/server";
import { fetchTokenWithHolders, ipfsToHttp } from "@/lib/objkt/client";
import {
  parseTokenInput,
  shouldIncludeHolder,
} from "@/lib/tezos/parse";

export const dynamic = "force-dynamic";

/**
 * GET /api/objkt/holders?url=…  or  ?fa=…&tokenId=…
 * Returns current holders of a token (for airdrop recipient lists).
 *
 * Query flags:
 *  - excludeContracts=1 (default) skip KT1 holders (marketplaces, etc.)
 *  - excludeBurns=1 (default) skip burn addresses
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const url = sp.get("url") ?? "";
    const faParam = sp.get("fa");
    const tokenIdParam = sp.get("tokenId");
    const excludeContracts = sp.get("excludeContracts") !== "0";
    const excludeBurns = sp.get("excludeBurns") !== "0";

    let fa: string;
    let tokenId: string;

    if (faParam && tokenIdParam) {
      fa = faParam;
      tokenId = tokenIdParam;
    } else {
      const parsed = parseTokenInput(url);
      if (!parsed) {
        return NextResponse.json(
          { error: "Provide a valid objkt token URL or fa + tokenId" },
          { status: 400 },
        );
      }
      fa = parsed.fa;
      tokenId = parsed.tokenId;
    }

    const result = await fetchTokenWithHolders(fa, tokenId);
    if (!result) {
      return NextResponse.json({ error: "Token not found on objkt" }, { status: 404 });
    }

    const { token, holders: raw } = result;

    const filtered = raw.filter((h) =>
      shouldIncludeHolder(h.address, { excludeContracts, excludeBurns }),
    );

    const skipped = raw.length - filtered.length;
    const totalEditions = filtered.reduce((s, h) => s + h.quantity, 0);

    return NextResponse.json({
      token: {
        ...token,
        image: ipfsToHttp(token.displayUri || token.thumbnailUri),
      },
      holders: filtered,
      stats: {
        uniqueHolders: filtered.length,
        totalEditions,
        skipped,
        rawCount: raw.length,
      },
    });
  } catch (err) {
    console.error("[api/objkt/holders]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch holders" },
      { status: 500 },
    );
  }
}
