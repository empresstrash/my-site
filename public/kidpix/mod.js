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
      fitRows();
    };
  }
  var showSub = window.show_sub_toolbar;
  if (showSub) {
    window.show_sub_toolbar = function (name) {
      showSub(name);
      fitRows();
    };
  }

  function fitChrome() {
    var root = document.querySelector(".kp-one");
    var main = document.getElementById("mainbar");
    var colors = document.getElementById("colorbar");
    if (!root || !main || !colors) return;
    var count = main.querySelectorAll(".tool").length || 1;
    var tool = Math.max(16, Math.min(50, Math.floor(main.clientHeight / count)));
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
  var shapeFill = function () {
    return KiddoPaint.Textures.Solid(KiddoPaint.Current.color);
  };
  var shapeTextures = [
    "None", "Solid", "Partial1", "Partial2", "Partial3", "PartialArtifactAlias",
    "Speckles", "Stripes", "Thatch", "Shingles", "Bubbles", "Diamond", "Ribbon",
    "Sand", "Brick", "Chevron", "Stairs", "Cross", "DiagBrick", "CornerStair", "Houndstooth",
  ];

  var mods = [
    {
      id: "draw",
      name: "draw",
      menu: function () {
        return ["marker", "chalk", "crayon"].map(function (name) {
          return {
            name: name,
            text: name,
            handler: function () {
              drawStyle = name;
            },
          };
        });
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
        var shapes = ["triangle", "star", "curve", "round", "polygon"].map(function (name) {
          return {
            name: name === "curve"
              ? "Drag the line and let go. Move to bend it, then tap to keep it. On a headset, the right stick bends it."
              : name,
            text: name,
            handler: function () {
              shapeKind = name;
              if (name !== "curve") cancelCurve();
            },
          };
        });
        var textures = shapeTextures.map(function (name) {
          return {
            name: name,
            imgJs: function () {
              return makeIcon(KiddoPaint.Textures[name]);
            },
            handler: function () {
              shapeFill = function () {
                return KiddoPaint.Textures[name](KiddoPaint.Current.color);
              };
            },
          };
        });
        textures.push({
          name: "Rainbow",
          imgSrc: "/kidpix/img/tool-unknown.png",
          handler: function () {
            shapeFill = function (a, b) {
              return KiddoPaint.Textures.RainbowGrad(a, b);
            };
          },
        });
        return shapes.concat(textures);
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
    if (hit && (hit.id === "draw" || hit.id === "shape" || hit.id === "pick")) return;
    var selected = document.querySelectorAll("#mainbar .tool.on");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("on");
  });

  function brushSize() {
    return Math.max(4, Math.round(18 * (KiddoPaint.Current.stampScale || 1)));
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
    if (shapeKind === "star") {
      var cx = (a._x + b._x) / 2;
      var cy = (a._y + b._y) / 2;
      var outer = Math.max(8, Math.hypot(b._x - a._x, b._y - a._y) / 2);
      var inner = outer * 0.42;
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var radius = i % 2 === 0 ? outer : inner;
        var angle = -Math.PI / 2 + (i * Math.PI) / 5;
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
      for (var p = 0; p < 5; p++) {
        var pa = -Math.PI / 2 + (p * 2 * Math.PI) / 5;
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
    };
    tool.mousemove = function (ev) {
      if (shapeKind === "curve" && curveWait && !tool.isDown) {
        curveWait.c = { _x: ev._x, _y: ev._y };
        curveWait.bulge = 0;
        paintCurve(false);
        return;
      }
      if (!tool.isDown) return;
      KiddoPaint.Display.clearTmp();
      var ctx = KiddoPaint.Display.context;
      ctx.save();
      ctx.fillStyle = shapeFill(tool.origin, ev);
      ctx.strokeStyle = KiddoPaint.Current.color;
      ctx.lineWidth = Math.max(2, brushSize() * 0.35);
      var closed = traceShape(ctx, tool.origin, ev);
      if (closed) ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    tool.mouseup = function (ev) {
      if (!tool.isDown) return;
      if (shapeKind === "curve") {
        tool.isDown = false;
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

}
