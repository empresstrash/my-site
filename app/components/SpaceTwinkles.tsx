"use client";

import { useEffect, useRef } from "react";
import "./space-twinkles.css";

function useTwinkle(count: number) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const stars = Array.from(root.querySelectorAll<HTMLElement>(".space-twinkle"));
    if (!stars.length) return;

    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0;
      for (let i = 0; i < stars.length; i++) {
        const dur = 3500 + (i % 6) * 350;
        const delay = (i * 420) % 4200;
        const phase = (((t - delay) % dur) + dur) % dur;
        const u = phase / dur;
        const peak = Math.exp(-Math.pow((u - 0.5) * 6, 2));
        const el = stars[i];
        el.style.opacity = String(0.2 + 0.8 * peak);
        el.style.transform = `scale(${0.85 + 0.55 * peak})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return rootRef;
}

export function TwinkleRule({ count = 15 }: { count?: number }) {
  const rootRef = useTwinkle(count);

  return (
    <div className="twinkle-rule" ref={rootRef} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="space-twinkle" style={{ opacity: 0.25 }} />
      ))}
    </div>
  );
}

export default function SpaceTwinkles({ count = 48 }: { count?: number }) {
  const rootRef = useTwinkle(count);

  return (
    <div className="space-twinkles" ref={rootRef} aria-hidden="true">
      <div className="space-twinkle-field">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="space-twinkle"
            style={{
              left: `${(i * 37 + 11) % 97}%`,
              top: `${(i * 53 + 7) % 96}%`,
              opacity: 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}
