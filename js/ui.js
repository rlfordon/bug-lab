// ===== ui.js — screens, buttons, cards, and the secret panel =====

var UI = (function () {

  var parentA = null;   // selected species for slot A
  var parentB = null;
  var pendingMix = null; // { genes, mutated, name, flavor } waiting to be released

  // ---------- collection search & sort (shared by Lab and Journal) ----------
  var collectionSearch = "";
  var collectionSort = "newest";

  var SORT_OPTIONS = [
    { value: "newest", label: "✨ Newest first" },
    { value: "oldest", label: "📜 Oldest first" },
    { value: "name", label: "🔤 By name" },
    { value: "smallest", label: "🐜 Smallest first" },
    { value: "biggest", label: "🐘 Biggest first" },
    { value: "fastest", label: "⚡ Fastest first" },
    { value: "eggs", label: "🥚 Most eggs first" },
  ];

  function filterAndSort(list) {
    var q = collectionSearch.trim().toLowerCase();
    var arr = list.filter(function (sp) {
      return q === "" || sp.name.toLowerCase().indexOf(q) >= 0;
    });
    arr.sort(function (a, b) {
      var fav = (b.fav ? 1 : 0) - (a.fav ? 1 : 0); // favorites float to the top
      if (fav !== 0) return fav;
      switch (collectionSort) {
        case "oldest": return a.id - b.id;
        case "name": return a.name.localeCompare(b.name);
        case "smallest": return a.genes.size - b.genes.size;
        case "biggest": return b.genes.size - a.genes.size;
        case "fastest": return b.genes.speed - a.genes.speed;
        case "eggs": return (b.genes.babies || 1) - (a.genes.babies || 1);
        default: return b.id - a.id; // newest
      }
    });
    return arr;
  }

  function initCollectionTools() {
    ["lab", "journal"].forEach(function (scope) {
      var input = document.getElementById(scope + "Search");
      var select = document.getElementById(scope + "Sort");
      SORT_OPTIONS.forEach(function (opt) {
        var o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        select.appendChild(o);
      });
      input.addEventListener("input", function () {
        collectionSearch = input.value;
        syncCollectionTools();
        rebuildGrids();
      });
      select.addEventListener("change", function () {
        collectionSort = select.value;
        syncCollectionTools();
        rebuildGrids();
      });
    });
  }

  function syncCollectionTools() {
    ["lab", "journal"].forEach(function (scope) {
      document.getElementById(scope + "Search").value = collectionSearch;
      document.getElementById(scope + "Sort").value = collectionSort;
    });
  }

  function rebuildGrids() {
    buildLabPicker();
    buildJournal();
  }

  // ---------- toast messages ----------
  var toastEl, toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  // ---------- tabs ----------
  function showScreen(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.screen === name);
    });
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.toggle("active", s.id === "screen-" + name);
    });
    if (name === "lab") buildLabPicker();
    if (name === "journal") buildJournal();
  }

  // ---------- bug cards ----------
  function makeCard(sp, big) {
    var card = document.createElement("div");
    card.className = "bug-card";

    var star = document.createElement("button");
    star.className = "fav-btn";
    star.textContent = sp.fav ? "⭐" : "☆";
    star.title = "Favorite bugs float to the top!";
    star.addEventListener("click", function (ev) {
      ev.stopPropagation(); // don't pick it as a parent by accident
      sp.fav = !sp.fav;
      Sim.save();
      rebuildGrids();
    });
    card.appendChild(star);

    var canvas = document.createElement("canvas");
    canvas.width = big ? 130 : 100;
    canvas.height = big ? 130 : 100;
    card.appendChild(canvas);
    Render.drawPortraitFor(canvas, sp);

    var name = document.createElement("div");
    name.className = "card-name";
    name.textContent = sp.name;
    card.appendChild(name);

    var count = document.createElement("div");
    count.className = "card-count";
    var n = Sim.aliveCount(sp.id);
    count.textContent = n === 0 ? "none in the garden" : n + " in the garden";
    card.appendChild(count);

    if (big) {
      var flavor = document.createElement("div");
      flavor.className = "card-flavor";
      flavor.textContent = "“" + sp.flavor + "”";
      card.appendChild(flavor);

      var chips = document.createElement("div");
      chips.className = "trait-chips";
      var chipList = Genes.traitChips(sp.genes);
      if (sp.art) chipList.unshift("🎨 hand-drawn");
      else if (sp.made) chipList.unshift("🛠️ handmade");
      chipList.forEach(function (c) {
        var chip = document.createElement("span");
        chip.textContent = c;
        chips.appendChild(chip);
      });
      card.appendChild(chips);

      card.appendChild(statBar("Speed", sp.genes.speed, 2.8));
      card.appendChild(statBar("Size", sp.genes.size, 2.2));
      card.appendChild(statBar("Eggs", sp.genes.babies || 1, 2));

      // no species is ever lost — you can always release more from the journal
      var releaseMore = document.createElement("button");
      releaseMore.className = "release-more";
      releaseMore.textContent = "🌿 Release 2 more";
      releaseMore.addEventListener("click", function () {
        Sim.releaseSpecies(sp.id, 2);
        Sim.save();
        toast("Two " + sp.name + "s scurry into the garden!");
        buildJournal();
      });
      card.appendChild(releaseMore);

      // starters can't leave — the garden wouldn't be the same without them
      if (!sp.starter) {
        var bye = document.createElement("button");
        bye.className = "setfree-btn";
        bye.textContent = "🎈 Set free";
        bye.addEventListener("click", function () {
          if (confirm("Set all the " + sp.name + "s free? They'll fly away and leave your journal.")) {
            Sim.removeSpecies(sp.id);
            if (parentA && parentA.id === sp.id) parentA = null;
            if (parentB && parentB.id === sp.id) parentB = null;
            updateSlots();
            Sim.save();
            rebuildGrids();
            toast("The " + sp.name + "s waved goodbye! 🎈");
          }
        });
        card.appendChild(bye);
      }
    }
    return card;
  }

  function statBar(label, value, max) {
    var wrap = document.createElement("div");
    var lab = document.createElement("div");
    lab.className = "stat-label";
    lab.textContent = label;
    var num = document.createElement("span");
    num.className = "stat-value";
    num.textContent = value.toFixed(1);
    lab.appendChild(num);
    var bar = document.createElement("div");
    bar.className = "stat-bar";
    var fill = document.createElement("div");
    fill.style.width = Math.round(Math.min(1, value / max) * 100) + "%";
    bar.appendChild(fill);
    wrap.appendChild(lab);
    wrap.appendChild(bar);
    return wrap;
  }

  // ---------- the lab ----------
  function buildLabPicker() {
    var picker = document.getElementById("labPicker");
    picker.innerHTML = "";
    filterAndSort(Sim.speciesList()).forEach(function (sp) {
      var card = makeCard(sp, false);
      if ((parentA && parentA.id === sp.id) || (parentB && parentB.id === sp.id)) {
        card.classList.add("selected");
      }
      card.addEventListener("click", function () { pickParent(sp); });
      picker.appendChild(card);
    });
  }

  function pickParent(sp) {
    // clicking a selected bug un-picks it
    if (parentA && parentA.id === sp.id) parentA = null;
    else if (parentB && parentB.id === sp.id) parentB = null;
    else if (!parentA) parentA = sp;
    else if (!parentB) parentB = sp;
    else { parentA = sp; parentB = null; } // start over
    updateSlots();
    buildLabPicker();
  }

  function updateSlots() {
    fillSlot(document.getElementById("parentA"), parentA);
    fillSlot(document.getElementById("parentB"), parentB);
    document.getElementById("mixBtn").disabled = !(parentA && parentB);
  }

  function fillSlot(slotEl, sp) {
    var canvas = slotEl.querySelector("canvas");
    var name = slotEl.querySelector(".slot-name");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sp) {
      Render.drawPortraitFor(canvas, sp);
      name.textContent = sp.name;
      slotEl.classList.add("filled");
    } else {
      name.textContent = "Pick a bug…";
      slotEl.classList.remove("filled");
    }
  }

  function doMix() {
    if (!parentA || !parentB) return;
    var result = Genes.mix(parentA.genes, parentB.genes);

    // did this mix hit a legendary recipe?!
    // (only undiscovered ones — after that, the gene pool is yours again)
    var legend = Genes.checkLegendary(result.genes);
    if (legend && Sim.speciesList().some(function (s) { return s.legendary && s.name === legend.name; })) {
      legend = null;
    }
    if (legend) {
      pendingMix = {
        genes: legend.genes,
        mutated: false,
        name: legend.name,
        flavor: legend.flavor,
        legendary: true,
      };
    } else {
      var existing = Sim.speciesList().map(function (sp) { return sp.name; });
      pendingMix = {
        genes: result.genes,
        mutated: result.mutated,
        name: Genes.makeName(existing),
        flavor: Genes.pick(FLAVOR_LINES),
      };
    }

    document.getElementById("mixResult").classList.remove("hidden");
    document.querySelector("#mixResult .result-card").classList.toggle("legendary", !!pendingMix.legendary);
    document.getElementById("legendaryBadge").classList.toggle("hidden", !pendingMix.legendary);
    document.getElementById("mutationBadge").classList.toggle("hidden", !result.mutated || !!pendingMix.legendary);
    document.getElementById("resultName").textContent = pendingMix.name;
    document.getElementById("resultFlavor").textContent = "“" + pendingMix.flavor + "”";
    Render.drawPortrait(document.getElementById("resultPortrait"), pendingMix.genes);

    var chips = document.getElementById("resultTraits");
    chips.innerHTML = "";
    Genes.traitChips(pendingMix.genes).forEach(function (c) {
      var chip = document.createElement("span");
      chip.textContent = c;
      chips.appendChild(chip);
    });
  }

  function doRelease() {
    if (!pendingMix) return;
    var sp = null;
    if (pendingMix.legendary) {
      // re-discovering a legendary adds to the existing species
      sp = Sim.speciesList().filter(function (s) {
        return s.legendary && s.name === pendingMix.name;
      })[0];
    }
    var isNewDiscovery = !sp;
    if (!sp) sp = Sim.addSpecies(pendingMix.name, pendingMix.flavor, pendingMix.genes, false, !!pendingMix.legendary);
    Sim.releaseSpecies(sp.id, 3);
    Sim.save();
    if (pendingMix.legendary && isNewDiscovery) {
      toast("🌟 LEGENDARY DISCOVERED: " + sp.name + "!!! 🌟");
    } else {
      toast("Three little " + sp.name + "s scurry into the garden! 🎉");
    }
    pendingMix = null;
    parentA = null;
    parentB = null;
    updateSlots();
    document.getElementById("mixResult").classList.add("hidden");
    showScreen("terrarium");
  }

  // ---------- the journal ----------
  function buildJournal() {
    var grid = document.getElementById("journalGrid");
    grid.innerHTML = "";
    var count = Sim.speciesList().length;
    document.getElementById("journalSub").textContent =
      count + " species discovered! Every one gets a page.";
    filterAndSort(Sim.speciesList()).forEach(function (sp) {
      var card = makeCard(sp, true);
      if (sp.legendary) card.classList.add("legendary");
      grid.appendChild(card);
    });
    // mystery cards for legendaries nobody has discovered yet
    // (tucked away while searching)
    if (collectionSearch.trim() === "") {
      LEGENDARY_BUGS.forEach(function (leg) {
        var found = Sim.speciesList().some(function (sp) {
          return sp.legendary && sp.name === leg.name;
        });
        if (!found) grid.appendChild(makeMysteryCard(leg));
      });
    }
  }

  function makeMysteryCard(leg) {
    var card = document.createElement("div");
    card.className = "bug-card mystery";
    var canvas = document.createElement("canvas");
    canvas.width = 130;
    canvas.height = 130;
    card.appendChild(canvas);
    Render.drawSilhouette(canvas, leg.genes);

    var name = document.createElement("div");
    name.className = "card-name";
    name.textContent = "? ? ?";
    card.appendChild(name);

    var hint = document.createElement("div");
    hint.className = "card-flavor";
    hint.textContent = leg.hint;
    card.appendChild(hint);

    var tag = document.createElement("div");
    tag.className = "mystery-tag";
    tag.textContent = "🌟 undiscovered legendary";
    card.appendChild(tag);
    return card;
  }

  // ---------- the world picker ----------
  function initWorldPicker() {
    var picker = document.getElementById("worldPicker");
    var buttonBox = document.getElementById("flavorButtons");

    document.getElementById("freshGardenBtn").addEventListener("click", function () {
      buttonBox.innerHTML = "";
      var prog = Sim.progress();
      document.getElementById("pickerProgress").textContent =
        "🐛 You've discovered " + prog.species + " species!";
      Object.keys(WORLD_FLAVORS).forEach(function (key) {
        var btn = document.createElement("button");
        var needed = prog.flavors[key] || 0;
        if (Sim.flavorUnlocked(key)) {
          btn.className = "flavor-btn";
          btn.textContent = WORLD_FLAVORS[key].label;
          btn.addEventListener("click", function () {
            picker.classList.add("hidden");
            Sim.freshGarden(key);
            Sim.save();
            toast("A whole new world grew! " + WORLD_FLAVORS[key].label);
          });
        } else {
          btn.className = "flavor-btn locked";
          btn.disabled = true;
          btn.textContent = "🔒 " + WORLD_FLAVORS[key].label + " — " + needed + " species";
        }
        buttonBox.appendChild(btn);
      });
      picker.classList.remove("hidden");
    });

    document.getElementById("cancelWorldBtn").addEventListener("click", function () {
      picker.classList.add("hidden");
    });
    picker.addEventListener("click", function (ev) {
      if (ev.target === picker) picker.classList.add("hidden");
    });
  }

  // ---------- the secret designer panel ----------
  var SLIDERS = ["simSpeed", "mutationRate", "foodRate", "bugSpeedMult", "maxBugs"];

  function initDesigner() {
    SLIDERS.forEach(function (key) {
      var slider = document.getElementById("s-" + key);
      var label = document.getElementById("v-" + key);
      slider.value = SETTINGS[key];
      label.textContent = SETTINGS[key];
      slider.addEventListener("input", function () {
        SETTINGS[key] = parseFloat(slider.value);
        label.textContent = slider.value;
      });
    });

    // three secret ways in: press ` … or type "magic" … or
    // click the 🐛 Bug Lab title five times fast
    function toggleDesigner() {
      var panel = document.getElementById("designer");
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) renderStats();
    }
    var typed = "";
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "`") { toggleDesigner(); return; }
      if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
      if (ev.key && ev.key.length === 1) {
        typed = (typed + ev.key.toLowerCase()).slice(-5);
        if (typed === "magic") { typed = ""; toggleDesigner(); }
      }
    });
    var titleClicks = 0, titleTimer = null;
    document.querySelector("#topbar h1").addEventListener("click", function () {
      titleClicks++;
      clearTimeout(titleTimer);
      titleTimer = setTimeout(function () { titleClicks = 0; }, 1500);
      if (titleClicks >= 5) { titleClicks = 0; toggleDesigner(); }
    });

    document.getElementById("rainFoodBtn").addEventListener("click", function () {
      for (var i = 0; i < 6; i++) {
        Sim.dropFood(60 + Math.random() * (Sim.W() - 120), 60 + Math.random() * (Sim.H() - 120), 3);
      }
      toast("It's raining leaves! 🍃🍃🍃");
    });

    // world backup: save to / load from a file (also moves worlds between browsers)
    document.getElementById("exportBtn").addEventListener("click", function () {
      Sim.save();
      var data = localStorage.getItem("buglab-save-v1") || "";
      var blob = new Blob([data], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bug-lab-world.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("World saved to a file! 💾");
    });
    var importFile = document.getElementById("importFile");
    document.getElementById("importBtn").addEventListener("click", function () {
      importFile.click();
    });
    importFile.addEventListener("change", function () {
      var file = importFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data.species || !data.species.length) throw new Error("not a world");
          localStorage.setItem("buglab-save-v1", String(reader.result));
          location.reload();
        } catch (err) {
          alert("Hmm, that file doesn't look like a Bug Lab world.");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("resetWorldBtn").addEventListener("click", function () {
      if (confirm("Really start a brand new world? All invented bugs will be gone!")) {
        Sim.reset();
        parentA = null;
        parentB = null;
        pendingMix = null;
        updateSlots();
        document.getElementById("mixResult").classList.add("hidden");
        toast("A fresh new world! 🌱");
      }
    });
  }

  // ---------- the bug maker ----------
  var makerGenes = {
    size: 1, speed: 1, babies: 1, hue: 200, hue2: 40,
    segments: 2, legPairs: 3, wings: 1, eyes: 2,
    antennae: 2, pattern: "spots", diet: "plants", shy: true,
  };
  var makerMode = "genes"; // or "draw"
  var drawCanvas, drawCtx, drawColor = "#3b2a1a", brushSize = 10, erasing = false;
  var drawUndo = [];
  var previewT = 0;

  var LOOK_CONTROLS = [
    { key: "segments", label: "Body parts", options: [1, 2, 3] },
    { key: "legPairs", label: "Leg pairs", options: [2, 3, 4] },
    { key: "wings", label: "Wings", options: [0, 1, 2], names: ["none", "little", "BIG"] },
    { key: "eyes", label: "Eyes", options: [1, 2, 3] },
    { key: "antennae", label: "Feelers", options: [0, 1, 2] },
    { key: "pattern", label: "Pattern", options: ["plain", "spots", "stripes"] },
  ];
  var STAT_SLIDERS = [
    { key: "size", label: "Size 🐘", min: 0.5, max: 2.2 },
    { key: "speed", label: "Speed ⚡", min: 0.4, max: 2.8 },
    { key: "babies", label: "Egg speed 🥚", min: 0.4, max: 2 },
  ];
  var PALETTE = ["#3b2a1a", "#e05c5c", "#ff8c42", "#ffd166", "#7ec850", "#2f6b1d",
                 "#5fb8e0", "#3b6fd4", "#b57ee0", "#ff8fb1", "#ffffff", "#9a9a92"];

  function makePickRow(spec) {
    var row = document.createElement("div");
    row.className = "pick-row";
    var lab = document.createElement("span");
    lab.className = "pick-label";
    lab.textContent = spec.label;
    row.appendChild(lab);
    spec.options.forEach(function (opt, i) {
      var b = document.createElement("button");
      b.className = "pick-btn" + (makerGenes[spec.key] === opt ? " active" : "");
      b.textContent = spec.names ? spec.names[i] : opt;
      b.addEventListener("click", function () {
        makerGenes[spec.key] = opt;
        row.querySelectorAll(".pick-btn").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
      });
      row.appendChild(b);
    });
    return row;
  }

  function makeHueRow(key, label) {
    var row = document.createElement("div");
    row.className = "hue-row";
    var lab = document.createElement("span");
    lab.className = "pick-label";
    lab.textContent = label;
    row.appendChild(lab);
    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0; slider.max = 360; slider.value = makerGenes[key];
    slider.className = "hue-slider";
    slider.addEventListener("input", function () { makerGenes[key] = parseInt(slider.value, 10); });
    row.appendChild(slider);
    return row;
  }

  function buildMakerControls() {
    var looks = document.getElementById("genesControls");
    looks.appendChild(makeHueRow("hue", "Body color"));
    looks.appendChild(makeHueRow("hue2", "Marking color"));
    LOOK_CONTROLS.forEach(function (spec) { looks.appendChild(makePickRow(spec)); });

    var stats = document.getElementById("statControls");
    STAT_SLIDERS.forEach(function (spec) {
      var row = document.createElement("div");
      row.className = "stat-slider-row";
      var lab = document.createElement("span");
      lab.className = "pick-label";
      lab.textContent = spec.label;
      var val = document.createElement("b");
      val.textContent = makerGenes[spec.key].toFixed(2);
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = spec.min; slider.max = spec.max; slider.step = 0.05;
      slider.value = makerGenes[spec.key];
      slider.addEventListener("input", function () {
        makerGenes[spec.key] = parseFloat(slider.value);
        val.textContent = makerGenes[spec.key].toFixed(2);
      });
      row.appendChild(lab);
      row.appendChild(slider);
      row.appendChild(val);
      stats.appendChild(row);
    });
    stats.appendChild(makePickRow({ key: "diet", label: "Food", options: ["plants", "bugs"], names: ["🍃 leaves", "😈 hunts bugs"] }));
    stats.appendChild(makePickRow({ key: "shy", label: "Heart", options: [true, false], names: ["🙈 shy", "💪 brave"] }));
  }

  // ----- the drawing canvas -----
  function drawPointFromEvent(ev) {
    var rect = drawCanvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (drawCanvas.width / rect.width),
      y: (ev.clientY - rect.top) * (drawCanvas.height / rect.height),
    };
  }

  function initDrawing() {
    drawCanvas = document.getElementById("drawCanvas");
    drawCtx = drawCanvas.getContext("2d");
    var sketching = false, lastPt = null;

    function stroke(p) {
      drawCtx.save();
      if (erasing) drawCtx.globalCompositeOperation = "destination-out";
      drawCtx.strokeStyle = drawColor;
      drawCtx.lineWidth = brushSize;
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawCtx.beginPath();
      drawCtx.moveTo(lastPt.x, lastPt.y);
      drawCtx.lineTo(p.x + 0.01, p.y + 0.01);
      drawCtx.stroke();
      drawCtx.restore();
      lastPt = p;
    }

    drawCanvas.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      sketching = true;
      try { drawCanvas.setPointerCapture(ev.pointerId); } catch (err) {}
      drawUndo.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
      if (drawUndo.length > 25) drawUndo.shift();
      lastPt = drawPointFromEvent(ev);
      stroke(lastPt);
    });
    drawCanvas.addEventListener("pointermove", function (ev) {
      if (sketching) stroke(drawPointFromEvent(ev));
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
      drawCanvas.addEventListener(evt, function () { sketching = false; });
    });

    // palette swatches
    var paletteBox = document.getElementById("palette");
    PALETTE.forEach(function (col, i) {
      var b = document.createElement("button");
      b.className = "swatch" + (i === 0 ? " active" : "");
      b.style.background = col;
      b.addEventListener("click", function () {
        drawColor = col;
        erasing = false;
        document.getElementById("eraserBtn").classList.remove("active");
        paletteBox.querySelectorAll(".swatch").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
      });
      paletteBox.appendChild(b);
    });

    document.getElementById("eraserBtn").addEventListener("click", function () {
      erasing = true;
      this.classList.add("active");
      paletteBox.querySelectorAll(".swatch").forEach(function (x) { x.classList.remove("active"); });
    });
    document.querySelectorAll(".brush-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        brushSize = parseInt(b.dataset.brush, 10);
        document.querySelectorAll(".brush-btn").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
      });
    });
    document.getElementById("undoBtn").addEventListener("click", function () {
      if (drawUndo.length) drawCtx.putImageData(drawUndo.pop(), 0, 0);
    });
    document.getElementById("clearBtn").addEventListener("click", function () {
      drawUndo.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    });
  }

  function drawingHasInk() {
    var data = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
    for (var i = 3; i < data.length; i += 32) {
      if (data[i] > 0) return true;
    }
    return false;
  }

  // ----- live preview -----
  function renderMakerPreview() {
    var c = document.getElementById("makerPreview");
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    if (makerMode === "draw") {
      ctx.rotate(Math.sin(previewT * 4) * 0.06);
      ctx.drawImage(drawCanvas, -c.width * 0.42, -c.height * 0.42, c.width * 0.84, c.height * 0.84);
    } else {
      var scale = (c.width / 110) / Math.max(0.8, makerGenes.size * 0.9);
      ctx.scale(scale, scale);
      Render.drawBug(ctx, makerGenes, previewT);
    }
    ctx.restore();
  }

  function setMakerMode(mode) {
    makerMode = mode;
    document.getElementById("modeGenes").classList.toggle("active", mode === "genes");
    document.getElementById("modeDraw").classList.toggle("active", mode === "draw");
    document.getElementById("genesControls").classList.toggle("hidden", mode === "draw");
    document.getElementById("drawControls").classList.toggle("hidden", mode === "genes");
  }

  function releaseMakerBug() {
    if (makerMode === "draw" && !drawingHasInk()) {
      toast("Draw your bug first! ✏️");
      return;
    }
    var name = document.getElementById("makerName").value.trim();
    if (!name) name = Genes.makeName(Sim.speciesList().map(function (s) { return s.name; }));
    var taken = Sim.speciesList().some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); });
    if (taken) {
      toast("There's already a bug named " + name + "! Pick another name.");
      return;
    }
    var flavor = document.getElementById("makerFlavor").value.trim() || Genes.pick(FLAVOR_LINES);
    var sp = Sim.addSpecies(name, flavor, JSON.parse(JSON.stringify(makerGenes)), false, false);
    sp.made = true;
    if (makerMode === "draw") sp.art = drawCanvas.toDataURL("image/png");
    Sim.releaseSpecies(sp.id, 3);
    Sim.save();
    toast("Three little " + sp.name + "s scurry into the garden! 🎉");
    document.getElementById("makerName").value = "";
    document.getElementById("makerFlavor").value = "";
    showScreen("terrarium");
  }

  function initMaker() {
    buildMakerControls();
    initDrawing();
    document.getElementById("modeGenes").addEventListener("click", function () { setMakerMode("genes"); });
    document.getElementById("modeDraw").addEventListener("click", function () { setMakerMode("draw"); });
    document.getElementById("makerDice").addEventListener("click", function () {
      document.getElementById("makerName").value =
        Genes.makeName(Sim.speciesList().map(function (s) { return s.name; }));
    });
    document.getElementById("makerRelease").addEventListener("click", releaseMakerBug);
    // keep the preview alive while the maker is open
    setInterval(function () {
      if (document.getElementById("screen-maker").classList.contains("active")) {
        previewT += 0.09;
        renderMakerPreview();
      }
    }, 90);
  }

  // ---------- world stats (inside the designer panel) ----------
  function renderStats() {
    var list = document.getElementById("statsList");
    list.innerHTML = "";
    var mins = Math.floor(Sim.worldTime() / 60);
    document.getElementById("statsAge").textContent =
      mins < 1 ? "just born" : mins + " min old";

    var allStats = Sim.stats();
    Sim.speciesList().forEach(function (sp) {
      var s = allStats[sp.id] || {};
      var alive = Sim.aliveCount(sp.id);
      var hasStory = s.born || s.starved || s.old || s.eaten || s.meals;
      if (!alive && !hasStory) return; // nothing to tell yet

      var bits = [alive + " alive", (s.born || 0) + " hatched"];
      if (sp.genes.diet === "bugs") {
        bits.push("🍖 " + (s.meals || 0) + " meals");
        if (s.zeroMeal) bits.push("😢 " + s.zeroMeal + " died hungry");
      } else if (s.eaten) {
        bits.push("🍴 " + s.eaten + " eaten");
      }
      if (s.starved) bits.push("💀 " + s.starved + " starved");
      if (s.old) bits.push("🕰️ " + s.old + " old age");

      var row = document.createElement("div");
      row.className = "stat-row";
      var name = document.createElement("b");
      name.textContent = sp.name;
      row.appendChild(name);
      row.appendChild(document.createTextNode(" — " + bits.join(" · ")));
      list.appendChild(row);
    });
  }

  // keep the stats fresh while the panel is open
  setInterval(function () {
    if (!document.getElementById("designer").classList.contains("hidden")) renderStats();
  }, 1000);

  // ---------- wiring it all up ----------
  function init() {
    toastEl = document.getElementById("toast");
    Sim.setToast(toast);

    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        if (tab.dataset.screen === "maker" && !Sim.progress().makerUnlocked) {
          toast("🔒 The Bug Maker unlocks at " + Sim.progress().makerAt + " species — keep mixing!");
          return;
        }
        showScreen(tab.dataset.screen);
      });
    });

    initWorldPicker();

    document.getElementById("mixBtn").addEventListener("click", doMix);
    document.getElementById("releaseBtn").addEventListener("click", doRelease);
    document.getElementById("mixAgainBtn").addEventListener("click", function () {
      pendingMix = null;
      document.getElementById("mixResult").classList.add("hidden");
    });

    initCollectionTools();
    initMaker();
    initDesigner();
    updateSlots();
  }

  function updatePopCount() {
    document.getElementById("popcount").textContent = "🐞 " + Sim.bugCount();
    var makerTab = document.getElementById("makerTab");
    var label = Sim.progress().makerUnlocked ? "🛠️ Bug Maker" : "🔒 Bug Maker";
    if (makerTab.textContent !== label) makerTab.textContent = label;
  }

  return { init: init, toast: toast, updatePopCount: updatePopCount };
})();
