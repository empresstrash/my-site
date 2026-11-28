import { galleries, type GalleryConfig } from "./galleries";
import { fetchEvmContract } from "./sources/evm";
import { fetchObjktContract } from "./sources/objkt";
import type { GalleryPayload, GalleryWork } from "./types";

async function loadWorks(gallery: GalleryConfig): Promise<GalleryWork[]> {
  if (gallery.platform === "objkt") return fetchObjktContract(gallery.contract);
  return fetchEvmContract(gallery.platform, gallery.chain, gallery.contract);
}

export async function loadGalleries(): Promise<GalleryPayload[]> {
  return Promise.all(
    galleries.map(async (gallery) => {
      const base = {
        id: gallery.id,
        title: gallery.title,
        description: gallery.description,
        platform: gallery.platform,
        chain: gallery.chain,
        contract: gallery.contract,
      };
      try {
        const works = await loadWorks(gallery);
        return { ...base, works, error: works.length ? null : "No works with IPFS or Arweave media on this contract." };
      } catch (error) {
        const message = error instanceof Error ? error.message : "This gallery didn’t load.";
        return { ...base, works: [], error: message };
      }
    }),
  );
}
