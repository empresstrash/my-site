const TWEET_DIV = /<div class="twitter-embed" data-attrs="([^"]*)" data-component-name="Twitter2ToDOM"><\/div>/gi;

const IMAGE_HOSTS = ["pbs.substack.com", "pbs.twimg.com", "substackcdn.com"];

type TweetPhoto = { img_url?: unknown };
type Tweet = {
  url?: unknown;
  full_text?: unknown;
  username?: unknown;
  name?: unknown;
  profile_image_url?: unknown;
  date?: unknown;
  photos?: unknown;
  quoted_tweet?: unknown;
  video_url?: unknown;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plain(value: string): string {
  return escapeHtml(
    value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, "&"),
  );
}

function decodeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function httpsUrl(value: unknown, hosts: string[] | null): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (hosts && !hosts.includes(url.hostname))) return "";
    if (url.hostname === "substackcdn.com" && !url.pathname.startsWith("/image/")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function postUrl(value: unknown): string {
  const url = httpsUrl(value, ["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
  return /\/status\/\d+/.test(url) ? url : "";
}

function richText(input: string): string {
  const parts: string[] = [];
  const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<br\s*\/?>|<\/?[^>]+>/gi;
  let last = 0;
  for (const match of input.matchAll(re)) {
    const index = match.index ?? 0;
    parts.push(plain(input.slice(last, index)));
    if (match[1] !== undefined) {
      const href = httpsUrl(match[1], null);
      const label = plain(match[2].replace(/<[^>]+>/g, ""));
      parts.push(href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label);
    } else if (match[0].startsWith("<br")) {
      parts.push("<br>");
    }
    last = index + match[0].length;
  }
  parts.push(plain(input.slice(last)));
  return parts.join("");
}

function photosOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const photo of value) {
    const url = httpsUrl((photo as TweetPhoto)?.img_url, IMAGE_HOSTS);
    if (url) urls.push(url);
  }
  return urls;
}

function tweetCard(tweet: Tweet, quoted = false): string {
  const name = typeof tweet.name === "string" ? tweet.name.trim().slice(0, 80) : "";
  const username = typeof tweet.username === "string" && /^[A-Za-z0-9_]{1,15}$/.test(tweet.username) ? tweet.username : "";
  const href = postUrl(tweet.url);
  const avatar = httpsUrl(tweet.profile_image_url, IMAGE_HOSTS);
  const text = typeof tweet.full_text === "string" ? richText(tweet.full_text) : "";
  const photos = photosOf(tweet.photos);
  const quote = !quoted && tweet.quoted_tweet && typeof tweet.quoted_tweet === "object" ? (tweet.quoted_tweet as Tweet) : null;
  const quoteHtml = quote && (quote.full_text || quote.username || photosOf(quote.photos).length) ? tweetCard(quote, true) : "";
  const when = typeof tweet.date === "string" && !Number.isNaN(Date.parse(tweet.date))
    ? new Date(tweet.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "";

  const headInner = `
    ${avatar ? `<img src="${escapeHtml(avatar)}" alt="" />` : ""}
    <span>
      ${name ? `<strong class="x-post-name">${plain(name)}</strong>` : ""}
      ${username ? `<span class="x-post-user">@${username}</span>` : ""}
      ${when ? `<span class="x-post-user">${escapeHtml(when)}</span>` : ""}
    </span>`;
  const head = href
    ? `<a class="x-post-head" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${headInner}</a>`
    : `<div class="x-post-head">${headInner}</div>`;

  return `<figure class="x-post${quoted ? " is-quote" : ""}">
    ${head}
    ${text ? `<div class="x-post-text">${text}</div>` : ""}
    ${photos.map((url) => `<img class="x-post-photo" src="${escapeHtml(url)}" alt="" />`).join("")}
    ${quoteHtml}
    ${href && !quoted ? `<a class="x-post-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">view on x</a>` : ""}
  </figure>`;
}

export function renderXPosts(html: string): string {
  return html.replace(TWEET_DIV, (_frame, raw: string) => {
    try {
      return tweetCard(JSON.parse(decodeAttr(raw)) as Tweet);
    } catch {
      return "";
    }
  });
}
