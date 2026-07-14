'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArcadeGame } from './types';
import { playNavClick, playReloadSound } from './sounds';

export default function ArcadePage() {
  const [games, setGames] = useState<ArcadeGame[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const cartRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/arcade');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load arcade');
        if (!cancelled) {
          setGames(Array.isArray(data.games) ? data.games : []);
          const glowIdx = (data.games as ArcadeGame[]).findIndex((g) => g.id === '37');
          setIndex(glowIdx >= 0 ? glowIdx : 0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load arcade');
          setGames([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = games[index] ?? null;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (games.length === 0) return;
      playNavClick();
      setIndex((i) => (i + dir + games.length) % games.length);
      setFrameKey((k) => k + 1);
    },
    [games.length]
  );

  const reload = useCallback(() => {
    if (games.length === 0) return;
    playReloadSound();
    setFrameKey((k) => k + 1);
  }, [games.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'r' || e.key === 'R') reload();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, reload]);

  // Keep the active cart visible in the select-game strip (arrows / prev-next)
  useEffect(() => {
    const cart = cartRefs.current[index];
    const strip = stripRef.current;
    if (!cart || !strip) return;

    // Only move the strip horizontally — don't scroll the page
    const cartLeft = cart.offsetLeft;
    const cartWidth = cart.offsetWidth;
    const stripWidth = strip.clientWidth;
    const target = cartLeft - stripWidth / 2 + cartWidth / 2;
    const max = strip.scrollWidth - stripWidth;
    const next = Math.max(0, Math.min(target, max));

    strip.scrollTo({ left: next, behavior: 'smooth' });
  }, [index, games.length]);

  const counter = useMemo(() => {
    if (!games.length) return '00 / 00';
    return `${String(index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}`;
  }, [games.length, index]);

  return (
    <div className="arcade-page">
      <div className="arcade-machine">
        <header className="arcade-canopy">
          <div className="arcade-canopy-lights" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="arcade-bulb" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <div className="arcade-marquee">
            <span className="arcade-marquee-text">onchain arcade</span>
            <span className="arcade-marquee-sub">experimental p5.js fully onchain ethereum artworks</span>
          </div>
        </header>

        <div className="arcade-body">
          <section className="arcade-stage" aria-label="Game screen">
            <div className="arcade-bezel">
              <div className="arcade-screen">
                {loading && (
                  <div className="arcade-status">
                    <p className="arcade-blink">INSERT COIN</p>
                    <p className="arcade-muted">booting cabinet…</p>
                  </div>
                )}
                {!loading && error && (
                  <div className="arcade-status">
                    <p>SIGNAL LOST</p>
                    <p className="arcade-muted">{error}</p>
                  </div>
                )}
                {!loading && !error && !current && (
                  <div className="arcade-status">
                    <p>NO GAMES LOADED</p>
                  </div>
                )}
                {!loading && current && (
                  <iframe
                    key={`${current.id}-${frameKey}`}
                    className="arcade-frame"
                    src={current.animationUrl}
                    title={current.name}
                    sandbox="allow-scripts allow-pointer-lock allow-same-origin"
                    allow="autoplay; fullscreen"
                  />
                )}
                <div className="arcade-scanlines" aria-hidden="true" />
                <div className="arcade-crt-vignette" aria-hidden="true" />
              </div>
            </div>
          </section>

          <section className="arcade-console" aria-label="Controls">
            {/* Fixed-size info box — same for every game */}
            <div className="arcade-plaque">
              <div className="arcade-plaque-row">
                <span className="arcade-led">{counter}</span>
                <span className="arcade-token-chip">#{current?.id ?? '—'}</span>
              </div>
              <div className="arcade-plaque-mid">
                <h1 className="arcade-title">{current?.name || '—'}</h1>
                <p className="arcade-desc">{current?.description || 'select a game below'}</p>
              </div>
              <div className="arcade-plaque-actions">
                {current ? (
                  <>
                    <a
                      href={current.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="arcade-listing-link"
                    >
                      networked
                    </a>
                    <a
                      href={current.openSeaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="arcade-listing-link"
                    >
                      open sea
                    </a>
                  </>
                ) : (
                  <span className="arcade-listing-link" style={{ visibility: 'hidden' }}>
                    networked
                  </span>
                )}
              </div>
            </div>

            <div className="arcade-controls-stack">
              {games.length > 0 && (
                <div className="arcade-cart-bay">
                  <div className="arcade-cart-label">select game</div>
                  <div className="arcade-strip" role="list" ref={stripRef}>
                    {games.map((g, i) => (
                      <button
                        key={g.id}
                        type="button"
                        role="listitem"
                        ref={(el) => {
                          cartRefs.current[i] = el;
                        }}
                        className={`arcade-cart${i === index ? ' active' : ''}`}
                        onClick={() => {
                          if (i !== index) playNavClick();
                          setIndex(i);
                          setFrameKey((k) => k + 1);
                        }}
                        title={g.name}
                      >
                        {g.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.image} alt="" />
                        ) : (
                          <span className="arcade-cart-fallback">{g.id}</span>
                        )}
                        <span className="arcade-cart-name">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="arcade-nav-hud">
                <button
                  type="button"
                  className="arcade-stick"
                  onClick={() => go(-1)}
                  disabled={!games.length}
                  aria-label="Previous game"
                >
                  <span className="arcade-stick-ball">◀</span>
                  <span className="arcade-stick-label">prev</span>
                </button>

                <button
                  type="button"
                  className="arcade-reload"
                  onClick={reload}
                  disabled={!games.length}
                  aria-label="Reload game"
                >
                  reload
                </button>

                <button
                  type="button"
                  className="arcade-stick"
                  onClick={() => go(1)}
                  disabled={!games.length}
                  aria-label="Next game"
                >
                  <span className="arcade-stick-ball">▶</span>
                  <span className="arcade-stick-label">next</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="arcade-base" aria-hidden="true" />
      </div>
    </div>
  );
}
