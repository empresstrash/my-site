const PROFILE = "https://x.com/EmpressTrash";
const USER_ID = "1254946754107109377";
const API = "https://api.x.com/1.1";
const CHAT_ACCESS = "https://proxsee-cf.pscp.tv/api/v2/accessChatPublic";
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export type XChatLine = { id: string; name: string; text: string; at: number };

type Live = { id: string; mediaKey: string };
type OpenChat = { id: string; endpoint: string; access: string };

let guest: { token: string; until: number } | null = null;

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

async function findLive(): Promise<Live | null> {
  const page = await fetch(PROFILE, {
    headers: { "user-agent": UA, accept: "text/html" },
    cache: "no-store",
  });
  if (!page.ok) return null;
  const live = liveBroadcastFromProfile(await page.text());
  if (!live) return null;
  const shown = await xJson<{ broadcasts?: Record<string, { state?: string; twitter_user_id?: string; media_key?: string }> }>(
    `${API}/broadcasts/show.json?ids=${encodeURIComponent(live.id)}`,
  );
  const row = shown?.broadcasts?.[live.id];
  if (!row || row.state !== "RUNNING" || row.twitter_user_id !== USER_ID) return null;
  return { id: live.id, mediaKey: row.media_key || live.mediaKey };
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

function chatFrame(data: unknown): Promise<string> {
  if (typeof data === "string") return Promise.resolve(data);
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return Promise.resolve(new TextDecoder().decode(data));
  if (ArrayBuffer.isView(data)) return Promise.resolve(new TextDecoder().decode(data));
  return Promise.resolve("");
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function openXChatStream(signal: AbortSignal): Promise<Response> {
  const headers = {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
  };
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const deadline = Date.now() + 45_000;
      const seen = new Set<string>();
      const room: { socket: WebSocket | null } = { socket: null };
      const send = (body: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(body)}\n\n`));
        } catch {
          /* the headset closed the page */
        }
      };
      const take = (line: XChatLine) => {
        if (seen.has(line.id)) return;
        seen.add(line.id);
        send({ line });
      };
      const closeSocket = () => {
        room.socket?.close();
        room.socket = null;
      };
      let attached = "";
      const listen = (chat: OpenChat) => {
        closeSocket();
        const wsUrl = `${chat.endpoint.replace(/^http/, "ws")}/chatapi/v1/chatnow`;
        const current = new WebSocket(wsUrl);
        room.socket = current;
        current.addEventListener("open", () => {
          current.send(JSON.stringify({ payload: JSON.stringify({ access_token: chat.access }), kind: 3 }));
          current.send(
            JSON.stringify({
              payload: JSON.stringify({ body: JSON.stringify({ room: chat.id }), kind: 1 }),
              kind: 2,
            }),
          );
        });
        current.addEventListener("message", (event) => {
          void chatFrame(event.data)
            .then((raw) => {
              if (!raw) return;
              const msg = JSON.parse(raw) as { kind?: number; payload?: string };
              const line = parseBroadcastChat(msg);
              if (line) take(line);
            })
            .catch(() => undefined);
        });
        current.addEventListener("close", () => {
          if (room.socket === current) room.socket = null;
        });
      };
      try {
        while (!signal.aborted && Date.now() < deadline) {
          const live = await findLive().catch(() => null);
          if (!live) {
            if (attached) {
              attached = "";
              seen.clear();
              closeSocket();
              send({ status: "waiting", reset: true });
            } else {
              send({ status: "waiting" });
            }
            await sleep(4000, signal);
            continue;
          }
          if (live.id === attached && room.socket?.readyState === WebSocket.OPEN) {
            await sleep(4000, signal);
            continue;
          }
          const chat = await openChat(live).catch(() => null);
          if (!chat) {
            send({ status: "waiting" });
            await sleep(4000, signal);
            continue;
          }
          if (chat.id !== attached) {
            seen.clear();
            send({ status: "live", reset: true });
            attached = chat.id;
            for (const line of await recentLines(chat).catch(() => [])) take(line);
          } else {
            send({ status: "live" });
          }
          listen(chat);
          await sleep(4000, signal);
        }
      } catch {
        /* the headset closed the page */
      } finally {
        closeSocket();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
  return new Response(stream, { headers });
}
