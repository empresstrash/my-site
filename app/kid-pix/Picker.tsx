"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Studio from "./Studio";

type Edition = "mod" | "classic";

const CLASSIC_SRC = "https://kidpix.app/";
// The 1.0 canvas is fixed at 1920×1200, with the tool column beside it.
const CLASSIC_W = 1980;
const CLASSIC_H = 1260;

export default function Picker() {
  const router = useRouter();
  const params = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const raw = params.get("edition");
  const vr = params.has("vr");
  const edition: Edition = raw === "mod" || raw === "temu" ? "mod" : "classic";

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ua = navigator.userAgent || "";
    if (/Quest|Oculus|Mobile VR/i.test(ua)) root.classList.add("kp-vr");
  }, []);

  function choose(next: Edition) {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("edition", next);
    const query = nextParams.toString();
    router.replace(query ? `/kid-pix?${query}` : "/kid-pix", { scroll: false });
  }

  return (
    <div className={vr ? "kp kp-vr" : "kp"} ref={rootRef}>
      <div className="kp-switch" role="tablist" aria-label="Kid Pix tool set">
        <button type="button" role="tab" aria-selected={edition === "classic"} className={edition === "classic" ? "is-on" : ""} onClick={() => choose("classic")}>
          1.0
        </button>
        <button type="button" role="tab" aria-selected={edition === "mod"} className={edition === "mod" ? "is-on" : ""} onClick={() => choose("mod")}>
          mod tools
        </button>
      </div>
      <div className="kp-pane">{edition === "classic" ? <ClassicFrame /> : <Studio variant="mod" />}</div>
    </div>
  );
}

function ClassicFrame() {
  const clipRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    const fit = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      setScale(Math.min(rect.width / CLASSIC_W, rect.height / CLASSIC_H));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    const frame = window.requestAnimationFrame(fit);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="kp-classic-clip" ref={clipRef}>
      <iframe
        className="kp-classic"
        title="Kid Pix 1.0"
        src={CLASSIC_SRC}
        style={{ width: CLASSIC_W, height: CLASSIC_H, transform: `scale(${scale})` }}
        allow="autoplay; fullscreen; clipboard-write"
      />
    </div>
  );
}
