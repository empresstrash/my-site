import { objktGraphql } from "@/lib/objkt/client";
import { gatewayUrls, isStoredUri, kindFrom } from "../media";
import { editionCopy, type GalleryWork, type WorkKind } from "../types";
import { listingUrl } from "./evm";

type Listing = {
  price: number | string | null;
  amount_left: number | null;
  seller_address: string | null;
};

type OpenEdition = {
  price: number | string | null;
  end_time: string | null;
  start_time: string | null;
};

type ObjktRow = {
  name: string | null;
  token_id: string;
  mime: string | null;
  supply: number | null;
  artifact_uri: string | null;
  display_uri: string | null;
  listings_active: Listing[] | null;
  open_edition_active: OpenEdition | OpenEdition[] | null;
};

type ObjktData = {
  fa: Array<{ name: string | null; description: string | null }> | null;
  token: ObjktRow[] | null;
};

const QUERY = `
query GalleryContract($fa: String!) {
  fa(where: { contract: { _eq: $fa } }, limit: 1) {
    name
    description
  }
  token(
    where: { fa_contract: { _eq: $fa } }
    order_by: { token_id: desc }
    limit: 500
  ) {
    name
    token_id
    mime
    supply
    artifact_uri
    display_uri
    listings_active(order_by: { price: asc }, limit: 8) {
      price
      amount_left
      seller_address
    }
    open_edition_active {
      price
      end_time
      start_time
    }
  }
}
`;

export type ObjktGallery = {
  title: string | null;
  description: string | null;
  works: GalleryWork[];
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function stillOpen(edition: OpenEdition | null): boolean {
  if (!edition) return false;
  if (!edition.end_time) return true;
  const end = Date.parse(edition.end_time);
  return Number.isNaN(end) || end > Date.now();
}

function formatTez(mutez: number | string | null | undefined): string | null {
  const n = Number(mutez);
  if (!Number.isFinite(n) || n <= 0) return null;
  const tez = n / 1_000_000;
  const text = tez >= 100 ? String(Math.round(tez)) : tez.toFixed(2).replace(/\.?0+$/, "");
  return `${text} TEZ`;
}

function ask(row: ObjktRow): string | null {
  const pool = (row.listings_active ?? []).filter((listing) => Number(listing.price) > 0);
  let cheapest: number | null = null;
  for (const listing of pool) {
    const price = Number(listing.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (cheapest == null || price < cheapest) cheapest = price;
  }
  return formatTez(cheapest);
}

function prose(value: string | null | undefined): string | null {
  const text = (value || "").replace(/\s+/g, " ").trim();
  return text || null;
}

export async function fetchObjktContract(contract: string): Promise<ObjktGallery> {
  const data = await objktGraphql<ObjktData>(QUERY, { fa: contract });
  const collection = data.fa?.[0];
  const rows = [...(data.token ?? [])].sort((a, b) => Number(b.token_id) - Number(a.token_id));
  const works: GalleryWork[] = [];

  for (const row of rows) {
    const mime = row.mime || "";
    const artifact = row.artifact_uri || "";
    const display = row.display_uri || "";
    const artifactKind = artifact ? kindFrom(mime, artifact) : null;
    let uri = "";
    let poster: string | null = null;

    if (artifact && isStoredUri(artifact) && artifactKind !== "html") {
      uri = artifact;
      if (display && isStoredUri(display) && display !== artifact) poster = display;
    } else if (display && isStoredUri(display) && kindFrom("", display) !== "html") {
      uri = display;
    }
    if (!uri) continue;
    const kind = kindFrom(uri === artifact ? mime : "", uri);
    if (kind === "html") continue;
    const urls = gatewayUrls(uri);
    if (!urls.length) continue;

    const mint = one(row.open_edition_active);
    const minting = stillOpen(mint);
    const mintPrice = minting ? formatTez(mint?.price) : null;
    const listing = ask(row);
    const supply = row.supply ?? 0;
    if (!minting && supply < 1) continue;

    works.push({
      tokenId: row.token_id,
      name: row.name?.trim() || `#${row.token_id}`,
      url: listingUrl("objkt", "ethereum", contract, row.token_id),
      kind: kind as WorkKind,
      urls,
      poster: gatewayUrls(poster),
      width: null,
      height: null,
      forSale: Boolean(mintPrice || listing),
      price: mintPrice || listing,
      edition: editionCopy(supply, minting),
      minting,
    });
  }

  return {
    title: prose(collection?.name),
    description: prose(collection?.description),
    works,
  };
}
