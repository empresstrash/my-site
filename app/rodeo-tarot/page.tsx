"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COLLECTION_URL,
  SPREADS,
  drawReading,
  type DrawnCard,
  type SpreadId,
  type TarotCard,
} from "./data";
import "./rodeo-tarot.css";

function CardImage({
  src,
  fallback,
  alt,
  reversed,
  onOpen,
}: {
  src: string;
  fallback?: string;
  alt: string;
  reversed: boolean;
  onOpen?: () => void;
}) {
  const [url, setUrl] = useState(src);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setUrl(src);
    setTriedFallback(false);
  }, [src]);

  return (
    <button
      type="button"
      className={`rt-card-frame${reversed ? " reversed" : ""}`}
      onClick={onOpen}
      aria-label={`${alt} — click to enlarge`}
    >
      <span
        className={`rt-orient-badge${reversed ? " is-reversed" : ""}`}
        aria-hidden="true"
      >
        {reversed ? "Reversed" : "Upright"}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => {
          if (!triedFallback && fallback && fallback !== url) {
            setTriedFallback(true);
            setUrl(fallback);
          }
        }}
      />
    </button>
  );
}

type ZoomState = {
  card: TarotCard;
  reversed: boolean;
};

export default function RodeoTarotPage() {
  const [spreadId, setSpreadId] = useState<SpreadId>("three");
  const [questionDraft, setQuestionDraft] = useState("");
  const [shownQuestion, setShownQuestion] = useState<string | null>(null);
  const [reading, setReading] = useState<DrawnCard[] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [zoom, setZoom] = useState<ZoomState | null>(null);

  const spread = SPREADS.find((s) => s.id === spreadId) ?? SPREADS[0];

  useEffect(() => {
    if (!reading || reading.length === 0) {
      setRevealed(0);
      return;
    }
    setRevealed(0);
    const timers: number[] = [];
    reading.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          setRevealed((n) => Math.max(n, i + 1));
        }, 180 + i * 320),
      );
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [reading]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom]);

  const onDraw = useCallback(() => {
    if (drawing) return;
    const q = questionDraft.trim();
    // Set echo + clear input immediately (same tick) so the question is kept
    // in "You asked" while the text box empties.
    setShownQuestion(q.length > 0 ? q : null);
    setQuestionDraft("");
    setDrawing(true);
    setZoom(null);
    window.setTimeout(() => {
      setReading(drawReading(spread));
      setDrawing(false);
    }, 280);
  }, [drawing, questionDraft, spread]);

  const onClear = useCallback(() => {
    setReading(null);
    setShownQuestion(null);
    setRevealed(0);
    setQuestionDraft("");
    setZoom(null);
  }, []);

  return (
    <div className="rt-page">
      <div className="rt-glow" aria-hidden="true" />
      <div className="rt-inner">
        <header className="rt-header">
          <h1 className="rt-title">Rodeo Tarot</h1>
          <p className="rt-lede">
            Art from Empress Trash&apos;s Rodeo Series. Major Arcana Only.
          </p>
          <a
            className="rt-collection-link"
            href={COLLECTION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            View collection on OpenSea ↗
          </a>
        </header>

        <div
          className={`rt-setup-row${shownQuestion ? " has-echo" : ""}`}
        >
          <section className="rt-panel" aria-label="Reading setup">
            <div className="rt-panel-row">
              <span className="rt-panel-label">Spread</span>
              <div className="rt-spreads" role="radiogroup" aria-label="Choose spread">
                {SPREADS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={spreadId === s.id}
                    className={`rt-spread-btn${spreadId === s.id ? " active" : ""}`}
                    onClick={() => setSpreadId(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rt-panel-row">
              <label className="rt-panel-label" htmlFor="rt-question">
                Question
              </label>
              <div className="rt-question-shell">
                <input
                  id="rt-question"
                  type="text"
                  className="rt-question-input"
                  placeholder="optional"
                  value={questionDraft}
                  onChange={(e) => setQuestionDraft(e.target.value)}
                  maxLength={280}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="rt-actions">
              <button
                type="button"
                className="rt-draw"
                onClick={onDraw}
                disabled={drawing}
              >
                {drawing ? "…" : reading ? "Draw again" : "Draw"}
              </button>
              {reading && (
                <button type="button" className="rt-clear" onClick={onClear}>
                  Clear
                </button>
              )}
            </div>
          </section>

          {shownQuestion ? (
            <aside className="rt-question-echo" aria-live="polite">
              <span className="rt-question-echo-label">You asked</span>
              <p>{shownQuestion}</p>
            </aside>
          ) : null}
        </div>

        {!reading && (
          <div className="rt-empty" aria-hidden="true">
            <div className="rt-deck-hint">
              <span />
              <span />
              <span />
            </div>
            Focus, shuffle, pull — 22 Major Arcana, upright or reversed.
          </div>
        )}

        {reading && (
          <section
            className="rt-reading"
            aria-live="polite"
            aria-label="Your reading"
          >
            <div
              className={`rt-cards${
                reading.length > 1 ? " rt-cards-three" : ""
              }`}
            >
              {reading.map((drawn, i) => {
                const { card, reversed, position } = drawn;
                const meaning = reversed ? card.reversed : card.upright;
                const orient = reversed ? "reversed" : "upright";
                return (
                  <article
                    key={`${card.tokenId}-${i}-${reading.map((d) => d.card.tokenId + (d.reversed ? "r" : "u")).join("-")}`}
                    className={`rt-card-slot${
                      i < revealed ? " revealed" : ""
                    }`}
                  >
                    {reading.length > 1 && (
                      <div className="rt-position">{position}</div>
                    )}
                    <CardImage
                      src={card.image}
                      fallback={card.imageFallback}
                      alt={`${card.name} (${orient})`}
                      reversed={reversed}
                      onOpen={() => setZoom({ card, reversed })}
                    />
                    <div className="rt-card-meta">
                      <h2 className="rt-card-name">
                        #{card.number} {card.name}
                      </h2>
                      <p className="rt-meaning">{meaning}</p>
                      <a
                        className="rt-os-link"
                        href={card.opensea}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        opensea
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>

          </section>
        )}
      </div>

      {zoom && (
        <div
          className="rt-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={`${zoom.card.name} enlarged`}
          onClick={() => setZoom(null)}
        >
          <div
            className="rt-zoom-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="rt-zoom-close"
              onClick={() => setZoom(null)}
              aria-label="Close enlarged card"
            >
              ×
            </button>
            <div
              className={`rt-zoom-frame${zoom.reversed ? " reversed" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoom.card.image}
                alt={`${zoom.card.name}${zoom.reversed ? " reversed" : ""}`}
                onError={(e) => {
                  const fb = zoom.card.imageFallback;
                  if (fb && e.currentTarget.src !== fb) {
                    e.currentTarget.src = fb;
                  }
                }}
              />
            </div>
            <p className="rt-zoom-caption">
              #{zoom.card.number} {zoom.card.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
