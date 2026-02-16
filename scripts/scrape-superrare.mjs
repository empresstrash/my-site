import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PROFILE_URL = 'https://superrare.com/empresstrash';
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'superrare-nfts.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectArtworkUrls(page) {
  const apiArtworkUrls = new Set();
  const artworkMetadata = new Map();

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('graphql') && !url.includes('api')) return;

    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('application/json')) return;

    try {
      const data = await response.json();
      const candidates = collectArtworkUrlsFromResponse(data);
      if (candidates.length > 0) {
        console.log(`Captured ${candidates.length} artwork URLs from ${url}`);
      }
      candidates.forEach((candidate) => apiArtworkUrls.add(candidate));
      
      // Store metadata for later retrieval
      extractMetadataFromResponse(data, artworkMetadata);
    } catch {
      // ignore JSON parse errors
    }
  });

  await page.goto(PROFILE_URL, { waitUntil: 'networkidle' });

  const creationsSelectors = [
    'text=CREATIONS',
    'text=Creations',
    '[role="tab"]:has-text("Creations")',
  ];

  for (const selector of creationsSelectors) {
    const tab = page.locator(selector).first();
    if ((await tab.count()) > 0) {
      await tab.click({ timeout: 2000 }).catch(() => null);
      await delay(800);
      break;
    }
  }

  const filterLabels = [
    '1 of 1s',
    'Fusion',
    'EMPRESS TRASH GIGA RARES',
    'VintageGlitch',
    'Stills',
  ];

  for (const label of filterLabels) {
    const filterTab = page.locator(`button:has-text("${label}")`).first();
    if ((await filterTab.count()) > 0) {
      await filterTab.click({ timeout: 2000 }).catch(() => null);
      await delay(1000);
    }

    await scrollAndCollect(page);
  }

  const hrefs = await page.$$eval('a[href^="/artwork/eth/"]', (anchors) =>
    Array.from(new Set(anchors.map((a) => a.getAttribute('href')).filter(Boolean)))
  );

  const combined = new Set([
    ...hrefs.map((href) => `https://superrare.com${href}`),
    ...apiArtworkUrls,
  ]);

  return { urls: Array.from(combined), metadata: artworkMetadata };
}

async function scrollAndCollect(page) {
  let lastCount = 0;
  let stableRounds = 0;

  for (let i = 0; i < 200; i += 1) {
    const urls = await page.$$eval('a[href^="/artwork/eth/"]', (anchors) =>
      Array.from(new Set(anchors.map((a) => a.getAttribute('href')).filter(Boolean)))
    );

    if (urls.length === lastCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      lastCount = urls.length;
    }

    if (stableRounds >= 3) {
      const loadMore = page.locator('button:has-text("Load more"), button:has-text("Show more")').first();
      if ((await loadMore.count()) > 0) {
        await loadMore.click({ timeout: 2000 }).catch(() => null);
        stableRounds = 0;
        await delay(1500);
      } else {
        break;
      }
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1800);
  }
}

function collectArtworkUrlsFromResponse(data) {
  const urls = new Set();

  const stack = [data];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item));
      continue;
    }

    const contractAddress = current.contractAddress || current.contract_address;
    const tokenId = current.tokenId || current.token_id;

    if (contractAddress && tokenId) {
      urls.add(`https://superrare.com/artwork/eth/${contractAddress}/${tokenId}`);
    }

    Object.values(current).forEach((value) => stack.push(value));
  }

  return Array.from(urls);
}

function extractMetadataFromResponse(data, metadataMap) {
  const stack = [data];
  
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item));
      continue;
    }

    // Look for artwork objects with contractAddress, tokenId, and assetUrl/assetHash
    const contractAddress = current.contractAddress || current.contract_address;
    const tokenId = current.tokenId || current.token_id;
    const title = current.title || current.name || '';
    const description = current.description || current.descriptionMarkdown || '';
    const assetUrl = current.assetUrl || current.asset_url || current.asset || '';
    const assetHash = current.assetHash || current.asset_hash || current.ipfsHash || current.ipfs_hash || '';

    if (contractAddress && tokenId && (assetUrl || assetHash)) {
      const key = `${contractAddress}/${tokenId}`;
      if (!metadataMap.has(key)) {
        metadataMap.set(key, {
          title,
          description,
          assetUrl,
          assetHash,
        });
      }
    }

    Object.values(current).forEach((value) => stack.push(value));
  }
}

