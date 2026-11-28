const PROFILE = "https://x.com/EmpressTrash";
const USER_ID = "1254946754107109377";
const API = "https://api.x.com/1.1";
const CHAT_ACCESS = "https://proxsee-cf.pscp.tv/api/v2/accessChatPublic";
const LIVE_CHAT = "https://x.com/i/api/live-chat";
const SENDER_QUERY =
  "https://api.x.com/graphql/nMFTyvEHqhifo5L5KT6AMw/broadcastChatSessionSendersQuery";
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export type XChatLine = { id: string; name: string; text: string; at: number };

type Live = { id: string; mediaKey: string };
type OpenChat = { id: string; endpoint: string; access: string };

let guest: { token: string; until: number } | null = null;
const senderNames = new Map<string, string>();

export function xChatConfigured(): boolean {
  return true;
}

export function liveBroadcastFromProfile(html: string): Live | null {
  const plain = html.replace(/\\"/g, '"');
  const pattern =
    /"broadcast_id":"([A-Za-z0-9]{8,})"[\s\S]{0,12000}?"media_key":"(\d+_\d+)"[\s\S]{0,800}?"state":"([A-Za-z]+)"/g;
  let best: (Live & { start: number }) | null = null;
  for (const match of plain.matchAll(pattern)) {
    if (match[3].toLowerCase() !== "running") continue;
    const start = Number(/"start_time":(\d+)/.exec(match[0])?.[1] ?? 0);
    if (!best || start >= best.start) best = { id: match[1], mediaKey: match[2], start };
  }
  if (best) return { id: best.id, mediaKey: best.mediaKey };
  const card =
    /"string_value":"https:\/\/x\.com\/i\/broadcasts\/([A-Za-z0-9]{8,})"[\s\S]{0,500}?"broadcast_state"[\s\S]{0,200}?"string_value":"RUNNING"/;
  const hit = card.exec(plain);
  return hit ? { id: hit[1], mediaKey: "" } : null;
}

export function parseBroadcastChat(message: { kind?: number; payload?: string }): XChatLine | null {
  if (message.kind !== 1 || !message.payload) return null;
  let outer: { body?: unknown; sender?: { username?: string; display_name?: string } };
  try {
    outer = JSON.parse(message.payload) as typeof outer;
  } catch {
    return null;
  }
  let inner: {
    body?: string;
    timestamp?: number;
    programDateTime?: string;
    username?: string;
    displayName?: string;
    uuid?: string;
  } = {};
  if (typeof outer.body === "string") {
    try {
      inner = JSON.parse(outer.body) as typeof inner;
    } catch {
      return null;
    }
  } else if (outer.body && typeof outer.body === "object") {
    inner = outer.body as typeof inner;
  }
  const text = typeof inner.body === "string" ? inner.body.trim().slice(0, 500) : "";
  const rawId = typeof inner.uuid === "string" ? inner.uuid : "";
  if (!text || !rawId) return null;
  const name = (inner.displayName || outer.sender?.display_name || inner.username || outer.sender?.username || "X").slice(0, 80);
  const at = typeof inner.timestamp === "number" ? inner.timestamp : Date.parse(inner.programDateTime || "") || Date.now();
  return { id: `x-${rawId}`, name, text, at };
}

async function guestToken(): Promise<string | null> {
  if (guest && guest.until > Date.now()) return guest.token;
  const response = await fetch(`${API}/guest/activate.json`, {
    method: "POST",
    headers: { authorization: `Bearer ${BEARER}`, "user-agent": UA },
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { guest_token?: string };
  if (!json.guest_token) return null;
  guest = { token: json.guest_token, until: Date.now() + 30 * 60 * 1000 };
  return guest.token;
}

async function xJson<T>(url: string): Promise<T | null> {
  const token = await guestToken();
  if (!token) return null;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${BEARER}`,
      "x-guest-token": token,
      "x-twitter-active-user": "yes",
      "user-agent": UA,
      accept: "application/json",
    },
  });
  if (response.status === 401 || response.status === 403) guest = null;
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function broadcastIds(html: string): string[] {
  const plain = html.replace(/\\"/g, '"');
  const ids = [...plain.matchAll(/\/i\/broadcasts\/([A-Za-z0-9]{8,})/g)].map((match) => match[1]);
  return [...new Set(ids)].slice(0, 4);
}

let rememberedBroadcast: string | null = null;

async function findLive(): Promise<Live | null> {
  const page = await fetch(`${PROFILE}?_=${Date.now()}`, {
    headers: { "user-agent": UA, accept: "text/html", "cache-control": "no-cache", pragma: "no-cache" },
    cache: "no-store",
  });
  if (!page.ok) return null;
  const ids = broadcastIds(await page.text());
  if (rememberedBroadcast && !ids.includes(rememberedBroadcast)) ids.unshift(rememberedBroadcast);
  const rows = await Promise.all(
    ids.map(async (id) => {
      const shown = await xJson<{ broadcasts?: Record<string, { state?: string; twitter_user_id?: string | number; media_key?: string }> }>(
        `${API}/broadcasts/show.json?ids=${encodeURIComponent(id)}`,
      );
      return { id, row: shown?.broadcasts?.[id] };
    }),
  );
  const live = rows.find(
    (item) => item.row && String(item.row.state).toUpperCase() === "RUNNING" && String(item.row.twitter_user_id) === USER_ID,
  );
  if (!live?.row?.media_key) {
    rememberedBroadcast = null;
    return null;
  }
  rememberedBroadcast = live.id;
  return { id: live.id, mediaKey: live.row.media_key };
}

async function openChat(live: Live): Promise<OpenChat | null> {
  const status = await xJson<{ chatToken?: string }>(
    `${API}/live_video_stream/status/${encodeURIComponent(live.mediaKey)}?client=web&use_syndication_guest_id=false&cookie_set_host=x.com`,
  );
  if (!status?.chatToken) return null;
  const response = await fetch(CHAT_ACCESS, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://x.com",
      referer: "https://x.com/",
      "user-agent": UA,
      "x-periscope-user-agent": "Twitter/m5",
    },
    body: JSON.stringify({ chat_token: status.chatToken }),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { endpoint?: string; replay_endpoint?: string; access_token?: string; replay_access_token?: string };
  const endpoint = (json.endpoint || json.replay_endpoint || "").replace(/\/$/, "");
  const access = json.access_token || json.replay_access_token || "";
  if (!endpoint || !access) return null;
  return { id: live.id, endpoint, access };
}

async function recentLines(chat: OpenChat): Promise<XChatLine[]> {
  const response = await fetch(`${chat.endpoint}/chatapi/v1/history`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://x.com",
      "user-agent": UA,
      "x-periscope-user-agent": "Twitter/m5",
    },
    body: JSON.stringify({ access_token: chat.access, cursor: "", limit: 40, since: null, quick_get: true }),
  });
  if (!response.ok) return [];
  const json = (await response.json()) as { messages?: { kind?: number; payload?: string }[] };
  const lines = (json.messages ?? [])
    .map((message) => parseBroadcastChat(message))
    .filter((line): line is XChatLine => Boolean(line));
  return lines.sort((a, b) => a.at - b.at).slice(-40);
}

function chatMillis(ts: string): number {
  try {
    return Number(BigInt(ts) / BigInt(1000000));
  } catch {
    return Date.now();
  }
}

async function rememberSenders(ids: string[]): Promise<void> {
  const missing = [...new Set(ids)].filter((id) => id && !senderNames.has(id)).slice(0, 80);
  if (!missing.length) return;
  const token = await guestToken();
  if (!token) return;
  const variables = JSON.stringify({
    userIds: missing,
    __relay_internal__pv__xclientsfeaturesappviewerisloggedinrelayprovider: false,
  });
  const response = await fetch(`${SENDER_QUERY}?variables=${encodeURIComponent(variables)}`, {
    headers: {
      authorization: `Bearer ${BEARER}`,
      "x-guest-token": token,
      "user-agent": UA,
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return;
  const json = (await response.json()) as {
    data?: { user_results_by_rest_ids?: { result?: { rest_id?: string; core?: { name?: string; screen_name?: string } } }[] };
  };
  for (const row of json.data?.user_results_by_rest_ids ?? []) {
    const id = row.result?.rest_id;
    const name = row.result?.core?.name || row.result?.core?.screen_name;
    if (id && name) senderNames.set(id, name.slice(0, 80));
  }
}

function chatHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${BEARER}`,
    "x-guest-token": token,
    "x-twitter-active-user": "yes",
    "user-agent": UA,
    accept: "application/x-ndjson",
  };
}

function linesFromNdjson(body: string): XChatLine[] {
  const raw: { ts: string; userId: string; message: string }[] = [];
  for (const row of body.split("\n")) {
    const trimmed = row.trim();
    if (!trimmed) continue;
    try {
      const item = JSON.parse(trimmed) as {
        ts?: string;
        chatType?: number;
        userId?: string;
        message?: string;
        userInfo?: { displayName?: string; username?: string };
      };
      const text = typeof item.message === "string" ? item.message.trim().slice(0, 500) : "";
      if (item.chatType !== 1 || !text || !item.ts || !item.userId) continue;
      const named = item.userInfo?.displayName || item.userInfo?.username;
      if (named) senderNames.set(item.userId, named.slice(0, 80));
      raw.push({ ts: item.ts, userId: item.userId, message: text });
    } catch {
      /* a blank or partial line */
    }
  }
  return raw
    .map((item) => ({
      id: `x-${item.ts}-${item.userId}`,
      name: senderNames.get(item.userId) || "X",
      text: item.message,
      at: chatMillis(item.ts),
    }))
    .sort((a, b) => a.at - b.at)
    .slice(-40);
}

function hasNewerLine(body: string, since: string): boolean {
  for (const row of body.split("\n")) {
    const ts = /"ts":"(\d+)"/.exec(row)?.[1];
    if (ts && ts > since) return true;
  }
  return false;
}

async function readOpenChat(url: string, token: string, since: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), since ? 4000 : 2000);
  let quiet: ReturnType<typeof setTimeout> | null = null;
  let text = "";
  const stopSoon = () => {
    if (quiet) return;
    quiet = setTimeout(() => controller.abort(), 300);
  };
  try {
    const response = await fetch(url, { headers: chatHeaders(token), signal: controller.signal, cache: "no-store" });
    if (response.status === 401 || response.status === 403) guest = null;
    if (!response.ok || !response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (!since && text.includes("\n")) stopSoon();
      if (since && hasNewerLine(text, since)) stopSoon();
      if (text.length > 200000) break;
    }
  } catch {
    /* closed once the lines we need have arrived, or the wait ran out */
  } finally {
    clearTimeout(timer);
    if (quiet) clearTimeout(quiet);
  }
  return text;
}

