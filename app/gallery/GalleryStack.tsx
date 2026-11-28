"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CollapsibleCopy from "@/app/components/CollapsibleCopy";
import SpaceTwinkles, { TwinkleRule } from "@/app/components/SpaceTwinkles";
import { galleries as galleryConfig } from "@/lib/gallery/galleries";
import type { GalleryPayload, GalleryPlatform, GalleryWork } from "@/lib/gallery/types";
import "./gallery.css";

const MARKET_LABEL: Record<GalleryPlatform, string> = {
  superrare: "view on superrare",
  manifold: "view on manifold",
  transient: "view on transient",
  objkt: "view on objkt",
  ord: "view on ord",
};

function wrapIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

function ratioOf(work: GalleryWork, measured: Record<string, number>): number {
  if (work.width && work.height) return work.width / work.height;
  return measured[`${work.tokenId}`] || 1;
}

type Slide = { work: GalleryWork; offset: number; i: number };
type Box = { x: number; w: number; h: number };

function placeDeck(
  slides: Slide[],
  stageW: number,
  stageH: number,
  measured: Record<string, number>,
): Map<number, Box> {
  const map = new Map<number, Box>();
  const center = slides.find((slide) => slide.offset === 0);
  if (!center || stageW < 40 || stageH < 40) return map;
  const pad = 10;
  const ratio = Math.max(0.35, ratioOf(center.work, measured));
  let h = stageH * 0.92;
  let w = h * ratio;
  const maxW = stageW * 0.7;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  if (h > stageH * 0.94) {
    h = stageH * 0.94;
    w = Math.min(h * ratio, maxW);
    h = w / ratio;
  }
  map.set(0, { x: 0, w, h });

  const half = stageW / 2;
  const leftover = Math.max(0, half - w / 2 - pad);
  const stepGuess = h * 0.13;

  const cardAt = (slide: Slide) => {
    const abs = Math.abs(slide.offset);
    let cardH = h * (0.786 - abs * 0.12);
    let cardW = cardH * Math.max(0.35, ratioOf(slide.work, measured));
    const limit = stageW - pad * 2;
    if (cardW > limit) {
      cardW = limit;
      cardH = cardW / Math.max(0.35, ratioOf(slide.work, measured));
    }
    return { w: cardW, h: cardH };
  };

  for (const dir of [-1, 1]) {
    const group = slides
      .filter((slide) => Math.sign(slide.offset) === dir)
      .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
    if (!group.length) continue;
    const first = cardAt(group[0]);
    const peek = Math.min(first.w * 0.36, leftover);
    const base = w / 2 + peek - first.w / 2;
    let count = 1;
    for (let k = 2; k <= group.length; k += 1) {
      const size = cardAt(group[k - 1]);
      const shift = base + (k - 1) * stepGuess;
      if (shift + size.w / 2 <= half - pad && shift - size.w / 2 >= -half + pad) count = k;
      else break;
    }
    const last = cardAt(group[count - 1]);
    const maxShift = half - pad - last.w / 2;
    const step = count > 1 ? Math.max(8, Math.min(stepGuess, (maxShift - base) / (count - 1))) : stepGuess;
    for (let k = 1; k <= count; k += 1) {
      const size = cardAt(group[k - 1]);
      const shift = base + (k - 1) * step;
      map.set(group[k - 1].offset, { x: dir * shift, w: size.w, h: size.h });
    }
  }
  return map;
}

function marketCopy(platform: GalleryPlatform, work: GalleryWork): { label: string; price: string | null } {
  if (work.minting && work.price) {
    if (platform === "transient") return { label: "mint on transient", price: work.price };
    if (platform === "objkt") return { label: "mint on objkt", price: work.price };
  }
  if (work.forSale && work.price) {
    if (platform === "superrare") return { label: "buy on superrare", price: work.price };
    if (platform === "objkt") return { label: "buy on objkt", price: work.price };
    if (platform === "ord") return { label: "buy on ord", price: work.price };
    if (platform === "transient") return { label: "mint on transient", price: work.price };
  }
  return { label: MARKET_LABEL[platform], price: null };
}

