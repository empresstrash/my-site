"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readHands, type HandsApi } from "./hands";

const FONTS = [
  ["sans-serif", "plain"],
  ["serif", "serif"],
  ["monospace", "type"],
  ["cursive", "script"],
  ["fantasy", "wild"],
  ['"Comic Sans MS", "Comic Sans", cursive', "comic"],
  ['"Marker Felt", "Chalkboard SE", fantasy', "marker"],
  ['Impact, "Arial Black", fantasy', "block"],
  ['Georgia, "Times New Roman", serif', "book"],
  ["var(--font-menu)", "menu"],
] as const;

const TOOLS = [
  ["save", "Save", "kp-m_27.png"],
  ["draw", "Draw", "mod-draw.png"],
  ["shape", "Shape", "mod-shape.png"],
  ["brush", "Wacky Brush", "kp-m_32.png"],
  ["sound", "Sound", ""],
  ["jumble", "Electric Mixer", "kp-m_33.png"],
  ["flood", "Paint Can", "kp-m_34.png"],
  ["eraser", "Eraser", "kp-m_35.png"],
  ["alphabet", "Text", "kp-m_36.png"],
  ["stamp", "Rubber Stamps", "kp-m_37.png"],
  ["truck", "Moving Van", "kp-m_38.png"],
  ["pick", "Pick", "mod-pick.png"],
  ["undo", "The Undo Guy", "kp-m_39.png"],
] as const;

