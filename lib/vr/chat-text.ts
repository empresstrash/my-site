export type TwitchEmoteSpan = { id: string; start: number; end: number };

export type EmoteImage = { src: string; fallback?: string };

export type ChatPiece =
  | { kind: "text"; text: string }
  | { kind: "emote"; name: string; src: string; fallback?: string }
  | { kind: "image"; src: string; alt: string };

const LEGACY_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const IMAGE_URL = /^https?:\/\/\S+\.(?:gif|png|jpe?g|webp)(?:\?\S*)?$/i;
const MEDIA_HOST = /^https?:\/\/(?:(?:i|media)\.imgur\.com|media\.tenor\.com|cdn\.discordapp\.com|media\.discordapp\.net|i\.redd\.it)\//i;

/** Drop avatar emotes and the old client's control-character chat, keep spoken text. */
export function isSpokenDclChat(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (LEGACY_CONTROL.test(text)) return false;
  if (/^urn:decentraland:/i.test(text)) return false;
  return true;
}

export function mentionsEmpress(text: string): boolean {
  return /@\s*empresstrash\b/i.test(text) || /@\s*empress[\s._-]*trash\b/i.test(text);
}

export function parseTwitchEmoteTag(tag: string): TwitchEmoteSpan[] {
  if (!tag) return [];
  const spans: TwitchEmoteSpan[] = [];
  for (const part of tag.split("/")) {
    const splitAt = part.indexOf(":");
    if (splitAt <= 0) continue;
    const id = part.slice(0, splitAt);
    for (const range of part.slice(splitAt + 1).split(",")) {
      const [startRaw, endRaw] = range.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!id || !Number.isInteger(start) || !Number.isInteger(end) || end < start) continue;
      spans.push({ id, start, end });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  return spans;
}

export function twitchEmoteUrl(id: string, animated: boolean): string {
  const format = animated ? "animated" : "default";
  return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/${format}/dark/2.0`;
}

function isImageUrl(token: string): boolean {
  return IMAGE_URL.test(token) || MEDIA_HOST.test(token);
}

/** Twitch emote offsets count Unicode code points. JS string indexes are UTF-16 units. */
function codePointOffsets(text: string): number[] {
  const bounds = [0];
  let units = 0;
  for (const char of text) {
    units += char.length;
    bounds.push(units);
  }
  return bounds;
}

export function buildChatPieces(
  text: string,
  ranges: TwitchEmoteSpan[],
  extras: ReadonlyMap<string, EmoteImage>,
): ChatPiece[] {
  const pieces: ChatPiece[] = [];
  const bounds = codePointOffsets(text);
  const pointCount = bounds.length - 1;
  let cursor = 0;

  const pushText = (value: string) => {
    if (!value) return;
    const last = pieces[pieces.length - 1];
    if (last?.kind === "text") last.text += value;
    else pieces.push({ kind: "text", text: value });
  };

  const pushToken = (token: string) => {
    const trimmed = token.replace(/[.,!?)]+$/g, "");
    const extra = extras.get(token) ?? (trimmed && trimmed !== token ? extras.get(trimmed) : undefined);
    if (extra) {
      const name = extras.has(token) ? token : trimmed;
      const lead = token.slice(0, token.indexOf(name));
      const trail = token.slice(lead.length + name.length);
      pushText(lead);
      pieces.push({ kind: "emote", name, src: extra.src, fallback: extra.fallback });
      pushText(trail);
      return;
    }
    const image = token.replace(/[),]+$/g, "");
    if (isImageUrl(image)) {
      pushText(token.slice(0, token.indexOf(image)));
      pieces.push({ kind: "image", src: image, alt: "shared image" });
      pushText(token.slice(token.indexOf(image) + image.length));
      return;
    }
    pushText(token);
  };

  const scanGap = (gap: string) => {
    for (const part of gap.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) pushText(part);
      else pushToken(part);
    }
  };

  for (const range of ranges) {
    if (range.start < cursor || range.end >= pointCount) continue;
    scanGap(text.slice(bounds[cursor], bounds[range.start]));
    const name = text.slice(bounds[range.start], bounds[range.end + 1]);
    pieces.push({
      kind: "emote",
      name,
      src: twitchEmoteUrl(range.id, false),
    });
    cursor = range.end + 1;
  }
  scanGap(text.slice(bounds[cursor]));
  return pieces;
}
