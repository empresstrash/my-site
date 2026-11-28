import { objktGraphql } from "@/lib/objkt/client";
import { gatewayUrls, isStoredUri, kindFrom } from "../media";
import { listingUrl } from "./evm";
import type { GalleryWork, WorkKind } from "../types";

type ObjktRow = {
  name: string | null;
  token_id: string;
  mime: string | null;
  artifact_uri: string | null;
  display_uri: string | null;
};

const QUERY = `
query GalleryContract($fa: String!) {
  token(
    where: { fa_contract: { _eq: $fa } }
    order_by: { token_id: desc }
    limit: 500
  ) {
    name
    token_id
    mime
    artifact_uri
    display_uri
  }
}
`;

export async function fetchObjktContract(contract: string): Promise<GalleryWork[]> {
  const data = await objktGraphql<{ token: ObjktRow[] }>(QUERY, { fa: contract });
  const works: GalleryWork[] = [];

  for (const row of data.token ?? []) {
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

    works.push({
      tokenId: row.token_id,
      name: row.name?.trim() || `#${row.token_id}`,
      url: listingUrl("objkt", "ethereum", contract, row.token_id),
      kind: kind as WorkKind,
      urls,
      poster: gatewayUrls(poster),
      width: null,
      height: null,
    });
  }

  return works;
}
