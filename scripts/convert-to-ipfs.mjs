import fs from 'node:fs/promises';
import path from 'node:path';

const INPUT_PATH = path.join(process.cwd(), 'public', 'superrare-nfts.json');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'superrare-nfts.json');

function extractIPFSHash(url) {
  if (!url) return null;

  // Pattern 1: Direct IPFS URLs with myfilebase.com
  const myfilebaseMatch = url.match(/myfilebase\.com\/ipfs\/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{44,})/);
  if (myfilebaseMatch) {
    return myfilebaseMatch[1];
  }

  // Pattern 2: URL-encoded IPFS URLs in pixura proxy
  const decoded = decodeURIComponent(url);
  const encodedMatch = decoded.match(/myfilebase\.com\/ipfs\/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{44,})/);
  if (encodedMatch) {
    return encodedMatch[1];
  }

  // Pattern 3: Try direct hash pattern
  const directMatch = url.match(/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{44,})/);
  if (directMatch) {
    // But exclude superrare-artworks.imgix.net URLs as those are already optimized
    if (url.includes('superrare-artworks.imgix.net')) {
      return null;
    }
    return directMatch[1];
  }

  return null;
}

async function main() {
  const data = JSON.parse(await fs.readFile(INPUT_PATH, 'utf-8'));

  let converted = 0;
  let unchanged = 0;

  for (const nft of data.nfts) {
    const ipfsHash = extractIPFSHash(nft.mediaUrl);
    
    if (ipfsHash) {
      const oldUrl = nft.mediaUrl;
      nft.mediaUrl = `https://ipfs.filebase.io/ipfs/${ipfsHash}`;
      console.log(`[${nft.id}] ${nft.title}`);
      console.log(`  From: ${oldUrl.substring(0, 100)}...`);
      console.log(`  To:   ${nft.mediaUrl}`);
      console.log(`  Hash: ${ipfsHash}\n`);
      converted++;
    } else {
      unchanged++;
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`\nConversion complete!`);
  console.log(`Converted: ${converted}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Total: ${data.nfts.length}`);
}

main().catch((error) => {
  console.error('Conversion failed:', error);
  process.exit(1);
});
