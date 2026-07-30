"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  KEY_TOKENS,
  timelineByMoon,
  type Chain,
  type MoonGroup,
  type MoonWork,
} from "./data";
import "./full-moon.css";

/**
 * Twinkling stars — JS-driven so Windows "reduced motion" / CSS animation
 * kills can't freeze them (header glass-sparkles aren't under that rule).
 */
function SpaceTwinkles({ count = 48 }: { count?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const stars = Array.from(
      root.querySelectorAll<HTMLElement>(".fmt-twinkle"),
    );
    if (!stars.length) return;

    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0;
      for (let i = 0; i < stars.length; i++) {
        // ~3.5–5.5s per cycle, staggered (slow gentle twinkle)
        const dur = 3500 + (i % 6) * 350;
        const delay = (i * 420) % 4200;
        const phase = (((t - delay) % dur) + dur) % dur;
        // sharp peak mid-cycle (sparkle), dim base
        const u = phase / dur; // 0..1
        const peak = Math.exp(-Math.pow((u - 0.5) * 6, 2)); // gaussian around mid
        const opacity = 0.2 + 0.8 * peak;
        const scale = 0.85 + 0.55 * peak;
        const el = stars[i];
        el.style.opacity = String(opacity);
        el.style.transform = `scale(${scale})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <div className="fmt-twinkles" ref={rootRef} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="fmt-twinkle"
          style={{
            left: `${(i * 37 + 11) % 97}%`,
            top: `${(i * 53 + 7) % 96}%`,
            opacity: 0.25,
          }}
        />
      ))}
    </div>
  );
}

const IPFS_GATEWAYS = [
  (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`,
  (cid: string) => `https://nftstorage.link/ipfs/${cid}`,
  (cid: string) => `https://dweb.link/ipfs/${cid}`,
  (cid: string) => `https://w3s.link/ipfs/${cid}`,
  (cid: string) => `https://4everland.io/ipfs/${cid}`,
];

const YEAR_HUE: Record<number, number> = {
  2022: 330,
  2023: 172,
  2024: 275,
  2025: 28,
  2026: 205,
};

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const TRADITIONAL_MOON: Record<number, string> = {
  0: "Wolf Moon",
  1: "Snow Moon",
  2: "Worm Moon",
  3: "Pink Moon",
  4: "Flower Moon",
  5: "Strawberry Moon",
  6: "Buck Moon",
  7: "Sturgeon Moon",
  8: "Harvest Moon",
  9: "Hunter's Moon",
  10: "Beaver Moon",
  11: "Cold Moon",
};

/** Orbit radius as fraction of stage size (dots sit just outside art disc) */
const ORBIT_FRAC = 0.47;

function yearFromDate(date: string): number {
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : 2022;
}

function monthFromDate(date: string): number {
  const m = parseInt(date.slice(5, 7), 10) - 1;
  return m >= 0 && m <= 11 ? m : 0;
}

function formatMoonLabel(date: string, moonName: string): string {
  const mon = MONTH_ABBR[monthFromDate(date)];
  const year = yearFromDate(date);
  const monYear = `${mon} ${year}`;
  const raw = (moonName || "").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("blue moon") || lower === "blue moon") {
    return `${monYear}, Blue Moon`;
  }
  if (lower.includes("blood") && lower.includes("eclipse")) {
    return `${monYear}, Blood Moon Lunar Eclipse`;
  }
  if (lower.includes("blood moon")) {
    return `${monYear}, Blood Moon`;
  }
  if (lower.includes("lunar eclipse") || lower.includes("eclipse")) {
    return `${monYear}, Lunar Eclipse`;
  }
  if (lower.includes("winter solstice") || lower.includes("solstice")) {
    return `${monYear}, Winter Solstice`;
  }
  if (
    lower.includes("key") ||
    lower.includes("origin") ||
    lower.includes("base extension")
  ) {
    return `${monYear}, Key Tokens`;
  }

  let name = raw
    .replace(/\s*·\s*Year One/gi, "")
    .replace(/\s*·\s*Artemis II/gi, "")
    .replace(/^Origin\s*·\s*/i, "")
    .trim();

  if (!name || /^full moon$/i.test(name)) {
    name = TRADITIONAL_MOON[monthFromDate(date)];
  } else if (
    /super moon/i.test(name) &&
    !/blue|blood|harvest|sturgeon|hunter/i.test(name)
  ) {
    name = name.replace(/\s+/g, " ").trim();
  }

  if (/^full moon/i.test(name) && name.length < 14) {
    name = TRADITIONAL_MOON[monthFromDate(date)];
  }

  return `${monYear}, ${name}`;
}

function moonHue(
  year: number,
  indexInYear: number,
  moonsInYear: number,
): number {
  const base = YEAR_HUE[year] ?? (year * 53) % 360;
  const span = 34;
  const t = moonsInYear <= 1 ? 0.5 : indexInYear / (moonsInYear - 1);
  return base - span / 2 + t * span;
}

function moonDotStyle(
  year: number,
  indexInYear: number,
  moonsInYear: number,
  active: boolean,
): CSSProperties {
  const h = moonHue(year, indexInYear, moonsInYear);
  const s = active ? 85 : 68;
  const l = active ? 62 : 48;
  const color = `hsl(${h} ${s}% ${l}%)`;
  const glow = `hsl(${h} 90% 60% / ${active ? 0.7 : 0.38})`;
  return {
    background: active
      ? `radial-gradient(circle at 35% 35%, #fff 0%, ${color} 42%, hsl(${h} 70% 35%) 100%)`
      : color,
    boxShadow: active
      ? `0 0 0 3px rgba(8, 5, 14, 0.95), 0 0 20px ${glow}`
      : `0 0 10px ${glow}`,
  };
}

function stripIpfs(uri: string): string {
  if (uri.startsWith("ipfs://")) return uri.slice(7);
  const i = uri.indexOf("/ipfs/");
  if (i !== -1) return uri.slice(i + 6);
  return uri;
}

function toUrl(src: string, gatewayIndex = 0): string {
  if (src.startsWith("http") && !src.includes("/ipfs/")) return src;
  return IPFS_GATEWAYS[Math.min(gatewayIndex, IPFS_GATEWAYS.length - 1)](
    stripIpfs(src),
  );
}

function chainLabel(chain: Chain): string {
  return chain === "tezos" ? "tezos" : "base";
}

function MoonImage({
  src,
  fallback,
  alt,
}: {
  src: string;
  fallback?: string;
  alt: string;
}) {
  const [gate, setGate] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useFallback && fallback ? fallback : src;
  const url = toUrl(active, gate);

  const onError = useCallback(() => {
    const isIpfs =
      active.includes("/ipfs/") ||
      active.startsWith("Qm") ||
      active.startsWith("baf");
    if (isIpfs && gate + 1 < IPFS_GATEWAYS.length) {
      setGate((g) => g + 1);
      return;
    }
    if (!useFallback && fallback) {
      setUseFallback(true);
      setGate(0);
      return;
    }
    setFailed(true);
  }, [active, gate, useFallback, fallback]);

  if (failed) return <div className="fmt-miss" aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" decoding="async" onError={onError} />
  );
}

