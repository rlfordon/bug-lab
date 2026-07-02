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
    Render.drawPortrait(canvas, sp.genes);

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
      Genes.traitChips(sp.genes).forEach(function (c) {
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
      Render.drawPortrait(canvas, sp.genes);
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
      document.getElementById("designer").classList.toggle("hidden");
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

  // ---------- wiring it all up ----------
  function init() {
    toastEl = document.getElementById("toast");
    Sim.setToast(toast);

    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () { showScreen(tab.dataset.screen); });
    });

    initWorldPicker();

    document.getElementById("mixBtn").addEventListener("click", doMix);
    document.getElementById("releaseBtn").addEventListener("click", doRelease);
    document.getElementById("mixAgainBtn").addEventListener("click", function () {
      pendingMix = null;
      document.getElementById("mixResult").classList.add("hidden");
    });

    initCollectionTools();
    initDesigner();
    updateSlots();
  }

  function updatePopCount() {
    document.getElementById("popcount").textContent = "🐞 " + Sim.bugCount();
  }

  return { init: init, toast: toast, updatePopCount: updatePopCount };
})();
