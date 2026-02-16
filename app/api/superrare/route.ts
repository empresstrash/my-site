import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const walletAddress = '0x8469b7b08d30c63fea3a248a198de9d634b63d70';

    // Try fetching from SuperRare's direct API first (simpler, more reliable)
    return await fetchFromSuperRareAPI(walletAddress);
  } catch (error) {
    console.error('Error fetching SuperRare data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SuperRare NFTs', nfts: [] },
      { status: 200 } // Return 200 so client-side doesn't think request failed
    );
  }
}

async function fetchFromSuperRareAPI(walletAddress: string) {
  try {
    console.log('Fetching SuperRare NFTs for:', walletAddress);

    // Fetch from SuperRare's API - their artwork endpoint
    const creatorResponse = await fetch(
      `https://api.superrare.com/v2/creator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress.toLowerCase(),
          limit: 100,
          offset: 0,
        }),
        next: { revalidate: 3600 },
      }
    );

    if (creatorResponse.ok) {
      const data: any = await creatorResponse.json();
      console.log('SuperRare API response:', data);

      if (data.artwork && Array.isArray(data.artwork)) {
        const formattedNFTs = data.artwork
          .filter((token: any) => token.media?.media?.uri || token.image)
          .slice(0, 100)
          .map((token: any) => {
            let imageUrl = token.media?.media?.uri || token.image || '';
            
            // Handle IPFS URLs
            if (imageUrl.startsWith('ipfs://')) {
              imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.slice(7)}`;
            } else if (!imageUrl.startsWith('http')) {
              // Assume it's an IPFS hash
              imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl}`;
            }

            return {
              id: token.id || token.tokenId,
              title: token.title || token.name || `SuperRare #${token.tokenId}`,
              image: imageUrl,
              url: `https://superrare.com/artwork/${token.id || token.tokenId}`,
              tokenId: token.tokenId || token.id,
            };
          });

        if (formattedNFTs.length > 0) {
          console.log(`Found ${formattedNFTs.length} NFTs`);
          return NextResponse.json({ success: true, nfts: formattedNFTs });
        }
      }
    }

    // Fallback: Try The Graph subgraph
    console.log('Trying The Graph subgraph...');
    return await fetchFromGraphSubgraph(walletAddress);
  } catch (error) {
    console.error('SuperRare API error:', error);
    // Fallback to The Graph
    return await fetchFromGraphSubgraph(walletAddress);
  }
}

async function fetchFromGraphSubgraph(walletAddress: string) {
  try {
    const query = `
      {
        nfts(first: 100, where: {owner: "${walletAddress.toLowerCase()}"}) {
          id
          tokenId
          metadata
          uri
        }
      }
    `;

    const response = await fetch(
      'https://api.thegraph.com/subgraphs/name/superrare/superrare-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`Graph API returned ${response.status}`);
    }

    const data: any = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    if (data.data?.nfts && Array.isArray(data.data.nfts)) {
      const formattedNFTs = data.data.nfts
        .filter((token: any) => token.metadata)
        .map((token: any) => {
          let imageUrl = token.metadata;
          if (typeof imageUrl === 'string') {
            if (imageUrl.startsWith('ipfs://')) {
              imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.slice(7)}`;
            } else if (!imageUrl.startsWith('http')) {
              imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl}`;
            }
          }

          return {
            id: token.id,
            title: `SuperRare #${token.tokenId}`,
            image: imageUrl,
            url: `https://superrare.com/artwork/${token.tokenId}`,
            tokenId: token.tokenId,
          };
        });

      console.log(`Graph: Found ${formattedNFTs.length} NFTs`);
      return NextResponse.json({ success: true, nfts: formattedNFTs });
    }

    throw new Error('No NFTs found in subgraph');
  } catch (error) {
    console.error('Graph subgraph error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to fetch from SuperRare or The Graph. Please visit superrare.com/empresstrash',
        nfts: [],
      },
      { status: 200 }
    );
  }
}
