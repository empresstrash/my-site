"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DRAW_MODES,
  INKS,
  MIXES,
  PAPERS,
  PATTERNS,
  SHAPES,
  STAMPS,
  TOOLS,
  WACKY_MODES,
  blankInk,
  chalkDots,
  drawStamp,
  floodFill,
  hexToRgb,
  mirrorPoint,
  mixPixels,
  paintPaper,
  paintWacky,
  rgba,
  softDot,
  sprayDots,
  strokeSegment,
  traceCurve,
  tracePoly,
  traceShape,
  type DrawMode,
  type MixId,
  type PaperPattern,
  type Point,
  type ShapeKind,
  type StampId,
  type Symmetry,
  type Tool,
  type WackyMode,
} from "./engine";
import { COLOR_MES, drawMoopies, MOOPIE_MOTIONS, paintColorMe, type Moopie } from "./deluxe";
import { playSound, setMusic, stopMusic, unlockAudio, type SoundKind } from "./sounds";
import { ToolIcon } from "./icons";
import { forgetSheet, loadBook, saveBook } from "./store";

type Hist = { undo: boolean; redo: boolean };
type View = { x: number; y: number; scale: number };
type Draft = { at: Point; left: number; top: number; value: string };
type VanGrab = { sprite: HTMLCanvasElement; base: HTMLCanvasElement; dx: number; dy: number };
type Stroke = {
  tool: Tool;
  pointerId: number;
  origin: Point;
  last: Point;
  clientX: number;
  clientY: number;
  hue: number;
  bending?: boolean;
  van?: VanGrab;
};
type Snap = { ink: ImageData; moopies: Moopie[] };
type PageSlot = { ink: HTMLCanvasElement; moopies: Moopie[] };
type Bend = { a: Point; b: Point; c: Point };
type PendingBook = { bitmaps: ImageBitmap[]; moopies: Moopie[][]; index: number };
type Pinch = { dist: number; wx: number; wy: number; scale: number };

const MAX_BITMAP = 1_400_000;
const MAX_UNDO = 8;

