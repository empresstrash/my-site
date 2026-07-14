import { NextResponse } from 'next/server';
import type { ArcadeGame } from '../../arcade/types';

const ARTIST = '0x8469b7b08d30c63fea3a248a198de9d634b63d70';
const COLLECTION = '0xad3d1283eda06d5c8e130e6f7c3e17c57dadbb4d';
const INDEXER = 'https://indexer.networked.art/';
const MINT_BASE = 'https://mint.networked.art';

function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  if (url.startsWith('ar://')) {
    return `https://arweave.net/${url.slice(5)}`;
  }
  return url;
}

function isPlayable(animationUrl: string | null | undefined): boolean {
  if (!animationUrl) return false;
  return (
    animationUrl.startsWith('data:text/html') ||
    animationUrl.includes('text/html') ||
    animationUrl.endsWith('.html')
  );
}

export async function GET() {
  try {
    const res = await fetch(INDEXER, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `query($collection: String!) {
          artifacts(
            where: { collection: $collection }
            orderBy: "id"
            orderDirection: "asc"
            limit: 200
          ) {
            items {
              id
              name
              description
              image
              animation_url
              created_block
            }
          }
        }`,
        variables: { collection: COLLECTION },
      }),
      // Fresh enough for a gallery; CDN-friendly
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Indexer error ${res.status}`, games: [] },
        { status: 502 }
      );
    }

    const json = await res.json();
    const items = json?.data?.artifacts?.items ?? [];

    const games: ArcadeGame[] = items
      .filter((item: { animation_url?: string }) => isPlayable(item.animation_url))
      .map(
        (item: {
          id: string;
          name?: string;
          description?: string;
          image?: string;
          animation_url?: string;
          created_block?: string | number;
        }) => ({
          id: String(item.id),
          name: item.name || `artifact #${item.id}`,
          description: item.description || '',
          image: resolveMediaUrl(item.image),
          animationUrl: item.animation_url || '',
          createdBlock: item.created_block != null ? String(item.created_block) : null,
          listingUrl: `${MINT_BASE}/${ARTIST}/${COLLECTION}/${item.id}`,
          openSeaUrl: `https://opensea.io/assets/ethereum/${COLLECTION}/${item.id}`,
          collection: COLLECTION,
          artist: ARTIST,
        })
      );

    return NextResponse.json({
      artist: ARTIST,
      collection: COLLECTION,
      source: 'networked.art indexer',
      count: games.length,
      games,
    });
  } catch (err) {
    console.error('arcade api', err);
    return NextResponse.json(
      { error: 'Failed to load arcade catalog', games: [] },
      { status: 500 }
    );
  }
}