function lineCursor(lines: XChatLine[]): string {
  return lines.reduce((cursor, line) => {
    const ts = line.id.split("-")[1] || "";
    return ts > cursor ? ts : cursor;
  }, "");
}

async function liveChatLines(broadcastId: string, mediaKey: string, since: string): Promise<XChatLine[] | null> {
  const token = await guestToken();
  if (!token) return null;
  const status = await xJson<{ sessionId?: string }>(
    `${API}/live_video_stream/status/${encodeURIComponent(mediaKey)}?client=web&use_syndication_guest_id=false&cookie_set_host=x.com`,
  );
  if (!status?.sessionId) return null;
  const params = new URLSearchParams({ broadcastId, sessionId: status.sessionId });
  if (since) params.set("cursor", since);
  const body = await readOpenChat(`${LIVE_CHAT}?${params.toString()}`, token, since);
  const lines = linesFromNdjson(body).filter((line) => !since || (line.id.split("-")[1] || "") > since);
  if (lines.some((line) => line.name === "X")) {
    await rememberSenders(lines.filter((line) => line.name === "X").map((line) => line.id.split("-").pop() || ""));
    return lines.map((line) => ({ ...line, name: senderNames.get(line.id.split("-").pop() || "") || line.name }));
  }
  return lines;
}

export async function readXChat(since = ""): Promise<{ status: "live" | "waiting"; broadcast?: string; cursor?: string; lines: XChatLine[] }> {
  const live = await findLive().catch(() => null);
  if (!live) return { status: "waiting", lines: [] };
  const lines = (await liveChatLines(live.id, live.mediaKey, since).catch(() => null)) ?? [];
  const cursor = lineCursor(lines) || since || undefined;
  return { status: "live", broadcast: live.id, cursor, lines };
}