function hypot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function Studio() {
  const inkRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);
  const moopiesRef = useRef<Moopie[]>([]);
  const moopieCanvasRef = useRef<HTMLCanvasElement>(null);
  const moopieSeq = useRef(0);
  const pagesRef = useRef<PageSlot[]>([]);
  const pageIndexRef = useRef(0);
  const bendRef = useRef<Bend | null>(null);
  const polyRef = useRef<Point[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const showRef = useRef<HTMLCanvasElement>(null);
  const colorMeIndex = useRef(0);
  const pendingBook = useRef<PendingBook | null>(null);
  const movesRef = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const strokeRef = useRef<Stroke | null>(null);
  const pinchRef = useRef<Pinch | null>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, scale: 1 });
  const cssSize = useRef({ w: 0, h: 0 });
  const pending = useRef<ImageBitmap | null>(null);
  const ready = useRef(false);
  const loaded = useRef(false);
  const saveSeq = useRef(0);
  const fileSeq = useRef(0);
  const saveTimer = useRef(0);
  const textLock = useRef(false);
  const draftRef = useRef<Draft | null>(null);
  const hueRef = useRef(20);

  const [tool, setTool] = useState<Tool>("draw");
  const [drawMode, setDrawMode] = useState<DrawMode>("pencil");
  const [wacky, setWacky] = useState<WackyMode>("rainbow");
  const [shape, setShape] = useState<ShapeKind>("rect");
  const [filled, setFilled] = useState(false);
  const [stamp, setStamp] = useState<StampId>("star");
  const [color, setColor] = useState(INKS[0]);
  const [paper, setPaper] = useState(PAPERS[0]);
  const [pattern, setPattern] = useState<PaperPattern>("plain");
  const [symmetry, setSymmetry] = useState<Symmetry>("off");
  const [size, setSize] = useState(12);
  const [pixel, setPixel] = useState(false);
  const [sound, setSound] = useState(true);
  const [music, setMusicOn] = useState(false);
  const [hist, setHist] = useState<Hist>({ undo: false, redo: false });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [help, setHelp] = useState(false);
  const [flash, setFlash] = useState(false);
  const [savedNote, setSavedNote] = useState("on this device");
  const [moves, setMoves] = useState(false);
  const [mash, setMash] = useState(false);
  const [letterStyle, setLetterStyle] = useState<"plain" | "bubble" | "skinny">("plain");
  const [polyCount, setPolyCount] = useState(0);
  const [pageCount, setPageCount] = useState({ index: 0, total: 1 });
  const [show, setShow] = useState(false);
  const [moving, setMoving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const live = useRef({ tool, drawMode, wacky, shape, filled, stamp, color, paper, pattern, symmetry, size, pixel, sound, mash, letter: letterStyle });
  const actions = useRef({
    undo: () => {},
    redo: () => {},
    savePng: async () => {},
  });

  function applyView(next: View) {
    const stage = stageRef.current;
    const scale = Math.max(1, Math.min(5, next.scale));
    let x = next.x;
    let y = next.y;
    if (stage) {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      x = Math.min(0, Math.max(w - w * scale, next.x));
      y = Math.min(0, Math.max(h - h * scale, next.y));
    }
    if (scale === 1) {
      x = 0;
      y = 0;
    }
    const view = { x, y, scale };
    viewRef.current = view;
    if (worldRef.current) worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function inkContext() {
    const canvas = inkRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    ctx.imageSmoothingEnabled = !live.current.pixel;
    return { canvas, ctx };
  }

  function cloneMoopies() {
    return moopiesRef.current.map((item) => ({ ...item }));
  }

  function remember() {
    const pair = inkContext();
    if (!pair) return;
    undoStack.current.push({
      ink: pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height),
      moopies: cloneMoopies(),
    });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setHist({ undo: true, redo: false });
  }

  function restoreSnap(snap: Snap) {
    const pair = inkContext();
    if (!pair) return;
    pair.ctx.putImageData(snap.ink, 0, 0);
    moopiesRef.current = snap.moopies.map((item) => ({ ...item }));
    setMoving(moopiesRef.current.length > 0);
  }

  function scheduleSave() {
    if (!loaded.current) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 650);
  }

  async function persist() {
    const canvas = inkRef.current;
    if (!canvas || canvas.width < 2 || !loaded.current) return;
    capturePage();
    const id = ++saveSeq.current;
    const pages: { ink: Blob; moopies: Moopie[] }[] = [];
    for (const slot of pagesRef.current) {
      if (!slot) continue;
      const blob = await new Promise<Blob | null>((resolve) => slot.ink.toBlob((value) => resolve(value), "image/png"));
      if (!blob) return;
      pages.push({ ink: blob, moopies: slot.moopies.map((item) => ({ ...item })) });
    }
    if (!pages.length || id !== saveSeq.current) return;
    const cur = live.current;
    await saveBook({
      pages,
      index: Math.min(pageIndexRef.current, pages.length - 1),
      paper: cur.paper,
      pattern: cur.pattern,
      symmetry: cur.symmetry,
    });
    setSavedNote("saved on this device");
  }

  function pointFrom(event: PointerEvent): Point | null {
    const canvas = inkRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    let x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    let y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    if (live.current.pixel) {
      x = Math.round(x);
      y = Math.round(y);
    }
    return { x, y };
  }

  function clearPreview() {
    const preview = previewRef.current;
    const ctx = preview?.getContext("2d");
    if (!preview || !ctx) return;
    ctx.clearRect(0, 0, preview.width, preview.height);
  }

  function paintLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, width: number, erase: boolean, alpha = 1) {
    const canvas = inkRef.current;
    if (!canvas) return;
    const starts = mirrorPoint(a, live.current.symmetry, canvas.width, canvas.height);
    const ends = mirrorPoint(b, live.current.symmetry, canvas.width, canvas.height);
    ctx.save();
    if (erase) ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = erase ? "rgba(0,0,0,1)" : live.current.color;
    const count = Math.min(starts.length, ends.length);
    for (let i = 0; i < count; i++) strokeSegment(ctx, starts[i], ends[i], width);
    ctx.restore();
  }

  function dab(ctx: CanvasRenderingContext2D, at: Point, kind: "brush" | "spray" | "wacky" | "stamp" | "chalk") {
    const canvas = inkRef.current;
    if (!canvas) return;
    const points = mirrorPoint(at, live.current.symmetry, canvas.width, canvas.height);
    const cur = live.current;
    for (const p of points) {
      if (kind === "brush") softDot(ctx, p.x, p.y, Math.max(2, cur.size * 0.85), rgba(cur.color, 0.9));
      else if (kind === "spray") sprayDots(ctx, p.x, p.y, Math.max(8, cur.size * 1.8), cur.color, cur.pixel);
      else if (kind === "chalk") chalkDots(ctx, p.x, p.y, Math.max(4, cur.size), cur.color);
      else if (kind === "wacky") {
        const wobble = cur.wacky === "zigzag" || cur.wacky === "vine" ? Math.sin(hueRef.current * 0.35) * cur.size : 0;
        paintWacky(ctx, cur.wacky, p.x + wobble, p.y, Math.max(6, cur.size), cur.color, hueRef.current);
      } else drawStamp(ctx, cur.stamp, p.x, p.y, Math.max(36, cur.size * 3.2), cur.color);
    }
  }

  function walk(ctx: CanvasRenderingContext2D, a: Point, b: Point, step: number, kind: "brush" | "spray" | "wacky" | "chalk") {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const count = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= count; i++) {
      hueRef.current = (hueRef.current + dist / count) % 360;
      dab(ctx, { x: a.x + (dx * i) / count, y: a.y + (dy * i) / count }, kind);
    }
  }

  function widthFor(event: PointerEvent) {
    const base = live.current.size;
    if (event.pointerType === "pen" && event.pressure > 0 && event.pressure < 1) return Math.max(1, base * (0.35 + event.pressure * 1.3));
    return base;
  }

  function drawSegment(ctx: CanvasRenderingContext2D, a: Point, b: Point, event: PointerEvent) {
    const cur = live.current;
    if (cur.tool === "eraser") {
      paintLine(ctx, a, b, Math.max(8, cur.size * 1.7), true);
      return;
    }
    if (cur.tool !== "draw" && cur.tool !== "wacky") return;
    if (cur.tool === "wacky") {
      walk(ctx, a, b, Math.max(4, cur.size * 0.65), "wacky");
      return;
    }
    if (cur.drawMode === "brush") walk(ctx, a, b, Math.max(2, cur.size * 0.35), "brush");
    else if (cur.drawMode === "spray") walk(ctx, a, b, Math.max(6, cur.size), "spray");
    else if (cur.drawMode === "chalk") walk(ctx, a, b, Math.max(3, cur.size * 0.45), "chalk");
    else if (cur.drawMode === "crayon") {
      paintLine(ctx, a, b, Math.max(6, widthFor(event) * 1.2), false, 0.5);
      paintLine(ctx, { x: a.x + 1.5, y: a.y + 0.5 }, { x: b.x + 1.5, y: b.y + 0.5 }, Math.max(3, widthFor(event) * 0.45), false, 0.35);
    } else if (cur.drawMode === "marker") paintLine(ctx, a, b, Math.max(6, widthFor(event) * 1.35), false, 0.38);
    else paintLine(ctx, a, b, Math.max(1, widthFor(event) * 0.7), false, 1);
  }

  function previewShape(a: Point, b: Point) {
    const preview = previewRef.current;
    const ink = inkRef.current;
    const ctx = preview?.getContext("2d");
    if (!preview || !ink || !ctx) return;
    ctx.clearRect(0, 0, preview.width, preview.height);
    const cur = live.current;
    ctx.save();
    ctx.strokeStyle = cur.color;
    ctx.fillStyle = cur.color;
    ctx.lineWidth = Math.max(2, cur.size * 0.45);
    ctx.lineJoin = "round";
    const starts = mirrorPoint(a, cur.symmetry, ink.width, ink.height);
    const ends = mirrorPoint(b, cur.symmetry, ink.width, ink.height);
    const count = Math.min(starts.length, ends.length);
    for (let i = 0; i < count; i++) {
      if (cur.tool === "line") strokeSegment(ctx, starts[i], ends[i], Math.max(2, cur.size * 0.55));
      else {
        traceShape(ctx, cur.shape, starts[i], ends[i]);
        if (cur.filled) ctx.fill();
        else ctx.stroke();
      }
    }
    ctx.restore();
  }

  function commitShape(a: Point, b: Point) {
    if (hypot(a, b) < 2) return;
    const pair = inkContext();
    if (!pair) return;
    remember();
    const cur = live.current;
    pair.ctx.save();
    pair.ctx.strokeStyle = cur.color;
    pair.ctx.fillStyle = cur.color;
    pair.ctx.lineWidth = Math.max(2, cur.size * 0.45);
    pair.ctx.lineJoin = "round";
    const starts = mirrorPoint(a, cur.symmetry, pair.canvas.width, pair.canvas.height);
    const ends = mirrorPoint(b, cur.symmetry, pair.canvas.width, pair.canvas.height);
    const count = Math.min(starts.length, ends.length);
    for (let i = 0; i < count; i++) {
      if (cur.tool === "line") strokeSegment(pair.ctx, starts[i], ends[i], Math.max(2, cur.size * 0.55));
      else {
        traceShape(pair.ctx, cur.shape, starts[i], ends[i]);
        if (cur.filled) pair.ctx.fill();
        else pair.ctx.stroke();
      }
    }
    pair.ctx.restore();
    playSound(cur.tool === "line" ? "zip" : "click", cur.sound);
    scheduleSave();
  }

  function previewCurve(bend: Bend) {
    const preview = previewRef.current;
    const ink = inkRef.current;
    const ctx = preview?.getContext("2d");
    if (!preview || !ink || !ctx) return;
    ctx.clearRect(0, 0, preview.width, preview.height);
    const cur = live.current;
    ctx.save();
    ctx.strokeStyle = cur.color;
    ctx.lineWidth = Math.max(2, cur.size * 0.55);
    ctx.lineCap = "round";
    const as = mirrorPoint(bend.a, cur.symmetry, ink.width, ink.height);
    const bs = mirrorPoint(bend.b, cur.symmetry, ink.width, ink.height);
    const cs = mirrorPoint(bend.c, cur.symmetry, ink.width, ink.height);
    const count = Math.min(as.length, bs.length, cs.length);
    for (let i = 0; i < count; i++) {
      traceCurve(ctx, as[i], bs[i], cs[i]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function commitCurve(bend: Bend) {
    const pair = inkContext();
    if (!pair || hypot(bend.a, bend.b) < 2) return;
    remember();
    const cur = live.current;
    pair.ctx.save();
    pair.ctx.strokeStyle = cur.color;
    pair.ctx.lineWidth = Math.max(2, cur.size * 0.55);
    pair.ctx.lineCap = "round";
    const as = mirrorPoint(bend.a, cur.symmetry, pair.canvas.width, pair.canvas.height);
    const bs = mirrorPoint(bend.b, cur.symmetry, pair.canvas.width, pair.canvas.height);
    const cs = mirrorPoint(bend.c, cur.symmetry, pair.canvas.width, pair.canvas.height);
    const count = Math.min(as.length, bs.length, cs.length);
    for (let i = 0; i < count; i++) {
      traceCurve(pair.ctx, as[i], bs[i], cs[i]);
      pair.ctx.stroke();
    }
    pair.ctx.restore();
    playSound("tick", cur.sound);
    scheduleSave();
  }

  function previewPoly(points: Point[]) {
    const preview = previewRef.current;
    const ink = inkRef.current;
    const ctx = preview?.getContext("2d");
    if (!preview || !ink || !ctx) return;
    ctx.clearRect(0, 0, preview.width, preview.height);
    const cur = live.current;
    ctx.save();
    ctx.strokeStyle = cur.color;
    ctx.fillStyle = cur.color;
    ctx.lineWidth = Math.max(2, cur.size * 0.45);
    ctx.lineJoin = "round";
    const mirrored = points.map((point) => mirrorPoint(point, cur.symmetry, ink.width, ink.height));
    const count = mirrored[0]?.length ?? 0;
    for (let i = 0; i < count; i++) {
      tracePoly(
        ctx,
        mirrored.map((set) => set[i]),
        false,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function closePoly() {
    const points = polyRef.current;
    const pair = inkContext();
    if (!pair || points.length < 3) return;
    remember();
    const cur = live.current;
    pair.ctx.save();
    pair.ctx.strokeStyle = cur.color;
    pair.ctx.fillStyle = cur.color;
    pair.ctx.lineWidth = Math.max(2, cur.size * 0.45);
    pair.ctx.lineJoin = "round";
    const mirrored = points.map((point) => mirrorPoint(point, cur.symmetry, pair.canvas.width, pair.canvas.height));
    const count = mirrored[0]?.length ?? 0;
    for (let i = 0; i < count; i++) {
      tracePoly(
        pair.ctx,
        mirrored.map((set) => set[i]),
        true,
      );
      if (cur.filled) pair.ctx.fill();
      else pair.ctx.stroke();
    }
    pair.ctx.restore();
    polyRef.current = [];
    setPolyCount(0);
    clearPreview();
    playSound("click", cur.sound);
    scheduleSave();
  }

  function capturePage() {
    const pair = inkContext();
    if (!pair) return;
    let slot = pagesRef.current[pageIndexRef.current];
    if (!slot) {
      slot = { ink: document.createElement("canvas"), moopies: [] };
      pagesRef.current[pageIndexRef.current] = slot;
    }
    slot.ink.width = pair.canvas.width;
    slot.ink.height = pair.canvas.height;
    const ctx = slot.ink.getContext("2d");
    ctx?.clearRect(0, 0, slot.ink.width, slot.ink.height);
    ctx?.drawImage(pair.canvas, 0, 0);
    slot.moopies = cloneMoopies();
  }

  function resetHistory() {
    undoStack.current = [];
    redoStack.current = [];
    setHist({ undo: false, redo: false });
    bendRef.current = null;
    polyRef.current = [];
    setPolyCount(0);
    clearPreview();
  }

  function showPage(index: number) {
    const slot = pagesRef.current[index];
    const pair = inkContext();
    if (!slot || !pair) return;
    pageIndexRef.current = index;
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    pair.ctx.drawImage(slot.ink, 0, 0, pair.canvas.width, pair.canvas.height);
    moopiesRef.current = slot.moopies.map((item) => ({ ...item }));
    setMoving(moopiesRef.current.length > 0);
    resetHistory();
    setPageCount({ index, total: pagesRef.current.length });
    scheduleSave();
  }

  function addPage() {
    if (pagesRef.current.length >= 8) return;
    const pair = inkContext();
    if (!pair) return;
    capturePage();
    const blank = document.createElement("canvas");
    blank.width = pair.canvas.width;
    blank.height = pair.canvas.height;
    pagesRef.current.push({ ink: blank, moopies: [] });
    pageIndexRef.current = pagesRef.current.length - 1;
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    moopiesRef.current = [];
    setMoving(false);
    resetHistory();
    setPageCount({ index: pageIndexRef.current, total: pagesRef.current.length });
    playSound("click", live.current.sound);
    scheduleSave();
  }

  function nextPage() {
    if (pagesRef.current.length < 2) return;
    capturePage();
    showPage((pageIndexRef.current + 1) % pagesRef.current.length);
  }

  function loadColoring() {
    const pair = inkContext();
    if (!pair) return;
    remember();
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    paintColorMe(pair.ctx, COLOR_MES[colorMeIndex.current % COLOR_MES.length]);
    colorMeIndex.current += 1;
    playSound("click", live.current.sound);
    scheduleSave();
  }

  async function placePhoto(file: File) {
    const pair = inkContext();
    if (!pair) return;
    const bitmap = await createImageBitmap(file);
    remember();
    const scale = Math.min(pair.canvas.width / bitmap.width, pair.canvas.height / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    pair.ctx.drawImage(bitmap, (pair.canvas.width - width) / 2, (pair.canvas.height - height) / 2, width, height);
    bitmap.close();
    playSound("click", live.current.sound);
    scheduleSave();
  }

  function playShow() {
    capturePage();
    if (!pagesRef.current.length) return;
    setShow(true);
    playSound("click", live.current.sound);
  }

  function applyBook(book: PendingBook) {
    const pair = inkContext();
    if (!pair || book.bitmaps.length === 0) return;
    pagesRef.current = book.bitmaps.map((bitmap, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = pair.canvas.width;
      canvas.height = pair.canvas.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return { ink: canvas, moopies: (book.moopies[index] || []).map((item) => ({ ...item })) };
    });
    const index = Math.max(0, Math.min(book.index, pagesRef.current.length - 1));
    pageIndexRef.current = index;
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    pair.ctx.drawImage(pagesRef.current[index].ink, 0, 0);
    moopiesRef.current = pagesRef.current[index].moopies.map((item) => ({ ...item }));
    setMoving(moopiesRef.current.length > 0);
    setPageCount({ index, total: pagesRef.current.length });
  }

  function placeStamp(at: Point) {
    const pair = inkContext();
    if (!pair) return;
    remember();
    const cur = live.current;
    const ids = STAMPS.map((item) => item.id);
    const buddy = ids[(ids.indexOf(cur.stamp) + 1) % ids.length];
    const spots = mirrorPoint(at, cur.symmetry, pair.canvas.width, pair.canvas.height);
    if (movesRef.current) {
      const add = (stamp: StampId, dx: number, dy: number) => {
        moopieSeq.current += 1;
        const id = moopieSeq.current;
        moopiesRef.current = [
          ...moopiesRef.current,
          {
            id,
            stamp,
            x: Math.min(0.96, Math.max(0.04, (at.x + dx) / pair.canvas.width)),
            y: Math.min(0.96, Math.max(0.04, (at.y + dy) / pair.canvas.height)),
            size: Math.max(0.05, cur.size / 180),
            color: cur.color,
            motion: MOOPIE_MOTIONS[id % MOOPIE_MOTIONS.length],
            phase: id * 0.7,
          },
        ];
      };
      add(cur.stamp, 0, 0);
      if (cur.mash) add(buddy, cur.size * 1.6, cur.size * 0.5);
      setMoving(true);
    } else {
      dab(pair.ctx, at, "stamp");
      if (cur.mash) {
        for (const spot of spots) drawStamp(pair.ctx, buddy, spot.x + cur.size * 1.6, spot.y + cur.size * 0.5, Math.max(36, cur.size * 3.2), cur.color);
      }
    }
    playSound(cur.mash ? "honk" : "thwack", cur.sound);
    scheduleSave();
  }

  function fillAt(at: Point) {
    const pair = inkContext();
    if (!pair) return;
    const image = pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height);
    const [r, g, b] = hexToRgb(live.current.color);
    const painted = floodFill(image, at.x, at.y, [r, g, b, 255], 42);
    if (!painted) {
      playSound("click", live.current.sound);
      return;
    }
    remember();
    pair.ctx.putImageData(image, 0, 0);
    playSound("pour", live.current.sound);
    scheduleSave();
  }

  function pickAt(at: Point) {
    const pair = inkContext();
    if (!pair) return;
    const x = Math.floor(at.x);
    const y = Math.floor(at.y);
    if (x < 0 || y < 0 || x >= pair.canvas.width || y >= pair.canvas.height) return;
    const pixel = pair.ctx.getImageData(x, y, 1, 1).data;
    const next = pixel[3] < 16 ? live.current.paper : `#${[pixel[0], pixel[1], pixel[2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    setColor(next);
    playSound("drop", live.current.sound);
  }

  function grabVan(at: Point) {
    const pair = inkContext();
    if (!pair) return null;
    const span = Math.round(Math.max(42, live.current.size * 7));
    const x = Math.round(at.x - span / 2);
    const y = Math.round(at.y - span / 2);
    const sprite = document.createElement("canvas");
    sprite.width = span;
    sprite.height = span;
    const spriteCtx = sprite.getContext("2d");
    if (!spriteCtx) return null;
    spriteCtx.drawImage(pair.canvas, x, y, span, span, 0, 0, span, span);
    remember();
    pair.ctx.clearRect(x, y, span, span);
    const base = document.createElement("canvas");
    base.width = pair.canvas.width;
    base.height = pair.canvas.height;
    base.getContext("2d")?.drawImage(pair.canvas, 0, 0);
    playSound("van", live.current.sound);
    return { sprite, base, dx: at.x - x, dy: at.y - y };
  }

  function moveVan(van: VanGrab, at: Point) {
    const pair = inkContext();
    if (!pair) return;
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    pair.ctx.drawImage(van.base, 0, 0);
    pair.ctx.drawImage(van.sprite, Math.round(at.x - van.dx), Math.round(at.y - van.dy));
  }

  function beginPinch() {
    const stage = stageRef.current;
    const pts = [...pointers.current.values()];
    if (!stage || pts.length < 2) return;
    const rect = stage.getBoundingClientRect();
    const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
    const view = viewRef.current;
    pinchRef.current = {
      dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
      wx: (midX - view.x) / view.scale,
      wy: (midY - view.y) / view.scale,
      scale: view.scale,
    };
  }

  function movePinch() {
    const stage = stageRef.current;
    const pinch = pinchRef.current;
    const pts = [...pointers.current.values()];
    if (!stage || !pinch || pts.length < 2) return;
    const rect = stage.getBoundingClientRect();
    const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
    const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
    const scale = pinch.scale * (dist / pinch.dist);
    applyView({ x: midX - pinch.wx * scale, y: midY - pinch.wy * scale, scale });
  }

  function noiseFor(): SoundKind {
    const cur = live.current;
    if (cur.tool === "eraser") return "scratch";
    if (cur.tool === "wacky") return "boing";
    if (cur.tool === "draw") {
      if (cur.drawMode === "brush") return "soft";
      if (cur.drawMode === "marker") return "squeak";
      if (cur.drawMode === "spray") return "spray";
      if (cur.drawMode === "chalk") return "chalk";
      if (cur.drawMode === "crayon") return "wax";
    }
    return "tick";
  }

  function beginStroke(event: PointerEvent) {
    const cur = live.current;
    const at = pointFrom(event);
    if (!at) return;
    if (cur.tool === "letter") {
      commitDraft();
      const left = Math.min(window.innerWidth - 220, Math.max(8, event.clientX));
      const top = Math.min(window.innerHeight - 64, Math.max(8, event.clientY));
      const next = { at, left, top, value: "" };
      draftRef.current = next;
      textLock.current = true;
      setDraft(next);
      return;
    }
    if (cur.tool === "fill") {
      fillAt(at);
      return;
    }
    if (cur.tool === "pick") {
      pickAt(at);
      return;
    }
    if (cur.tool === "stamp") {
      placeStamp(at);
      return;
    }
    if (cur.tool === "shape" && cur.shape === "polygon") {
      polyRef.current = [...polyRef.current, at];
      setPolyCount(polyRef.current.length);
      previewPoly(polyRef.current);
      return;
    }
    if (bendRef.current && cur.tool === "shape" && cur.shape === "curve") {
      bendRef.current = { ...bendRef.current, c: at };
      strokeRef.current = {
        tool: "shape",
        pointerId: event.pointerId,
        origin: bendRef.current.a,
        last: at,
        clientX: event.clientX,
        clientY: event.clientY,
        hue: hueRef.current,
        bending: true,
      };
      return;
    }
    if (cur.tool === "mix") return;
    const stroke: Stroke = {
      tool: cur.tool,
      pointerId: event.pointerId,
      origin: at,
      last: at,
      clientX: event.clientX,
      clientY: event.clientY,
      hue: hueRef.current,
    };
    if (cur.tool === "van") {
      const van = grabVan(at);
      if (!van) return;
      stroke.van = van;
      scheduleSave();
    } else if (cur.tool === "draw" || cur.tool === "wacky" || cur.tool === "eraser") {
      const pair = inkContext();
      if (!pair) return;
      remember();
      drawSegment(pair.ctx, at, at, event);
      playSound(noiseFor(), cur.sound);
    }
    strokeRef.current = stroke;
  }

  function moveStroke(event: PointerEvent) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;
    const at = pointFrom(event);
    if (!at) return;
    if (stroke.tool === "hand") {
      applyView({
        ...viewRef.current,
        x: viewRef.current.x + (event.clientX - stroke.clientX),
        y: viewRef.current.y + (event.clientY - stroke.clientY),
      });
      stroke.clientX = event.clientX;
      stroke.clientY = event.clientY;
      return;
    }
    if (stroke.bending && bendRef.current) {
      bendRef.current = { ...bendRef.current, c: at };
      previewCurve(bendRef.current);
      stroke.last = at;
      return;
    }
    if (stroke.tool === "shape" && live.current.shape === "curve") {
      const mid = { x: (stroke.origin.x + at.x) / 2, y: (stroke.origin.y + at.y) / 2 };
      previewCurve({ a: stroke.origin, b: at, c: mid });
      stroke.last = at;
      return;
    }
    if (stroke.tool === "line" || (stroke.tool === "shape" && live.current.shape !== "polygon")) {
      previewShape(stroke.origin, at);
      stroke.last = at;
      return;
    }
    if (stroke.tool === "van" && stroke.van) {
      moveVan(stroke.van, at);
      stroke.last = at;
      return;
    }
    const pair = inkContext();
    if (!pair) return;
    const events = event.getCoalescedEvents?.() ?? [event];
    let previous = stroke.last;
    for (const item of events) {
      const next = pointFrom(item) ?? at;
      drawSegment(pair.ctx, previous, next, item);
      previous = next;
    }
    stroke.last = previous;
    playSound(noiseFor(), live.current.sound);
  }

  function finishStroke(event: PointerEvent) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;
    strokeRef.current = null;
    const at = pointFrom(event) ?? stroke.last;
    if (stroke.bending && bendRef.current) {
      clearPreview();
      commitCurve(bendRef.current);
      bendRef.current = null;
      return;
    }
    if (stroke.tool === "shape" && live.current.shape === "curve") {
      const mid = { x: (stroke.origin.x + at.x) / 2, y: (stroke.origin.y + at.y) / 2 };
      bendRef.current = { a: stroke.origin, b: at, c: mid };
      previewCurve(bendRef.current);
      return;
    }
    if (stroke.tool === "line" || stroke.tool === "shape") {
      clearPreview();
      commitShape(stroke.origin, at);
      return;
    }
    if (stroke.tool === "van") scheduleSave();
    if (stroke.tool === "draw" || stroke.tool === "wacky" || stroke.tool === "eraser") scheduleSave();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    unlockAudio();
    event.preventDefault();
    try {
      stageRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* the pointer can end before capture */
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      strokeRef.current = null;
      clearPreview();
      beginPinch();
      return;
    }
    beginStroke(event.nativeEvent);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      movePinch();
      return;
    }
    if (live.current.tool === "shape" && live.current.shape === "polygon" && polyRef.current.length > 0) {
      const at = pointFrom(event.nativeEvent);
      if (at) previewPoly([...polyRef.current, at]);
    }
    moveStroke(event.nativeEvent);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pinchRef.current) {
      if (pointers.current.size < 2) pinchRef.current = null;
      strokeRef.current = null;
      clearPreview();
      return;
    }
    finishStroke(event.nativeEvent);
  }

  function undo() {
    const pair = inkContext();
    const prev = undoStack.current.at(-1);
    if (!pair || !prev || prev.ink.width !== pair.canvas.width || prev.ink.height !== pair.canvas.height) {
      setHist({ undo: undoStack.current.length > 0, redo: redoStack.current.length > 0 });
      return;
    }
    undoStack.current.pop();
    redoStack.current.push({
      ink: pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height),
      moopies: cloneMoopies(),
    });
    restoreSnap(prev);
    setHist({ undo: undoStack.current.length > 0, redo: true });
    playSound("undo", live.current.sound);
    scheduleSave();
  }

  function redo() {
    const pair = inkContext();
    const next = redoStack.current.at(-1);
    if (!pair || !next || next.ink.width !== pair.canvas.width || next.ink.height !== pair.canvas.height) {
      setHist({ undo: undoStack.current.length > 0, redo: redoStack.current.length > 0 });
      return;
    }
    redoStack.current.pop();
    undoStack.current.push({
      ink: pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height),
      moopies: cloneMoopies(),
    });
    restoreSnap(next);
    setHist({ undo: true, redo: redoStack.current.length > 0 });
    playSound("redo", live.current.sound);
    scheduleSave();
  }

  function runMix(kind: MixId) {
    const pair = inkContext();
    if (!pair) return;
    const image = pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height);
    if (blankInk(image)) {
      playSound("click", live.current.sound);
      return;
    }
    remember();
    mixPixels(image, kind);
    pair.ctx.putImageData(image, 0, 0);
    playSound("whir", live.current.sound);
    scheduleSave();
  }

  function boom() {
    const pair = inkContext();
    if (!pair) return;
    const image = pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height);
    if (!blankInk(image) || moopiesRef.current.length > 0) remember();
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    moopiesRef.current = [];
    setMoving(false);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 420);
    playSound("boom", live.current.sound);
    scheduleSave();
  }

  function commitDraft() {
    const current = draftRef.current;
    if (!current) return;
    draftRef.current = null;
    setDraft(null);
    const trimmed = current.value.trim();
    window.setTimeout(() => {
      textLock.current = false;
    }, 600);
    if (!trimmed) return;
    const pair = inkContext();
    if (!pair) return;
    remember();
    const fontSize = Math.max(22, live.current.size * 3);
    const style = live.current.letter;
    pair.ctx.save();
    pair.ctx.fillStyle = live.current.color;
    pair.ctx.font =
      style === "bubble"
        ? `800 ${fontSize * 1.15}px "Trebuchet MS", "Arial Rounded MT Bold", sans-serif`
        : style === "skinny"
          ? `700 ${fontSize}px "Arial Narrow", Impact, sans-serif`
          : `700 ${fontSize}px "Special Elite", "Courier New", monospace`;
    pair.ctx.textBaseline = "top";
    const spots = mirrorPoint(current.at, live.current.symmetry, pair.canvas.width, pair.canvas.height);
    for (const spot of spots) pair.ctx.fillText(trimmed, spot.x, spot.y);
    pair.ctx.restore();
    playSound("type", live.current.sound);
    scheduleSave();
  }

  async function savePng() {
    const ink = inkRef.current;
    const paperCanvas = paperRef.current;
    if (!ink || !paperCanvas) return;
    const out = document.createElement("canvas");
    out.width = ink.width;
    out.height = ink.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(paperCanvas, 0, 0);
    ctx.drawImage(ink, 0, 0);
    drawMoopies(ctx, moopiesRef.current, 0, false);
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob((value) => resolve(value), "image/png"));
    if (!blob) return;
    fileSeq.current += 1;
    const file = new File([blob], `kid-pix-${fileSeq.current}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "kid pix" });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const ink = inkRef.current;
    const paperCanvas = paperRef.current;
    const preview = previewRef.current;
    if (!stage || !ink || !paperCanvas || !preview) return;

    const fit = () => {
      if (textLock.current && ink.width > 2) return;
      const rect = stage.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      if (ink.width > 2 && Math.abs(cssW - cssSize.current.w) < 8 && Math.abs(cssH - cssSize.current.h) < 8) return;
      cssSize.current = { w: cssW, h: cssH };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(dpr, Math.sqrt(MAX_BITMAP / Math.max(1, cssW * cssH)));
      const w = Math.max(2, Math.round(cssW * scale));
      const h = Math.max(2, Math.round(cssH * scale));
      const prev = document.createElement("canvas");
      const had = ready.current && ink.width > 2;
      if (had) {
        prev.width = ink.width;
        prev.height = ink.height;
        prev.getContext("2d")?.drawImage(ink, 0, 0);
      }
      ink.width = w;
      ink.height = h;
      paperCanvas.width = w;
      paperCanvas.height = h;
      preview.width = w;
      preview.height = h;
      const ctx = ink.getContext("2d");
      if (ctx && had) ctx.drawImage(prev, 0, 0, w, h);
      const paperCtx = paperCanvas.getContext("2d");
      if (paperCtx) paintPaper(paperCtx, live.current.paper, live.current.pattern);
      ready.current = true;
      if (had) {
        undoStack.current = [];
        redoStack.current = [];
        setHist({ undo: false, redo: false });
      }
      if (pending.current && ctx) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(pending.current, 0, 0, w, h);
        pending.current = null;
      }
      if (pendingBook.current && ctx) {
        const book = pendingBook.current;
        pendingBook.current = null;
        applyBook(book);
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const paperCanvas = paperRef.current;
    const ctx = paperCanvas?.getContext("2d");
    if (!paperCanvas || !ctx || paperCanvas.width < 2) return;
    paintPaper(ctx, paper, pattern);
  }, [paper, pattern]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const book = await loadBook();
      if (cancel) return;
      if (book) {
        setPaper(book.paper || PAPERS[0]);
        setPattern(book.pattern || "plain");
        setSymmetry(book.symmetry || "off");
        const bitmaps: ImageBitmap[] = [];
        const moopies: Moopie[][] = [];
        for (const page of book.pages) {
          try {
            bitmaps.push(await createImageBitmap(page.ink));
            moopies.push(page.moopies || []);
          } catch {
            /* skip a page that did not decode */
          }
        }
        if (cancel) return;
        const packed = { bitmaps, moopies, index: book.index || 0 };
        if (inkRef.current && inkRef.current.width > 2) applyBook(packed);
        else pendingBook.current = packed;
      }
      loaded.current = true;
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useLayoutEffect(() => {
    const ua = navigator.userAgent || "";
    const params = new URLSearchParams(window.location.search);
    if (params.has("vr") || /Quest|Oculus|Vuplex|CEF\//i.test(ua)) rootRef.current?.classList.add("kp-vr");
  }, []);

  useLayoutEffect(() => {
    live.current = { tool, drawMode, wacky, shape, filled, stamp, color, paper, pattern, symmetry, size, pixel, sound, mash, letter: letterStyle };
    movesRef.current = moves;
    actions.current = { undo, redo, savePng };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.current.redo();
        else actions.current.undo();
        return;
      }
      if (typing) return;
      if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void actions.current.savePng();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => stopMusic(), []);

  useEffect(() => {
    if (!moving) {
      const canvas = moopieCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    let frame = 0;
    let last = 0;
    const loop = (time: number) => {
      frame = window.requestAnimationFrame(loop);
      if (time - last < 80) return;
      last = time;
      const canvas = moopieCanvasRef.current;
      const ink = inkRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ink || !ctx) return;
      if (canvas.width !== ink.width || canvas.height !== ink.height) {
        canvas.width = ink.width;
        canvas.height = ink.height;
      }
      drawMoopies(ctx, moopiesRef.current, time);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [moving]);

  useEffect(() => {
    if (!show) return;
    const canvas = showRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(rect.width * dpr));
    canvas.height = Math.max(2, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pages = pagesRef.current.filter((slot) => slot);
    let index = pageIndexRef.current % Math.max(1, pages.length);
    let from = index;
    let started = 0;
    let frame = 0;
    const draw = (time: number) => {
      const slot = pages[index];
      if (!slot) return;
      const prev = pages[from];
      const fade = started ? Math.min(1, (time - started) / 420) : 1;
      paintPaper(ctx, live.current.paper, live.current.pattern);
      if (prev && fade < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - fade;
        ctx.drawImage(prev.ink, 0, 0, canvas.width, canvas.height);
        drawMoopies(ctx, prev.moopies, time, false);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.drawImage(slot.ink, 0, 0, canvas.width, canvas.height);
      drawMoopies(ctx, slot.moopies, time, false);
      ctx.restore();
    };
    const loop = (time: number) => {
      draw(time);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    const timer = window.setInterval(() => {
      from = index;
      index = (index + 1) % Math.max(1, pages.length);
      started = performance.now();
      playSound("slide", live.current.sound);
    }, 1800);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [show]);

  const symmetryLabel = symmetry === "off" ? "solo" : symmetry === "lr" ? "mirror" : symmetry;
  const iconChip = (id: string, label: string, on: boolean, click: () => void) => (
    <button key={id} type="button" className={on ? "kp-chip is-on" : "kp-chip"} aria-pressed={on} onClick={click}>
      <ToolIcon name={id} />
      <span className="sr">{label}</span>
    </button>
  );
  const optionRow =
    tool === "draw" ? (
      DRAW_MODES.map((item) => iconChip(item.id, item.label, drawMode === item.id, () => setDrawMode(item.id)))
    ) : tool === "wacky" ? (
      WACKY_MODES.map((item) => iconChip(item.id, item.label, wacky === item.id, () => setWacky(item.id)))
    ) : tool === "shape" ? (
      <>
        {SHAPES.map((item) => iconChip(item.id, item.label, shape === item.id, () => setShape(item.id)))}
        {iconChip(filled ? "filled" : "outline", filled ? "filled" : "outline", filled, () => setFilled((value) => !value))}
        {shape === "polygon" ? (
          <button type="button" className="kp-chip" onClick={closePoly} disabled={polyCount < 3}>
            <ToolIcon name="close" />
            <span className="sr">close</span>
          </button>
        ) : null}
      </>
    ) : tool === "stamp" ? (
      <>
        {iconChip("still", "still", !moves, () => setMoves(false))}
        {iconChip("moopie", "moopie", moves, () => setMoves(true))}
        {iconChip("mash", "mash", mash, () => setMash((value) => !value))}
        {STAMPS.map((item) => iconChip(item.id, item.label, stamp === item.id, () => setStamp(item.id)))}
      </>
    ) : tool === "mix" ? (
      MIXES.map((item) => iconChip(item.id, item.label, false, () => runMix(item.id)))
    ) : tool === "letter" ? (
      (["plain", "bubble", "skinny"] as const).map((item) => iconChip(item, item, letterStyle === item, () => setLetterStyle(item)))
    ) : null;

  return (
    <div className="kp" ref={rootRef}>
      <div className="kp-top">
        <div className="kp-title">
          <strong>kid pix</strong>
          <span>{savedNote}</span>
        </div>
        <button type="button" className="kp-bar" onClick={undo} disabled={!hist.undo}>
          undo
        </button>
        <button type="button" className="kp-bar" onClick={redo} disabled={!hist.redo}>
          redo
        </button>
        <button
          type="button"
          className={symmetry !== "off" ? "kp-bar is-on" : "kp-bar"}
          onClick={() => setSymmetry((value) => (value === "off" ? "lr" : value === "lr" ? "quad" : value === "quad" ? "radial" : "off"))}
        >
          {symmetryLabel}
        </button>
        <button type="button" className={pixel ? "kp-bar is-on" : "kp-bar"} onClick={() => setPixel((value) => !value)}>
          {pixel ? "pixel" : "smooth"}
        </button>
        <button type="button" className="kp-bar" onClick={() => applyView({ x: 0, y: 0, scale: 1 })}>
          fit
        </button>
        <button type="button" className="kp-bar kp-boom" onClick={boom}>
          boom
        </button>
        <button type="button" className="kp-bar" onClick={nextPage}>
          {pageCount.index + 1}/{pageCount.total}
        </button>
        <button type="button" className="kp-bar" onClick={addPage}>
          + page
        </button>
        <button type="button" className="kp-bar" onClick={playShow}>
          play
        </button>
        <button type="button" className="kp-bar" onClick={loadColoring}>
          color
        </button>
        <button type="button" className="kp-bar" onClick={() => photoRef.current?.click()}>
          photo
        </button>
        <button type="button" className="kp-bar" onClick={() => void savePng()}>
          save
        </button>
        <button
          type="button"
          className={sound ? "kp-bar is-on" : "kp-bar"}
          onClick={() => {
            unlockAudio();
            setSound((value) => !value);
          }}
        >
          sfx
        </button>
        <button
          type="button"
          className={music ? "kp-bar is-on" : "kp-bar"}
          onClick={() => {
            unlockAudio();
            setMusicOn((value) => {
              setMusic(!value);
              return !value;
            });
          }}
        >
          tune
        </button>
        <button type="button" className="kp-bar" onClick={() => setHelp(true)}>
          ?
        </button>
      </div>

      <div className="kp-body">
        <div className="kp-tools" role="toolbar" aria-label="Tools">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? "kp-tool is-on" : "kp-tool"}
              aria-pressed={tool === item.id}
              onClick={() => {
                if (tool === "letter" && item.id !== "letter") commitDraft();
                bendRef.current = null;
                polyRef.current = [];
                setPolyCount(0);
                clearPreview();
                setTool(item.id);
                playSound("click", sound);
              }}
            >
              <span className="kp-glyph" aria-hidden="true">
                <ToolIcon name={item.id} />
              </span>
              <span className="kp-name">{item.label}</span>
            </button>
          ))}
        </div>

        <div
          className={flash ? "kp-stage is-flash" : "kp-stage"}
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="kp-world" ref={worldRef}>
            <canvas ref={paperRef} data-layer="paper" />
            <canvas ref={inkRef} data-layer="ink" />
            <canvas ref={moopieCanvasRef} data-layer="moopie" className="kp-preview" />
            <canvas ref={previewRef} data-layer="preview" className="kp-preview" />
          </div>
          {show ? (
            <div className="kp-show" onPointerDown={() => setShow(false)}>
              <canvas ref={showRef} />
              <p>tap to stop</p>
            </div>
          ) : null}
        </div>

        <div className="kp-dock">
          {optionRow ? (
            <div className="kp-options" role="toolbar" aria-label="Tool options">
              {optionRow}
            </div>
          ) : (
            <p className="kp-hint">
              {tool === "letter"
                ? "tap the page, type, then place"
                : tool === "van"
                  ? "drag a square of the picture"
                  : tool === "hand"
                    ? "drag to move · pinch to zoom"
                    : tool === "pick"
                      ? "tap a color in the picture"
                      : tool === "fill"
                        ? "tap a closed area"
                        : "pinch with two fingers to zoom"}
            </p>
          )}
          <div className="kp-swatches">
            <div className="kp-inks">
              {INKS.map((ink) => (
                <button
                  key={ink}
                  type="button"
                  className={color === ink ? "kp-swatch is-on" : "kp-swatch"}
                  style={{ background: ink }}
                  aria-label={`ink ${ink}`}
                  onClick={() => setColor(ink)}
                />
              ))}
              <label className="kp-custom">
                <span className="sr">custom ink</span>
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              </label>
              <span className="kp-split" aria-hidden="true" />
              {PAPERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={paper === item ? "kp-swatch kp-paper is-on" : "kp-swatch kp-paper"}
                  style={{ background: item }}
                  aria-label={`paper ${item}`}
                  onClick={() => setPaper(item)}
                />
              ))}
              {PATTERNS.map((item) => (
                <button key={item.id} type="button" className={pattern === item.id ? "kp-chip is-on" : "kp-chip"} onClick={() => setPattern(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <label className="kp-size">
              <span>{size}</span>
              <input
                type="range"
                min={2}
                max={48}
                value={size}
                aria-label="Size"
                onChange={(event) => setSize(Number(event.target.value))}
              />
            </label>
          </div>
        </div>
      </div>

      <input
        ref={photoRef}
        className="sr"
        type="file"
        accept="image/*"
        aria-label="Choose a photo from this device"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void placePhoto(file);
        }}
      />

      {draft ? (
        <form
          className="kp-text"
          style={{ left: draft.left, top: draft.top }}
          onSubmit={(event) => {
            event.preventDefault();
            commitDraft();
          }}
        >
          <input
            autoFocus
            value={draft.value}
            placeholder="type"
            aria-label="Lettering"
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => (current ? { ...current, value } : current));
              if (draftRef.current) draftRef.current.value = value;
            }}
          />
          <button type="submit">place</button>
        </form>
      ) : null}

      {help ? (
        <div className="kp-help" role="dialog" aria-labelledby="kp-help-title">
          <div className="kp-help-card">
            <h2 id="kp-help-title">kid pix</h2>
            <p>
              A homemade drawing toy with the same kinds of tools as the later paint programs: chalk, crayon, curves, polygons, coloring pictures, moving stamps, a masher, a toy TV mixer, and a fading slideshow. The pictures, icons, and sounds are original. The sounds are cheap synthesized toys, not recordings from a disc.
            </p>
            <p>Pictures stay in this browser. Save shares a PNG from the device. Nothing is uploaded.</p>
            <ul>
              <li>Draw adds chalk and crayon. Wacky includes a tree. Mixer can blur, fade, drip, or turn the page into a toy TV.</li>
              <li>Stamps can sit still, move, or mash with the next picture. Letters can be plain, round, or skinny.</li>
              <li>+ page adds a slide. The page count moves between them. Play runs the show.</li>
              <li>Mirror, quad, and radial copy a stroke. Boom clears the page. Undo brings it back.</li>
            </ul>
            <div className="kp-help-actions">
              <button
                type="button"
                onClick={() => {
                  void forgetSheet();
                  setSavedNote("saved copy cleared");
                }}
              >
                forget saved copy
              </button>
              <button type="button" className="is-on" onClick={() => setHelp(false)}>
                close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
