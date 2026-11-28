"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryPayload, GalleryPlatform, GalleryWork } from "@/lib/gallery/types";
import "./gallery.css";

const MARKET_LABEL: Record<GalleryPlatform, string> = {
  superrare: "view on superrare",
  manifold: "view on manifold",
  transient: "view on transient",
  objkt: "view on objkt",
};

function wrapIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

function ratioOf(work: GalleryWork, measured: Record<string, number>): number {
  if (work.width && work.height) return work.width / work.height;
  return measured[`${work.tokenId}`] || 1;
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

function GalleryFan({ gallery }: { gallery: GalleryPayload }) {
  const works = gallery.works;
  const [index, setIndex] = useState(0);
  const [hot, setHot] = useState(false);
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

  const side = stage.w < 640 ? 1 : stage.w < 980 ? 2 : 3;
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
    const out: Array<{ work: GalleryWork; offset: number; i: number }> = [
      { work: works[safeIndex], offset: 0, i: safeIndex },
    ];
    let left = 0;
    let right = 0;
    const place = (i: number, prefer: "left" | "right") => {
      if (prefer === "left" && left < side) {
        left += 1;
        out.push({ work: works[i], offset: -left, i });
        return;
      }
      if (prefer === "right" && right < side) {
        right += 1;
        out.push({ work: works[i], offset: right, i });
        return;
      }
      if (left < side) {
        left += 1;
        out.push({ work: works[i], offset: -left, i });
      } else if (right < side) {
        right += 1;
        out.push({ work: works[i], offset: right, i });
      }
    };
    for (let n = 1; n < works.length && (left < side || right < side); n += 1) {
      const newer = safeIndex - n;
      const older = safeIndex + n;
      if (newer >= 0) place(newer, "left");
      if (older < works.length && (left < side || right < side)) place(older, "right");
    }
    return out;
  }, [works, safeIndex, side]);

  const placed = useMemo(() => {
    const map = new Map<number, { x: number; w: number; h: number }>();
    const center = slides.find((slide) => slide.offset === 0);
    if (!center || stage.w < 40 || stage.h < 40) return map;
    const ratio = ratioOf(center.work, measured);
    let h = stage.h * 0.9;
    let w = h * ratio;
    const maxW = stage.w * (stage.w < 720 ? 0.78 : 0.56);
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    map.set(0, { x: 0, w, h });
    const scales = [0.7, 0.54, 0.4];
    for (const slide of slides) {
      if (slide.offset === 0) continue;
      const abs = Math.abs(slide.offset);
      const scale = scales[abs - 1] ?? 0.34;
      const r = ratioOf(slide.work, measured);
      const sh = h * scale;
      const sw = sh * r;
      const step = Math.max(72, sw * 0.38);
      const x = Math.sign(slide.offset) * (w / 2 + sw * 0.08 + (abs - 1) * step);
      map.set(slide.offset, { x, w: sw, h: sh });
    }
    return map;
  }, [slides, stage, measured]);

  const current = works[safeIndex];

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
          <p className="gallery-desc">{gallery.description}</p>
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
        <p className="gallery-desc">{gallery.description}</p>
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
          {slides.map(({ work, offset }) => {
            const box = placed.get(offset);
            const center = offset === 0;
            const style = {
              ["--o" as string]: offset,
              ["--abs" as string]: Math.abs(offset),
              ["--x" as string]: `${box?.x ?? 0}px`,
              ["--w" as string]: `${box?.w ?? 0}px`,
              ["--h" as string]: `${box?.h ?? 0}px`,
            };
            return (
              <a
                key={`${work.tokenId}-${offset}`}
                className={`gallery-slide${center ? " is-center" : " is-side"}`}
                style={style}
                href={work.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${work.name}, ${MARKET_LABEL[gallery.platform]}`}
              >
                <WorkMedia key={`${work.tokenId}:${work.urls[0] ?? ""}`} work={work} onRatio={onRatio} />
              </a>
            );
          })}
        </div>
      </div>
      {current ? (
        <div className="gallery-now">
          <strong>{current.name}</strong>
          <a className="gallery-market" href={current.url} target="_blank" rel="noopener noreferrer">
            {MARKET_LABEL[gallery.platform]}
          </a>
        </div>
      ) : null}
    </section>
  );
}

export default function GalleryStack() {
  const [galleries, setGalleries] = useState<GalleryPayload[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gallery", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("gallery");
        return response.json() as Promise<{ galleries?: GalleryPayload[] }>;
      })
      .then((payload) => {
        if (!cancelled) setGalleries(Array.isArray(payload.galleries) ? payload.galleries : []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <p className="gallery-status">The gallery didn’t load.</p>;
  }
  if (!galleries) {
    return <p className="gallery-status">Loading the gallery…</p>;
  }
  if (!galleries.length) {
    return <p className="gallery-status">No galleries yet.</p>;
  }

  return (
    <div className="gallery-pane">
      {galleries.map((gallery) => (
        <GalleryFan key={gallery.id} gallery={gallery} />
      ))}
    </div>
  );
}
