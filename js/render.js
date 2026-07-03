// ===== render.js — draws bugs, biomes, and the whole garden, all from code =====

var Render = (function () {

  // ---- Draw one bug from its genes ----
  // The bug is drawn centered at (0,0), facing RIGHT (+x).
  // Caller is expected to translate/rotate the canvas first.
  // t = time in seconds (makes the legs walk); pass 0 for a still pose.
  function drawBug(ctx, g, t) {
    var r = 11 * g.size;                    // base body radius
    var bodyCol = "hsl(" + g.hue + ", 70%, 55%)";
    var darkCol = "hsl(" + g.hue + ", 70%, 32%)";
    var accCol = "hsl(" + g.hue2 + ", 75%, 50%)";

    var segs = g.segments;
    var segSpacing = r * 1.35;
    // Body spans from tail to head; center the whole thing on (0,0)
    var totalLen = segSpacing * (segs - 1) + r * 2.4;
    var headX = totalLen / 2 - r * 0.6;

    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.strokeStyle = darkCol;
    ctx.lineCap = "round";

    // --- Legs (behind body) ---
    var pairs = g.legPairs;
    for (var i = 0; i < pairs; i++) {
      // spread leg roots along the body
      var frac = pairs === 1 ? 0.5 : i / (pairs - 1);
      var lx = headX - r * 0.8 - frac * (totalLen - r * 2.2);
      var swing = Math.sin(t * 10 * g.speed + i * 2.1) * 0.35; // walking wiggle
      for (var side = -1; side <= 1; side += 2) {
        var kneeX = lx + Math.cos(swing) * r * 0.5;
        var kneeY = side * (r * 1.15);
        var footX = lx + Math.sin(swing) * r * 0.9;
        var footY = side * (r * 1.7);
        ctx.beginPath();
        ctx.moveTo(lx, side * r * 0.5);
        ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
        ctx.stroke();
      }
    }

    // --- Wings (under the head, over the back segments) ---
    if (g.wings > 0) {
      var wingLen = r * (g.wings === 2 ? 2.6 : 1.5);
      var flap = Math.sin(t * 14) * 0.15;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      for (var ws = -1; ws <= 1; ws += 2) {
        ctx.save();
        ctx.translate(headX - r * 1.4, ws * r * 0.3);
        ctx.rotate(ws * (0.7 + flap));
        ctx.beginPath();
        ctx.ellipse(-wingLen * 0.5, 0, wingLen * 0.55, wingLen * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- Body segments (tail first so head overlaps) ---
    for (var s = segs - 1; s >= 0; s--) {
      var sx = headX - r * 0.9 - s * segSpacing;
      var sr = r * (1 - s * 0.12); // segments shrink toward the tail
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = darkCol;
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.beginPath();
      ctx.ellipse(sx, 0, sr * 1.1, sr * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // pattern on each segment
      if (g.pattern === "spots") {
        ctx.fillStyle = accCol;
        var spots = [[0, -sr * 0.35], [sr * 0.4, sr * 0.25], [-sr * 0.45, sr * 0.2]];
        for (var p = 0; p < spots.length; p++) {
          ctx.beginPath();
          ctx.arc(sx + spots[p][0], spots[p][1], sr * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (g.pattern === "stripes") {
        ctx.strokeStyle = accCol;
        ctx.lineWidth = sr * 0.28;
        for (var st = -1; st <= 1; st++) {
          ctx.beginPath();
          ctx.moveTo(sx + st * sr * 0.5, -sr * 0.75);
          ctx.lineTo(sx + st * sr * 0.5, sr * 0.75);
          ctx.stroke();
        }
      }
    }

    // --- Head ---
    var hr = r * 0.75;
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = darkCol;
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath();
    ctx.arc(headX, 0, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- Antennae ---
    ctx.strokeStyle = darkCol;
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    for (var a = 0; a < g.antennae; a++) {
      var aSide = g.antennae === 1 ? 0 : (a === 0 ? -1 : 1);
      var wob = Math.sin(t * 6 + a * 3) * 0.1;
      var tipX = headX + hr * 1.5;
      var tipY = aSide * hr * 1.3 + wob * hr;
      ctx.beginPath();
      ctx.moveTo(headX + hr * 0.5, aSide * hr * 0.4);
      ctx.quadraticCurveTo(headX + hr * 1.2, aSide * hr * 1.2, tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = accCol;
      ctx.beginPath();
      ctx.arc(tipX, tipY, hr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Googly eyes ---
    var eyePositions;
    if (g.eyes === 1) eyePositions = [[hr * 0.3, 0, hr * 0.55]];
    else if (g.eyes === 2) eyePositions = [[hr * 0.25, -hr * 0.45, hr * 0.38], [hr * 0.25, hr * 0.45, hr * 0.38]];
    else eyePositions = [[hr * 0.25, -hr * 0.5, hr * 0.32], [hr * 0.25, hr * 0.5, hr * 0.32], [hr * 0.55, 0, hr * 0.3]];

    for (var e = 0; e < eyePositions.length; e++) {
      var ex = headX + eyePositions[e][0];
      var ey = eyePositions[e][1];
      var er = eyePositions[e][2];
      ctx.fillStyle = "white";
      ctx.strokeStyle = darkCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(ex + er * 0.35, ey, er * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // hunters get tiny mandibles so you can tell who's trouble
    if (g.diet === "bugs") {
      ctx.strokeStyle = darkCol;
      ctx.lineWidth = Math.max(2, r * 0.16);
      for (var m = -1; m <= 1; m += 2) {
        ctx.beginPath();
        ctx.moveTo(headX + hr * 0.8, m * hr * 0.35);
        ctx.quadraticCurveTo(headX + hr * 1.5, m * hr * 0.5, headX + hr * 1.3, m * hr * 0.05);
        ctx.stroke();
      }
    }
  }

  // ---- Draw a bug portrait onto a small square canvas ----
  function drawPortrait(canvas, genes) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var scale = (canvas.width / 110) / Math.max(0.8, genes.size * 0.9);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.rotate(-0.25);
    drawBug(ctx, genes, 0);
    ctx.restore();
  }

  // ---- A dark mystery silhouette for undiscovered legendaries ----
  function drawSilhouette(canvas, genes) {
    drawPortrait(canvas, genes);
    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "#40355a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // ---- Golden sparkles for legendary bugs in the terrarium ----
  function drawSparkles(ctx, x, y, t, radius) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 215, 80, 0.9)";
    for (var i = 0; i < 3; i++) {
      var ang = t * 1.8 + i * 2.09;
      var sx = x + Math.cos(ang) * radius;
      var sy = y + Math.sin(ang) * radius * 0.8;
      var s = 2.5 + Math.sin(t * 5 + i * 2) * 1.2; // twinkle
      ctx.beginPath();
      ctx.moveTo(sx, sy - s * 2);
      ctx.lineTo(sx + s * 0.7, sy);
      ctx.lineTo(sx, sy + s * 2);
      ctx.lineTo(sx - s * 0.7, sy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- hand-drawn bugs: the player's art becomes the creature ----
  var artCache = {};
  function artImage(sp) {
    var img = artCache[sp.id];
    if (!img) {
      img = new Image();
      img.src = sp.art;
      artCache[sp.id] = img;
    }
    return img;
  }

  // stamped legs & feelers stay alive: they wiggle just like real bug parts.
  // parts live in drawing-space (240x240, centered on 0,0); callers scale first.
  function drawParts(ctx, parts, t, speed) {
    if (!parts) return;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      var dx = p.dx, dy = p.dy;
      ctx.strokeStyle = p.color;
      ctx.lineCap = "round";
      if (p.type === "leg") {
        // proper chunky legs, not thin hairs
        ctx.lineWidth = Math.max(12, (p.w || 6) * 2);
        // the whole leg swings around its hip, like walking
        var swing = Math.sin(t * 10 * (speed || 1) + i * 2.1) * 0.3;
        var cs = Math.cos(swing), sn = Math.sin(swing);
        var rx = dx * cs - dy * sn, ry = dx * sn + dy * cs;
        // bow the knee AWAY from the body — computed from the leg's FIXED
        // attachment (dx,dy), so it never flips direction while walking
        var bend = ((p.x + dx * 0.5) * -dy + (p.y + dy * 0.5) * dx) >= 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(rx * 0.5 - ry * 0.25 * bend, ry * 0.5 + rx * 0.25 * bend, rx, ry);
        ctx.stroke();
      } else { // antenna: a gentle sway
        ctx.lineWidth = Math.max(7, (p.w || 4) * 1.5);
        var wob = Math.sin(t * 6 + i * 3) * 0.15;
        var cw = Math.cos(wob), sw = Math.sin(wob);
        var ax = dx * cw - dy * sw, ay = dx * sw + dy * cw;
        // feelers curve outward too, from the fixed base direction
        var abend = ((p.x + dx * 0.5) * -dy + (p.y + dy * 0.5) * dx) >= 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(ax * 0.5 - ay * 0.35 * abend, ay * 0.5 + ax * 0.35 * abend, ax, ay);
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(ax, ay, Math.max(6, Math.hypot(ax, ay) * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // caller has already translated/rotated to the bug's position & heading
  function drawArtBug(ctx, sp, t) {
    var img = artImage(sp);
    if (!img.complete || !img.naturalWidth) return;
    var w = 52 * sp.genes.size;
    var s = w / 240;
    ctx.save();
    ctx.rotate(Math.sin(t * 9) * 0.07); // a happy little waddle
    ctx.save();
    ctx.scale(s, s);
    drawParts(ctx, sp.parts, t, sp.genes.speed); // legs first, body on top
    ctx.restore();
    ctx.drawImage(img, -w / 2, -w / 2, w, w);
    ctx.restore();
  }

  // portrait that respects hand-drawn art
  function drawPortraitFor(canvas, sp) {
    if (sp.art) {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var img = artImage(sp);
      var paint = function () {
        var s = (canvas.width * 0.84) / 240;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(s, s);
        drawParts(ctx, sp.parts, 0, 1);
        ctx.drawImage(img, -120, -120, 240, 240);
        ctx.restore();
      };
      if (img.complete && img.naturalWidth) paint();
      else img.addEventListener("load", paint, { once: true });
    } else {
      drawPortrait(canvas, sp.genes);
    }
  }

  // ================================================================
  //  PROCEDURAL WORLD GENERATION
  //  The whole garden grows from one "seed" number plus a world
  //  flavor (from WORLD_FLAVORS in bugs.js). Same seed + flavor
  //  always grows the exact same world.
  // ================================================================
  var BIG_W = 2400, BIG_H = 1500;
  var SMALL_W = 960, SMALL_H = 600;
  var WORLD_W = SMALL_W, WORLD_H = SMALL_H; // set by generate()
  var AREA_SCALE = 1; // how big this world is compared to the biggest
  var BASE = "meadow"; // what MOST of the world is made of
  var PONDS = [];      // {x, y, r}
  var BIOMES = [];     // patches of other biomes {type, x, y, r, lobes}
  var ROCKS = [];
  var GRASSES = [];
  var HIDEOUTS = [];   // {x, y, type: "flower"|"mushroom", tint}
  var bgCanvas = null;
  var lastSeed = 1;

  // a tiny seeded random-number maker (mulberry32)
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function inAnyPond(x, y, pad) {
    for (var i = 0; i < PONDS.length; i++) {
      if (Math.hypot(x - PONDS[i].x, y - PONDS[i].y) < PONDS[i].r + pad) return true;
    }
    return false;
  }

  // which biome is this spot in? (patches first, then the world's base)
  function biomeAt(x, y) {
    for (var i = 0; i < BIOMES.length; i++) {
      if (Math.hypot(x - BIOMES[i].x, y - BIOMES[i].y) < BIOMES[i].r) return BIOMES[i].type;
    }
    return BASE;
  }

  function makePatch(type, x, y, r, rng) {
    function rr(min, max) { return min + rng() * (max - min); }
    var b = { type: type, x: x, y: y, r: r, lobes: [] };
    for (var lb = 0; lb < 9; lb++) {
      var la = rr(0, Math.PI * 2);
      var ld = rr(0, r * 0.55);
      b.lobes.push({ dx: Math.cos(la) * ld, dy: Math.sin(la) * ld, rx: rr(r * 0.35, r * 0.6), ry: rr(r * 0.3, r * 0.5), rot: rr(0, Math.PI) });
    }
    return b;
  }

  function generate(seed, flavorKey, big) {
    lastSeed = seed;
    WORLD_W = big ? BIG_W : SMALL_W;
    WORLD_H = big ? BIG_H : SMALL_H;
    AREA_SCALE = (WORLD_W * WORLD_H) / (BIG_W * BIG_H);
    var rng = makeRng(seed);
    function rr(min, max) { return min + rng() * (max - min); }
    function ri(min, max) { return min + Math.floor(rng() * (max - min + 1)); }
    function scaled(n, minimum) { return Math.max(minimum, Math.round(n * AREA_SCALE)); }

    var flavor = (typeof WORLD_FLAVORS !== "undefined" && WORLD_FLAVORS[flavorKey]) || { base: "meadow", forest: 1, desert: 1, snow: 0, ponds: 2 };
    var counts;
    if (flavor.random) {
      BASE = ["meadow", "meadow", "forest", "desert", "snow"][ri(0, 4)];
      counts = { meadow: ri(1, 3), forest: ri(0, 2), desert: ri(0, 2), snow: ri(0, 2), ponds: ri(1, 3) };
    } else {
      BASE = flavor.base || "meadow";
      counts = {
        meadow: flavor.meadow || 0, forest: flavor.forest || 0,
        desert: flavor.desert || 0, snow: flavor.snow || 0,
        ponds: flavor.ponds || 2,
      };
    }
    counts[BASE] = 0; // a patch of the base biome would be invisible

    // the starter garden is a simple sunny meadow with one pond
    if (!big) {
      BASE = "meadow";
      counts = { meadow: 0, forest: 0, desert: 0, snow: 0, ponds: 1 };
    }

    // --- ponds first: everything else keeps out of the water ---
    PONDS = [];
    var guard = 0;
    while (PONDS.length < (counts.ponds || 2) && guard++ < 300) {
      var p = { x: rr(220, WORLD_W - 220), y: rr(220, WORLD_H - 220), r: rr(75, 130) };
      var farEnough = PONDS.every(function (q) {
        return Math.hypot(p.x - q.x, p.y - q.y) > p.r + q.r + 300;
      });
      if (farEnough) PONDS.push(p);
    }

    // --- biome patches: big organic blobs ---
    BIOMES = [];

    // in harsh worlds, green clearings hug the ponds — oases where life gathers
    if (BASE !== "meadow") {
      for (var oi = 0; oi < PONDS.length && oi < counts.meadow; oi++) {
        var op = PONDS[oi];
        BIOMES.push(makePatch("meadow", op.x + rr(-50, 50), op.y + rr(-50, 50), op.r + rr(140, 220), rng));
      }
      counts.meadow = Math.max(0, counts.meadow - PONDS.length);
    }

    ["meadow", "forest", "desert", "snow"].forEach(function (type) {
      var want = counts[type] || 0;
      var tries = 0;
      var placed = 0;
      while (placed < want && tries++ < 200) {
        var bx = rr(240, WORLD_W - 240), by = rr(220, WORLD_H - 220), br = rr(190, 300);
        if (inAnyPond(bx, by, 120)) continue;
        var clear = BIOMES.every(function (o) {
          return Math.hypot(bx - o.x, by - o.y) > (br + o.r) * 0.75;
        });
        if (!clear) continue;
        BIOMES.push(makePatch(type, bx, by, br, rng));
        placed++;
      }
    });

    // --- rocks and grass tufts for decoration ---
    ROCKS = [];
    guard = 0;
    var rockTarget = scaled(18, 5);
    while (ROCKS.length < rockTarget && guard++ < 120) {
      var rk = { x: rr(60, WORLD_W - 60), y: rr(60, WORLD_H - 60), r: rr(16, 32), rot: rr(0, Math.PI) };
      if (inAnyPond(rk.x, rk.y, 40)) continue;
      ROCKS.push(rk);
    }
    GRASSES = [];
    var grassTarget = scaled(9, 3);
    for (var gp = 0; gp < grassTarget; gp++) {
      GRASSES.push({ x: rr(100, WORLD_W - 100), y: rr(100, WORLD_H - 100), r: rr(70, 140) });
    }

    // --- hideouts: flowers in the open, mushrooms in the forest ---
    // harsh biomes (desert & snow) grow far fewer hiding spots!
    HIDEOUTS = [];
    guard = 0;
    var hideoutTarget = scaled(42, 12);
    while (HIDEOUTS.length < hideoutTarget && guard++ < 1000) {
      var hx = rr(50, WORLD_W - 50), hy = rr(50, WORLD_H - 50);
      if (inAnyPond(hx, hy, 45)) continue;
      var biome = biomeAt(hx, hy);
      // prefer gentle spots at first; late in the search take anything,
      // so even an all-snow world isn't completely hideout-starved
      if ((biome === "desert" || biome === "snow") && guard < 700 && rng() < 0.75) continue;
      var tooClose = HIDEOUTS.some(function (h) { return Math.hypot(h.x - hx, h.y - hy) < 92; });
      if (tooClose) continue;
      HIDEOUTS.push({
        x: hx, y: hy,
        type: biome === "forest" ? (rng() < 0.8 ? "mushroom" : "flower") : (rng() < 0.85 ? "flower" : "mushroom"),
        tint: Math.floor(rng() * 4),
      });
    }

    bgCanvas = null; // repaint with the new layout on the next frame
  }

  // ---- painting the world onto a big offscreen canvas ----
  var BIOME_STYLE = {
    meadow: { floor: "#7ec850", floorDark: "#6cb541" },
    forest: { floor: "#4e8a38", floorDark: "#3f7a2c" },
    desert: { floor: "#e6cf8f", floorDark: "#d9bd75" },
    snow: { floor: "#e9f2f7", floorDark: "#d7e7f0" },
  };

  function paintBlob(ctx, b, color) {
    ctx.fillStyle = color;
    for (var i = 0; i < b.lobes.length; i++) {
      var l = b.lobes[i];
      ctx.beginPath();
      ctx.ellipse(b.x + l.dx, b.y + l.dy, l.rx, l.ry, l.rot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // one tree / cactus / drift, drawn wherever its biome is
  function drawTree(ctx, x, y, rng) {
    var cr = 15 + rng() * 12;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 5, cr, cr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rng() < 0.5 ? "#2f6b1d" : "#3a7d26";
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(150,220,110,0.5)";
    ctx.beginPath();
    ctx.arc(x - cr * 0.3, y - cr * 0.3, cr * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCactus(ctx, x, y) {
    ctx.fillStyle = "#3f8a3f";
    ctx.strokeStyle = "#2c6e2c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 6, y - 24, 12, 28, 6); else ctx.rect(x - 6, y - 24, 12, 28);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 17, y - 16, 10, 8, 4); else ctx.rect(x - 17, y - 16, 10, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff8fb1";
    ctx.beginPath();
    ctx.arc(x, y - 26, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // scatter things across the whole world, but only where their biome is
  function scatterInBiome(type, target, maxTries, rng, drawFn) {
    var placed = 0, tries = 0;
    while (placed < target && tries++ < maxTries) {
      var x = rng() * WORLD_W, y = rng() * WORLD_H;
      if (biomeAt(x, y) !== type) continue;
      if (inAnyPond(x, y, 30)) continue;
      drawFn(x, y);
      placed++;
    }
  }

  function makeBackground() {
    bgCanvas = document.createElement("canvas");
    bgCanvas.width = WORLD_W;
    bgCanvas.height = WORLD_H;
    var ctx = bgCanvas.getContext("2d");
    var rng = makeRng(lastSeed ^ 0x9e3779b9);
    function rr(min, max) { return min + rng() * (max - min); }
    function scaled(n, minimum) { return Math.max(minimum, Math.round(n * AREA_SCALE)); }

    // the whole world starts as the base biome's floor
    ctx.fillStyle = BIOME_STYLE[BASE].floor;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // patch floors (two layers for depth)
    BIOMES.forEach(function (b) {
      var style = BIOME_STYLE[b.type];
      paintBlob(ctx, b, style.floorDark);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(0.92, 0.92);
      ctx.translate(-b.x, -b.y);
      paintBlob(ctx, b, style.floor);
      ctx.restore();
    });

    // mottling + darker grass, only on green ground
    var mottleCount = scaled(550, 120);
    for (var i = 0; i < mottleCount; i++) {
      var gx = rr(0, WORLD_W), gy = rr(0, WORLD_H);
      var mb = biomeAt(gx, gy);
      if (mb === "desert" || mb === "snow") continue;
      ctx.fillStyle = rng() < 0.5 ? "rgba(90,163,56,0.3)" : "rgba(160,215,110,0.3)";
      ctx.beginPath();
      ctx.ellipse(gx, gy, rr(18, 55), rr(10, 30), rr(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
    GRASSES.forEach(function (g) {
      if (biomeAt(g.x, g.y) === "desert" || biomeAt(g.x, g.y) === "snow") return;
      ctx.fillStyle = "rgba(70,140,45,0.3)";
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.r, g.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // grass tufts on green ground
    ctx.strokeStyle = "rgba(60,130,40,0.55)";
    ctx.lineWidth = 2;
    var tuftCount = scaled(450, 90);
    for (var tuft = 0; tuft < tuftCount; tuft++) {
      var tx = rr(0, WORLD_W), ty = rr(0, WORLD_H);
      var tb = biomeAt(tx, ty);
      if (tb === "desert" || tb === "snow") continue;
      for (var blade = -1; blade <= 1; blade++) {
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + blade * 4, ty - 8, tx + blade * 7, ty - 13);
        ctx.stroke();
      }
    }

    // biome decorations, wherever each biome lives (patch OR whole base)
    scatterInBiome("forest", scaled(300, 40), 4000, rng, function (x, y) { drawTree(ctx, x, y, rng); });
    scatterInBiome("desert", scaled(480, 60), 4000, rng, function (x, y) {
      ctx.fillStyle = "rgba(190,160,90,0.5)";
      ctx.beginPath();
      ctx.arc(x, y, rr(1.5, 4), 0, Math.PI * 2);
      ctx.fill();
    });
    scatterInBiome("desert", scaled(34, 6), 2000, rng, function (x, y) { drawCactus(ctx, x, y); });
    scatterInBiome("snow", scaled(400, 50), 4000, rng, function (x, y) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x, y, rr(1.5, 3.5), 0, Math.PI * 2);
      ctx.fill();
    });
    scatterInBiome("snow", scaled(60, 10), 2000, rng, function (x, y) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(x, y, rr(20, 45), rr(8, 16), rr(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    });

    // ponds
    PONDS.forEach(function (p) {
      ctx.fillStyle = "#b0906b";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r + 10, p.r * 0.78 + 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5fb8e0";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(p.x - p.r * 0.25, p.y - p.r * 0.2, p.r * 0.4, p.r * 0.16, -0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // rocks
    ROCKS.forEach(function (rk) {
      ctx.fillStyle = "#9a9a92";
      ctx.strokeStyle = "#6f6f68";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(rk.x, rk.y, rk.r, rk.r * 0.7, rk.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(rk.x - rk.r * 0.25, rk.y - rk.r * 0.3, rk.r * 0.4, rk.r * 0.25, rk.rot, 0, Math.PI * 2);
      ctx.fill();
    });

    // hideouts: flowers and mushrooms
    var flowerCols = ["#ff8fb1", "#ffd166", "#c88ff5", "#ff9d5c"];
    HIDEOUTS.forEach(function (h) {
      if (h.type === "flower") {
        ctx.fillStyle = flowerCols[h.tint];
        for (var petal = 0; petal < 6; petal++) {
          var ang = (petal / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(h.x + Math.cos(ang) * 11, h.y + Math.sin(ang) * 11, 9, 6, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#fff3b0";
        ctx.beginPath();
        ctx.arc(h.x, h.y, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // a chunky mushroom with a friend
        drawMushroom(ctx, h.x, h.y, 13, h.tint);
        drawMushroom(ctx, h.x + 14, h.y + 7, 8, (h.tint + 1) % 4);
      }
    });

    return bgCanvas;
  }

  var MUSHROOM_CAPS = ["#e05c5c", "#e08f4a", "#b57ee0", "#d9536f"];
  function drawMushroom(ctx, x, y, size, tint) {
    ctx.fillStyle = "#f5ead9";
    ctx.strokeStyle = "#c9b98a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.3, size * 0.35, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MUSHROOM_CAPS[tint];
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.25, size, size * 0.65, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (var d = 0; d < 3; d++) {
      ctx.beginPath();
      ctx.arc(x - size * 0.5 + d * size * 0.5, y - size * 0.45, size * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBackground(ctx) {
    if (!bgCanvas) makeBackground();
    ctx.drawImage(bgCanvas, 0, 0);
  }

  // ---- Little extras ----
  function drawLeaf(ctx, x, y, wob) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wob);
    ctx.fillStyle = "#3f9b2f";
    ctx.strokeStyle = "#2c6e20";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawEgg(ctx, x, y, wiggle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(wiggle * 20) * 0.12);
    ctx.fillStyle = "#fdf6e3";
    ctx.strokeStyle = "#c9b98a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPoof(ctx, x, y, progress) {
    var alpha = 1 - progress;
    ctx.fillStyle = "rgba(255,255,255," + (alpha * 0.7) + ")";
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2;
      var d = 6 + progress * 22;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 6 * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    drawBug: drawBug,
    drawPortrait: drawPortrait,
    drawPortraitFor: drawPortraitFor,
    drawArtBug: drawArtBug,
    drawParts: drawParts,
    drawSilhouette: drawSilhouette,
    drawSparkles: drawSparkles,
    drawBackground: drawBackground,
    drawLeaf: drawLeaf,
    drawEgg: drawEgg,
    drawPoof: drawPoof,
    generate: generate,
    inAnyPond: inAnyPond,
    biomeAt: biomeAt,
    worldW: function () { return WORLD_W; },
    worldH: function () { return WORLD_H; },
    PONDS: function () { return PONDS; },
    BIOMES: function () { return BIOMES; },
    HIDEOUTS: function () { return HIDEOUTS; },
    BASE: function () { return BASE; },
  };
})();
