export type Tool =
  | "draw"
  | "wacky"
  | "line"
  | "shape"
  | "fill"
  | "stamp"
  | "letter"
  | "eraser"
  | "pick"
  | "van"
  | "mix"
  | "hand";

export type DrawMode = "pencil" | "brush" | "marker" | "spray" | "chalk" | "crayon";
export type WackyMode = "rainbow" | "dots" | "zigzag" | "spark" | "bubbles" | "confetti" | "drip" | "boxes" | "vine" | "tree";
export type ShapeKind = "rect" | "oval" | "circle" | "triangle" | "star" | "curve" | "polygon" | "round";
export type StampId =
  | "star"
  | "heart"
  | "smile"
  | "cat"
  | "flower"
  | "moon"
  | "bolt"
  | "tree"
  | "house"
  | "fish"
  | "crown"
  | "ghost";
export type MixId = "mirror" | "flip" | "invert" | "pop" | "melt" | "swirl" | "pixel" | "smear" | "kaleid" | "glitch" | "blur" | "fade" | "drip" | "tv";
export type Symmetry = "off" | "lr" | "quad" | "radial";
export type PaperPattern = "plain" | "dots" | "grid" | "ruled" | "stars";

export type Point = { x: number; y: number };

export const INKS = [
  "#161616",
  "#ffffff",
  "#ff3d6e",
  "#ff7a18",
  "#ffd23f",
  "#7dff6b",
  "#2ee6a6",
  "#3ecbff",
  "#6a78ff",
  "#c084fc",
  "#ff8bd2",
  "#8b5a2b",
  "#9aa0a6",
];

export const PAPERS = ["#fffdf8", "#111111", "#1b1030", "#fff3b0", "#d7f7ff", "#ffd6e8", "#e7ffd4"];

export const DRAW_MODES: { id: DrawMode; label: string }[] = [
  { id: "pencil", label: "pencil" },
  { id: "brush", label: "brush" },
  { id: "marker", label: "marker" },
  { id: "spray", label: "spray" },
  { id: "chalk", label: "chalk" },
  { id: "crayon", label: "crayon" },
];

export const WACKY_MODES: { id: WackyMode; label: string }[] = [
  { id: "rainbow", label: "rainbow" },
  { id: "dots", label: "dots" },
  { id: "zigzag", label: "zigzag" },
  { id: "spark", label: "spark" },
  { id: "bubbles", label: "bubbles" },
  { id: "confetti", label: "confetti" },
  { id: "drip", label: "drip" },
  { id: "boxes", label: "boxes" },
  { id: "vine", label: "vine" },
  { id: "tree", label: "tree" },
];

export const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "box" },
  { id: "round", label: "round" },
  { id: "oval", label: "oval" },
  { id: "circle", label: "circle" },
  { id: "triangle", label: "triangle" },
  { id: "star", label: "star" },
  { id: "curve", label: "curve" },
  { id: "polygon", label: "polygon" },
];

export const STAMPS: { id: StampId; label: string }[] = [
  { id: "star", label: "star" },
  { id: "heart", label: "heart" },
  { id: "smile", label: "smile" },
  { id: "cat", label: "cat" },
  { id: "flower", label: "flower" },
  { id: "moon", label: "moon" },
  { id: "bolt", label: "bolt" },
  { id: "tree", label: "tree" },
  { id: "house", label: "house" },
  { id: "fish", label: "fish" },
  { id: "crown", label: "crown" },
  { id: "ghost", label: "ghost" },
];

export const MIXES: { id: MixId; label: string }[] = [
  { id: "mirror", label: "mirror" },
  { id: "flip", label: "flip" },
  { id: "invert", label: "invert" },
  { id: "pop", label: "pop" },
  { id: "melt", label: "melt" },
  { id: "swirl", label: "swirl" },
  { id: "pixel", label: "pixel" },
  { id: "smear", label: "smear" },
  { id: "kaleid", label: "kaleid" },
  { id: "glitch", label: "glitch" },
  { id: "blur", label: "blur" },
  { id: "fade", label: "fade" },
  { id: "drip", label: "drip" },
  { id: "tv", label: "tv" },
];

export const PATTERNS: { id: PaperPattern; label: string }[] = [
  { id: "plain", label: "plain" },
  { id: "dots", label: "dots" },
  { id: "grid", label: "grid" },
  { id: "ruled", label: "ruled" },
  { id: "stars", label: "stars" },
];