async function extractArtworkData(page, url, metadata) {
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for media to load
  try {
    await page.waitForSelector('video, img[src*="superrare"], img[src*="imgix"], img[src*="ipfs"]', { 
      timeout: 5000 
    }).catch(() => {});
  } catch {}

  const artworkData = await page.evaluate(() => {
    const title = document.querySelector('h1, [class*="Title"], [class*="title"]')?.textContent?.trim() || '';
    const description = document.querySelector('[data-testid="asset-description"], [class*="description"], p')?.textContent?.trim() || '';

    // Extract media URL from video or image
    let mediaUrl = '';
    let mediaType = 'image';

    const video = document.querySelector('video');
    if (video) {
      mediaUrl = video.currentSrc || video.querySelector('source')?.src || video.getAttribute('src') || '';
      mediaType = 'video';
      if (!mediaUrl) {
        const sources = video.querySelectorAll('source');
        for (const source of sources) {
          if (source.src) {
            mediaUrl = source.src;
            break;
          }
        }
      }
    }

    if (!mediaUrl) {
      // Try to find img with media attributes
      const allImgs = document.querySelectorAll('img');
      for (const img of allImgs) {
        const src = img.src || img.getAttribute('src') || '';
        const dataSrc = img.getAttribute('data-src') || '';
        const testUrl = src || dataSrc;
        
        if (testUrl && (testUrl.includes('superrare-artworks') || testUrl.includes('imgix') || testUrl.includes('myfilebase') || testUrl.includes('ipfs'))) {
          mediaUrl = testUrl;
          if (testUrl.includes('.gif')) {
            mediaType = 'gif';
          }
          break;
        }
      }
    }

    return { title, description, mediaUrl, mediaType };
  });

  // Extract IPFS hash from the media URL
  let ipfsHash = '';
  if (artworkData.mediaUrl) {
    // Try different patterns to extract IPFS hash
    const qmMatch = artworkData.mediaUrl.match(/(Qm[a-zA-Z0-9]{44,})/);
    if (qmMatch) {
      ipfsHash = qmMatch[1];
    } else {
      const bafyMatch = artworkData.mediaUrl.match(/(bafy[a-zA-Z0-9]{44,})/);
      if (bafyMatch) {
        ipfsHash = bafyMatch[1];
      }
    }
  }

  // Build media URL using Filebase IPFS gateway if we have a hash
  let finalMediaUrl = artworkData.mediaUrl;
  if (ipfsHash) {
    finalMediaUrl = `https://ipfs.filebase.io/ipfs/${ipfsHash}`;
  }

  return {
    title: artworkData.title || 'Untitled',
    description: artworkData.description || '',
    mediaUrl: finalMediaUrl,
    mediaType: artworkData.mediaType,
    url,
    ipfsHash,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Collecting artwork URLs...');
  const { urls: artworkUrls, metadata } = await collectArtworkUrls(page);
  console.log(`Found ${artworkUrls.length} artworks.`);

  const nfts = [];
  for (let i = 0; i < artworkUrls.length; i += 1) {
    const url = artworkUrls[i];
    console.log(`Fetching ${i + 1}/${artworkUrls.length}: ${url}`);
    const data = await extractArtworkData(page, url, metadata);

    if (!data.mediaUrl) {
      console.warn(`No media URL found for ${url}`);
      continue;
    }

    nfts.push({
      id: nfts.length + 1,
      title: data.title,
      description: data.description,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      url: data.url,
    });
  }

  await browser.close();

  const payload = { nfts };
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Saved ${nfts.length} items to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('Scrape failed:', error);
  process.exit(1);
});
