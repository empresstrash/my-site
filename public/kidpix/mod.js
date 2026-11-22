/* Extra tools and canvas zoom for the one Kid Pix page. */
function init_mods() {
  var userZoom = 1;
  var panX = 0;
  var panY = 0;
  var grabbed = false;

  function port() {
    return document.getElementById("zoomport");
  }

  function paint() {
    return document.getElementById("paint");
  }

  function fitScale() {
    var box = port();
    if (!box || !box.clientWidth || !box.clientHeight) return 1;
    var frame = 8;
    var w = Math.max(1, box.clientWidth - frame * 2);
    var h = Math.max(1, box.clientHeight - frame * 2);
    return Math.min(w / 1920, h / 1200);
  }

  function applyView() {
    var box = port();
    var sheet = paint();
    if (!box || !sheet) return;
    var scale = fitScale() * userZoom;
    var ox = (box.clientWidth - 1920 * scale) / 2 + panX;
    var oy = (box.clientHeight - 1200 * scale) / 2 + panY;
    sheet.style.transform = "translate(" + ox + "px," + oy + "px) scale(" + scale + ")";
  }

  function setGrabbed(on) {
    grabbed = Boolean(on);
    var box = port();
    if (box) box.classList.toggle("is-grabbing", grabbed);
  }

  // Step 69 draws a stamp three canvas-widths across. The steps below that
  // are even slices of that size. The number on the bar is the step.
  var sizeSteps = 69;
  var sizeAtTop = (3 * 1920) / 64;

  function setSize(value) {
    var step = Math.min(sizeSteps, Math.max(1, Math.round(Number(value) || 1)));
    var scale = (step * sizeAtTop) / sizeSteps;
    KiddoPaint.Current.toolScale = scale;
    KiddoPaint.Current.stampScale = scale;
    KiddoPaint.Current.scaling = scale;
    var input = document.getElementById("kp-size");
    if (input && Number(input.value) !== step) input.value = String(step);
    var shown = document.getElementById("kp-size-value");
    if (shown) shown.textContent = String(step);
  }

  window.kpView = {
    zoomBy: function (factor) {
      userZoom = Math.min(5, Math.max(0.35, userZoom * factor));
      applyView();
    },
    panBy: function (dx, dy) {
      panX += dx;
      panY += dy;
      applyView();
    },
    nudgeSize: function (delta) {
      var input = document.getElementById("kp-size");
      var current = input ? Number(input.value) : KiddoPaint.Current.stampScale || 1;
      setSize(current + delta);
    },
    setGrabbed: setGrabbed,
    setSize: setSize,
    setOpacity: setOpacity,
    nudgeOpacity: function (delta) {
      var input = document.getElementById("kp-fade");
      var current = input ? Number(input.value) : Math.round((KiddoPaint.Current.globalAlpha || 1) * 100);
      setOpacity(current + delta);
    },
    nudgeAngle: function (delta) {
      setAngle((KiddoPaint.Current.toolAngle || 0) + delta);
    },
    setAngle: setAngle,
    nudgeCurve: nudgeCurve,
    setPoints: setPoints,
    nudgePoints: function (delta) {
      setPoints(shapePoints + delta);
    },
    resetBar: function () {
      userZoom = 1;
      panX = 0;
      panY = 0;
      setGrabbed(false);
      applyView();
      setSize(1);
      setOpacity(100);
      setAngle(0);
      setPoints(5);
      var amp = document.getElementById("kp-amp-range");
      var ampShown = document.getElementById("kp-amp-value");
      if (amp) amp.value = "0";
      if (ampShown) ampShown.textContent = "0";
    },
  };

  function setOpacity(value) {
    var step = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
    KiddoPaint.Current.globalAlpha = step / 100;
    if (KiddoPaint.Display.context) KiddoPaint.Display.context.globalAlpha = step / 100;
    if (KiddoPaint.Display.previewContext) KiddoPaint.Display.previewContext.globalAlpha = step / 100;
    var input = document.getElementById("kp-fade");
    if (input && Number(input.value) !== step) input.value = String(step);
    var shown = document.getElementById("kp-fade-value");
    if (shown) shown.textContent = String(step);
  }

  function setAngle(value) {
    var raw = Math.round(Number(value) || 0);
    var next = ((raw % 360) + 360) % 360;
    if (raw === 360) next = 360;
    KiddoPaint.Current.toolAngle = next % 360;
    var shown = document.getElementById("kp-angle-value");
    if (shown) shown.textContent = next + "°";
    var input = document.getElementById("kp-angle");
    if (input && Number(input.value) !== next) input.value = String(next);
    refreshShape();
  }

  setSize(1);
  applyView();
  fitChrome();
  if (window.ResizeObserver) {
    var watcher = new ResizeObserver(function () {
      fitChrome();
      applyView();
    });
    watcher.observe(document.getElementById("container"));
  } else {
    window.addEventListener("resize", function () {
      fitChrome();
      applyView();
    });
  }

  var showGeneric = window.show_generic_submenu;
  if (showGeneric) {
    window.show_generic_submenu = function (type) {
      showGeneric(type);
      var menu = document.getElementById("genericsubmenu");
      if (menu) {
        menu.classList.toggle("kp-shape-menu", type === "shape");
        menu.classList.toggle("kp-stamp-menu", type === "sprites");
      }
      showTexture(type === "shape");
      fitRows();
    };
  }
  var showSub = window.show_sub_toolbar;
  if (showSub) {
    window.show_sub_toolbar = function (name) {
      showSub(name);
      showTexture(name === "alphabettoolbar");
      fitRows();
    };
  }

  function fitChrome() {
    var root = document.querySelector(".kp-one");
    var main = document.getElementById("mainbar");
    var colors = document.getElementById("colorbar");
    if (!root || !main || !colors) return;
    var count = main.querySelectorAll(".tool").length || 1;
    var tool = main.clientHeight / count;
    if (!(tool > 0)) tool = 28;
    tool = Math.min(50, tool);
    root.style.setProperty("--kp-tool", tool + "px");
    var swatch = Math.max(10, Math.min(36, Math.floor(colors.clientHeight / 19)));
    root.style.setProperty("--kp-swatch", swatch + "px");
    fitRows();
  }

  function fitRows() {
    var root = document.querySelector(".kp-one");
    var bar = document.querySelector("#genericsubmenu:not(.hidden), #alphabettoolbar:not(.hidden)");
    if (!root || !bar || !bar.clientWidth) return;
    var sprites = bar.querySelector("img.sprite");
    var floor = sprites ? 32 : 22;
    var buttons = bar.querySelectorAll("button").length || 1;
    var select = bar.querySelector("select") ? 1.7 : 0;
    var option = Math.floor(bar.clientWidth / (buttons + select));
    option = Math.max(floor, Math.min(50, option));
    root.style.setProperty("--kp-option", option + "px");
    if (bar.scrollWidth > bar.clientWidth + 2) {
      var next = Math.floor(option * (bar.clientWidth / bar.scrollWidth));
      root.style.setProperty("--kp-option", Math.max(floor, next) + "px");
    }
  }

  port().addEventListener("pointerdown", function (ev) {
    if (!grabbed) return;
    ev.preventDefault();
    var lastX = ev.clientX;
    var lastY = ev.clientY;
    function move(e) {
      panX += e.clientX - lastX;
      panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyView();
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  // Bottom bar. Add another entry here to add a tool.
  // menu() fills the original top option bar. make() is the drawing tool.
  var drawStyle = "marker";
  var shapeKind = "triangle";
  var shapePoints = 5;
  var shapeFill = function () {
    return KiddoPaint.Textures.Solid(KiddoPaint.Current.color);
  };
  var shapeTextures = [
    "None", "Solid", "Partial1", "Partial2", "Partial3", "PartialArtifactAlias",
    "Speckles", "Stripes", "Thatch", "Shingles", "Bubbles", "Diamond", "Ribbon",
    "Sand", "Brick", "Chevron", "Stairs", "Cross", "DiagBrick", "CornerStair", "Houndstooth",
    "Dots", "Grid", "Waves", "Hearts", "TinyStars", "Flowers", "Zigzag", "Plaid", "Scales", "Dashes",
    "Checker", "Gingham", "Polka", "Honeycomb", "Triangles", "Rings", "Crosshatch", "Herringbone",
    "Basket", "Argyle", "Lattice", "Confetti", "Plushes", "Squiggle", "Halftone", "Boxes",
  ];
  var texturePage = 0;
  var fillName = "Solid";

  function glyph(draw) {
    var sheet = document.createElement("canvas");
    sheet.width = 40;
    sheet.height = 40;
    var g = sheet.getContext("2d");
    g.clearRect(0, 0, 40, 40);
    g.strokeStyle = "#f4f1ff";
    g.fillStyle = "#f4f1ff";
    g.lineWidth = 2.4;
    g.lineCap = "round";
    g.lineJoin = "round";
    draw(g);
    return sheet.toDataURL();
  }

  function drawGlyph(name) {
    return glyph(function (g) {
      if (name === "marker") {
        g.beginPath();
        g.moveTo(8, 30);
        g.lineTo(32, 10);
        g.lineWidth = 5;
        g.stroke();
      } else if (name === "chalk") {
        for (var i = 0; i < 18; i++) {
          g.globalAlpha = 0.35 + Math.random() * 0.5;
          g.fillRect(8 + Math.random() * 22, 10 + Math.random() * 18, 2.2, 2.2);
        }
        g.globalAlpha = 1;
      } else {
        g.lineWidth = 7;
        g.globalAlpha = 0.55;
        g.beginPath();
        g.moveTo(8, 28);
        g.quadraticCurveTo(18, 8, 32, 14);
        g.stroke();
        g.globalAlpha = 1;
      }
    });
  }

  function shapeGlyph(name) {
    return glyph(function (g) {
      if (name === "triangle") {
        g.beginPath();
        g.moveTo(20, 7);
        g.lineTo(33, 32);
        g.lineTo(7, 32);
        g.closePath();
        g.stroke();
      } else if (name === "star") {
        g.beginPath();
        for (var i = 0; i < 10; i++) {
          var r = i % 2 === 0 ? 14 : 6;
          var a = -Math.PI / 2 + (i * Math.PI) / 5;
          var x = 20 + Math.cos(a) * r;
          var y = 20 + Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.stroke();
      } else if (name === "curve") {
        g.beginPath();
        g.moveTo(7, 28);
        g.quadraticCurveTo(20, 4, 33, 28);
        g.stroke();
      } else if (name === "round") {
        g.beginPath();
        g.moveTo(12, 10);
        g.arcTo(30, 10, 30, 30, 8);
        g.arcTo(30, 30, 10, 30, 8);
        g.arcTo(10, 30, 10, 10, 8);
        g.arcTo(10, 10, 30, 10, 8);
        g.closePath();
        g.stroke();
      } else if (name === "rectangle") {
        g.strokeRect(8, 11, 24, 16);
      } else if (name === "oval") {
        g.beginPath();
        g.ellipse(20, 20, 13, 9, 0, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.beginPath();
        for (var p = 0; p < 5; p++) {
          var pa = -Math.PI / 2 + (p * 2 * Math.PI) / 5;
          var px = 20 + Math.cos(pa) * 13;
          var py = 20 + Math.sin(pa) * 13;
          if (p === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.stroke();
      }
    });
  }

  function setPoints(value) {
    shapePoints = Math.min(16, Math.max(3, Math.round(Number(value) || 5)));
    var input = document.getElementById("kp-points-range");
    if (input && Number(input.value) !== shapePoints) input.value = String(shapePoints);
    var shown = document.getElementById("kp-points-value");
    if (shown) shown.textContent = String(shapePoints);
  }

  function showPoints(kind) {
    var bar = document.getElementById("kp-points");
    var ico = document.getElementById("kp-points-ico");
    var on = kind === "star" || kind === "polygon";
    if (bar) bar.hidden = !on;
    if (ico) ico.textContent = kind === "polygon" ? "⬡" : "✦";
    if (on) setPoints(shapePoints);
  }

  var mods = [
    {
      id: "draw",
      name: "draw",
      menu: function () {
        var nested = [
          { id: "pencil", name: "Wacky Pencil", file: "kp-m_28.png" },
          { id: "line", name: "Line", file: "kp-m_29.png" },
        ].map(function (tool) {
          return {
            name: tool.name,
            imgSrc: "/kidpix/img/" + tool.file,
            handler: function () {
              openNested(tool.id);
            },
          };
        });
        var strokes = ["marker", "chalk", "crayon"].map(function (name) {
          return {
            name: name,
            imgJs: function () {
              return drawGlyph(name);
            },
            handler: function () {
              drawStyle = name;
              KiddoPaint.Current.tool = strokeTool(function (a, b) {
                strokes[drawStyle](a, b);
              });
              showPoints("");
            },
          };
        });
        return nested.concat(strokes);
      },
      make: function () {
        return strokeTool(function (a, b) {
          strokes[drawStyle](a, b);
        });
      },
    },
    {
      id: "shape",
      name: "shape",
      menu: function () {
        var shapes = ["rectangle", "oval", "triangle", "star", "curve", "round", "polygon"].map(function (name) {
          return {
            name: name === "curve"
              ? "Drag the line and let go. Move to bend it, then tap to keep it. On a headset, the right stick bends it."
              : name,
            imgJs: function () {
              return shapeGlyph(name);
            },
            handler: function () {
              shapeKind = name;
              if (name !== "curve") cancelCurve();
              showPoints(name);
            },
          };
        });
        return shapes;
      },
      make: function () {
        return shapeTool();
      },
    },
    {
      id: "pick",
      name: "pick",
      make: function () {
        return pick();
      },
    },
  ];
  mods.forEach(function (spec) {
    var button = document.getElementById(spec.id);
    if (!button) return;
    button.addEventListener("mousedown", function (ev) {
      ev.preventDefault();
      selectMod(spec, button);
    });
  });

  document.getElementById("mainbar").addEventListener("mousedown", function (ev) {
    var hit = ev.target && ev.target.closest ? ev.target.closest("button") : null;
    if (hit && (hit.id === "draw" || hit.id === "shape" || hit.id === "pick" || hit.id === "sound")) return;
    var selected = document.querySelectorAll("#mainbar .tool.on");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("on");
    showPoints("");
  });

  function brushSize() {
    return Math.max(4, Math.round(18 * (KiddoPaint.Current.stampScale || 1)));
  }

  function openNested(id) {
    var button = document.getElementById(id);
    if (!button) return;
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  }

  function selectMod(spec, button) {
    var selected = document.querySelectorAll("#mainbar .tool.on");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("on");
    button.classList.add("on");
    KiddoPaint.Current.tool = spec.make();
    KiddoPaint.Display.canvas.classList = "";
    KiddoPaint.Display.canvas.classList.add("cursor-pencil");
    if (spec.menu) {
      KiddoPaint.Submenu[spec.id] = spec.menu();
      show_generic_submenu(spec.id);
    } else {
      var menus = document.getElementById("subtoolbars").children;
      for (var j = 0; j < menus.length; j++) menus[j].className = "hidden";
    }
    if (spec.id === "shape") showPoints(shapeKind);
    else showPoints("");
  }

  function strokeTool(draw) {
    var tool = { isDown: false, last: null };
    tool.mousedown = function (ev) {
      tool.isDown = true;
      tool.last = ev;
      draw(ev, ev);
    };
    tool.mousemove = function (ev) {
      if (!tool.isDown) return;
      draw(tool.last, ev);
      tool.last = ev;
    };
    tool.mouseup = function () {
      if (!tool.isDown) return;
      tool.isDown = false;
      KiddoPaint.Display.saveMain();
    };
    return tool;
  }

  function ink(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * (typeof KiddoPaint.Current.globalAlpha === "number" ? KiddoPaint.Current.globalAlpha : 1);
    ctx.strokeStyle = KiddoPaint.Current.color;
    ctx.fillStyle = KiddoPaint.Current.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  }

  var strokes = {
    marker: function (a, b) {
      var ctx = ink(KiddoPaint.Display.context, 1);
      ctx.lineWidth = brushSize();
      ctx.beginPath();
      ctx.moveTo(a._x, a._y);
      ctx.lineTo(b._x, b._y);
      ctx.stroke();
      ctx.restore();
    },
    chalk: function (a, b) {
      var ctx = ink(KiddoPaint.Display.context, 1);
      var size = brushSize();
      var dist = Math.hypot(b._x - a._x, b._y - a._y);
      var steps = Math.max(1, Math.floor(dist / 2));
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        ctx.globalAlpha = (0.28 + Math.random() * 0.45) * (typeof KiddoPaint.Current.globalAlpha === "number" ? KiddoPaint.Current.globalAlpha : 1);
        ctx.fillRect(
          a._x + (b._x - a._x) * t + (Math.random() - 0.5) * size,
          a._y + (b._y - a._y) * t + (Math.random() - 0.5) * size,
          2,
          2,
        );
      }
      ctx.restore();
    },
    crayon: function (a, b) {
      var ctx = ink(KiddoPaint.Display.context, 0.45);
      ctx.lineWidth = brushSize() * 1.4;
      ctx.beginPath();
      ctx.moveTo(a._x + (Math.random() - 0.5) * 2, a._y);
      ctx.lineTo(b._x, b._y + (Math.random() - 0.5) * 2);
      ctx.stroke();
      ctx.restore();
    },
  };

  function traceShape(ctx, a, b) {
    var tips = Math.max(3, shapePoints || 5);
    if (shapeKind === "star") {
      var cx = (a._x + b._x) / 2;
      var cy = (a._y + b._y) / 2;
      var outer = Math.max(8, Math.hypot(b._x - a._x, b._y - a._y) / 2);
      var inner = outer * 0.42;
      ctx.beginPath();
      for (var i = 0; i < tips * 2; i++) {
        var radius = i % 2 === 0 ? outer : inner;
        var angle = -Math.PI / 2 + (i * Math.PI) / tips;
        var x = cx + Math.cos(angle) * radius;
        var y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      return true;
    }
    if (shapeKind === "curve") {
      var bend = curveControl(a, b, 0.35);
      ctx.beginPath();
      ctx.moveTo(a._x, a._y);
      ctx.quadraticCurveTo(bend._x, bend._y, b._x, b._y);
      return false;
    }
    if (shapeKind === "rectangle") {
      var rx = Math.min(a._x, b._x);
      var ry = Math.min(a._y, b._y);
      ctx.beginPath();
      ctx.rect(rx, ry, Math.abs(b._x - a._x), Math.abs(b._y - a._y));
      ctx.closePath();
      return true;
    }
    if (shapeKind === "oval") {
      var ox = Math.min(a._x, b._x);
      var oy = Math.min(a._y, b._y);
      var ow = Math.abs(b._x - a._x);
      var oh = Math.abs(b._y - a._y);
      ctx.beginPath();
      ctx.ellipse(ox + ow / 2, oy + oh / 2, Math.max(1, ow / 2), Math.max(1, oh / 2), 0, 0, Math.PI * 2);
      ctx.closePath();
      return true;
    }
    if (shapeKind === "round") {
      var x = Math.min(a._x, b._x);
      var y = Math.min(a._y, b._y);
      var w = Math.abs(b._x - a._x);
      var h = Math.abs(b._y - a._y);
      var r = Math.min(24, w / 3, h / 3);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      return true;
    }
    if (shapeKind === "polygon") {
      var pcx = (a._x + b._x) / 2;
      var pcy = (a._y + b._y) / 2;
      var pr = Math.max(8, Math.hypot(b._x - a._x, b._y - a._y) / 2);
      ctx.beginPath();
      for (var p = 0; p < tips; p++) {
        var pa = -Math.PI / 2 + (p * 2 * Math.PI) / tips;
        var px = pcx + Math.cos(pa) * pr;
        var py = pcy + Math.sin(pa) * pr;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return true;
    }
    ctx.beginPath();
    ctx.moveTo((a._x + b._x) / 2, a._y);
    ctx.lineTo(b._x, b._y);
    ctx.lineTo(a._x, b._y);
    ctx.closePath();
    return true;
  }

  var curveWait = null;
  var shapeLive = null;

  function turnBy(ctx, a, b) {
    var angle = ((KiddoPaint.Current.toolAngle || 0) * Math.PI) / 180;
    if (!angle) return;
    var cx = (a._x + b._x) / 2;
    var cy = (a._y + b._y) / 2;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }

  function drawShape(origin, ev) {
    KiddoPaint.Display.clearTmp();
    var ctx = KiddoPaint.Display.context;
    ctx.save();
    ctx.fillStyle = shapeFill(origin, ev);
    ctx.strokeStyle = KiddoPaint.Current.color;
    ctx.lineWidth = Math.max(2, brushSize() * 0.35);
    turnBy(ctx, origin, ev);
    var closed = traceShape(ctx, origin, ev);
    if (closed) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function refreshShape() {
    if (curveWait) {
      paintCurve(false);
      return;
    }
    if (shapeLive && shapeLive.down && shapeLive.origin && shapeLive.ev) drawShape(shapeLive.origin, shapeLive.ev);
  }

  function curveControl(a, b, bulge) {
    var mx = (a._x + b._x) / 2;
    var my = (a._y + b._y) / 2;
    var dx = b._x - a._x;
    var dy = b._y - a._y;
    var len = Math.hypot(dx, dy) || 1;
    return {
      _x: mx + (-dy / len) * len * bulge,
      _y: my + (dx / len) * len * bulge,
    };
  }

  function paintCurve(commit) {
    if (!curveWait) return;
    KiddoPaint.Display.clearTmp();
    var ctx = KiddoPaint.Display.context;
    ctx.save();
    ctx.strokeStyle = KiddoPaint.Current.color;
    ctx.lineWidth = Math.max(2, brushSize() * 0.35);
    ctx.lineCap = "round";
    turnBy(ctx, curveWait.a, curveWait.b);
    ctx.beginPath();
    ctx.moveTo(curveWait.a._x, curveWait.a._y);
    ctx.quadraticCurveTo(curveWait.c._x, curveWait.c._y, curveWait.b._x, curveWait.b._y);
    ctx.stroke();
    ctx.restore();
    if (commit) {
      KiddoPaint.Display.saveMain();
      curveWait = null;
    }
  }

  function cancelCurve() {
    if (!curveWait) return;
    curveWait = null;
    KiddoPaint.Display.clearTmp();
  }

  function nudgeCurve(direction) {
    if (!curveWait) return false;
    curveWait.bulge = Math.max(-1.6, Math.min(1.6, curveWait.bulge + direction * 0.12));
    curveWait.c = curveControl(curveWait.a, curveWait.b, curveWait.bulge);
    paintCurve(false);
    return true;
  }

  function shapeTool() {
    var tool = { isDown: false, origin: null };
    tool.mousedown = function (ev) {
      if (shapeKind === "curve" && curveWait) {
        curveWait.c = { _x: ev._x, _y: ev._y };
        paintCurve(true);
        return;
      }
      tool.isDown = true;
      tool.origin = { _x: ev._x, _y: ev._y };
      shapeLive = { down: true, origin: tool.origin, ev: { _x: ev._x, _y: ev._y } };
    };
    tool.mousemove = function (ev) {
      if (shapeKind === "curve" && curveWait && !tool.isDown) {
        curveWait.c = { _x: ev._x, _y: ev._y };
        curveWait.bulge = 0;
        paintCurve(false);
        return;
      }
      if (!tool.isDown) return;
      shapeLive = { down: true, origin: tool.origin, ev: { _x: ev._x, _y: ev._y } };
      drawShape(tool.origin, ev);
    };
    tool.mouseup = function (ev) {
      if (!tool.isDown) return;
      if (shapeKind === "curve") {
        tool.isDown = false;
        shapeLive = null;
        var end = { _x: ev._x, _y: ev._y };
        if (Math.hypot(end._x - tool.origin._x, end._y - tool.origin._y) < 4) return;
        curveWait = {
          a: tool.origin,
          b: end,
          bulge: 0.35,
          c: curveControl(tool.origin, end, 0.35),
        };
        paintCurve(false);
        return;
      }
      tool.mousemove(ev);
      tool.isDown = false;
      shapeLive = null;
      KiddoPaint.Display.saveMain();
    };
    return tool;
  }

  function pick() {
    return {
      mousedown: function (ev) {
        var pixel = KiddoPaint.Display.main_context.getImageData(ev._x | 0, ev._y | 0, 1, 1).data;
        var color = "rgba(" + pixel[0] + "," + pixel[1] + "," + pixel[2] + "," + pixel[3] / 255 + ")";
        KiddoPaint.Current.color = color;
        document.getElementById("currentColor").style.backgroundColor = color;
      },
      mousemove: function () {},
      mouseup: function () {},
    };
  }

  // The electric mixer ships five choices that only play the "not done" sound.
  function copyMain() {
    var main = KiddoPaint.Display.main_canvas;
    var copy = document.createElement("canvas");
    copy.width = main.width;
    copy.height = main.height;
    copy.getContext("2d").drawImage(main, 0, 0);
    return copy;
  }

  function commitMain(draw) {
    KiddoPaint.Display.saveUndo();
    draw(KiddoPaint.Display.main_context, copyMain());
    KiddoPaint.Display.clearTmp();
    KiddoPaint.Display.saveToLocalStorage();
  }

  function clickEffect(draw) {
    return {
      mousedown: function (ev) {
        draw(ev);
      },
      mousemove: function () {},
      mouseup: function () {},
    };
  }

  function clampByte(value) {
    return Math.max(0, Math.min(255, value | 0));
  }

  var mixerFixes = {
    "The Outliner": clickEffect(function () {
      commitMain(function (ctx, copy) {
        var w = copy.width;
        var h = copy.height;
        var src = copy.getContext("2d").getImageData(0, 0, w, h).data;
        var out = ctx.createImageData(w, h);
        var dest = out.data;
        function lum(x, y) {
          x = Math.max(0, Math.min(w - 1, x));
          y = Math.max(0, Math.min(h - 1, y));
          var i = (y * w + x) * 4;
          return src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
        }
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var gx = lum(x + 1, y) - lum(x - 1, y);
            var gy = lum(x, y + 1) - lum(x, y - 1);
            var ink = gx * gx + gy * gy > 1600;
            var i = (y * w + x) * 4;
            var v = ink ? 20 : 255;
            dest[i] = dest[i + 1] = dest[i + 2] = v;
            dest[i + 3] = 255;
          }
        }
        ctx.putImageData(out, 0, 0);
      });
    }),
    "Zoom In": clickEffect(function (ev) {
      commitMain(function (ctx, copy) {
        var w = copy.width;
        var h = copy.height;
        var sw = w / 2;
        var sh = h / 2;
        var sx = Math.max(0, Math.min(w - sw, ev._x - sw / 2));
        var sy = Math.max(0, Math.min(h - sh, ev._y - sh / 2));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(copy, sx, sy, sw, sh, 0, 0, w, h);
      });
    }),
    "Broken Glass": clickEffect(function () {
      commitMain(function (ctx, copy) {
        var w = copy.width;
        var h = copy.height;
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(0, 0, w, h);
        var cols = 10;
        var rows = 6;
        var cw = w / cols;
        var rh = h / rows;
        function crack(x0, y0, x1, y1, x2, y2) {
          var dx = (Math.random() - 0.5) * 36;
          var dy = (Math.random() - 0.5) * 36;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x0 + dx, y0 + dy);
          ctx.lineTo(x1 + dx, y1 + dy);
          ctx.lineTo(x2 + dx, y2 + dy);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(copy, dx, dy);
          ctx.restore();
          ctx.beginPath();
          ctx.moveTo(x0 + dx, y0 + dy);
          ctx.lineTo(x1 + dx, y1 + dy);
          ctx.lineTo(x2 + dx, y2 + dy);
          ctx.closePath();
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        for (var y = 0; y < rows; y++) {
          for (var x = 0; x < cols; x++) {
            var x0 = x * cw;
            var y0 = y * rh;
            crack(x0, y0, x0 + cw, y0, x0, y0 + rh);
            crack(x0 + cw, y0, x0 + cw, y0 + rh, x0, y0 + rh);
          }
        }
      });
    }),
    "The Highlighter": clickEffect(function () {
      commitMain(function (ctx, copy) {
        var w = copy.width;
        var h = copy.height;
        var image = copy.getContext("2d").getImageData(0, 0, w, h);
        var data = image.data;
        for (var i = 0; i < data.length; i += 4) {
          data[i] = clampByte((data[i] - 128) * 1.7 + 150);
          data[i + 1] = clampByte((data[i + 1] - 128) * 1.7 + 150);
          data[i + 2] = clampByte((data[i + 2] - 128) * 1.7 + 150);
        }
        ctx.putImageData(image, 0, 0);
      });
    }),
    "Wrap Around": clickEffect(function (ev) {
      commitMain(function (ctx, copy) {
        var w = copy.width;
        var shift = Math.round(ev._x || w / 4);
        if (shift <= 0 || shift >= w) shift = Math.round(w / 4);
        ctx.drawImage(copy, shift, 0);
        ctx.drawImage(copy, shift - w, 0);
      });
    }),
  };

  KiddoPaint.Submenu.jumble.forEach(function (item) {
    var tool = mixerFixes[item.name];
    if (!tool) return;
    item.handler = function () {
      KiddoPaint.Display.canvas.classList = "";
      KiddoPaint.Display.canvas.classList.add("cursor-guy-smile");
      KiddoPaint.Current.tool = tool;
    };
  });

  var eraseToken = 0;

  function shotOfMain() {
    var main = KiddoPaint.Display.main_canvas;
    var copy = document.createElement("canvas");
    copy.width = main.width;
    copy.height = main.height;
    copy.getContext("2d").drawImage(main, 0, 0);
    return copy;
  }

  function blankSheet() {
    KiddoPaint.Display.clearMain();
    KiddoPaint.Display.layWhite();
    KiddoPaint.Display.clearTmp();
    KiddoPaint.Display.saveToLocalStorage();
  }

  function playErase(steps, ms, frame, done) {
    var token = ++eraseToken;
    var i = 0;
    KiddoPaint.Display.saveUndo();
    function tick() {
      if (token !== eraseToken) return;
      if (i >= steps) {
        if (done) done();
        else blankSheet();
        return;
      }
      frame(i, steps);
      i += 1;
      setTimeout(tick, ms);
    }
    tick();
  }

  function paintOver(draw) {
    var ctx = KiddoPaint.Display.main_context;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    draw(ctx);
    ctx.restore();
  }

  function blackHole(ev) {
    var shot = shotOfMain();
    var w = shot.width;
    var h = shot.height;
    var cx = Math.max(0, Math.min(w - 1, Math.round(ev._x)));
    var cy = Math.max(0, Math.min(h - 1, Math.round(ev._y)));
    playErase(26, 36, function (i, n) {
      var t = (i + 1) / n;
      paintOver(function (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.translate(cx, cy);
        ctx.rotate(t * Math.PI * 4);
        var scale = Math.max(0.04, 1 - t);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        ctx.drawImage(shot, 0, 0);
      });
    });
  }

  function countDown() {
    var n = 5;
    var token = ++eraseToken;
    KiddoPaint.Display.saveUndo();
    function tick() {
      if (token !== eraseToken) return;
      KiddoPaint.Display.clearAnim();
      if (n <= 0) {
        blankSheet();
        return;
      }
      var ctx = KiddoPaint.Display.animContext;
      ctx.save();
      ctx.fillStyle = "#161616";
      ctx.font = "bold 460px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.restore();
      n -= 1;
      setTimeout(tick, 420);
    }
    if (KiddoPaint.Sounds.explosion) KiddoPaint.Sounds.explosion();
    tick();
  }

  function dropOut() {
    var shot = shotOfMain();
    var w = shot.width;
    var h = shot.height;
    var strips = 18;
    var sw = w / strips;
    playErase(28, 32, function (i, n) {
      var t = (i + 1) / n;
      paintOver(function (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        for (var s = 0; s < strips; s++) {
          var fall = t * t * h * (0.55 + ((s * 17) % 10) / 10);
          ctx.drawImage(shot, s * sw, 0, sw + 1, h, s * sw, fall, sw + 1, h);
        }
      });
    });
  }

  function sweepAway() {
    var shot = shotOfMain();
    var w = shot.width;
    var h = shot.height;
    playErase(32, 28, function (i, n) {
      var x = Math.round((w * (i + 1)) / n);
      paintOver(function (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        if (x < w) ctx.drawImage(shot, x, 0, w - x, h, x, 0, w - x, h);
        ctx.fillStyle = "#d8d8d8";
        ctx.fillRect(Math.max(0, x - 22), 0, 22, h);
      });
    });
  }

  function eraserCursor(tool) {
    KiddoPaint.Display.canvas.classList = "";
    KiddoPaint.Display.canvas.classList.add("cursor-crosshair");
    KiddoPaint.Current.tool = tool;
  }

  KiddoPaint.Submenu.eraser.forEach(function (item) {
    if (item.name === "Black Hole") {
      item.handler = function () {
        eraserCursor(clickEffect(blackHole));
      };
    }
    if (item.name === "Count Down") {
      item.handler = function () {
        eraserCursor(clickEffect(countDown));
      };
    }
  });
  KiddoPaint.Submenu.eraser.push(
    {
      name: "Drop Out",
      imgSrc: "/kidpix/img/tool-submenu-eraser-188.png",
      handler: function () {
        eraserCursor(clickEffect(dropOut));
      },
    },
    {
      name: "Sweep",
      imgSrc: "/kidpix/img/tool-submenu-eraser-191.png",
      handler: function () {
        eraserCursor(clickEffect(sweepAway));
      },
    },
  );

  var hidden = KiddoPaint.Tools.EraserHiddenPicture;
  var hiddenReset = hidden.reset;
  hidden.reset = function () {
    hiddenReset.call(hidden);
    setTimeout(function () {
      if (hidden.hiddenPattern) return;
      var sheet = document.createElement("canvas");
      sheet.width = 320;
      sheet.height = 240;
      var g = sheet.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 320, 240);
      g.strokeStyle = "#111111";
      g.lineWidth = 8;
      g.strokeRect(24, 24, 272, 192);
      g.beginPath();
      g.arc(160, 110, 48, 0, Math.PI * 2);
      g.moveTo(70, 190);
      g.lineTo(160, 70);
      g.lineTo(250, 190);
      g.stroke();
      hidden.hiddenPattern = KiddoPaint.Display.context.createPattern(sheet, "repeat");
    }, 700);
  };

  var letterPattern = null;
  var stampDraw = KiddoPaint.Stamps.stamp;
  KiddoPaint.Stamps.stamp = function (stamp, alt, ctrl, size, shiftAmount, color) {
    var sheet = stampDraw.call(this, stamp, alt, ctrl, size, shiftAmount, color);
    if (!letterPattern || !color) return sheet;
    var g = sheet.getContext("2d");
    g.save();
    g.globalCompositeOperation = "source-in";
    g.fillStyle = letterPattern();
    g.fillRect(0, 0, sheet.width, sheet.height);
    g.restore();
    return sheet;
  };

  function addPatterns() {
    function tile(size, draw) {
      return function (color1) {
        color1 = color1 || "black";
        var canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        var g = canvas.getContext("2d");
        g.fillStyle = color1;
        g.strokeStyle = color1;
        draw(g, size);
        return KiddoPaint.Display.context.createPattern(canvas, "repeat");
      };
    }
    KiddoPaint.Textures.Dots = tile(8, function (g) {
      g.beginPath();
      g.arc(2, 2, 1.3, 0, Math.PI * 2);
      g.fill();
    });
    KiddoPaint.Textures.Grid = tile(8, function (g, size) {
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, 0.5);
      g.lineTo(size, 0.5);
      g.moveTo(0.5, 0);
      g.lineTo(0.5, size);
      g.stroke();
    });
    KiddoPaint.Textures.Waves = tile(12, function (g) {
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(0, 4);
      g.quadraticCurveTo(3, 0, 6, 4);
      g.quadraticCurveTo(9, 8, 12, 4);
      g.moveTo(0, 10);
      g.quadraticCurveTo(3, 6, 6, 10);
      g.quadraticCurveTo(9, 14, 12, 10);
      g.stroke();
    });
    KiddoPaint.Textures.Hearts = tile(12, function (g) {
      g.beginPath();
      g.moveTo(6, 4);
      g.bezierCurveTo(6, 2, 3, 2, 3, 4.5);
      g.bezierCurveTo(3, 7, 6, 8.5, 6, 10);
      g.bezierCurveTo(6, 8.5, 9, 7, 9, 4.5);
      g.bezierCurveTo(9, 2, 6, 2, 6, 4);
      g.fill();
    });
    KiddoPaint.Textures.TinyStars = tile(12, function (g) {
      g.beginPath();
      for (var i = 0; i < 8; i++) {
        var r = i % 2 === 0 ? 3.2 : 1.4;
        var a = -Math.PI / 2 + (i * Math.PI) / 4;
        var x = 6 + Math.cos(a) * r;
        var y = 6 + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.fill();
    });
    KiddoPaint.Textures.Flowers = tile(14, function (g) {
      for (var i = 0; i < 5; i++) {
        var a = (i * Math.PI * 2) / 5;
        g.beginPath();
        g.arc(7 + Math.cos(a) * 2.4, 7 + Math.sin(a) * 2.4, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    });
    KiddoPaint.Textures.Zigzag = tile(10, function (g) {
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(0, 2);
      g.lineTo(5, 8);
      g.lineTo(10, 2);
      g.moveTo(0, 8);
      g.lineTo(5, 2);
      g.lineTo(10, 8);
      g.stroke();
    });
    KiddoPaint.Textures.Plaid = tile(10, function (g, size) {
      g.fillRect(0, 0, 3, size);
      g.fillRect(0, 0, size, 3);
      g.globalAlpha = 0.45;
      g.fillRect(5, 0, 2, size);
      g.fillRect(0, 5, size, 2);
    });
    KiddoPaint.Textures.Scales = tile(10, function (g) {
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(0, 5, 5, Math.PI, 0);
      g.arc(10, 5, 5, Math.PI, 0);
      g.arc(5, 10, 5, Math.PI, 0);
      g.stroke();
    });
    KiddoPaint.Textures.Dashes = tile(10, function (g) {
      g.fillRect(1, 2, 5, 2);
      g.fillRect(4, 6, 5, 2);
    });
    KiddoPaint.Textures.Checker = tile(8, function (g) {
      g.fillRect(0, 0, 4, 4);
      g.fillRect(4, 4, 4, 4);
    });
    KiddoPaint.Textures.Gingham = tile(12, function (g) {
      g.globalAlpha = 0.35;
      g.fillRect(0, 0, 12, 4);
      g.fillRect(0, 0, 4, 12);
      g.globalAlpha = 0.9;
      g.fillRect(0, 0, 4, 4);
    });
    KiddoPaint.Textures.Polka = tile(14, function (g) {
      g.beginPath();
      g.arc(4, 4, 2.4, 0, Math.PI * 2);
      g.arc(11, 11, 2.4, 0, Math.PI * 2);
      g.fill();
    });
    KiddoPaint.Textures.Honeycomb = tile(16, function (g) {
      g.lineWidth = 1.2;
      g.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 6 + (i * Math.PI) / 3;
        var px = 8 + Math.cos(a) * 6;
        var py = 8 + Math.sin(a) * 6;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();
    });
    KiddoPaint.Textures.Triangles = tile(12, function (g) {
      g.beginPath();
      g.moveTo(6, 1);
      g.lineTo(11, 10);
      g.lineTo(1, 10);
      g.closePath();
      g.fill();
    });
    KiddoPaint.Textures.Rings = tile(14, function (g) {
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(7, 7, 4.2, 0, Math.PI * 2);
      g.stroke();
    });
    KiddoPaint.Textures.Crosshatch = tile(8, function (g, size) {
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, size);
      g.lineTo(size, 0);
      g.moveTo(0, 0);
      g.lineTo(size, size);
      g.stroke();
    });
    KiddoPaint.Textures.Herringbone = tile(10, function (g) {
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(0, 2);
      g.lineTo(5, 7);
      g.lineTo(0, 12);
      g.moveTo(5, 0);
      g.lineTo(10, 5);
      g.lineTo(5, 10);
      g.stroke();
    });
    KiddoPaint.Textures.Basket = tile(10, function (g) {
      g.fillRect(0, 0, 4, 10);
      g.globalAlpha = 0.45;
      g.fillRect(0, 3, 10, 4);
    });
    KiddoPaint.Textures.Argyle = tile(12, function (g) {
      g.beginPath();
      g.moveTo(6, 0);
      g.lineTo(12, 6);
      g.lineTo(6, 12);
      g.lineTo(0, 6);
      g.closePath();
      g.stroke();
      g.lineWidth = 1;
    });
    KiddoPaint.Textures.Lattice = tile(10, function (g, size) {
      g.lineWidth = 1.3;
      g.strokeRect(1.5, 1.5, size - 3, size - 3);
    });
    KiddoPaint.Textures.Confetti = tile(12, function (g) {
      g.fillRect(1, 2, 3, 2);
      g.fillRect(7, 1, 2, 3);
      g.fillRect(4, 8, 3, 2);
      g.fillRect(9, 7, 2, 2);
    });
    KiddoPaint.Textures.Plushes = tile(12, function (g) {
      g.fillRect(5, 1, 2, 10);
      g.fillRect(1, 5, 10, 2);
    });
    KiddoPaint.Textures.Squiggle = tile(12, function (g) {
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, 6);
      g.bezierCurveTo(3, 1, 5, 11, 8, 6);
      g.bezierCurveTo(10, 3, 11, 9, 12, 6);
      g.stroke();
    });
    KiddoPaint.Textures.Halftone = tile(12, function (g) {
      g.beginPath();
      g.arc(3, 3, 1.1, 0, Math.PI * 2);
      g.arc(9, 3, 1.8, 0, Math.PI * 2);
      g.arc(3, 9, 2.2, 0, Math.PI * 2);
      g.arc(9, 9, 1.2, 0, Math.PI * 2);
      g.fill();
    });
    KiddoPaint.Textures.Boxes = tile(12, function (g) {
      g.lineWidth = 1.3;
      g.strokeRect(1, 1, 10, 10);
      g.strokeRect(4, 4, 4, 4);
    });
  }
  addPatterns();

  var extraPatterns = [
    "Dots", "Grid", "Waves", "Hearts", "TinyStars", "Flowers", "Zigzag", "Plaid", "Scales", "Dashes",
    "Checker", "Gingham", "Polka", "Honeycomb", "Triangles", "Rings", "Crosshatch", "Herringbone",
    "Basket", "Argyle", "Lattice", "Confetti", "Plushes", "Squiggle", "Halftone", "Boxes",
  ];
  extraPatterns.forEach(function (name) {
    if (!KiddoPaint.Textures[name]) return;
    ["pencil", "square", "circle", "flood"].forEach(function (menu) {
      var list = KiddoPaint.Submenu[menu];
      if (!list) return;
      var have = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) have = true;
      }
      if (have) return;
      list.push({
        name: name,
        imgJs: function () {
          return makeIcon(KiddoPaint.Textures[name]);
        },
        handler: function () {
          if (menu === "pencil") {
            KiddoPaint.Tools.Pencil.texture = function (color) {
              return KiddoPaint.Textures[name](color);
            };
          } else if (menu === "square") {
            KiddoPaint.Tools.Square.texture = function () {
              return KiddoPaint.Textures[name](KiddoPaint.Current.color);
            };
          } else if (menu === "circle") {
            KiddoPaint.Tools.Circle.texture = function () {
              return KiddoPaint.Textures[name](KiddoPaint.Current.color);
            };
          } else {
            KiddoPaint.Tools.Flood.gcop = "destination-in";
            KiddoPaint.Tools.Flood.texture = function () {
              return KiddoPaint.Textures[name](KiddoPaint.Current.color);
            };
          }
        },
      });
    });
  });

  var textureCatalog = shapeTextures.concat(["Rainbow"]);

  function applyFill(name) {
    fillName = name;
    if (name === "Rainbow") {
      shapeFill = function (a, b) {
        return KiddoPaint.Textures.RainbowGrad(a, b);
      };
      letterPattern = function () {
        return KiddoPaint.Textures.RainbowGrad({ _x: 0, _y: 0 }, { _x: 64, _y: 64 });
      };
      return;
    }
    shapeFill = function () {
      return KiddoPaint.Textures[name](KiddoPaint.Current.color);
    };
    letterPattern = name === "Solid" ? null : function () {
      return KiddoPaint.Textures[name](KiddoPaint.Current.color);
    };
  }

  function renderTextures() {
    var host = document.getElementById("kp-texture-slots");
    if (!host) return;
    var pageSize = 18;
    var pages = Math.max(1, Math.ceil(textureCatalog.length / pageSize));
    texturePage = ((texturePage % pages) + pages) % pages;
    var slice = textureCatalog.slice(texturePage * pageSize, texturePage * pageSize + pageSize);
    host.replaceChildren();
    slice.forEach(function (name) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tool" + (name === fillName ? " on" : "");
      button.title = name;
      var img = document.createElement("img");
      img.className = "pixelated";
      img.draggable = false;
      img.src = name === "Rainbow" ? "/kidpix/img/tool-unknown.png" : makeIcon(KiddoPaint.Textures[name]);
      button.appendChild(img);
      button.addEventListener("mousedown", function (ev) {
        ev.preventDefault();
        applyFill(name);
        renderTextures();
      });
      host.appendChild(button);
    });
  }

  function showTexture(on) {
    var bar = document.getElementById("texturebar");
    if (!bar) return;
    bar.className = on ? "subtoolbar" : "hidden";
    if (on) renderTextures();
  }

  document.getElementById("txprev").addEventListener("mousedown", function (ev) {
    ev.preventDefault();
    texturePage -= 1;
    renderTextures();
  });
  document.getElementById("txnext").addEventListener("mousedown", function (ev) {
    ev.preventDefault();
    texturePage += 1;
    renderTextures();
  });

  function drawnEmoji(face) {
    if (!drawnEmoji.box) {
      drawnEmoji.box = document.createElement("canvas");
      drawnEmoji.box.width = 20;
      drawnEmoji.box.height = 20;
      drawnEmoji.ink = drawnEmoji.box.getContext("2d", { willReadFrequently: true });
      drawnEmoji.blank = drawnEmoji.sample("\uFFFF");
    }
    var sample = drawnEmoji.sample(face);
    if (!sample || !drawnEmoji.blank) return true;
    var diff = 0;
    var ink = 0;
    var chroma = 0;
    var minX = 20;
    var minY = 20;
    var maxX = -1;
    var maxY = -1;
    var on = [];
    for (var y = 0; y < 20; y++) {
      on[y] = [];
      for (var x = 0; x < 20; x++) {
        var i = (y * 20 + x) * 4;
        var hit = sample[i + 3] > 24;
        on[y][x] = hit;
        if (!hit) continue;
        ink++;
        if (Math.max(sample[i], sample[i + 1], sample[i + 2]) - Math.min(sample[i], sample[i + 1], sample[i + 2]) > 18) chroma++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        var gap = Math.abs(sample[i] - drawnEmoji.blank[i]) + Math.abs(sample[i + 1] - drawnEmoji.blank[i + 1]) + Math.abs(sample[i + 2] - drawnEmoji.blank[i + 2]) + Math.abs(sample[i + 3] - drawnEmoji.blank[i + 3]);
        if (gap > 40) diff++;
      }
    }
    if (ink < 8 || diff < 8) return false;
    var border = 0;
    var borderInk = 0;
    var inner = 0;
    var innerInk = 0;
    for (y = minY; y <= maxY; y++) {
      for (x = minX; x <= maxX; x++) {
        var edge = x === minX || x === maxX || y === minY || y === maxY;
        if (edge) {
          border++;
          if (on[y][x]) borderInk++;
        } else {
          inner++;
          if (on[y][x]) innerInk++;
        }
      }
    }
    var frame = border ? borderInk / border : 0;
    var fill = inner ? innerInk / inner : 1;
    var plain = chroma < ink * 0.08;
    if (plain && frame > 0.85 && fill < 0.5) return false;
    if (plain && frame > 0.9 && fill > 0.9) return false;
    return true;
  }

  drawnEmoji.sample = function (text) {
    var g = drawnEmoji.ink;
    if (!g) return null;
    g.clearRect(0, 0, 20, 20);
    g.font = '16px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textBaseline = "top";
    g.fillStyle = "#000";
    g.fillText(text, 1, 1);
    return g.getImageData(0, 0, 20, 20).data;
  };

  var emojiFaces = [];
  var emojiCols = 14;
  var emojiKey = "kp-emoji-v3";

  function emojiPages() {
    if (!emojiFaces.length) return 0;
    return Math.ceil(emojiFaces.length / emojiCols);
  }

  function loadEmoji() {
    try {
      var saved = sessionStorage.getItem(emojiKey);
      var list = saved ? JSON.parse(saved) : null;
      if (!list || !list.length) return false;
      emojiFaces = list;
      return true;
    } catch (err) {
      return false;
    }
  }

  function scanEmoji() {
    var blocks = [
      [0x231a, 0x231b],
      [0x23e9, 0x23fa],
      [0x25aa, 0x25fe],
      [0x2600, 0x27bf],
      [0x1f300, 0x1f5ff],
      [0x1f600, 0x1f64f],
      [0x1f680, 0x1f6ff],
      [0x1f900, 0x1f9ff],
      [0x1fa70, 0x1faff],
    ];
    var pending = [];
    var seen = {};
    blocks.forEach(function (span) {
      for (var code = span[0]; code <= span[1]; code++) {
        if (code >= 0x1f3fb && code <= 0x1f3ff) continue;
        if (code === 0x25a0 || code === 0x25a1 || code === 0x25a2 || code === 0x25aa || code === 0x25ab || code === 0x25fb || code === 0x25fc || code === 0x25fd || code === 0x25fe || code === 0x2b1b || code === 0x2b1c || code === 0x2b1d || code === 0x2b1e) continue;
        var face = String.fromCodePoint(code);
        if (seen[face]) continue;
        if (!/\p{Extended_Pictographic}/u.test(face)) continue;
        var shown = /\p{Emoji_Presentation}/u.test(face) ? face : face + "\uFE0F";
        if (seen[shown]) continue;
        seen[shown] = true;
        pending.push(shown);
      }
    });
    var index = 0;
    function step() {
      var start = performance.now();
      while (index < pending.length && performance.now() - start < 6) {
        if (drawnEmoji(pending[index])) emojiFaces.push(pending[index]);
        index += 1;
      }
      if (index < pending.length) {
        schedule(step);
        return;
      }
      try { sessionStorage.setItem(emojiKey, JSON.stringify(emojiFaces)); } catch (err) {}
    }
    function schedule(fn) {
      if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 400 });
      else window.setTimeout(fn, 32);
    }
    schedule(step);
  }

  if (!loadEmoji()) scanEmoji();

  function stampPacks() {
    return KiddoPaint.Sprite.sheets.length + emojiPages();
  }

  KiddoPaint.Sprite.nextSprite = function () {
    KiddoPaint.Sprite.sheetPage += 1;
    if (KiddoPaint.Sprite.sheetPage >= stampPacks()) KiddoPaint.Sprite.sheetPage = 0;
  };
  KiddoPaint.Sprite.prevSprite = function () {
    KiddoPaint.Sprite.sheetPage -= 1;
    if (KiddoPaint.Sprite.sheetPage < 0) KiddoPaint.Sprite.sheetPage = stampPacks() - 1;
  };

  function stampNav() {
    function go(step) {
      return function () {
        if (KiddoPaint.Sprite.sheetPage < KiddoPaint.Sprite.sheets.length && Math.abs(step) === 1) {
          if (step < 0) KiddoPaint.Sprite.prevPage();
          else KiddoPaint.Sprite.nextPage();
        } else {
          KiddoPaint.Sprite.sheetPage += step;
          var packs = stampPacks();
          if (KiddoPaint.Sprite.sheetPage >= packs) KiddoPaint.Sprite.sheetPage = 0;
          if (KiddoPaint.Sprite.sheetPage < 0) KiddoPaint.Sprite.sheetPage = packs - 1;
        }
        showStamps();
      };
    }
    return [
      { name: "Previous page", emoji: "↩", cls: "kp-stamp-nav", handler: go(-1) },
      { name: "Next page", emoji: "↪", cls: "kp-stamp-nav", handler: go(1) },
      { name: "Previous stamp pack", emoji: "⬅️", cls: "kp-stamp-nav", handler: function () { KiddoPaint.Sprite.prevSprite(); showStamps(); } },
      { name: "Next stamp pack", emoji: "➡️", cls: "kp-stamp-nav", handler: function () { KiddoPaint.Sprite.nextSprite(); showStamps(); } },
    ];
  }

  function showStamps() {
    init_sprites_submenu();
    show_generic_submenu("sprites");
  }

  var spriteMenu = window.init_sprites_submenu;
  window.init_sprites_submenu = function () {
    var packs = KiddoPaint.Sprite.sheets.length;
    if (KiddoPaint.Sprite.sheetPage < packs) {
      if (spriteMenu) spriteMenu();
      var menu = KiddoPaint.Submenu.sprites;
      var stamps = menu.slice(0, Math.max(0, menu.length - 2));
      KiddoPaint.Submenu.sprites = stampNav().concat(stamps);
      return;
    }
    var page = KiddoPaint.Sprite.sheetPage - packs;
    var pages = emojiPages();
    page = ((page % pages) + pages) % pages;
    KiddoPaint.Sprite.sheetPage = packs + page;
    var slice = emojiFaces.slice(page * emojiCols, page * emojiCols + emojiCols);
    while (slice.length < emojiCols) slice.push("");
    KiddoPaint.Submenu.sprites = stampNav();
    slice.forEach(function (face) {
      if (!face) {
        KiddoPaint.Submenu.sprites.push({ name: " ", invisible: true, handler: function () {} });
        return;
      }
      KiddoPaint.Submenu.sprites.push({
        name: face,
        emoji: face,
        handler: function () {
          KiddoPaint.Tools.Stamp.stamp = face;
          KiddoPaint.Tools.Stamp.useColor = false;
          KiddoPaint.Stamps.currentFace = "Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif";
          KiddoPaint.Current.tool = KiddoPaint.Tools.Stamp;
          KiddoPaint.Display.canvas.classList = "";
          KiddoPaint.Display.canvas.classList.add("cursor-none");
        },
      });
    });
  };

}
