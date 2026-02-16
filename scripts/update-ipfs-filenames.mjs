import fs from 'node:fs/promises';
import path from 'node:path';

const INPUT_PATH = path.join(process.cwd(), 'public', 'superrare-nfts.json');

function extractFilenameFromUrl(url) {
  if (!url) return null;

  try {
    // Try to match filename patterns with extensions
    const match = url.match(/\/([^/?#]+\.(mp4|gif|jpg|jpeg|png|webm|mov))(?:\?|$)/i);
    if (match) {
      return match[1];
    }
  } catch {}

  return null;
}

function updateIPFSUrl(url, filename) {
  // If already has filename, return as-is
  if (url.includes('.mp4') || url.includes('.gif') || url.includes('.jpg') || url.includes('.png') || url.includes('.webm') || url.includes('.mov')) {
    return url;
  }

  // If it's a Filebase IPFS URL and we have a filename, append it
  if (url.includes('ipfs.filebase.io/ipfs/') && filename) {
    return `${url}/${filename}`;
  }

  return url;
}

async function main() {
  const data = JSON.parse(await fs.readFile(INPUT_PATH, 'utf-8'));

  let updated = 0;

  // First pass: collect original URLs for reference
  const originalUrls = {};
  
  // For entries that were already processed, we need to look at the original sources
  // The entries that came from pixura proxy URLs had filenames
  const urlsWithFilenames = {
    2: 'hot-moshed-01-15-20-08-04.gif',          // We're All On The Edge
    3: 'oursunisthei-moshed-01-15-19-54-41.gif', // There Sun is Our Sun  
    4: 'ohdespair-moshed-01-11-19-53-20.gif',    // Oh Despair
    5: 'smoke.gif',                               // Smoke 'Em If You Got 'Em
    6: 'portals.gif',                             // Portcullis
    39: 'emp_t_and_more_-moshed-01-28-04-04-41.gif', // Delirium
    40: 'victorian-moshed-01-30-16-46-52.gif',   // Tapped In
    42: 'study-bome.gif',                         // Study BOME
    61: 'empresstrash_ab-moshed-06-26-05-15-00.mp4', // MIdsommar
    62: 'weightoflarge.mp4',                      // Weight Of
  };

  for (const nft of data.nfts) {
    const filename = urlsWithFilenames[nft.id];
    
    if (filename && nft.mediaUrl.includes('ipfs.filebase.io/ipfs/')) {
      const oldUrl = nft.mediaUrl;
      nft.mediaUrl = updateIPFSUrl(oldUrl, filename);
      console.log(`[${nft.id}] ${nft.title}`);
      console.log(`  From: ${oldUrl}`);
      console.log(`  To:   ${nft.mediaUrl}\n`);
      updated++;
    }
  }

  await fs.writeFile(INPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✓ Updated ${updated} IPFS URLs with filenames`);
}

main().catch((error) => {
  console.error('Update failed:', error);
  process.exit(1);
});
