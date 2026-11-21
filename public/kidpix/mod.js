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
    return Math.min(box.clientWidth / 1920, box.clientHeight / 1200);
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

  function setSize(value) {
    var next = Math.min(20, Math.max(1, Math.round(Number(value) || 1)));
    KiddoPaint.Current.toolScale = next;
    KiddoPaint.Current.stampScale = next;
    KiddoPaint.Current.scaling = next;
    var input = document.getElementById("kp-size");
    if (input && Number(input.value) !== next) input.value = String(next);
    var shown = document.getElementById("kp-size-value");
    if (shown) shown.textContent = String(next);
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
  };

  setSize(1);
  applyView();
  if (window.ResizeObserver) {
    var watcher = new ResizeObserver(applyView);
    watcher.observe(port());
  } else {
    window.addEventListener("resize", applyView);
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
            name: name,
            text: name,
            handler: function () {
              shapeKind = name;
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
  var bar = document.getElementById("modtools") || document.getElementById("modbar");
  mods.forEach(function (spec) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "tool";
    button.id = "mod-" + spec.id;
    button.title = spec.name;
    button.textContent = spec.name;
    button.addEventListener("mousedown", function (ev) {
      ev.preventDefault();
      selectMod(spec, button);
    });
    bar.appendChild(button);
  });

  document.getElementById("mainbar").addEventListener("mousedown", function () {
    var selected = bar.querySelectorAll(".tool.on");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("on");
  });

  function brushSize() {
    return Math.max(4, Math.round(18 * (KiddoPaint.Current.stampScale || 1)));
  }

  function selectMod(spec, button) {
    var selected = bar.querySelectorAll(".tool.on");
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
    ctx.globalAlpha = alpha;
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
        ctx.globalAlpha = 0.28 + Math.random() * 0.45;
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
      var mx = (a._x + b._x) / 2;
      var my = (a._y + b._y) / 2;
      var dx = b._x - a._x;
      var dy = b._y - a._y;
      ctx.beginPath();
      ctx.moveTo(a._x, a._y);
      ctx.quadraticCurveTo(mx - dy * 0.35, my + dx * 0.35, b._x, b._y);
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

  function shapeTool() {
    var tool = { isDown: false, origin: null };
    tool.mousedown = function (ev) {
      tool.isDown = true;
      tool.origin = { _x: ev._x, _y: ev._y };
    };
    tool.mousemove = function (ev) {
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

}
