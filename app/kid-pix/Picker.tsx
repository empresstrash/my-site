"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Studio from "./Studio";
import { readHands, type HandsApi } from "./hands";

type Edition = "mod" | "classic";

const CLASSIC_SRC = "https://kidpix.app/";
// The 1.0 canvas is fixed at 1920×1200, with the tool column beside it.
const CLASSIC_W = 1980;
const CLASSIC_H = 1260;

export default function Picker() {
  const router = useRouter();
  const params = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const handsRef = useRef<HandsApi | null>(null);
  const grabRef = useRef(false);
  const [grab, setGrab] = useState(false);
  const raw = params.get("edition");
  const vr = params.has("vr");
  const edition: Edition = raw === "mod" || raw === "temu" ? "mod" : "classic";

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ua = navigator.userAgent || "";
    if (/Quest|Oculus|Mobile VR/i.test(ua)) root.classList.add("kp-vr");
  }, []);

  useEffect(() => {
    let frame = 0;
    let prevA = false;
    let lastSize = 0;
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const reading = readHands(grabRef.current);
      if (reading.grabToggle && !prevA) {
        grabRef.current = !grabRef.current;
        setGrab(grabRef.current);
        handsRef.current?.setGrabbed(grabRef.current);
      }
      prevA = reading.grabToggle;
      const api = handsRef.current;
      if (!api) return;
      if (reading.zoom) api.zoomBy(1 + reading.zoom * 0.018);
      if (reading.panX || reading.panY) api.panBy(reading.panX * 10, reading.panY * 10);
      if (reading.size && now - lastSize > 90) {
        lastSize = now;
        api.nudgeSize(reading.size > 0 ? 2 : -2);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function choose(next: Edition) {
    grabRef.current = false;
    setGrab(false);
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("edition", next);
    const query = nextParams.toString();
    router.replace(query ? `/kid-pix?${query}` : "/kid-pix", { scroll: false });
  }

  function toggleGrab() {
    grabRef.current = !grabRef.current;
    setGrab(grabRef.current);
    handsRef.current?.setGrabbed(grabRef.current);
  }

  function onGrabbed(on: boolean) {
    grabRef.current = on;
    setGrab(on);
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
        <div className="kp-hands" role="group" aria-label="Canvas controls">
          <button type="button" disabled={edition === "classic"} title={edition === "classic" ? "Zoom and grab are on mod tools, so the 1.0 tools stay still" : "Zoom in"} onClick={() => handsRef.current?.zoomBy(1.25)}>
            zoom in
          </button>
          <button type="button" disabled={edition === "classic"} title={edition === "classic" ? "Zoom and grab are on mod tools, so the 1.0 tools stay still" : "Zoom out"} onClick={() => handsRef.current?.zoomBy(0.8)}>
            zoom out
          </button>
          <button type="button" disabled={edition === "classic"} title={edition === "classic" ? "Zoom and grab are on mod tools, so the 1.0 tools stay still" : "Grab the drawing"} aria-pressed={grab} className={grab ? "is-on" : ""} onClick={toggleGrab}>
            grab
          </button>
          <button type="button" disabled={edition === "classic"} title={edition === "classic" ? "Brush and stamp size is in mod tools" : "Bigger"} onClick={() => handsRef.current?.nudgeSize(4)}>
            bigger
          </button>
          <button type="button" disabled={edition === "classic"} title={edition === "classic" ? "Brush and stamp size is in mod tools" : "Smaller"} onClick={() => handsRef.current?.nudgeSize(-4)}>
            smaller
          </button>
        </div>
      </div>
      <div className="kp-pane">
        {edition === "classic" ? (
          <ClassicFrame handsRef={handsRef} />
        ) : (
          <Studio variant="mod" handsRef={handsRef} onGrabbed={onGrabbed} />
        )}
      </div>
    </div>
  );
}

function ClassicFrame({ handsRef }: { handsRef: RefObject<HandsApi | null> }) {
  const clipRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fitRef = useRef(1);

  function applyFrame() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // The 1.0 tools and drawing are one window, so this only fits it. Zoom stays on mod tools.
    iframe.style.transform = `scale(${fitRef.current})`;
  }

  useLayoutEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    const fit = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      fitRef.current = Math.min(rect.width / CLASSIC_W, rect.height / CLASSIC_H);
      applyFrame();
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    const frame = window.requestAnimationFrame(fit);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const api: HandsApi = {
      zoomBy() {},
      panBy() {},
      nudgeSize() {},
      setGrabbed() {},
    };
    handsRef.current = api;
    return () => {
      if (handsRef.current === api) handsRef.current = null;
    };
  });

  return (
    <div className="kp-classic-clip" ref={clipRef}>
      <iframe
        className="kp-classic"
        title="Kid Pix 1.0"
        src={CLASSIC_SRC}
        ref={iframeRef}
        style={{ width: CLASSIC_W, height: CLASSIC_H }}
        allow="autoplay; fullscreen; clipboard-write"
      />
    </div>
  );
}