export const TOOLS: { id: Tool; label: string; glyph: string }[] = [
  { id: "draw", label: "draw", glyph: "✎" },
  { id: "wacky", label: "wacky", glyph: "✺" },
  { id: "line", label: "line", glyph: "╱" },
  { id: "shape", label: "shape", glyph: "▢" },
  { id: "fill", label: "fill", glyph: "▣" },
  { id: "stamp", label: "stamp", glyph: "❀" },
  { id: "letter", label: "letter", glyph: "A" },
  { id: "eraser", label: "eraser", glyph: "⌫" },
  { id: "pick", label: "pick", glyph: "◉" },
  { id: "van", label: "van", glyph: "▣" },
  { id: "mix", label: "mix", glyph: "🌀" },
  { id: "hand", label: "move", glyph: "✋" },
];

export function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length < 6) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgba(hex: string, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

export function mirrorPoint(point: Point, mode: Symmetry, width: number, height: number): Point[] {
  if (mode === "off") return [point];
  const cx = width / 2;
  const cy = height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const out: Point[] = [point];
  if (mode === "lr" || mode === "quad") out.push({ x: cx - dx, y: point.y });
  if (mode === "quad") {
    out.push({ x: point.x, y: cy - dy });
    out.push({ x: cx - dx, y: cy - dy });
  }
  if (mode === "radial") {
    for (let i = 1; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      out.push({ x: cx + dx * c - dy * s, y: cy + dx * s + dy * c });
    }
  }
  return out;
}

export function floodFill(
  image: ImageData,
  x: number,
  y: number,
  fill: [number, number, number, number],
  tolerance = 36,
): boolean {
  const width = image.width;
  const height = image.height;
  const px = image.data;
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false;
  const start = (sy * width + sx) * 4;
  const sr = px[start];
  const sg = px[start + 1];
  const sb = px[start + 2];
  const sa = px[start + 3];
  const [fr, fg, fb, fa] = fill;
  if (sr === fr && sg === fg && sb === fb && sa === fa) return false;
  const limit = tolerance * tolerance * 4;
  const seen = new Uint8Array(width * height);
  const matches = (pixel: number) => {
    if (seen[pixel]) return false;
    const i = pixel * 4;
    const dr = px[i] - sr;
    const dg = px[i + 1] - sg;
    const db = px[i + 2] - sb;
    const da = px[i + 3] - sa;
    return dr * dr + dg * dg + db * db + da * da <= limit;
  };
  if (!matches(sy * width + sx)) return false;
  const stack: number[] = [sx, sy];
  let painted = false;
  while (stack.length) {
    const cy = stack.pop() as number;
    let cx = stack.pop() as number;
    while (cx > 0 && matches(cy * width + (cx - 1))) cx -= 1;
    let up = false;
    let down = false;
    for (; cx < width && matches(cy * width + cx); cx += 1) {
      const pixel = cy * width + cx;
      seen[pixel] = 1;
      const i = pixel * 4;
      px[i] = fr;
      px[i + 1] = fg;
      px[i + 2] = fb;
      px[i + 3] = fa;
      painted = true;
      if (cy > 0) {
        const above = pixel - width;
        if (!up && matches(above)) {
          stack.push(cx, cy - 1);
          up = true;
        } else if (up && !matches(above)) up = false;
      }
      if (cy < height - 1) {
        const below = pixel + width;
        if (!down && matches(below)) {
          stack.push(cx, cy + 1);
          down = true;
        } else if (down && !matches(below)) down = false;
      }
    }
  }
  return painted;
}

function index(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

function copyPixel(src: Uint8ClampedArray, from: number, dst: Uint8ClampedArray, to: number) {
  dst[to] = src[from];
  dst[to + 1] = src[from + 1];
  dst[to + 2] = src[from + 2];
  dst[to + 3] = src[from + 3];
}

export function mixPixels(image: ImageData, kind: MixId) {
  const width = image.width;
  const height = image.height;
  const dst = image.data;
  const src = new Uint8ClampedArray(dst);
  const at = (x: number, y: number) => index(x, y, width);

  if (kind === "mirror" || kind === "kaleid") {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sx = kind === "kaleid" ? (x < width / 2 ? x : width - 1 - x) : x < width / 2 ? x : width - 1 - x;
        const sy = kind === "kaleid" ? (y < height / 2 ? y : height - 1 - y) : y;
        copyPixel(src, at(sx, sy), dst, at(x, y));
      }
    }
    return;
  }

  if (kind === "flip") {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) copyPixel(src, at(width - 1 - x, y), dst, at(x, y));
    }
    return;
  }

  if (kind === "invert" || kind === "pop") {
    for (let i = 0; i < dst.length; i += 4) {
      if (src[i + 3] === 0) continue;
      if (kind === "invert") {
        dst[i] = 255 - src[i];
        dst[i + 1] = 255 - src[i + 1];
        dst[i + 2] = 255 - src[i + 2];
      } else {
        dst[i] = Math.max(0, Math.min(255, (src[i] - 128) * 1.65 + 128));
        dst[i + 1] = Math.max(0, Math.min(255, (src[i + 1] - 128) * 1.65 + 128));
        dst[i + 2] = Math.max(0, Math.min(255, (src[i + 2] - 128) * 1.65 + 128));
      }
    }
    return;
  }

  if (kind === "melt") {
    for (let y = 0; y < height; y++) {
      const shift = Math.round((Math.sin(y * 0.17) * 0.5 + (hash(y) - 0.5)) * 36);
      for (let x = 0; x < width; x++) {
        const sx = (x + shift + width * 4) % width;
        copyPixel(src, at(sx, y), dst, at(x, y));
      }
    }
    return;
  }

  if (kind === "smear") {
    for (let x = 0; x < width; x++) {
      const shift = Math.round(Math.sin(x * 0.04) * 22);
      for (let y = 0; y < height; y++) {
        const sy = Math.max(0, Math.min(height - 1, y - shift));
        copyPixel(src, at(x, sy), dst, at(x, y));
      }
    }
    return;
  }

  if (kind === "pixel") {
    const block = Math.max(6, Math.round(Math.min(width, height) / 48));
    for (let y = 0; y < height; y += block) {
      for (let x = 0; x < width; x += block) {
        const sample = at(Math.min(width - 1, x + (block >> 1)), Math.min(height - 1, y + (block >> 1)));
        for (let yy = y; yy < Math.min(height, y + block); yy++) {
          for (let xx = x; xx < Math.min(width, x + block); xx++) copyPixel(src, sample, dst, at(xx, yy));
        }
      }
    }
    return;
  }

  if (kind === "fade") {
    for (let i = 0; i < dst.length; i += 4) dst[i + 3] = Math.round(src[i + 3] * 0.45);
    return;
  }

  if (kind === "drip") {
    for (let x = 0; x < width; x++) {
      const shift = 6 + Math.floor(hash(x + 4) * 30);
      for (let y = 0; y < height; y++) {
        const sy = y - shift;
        if (sy < 0) {
          const here = at(x, y);
          dst[here + 3] = 0;
        } else copyPixel(src, at(x, sy), dst, at(x, y));
      }
    }
    return;
  }

  if (kind === "blur") {
    const blurOnce = (from: Uint8ClampedArray, to: Uint8ClampedArray) => {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0;
          let g = 0;
          let b = 0;
          let a = 0;
          let n = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const sx = x + ox;
              const sy = y + oy;
              if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
              const i = at(sx, sy);
              r += from[i];
              g += from[i + 1];
              b += from[i + 2];
              a += from[i + 3];
              n += 1;
            }
          }
          const o = at(x, y);
          to[o] = r / n;
          to[o + 1] = g / n;
          to[o + 2] = b / n;
          to[o + 3] = a / n;
        }
      }
    };
    const mid = new Uint8ClampedArray(dst.length);
    blurOnce(src, mid);
    blurOnce(mid, dst);
    return;
  }

  if (kind === "tv") {
    const step = (n: number) => Math.round(n / 64) * 64;
    for (let y = 0; y < height; y++) {
      const dim = y % 3 === 0 ? 0.55 : 1;
      for (let x = 0; x < width; x++) {
        const i = at(x, y);
        if (src[i + 3] === 0) continue;
        dst[i] = Math.round(step(src[i]) * dim);
        dst[i + 1] = Math.round(step(src[i + 1]) * dim);
        dst[i + 2] = Math.round(step(src[i + 2]) * dim);
      }
    }
    return;
  }

  if (kind === "glitch") {
    const shift = Math.max(4, Math.round(width / 80));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const left = at(Math.max(0, x - shift), y);
        const right = at(Math.min(width - 1, x + shift), y);
        const here = at(x, y);
        dst[here] = src[left];
        dst[here + 1] = src[here + 1];
        dst[here + 2] = src[right + 2];
        dst[here + 3] = src[here + 3];
      }
    }
    return;
  }

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(1, Math.min(cx, cy));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = 2.4 * (1 - Math.min(1, dist / radius));
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const sx = Math.round(cx + dx * c + dy * s);
      const sy = Math.round(cy - dx * s + dy * c);
      const from = sx >= 0 && sy >= 0 && sx < width && sy < height ? at(sx, sy) : at(x, y);
      copyPixel(src, from, dst, at(x, y));
    }
  }
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function paintPaper(ctx: CanvasRenderingContext2D, color: string, pattern: PaperPattern) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  if (pattern === "plain") return;
  ctx.save();
  if (pattern === "dots") {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    for (let y = 18; y < height; y += 32) {
      for (let x = 18; x < width; x += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "grid") {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    for (let x = 0.5; x < width; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0.5; y < height; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (pattern === "ruled") {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#6aa7ff";
    ctx.lineWidth = 2;
    for (let y = 42; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#000";
    for (let i = 0; i < 36; i++) {
      const x = Math.round((hash(i + 3) * width) % width);
      const y = Math.round((hash(i + 11) * height) % height);
      starPath(ctx, x, y, 7, 3);
      ctx.fill();
    }
  }
  ctx.restore();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * (Math.PI / 5);
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function traceShape(ctx: CanvasRenderingContext2D, kind: ShapeKind, a: Point, b: Point) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.max(1, Math.abs(b.x - a.x));
  const h = Math.max(1, Math.abs(b.y - a.y));
  ctx.beginPath();
  if (kind === "rect") {
    ctx.rect(x, y, w, h);
  } else if (kind === "oval") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (kind === "circle") {
    const radius = Math.max(w, h) / 2;
    ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, radius, 0, Math.PI * 2);
  } else if (kind === "round") {
    ctx.roundRect(x, y, w, h, Math.min(28, Math.min(w, h) * 0.35));
  } else if (kind === "triangle") {
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else {
    starPath(ctx, x + w / 2, y + h / 2, Math.max(w, h) / 2, Math.max(w, h) / 4.4);
  }
}

export function strokeSegment(ctx: CanvasRenderingContext2D, a: Point, b: Point, width: number) {
  ctx.beginPath();
  ctx.lineWidth = Math.max(1, width);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

export function chalkDots(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45;
  const grain = Math.max(2, size * 0.7);
  for (let n = 0; n < 7; n++) {
    const ox = (Math.random() - 0.5) * grain;
    const oy = (Math.random() - 0.5) * grain;
    ctx.fillRect(x + ox, y + oy, Math.max(1.2, size * 0.22), Math.max(1.2, size * 0.22));
  }
  ctx.restore();
}

export function traceCurve(ctx: CanvasRenderingContext2D, a: Point, b: Point, control: Point) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
}

export function tracePoly(ctx: CanvasRenderingContext2D, points: Point[], close: boolean) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  if (close) ctx.closePath();
}

export function sprayDots(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, pixel: boolean) {
  ctx.fillStyle = color;
  const span = pixel ? 2 : 1.6;
  for (let n = 0; n < 10; n++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    ctx.fillRect(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, span, span);
  }
}

export function softDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const r = Math.max(1, radius);
  const gradient = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function paintWacky(ctx: CanvasRenderingContext2D, mode: WackyMode, x: number, y: number, size: number, color: string, hue: number) {
  ctx.save();
  const ink = mode === "rainbow" ? `hsl(${hue % 360} 92% 56%)` : color;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, size * 0.18);
  const s = Math.max(4, size);
  if (mode === "rainbow" || mode === "dots") {
    ctx.beginPath();
    ctx.arc(x, y, mode === "dots" ? s * 0.45 : s * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else if (mode === "boxes") {
    ctx.fillRect(x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9);
  } else if (mode === "bubbles") {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mode === "confetti") {
    ctx.rotate(((hue % 40) - 20) * (Math.PI / 180));
    ctx.fillRect(x - s * 0.45, y - s * 0.16, s * 0.9, s * 0.32);
  } else if (mode === "spark") {
    starPath(ctx, x, y, s * 0.7, s * 0.28);
    ctx.fill();
  } else if (mode === "drip") {
    ctx.fillRect(x - s * 0.12, y, s * 0.24, s * 1.3);
    ctx.beginPath();
    ctx.arc(x, y + s * 1.3, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (mode === "vine") {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (mode === "tree") {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.2);
    ctx.lineTo(x, y - s * 1.4);
    ctx.moveTo(x, y - s * 0.7);
    ctx.lineTo(x - s * 0.7, y - s * 1.3);
    ctx.moveTo(x, y - s * 0.9);
    ctx.lineTo(x + s * 0.75, y - s * 1.45);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y);
    ctx.lineTo(x, y - s * 0.45);
    ctx.lineTo(x + s * 0.5, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawStamp(ctx: CanvasRenderingContext2D, id: StampId, x: number, y: number, size: number, color: string) {
  const s = Math.max(28, size);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((hash(Math.round(x + y)) - 0.5) * 0.5);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (id === "star") {
    starPath(ctx, 0, 0, s * 0.5, s * 0.22);
    ctx.fill();
  } else if (id === "heart") {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.32);
    ctx.bezierCurveTo(-s * 0.55, -s * 0.15, -s * 0.2, -s * 0.55, 0, -s * 0.18);
    ctx.bezierCurveTo(s * 0.2, -s * 0.55, s * 0.55, -s * 0.15, 0, s * 0.32);
    ctx.fill();
  } else if (id === "smile") {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#161616";
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.08, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.15, -s * 0.08, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#161616";
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.16, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else if (id === "cat") {
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.32, 0, Math.PI * 2);
    ctx.moveTo(-s * 0.28, -s * 0.05);
    ctx.lineTo(-s * 0.42, -s * 0.42);
    ctx.lineTo(-s * 0.05, -s * 0.2);
    ctx.moveTo(s * 0.28, -s * 0.05);
    ctx.lineTo(s * 0.42, -s * 0.42);
    ctx.lineTo(s * 0.05, -s * 0.2);
    ctx.fill();
  } else if (id === "flower") {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * s * 0.22, Math.sin(angle) * s * 0.22, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "moon") {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(s * 0.16, -s * 0.08, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "bolt") {
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.48);
    ctx.lineTo(-s * 0.22, s * 0.05);
    ctx.lineTo(s * 0.02, s * 0.05);
    ctx.lineTo(-s * 0.12, s * 0.48);
    ctx.lineTo(s * 0.28, -s * 0.08);
    ctx.lineTo(s * 0.02, -s * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (id === "tree") {
    ctx.fillRect(-s * 0.06, s * 0.05, s * 0.12, s * 0.36);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.48);
    ctx.lineTo(s * 0.34, s * 0.12);
    ctx.lineTo(-s * 0.34, s * 0.12);
    ctx.closePath();
    ctx.fill();
  } else if (id === "house") {
    ctx.fillRect(-s * 0.28, -s * 0.02, s * 0.56, s * 0.4);
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, -s * 0.02);
    ctx.lineTo(0, -s * 0.4);
    ctx.lineTo(s * 0.36, -s * 0.02);
    ctx.closePath();
    ctx.fill();
  } else if (id === "fish") {
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, 0, s * 0.32, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.22, 0);
    ctx.lineTo(s * 0.48, -s * 0.18);
    ctx.lineTo(s * 0.48, s * 0.18);
    ctx.closePath();
    ctx.fill();
  } else if (id === "crown") {
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.18);
    ctx.lineTo(-s * 0.28, -s * 0.28);
    ctx.lineTo(-s * 0.08, s * 0.02);
    ctx.lineTo(0, -s * 0.4);
    ctx.lineTo(s * 0.08, s * 0.02);
    ctx.lineTo(s * 0.28, -s * 0.28);
    ctx.lineTo(s * 0.4, s * 0.18);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.32, Math.PI, 0);
    ctx.lineTo(s * 0.32, s * 0.28);
    ctx.lineTo(-s * 0.32, s * 0.28);
    ctx.fill();
    ctx.fillStyle = "#161616";
    ctx.beginPath();
    ctx.arc(-s * 0.12, -s * 0.02, s * 0.045, 0, Math.PI * 2);
    ctx.arc(s * 0.12, -s * 0.02, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function sampleInk(image: ImageData, x: number, y: number, paper: string): string | null {
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) return null;
  const i = (sy * image.width + sx) * 4;
  if (image.data[i + 3] < 16) return paper;
  return rgbToHex(image.data[i], image.data[i + 1], image.data[i + 2]);
}

export function blankInk(image: ImageData): boolean {
  const px = image.data;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] !== 0) return false;
  }
  return true;
}
