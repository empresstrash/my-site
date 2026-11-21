"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readHands, type HandsApi } from "./hands";

const TOOLS = [
  ["save", "Save", "kp-m_27.png"],
  ["pencil", "Wacky Pencil", "kp-m_28.png"],
  ["line", "Line", "kp-m_29.png"],
  ["square", "Rectangle", "kp-m_30.png"],
  ["circle", "Oval", "kp-m_31.png"],
  ["brush", "Wacky Brush", "kp-m_32.png"],
  ["jumble", "Electric Mixer", "kp-m_33.png"],
  ["flood", "Paint Can", "kp-m_34.png"],
  ["eraser", "Eraser", "kp-m_35.png"],
  ["alphabet", "Text", "kp-m_36.png"],
  ["stamp", "Rubber Stamps", "kp-m_37.png"],
  ["truck", "Moving Van", "kp-m_38.png"],
  ["undo", "The Undo Guy", "kp-m_39.png"],
] as const;

declare global {
  interface Window {
    init_kiddo_paint?: () => void;
    init_mods?: () => void;
    kpView?: HandsApi & { setSize: (value: number) => void };
    __kpBooted?: boolean;
    __kpModQueued?: boolean;
  }
}

export default function Desk() {
  const params = useSearchParams();
  const vr = params.has("vr");
  const grabRef = useRef(false);
  const [grab, setGrab] = useState(false);

  useEffect(() => {
    const boot = () => {
      if (window.__kpBooted) return;
      window.__kpBooted = true;
      window.init_kiddo_paint?.();
      window.init_mods?.();
    };
    const loadMod = () => {
      if (window.__kpBooted || window.__kpModQueued) return;
      window.__kpModQueued = true;
      const mod = document.createElement("script");
      mod.id = "kp-mod";
      mod.src = "/kidpix/mod.js";
      mod.onload = boot;
      document.body.appendChild(mod);
    };
    const existing = document.getElementById("kp-app");
    if (existing) {
      if (window.init_kiddo_paint) loadMod();
      else existing.addEventListener("load", loadMod);
      return;
    }
    const app = document.createElement("script");
    app.id = "kp-app";
    app.src = "/kidpix/app.js";
    app.onload = loadMod;
    document.body.appendChild(app);
  }, []);

  useEffect(() => {
    let frame = 0;
    let prevA = false;
    let lastSize = 0;
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const reading = readHands(grabRef.current);
      const api = window.kpView;
      if (!api) return;
      if (reading.grabToggle && !prevA) {
        grabRef.current = !grabRef.current;
        setGrab(grabRef.current);
        api.setGrabbed(grabRef.current);
      }
      prevA = reading.grabToggle;
      if (reading.zoom) api.zoomBy(1 + reading.zoom * 0.018);
      if (grabRef.current && (reading.panX || reading.panY)) api.panBy(reading.panX * 14, reading.panY * 14);
      if (reading.size && now - lastSize > 280) {
        lastSize = now;
        api.nudgeSize(reading.size > 0 ? 1 : -1);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleGrab() {
    grabRef.current = !grabRef.current;
    setGrab(grabRef.current);
    window.kpView?.setGrabbed(grabRef.current);
  }

  return (
    <div className={vr ? "kp kp-one kp-vr" : "kp kp-one"}>
      <link rel="stylesheet" href="/kidpix/css/kidpix.css" />
      <link rel="stylesheet" href="/kidpix/css/fit.css" />
      <div id="container">
        <div id="toolbar">
          <div id="mainbar">
            {TOOLS.map(([id, title, file]) => (
              <button key={id} className="tool" id={id} title={title} type="button">
                <img src={`/kidpix/img/${file}`} className="pixelated" alt="" draggable={false} />
              </button>
            ))}
          </div>
        </div>
        <div id="hcontainer">
          <div id="subtoolbars" className="subtoolbar">
            <div id="genericsubmenu" className="hidden" />
            <div id="alphabettoolbar" className="hidden">
              {Array.from({ length: 26 }, (_, index) => (
                <button key={index} className="tool alphabet" id={`xal${index}`} type="button" />
              ))}
              <button className="tool alphabet" id="alnext" type="button">
                <h1>↪</h1>
              </button>
            </div>
          </div>
          <div id="zoomport">
            <div id="paint">
              <canvas id="kiddopaint" className="pixelated" width={1920} height={1200} />
            </div>
          </div>
          <div id="modbar">
            <div className="kp-switch">
              <button type="button" onClick={() => window.kpView?.zoomBy(1.25)}>
                zoom in
              </button>
              <button type="button" onClick={() => window.kpView?.zoomBy(0.8)}>
                zoom out
              </button>
              <button type="button" className={grab ? "is-on" : ""} onClick={toggleGrab}>
                {grab ? "let go" : "grab"}
              </button>
              <div className="kp-size">
                <span>size</span>
                <button type="button" aria-label="smaller" onClick={() => window.kpView?.nudgeSize(-1)}>
                  −
                </button>
                <output id="kp-size-value">1</output>
                <button type="button" aria-label="bigger" onClick={() => window.kpView?.nudgeSize(1)}>
                  +
                </button>
                <input
                  id="kp-size"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  defaultValue={1}
                  aria-label="size"
                  onInput={(event) => window.kpView?.setSize(Number(event.currentTarget.value))}
                />
              </div>
            </div>
            <div id="modtools" />
          </div>
        </div>
        <div id="colorbar">
          <button className="currentColor" id="currentColor" type="button" />
          <div id="colorselector">
            {Array.from({ length: 32 }, (_, index) => (
              <button key={index} className="color" type="button" />
            ))}
          </div>
          <div>
            <button className="colornav" id="colorprev" type="button">
              ←
            </button>
            <button className="colornav" id="colornext" type="button">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
