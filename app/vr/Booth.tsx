"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildChatPieces, mentionsEmpress, parseTwitchEmoteTag, type EmoteImage, type TwitchEmoteSpan } from "@/lib/vr/chat-text";
import { startParcelGhost, type GhostStatus } from "@/lib/vr/ghost";
import { STATIONS, stationById, type NowPlaying } from "@/lib/vr/stations";
import { loadTwitchEmotes } from "@/lib/vr/twitch-emotes";
import ImagesPanel from "./ImagesPanel";

type Source = "dcl" | "twitch";
type Filter = "all" | Source;
type Panel = "live" | "images";

type Line = {
  id: string;
  source: Source;
  name: string;
  address?: string;
  text: string;
  at: number;
  translated?: string;
  twitchEmotes?: TwitchEmoteSpan[];
};

const EMPTY_NOW: NowPlaying = { line: "Loading the current track", detail: "", art: "", next: "" };
const NO_EMOTES: ReadonlyMap<string, EmoteImage> = new Map();

let audioCtx: AudioContext | null = null;
let lastPing = 0;
const pingOn = { current: false };

function audioConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const legacy = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || legacy.webkitAudioContext || null;
}

function armChime(): Promise<void> {
  const Ctor = audioConstructor();
  if (!Ctor) return Promise.resolve();
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx.resume().then(() => undefined);
}

function playChime() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const nowMs = Date.now();
  if (nowMs - lastPing < 1500) return;
  lastPing = nowMs;
  const now = audioCtx.currentTime;
  [880, 1318].forEach((freq, index) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    const start = now + index * 0.09;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function pingMention() {
  if (!pingOn.current) return;
  playChime();
}

function EmoteImg({ name, src, fallback }: { name: string; src: string; fallback?: string }) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  if (failed) return <>{name}</>;
  return (
    <img
      className="vr-emote"
      src={current}
      alt={name}
      title={name}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
    />
  );
}

