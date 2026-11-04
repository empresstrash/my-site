const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const API = "https://api.x.com/2";
const ALLOWED = new Set(["broadcast.chat", "broadcast.chat.remove"]);

export type XChatLine = { id: string; name: string; text: string; at: number };

type Access = { access: string; until: number };

let cached: Access | null = null;
let ensured = false;

export function xChatConfigured(): boolean {
  return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_REFRESH_TOKEN && process.env.X_USER_ID);
}

function userId(): string {
  return process.env.X_USER_ID || "";
}

async function accessToken(): Promise<string | null> {
  if (cached && cached.until > Date.now() + 60_000) return cached.access;
  const id = process.env.X_CLIENT_ID;
  const secret = process.env.X_CLIENT_SECRET;
  const refresh = process.env.X_REFRESH_TOKEN;
  if (!id || !secret || !refresh) return null;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: id }),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cached = { access: json.access_token, until: Date.now() + (json.expires_in ?? 7200) * 1000 };
  return json.access_token;
}

async function chatOnly(access: string): Promise<boolean> {
  const owner = userId();
  if (!owner) return false;
  const listed = await fetch(`${API}/activity/subscriptions`, {
    headers: { authorization: `Bearer ${access}` },
  });
  if (!listed.ok) return false;
  const body = (await listed.json()) as { data?: { event_type?: string }[] | { event_type?: string } };
  const rows = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
  const types = rows.map((item) => item.event_type || "").filter(Boolean);
  if (types.some((type) => !ALLOWED.has(type))) return false;
  for (const eventType of ALLOWED) {
    if (types.includes(eventType)) continue;
    await fetch(`${API}/activity/subscriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
      body: JSON.stringify({ event_type: eventType, filter: { user_id: owner }, tag: "booth-chat" }),
    });
  }
  ensured = true;
  return true;
}

export function parseXActivity(raw: string): { line?: XChatLine; remove?: string } | null {
  if (raw.length > 8000) return null;
  let json: { data?: { event_type?: string; created_at?: string; payload?: Record<string, unknown> } };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return null;
  }
  const event = json.data?.event_type;
  const payload = json.data?.payload;
  if (!payload || (event !== "broadcast.chat" && event !== "broadcast.chat.remove")) return null;
  if (event === "broadcast.chat.remove") {
    const removed = payload.message_id;
    const removedId = typeof removed === "string" || typeof removed === "number" ? String(removed) : "";
    return removedId ? { remove: `x-${removedId}` } : null;
  }
  const text = typeof payload.message === "string" ? payload.message.slice(0, 500) : "";
  const rawId = payload.message_id;
  const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "";
  if (!text || !id) return null;
  const author = payload.author as { data?: { name?: string; username?: string } } | undefined;
  const name = (author?.data?.name || author?.data?.username || "X").slice(0, 80);
  const at = Date.parse(json.data?.created_at || "") || Date.now();
  return { line: { id: `x-${id}`, name, text, at } };
}

export async function openXChatStream(signal: AbortSignal): Promise<Response> {
  const headers = {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
  };
  const off = () => new Response(`data: ${JSON.stringify({ off: true })}\n\n`, { headers });
  if (!xChatConfigured()) return off();
  const access = await accessToken();
  if (!access) return off();
  if (!ensured && !(await chatOnly(access))) return off();
  const upstream = await fetch(`${API}/activity/stream?backfill_minutes=5`, {
    headers: { authorization: `Bearer ${access}` },
    signal,
  });
  if (!upstream.ok || !upstream.body) return off();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const incoming = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stop = setTimeout(() => controller.close(), 50_000);
      let buffer = "";
      try {
        while (!signal.aborted) {
          const { done, value } = await incoming.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const rows = buffer.split("\n");
          buffer = rows.pop() ?? "";
          for (const row of rows) {
            const trimmed = row.trim();
            if (!trimmed.startsWith("{")) continue;
            const parsed = parseXActivity(trimmed);
            if (!parsed) continue;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
          }
        }
      } catch {
        /* the headset closed the page */
      } finally {
        clearTimeout(stop);
        controller.close();
        await incoming.cancel().catch(() => undefined);
      }
    },
  });
  return new Response(stream, { headers });
}
