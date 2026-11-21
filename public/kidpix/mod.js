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
    var next = Math.min(4, Math.max(1, Math.round(Number(value) || 1)));
    KiddoPaint.Current.stampScale = next;
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

  var mods = [
    ["marker", "marker"],
    ["chalk", "chalk"],
    ["crayon", "crayon"],
    ["triangle", "triangle"],
    ["star", "star"],
    ["curve", "curve"],
    ["round", "round"],
    ["polygon", "polygon"],
    ["pick", "pick"],
  ];
  var bar = document.getElementById("modbar");
  mods.forEach(function (pair) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "tool";
    button.id = "mod-" + pair[0];
    button.title = pair[1];
    button.textContent = pair[1];
    button.addEventListener("mousedown", function (ev) {
      ev.preventDefault();
      selectMod(pair[0], button);
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

  function selectMod(name, button) {
    var selected = bar.querySelectorAll(".tool.on");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("on");
    button.classList.add("on");
    KiddoPaint.Current.tool = tools[name]();
    KiddoPaint.Display.canvas.classList = "";
    KiddoPaint.Display.canvas.classList.add("cursor-pencil");
    var menus = document.getElementById("subtoolbars").children;
    for (var j = 0; j < menus.length; j++) menus[j].className = "hidden";
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

  function marker() {
    return strokeTool(function (a, b) {
      var ctx = ink(KiddoPaint.Display.context, 1);
      ctx.lineWidth = brushSize();
      ctx.beginPath();
      ctx.moveTo(a._x, a._y);
      ctx.lineTo(b._x, b._y);
      ctx.stroke();
      ctx.restore();
    });
  }

  function chalk() {
    return strokeTool(function (a, b) {
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
    });
  }

  function crayon() {
    return strokeTool(function (a, b) {
      var ctx = ink(KiddoPaint.Display.context, 0.45);
      ctx.lineWidth = brushSize() * 1.4;
      ctx.beginPath();
      ctx.moveTo(a._x + (Math.random() - 0.5) * 2, a._y);
      ctx.lineTo(b._x, b._y + (Math.random() - 0.5) * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function shapeTool(render) {
    var tool = { isDown: false, origin: null };
    tool.mousedown = function (ev) {
      tool.isDown = true;
      tool.origin = { _x: ev._x, _y: ev._y };
    };
    tool.mousemove = function (ev) {
      if (!tool.isDown) return;
      render(KiddoPaint.Display.previewContext, tool.origin, ev);
    };
    tool.mouseup = function (ev) {
      if (!tool.isDown) return;
      tool.isDown = false;
      render(KiddoPaint.Display.context, tool.origin, ev);
      KiddoPaint.Display.saveMain();
    };
    return tool;
  }

  function paintShape(ctx, draw) {
    ctx.save();
    ctx.fillStyle = KiddoPaint.Current.color;
    ctx.strokeStyle = KiddoPaint.Current.color;
    ctx.lineWidth = Math.max(2, brushSize() * 0.35);
    draw(ctx);
    ctx.restore();
  }

  function triangle() {
    return shapeTool(function (ctx, a, b) {
      paintShape(ctx, function (g) {
        g.beginPath();
        g.moveTo((a._x + b._x) / 2, a._y);
        g.lineTo(b._x, b._y);
        g.lineTo(a._x, b._y);
        g.closePath();
        g.fill();
      });
    });
  }

  function star() {
    return shapeTool(function (ctx, a, b) {
      paintShape(ctx, function (g) {
        var cx = (a._x + b._x) / 2;
        var cy = (a._y + b._y) / 2;
        var outer = Math.max(8, Math.hypot(b._x - a._x, b._y - a._y) / 2);
        var inner = outer * 0.42;
        g.beginPath();
        for (var i = 0; i < 10; i++) {
          var radius = i % 2 === 0 ? outer : inner;
          var angle = -Math.PI / 2 + (i * Math.PI) / 5;
          var x = cx + Math.cos(angle) * radius;
          var y = cy + Math.sin(angle) * radius;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fill();
      });
    });
  }

  function curve() {
    return shapeTool(function (ctx, a, b) {
      paintShape(ctx, function (g) {
        var mx = (a._x + b._x) / 2;
        var my = (a._y + b._y) / 2;
        var dx = b._x - a._x;
        var dy = b._y - a._y;
        g.beginPath();
        g.moveTo(a._x, a._y);
        g.quadraticCurveTo(mx - dy * 0.35, my + dx * 0.35, b._x, b._y);
        g.stroke();
      });
    });
  }

  function round() {
    return shapeTool(function (ctx, a, b) {
      paintShape(ctx, function (g) {
        var x = Math.min(a._x, b._x);
        var y = Math.min(a._y, b._y);
        var w = Math.abs(b._x - a._x);
        var h = Math.abs(b._y - a._y);
        var r = Math.min(24, w / 3, h / 3);
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
        g.fill();
      });
    });
  }

  function polygon() {
    return shapeTool(function (ctx, a, b) {
      paintShape(ctx, function (g) {
        var cx = (a._x + b._x) / 2;
        var cy = (a._y + b._y) / 2;
        var radius = Math.max(8, Math.hypot(b._x - a._x, b._y - a._y) / 2);
        g.beginPath();
        for (var i = 0; i < 5; i++) {
          var angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          var x = cx + Math.cos(angle) * radius;
          var y = cy + Math.sin(angle) * radius;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fill();
      });
    });
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

  var tools = {
    marker: marker,
    chalk: chalk,
    crayon: crayon,
    triangle: triangle,
    star: star,
    curve: curve,
    round: round,
    polygon: polygon,
    pick: pick,
  };
}
