"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startParcelGhost, type GhostStatus } from "@/lib/vr/ghost";
import { STATIONS, stationById, type NowPlaying } from "@/lib/vr/stations";

type Source = "dcl" | "twitch";
type Filter = "all" | Source;

type Line = {
  id: string;
  source: Source;
  name: string;
  address?: string;
  text: string;
  at: number;
  translated?: string;
};

const EMPTY_NOW: NowPlaying = { line: "Loading the current track", detail: "", art: "", next: "" };

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
        const display = /display-name=([^;]*)/.exec(tags)?.[1];
        const login = /:([^!]+)!/.exec(raw)?.[1];
        const marker = raw.indexOf("PRIVMSG");
        const colon = raw.indexOf(" :", marker);
        const text = colon >= 0 ? raw.slice(colon + 2).trim() : "";
        if (!text) continue;
        onLine({
          id: `twitch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          source: "twitch",
          name: display || login || "twitch",
          text,
          at: Date.now(),
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const names = useRef(new Map<string, string>());
  const lineSeq = useRef(0);
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

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, filter]);

  const station = stationById(stationId) ?? STATIONS[0];
  const groups = useMemo(() => [...new Set(STATIONS.map((item) => item.group))], []);
  const visible = lines.filter((line) => filter === "all" || line.source === filter);

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
    const pending = audio.play();
    setPlaying(true);
    setRadioError("");
    void pending?.catch((error: unknown) => {
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
      <div className="vr-layout">
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
            </div>
          </div>
          {dcl.phase === "error" ? <p className="vr-error">{dcl.detail}</p> : null}
          <div className="vr-stream" ref={scroller}>
            {visible.length === 0 ? (
              <p className="vr-muted">Messages from the atelier and from Twitch show up here.</p>
            ) : (
              visible.map((line) => (
                <article key={line.id} className="vr-line">
                  <p className="vr-meta">
                    <span className={line.source === "dcl" ? "vr-hot" : ""}>{line.source === "dcl" ? "DCL" : "Twitch"}</span>
                    {" · "}
                    {line.name}
                    {" · "}
                    {clock(line.at)}
                  </p>
                  <p className="vr-text">{line.translated || line.text}</p>
                  {line.translated ? <p className="vr-original">{line.text}</p> : null}
                </article>
              ))
            )}
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
      <audio ref={audioRef} preload="none" />
    </div>
  );
}
