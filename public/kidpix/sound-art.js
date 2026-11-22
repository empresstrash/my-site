/* Sound brushes for the Kid Pix page.
   The microphone changes the mark. It is never sent to the speakers. */

function init_sound_art() {
  var button = document.getElementById("sound");
  var canvas = document.getElementById("kiddopaint");
  if (!button || !canvas || !window.KiddoPaint) return;

  var ear = {
    ctx: null,
    an: null,
    time: null,
    freq: null,
    prev: null,
    hot: false,
    asked: false,
    rms: 0,
    bass: 0,
    mid: 0,
    high: 0,
    beat: false,
    cool: 8,
    pitch: 0.4,
    flux: 0,
    wave: new Float32Array(24),
    base: { rms: 0, bass: 0, mid: 0, high: 0, flux: 0 },
  };
  var down = false;
  var last = { _x: 960, _y: 600 };
  var active = null;
  var lastHonk = 0;

  function pokeMic() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    if (!ear.ctx) ear.ctx = new AC();
    if (ear.ctx.state === "suspended") ear.ctx.resume();
    if (ear.asked) return;
    ear.asked = true;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } })
      .then(function (stream) {
        var src = ear.ctx.createMediaStreamSource(stream);
        var an = ear.ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.12;
        an.minDecibels = -90;
        an.maxDecibels = -18;
        src.connect(an);
        ear.an = an;
        ear.time = new Float32Array(an.fftSize);
        ear.freq = new Uint8Array(an.frequencyBinCount);
        ear.prev = new Uint8Array(an.frequencyBinCount);
        ear.hot = true;
        button.classList.add("is-live");
      })
      .catch(function () {
        ear.hot = false;
      });
  }

  function sample() {
    if (!ear.an) {
      ear.base.rms *= 0.9;
      ear.base.bass *= 0.9;
      ear.base.mid *= 0.9;
      ear.base.high *= 0.9;
      ear.beat = false;
      publish();
      for (var i = 0; i < ear.wave.length; i++) ear.wave[i] = (Math.random() - 0.5) * 0.35;
      return;
    }
    ear.an.getFloatTimeDomainData(ear.time);
    ear.an.getByteFrequencyData(ear.freq);
    var sum = 0;
    for (var n = 0; n < ear.time.length; n++) sum += ear.time[n] * ear.time[n];
    var rawRms = Math.sqrt(sum / ear.time.length);
    var level = Math.min(1, Math.pow(Math.max(0, rawRms - 0.0035) / 0.04, 0.55));
    ear.raw = Math.round(rawRms * 1000) / 1000;
    ear.base.rms = level > ear.base.rms ? ear.base.rms * 0.18 + level * 0.82 : ear.base.rms * 0.58 + level * 0.42;
    var flux = 0;
    for (var f = 0; f < ear.freq.length; f++) {
      flux += Math.max(0, ear.freq[f] - ear.prev[f]);
      ear.prev[f] = ear.freq[f];
    }
    ear.base.flux = Math.min(1, flux / (ear.freq.length * 8));
    if ((ear.cool & 7) === 0) ear.pitch = pitchOf(ear.time, ear.ctx.sampleRate);
    var step = Math.floor(ear.time.length / ear.wave.length);
    var waveGain = 0.85 / Math.max(0.012, rawRms);
    for (var w = 0; w < ear.wave.length; w++) {
      var sample = (ear.time[w * step] || 0) * waveGain;
      ear.wave[w] = sample > 1 ? 1 : sample < -1 ? -1 : sample;
    }
    function band(loHz, hiHz) {
      var nyquist = (ear.ctx.sampleRate || 48000) / 2;
      var a = Math.floor((loHz / nyquist) * ear.freq.length);
      var b = Math.floor((hiHz / nyquist) * ear.freq.length);
      a = Math.max(0, Math.min(ear.freq.length - 1, a));
      b = Math.max(a + 1, Math.min(ear.freq.length, b));
      var total = 0;
      for (var i = a; i < b; i++) total += ear.freq[i];
      return total / ((b - a) * 255);
    }
    function follow(prev, next) {
      return next > prev ? prev * 0.25 + next * 0.75 : prev * 0.55 + next * 0.45;
    }
    var rawB = band(40, 220);
    var rawM = band(220, 2200);
    var rawH = band(2200, 9000);
    var share = rawB + rawM + rawH;
    ear.base.bass = follow(ear.base.bass, share ? Math.min(1, (rawB / share) * level * 2.2) : 0);
    ear.base.mid = follow(ear.base.mid, share ? Math.min(1, (rawM / share) * level * 2.2) : 0);
    ear.base.high = follow(ear.base.high, share ? Math.min(1, (rawH / share) * level * 2.2) : 0);
    ear.rawBass = Math.round(rawB * 100) / 100;
    ear.rawMid = Math.round(rawM * 100) / 100;
    ear.rawHigh = Math.round(rawH * 100) / 100;
    publish();
    ear.cool += 1;
    var gate = Math.max(0.08, 0.4 / sense());
    ear.beat = ear.base.flux > gate && ear.cool > 7;
    if (ear.beat) ear.cool = 0;
  }

  function sense() {
    var input = document.getElementById("kp-amp-range");
    var v = input ? Number(input.value) : 0;
    if (!v) return 1;
    return Math.pow(2, v / 25);
  }

  function publish() {
    ear.rms = ear.base.rms;
    ear.bass = ear.base.bass;
    ear.mid = ear.base.mid;
    ear.high = ear.base.high;
    ear.flux = ear.base.flux;
  }

  function showAmp(on) {
    var bar = document.getElementById("kp-amp");
    if (bar) bar.hidden = !on;
  }

  function pitchOf(buf, rate) {
    var min = Math.floor(rate / 1000);
    var max = Math.floor(rate / 70);
    var best = 0;
    var at = min;
    for (var lag = min; lag <= max; lag += 8) {
      var corr = 0;
      for (var i = 0; i < buf.length - lag; i += 24) corr += buf[i] * buf[i + lag];
      if (corr > best) {
        best = corr;
        at = lag;
      }
    }
    if (best <= 0) return ear.pitch;
    var hz = rate / at;
    return Math.min(1, Math.max(0, (hz - 70) / 880));
  }

  function sizeStep() {
    var input = document.getElementById("kp-size");
    var step = input ? Number(input.value) : 1;
    if (!step || step < 1) step = 1;
    return step > 69 ? 69 : step;
  }

  function brushScale() {
    return 1 + ((sizeStep() - 1) * 3) / 68;
  }

  function span() {
    var spread = 0.65 + Math.random() * 0.7;
    return 30 * 0.45 * spread * brushScale() + 30 * ear.base.rms * sense() * 4.6 * spread;
  }

  function loud() {
    var level = Math.max(ear.base.rms, ear.base.bass * 0.85, ear.base.high * 0.65);
    return Math.pow(Math.min(1, Math.max(0, level)), 0.5);
  }

  function kick() {
    return loud() * sense();
  }

  function scatter(near) {
    return (near || 36) * brushScale() + kick() * 460;
  }

  function baseHsl() {
    var color = KiddoPaint.Current.color || "#111111";
    if (baseHsl.color === color) return baseHsl.value;
    var rgb = color2json(color);
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var light = (max + min) / 2;
    var hue = 0;
    var sat = 0;
    if (max !== min) {
      var d = max - min;
      sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue /= 6;
    }
    baseHsl.color = color;
    baseHsl.value = { h: hue * 360, s: sat * 100, l: light * 100 };
    return baseHsl.value;
  }

  var hueAt = 0;
  var colorMode = 0;
  var hueSpin = 0;
  var colorModes = [
    ["◐", "One color. Light and dark of the color you picked."],
    ["◑", "Complement. A gradient between your color and the opposite color."],
    ["◈", "Tertiary. A gradient between your color and two colors a third of the wheel apart."],
    ["🌈", "Hue cycle. A smooth sweep around the wheel, starting from your color."],
  ];

  function hslRgb(h, s, l) {
    s /= 100;
    l /= 100;
    var a = s * Math.min(l, 1 - l);
    function chan(n) {
      var k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    }
    return [chan(0), chan(8), chan(4)];
  }

  function mixRgb(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function rgbCss(rgb) {
    return "rgb(" + Math.round(rgb[0] * 255) + " " + Math.round(rgb[1] * 255) + " " + Math.round(rgb[2] * 255) + ")";
  }

  function weight() {
    return 0.8 + (sizeStep() - 1) * 0.32;
  }

  function hue() {
    var base = baseHsl();
    var sample = ear.wave[hueAt] || 0;
    hueAt = (hueAt + 1) % ear.wave.length;
    var turn = 0;
    var light = base.l + sample * 18;
    var sat = base.s;
    var glide = 0.008 + ear.rms * 0.012 * sense();
    if (colorMode === 0) {
      light = base.l + sample * 44;
      sat = base.s * (0.4 + Math.abs(sample) * 0.85);
    } else if (colorMode === 1) {
      hueSpin = (hueSpin + glide) % 1;
      var across = (1 - Math.cos(hueSpin * Math.PI * 2)) / 2;
      var from = hslRgb(base.h, sat, Math.max(6, Math.min(94, light)));
      var opposite = hslRgb((base.h + 180) % 360, sat, Math.max(6, Math.min(94, light)));
      return rgbCss(mixRgb(from, opposite, across));
    } else if (colorMode === 2) {
      hueSpin = (hueSpin + glide) % 1;
      var p = hueSpin * 3;
      var seg = Math.floor(p) % 3;
      var along = p - Math.floor(p);
      var stops = [0, 120, 240];
      var here = hslRgb((base.h + stops[seg]) % 360, sat, Math.max(6, Math.min(94, light)));
      var next = hslRgb((base.h + stops[(seg + 1) % 3]) % 360, sat, Math.max(6, Math.min(94, light)));
      return rgbCss(mixRgb(here, next, along));
    } else {
      hueSpin = (hueSpin + glide * 1.6) % 1;
      turn = hueSpin * 360;
      light = base.l + sample * 12;
    }
    return "hsl(" + ((base.h + turn + 360) % 360) + " " + Math.max(0, Math.min(100, sat)) + "% " + Math.max(6, Math.min(94, light)) + "%)";
  }

  function hueA(alpha) {
    return hue().replace(")", " / " + alpha + ")");
  }

  function ink() {
    return KiddoPaint.Display.context;
  }

  function burst(draw) {
    var count = 2 + Math.floor(kick() * 3 + ear.high * sense() * 2);
    for (var i = 0; i < Math.min(7, count); i++) draw(i, count);
  }

  function remember(ev) {
    if (ev && typeof ev._x === "number") last = { _x: ev._x, _y: ev._y };
  }

  function live(paint, free, loose, hold) {
    var tool = { isDown: false, last: null, free: free, hold: !!hold };
    tool.mousedown = function (ev) {
      tool.isDown = true;
      down = true;
      sample();
      tool.last = { _x: ev._x, _y: ev._y };
      remember(ev);
      paint(tool.last, tool.last);
    };
    tool.mousemove = function (ev) {
      remember(ev);
      if (!tool.isDown || !tool.last || typeof ev._x !== "number") return;
      var here = { _x: ev._x, _y: ev._y };
      var dist = Math.hypot(here._x - tool.last._x, here._y - tool.last._y);
      var step = 2 + (brushScale() - 1) * 6;
      if (dist < step) return;
      paint(tool.last, here);
      tool.last = here;
    };
    tool.mouseup = function (ev) {
      if (!tool.isDown) return;
      tool.isDown = false;
      down = false;
      ear.base.rms = ear.base.bass = ear.base.mid = ear.base.high = ear.base.flux = 0;
      publish();
      if (ev) remember(ev);
      KiddoPaint.Display.saveMain();
    };
    tool.tick = function () {
      if (!hold || !tool.isDown || !tool.last) return;
      var now = performance.now();
      if (now - (tool.heldAt || 0) < 80 + (brushScale() - 1) * 24) return;
      tool.heldAt = now;
      paint(tool.last, tool.last);
    };
    return tool;
  }

  function arm(tool) {
    active = tool;
    KiddoPaint.Current.tool = tool;
    KiddoPaint.Display.canvas.classList = "";
    KiddoPaint.Display.canvas.classList.add("cursor-pencil");
  }

  var brushes = [
    {
      name: "Blob. A wet watercolor drop. Louder makes it bigger and more uneven.",
      emoji: "🫧",
      make: function () {
        var laid = 0;
        var easedAt = 0;
        var size = 20;
        var lobes = [1, 1, 1, 1, 1, 1, 1];
        function ease(power) {
          var now = performance.now();
          var dt = easedAt ? Math.min(0.08, (now - easedAt) / 1000) : 0.016;
          easedAt = now;
          var k = 1 - Math.exp(-dt * 6);
          var s = brushScale();
          size += (s * 20 + power * 110 - size) * k;
          var lump = 0.12 + loud() * 0.45 * sense();
          for (var i = 0; i < lobes.length; i++) {
            var w = Math.abs(ear.wave[(i * 3) % 24] || 0);
            var want = 0.82 + w * lump;
            lobes[i] += (want - lobes[i]) * k;
          }
        }
        function wash(c, x, y, power, color) {
          var n = lobes.length;
          var pts = [];
          for (var i = 0; i < n; i++) {
            var ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            var r = size * lobes[i];
            pts.push([x + Math.cos(ang) * r, y + Math.sin(ang) * r]);
          }
          function outline(scale) {
            c.beginPath();
            var first = pts[n - 1];
            var start = pts[0];
            c.moveTo(x + ((first[0] + start[0]) / 2 - x) * scale, y + ((first[1] + start[1]) / 2 - y) * scale);
            for (var i = 0; i < n; i++) {
              var cur = pts[i];
              var next = pts[(i + 1) % n];
              c.quadraticCurveTo(
                x + (cur[0] - x) * scale,
                y + (cur[1] - y) * scale,
                x + ((cur[0] + next[0]) / 2 - x) * scale,
                y + ((cur[1] + next[1]) / 2 - y) * scale
              );
            }
            c.closePath();
          }
          c.fillStyle = color;
          c.strokeStyle = color;
          c.lineJoin = "round";
          outline(1.28 + power * 0.22);
          c.globalAlpha = 0.1;
          c.fill();
          outline(1);
          c.globalAlpha = 0.26;
          c.fill();
          c.globalAlpha = 0.28;
          c.lineWidth = brushScale() * 1.25 + power;
          c.stroke();
        }
        return live(function (a, b) {
          var dx = b._x - a._x;
          var dy = b._y - a._y;
          var len = Math.hypot(dx, dy);
          var now = performance.now();
          if (len < 2 && now - laid < 120) return;
          laid = now;
          var power = loud();
          ease(power);
          var color = hue();
          var c = ink();
          var gap = Math.max(22, size * 0.75);
          var steps = Math.max(1, Math.round(len / gap));
          c.save();
          for (var i = 0; i < steps; i++) {
            var t = steps === 1 ? 1 : i / (steps - 1);
            wash(c, a._x + dx * t, a._y + dy * t, power, color);
          }
          c.restore();
        }, false, true, true);
      },
    },
    {
      name: "Sweep. A ribbon that rolls in waves and shakes. Louder lifts it, treble rattles it.",
      emoji: "🌊",
      make: function () {
        var travel = 0;
        return live(function (a, b) {
          var c = ink();
          var dx = b._x - a._x;
          var dy = b._y - a._y;
          var len = Math.hypot(dx, dy);
          if (len < 2) return;
          var nx = -dy / len;
          var ny = dx / len;
          var s = brushScale();
          var half = s * 2 + loud() * 14;
          var amp = s * 8 + kick() * 120;
          var waveLen = s * 32 + ear.pitch * 28;
          var shake = s * 2 + ear.high * sense() * 48;
          var steps = Math.max(10, Math.min(28, Math.floor(len / 3)));
          var left = [];
          var right = [];
          var crest = [];
          for (var i = 0; i <= steps; i++) {
            var along = travel + len * (i / steps);
            var voice = ear.wave[i % 24] || 0;
            var roll = Math.sin((along / waveLen) * Math.PI * 2) * amp;
            var rattle = Math.sin((along / (14 * s)) * Math.PI * 2 + voice * 4) * shake * Math.abs(voice);
            var off = roll + rattle;
            var x = a._x + dx * (i / steps) + nx * off;
            var y = a._y + dy * (i / steps) + ny * off;
            var w = half * (0.7 + Math.abs(voice) * 0.8);
            left.push({ x: x + nx * w, y: y + ny * w });
            right.push({ x: x - nx * w, y: y - ny * w });
            crest.push({ x: x, y: y });
          }
          travel += len;
          c.save();
          c.fillStyle = hue();
          c.globalAlpha = 0.72;
          c.beginPath();
          c.moveTo(left[0].x, left[0].y);
          for (var p = 1; p < left.length; p++) c.lineTo(left[p].x, left[p].y);
          for (var q = right.length - 1; q >= 0; q--) c.lineTo(right[q].x, right[q].y);
          c.closePath();
          c.fill();
          c.globalAlpha = 0.95;
          c.strokeStyle = hue();
          c.lineWidth = weight();
          c.lineCap = "round";
          c.lineJoin = "round";
          c.beginPath();
          c.moveTo(crest[0].x, crest[0].y);
          for (var k = 1; k < crest.length - 1; k++) {
            var mx = (crest[k].x + crest[k + 1].x) / 2;
            var my = (crest[k].y + crest[k + 1].y) / 2;
            c.quadraticCurveTo(crest[k].x, crest[k].y, mx, my);
          }
          c.lineTo(crest[crest.length - 1].x, crest[crest.length - 1].y);
          c.stroke();
          c.restore();
        }, false, true);
      },
    },
    {
      name: "Splatter. Sound throws the dots apart.",
      emoji: "🎉",
      make: function () {
        var lastThrow = 0;
        return live(function (a, b) {
          var power = Math.max(kick(), ear.beat ? sense() : 0);
          var now = performance.now();
          if (now - lastThrow < 50) return;
          lastThrow = now;
          var c = ink();
          var s = brushScale();
          var dots = 6 + Math.floor(Math.min(power, 4) * 10);
          var reach = s * 14 + power * 200;
          c.save();
          for (var i = 0; i < dots; i++) {
            var ang = Math.random() * Math.PI * 2;
            var dist = reach * Math.random();
            c.fillStyle = hue();
            c.globalAlpha = 0.7 + Math.random() * 0.3;
            var drop = s * (2.2 + Math.random() * 2.4);
            c.beginPath();
            c.arc(b._x + Math.cos(ang) * dist, b._y + Math.sin(ang) * dist, drop, 0, Math.PI * 2);
            c.fill();
          }
          c.restore();
        }, false, true, true);
      },
    },
    {
      name: "Honk. A horn blast ahead of the stroke. Pitch plays the note and opens the cone.",
      emoji: "📯",
      make: function () {
        return live(function (a, b) {
          honk();
          var c = ink();
          var dx = b._x - a._x;
          var dy = b._y - a._y;
          var len = Math.hypot(dx, dy) || 1;
          var ang = Math.atan2(dy, dx);
          var s = brushScale();
          var reach = s * 16 + kick() * 110;
          var arcs = 3 + Math.floor(kick() * 6 + ear.pitch * 3);
          var spread = 0.28 + kick() * 0.75 + ear.pitch * 0.4;
          c.save();
          c.lineWidth = weight();
          c.lineCap = "round";
          c.strokeStyle = hue();
          for (var i = 0; i < arcs; i++) {
            c.globalAlpha = 0.9 - (i / arcs) * 0.55;
            c.beginPath();
            c.arc(b._x, b._y, reach * ((i + 1) / arcs), ang - spread, ang + spread);
            c.stroke();
          }
          c.globalAlpha = 0.9;
          c.fillStyle = hue();
          c.beginPath();
          c.arc(b._x, b._y, s * 4 + ear.rms * 8, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }, false, true, true);
      },
    },
    {
      name: "Fire. Bass lifts the flames. Treble makes them flicker.",
      emoji: "🔥",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          burst(function (i) {
            var h = span() * (0.25 + ear.bass * sense() * 2.8 + Math.random() * ear.high * sense() * 1.6);
            c.save();
            c.fillStyle = hue();
            c.globalAlpha *= 0.35 + Math.random() * 0.4;
            c.beginPath();
            var kick = (Math.random() - 0.5) * scatter(8);
            c.moveTo(b._x + kick, b._y);
            c.lineTo(b._x + kick * 0.4, b._y - h);
            c.lineTo(b._x + kick * 0.2, b._y);
            c.fill();
            c.restore();
          });
        }, false, false, true);
      },
    },
    {
      name: "Spark. Forked bolts shoot out from the pen. Louder throws more and farther.",
      emoji: "⚡",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var jump = Math.max(ear.rms, ear.high * 1.2, ear.beat ? 1 : ear.flux) * sense();
          c.save();
          c.strokeStyle = hue();
          c.lineWidth = weight();
          c.lineCap = "round";
          c.lineJoin = "round";
          function bolt(x, y, ang, len, depth) {
            var steps = 4 + Math.floor(Math.random() * 3);
            var x2 = x;
            var y2 = y;
            var aim = ang;
            c.beginPath();
            c.moveTo(x, y);
            for (var s = 1; s <= steps; s++) {
              aim += (Math.random() - 0.5) * 2.1;
              x2 = x + Math.cos(aim) * ((len * s) / steps);
              y2 = y + Math.sin(aim) * ((len * s) / steps);
              c.lineTo(x2, y2);
            }
            c.stroke();
            if (depth <= 0) return;
            if (Math.random() < 0.55 + ear.high * sense() * 0.4) bolt(x2, y2, aim + 0.8 + Math.random() * 0.8, len * 0.66, depth - 1);
            if (Math.random() < 0.4 + ear.rms * sense() * 0.4) bolt(x2, y2, aim - 0.8 - Math.random() * 0.8, len * 0.58, depth - 1);
          }
          var n = 2 + Math.floor(jump * 5);
          var reach = brushScale() * 46 + jump * 170;
          var depth = jump > 0.45 ? 3 : 2;
          for (var i = 0; i < n; i++) bolt(b._x, b._y, Math.random() * Math.PI * 2, reach, depth);
          c.restore();
        }, false, true);
      },
    },
    {
      name: "Disco. A floor of tiles. They flash on the beat.",
      emoji: "🪩",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var s = brushScale();
          var cell = 16 * s;
          var grid = 2 + (ear.beat ? 1 : 0);
          var flash = ear.beat || ear.flux * sense() > 0.12 || ear.rms * sense() > 0.28;
          c.save();
          for (var gy = -grid; gy <= grid; gy++) {
            for (var gx = -grid; gx <= grid; gx++) {
              c.globalAlpha = flash ? 0.92 : 0.28;
              c.fillStyle = flash ? hue() : KiddoPaint.Current.color;
              var gap = s * 4 + kick() * 8;
              c.fillRect(b._x + gx * (cell + gap) - cell / 2, b._y + gy * (cell + gap) - cell / 2, cell, cell);
            }
          }
          c.restore();
        }, false, true, true);
      },
    },
    {
      name: "Comet. A head with a tail streaming behind it. Bass stretches the tail.",
      emoji: "☄️",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var dx = a._x - b._x;
          var dy = a._y - b._y;
          var len = Math.hypot(dx, dy) || 1;
          var ux = dx / len;
          var uy = dy / len;
          var px = -uy;
          var py = ux;
          var head = brushScale() * 5 + ear.rms * 8;
          var reach = len * (1.3 + ear.bass * sense() * 4.5);
          var tipX = b._x + ux * reach;
          var tipY = b._y + uy * reach;
          var mx = (b._x + tipX) / 2;
          var my = (b._y + tipY) / 2;
          c.save();
          c.fillStyle = hue();
          c.beginPath();
          c.moveTo(b._x + px * head, b._y + py * head);
          c.quadraticCurveTo(mx + px * head * 0.28, my + py * head * 0.28, tipX, tipY);
          c.quadraticCurveTo(mx - px * head * 0.28, my - py * head * 0.28, b._x - px * head, b._y - py * head);
          c.closePath();
          c.globalAlpha *= 0.72;
          c.fill();
          c.globalAlpha /= 0.72;
          c.beginPath();
          c.arc(b._x - ux * head * 0.25, b._y - uy * head * 0.25, head, 0, Math.PI * 2);
          c.fill();
          c.restore();
        });
      },
    },
    {
      name: "Plasma. A wet wash that bleeds out from the stroke.",
      emoji: "🟣",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var s = brushScale();
          var bleed = s * 8 + kick() * 120;
          var pools = 2 + Math.floor(Math.min(kick(), 4) * 2);
          c.save();
          for (var i = 0; i < pools; i++) {
            var sample = ear.wave[(i * 4) % 24] || 0;
            var ang = (i / pools) * Math.PI * 2 + sample;
            var dist = bleed * (0.35 + Math.abs(sample) * 0.65);
            var x = b._x + Math.cos(ang) * dist;
            var y = b._y + Math.sin(ang) * dist;
            var rx = s * 10 + loud() * 18;
            var ry = rx * (0.62 + Math.random() * 0.3);
            var g = c.createRadialGradient(x, y, rx * 0.08, x, y, Math.max(rx, ry));
            g.addColorStop(0, hueA(i === 0 ? 0.28 : 0.16));
            g.addColorStop(0.55, hueA(0.08));
            g.addColorStop(1, hueA(0));
            c.fillStyle = g;
            c.beginPath();
            c.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2);
            c.fill();
          }
          c.restore();
        }, false, true, true);
      },
    },
    {
      name: "Stars. Sound throws the stars apart.",
      emoji: "✨",
      make: function () {
        var lastThrow = 0;
        return live(function (a, b) {
          var power = Math.max(kick(), ear.beat ? sense() : 0);
          var now = performance.now();
          if (now - lastThrow < 50) return;
          lastThrow = now;
          var c = ink();
          var s = brushScale();
          var count = 5 + Math.floor(Math.min(power, 4) * 6);
          var spikes = 4 + Math.floor(ear.pitch * 4);
          var field = s * 16 + power * 190;
          c.save();
          for (var n = 0; n < count; n++) {
            var r = s * (2.5 + Math.random() * 2.5);
            var ang = (n / count) * Math.PI * 2 + Math.random() * 0.3;
            var dist = field * Math.random();
            c.save();
            c.translate(b._x + Math.cos(ang) * dist, b._y + Math.sin(ang) * dist);
            c.rotate(Math.random() * Math.PI);
            c.fillStyle = hue();
            c.beginPath();
            for (var i = 0; i < spikes * 2; i++) {
              var rad = i % 2 ? r : r * 0.28;
              var t = (i / (spikes * 2)) * Math.PI * 2;
              if (i === 0) c.moveTo(Math.cos(t) * rad, Math.sin(t) * rad);
              else c.lineTo(Math.cos(t) * rad, Math.sin(t) * rad);
            }
            c.closePath();
            c.fill();
            c.restore();
          }
          c.restore();
        }, true, true, true);
      },
    },
    {
      name: "Pulse. A ring on each beat. Bass makes it wider.",
      emoji: "💓",
      free: true,
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var rings = ear.beat ? 3 + Math.floor(ear.bass * sense() * 4) : 1;
          for (var i = 0; i < rings; i++) {
            c.save();
            c.strokeStyle = hue();
            c.lineWidth = weight();
            c.globalAlpha *= 0.35 + Math.random() * 0.45;
            c.beginPath();
            c.ellipse(
              b._x,
              b._y,
              span() * (0.2 + i * 0.35 + Math.random()),
              span() * (0.15 + ear.pitch + Math.random() * 0.4),
              ear.wave[i % 24] * 2,
              0,
              Math.PI * 2,
            );
            c.stroke();
            c.restore();
          }
        }, true);
      },
    },
    {
      name: "Glitch. Treble slips the slices sideways.",
      emoji: "📺",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var slips = 2 + Math.floor(ear.high * sense() * 10);
          for (var i = 0; i < slips; i++) {
            var shift = ear.wave[i % 24] * span() * 2;
            c.save();
            c.fillStyle = hue();
            c.globalAlpha *= 0.35 + Math.random() * 0.4;
            c.fillRect(b._x + shift, b._y + (Math.random() - 0.5) * span(), span() * (0.2 + Math.random()), weight());
            c.restore();
          }
        });
      },
    },
    {
      name: "Vines. Your voice grows the branches.",
      emoji: "🌿",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          function limb(x, y, ang, depth) {
            if (depth <= 0) return;
            var len = span() * (0.25 + Math.random() * 0.6);
            var nx = x + Math.cos(ang) * len;
            var ny = y + Math.sin(ang) * len;
            c.strokeStyle = hue();
            c.lineWidth = depth * brushScale();
            c.lineCap = "round";
            c.lineJoin = "round";
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(nx, ny);
            c.stroke();
            if (Math.random() < 0.15 + ear.mid * sense()) limb(nx, ny, ang + (Math.random() - 0.3), depth - 1);
            if (Math.random() < 0.1 + ear.high * sense() * 0.6) limb(nx, ny, ang - (Math.random() - 0.2), depth - 1);
          }
          c.save();
          limb(b._x, b._y, Math.atan2(b._y - a._y, b._x - a._x) + (Math.random() - 0.5), 2 + Math.floor(ear.mid * sense() * 4));
          c.restore();
        });
      },
    },
    {
      name: "Smoke. A plume that rises, spreads, and fades.",
      emoji: "💨",
      make: function () {
        return live(function (a, b) {
          var c = ink();
          var s = brushScale();
          var puffs = 6 + Math.floor(ear.bass * 4);
          c.save();
          for (var i = 0; i < puffs; i++) {
            var rise = (i + 1) * (8 * s + ear.bass * 14);
            var drift = (ear.wave[i % 24] || 0) * (3 * s + i * (4 + kick() * 22));
            var r = 4 * s + i * (3.2 * s + ear.rms * 4);
            var x = b._x + drift;
            var y = b._y - rise;
            var fade = Math.max(0.04, 0.34 - i * 0.03);
            var g = c.createRadialGradient(x, y, r * 0.1, x, y, r);
            g.addColorStop(0, hueA(fade));
            g.addColorStop(1, hueA(0));
            c.fillStyle = g;
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();
          }
          c.restore();
        }, false, true, true);
      },
    },
    {
      name: "Confetti. Sound throws the scraps apart.",
      emoji: "🎊",
      make: function () {
        var lastThrow = 0;
        return live(function (a, b) {
          var power = Math.max(kick(), ear.beat ? sense() : 0);
          var now = performance.now();
          if (now - lastThrow < 50) return;
          lastThrow = now;
          var c = ink();
          var s = brushScale();
          var scraps = 8 + Math.floor(Math.min(power, 4) * 8);
          var reach = s * 18 + power * 200;
          c.save();
          for (var i = 0; i < scraps; i++) {
            var ang = Math.random() * Math.PI * 2;
            var dist = reach * Math.random();
            var fall = (0.25 + Math.random() * 0.75) * (s * 10 + power * 36);
            c.save();
            c.translate(b._x + Math.cos(ang) * dist, b._y + Math.sin(ang) * dist + fall);
            c.rotate(Math.random() * Math.PI);
            c.fillStyle = hue();
            c.fillRect(-7 * s, -3 * s, s * (12 + Math.random() * 10), s * (4 + Math.random() * 3));
            c.restore();
          }
          c.restore();
        }, false, true, true);
      },
    },
  ];

  function honk() {
    if (!ear.ctx || ear.rms < 0.2) return;
    var now = ear.ctx.currentTime;
    if (now - lastHonk < 0.14) return;
    lastHonk = now;
    var o = ear.ctx.createOscillator();
    var g = ear.ctx.createGain();
    o.type = Math.random() < 0.5 ? "square" : "triangle";
    o.frequency.value = 90 + ear.pitch * 760 + (Math.random() - 0.5) * 30;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    o.connect(g);
    g.connect(ear.ctx.destination);
    o.start(now);
    o.stop(now + 0.12);
  }

  function menu() {
    var items = brushes.map(function (spec) {
      return {
        name: spec.name,
        emoji: spec.emoji,
        handler: function () {
          var tool = spec.make();
          tool.label = spec.emoji + " " + spec.name.split(".")[0];
          arm(tool);
        },
      };
    });
    items.unshift({
      name: colorModes[colorMode][1],
      emoji: colorModes[colorMode][0],
      handler: function () {
        colorMode = (colorMode + 1) % colorModes.length;
        hueSpin = 0;
        paintMode();
      },
    });
    return items;
  }

  function paintMode() {
    var bar = document.getElementById("genericsubmenu");
    if (!bar || !bar.classList.contains("kp-sound-menu")) return;
    var btn = bar.querySelector("button.tool");
    if (!btn) return;
    btn.classList.add("on");
    btn.title = colorModes[colorMode][1];
    var mark = btn.querySelector("emj");
    if (mark) mark.textContent = colorModes[colorMode][0];
  }

  function select(ev) {
    if (ev) ev.preventDefault();
    pokeMic();
    var selected = document.querySelectorAll("#mainbar .tool.on");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("on");
    button.classList.add("on");
    KiddoPaint.Submenu.sound = menu();
    show_generic_submenu("sound");
    var bar = document.getElementById("genericsubmenu");
    if (bar) bar.classList.add("kp-sound-menu");
    fitSound();
    KiddoPaint.Submenu.sound[1].handler();
    paintMode();
    showAmp(true);
  }

  function fitSound() {
    var root = document.querySelector(".kp-one");
    var bar = document.getElementById("genericsubmenu");
    if (!root || !bar || !bar.classList.contains("kp-sound-menu")) return;
    var count = bar.querySelectorAll("button").length || 1;
    var option = bar.clientWidth / count;
    if (!(option > 0)) option = 28;
    root.style.setProperty("--kp-option", Math.min(50, option) + "px");
  }

  var previous = window.show_generic_submenu;
  window.show_generic_submenu = function (type) {
    if (previous) previous(type);
    var bar = document.getElementById("genericsubmenu");
    if (!bar) return;
    var sound = type === "sound";
    bar.classList.toggle("kp-sound-menu", sound);
    if (sound) fitSound();
  };

  button.addEventListener("mousedown", select);
  document.getElementById("mainbar").addEventListener("mousedown", function (ev) {
    var hit = ev.target && ev.target.closest ? ev.target.closest("button") : null;
    if (!hit || hit.id !== "sound") {
      active = null;
      showAmp(false);
    }
  });
  canvas.addEventListener("mousemove", remember);
  canvas.addEventListener("mousedown", remember);

  function tick() {
    if (active && down) {
      sample();
      if (active.tick) active.tick();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.addEventListener("resize", fitSound);
}