function ChatBody({
  text,
  twitchEmotes,
  extras,
}: {
  text: string;
  twitchEmotes?: TwitchEmoteSpan[];
  extras: ReadonlyMap<string, EmoteImage>;
}) {
  const pieces = buildChatPieces(text, twitchEmotes ?? [], extras);
  return (
    <>
      {pieces.map((piece, index) => {
        if (piece.kind === "text") return <span key={index}>{piece.text}</span>;
        if (piece.kind === "image") {
          return <img key={index} className="vr-photo" src={piece.src} alt={piece.alt} />;
        }
        return <EmoteImg key={index} name={piece.name} src={piece.src} fallback={piece.fallback} />;
      })}
    </>
  );
}

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function connectTwitch(onLine: (line: Line) => void, onStatus: (status: string) => void): () => void {
  let stopped = false;
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (stopped) return;
    onStatus("Connecting to #empresstrash");
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    socket = ws;
    const nick = `justinfan${Math.floor(10000 + Math.random() * 80000)}`;
    ws.onopen = () => {
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws.send("PASS SCHMOOPIIE");
      ws.send(`NICK ${nick}`);
      ws.send("JOIN #empresstrash");
      onStatus("Live · #empresstrash");
    };
    ws.onmessage = (event) => {
      const chunk = String(event.data);
      for (const raw of chunk.split(/\r?\n/)) {
        if (!raw) continue;
        if (raw.startsWith("PING")) {
          ws.send("PONG :tmi.twitch.tv");
          continue;
        }
        if (!raw.includes("PRIVMSG")) continue;
        const tagEnd = raw.startsWith("@") ? raw.indexOf(" ") : 0;
        const tags = raw.startsWith("@") ? raw.slice(1, tagEnd) : "";
        const display = /display-name=([^;]*)/.exec(tags)?.[1]?.replace(/\\s/g, " ");
        const login = /:([^!]+)!/.exec(raw)?.[1];
        const marker = raw.indexOf("PRIVMSG");
        const colon = raw.indexOf(" :", marker);
        const text = colon >= 0 ? raw.slice(colon + 2).replace(/\s+$/g, "") : "";
        if (!text) continue;
        const emoteTag = /(?:^|;)emotes=([^;]*)/.exec(tags)?.[1] ?? "";
        onLine({
          id: `twitch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          source: "twitch",
          name: display || login || "twitch",
          text,
          at: Date.now(),
          twitchEmotes: parseTwitchEmoteTag(emoteTag),
        });
      }
    };
    ws.onclose = () => {
      if (stopped) return;
      onStatus("Twitch disconnected. Retrying.");
      retry = setTimeout(open, 4000);
    };
    ws.onerror = () => onStatus("Twitch chat did not connect.");
  };

  open();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}

export default function Booth({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [translate, setTranslate] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [dcl, setDcl] = useState<GhostStatus>({
    phase: "connecting",
    detail: "Starting the parcel listener",
    peers: 0,
  });
  const [twitchStatus, setTwitchStatus] = useState("Twitch off until the page opens");
  const [stationId, setStationId] = useState(STATIONS[0].id);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [now, setNow] = useState<NowPlaying>(EMPTY_NOW);
  const [radioError, setRadioError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [emotes, setEmotes] = useState<ReadonlyMap<string, EmoteImage>>(NO_EMOTES);
  const [ping, setPing] = useState(false);
  const [pingReady, setPingReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [panel, setPanel] = useState<Panel>("live");
  const audioRef = useRef<HTMLAudioElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const seenIds = useRef(new Set<string>());
  const filterSeen = useRef<Filter>("all");
  const names = useRef(new Map<string, string>());
  const lineSeq = useRef(0);
  const savedScroll = useRef(0);
  const leftLive = useRef(false);
  const lang = useRef("en");
  const translateOn = useRef(true);

  useEffect(() => {
    lang.current = (navigator.language || "en").split("-")[0] || "en";
  }, []);

  useEffect(() => {
    translateOn.current = translate;
  }, [translate]);

  const pushLine = (line: Line) => {
    setLines((current) => [...current.slice(-199), line]);
    if (mentionsEmpress(line.text)) pingMention();
    if (!translateOn.current) return;
    const to = lang.current;
    void fetch("/api/vr/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: line.text, to }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { text?: string };
        if (!body.text || body.text === line.text) return;
        setLines((current) =>
          current.map((item) => (item.id === line.id ? { ...item, translated: body.text } : item)),
        );
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/vr/unlock").then(async (response) => {
      const body = (await response.json()) as { ok?: boolean };
      if (cancelled) return;
      setOpen(Boolean(body.ok));
    });
    const savedVolume = Number(window.localStorage.getItem("atelier-volume"));
    if (savedVolume > 0 && savedVolume <= 1) setVolume(savedVolume);
    const savedStation = window.localStorage.getItem("atelier-station");
    if (savedStation && stationById(savedStation)) setStationId(savedStation);
    const savedPing = window.localStorage.getItem("atelier-ping") === "1";
    pingOn.current = savedPing;
    setPing(savedPing);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const stop = startParcelGhost({
      onStatus: setDcl,
      onChat: (chat) => {
        const known = names.current.get(chat.address);
        const line: Line = {
          id: `dcl-${lineSeq.current++}`,
          source: "dcl",
          name: known || (chat.address.startsWith("0x") ? `${chat.address.slice(0, 6)}…${chat.address.slice(-4)}` : chat.address || "Someone"),
          address: chat.address.startsWith("0x") ? chat.address : undefined,
          text: chat.text,
          at: chat.at,
        };
        pushLine(line);
        if (line.address && !names.current.has(line.address)) {
          names.current.set(line.address, line.name);
          const address = line.address;
          void fetch(`/api/vr/name?address=${address}`).then(async (response) => {
            if (!response.ok) return;
            const body = (await response.json()) as { name?: string };
            if (!body.name) return;
            names.current.set(address, body.name);
            setLines((current) => current.map((item) => (item.address === address ? { ...item, name: body.name! } : item)));
          });
        }
      },
    });
    return stop;
  }, [open, attempt]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadTwitchEmotes().then((map) => {
      if (!cancelled) setEmotes(map);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return connectTwitch(
      (line) => pushLine(line),
      setTwitchStatus,
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = () => {
      void fetch(`/api/vr/now-playing?id=${stationId}`).then(async (response) => {
        if (!response.ok || cancelled) return;
        setNow((await response.json()) as NowPlaying);
      });
    };
    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open, stationId]);

  const visible = useMemo(
    () => lines.filter((line) => filter === "all" || line.source === filter),
    [lines, filter],
  );

  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    if (filter !== filterSeen.current) {
      filterSeen.current = filter;
      for (const line of lines) seenIds.current.add(line.id);
      stickToBottom.current = true;
      setPending(0);
      if (panel === "live") node.scrollTop = node.scrollHeight;
      return;
    }
    const fresh = visible.filter((line) => !seenIds.current.has(line.id));
    for (const line of lines) seenIds.current.add(line.id);
    if (stickToBottom.current) {
      if (panel === "live") node.scrollTop = node.scrollHeight;
      if (fresh.length > 0) setPending((count) => (count === 0 ? count : 0));
      return;
    }
    if (fresh.length > 0) setPending((count) => count + fresh.length);
  }, [visible, filter, lines, panel]);

  useLayoutEffect(() => {
    if (panel !== "live") {
      leftLive.current = true;
      return;
    }
    if (!leftLive.current) return;
    leftLive.current = false;
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = stickToBottom.current ? node.scrollHeight : savedScroll.current;
  }, [panel]);

  useEffect(() => {
    if (!open) return;
    const node = scroller.current;
    if (!node) return;
    const onScroll = () => {
      const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
      stickToBottom.current = near;
      if (near) setPending((count) => (count === 0 ? count : 0));
    };
    const onLoad = () => {
      if (stickToBottom.current) node.scrollTop = node.scrollHeight;
    };
    node.addEventListener("scroll", onScroll);
    node.addEventListener("load", onLoad, true);
    return () => {
      node.removeEventListener("scroll", onScroll);
      node.removeEventListener("load", onLoad, true);
    };
  }, [open]);

  function togglePing() {
    const live = Boolean(audioCtx && audioCtx.state === "running");
    if (pingOn.current && pingReady && live) {
      pingOn.current = false;
      setPing(false);
      setPingReady(false);
      window.localStorage.setItem("atelier-ping", "0");
      return;
    }
    pingOn.current = true;
    setPing(true);
    window.localStorage.setItem("atelier-ping", "1");
    void armChime()
      .then(() => {
        setPingReady(true);
        lastPing = 0;
        playChime();
      })
      .catch(() => undefined);
  }

  function choosePanel(next: Panel) {
    if (panel === "live" && next !== "live" && scroller.current) {
      savedScroll.current = scroller.current.scrollTop;
    }
    setPanel(next);
  }

  function jumpToPresent() {
    const node = scroller.current;
    stickToBottom.current = true;
    setPending(0);
    if (node) node.scrollTop = node.scrollHeight;
  }

  const station = stationById(stationId) ?? STATIONS[0];
  const groups = useMemo(() => [...new Set(STATIONS.map((item) => item.group))], []);

  const tune = (nextPlaying: boolean, nextStation = station, useFallback = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (!nextPlaying) {
      audio.pause();
      setPlaying(false);
      return;
    }
    const url = useFallback && nextStation.fallback ? nextStation.fallback : nextStation.stream;
    audio.onerror = () => {
      if (!useFallback && nextStation.fallback && audio.src !== nextStation.fallback) {
        tune(true, nextStation, true);
        return;
      }
      setPlaying(false);
      setRadioError("This stream did not start. Try another station.");
    };
    if (audio.src !== url) audio.src = url;
    const playback = audio.play();
    setPlaying(true);
    setRadioError("");
    void playback?.catch((error: unknown) => {
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      if (blocked) {
        setPlaying(false);
        setRadioError("This browser blocked playback. Tap play once more.");
        return;
      }
      if (!useFallback && nextStation.fallback) {
        tune(true, nextStation, true);
        return;
      }
      setPlaying(false);
      setRadioError("This stream did not start. Try another station.");
    });
  };

  if (!open) {
    return (
      <div className="vr-booth">
        <form
          className="vr-gate"
          onSubmit={(event) => {
            event.preventDefault();
            setGateError("");
            void fetch("/api/vr/unlock", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ password }),
            }).then((response) => {
              if (!response.ok) {
                setGateError("Wrong password.");
                return;
              }
              setOpen(true);
            });
          }}
        >
          <h1 className="vr-title">vr booth</h1>
          <label className="vr-label" htmlFor="gate">
            Password
          </label>
          <input
            id="gate"
            className="vr-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {gateError ? <p className="vr-error">{gateError}</p> : null}
          <button className="vr-button" type="submit">
            Open
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="vr-booth">
      <div className="vr-head">
        <h1 className="vr-title">vr booth</h1>
        <div className="vr-pills">
          <p className="vr-pill">
            DCL <span className={dcl.phase === "live" ? "vr-hot" : ""}>{dcl.phase === "live" ? "Live" : dcl.phase === "error" ? "Problem" : "Connecting"}</span>
          </p>
          <p className="vr-pill">
            Twitch <span className={twitchStatus.startsWith("Live") ? "vr-hot" : ""}>{twitchStatus.startsWith("Live") ? "Live" : "Connecting"}</span>
          </p>
        </div>
      </div>
      <div className="vr-tabs" role="tablist" aria-label="Booth">
        <button
          type="button"
          role="tab"
          id="vr-tab-live"
          className={panel === "live" ? "vr-chip is-on" : "vr-chip"}
          aria-selected={panel === "live"}
          aria-controls="vr-panel-live"
          onClick={() => choosePanel("live")}
        >
          Chat & radio
        </button>
        <button
          type="button"
          role="tab"
          id="vr-tab-images"
          className={panel === "images" ? "vr-chip is-on" : "vr-chip"}
          aria-selected={panel === "images"}
          aria-controls="vr-panel-images"
          onClick={() => choosePanel("images")}
        >
          Images
        </button>
      </div>
      <div className="vr-layout" id="vr-panel-live" role="tabpanel" aria-labelledby="vr-tab-live" hidden={panel !== "live"}>
        <section className="vr-chat">
          <div className="vr-bar">
            <div className="vr-filters">
              {(["all", "dcl", "twitch"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? "vr-chip is-on" : "vr-chip"}
                  onClick={() => setFilter(item)}
                >
                  {item === "all" ? "All" : item === "dcl" ? "DCL" : "Twitch"}
                </button>
              ))}
              <button
                type="button"
                className={translate ? "vr-chip is-on" : "vr-chip"}
                onClick={() => setTranslate((on) => !on)}
              >
                Translate
              </button>
              <button
                type="button"
                className={ping ? "vr-chip is-on" : "vr-chip"}
                aria-pressed={ping}
                aria-label="Toggle mention ping"
                title={ping && !pingReady ? "Tap once to allow the sound" : "Play a sound when someone mentions you"}
                onClick={togglePing}
              >
                Ping
              </button>
            </div>
          </div>
          {dcl.phase === "error" ? <p className="vr-error">{dcl.detail}</p> : null}
          <div className="vr-stream-wrap">
            <div className="vr-stream" ref={scroller}>
              {visible.length === 0 ? (
                <p className="vr-muted">Text from people at the atelier, and Twitch chat, show up here.</p>
              ) : (
                visible.map((line) => (
                  <article key={line.id} className={mentionsEmpress(line.text) ? "vr-line is-mention" : "vr-line"}>
                    <p className={`vr-meta vr-meta-${line.source}`}>
                      <span className="vr-src">{line.source === "dcl" ? "DCL" : "Twitch"}</span>
                      <span className="vr-dot"> · </span>
                      <span className="vr-name">{line.name}</span>
                      <span className="vr-dot"> · </span>
                      <span className="vr-time">{clock(line.at)}</span>
                    </p>
                    <p className="vr-text">
                      <ChatBody text={line.text} twitchEmotes={line.twitchEmotes} extras={emotes} />
                    </p>
                    {line.translated ? <p className="vr-original">{line.translated}</p> : null}
                  </article>
                ))
              )}
            </div>
            {pending > 0 ? (
              <button type="button" className="vr-jump" onClick={jumpToPresent}>
                {pending === 1 ? "1 new message" : `${pending} new messages`} · jump to present
              </button>
            ) : null}
          </div>
          {dcl.phase === "error" ? (
            <button type="button" className="vr-reconnect" onClick={() => setAttempt((value) => value + 1)}>
              Reconnect parcel
            </button>
          ) : null}
        </section>
        <aside className="vr-radio">
          <label className="vr-label" htmlFor="station">
            Station
          </label>
          <select
            id="station"
            className="vr-select"
            value={stationId}
            onChange={(event) => {
              const next = stationById(event.target.value) ?? STATIONS[0];
              setStationId(next.id);
              window.localStorage.setItem("atelier-station", next.id);
              setNow(EMPTY_NOW);
              if (playing) tune(true, next);
            }}
          >
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {STATIONS.filter((item) => item.group === group).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div>
            {now.art.startsWith("https://") ? <img className="vr-art" src={now.art} alt="" /> : null}
            <p className="vr-station">{station.name}</p>
            <p className="vr-track">{now.line}</p>
            {now.detail ? <p className="vr-detail vr-muted">{now.detail}</p> : null}
            {now.next ? <p className="vr-detail vr-muted">Next · {now.next}</p> : null}
          </div>
          <div className="vr-controls">
            <button type="button" className="vr-play" onClick={() => tune(!playing)}>
              {playing ? "Pause" : "Play"}
            </button>
            <label className="vr-label" htmlFor="volume">
              Volume
            </label>
            <input
              id="volume"
              className="vr-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                window.localStorage.setItem("atelier-volume", String(next));
                if (audioRef.current) audioRef.current.volume = next;
              }}
            />
          </div>
          {radioError ? <p className="vr-error">{radioError}</p> : null}
          <p className="vr-blurb vr-muted">{station.blurb}</p>
        </aside>
      </div>
      {panel === "images" ? (
        <div id="vr-panel-images" role="tabpanel" aria-labelledby="vr-tab-images" className="vr-images-slot">
          <ImagesPanel />
        </div>
      ) : null}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}
