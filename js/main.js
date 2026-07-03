// ===== main.js — starts the game, moves the camera, keeps it running =====

(function () {
  var canvas = document.getElementById("world");
  var ctx = canvas.getContext("2d");
  var VIEW_W = canvas.width, VIEW_H = canvas.height;

  Sim.load();
  UI.init();
  UI.updatePopCount();

  // the camera looks at one part of the world
  var cam = {
    x: (Sim.W() - VIEW_W) / 2,
    y: (Sim.H() - VIEW_H) / 2,
  };
  function clampCam() {
    cam.x = Math.max(0, Math.min(Sim.W() - VIEW_W, cam.x));
    cam.y = Math.max(0, Math.min(Sim.H() - VIEW_H, cam.y));
  }
  // is there more world than the screen can show?
  function worldIsBig() { return Sim.W() > VIEW_W || Sim.H() > VIEW_H; }

  // released bugs arrive where the player is looking
  Sim.setViewCenter(function () {
    return { x: cam.x + VIEW_W / 2, y: cam.y + VIEW_H / 2 };
  });
  // ...and the camera swings to greet them, so a release is never missed
  Sim.setFocus(function (x, y) {
    cam.x = x - VIEW_W / 2;
    cam.y = y - VIEW_H / 2;
    clampCam();
  });

  function canvasPoint(ev) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  // ---- minimap (bottom-right corner) ----
  var MINI = { w: 168, h: 105, margin: 12 };
  function miniRect() {
    return { x: VIEW_W - MINI.w - MINI.margin, y: VIEW_H - MINI.h - MINI.margin, w: MINI.w, h: MINI.h };
  }

  var BIOME_MINI_COLORS = { meadow: "#69b444", forest: "#2e6b1e", desert: "#e0c37a", snow: "#e8f2f8" };

  function drawMinimap() {
    if (!worldIsBig()) return; // the starter garden fits on one screen
    var m = miniRect();
    var sx = m.w / Sim.W(), sy = m.h / Sim.H();
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = BIOME_MINI_COLORS[Render.BASE()] || "#69b444";
    ctx.fillRect(m.x, m.y, m.w, m.h);
    Render.BIOMES().forEach(function (b) {
      ctx.fillStyle = BIOME_MINI_COLORS[b.type] || "#69b444";
      ctx.beginPath();
      ctx.ellipse(m.x + b.x * sx, m.y + b.y * sy, b.r * sx, b.r * sy, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    Render.PONDS().forEach(function (p) {
      ctx.fillStyle = "#5fb8e0";
      ctx.beginPath();
      ctx.ellipse(m.x + p.x * sx, m.y + p.y * sy, Math.max(2, p.r * sx), Math.max(2, p.r * sy * 0.75), 0, 0, Math.PI * 2);
      ctx.fill();
    });
    Sim.bugList().forEach(function (bug) {
      var sp = Sim.getSpecies(bug.speciesId);
      ctx.fillStyle = sp && sp.legendary ? "#ffd166" : "#fdf6e3";
      ctx.fillRect(m.x + bug.x * sx - 1, m.y + bug.y * sy - 1, 2.5, 2.5);
    });
    ctx.strokeStyle = "#fdf6e3";
    ctx.lineWidth = 2;
    ctx.strokeRect(m.x, m.y, m.w, m.h);
    ctx.strokeStyle = "#ffd166";
    ctx.strokeRect(m.x + cam.x * sx, m.y + cam.y * sy, VIEW_W * sx, VIEW_H * sy);
    ctx.restore();
  }

  // ---- drag to look around, click to drop leaves ----
  var dragging = false, dragMoved = false, lastDrag = null;

  canvas.addEventListener("mousedown", function (ev) {
    dragging = true;
    dragMoved = false;
    lastDrag = canvasPoint(ev);
  });
  window.addEventListener("mousemove", function (ev) {
    if (!dragging) return;
    var p = canvasPoint(ev);
    if (Math.abs(p.x - lastDrag.x) + Math.abs(p.y - lastDrag.y) > 3) dragMoved = true;
    cam.x -= p.x - lastDrag.x;
    cam.y -= p.y - lastDrag.y;
    clampCam();
    lastDrag = p;
  });
  window.addEventListener("mouseup", function (ev) {
    if (!dragging) return;
    dragging = false;
    if (dragMoved) return; // it was a drag, not a click
    var p = canvasPoint(ev);
    if (p.x < 0 || p.y < 0 || p.x > VIEW_W || p.y > VIEW_H) return;
    var m = miniRect();
    if (worldIsBig() && p.x >= m.x && p.y >= m.y) {
      // clicked the minimap: jump the camera there
      cam.x = ((p.x - m.x) / m.w) * Sim.W() - VIEW_W / 2;
      cam.y = ((p.y - m.y) / m.h) * Sim.H() - VIEW_H / 2;
      clampCam();
      return;
    }
    Sim.dropFood(p.x + cam.x, p.y + cam.y, 3);
  });

  // scroll wheel / trackpad pans too
  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    cam.x += ev.deltaX;
    cam.y += ev.deltaY;
    clampCam();
  }, { passive: false });

  // arrow keys and WASD
  var keysDown = {};
  var KEYMAP = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
  };
  document.addEventListener("keydown", function (ev) {
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
    if (KEYMAP[ev.key]) { keysDown[ev.key] = true; ev.preventDefault(); }
  });
  document.addEventListener("keyup", function (ev) { delete keysDown[ev.key]; });

  function panFromKeys(dt) {
    var vx = 0, vy = 0;
    for (var k in keysDown) { vx += KEYMAP[k][0]; vy += KEYMAP[k][1]; }
    if (vx || vy) {
      cam.x += vx * 540 * dt;
      cam.y += vy * 540 * dt;
      clampCam();
    }
  }

  // ---- hover tips: who IS that bug? ----
  var tipEl = document.getElementById("bugTip");
  var hoverPoint = null; // last mouse position in canvas pixels

  canvas.addEventListener("mousemove", function (ev) {
    hoverPoint = canvasPoint(ev);
  });
  canvas.addEventListener("mouseleave", function () { hoverPoint = null; });

  function updateBugTip() {
    if (!hoverPoint || dragging) { tipEl.classList.add("hidden"); return; }
    var m = miniRect();
    if (worldIsBig() && hoverPoint.x >= m.x && hoverPoint.y >= m.y) {
      tipEl.classList.add("hidden");
      return;
    }
    // which bug is under the mouse right now?
    var wx = hoverPoint.x + cam.x, wy = hoverPoint.y + cam.y;
    var best = null, bestD = Infinity;
    Sim.bugList().forEach(function (bug) {
      var sp = Sim.getSpecies(bug.speciesId);
      if (!sp) return;
      var d = Math.hypot(bug.x - wx, bug.y - wy);
      if (d < 14 * sp.genes.size + 10 && d < bestD) {
        bestD = d;
        best = { bug: bug, sp: sp };
      }
    });
    if (!best) { tipEl.classList.add("hidden"); return; }

    var status = "";
    if (best.bug.hidden) status = "🤫 hiding";
    else if ((best.bug.pack || 0) >= 2) status = "🤝 teamed up!";
    else if (best.bug.rest > 0) status = "😴 full and sleepy";
    else if (best.bug.energy < 35) status = "🍽️ very hungry";
    else if (best.bug.energy > 85) status = "💖 ready to lay an egg";

    tipEl.innerHTML = "";
    var name = document.createElement("div");
    name.className = "tip-name";
    name.textContent = (best.sp.legendary ? "🌟 " : "") + best.sp.name;
    tipEl.appendChild(name);
    if (status) {
      var st = document.createElement("div");
      st.className = "tip-status";
      st.textContent = status;
      tipEl.appendChild(st);
    }

    // anchor the tip just above the bug (it follows the bug around)
    var rect = canvas.getBoundingClientRect();
    var scaleX = rect.width / canvas.width, scaleY = rect.height / canvas.height;
    tipEl.style.left = (canvas.offsetLeft + (best.bug.x - cam.x) * scaleX) + "px";
    tipEl.style.top = (canvas.offsetTop + (best.bug.y - cam.y - 16 * best.sp.genes.size) * scaleY) + "px";
    tipEl.classList.remove("hidden");
  }

  // ---- the game loop ----
  var lastTime = performance.now();
  var saveTimer = 0;
  var countTimer = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - lastTime) / 1000); // never jump more than 50ms
    lastTime = now;

    panFromKeys(dt);
    clampCam(); // the world can grow or shrink under us
    Sim.update(dt);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    Sim.draw(ctx, now / 1000);
    ctx.restore();
    drawMinimap();
    updateBugTip();

    saveTimer += dt;
    if (saveTimer > 5) { saveTimer = 0; Sim.save(); }

    countTimer += dt;
    if (countTimer > 0.5) { countTimer = 0; UI.updatePopCount(); }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
