import type { EmoteImage } from "@/lib/vr/chat-text";

const CHANNEL = "empresstrash";

function bttv(id: string): EmoteImage {
  return { src: `https://cdn.betterttv.net/emote/${id}/2x` };
}

function seventv(id: string, animated: boolean): EmoteImage {
  // Animated emotes publish 2x_static.png. Static emotes publish 2x.png. The other path 404s.
  const file = animated ? "2x_static.png" : "2x.png";
  const other = animated ? "2x.png" : "2x_static.png";
  return {
    src: `https://cdn.7tv.app/emote/${id}/${file}`,
    fallback: `https://cdn.7tv.app/emote/${id}/${other}`,
  };
}

function addCode(map: Map<string, EmoteImage>, code: string, image: EmoteImage) {
  if (code) map.set(code, image);
}

async function readJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function addBttvList(map: Map<string, EmoteImage>, value: unknown) {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const code = "code" in item && typeof item.code === "string" ? item.code : "";
    const id = "id" in item && typeof item.id === "string" ? item.id : "";
    if (code && id) addCode(map, code, bttv(id));
  }
}

function addFfzSets(map: Map<string, EmoteImage>, value: unknown) {
  if (!value || typeof value !== "object" || !("sets" in value)) return;
  const sets = (value as { sets?: unknown }).sets;
  if (!sets || typeof sets !== "object") return;
  for (const set of Object.values(sets)) {
    if (!set || typeof set !== "object" || !("emoticons" in set) || !Array.isArray(set.emoticons)) continue;
    for (const emote of set.emoticons) {
      if (!emote || typeof emote !== "object") continue;
      const name = "name" in emote && typeof emote.name === "string" ? emote.name : "";
      const urls = "urls" in emote && emote.urls && typeof emote.urls === "object" ? emote.urls as Record<string, string> : {};
      const src = urls["2"] || urls["1"] || urls["4"];
      if (src) addCode(map, name, { src: src.startsWith("//") ? `https:${src}` : src });
    }
  }
}

function add7tvEmotes(map: Map<string, EmoteImage>, value: unknown) {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "emotes" in value && Array.isArray(value.emotes)
      ? value.emotes
      : value && typeof value === "object" && "emote_set" in value && value.emote_set && typeof value.emote_set === "object" && "emotes" in value.emote_set && Array.isArray(value.emote_set.emotes)
        ? value.emote_set.emotes
        : [];
  for (const emote of list) {
    if (!emote || typeof emote !== "object") continue;
    const data = "data" in emote && emote.data && typeof emote.data === "object" ? emote.data : null;
    const name =
      ("name" in emote && typeof emote.name === "string" && emote.name) ||
      (data && "name" in data && typeof data.name === "string" ? data.name : "");
    const id =
      (data && "id" in data && typeof data.id === "string" && data.id) ||
      ("id" in emote && typeof emote.id === "string" ? emote.id : "");
    const animated = Boolean(
      (data && "animated" in data && data.animated) || ("animated" in emote && emote.animated),
    );
    if (name && id) addCode(map, name, seventv(id, animated));
  }
}

export async function loadTwitchEmotes(): Promise<Map<string, EmoteImage>> {
  const map = new Map<string, EmoteImage>();
  const [globalBttv, globalFfz, global7tv, user] = await Promise.all([
    readJson("https://api.betterttv.net/3/cached/emotes/global"),
    readJson("https://api.frankerfacez.com/v1/set/global"),
    readJson("https://7tv.io/v3/emote-sets/global"),
    readJson(`https://api.ivr.fi/v2/twitch/user?login=${CHANNEL}`),
  ]);
  addBttvList(map, globalBttv);
  addFfzSets(map, globalFfz);
  add7tvEmotes(map, global7tv);

  const record = Array.isArray(user) ? user[0] : user;
  const id = record && typeof record === "object" && "id" in record && typeof record.id === "string" ? record.id : "";
  if (!id) return map;
  const [channelBttv, channelFfz, channel7tv] = await Promise.all([
    readJson(`https://api.betterttv.net/3/cached/users/twitch/${id}`),
    readJson(`https://api.frankerfacez.com/v1/room/${CHANNEL}`),
    readJson(`https://7tv.io/v3/users/twitch/${id}`),
  ]);
  if (channelBttv && typeof channelBttv === "object") {
    const body = channelBttv as { channelEmotes?: unknown; sharedEmotes?: unknown };
    addBttvList(map, body.channelEmotes);
    addBttvList(map, body.sharedEmotes);
  }
  addFfzSets(map, channelFfz);
  add7tvEmotes(map, channel7tv);
  return map;
}