declare global {
  interface Window {
    init_kiddo_paint?: () => void;
    init_mods?: () => void;
    init_sound_art?: () => void;
    kpView?: HandsApi & {
      setSize: (value: number) => void;
      setOpacity: (value: number) => void;
      nudgeOpacity: (delta: number) => void;
      nudgeCurve?: (direction: number) => boolean;
      setPoints?: (value: number) => void;
      nudgePoints?: (delta: number) => void;
      resetBar?: () => void;
    };
    KiddoPaint?: {
      Alphabet: { english: { face: string } };
      Stamps: { currentFace: string };
    };
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
      window.init_sound_art?.();
    };
    const loadSound = () => {
      if (document.getElementById("kp-sound")) {
        boot();
        return;
      }
      const sound = document.createElement("script");
      sound.id = "kp-sound";
      sound.src = "/kidpix/sound-art.js";
      sound.onload = boot;
      document.body.appendChild(sound);
    };
    const loadMod = () => {
      if (window.__kpBooted || window.__kpModQueued) return;
      window.__kpModQueued = true;
      const mod = document.createElement("script");
      mod.id = "kp-mod";
      mod.src = "/kidpix/mod.js";
      mod.onload = loadSound;
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
        const bent = api.nudgeCurve?.(reading.size > 0 ? 1 : -1);
        if (!bent) api.nudgeSize(reading.size > 0 ? 1 : -1);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function chooseFont(value: string) {
    const probe = document.createElement("span");
    probe.style.fontFamily = value;
    document.body.appendChild(probe);
    const face = getComputedStyle(probe).fontFamily || value;
    probe.remove();
    if (window.KiddoPaint) {
      window.KiddoPaint.Alphabet.english.face = face;
      window.KiddoPaint.Stamps.currentFace = face;
    }
    const bar = document.getElementById("alphabettoolbar");
    if (bar) bar.style.fontFamily = value;
  }

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
                {file ? (
                  <img src={`/kidpix/img/${file}`} className="pixelated" alt="" draggable={false} />
                ) : (
                  <span className="kp-tool-emoji" aria-hidden="true">
                    🎤
                  </span>
                )}
              </button>
            ))}
          </div>
          <div id="kp-nested" hidden>
            <button className="tool" id="pencil" title="Wacky Pencil" type="button" />
            <button className="tool" id="line" title="Line" type="button" />
            <button className="tool" id="square" title="Rectangle" type="button" />
            <button className="tool" id="circle" title="Oval" type="button" />
          </div>
        </div>
        <div id="hcontainer">
          <div id="subtoolbars" className="subtoolbar">
            <div id="texturebar" className="hidden">
              <button className="tool" id="txprev" type="button" aria-label="previous textures">
                <h1>↩</h1>
              </button>
              <div id="kp-texture-slots" />
              <button className="tool" id="txnext" type="button" aria-label="next textures">
                <h1>↪</h1>
              </button>
            </div>
            <div id="genericsubmenu" className="hidden" />
            <div id="alphabettoolbar" className="hidden">
              <div className="kp-letter-nav">
                <label className="kp-font">
                  <select id="kp-font" aria-label="font" defaultValue="sans-serif" onChange={(event) => chooseFont(event.target.value)}>
                    {FONTS.map(([value, label]) => (
                      <option key={label} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="tool alphabet" id="alcase" type="button" aria-label="letter case" title="uppercase">
                  <h1>ABC</h1>
                </button>
                <button className="tool alphabet" id="alprev" type="button" aria-label="previous row">
                  <h1>↩</h1>
                </button>
                <button className="tool alphabet" id="alnext" type="button" aria-label="next row">
                  <h1>↪</h1>
                </button>
              </div>
              {Array.from({ length: 13 }, (_, index) => (
                <button key={index} className="tool alphabet" id={`xal${index}`} type="button" />
              ))}
            </div>
          </div>
          <div id="zoomport">
            <div id="paint">
              <canvas id="kiddopaint" className="pixelated" width={1920} height={1200} />
            </div>
          </div>
          <div id="modbar">
            <button type="button" aria-label="zoom in" title="zoom in" onClick={() => window.kpView?.zoomBy(1.25)}>
              🔎
            </button>
            <button type="button" aria-label="zoom out" title="zoom out" onClick={() => window.kpView?.zoomBy(0.8)}>
              🔍
            </button>
            <button type="button" className={grab ? "is-on" : ""} aria-label={grab ? "let go" : "grab"} title={grab ? "let go" : "grab"} onClick={toggleGrab}>
              {grab ? "✊" : "✋"}
            </button>
            <div className="kp-size" title="size">
              <span className="kp-ico-label" aria-hidden="true">
                ●
              </span>
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
                max={69}
                step={1}
                defaultValue={1}
                aria-label="size"
                onInput={(event) => window.kpView?.setSize(Number(event.currentTarget.value))}
              />
            </div>
            <div className="kp-fade" title="opacity">
              <span className="kp-ico-label" aria-hidden="true">
                ◐
              </span>
              <output id="kp-fade-value">100</output>
              <button type="button" aria-label="more transparent" onClick={() => window.kpView?.nudgeOpacity(-1)}>
                −
              </button>
              <input
                id="kp-fade"
                type="range"
                min={0}
                max={100}
                step={1}
                defaultValue={100}
                aria-label="opacity"
                onInput={(event) => window.kpView?.setOpacity(Number(event.currentTarget.value))}
              />
              <button type="button" aria-label="more solid" onClick={() => window.kpView?.nudgeOpacity(1)}>
                +
              </button>
            </div>
            <div className="kp-turn" title="turn">
              <span className="kp-ico-label" aria-hidden="true">
                ↻
              </span>
              <button type="button" aria-label="rotate left" onClick={() => window.kpView?.nudgeAngle(-1)}>
                ↺
              </button>
              <output id="kp-angle-value">0°</output>
              <button type="button" aria-label="rotate right" onClick={() => window.kpView?.nudgeAngle(1)}>
                ↻
              </button>
              <input
                id="kp-angle"
                type="range"
                min={0}
                max={360}
                step={1}
                defaultValue={0}
                aria-label="rotation"
                onInput={(event) => window.kpView?.setAngle(Number(event.currentTarget.value))}
              />
              <button
                type="button"
                aria-label="reset bottom bar"
                title="reset sliders"
                onClick={() => {
                  window.kpView?.resetBar?.();
                  grabRef.current = false;
                  setGrab(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="kp-amp" id="kp-amp" hidden title="sound reaction">
              <span className="kp-ico-label" aria-hidden="true">
                🔊
              </span>
              <button
                type="button"
                aria-label="less reaction"
                onClick={() => {
                  const input = document.getElementById("kp-amp-range") as HTMLInputElement | null;
                  const shown = document.getElementById("kp-amp-value");
                  if (!input) return;
                  const next = Math.max(-100, Math.min(100, Number(input.value) - 5));
                  input.value = String(next);
                  if (shown) shown.textContent = String(next);
                }}
              >
                −
              </button>
              <output id="kp-amp-value">0</output>
              <button
                type="button"
                aria-label="more reaction"
                onClick={() => {
                  const input = document.getElementById("kp-amp-range") as HTMLInputElement | null;
                  const shown = document.getElementById("kp-amp-value");
                  if (!input) return;
                  const next = Math.max(-100, Math.min(100, Number(input.value) + 5));
                  input.value = String(next);
                  if (shown) shown.textContent = String(next);
                }}
              >
                +
              </button>
              <input
                id="kp-amp-range"
                type="range"
                min={-100}
                max={100}
                step={1}
                defaultValue={0}
                aria-label="sound reaction"
                onInput={(event) => {
                  const shown = document.getElementById("kp-amp-value");
                  if (shown) shown.textContent = event.currentTarget.value;
                }}
              />
            </div>
            <div className="kp-points" id="kp-points" hidden title="points">
              <span className="kp-ico-label" aria-hidden="true" id="kp-points-ico">
                ✦
              </span>
              <button type="button" aria-label="fewer points" onClick={() => window.kpView?.nudgePoints?.(-1)}>
                −
              </button>
              <output id="kp-points-value">5</output>
              <button type="button" aria-label="more points" onClick={() => window.kpView?.nudgePoints?.(1)}>
                +
              </button>
              <input
                id="kp-points-range"
                type="range"
                min={3}
                max={16}
                step={1}
                defaultValue={5}
                aria-label="points"
                onInput={(event) => window.kpView?.setPoints?.(Number(event.currentTarget.value))}
              />
            </div>
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
