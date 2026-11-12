import { drawStamp, paintPaper, type PaperPattern, type Point, type StampId } from "./engine";

export type MoopieMotion = "bob" | "spin" | "wiggle" | "drift";

export type Moopie = {
  id: number;
  stamp: StampId;
  x: number;
  y: number;
  size: number;
  color: string;
  motion: MoopieMotion;
  phase: number;
};

export const MOOPIE_MOTIONS: MoopieMotion[] = ["bob", "spin", "wiggle", "drift"];

export const COLOR_MES = ["rocket", "castle", "bug", "fish"] as const;
export type ColorMe = (typeof COLOR_MES)[number];

export function drawMoopies(ctx: CanvasRenderingContext2D, list: Moopie[], time: number, clear = true) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  if (clear) ctx.clearRect(0, 0, width, height);
  const span = Math.min(width, height);
  for (const item of list) {
    const t = time / 1000 + item.phase;
    let x = item.x * width;
    let y = item.y * height;
    let rot = 0;
    if (item.motion === "bob") y += Math.sin(t * 3) * span * 0.02;
    else if (item.motion === "spin") rot = t * 2;
    else if (item.motion === "wiggle") rot = Math.sin(t * 6) * 0.45;
    else {
      x += Math.sin(t) * span * 0.03;
      y += Math.cos(t * 0.8) * span * 0.02;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    drawStamp(ctx, item.stamp, 0, 0, Math.max(28, item.size * span), item.color);
    ctx.restore();
  }
}

export function paintColorMe(ctx: CanvasRenderingContext2D, kind: ColorMe) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const size = Math.min(width, height) * 0.62;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.strokeStyle = "#161616";
  ctx.lineWidth = Math.max(5, size * 0.028);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const stroke = (draw: () => void) => {
    ctx.beginPath();
    draw();
    ctx.stroke();
  };
  if (kind === "rocket") {
    stroke(() => ctx.rect(-size * 0.16, -size * 0.18, size * 0.32, size * 0.5));
    stroke(() => {
      ctx.moveTo(-size * 0.16, -size * 0.18);
      ctx.lineTo(0, -size * 0.48);
      ctx.lineTo(size * 0.16, -size * 0.18);
      ctx.closePath();
    });
    stroke(() => ctx.ellipse(0, 0, size * 0.07, size * 0.09, 0, 0, Math.PI * 2));
    stroke(() => {
      ctx.moveTo(-size * 0.16, size * 0.16);
      ctx.lineTo(-size * 0.34, size * 0.42);
      ctx.lineTo(-size * 0.16, size * 0.32);
      ctx.closePath();
    });
    stroke(() => {
      ctx.moveTo(size * 0.16, size * 0.16);
      ctx.lineTo(size * 0.34, size * 0.42);
      ctx.lineTo(size * 0.16, size * 0.32);
      ctx.closePath();
    });
  } else if (kind === "castle") {
    stroke(() => ctx.rect(-size * 0.34, -size * 0.02, size * 0.68, size * 0.42));
    stroke(() => ctx.rect(-size * 0.34, -size * 0.28, size * 0.16, size * 0.26));
    stroke(() => ctx.rect(size * 0.18, -size * 0.28, size * 0.16, size * 0.26));
    stroke(() => ctx.rect(-size * 0.08, size * 0.08, size * 0.16, size * 0.32));
    stroke(() => ctx.ellipse(0, -size * 0.08, size * 0.1, size * 0.1, 0, 0, Math.PI * 2));
  } else if (kind === "bug") {
    stroke(() => ctx.ellipse(0, size * 0.08, size * 0.28, size * 0.34, 0, 0, Math.PI * 2));
    stroke(() => ctx.ellipse(0, -size * 0.28, size * 0.16, size * 0.14, 0, 0, Math.PI * 2));
    stroke(() => ctx.ellipse(-size * 0.08, -size * 0.3, size * 0.035, size * 0.045, 0, 0, Math.PI * 2));
    stroke(() => ctx.ellipse(size * 0.08, -size * 0.3, size * 0.035, size * 0.045, 0, 0, Math.PI * 2));
    stroke(() => {
      ctx.moveTo(-size * 0.1, -size * 0.4);
      ctx.quadraticCurveTo(-size * 0.28, -size * 0.55, -size * 0.2, -size * 0.22);
    });
    stroke(() => {
      ctx.moveTo(size * 0.1, -size * 0.4);
      ctx.quadraticCurveTo(size * 0.28, -size * 0.55, size * 0.2, -size * 0.22);
    });
  } else {
    stroke(() => ctx.ellipse(-size * 0.05, 0, size * 0.32, size * 0.16, 0, 0, Math.PI * 2));
    stroke(() => {
      ctx.moveTo(size * 0.22, 0);
      ctx.lineTo(size * 0.46, -size * 0.16);
      ctx.lineTo(size * 0.46, size * 0.16);
      ctx.closePath();
    });
    stroke(() => ctx.ellipse(-size * 0.16, -size * 0.03, size * 0.035, size * 0.035, 0, 0, Math.PI * 2));
  }
  ctx.restore();
}

export function paintSlide(
  ctx: CanvasRenderingContext2D,
  page: HTMLCanvasElement,
  moopies: Moopie[],
  paper: string,
  pattern: PaperPattern,
  time: number,
) {
  paintPaper(ctx, paper, pattern);
  ctx.drawImage(page, 0, 0, ctx.canvas.width, ctx.canvas.height);
  drawMoopies(ctx, moopies, time, false);
}

export function mirrorSet(points: Point[], mirrors: Point[][]): Point[][] {
  if (points.length === 0) return [];
  const count = mirrors[0]?.length ?? 0;
  const shapes: Point[][] = [];
  for (let i = 0; i < count; i++) shapes.push(mirrors.map((set) => set[i]));
  return shapes;
}
