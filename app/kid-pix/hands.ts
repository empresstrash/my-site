export type HandsApi = {
  zoomBy: (factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  nudgeSize: (delta: number) => void;
  setGrabbed: (on: boolean) => void;
};

const DEAD = 0.28;

function axis(pad: Gamepad, index: number): number {
  const value = pad.axes[index] ?? 0;
  return Math.abs(value) < DEAD ? 0 : value;
}

function isTouch(pad: Gamepad): boolean {
  const hand = (pad as Gamepad & { hand?: string }).hand;
  return Boolean(hand) || /oculus|touch|quest|xr-standard/i.test(pad.id);
}

/** Left stick moves the canvas. Right stick changes size. A grabs. */
export function readHands(grabbed: boolean): { zoom: number; panX: number; panY: number; size: number; grabToggle: boolean } {
  const pads = [...(navigator.getGamepads?.() ?? [])].filter((pad): pad is Gamepad => Boolean(pad));
  const touch = pads.filter(isTouch);
  let lx = 0;
  let ly = 0;
  let ry = 0;
  let a = false;

  if (touch.length > 0) {
    const left = touch.find((pad) => (pad as Gamepad & { hand?: string }).hand === "left" || /left/i.test(pad.id)) ?? touch[0];
    const right = touch.find((pad) => (pad as Gamepad & { hand?: string }).hand === "right" || /right/i.test(pad.id));
    const stickX = left.axes.length > 3 ? 2 : 0;
    const stickY = left.axes.length > 3 ? 3 : 1;
    lx = axis(left, stickX);
    ly = axis(left, stickY);
    if (right) {
      const rightY = right.axes.length > 3 ? 3 : 1;
      ry = axis(right, rightY);
      a = Boolean(right.buttons[4]?.pressed);
    }
  } else {
    const pad = pads.find((item) => item.axes.length >= 2);
    if (pad) {
      lx = axis(pad, 0);
      ly = axis(pad, 1);
      ry = axis(pad, 3);
      a = Boolean(pad.buttons[0]?.pressed);
    }
  }

  // Stick forward is negative. Forward zooms in and makes the brush bigger.
  const forward = -ly;
  const size = -ry;
  return {
    zoom: grabbed ? 0 : forward,
    panX: lx,
    panY: grabbed ? ly : 0,
    size,
    grabToggle: a,
  };
}