type MarketItem = {
  tokenId: string;
  forSale: boolean;
  price: string | null;
  owner: string | null;
};

function withMarket(works: GalleryWork[], market: MarketItem[] | undefined): GalleryWork[] {
  if (!market?.length) return works;
  const byId = new Map(market.map((item) => [item.tokenId, item]));
  return works.map((work) => {
    const item = byId.get(work.tokenId);
    if (!item) return work;
    return { ...work, forSale: item.forSale, price: item.price, owner: item.owner };
  });
}

function WorkMedia({
  work,
  onRatio,
}: {
  work: GalleryWork;
  onRatio: (tokenId: string, ratio: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = work.urls[idx] ?? "";

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const start = () => {
      el.play().catch(() => {});
    };
    if (el.readyState >= 2) start();
    else el.addEventListener("loadeddata", start, { once: true });
    return () => el.removeEventListener("loadeddata", start);
  }, [src]);

  const advance = useCallback(() => {
    setIdx((n) => (n + 1 < work.urls.length ? n + 1 : n));
  }, [work.urls.length]);

  const noteSize = (width: number, height: number) => {
    if (work.width && work.height) return;
    if (width > 0 && height > 0) onRatio(work.tokenId, width / height);
  };

  if (!src) return null;

  if (work.kind === "video") {
    return (
      <video
        key={src}
        ref={videoRef}
        src={src}
        poster={work.poster[0]}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onError={advance}
        onLoadedMetadata={(e) => noteSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={work.name}
      draggable={false}
      onError={advance}
      onLoad={(e) => noteSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
    />
  );
}

function GalleryFan({ gallery, market }: { gallery: GalleryPayload; market?: MarketItem[] }) {
  const [index, setIndex] = useState(0);
  const [hot, setHot] = useState(false);
  const works = useMemo(() => withMarket(gallery.works, market), [gallery.works, market]);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const drag = useRef({ x: 0, active: false, swiped: false });

  const onRatio = useCallback((tokenId: string, ratio: number) => {
    setMeasured((prev) => (prev[tokenId] === ratio ? prev : { ...prev, [tokenId]: ratio }));
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [works.length]);

  const safeIndex = works.length ? Math.min(index, works.length - 1) : 0;
  const go = useCallback(
    (next: number) => {
      if (!works.length) return;
      setIndex(wrapIndex(next, works.length));
    },
    [works.length],
  );

  useEffect(() => {
    if (!hot) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(safeIndex - 1);
      if (e.key === "ArrowRight") go(safeIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, hot, safeIndex]);

  const slides = useMemo(() => {
    if (!works.length) return [];
    const maxSide = Math.min(3, Math.max(0, Math.floor((works.length - 1) / 2)));
    const out: Slide[] = [{ work: works[safeIndex], offset: 0, i: safeIndex }];
    for (let o = 1; o <= maxSide; o += 1) {
      const prev = wrapIndex(safeIndex - o, works.length);
      const next = wrapIndex(safeIndex + o, works.length);
      out.push({ work: works[prev], offset: -o, i: prev });
      if (next !== prev) out.push({ work: works[next], offset: o, i: next });
    }
    return out;
  }, [works, safeIndex]);

  const placed = useMemo(
    () => placeDeck(slides, stage.w, stage.h, measured),
    [slides, stage, measured],
  );

  const current = works[safeIndex];
  const listing = current ? marketCopy(gallery.platform, current) : null;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, active: true, swiped: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    if (Math.abs(e.clientX - drag.current.x) > 48) drag.current.swiped = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    drag.current.active = false;
    if (Math.abs(dx) > 48) {
      drag.current.swiped = true;
      go(dx > 0 ? safeIndex - 1 : safeIndex + 1);
    }
  };

  if (gallery.error) {
    return (
      <section className="gallery-block" aria-label={gallery.title}>
        <header>
          <h2>{gallery.title}</h2>
          <CollapsibleCopy className="gallery-desc" text={gallery.description} />
        </header>
        <p className="gallery-empty">{gallery.error}</p>
      </section>
    );
  }

  return (
    <section
      className="gallery-block"
      aria-label={gallery.title}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
    >
      <header>
        <h2>{gallery.title}</h2>
        <CollapsibleCopy className="gallery-desc" text={gallery.description} />
      </header>
      <div
        className="gallery-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current.active = false;
        }}
        onClickCapture={(e) => {
          if (!drag.current.swiped) return;
          e.preventDefault();
          e.stopPropagation();
          drag.current.swiped = false;
        }}
      >
        <div className="gallery-cover">
          {slides.map(({ work, offset, i }) => {
            const box = placed.get(offset);
            if (!box) return null;
            const center = offset === 0;
            const style = {
              ["--o" as string]: offset,
              ["--abs" as string]: Math.abs(offset),
              ["--x" as string]: `${box.x}px`,
              ["--w" as string]: `${box.w}px`,
              ["--h" as string]: `${box.h}px`,
            };
            return (
              <button
                key={`${work.tokenId}-${offset}`}
                type="button"
                className={`gallery-slide${center ? " is-center" : " is-side"}`}
                style={style}
                aria-label={center ? work.name : `show ${work.name}`}
                onClick={() => {
                  if (drag.current.swiped) return;
                  if (!center) go(i);
                }}
              >
                <WorkMedia key={`${work.tokenId}:${work.urls[0] ?? ""}`} work={work} onRatio={onRatio} />
              </button>
            );
          })}
        </div>
      </div>
      {current && listing ? (
        <div className="gallery-now">
          <strong>{current.name}</strong>
          {current.edition ? <span className="gallery-price">{current.edition}</span> : null}
          {current.owner ? (
            <span className="gallery-price">
              {current.owner === "in the vault" ? "in the vault" : `owned by ${current.owner}`}
            </span>
          ) : null}
          {listing.price ? <span className="gallery-price">{listing.price}</span> : null}
          <a className="gallery-market" href={current.url} target="_blank" rel="noopener noreferrer">
            {listing.label}
          </a>
        </div>
      ) : null}
    </section>
  );
}

export default function GalleryStack() {
  const [byId, setById] = useState<Record<string, GalleryPayload>>({});
  const [market, setMarket] = useState<Record<string, MarketItem[]>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    for (const config of galleryConfig) {
      fetch(`/api/gallery?id=${config.id}`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("gallery");
          return response.json() as Promise<{ gallery?: GalleryPayload }>;
        })
        .then((payload) => {
          if (cancelled || !payload.gallery) return;
          const gallery = payload.gallery;
          setById((prev) => ({ ...prev, [config.id]: gallery }));
          if (gallery.platform !== "superrare" || !gallery.works.length) return;
          const tokens = gallery.works.map((work) => work.tokenId).join(",");
          fetch(`/api/gallery/market?id=${config.id}&tokens=${tokens}`, { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .then((body: { items?: MarketItem[] } | null) => {
              if (!cancelled && body?.items) setMarket((prev) => ({ ...prev, [config.id]: body.items as MarketItem[] }));
            })
            .catch(() => {});
        })
        .catch(() => {
          if (!cancelled) setFailed((prev) => ({ ...prev, [config.id]: true }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="gallery-pane">
      <div className="gallery-sky" aria-hidden="true">
        <SpaceTwinkles count={48} />
      </div>
      <div className="gallery-scroll">
      {galleryConfig.map((config) => {
        const gallery = byId[config.id];
        const fan = !gallery ? (
            <section key={config.id} className="gallery-block" aria-label={config.title}>
              <header>
                <h2>{config.title}</h2>
                <CollapsibleCopy className="gallery-desc" text={config.description} />
              </header>
              <p className="gallery-empty">{failed[config.id] ? "This gallery didn’t load." : "Loading…"}</p>
            </section>
        ) : (
          <GalleryFan key={config.id} gallery={gallery} market={market[config.id]} />
        );
        return (
          <Fragment key={config.id}>
            <TwinkleRule />
            {fan}
          </Fragment>
        );
      })}
      </div>
    </div>
  );
}
