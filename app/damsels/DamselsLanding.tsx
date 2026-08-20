"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DAMSELS_TOTAL,
  LEGACY_PAGE,
  OBJKT_COLLECTION,
  OPENSEA_COLLECTION,
  PARAGRAPH_BIRTH,
  PARAGRAPH_DEUX,
  expandMediaUrls,
  type DamselToken,
} from "@/lib/damsels/constants";
import "./damsels.css";

function statusLabel(token: DamselToken): string {
  const market = marketLabel(token);
  return token.price ? `${market} · ${token.price}` : market;
}

function marketLabel(token: DamselToken): string {
  if (token.status === "collected") return "unlisted";
  if (token.status === "primary") return "primary";
  return "secondary";
}

function DamselImage({ token, eager }: { token: DamselToken; eager?: boolean }) {
  const urls = token.images?.length
    ? token.images
    : expandMediaUrls([token.image]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const src = urls[idx] ?? null;

  useEffect(() => {
    loaded.current = false;
    setIdx(0);
    setFailed(false);
  }, [token.chain, token.tokenId]);

  useEffect(() => {
    if (!src || failed) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || loaded.current) return;
      setIdx((n) => {
        if (n + 1 < urls.length) return n + 1;
        setFailed(true);
        return n;
      });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [src, failed, urls.length]);

  const onError = useCallback(() => {
    if (loaded.current) return;
    setIdx((n) => {
      if (n + 1 < urls.length) return n + 1;
      setFailed(true);
      return n;
    });
  }, [urls.length]);

  const onLoad = useCallback(() => {
    loaded.current = true;
  }, []);

  if (!src || failed) {
    return (
      <div className="damsels-tile-miss" aria-hidden="true">
        <span>{token.damselNumber}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={token.name}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      fetchPriority={eager ? "high" : "low"}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

type MarketFilter = "all" | "primary" | "secondary" | "unlisted";
type ChainFilter = "all" | "eth" | "tez";

const MARKET_FILTERS: MarketFilter[] = ["all", "primary", "secondary", "unlisted"];
const CHAIN_FILTERS: ChainFilter[] = ["all", "eth", "tez"];

function matchesMarket(token: DamselToken, filter: MarketFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unlisted") return token.status === "collected";
  return token.status === filter;
}

function sortDamsels(tokens: DamselToken[]): DamselToken[] {
  return [...tokens].sort((a, b) => {
    if (a.damselNumber !== b.damselNumber) return a.damselNumber - b.damselNumber;
    if (a.chain === b.chain) return Number(a.tokenId) - Number(b.tokenId);
    return a.chain === "eth" ? -1 : 1;
  });
}

function wrapIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

export default function DamselsLanding() {
  const [all, setAll] = useState<DamselToken[]>([]);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState<MarketFilter>("all");
  const [chain, setChain] = useState<ChainFilter>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const stageRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(3);
  const drag = useRef<{ x: number; active: boolean; swiped: boolean }>({
    x: 0,
    active: false,
    swiped: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/damsels/tokens", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { all?: DamselToken[]; minted?: number }) => {
        if (cancelled) return;
        const next = Array.isArray(data.all) ? data.all : [];
        setAll(next);
        setIndex(next.length ? Math.floor(Math.random() * next.length) : 0);
        setStatus(next.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("empty");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chained = useMemo(
    () => (chain === "all" ? all : all.filter((token) => token.chain === chain)),
    [all, chain],
  );
  const view = useMemo(
    () => sortDamsels(chained.filter((token) => matchesMarket(token, market))),
    [chained, market],
  );
  const tally = useMemo(() => {
    let primary = 0;
    let secondary = 0;
    let unlisted = 0;
    for (const token of chained) {
      if (token.status === "primary") primary += 1;
      else if (token.status === "secondary") secondary += 1;
      else unlisted += 1;
    }
    return { all: chained.length, primary, secondary, unlisted };
  }, [chained]);
  const tallyShown = market === "all" ? tally.all : tally[market];
  const safeIndex = view.length ? Math.min(index, view.length - 1) : 0;
  const current = view[safeIndex];

  const go = useCallback(
    (next: number) => {
      if (!view.length) return;
      setIndex(wrapIndex(next, view.length));
    },
    [view.length],
  );

  const setMarketFilter = useCallback((next: MarketFilter) => {
    setMarket(next);
    setIndex(0);
  }, []);

  const setChainFilter = useCallback((next: ChainFilter) => {
    setChain(next);
    setIndex(0);
  }, []);

  const jumpToQuery = useCallback(
    (raw: string) => {
      const q = raw.trim().toLowerCase();
      if (!q || !all.length) return;
      const asNum = Number.parseInt(q.replace(/^[^\d]*/, ""), 10);
      const matchToken = (t: DamselToken) => {
        if (Number.isFinite(asNum) && t.damselNumber === asNum) return true;
        return t.name.toLowerCase().includes(q);
      };
      const inView = view.findIndex(matchToken);
      if (inView >= 0) {
        setIndex(inView);
        return;
      }
      const chained = sortDamsels(chain === "all" ? all : all.filter((token) => token.chain === chain));
      const inChain = chained.findIndex(matchToken);
      if (inChain >= 0) {
        setMarket("all");
        setIndex(inChain);
        return;
      }
      const inAll = sortDamsels(all).findIndex(matchToken);
      if (inAll >= 0) {
        setChain("all");
        setMarket("all");
        setIndex(inAll);
      }
    },
    [all, view, chain],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(safeIndex - 1);
      if (e.key === "ArrowRight") go(safeIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, safeIndex]);

  const windowSlides = useMemo(() => {
    if (!view.length) return [];
    const maxSide = Math.min(side, Math.max(0, Math.floor((view.length - 1) / 2)));
    const out: Array<{ token: DamselToken; offset: number; i: number }> = [];
    for (let o = -maxSide; o <= maxSide; o++) {
      const i = wrapIndex(safeIndex + o, view.length);
      out.push({ token: view[i], offset: o, i });
    }
    return out;
  }, [view, safeIndex, side]);

  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 40 || h < 40) return;
      const pad = 8;
      const center = Math.min(h * 0.94, w * 0.9);
      const half = w / 2;
      const leftover = Math.max(0, half - center / 2 - pad);
      const thumb1 = center * (2 / 3);
      const peek = Math.min(thumb1 * 0.36, leftover);
      const base = center / 2 + peek - thumb1 / 2;
      let n = 1;
      const stepGuess = center * 0.13;
      for (let k = 2; k <= 3; k++) {
        const size = center * (0.786 - k * 0.12);
        const shift = base + (k - 1) * stepGuess;
        if (shift + size / 2 <= half - pad) n = k;
        else break;
      }
      const lastSize = center * (0.786 - n * 0.12);
      const maxLast = half - pad - lastSize / 2;
      const step =
        n > 1 ? Math.max(10, Math.min(stepGuess, (maxLast - base) / (n - 1))) : stepGuess;
      el.style.setProperty("--center-size", `${center}px`);
      el.style.setProperty("--deck-base", `${Math.max(0, base)}px`);
      el.style.setProperty("--deck-step", `${step}px`);
      setSide((prev) => (prev === n ? prev : n));
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [status]);

  const isSideThumb = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest(".damsels-slide.is-side");

  const onPointerDown = (e: React.PointerEvent) => {
    if (isSideThumb(e.target)) {
      drag.current = { x: e.clientX, active: false, swiped: false };
      return;
    }
    drag.current = { x: e.clientX, active: true, swiped: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    if (Math.abs(e.clientX - drag.current.x) > 40) drag.current.swiped = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    drag.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (Math.abs(dx) > 40) {
      drag.current.swiped = true;
      if (dx > 0) go(safeIndex - 1);
      else go(safeIndex + 1);
    }
  };

  return (
    <div className="damsels-page">
      <div className="damsels-glow" aria-hidden="true" />
      <div className="damsels-inner">
        <header className="damsels-hero">
          <div className="damsels-title-block">
            <span className="damsels-kicker">
              collection <em>18+</em>
            </span>
            <h1 className="damsels-title">damsels</h1>
          </div>
          <p className="damsels-lede">
            Damsels is a collection by Empress Trash celebrating feminine
            expression of all forms and destigmatizing sex work. Intersectional
            feminism only. Each Damsel is hand-drawn and animated in Procreate
            for the proprietary Damsel Wiggle™.
          </p>
        </header>
        <nav className="damsels-links" aria-label="damsels links">
          <div className="damsels-link-col">
            <a
              className="damsels-btn damsels-btn-eth"
              href={OPENSEA_COLLECTION}
              target="_blank"
              rel="noopener noreferrer"
            >
              eth collection
            </a>
            <a
              className="damsels-btn damsels-btn-tez"
              href={OBJKT_COLLECTION}
              target="_blank"
              rel="noopener noreferrer"
            >
              tez collection
            </a>
          </div>
          <div className="damsels-link-col damsels-link-col-mid">
            <a
              className="damsels-btn damsels-btn-legacy"
              href={LEGACY_PAGE}
              target="_blank"
              rel="noopener noreferrer"
            >
              legacy page
            </a>
            <p className="damsels-tally" aria-live="polite">
              {status === "ready" ? `${tallyShown} / ${DAMSELS_TOTAL}` : `— / ${DAMSELS_TOTAL}`}
            </p>
          </div>
          <div className="damsels-link-col">
            <a
              className="damsels-btn damsels-btn-birth"
              href={PARAGRAPH_BIRTH}
              target="_blank"
              rel="noopener noreferrer"
            >
              the birth of damsels
            </a>
            <a
              className="damsels-btn damsels-btn-deux"
              href={PARAGRAPH_DEUX}
              target="_blank"
              rel="noopener noreferrer"
            >
              damsels part deux
            </a>
          </div>
        </nav>

        <section className="damsels-stage-section" aria-label="damsels collection">

          {status === "loading" ? (
            <p className="damsels-empty">loading the carousel…</p>
          ) : all.length ? (
            <>
              {current ? (
              <div
                className="damsels-stage"
                ref={stageRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                  drag.current.active = false;
                }}
                onClickCapture={(e) => {
                  if (!drag.current.swiped) return;
                  if (isSideThumb(e.target)) return;
                  e.preventDefault();
                  e.stopPropagation();
                  drag.current.swiped = false;
                }}
              >
                <div className="damsels-coverflow" ref={coverRef} aria-live="polite">
                  {windowSlides.map(({ token, offset, i }) => {
                    const center = offset === 0;
                    const className = [
                      "damsels-slide",
                      center ? "is-center" : "is-side",
                      `is-${token.status}`,
                    ].join(" ");
                    const slideStyle = {
                      ["--o" as string]: offset,
                      ["--abs" as string]: Math.abs(offset),
                      ["--dir" as string]: Math.sign(offset),
                    };
                    const abs = Math.abs(offset);
                    return (
                      <button
                        key={`${token.chain}-${token.tokenId}-${offset}`}
                        type="button"
                        className={className}
                        style={slideStyle}
                        data-abs={abs}
                        onClick={center ? undefined : () => go(i)}
                        aria-label={`${token.name}, ${statusLabel(token)}`}
                      >
                        <DamselImage token={token} eager={center || abs === 1} />
                      </button>
                    );
                  })}
                </div>
              </div>
              ) : (
                <p className="damsels-empty">no damsels in this filter.</p>
              )}
              <div className="damsels-now">
                {current ? (
                  <div className="damsels-now-meta">
                    <strong>{current.name}</strong>
                    <span className={`damsels-badge ${current.status}`}>
                      {marketLabel(current)}
                    </span>
                    {current.url ? (
                      <a
                        className={`damsels-market damsels-market-${current.chain ?? "eth"}`}
                        href={current.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {current.chain === "tez" ? "Objkt" : "OpenSea"}
                      </a>
                    ) : null}
                    {current.price ? (
                      <span className="damsels-now-price">{current.price}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="damsels-now-meta" />
                )}
                <div className="damsels-now-controls">
                  <div className="damsels-filters" role="group" aria-label="filter by listing">
                    {MARKET_FILTERS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`damsels-filter${market === id ? " is-on" : ""}`}
                        aria-pressed={market === id}
                        aria-label={`listing ${id}`}
                        onClick={() => setMarketFilter(id)}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                  <div className="damsels-filters damsels-filters-chain" role="group" aria-label="filter by chain">
                    {CHAIN_FILTERS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`damsels-filter${chain === id ? " is-on" : ""}`}
                        aria-pressed={chain === id}
                        aria-label={`chain ${id}`}
                        onClick={() => setChainFilter(id)}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                  <form
                    className="damsels-search"
                    onSubmit={(e) => {
                      e.preventDefault();
                      jumpToQuery(query);
                    }}
                  >
                    <label className="damsels-search-label" htmlFor="damsels-search">
                      search
                    </label>
                    <input
                      id="damsels-search"
                      type="search"
                      value={query}
                      placeholder="search by #"
                      onChange={(e) => {
                        const value = e.target.value;
                        setQuery(value);
                        jumpToQuery(value);
                      }}
                    />
                  </form>
                </div>
              </div>
            </>
          ) : (
            <p className="damsels-empty">
              gallery is waking up. use the collection links above in the meantime.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