function ArtPiece({
  work,
  moonName,
  date,
}: {
  work: MoonWork;
  moonName: string;
  date: string;
}) {
  return (
    <a
      href={work.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`fmt-core-piece chain-${work.chain}`}
    >
      <MoonImage src={work.image} fallback={work.imageFallback} alt={work.name} />
      <span className="fmt-core-overlay">
        <span className="fmt-core-piece-name">{work.name}</span>
        <span className="fmt-core-piece-meta">
          {date ? formatMoonLabel(date, moonName) : moonName}
        </span>
        <span className={`fmt-core-piece-chain chain-${work.chain}`}>
          {chainLabel(work.chain)}
        </span>
      </span>
    </a>
  );
}

type OrbitItem =
  | { kind: "key"; id: string; works: MoonWork[]; angle: number }
  | {
      kind: "moon";
      id: string;
      group: MoonGroup;
      angle: number;
      moonIndex: number;
    };

const KEYSTONE_ID = "keystone";

/**
 * Triple goddess crescents — SVG mask (outer disc minus offset disc).
 * Left  )  thick edge faces moon (right)
 * Right (  thick edge faces moon (left)
 */
function Crescent({
  side,
  hue,
  onClick,
  label,
}: {
  side: "left" | "right";
  hue: number;
  onClick: () => void;
  label: string;
}) {
  const uid = useId().replace(/:/g, "");
  const maskId = `fmt-crescent-mask-${side}-${uid}`;
  const fill = `hsl(${hue} 78% 74%)`;
  // viewBox must fully contain both discs so the moon-facing edge is not squared off
  // Left  )  thick on right (toward moon). Right (  thick on left (toward moon).
  const outerCx = side === "left" ? 54 : 46;
  const cutCx = side === "left" ? 22 : 78;
  const outerR = 46;
  const cutR = 40;

  return (
    <button
      type="button"
      className={`fmt-crescent fmt-crescent-${side}`}
      onClick={onClick}
      aria-label={label}
      style={
        {
          ["--crescent-glow" as string]: `hsla(${hue}, 85%, 60%, 0.65)`,
        } as CSSProperties
      }
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect width="100" height="100" fill="black" />
            <circle cx={outerCx} cy="50" r={outerR} fill="white" />
            <circle cx={cutCx} cy="50" r={cutR} fill="black" />
          </mask>
        </defs>
        <rect width="100" height="100" fill={fill} mask={`url(#${maskId})`} />
      </svg>
    </button>
  );
}

