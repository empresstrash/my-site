"use client";

import type { ReactNode } from "react";

/**
 * Site-wide glass sparkle layer — same as the header / side menu.
 * Uses globals.css: .glass-shimmer, .glass-sparkle, @keyframes glassSparkleTwinkle
 */
export default function GlassSparkles({
  count = 52,
  className = "",
}: {
  count?: number;
  className?: string;
}): ReactNode {
  return (
    <div
      className={`glass-shimmer${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="glass-sparkle"
          style={{
            left: `${(i * 37 + 11) % 97}%`,
            top: `${(i * 53 + 7) % 96}%`,
            animationDelay: `${((i * 0.19) % 4.2).toFixed(2)}s`,
            animationDuration: `${(1.6 + (i % 6) * 0.38).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