export default function FullMoonPage() {
  const moons = useMemo(() => timelineByMoon(), []);
  const cycleRef = useRef<HTMLElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const [moonPx, setMoonPx] = useState(360);

  // Size moon from the cycle pane; always leave real room for the caption box
  // so it never gets clipped by page overflow.
  useEffect(() => {
    const el = cycleRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const padX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const padY =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const w = el.clientWidth - padX;
      const h = el.clientHeight - padY;
      if (w < 40 || h < 40) return;
      const gap = 12;
      const capH = Math.max(captionRef.current?.offsetHeight ?? 0, 48);
      // Narrow screens: tighter crescents so the disc can use more width
      const widthFactor = w < 560 ? 1.62 : 1.75;
      const byWidth = w / widthFactor;
      const byHeight = Math.max(0, h - capH - gap);
      // Fit both axes. No hard min that can exceed free space (landscape clip).
      const next = Math.max(1, Math.floor(Math.min(byWidth, byHeight, 640)));
      setMoonPx((prev) => (Math.abs(next - prev) < 2 ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (captionRef.current) ro.observe(captionRef.current);
    return () => ro.disconnect();
  }, []);

  const orbitItems: OrbitItem[] = useMemo(() => {
    const items: OrbitItem[] = [
      {
        kind: "key",
        id: KEYSTONE_ID,
        works: KEY_TOKENS,
        angle: 0,
      },
      ...moons.map((g, i) => ({
        kind: "moon" as const,
        id: g.moonKey,
        group: g,
        angle: 0,
        moonIndex: i,
      })),
    ];
    const total = items.length || 1;
    return items.map((item, i) => ({
      ...item,
      angle: (i * 360) / total,
    }));
  }, [moons]);

  const [activeId, setActiveId] = useState<string>(KEYSTONE_ID);
  const [userTakenOver, setUserTakenOver] = useState(false);
  const [ringRotation, setRingRotation] = useState(0);

  const yearIndex = useMemo(() => {
    const map = new Map<
      string,
      { year: number; indexInYear: number; count: number }
    >();
    const byYear = new Map<number, MoonGroup[]>();
    for (const m of moons) {
      const y = yearFromDate(m.date);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(m);
    }
    for (const [year, list] of byYear) {
      list.forEach((m, i) => {
        map.set(m.moonKey, { year, indexInYear: i, count: list.length });
      });
    }
    return map;
  }, [moons]);

  const cycleIds = useMemo(() => orbitItems.map((i) => i.id), [orbitItems]);

  const activeItem = useMemo(
    () => orbitItems.find((it) => it.id === activeId) ?? orbitItems[0],
    [orbitItems, activeId],
  );

  const coreWorks: MoonWork[] = useMemo(() => {
    if (!activeItem) return [];
    if (activeItem.kind === "key") return activeItem.works;
    return activeItem.group.works;
  }, [activeItem]);

  const caption = useMemo(() => {
    if (!activeItem) return "";
    if (activeItem.kind === "key") return "Key Tokens";
    return formatMoonLabel(activeItem.group.date, activeItem.group.moonName);
  }, [activeItem]);

  const takeOver = useCallback(() => setUserTakenOver(true), []);

  const go = useCallback(
    (dir: number) => {
      takeOver();
      setActiveId((cur) => {
        const list = cycleIds;
        let idx = list.indexOf(cur);
        if (idx < 0) idx = 0;
        return list[(idx + dir + list.length) % list.length];
      });
    },
    [cycleIds, takeOver],
  );

  const selectId = useCallback(
    (id: string) => {
      takeOver();
      setActiveId(id);
    },
    [takeOver],
  );

  useEffect(() => {
    if (userTakenOver || cycleIds.length < 2) return;
    const id = window.setInterval(() => {
      setActiveId((cur) => {
        let idx = cycleIds.indexOf(cur);
        if (idx < 0) idx = 0;
        return cycleIds[(idx + 1) % cycleIds.length];
      });
    }, 14000);
    return () => window.clearInterval(id);
  }, [userTakenOver, cycleIds]);

  const activeHue = useMemo(() => {
    if (!activeItem) return 330;
    if (activeItem.kind === "key") return 300;
    const meta = yearIndex.get(activeItem.group.moonKey);
    if (!meta) return 330;
    return moonHue(meta.year, meta.indexInYear, meta.count);
  }, [activeItem, yearIndex]);

  // Active moon at top. Shortest-path rotation.
  useEffect(() => {
    if (!activeItem) return;
    const target = -activeItem.angle;
    setRingRotation((prev) => {
      const delta = ((((target - prev) % 360) + 540) % 360) - 180;
      return prev + delta;
    });
  }, [activeItem]);

  const half = moonPx / 2;
  const orbitR = moonPx * ORBIT_FRAC;

  return (
    <div className="fmt-page">
      <div className="fmt-space" aria-hidden="true">
        <div className="fmt-nebula" />
        <span className="fmt-comet fmt-comet-1" />
        <span className="fmt-comet fmt-comet-2" />
      </div>

      {/* Above sky, under interactive UI? No — on top of page, pointer-events none,
          normal blend so flashes are visible (header uses screen only on glass). */}
      <SpaceTwinkles count={48} />

      <div className="fmt-page-inner">
      <header className="fmt-head">
        <h1 className="fmt-title-box">Full Moon Token</h1>
        <div className="fmt-head-stack">
          <p className="fmt-kicker">since 2022</p>
          <p className="fmt-tag-box">
            The Full Moon Token is your key. Hold it on Tezos or Base and receive
            new art from Empress Trash every full moon.
          </p>
          <nav className="fmt-links" aria-label="more links">
            <a
              href="https://objkt.com/curations/objkt/empress-trash's-full-moon-token-%2B-airdrops-93a99301"
              target="_blank"
              rel="noopener noreferrer"
            >
              tezos collection
            </a>
            <a
              href="https://opensea.io/collection/empress-trashs-full-moon-token"
              target="_blank"
              rel="noopener noreferrer"
            >
              base collection
            </a>
            <a
              href="https://substrata.info/world/empresstrash/fullmoon"
              target="_blank"
              rel="noopener noreferrer"
            >
              substrataVR gallery
            </a>
          </nav>
        </div>
      </header>

      <section
        ref={cycleRef}
        className="fmt-cycle"
        aria-label="full moon cycle"
        style={
          {
            ["--active-hue" as string]: String(activeHue),
            ["--moon" as string]: `${moonPx}px`,
          } as CSSProperties
        }
      >
        <div className="fmt-stage-wrap">
        <div className="fmt-goddess">
          <Crescent
            side="left"
            hue={activeHue}
            onClick={() => go(-1)}
            label="previous moon"
          />

          <div
            className="fmt-stage"
            style={{ width: moonPx, height: moonPx }}
          >
            <div className="fmt-glow" aria-hidden="true" />
            <div className="fmt-ring" aria-hidden="true" />

            <div
              className="fmt-orbit"
              style={{ transform: `rotate(${ringRotation}deg)` }}
            >
              {orbitItems.map((item) => {
                const isActive = item.id === activeId;
                // angle 0 = top, clockwise. Pixel positions from center.
                const rad = (item.angle * Math.PI) / 180;
                const x = half + Math.sin(rad) * orbitR;
                const y = half - Math.cos(rad) * orbitR;
                const nodeStyle: CSSProperties = {
                  left: `${x.toFixed(2)}px`,
                  top: `${y.toFixed(2)}px`,
                };

                if (item.kind === "key") {
                  const hue = 300;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`fmt-node keystone${isActive ? " active" : ""}`}
                      style={nodeStyle}
                      onClick={() => selectId(item.id)}
                      aria-label="key tokens"
                      aria-pressed={isActive}
                    >
                      <span
                        className="fmt-keystone"
                        style={{
                          borderColor: `hsl(${hue} 70% 58%)`,
                          boxShadow: isActive
                            ? `0 0 0 2px rgba(8,5,14,0.9), 0 0 18px hsl(${hue} 80% 55% / 0.55)`
                            : `0 0 10px hsl(${hue} 70% 50% / 0.35)`,
                        }}
                      />
                    </button>
                  );
                }

                const meta = yearIndex.get(item.group.moonKey) ?? {
                  year: yearFromDate(item.group.date),
                  indexInYear: 0,
                  count: 1,
                };
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`fmt-node${isActive ? " active" : ""}`}
                    style={nodeStyle}
                    onClick={() => selectId(item.id)}
                    aria-label={formatMoonLabel(
                      item.group.date,
                      item.group.moonName,
                    )}
                    aria-pressed={isActive}
                  >
                    <span
                      className="fmt-dot"
                      style={moonDotStyle(
                        meta.year,
                        meta.indexInYear,
                        meta.count,
                        isActive,
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <div className="fmt-core">
              {coreWorks.length > 0 && activeItem && (
                <div
                  className={`fmt-gallery count-${Math.min(coreWorks.length, 3)}`}
                  key={activeId}
                >
                  {coreWorks.map((w) => (
                    <ArtPiece
                      key={w.id}
                      work={w}
                      moonName={
                        activeItem.kind === "key"
                          ? "Key Tokens"
                          : activeItem.group.moonName
                      }
                      date={
                        activeItem.kind === "key" ? "" : activeItem.group.date
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <Crescent
            side="right"
            hue={activeHue}
            onClick={() => go(1)}
            label="next moon"
          />
        </div>

        <div className="fmt-caption" ref={captionRef} aria-live="polite">
          <span className="fmt-caption-text">{caption}</span>
        </div>
        </div>
      </section>
      </div>
    </div>
  );
}
