// ===== sim.js — the living terrarium: eating, fleeing, hatching =====

var Sim = (function () {

  var W = Render.worldW(), H = Render.worldH();

  function syncSize() {
    W = Render.worldW();
    H = Render.worldH();
  }

  // food and population caps shrink with the world
  function areaScale() { return Math.max(0.35, (W * H) / (2400 * 1500)); }
  function maxFood() { return Math.round(160 * areaScale()); }
  function worldMaxBugs() { return Math.round(SETTINGS.maxBugs * areaScale()); }

  var species = [];   // every species ever discovered {id, name, flavor, genes, starter}
  var bugs = [];      // living bugs {speciesId, x, y, angle, energy, age, lifespan, eggCd, phase}
  var food = [];      // leaves {x, y, wob}
  var eggs = [];      // {x, y, speciesId, timer}
  var poofs = [];     // little disappear-clouds {x, y, t}
  var foodTimer = 0;
  var wandererTimer = 0;
  var nextSpeciesId = 1;
  var kills = 0;
  var worldSeed = 1;
  var worldFlavor = "meadow";
  var bestSpecies = 0; // most species ever discovered — drives unlocks

  function newSeed() { return 1 + Math.floor(Math.random() * 999999999); }

  // ---------- unlocks ----------
  function unlocksCfg() {
    var u = typeof UNLOCKS !== "undefined" ? UNLOCKS : {};
    return {
      bigWorld: u.bigWorld || 8,
      flavors: u.flavors || { meadow: 0, forest: 12, desert: 16, snow: 20, wild: 25 },
    };
  }

  function bigUnlocked() { return bestSpecies >= unlocksCfg().bigWorld; }

  function flavorUnlocked(key) {
    var at = unlocksCfg().flavors[key];
    return bestSpecies >= (at === undefined ? 0 : at);
  }

  function checkUnlocks(prev) {
    var cfg = unlocksCfg();
    // the big moment: the garden grows into a whole world
    if (prev < cfg.bigWorld && bestSpecies >= cfg.bigWorld) {
      Render.generate(worldSeed, worldFlavor, true);
      syncSize();
      for (var f = 0; f < 40; f++) {
        var spot = randomSpot(true);
        food.push({ x: spot.x, y: spot.y, wob: rnd(0, Math.PI * 2) });
      }
      toast("🎉 " + bestSpecies + " species! Your garden GREW into a whole world — explore it!");
      return;
    }
    for (var key in cfg.flavors) {
      var at = cfg.flavors[key];
      if (at > 0 && prev < at && bestSpecies >= at) {
        var label = typeof WORLD_FLAVORS !== "undefined" && WORLD_FLAVORS[key] ? WORLD_FLAVORS[key].label : key;
        toast("🔓 New world type unlocked: " + label + "!");
      }
    }
  }

  var toast = function () {};   // ui.js plugs a real function in here

  function rnd(min, max) { return min + Math.random() * (max - min); }

  // ---------- hideouts ----------
  // Small bugs can duck under flowers where hunters can't see them.
  var HIDE_SIZE = 1.15;    // how small you must be to fit under a flower
  var HIDE_RADIUS = 26;    // how close to the flower counts as "hidden"
  var HIDE_CAP = 2;        // a flower only has room for 2 hiders!

  function flowerIndexNear(x, y) {
    var spots = Render.HIDEOUTS();
    for (var i = 0; i < spots.length; i++) {
      if (Math.hypot(spots[i].x - x, spots[i].y - y) < HIDE_RADIUS) return i;
    }
    return -1;
  }

  // ---------- species ----------
  function addSpecies(name, flavor, genes, starter, legendary) {
    var sp = { id: nextSpeciesId++, name: name, flavor: flavor, genes: genes, starter: !!starter, legendary: !!legendary };
    species.push(sp);
    if (species.length > bestSpecies) {
      var prev = bestSpecies;
      bestSpecies = species.length;
      checkUnlocks(prev);
    }
    return sp;
  }

  function getSpecies(id) {
    for (var i = 0; i < species.length; i++) if (species[i].id === id) return species[i];
    return null;
  }

  function aliveCount(speciesId) {
    var n = 0;
    for (var i = 0; i < bugs.length; i++) if (bugs[i].speciesId === speciesId) n++;
    for (var e = 0; e < eggs.length; e++) if (eggs[e].speciesId === speciesId) n++;
    return n;
  }

  // ---------- spawning ----------
  function randomSpot(preferGentle) {
    var fallback = null;
    for (var tries = 0; tries < 30; tries++) {
      var x = rnd(50, W - 50), y = rnd(50, H - 50);
      if (Render.inAnyPond(x, y, 30)) continue;
      if (!fallback) fallback = { x: x, y: y };
      if (preferGentle) {
        var b = Render.biomeAt(x, y);
        if (b === "desert" || b === "snow") continue;
      }
      return { x: x, y: y };
    }
    return fallback || { x: W / 2, y: H / 2 };
  }

  function spawnBug(speciesId, x, y) {
    var sp = getSpecies(speciesId);
    if (!sp) return null;
    var bug = {
      speciesId: speciesId,
      x: x, y: y,
      angle: rnd(0, Math.PI * 2),
      energy: 65,
      age: 0,
      lifespan: rnd(70, 130),
      eggCd: rnd(6, 14),
      phase: rnd(0, 100),
      rest: 0,
    };
    bugs.push(bug);
    return bug;
  }

  function releaseSpecies(speciesId, count) {
    var spot = randomSpot(true); // arrive somewhere green, not knee-deep in snow
    for (var i = 0; i < count; i++) {
      var bug = spawnBug(speciesId, spot.x + rnd(-30, 30), spot.y + rnd(-30, 30));
      if (bug) bug.energy = 85; // released bugs arrive well-fed and ready to settle in
    }
  }

  function dropFood(x, y, count) {
    for (var i = 0; i < count; i++) {
      if (food.length >= maxFood() * 2) break;
      var fx = x + rnd(-25, 25);
      var fy = y + rnd(-25, 25);
      fx = Math.max(20, Math.min(W - 20, fx));
      fy = Math.max(20, Math.min(H - 20, fy));
      // leaves can't float in a pond — they wash up on the bank,
      // otherwise bugs pace the shoreline forever trying to reach them
      var ponds = Render.PONDS();
      for (var pi = 0; pi < ponds.length; pi++) {
        var pond = ponds[pi];
        var bank = pond.r + 28;
        var pd = Math.hypot(fx - pond.x, fy - pond.y);
        if (pd >= bank) continue;
        var ang = pd > 0 ? Math.atan2(fy - pond.y, fx - pond.x) : rnd(0, Math.PI * 2);
        // walk around the shore until we find a bank spot inside the world
        for (var turn = 0; turn < 12; turn++) {
          var tryAng = ang + (turn % 2 === 0 ? 1 : -1) * Math.ceil(turn / 2) * 0.4;
          var tx = pond.x + Math.cos(tryAng) * bank;
          var ty = pond.y + Math.sin(tryAng) * bank;
          if (tx >= 20 && tx <= W - 20 && ty >= 20 && ty <= H - 20) {
            fx = tx;
            fy = ty;
            break;
          }
        }
        break; // ponds are far apart — one wash-up is enough
      }
      food.push({ x: fx, y: fy, wob: rnd(0, Math.PI * 2) });
    }
  }

  // ---------- the update loop ----------
  function update(dt) {
    dt = dt * SETTINGS.simSpeed;
    if (dt <= 0) return;

    // leaves sprout over time — rarely in deserts or snow
    foodTimer -= dt;
    if (foodTimer <= 0 && food.length < maxFood()) {
      var spot = randomSpot();
      var spotBiome = Render.biomeAt(spot.x, spot.y);
      if ((spotBiome === "desert" || spotBiome === "snow") && Math.random() < 0.7) {
        spot = randomSpot(true); // sprout somewhere greener instead
      }
      food.push({ x: spot.x, y: spot.y, wob: rnd(0, Math.PI * 2) });
      foodTimer = 0.35 / Math.max(0.05, SETTINGS.foodRate);
    }

    // if starter species died out, wild ones wander back in eventually
    // (every extinct starter gets one — no species hogs the rescue!)
    wandererTimer -= dt;
    if (wandererTimer <= 0) {
      wandererTimer = rnd(12, 25);
      for (var si = 0; si < species.length; si++) {
        var sp0 = species[si];
        if (sp0.starter && aliveCount(sp0.id) === 0) {
          var edge = Math.random() < 0.5 ? { x: 20, y: rnd(60, H - 60) } : { x: rnd(60, W - 60), y: 20 };
          spawnBug(sp0.id, edge.x, edge.y);
          toast("A wild " + sp0.name + " wandered in! 🐛");
        }
      }
    }

    // eggs hatch
    for (var e = eggs.length - 1; e >= 0; e--) {
      eggs[e].timer -= dt;
      if (eggs[e].timer <= 0) {
        spawnBug(eggs[e].speciesId, eggs[e].x, eggs[e].y);
        eggs.splice(e, 1);
      }
    }

    // poofs fade
    for (var p = poofs.length - 1; p >= 0; p--) {
      poofs[p].t += dt * 1.6;
      if (poofs[p].t >= 1) poofs.splice(p, 1);
    }

    // who fits under each hideout? closest bugs win the spots,
    // everyone else is out in the open and better keep running
    var hideSpots = Render.HIDEOUTS();
    var flowerGuests = [];
    for (var fi = 0; fi < hideSpots.length; fi++) flowerGuests.push([]);
    for (var b = 0; b < bugs.length; b++) {
      var bb = bugs[b];
      bb.hidden = false;
      if (getSpecies(bb.speciesId).genes.size > HIDE_SIZE) continue;
      var fIdx = flowerIndexNear(bb.x, bb.y);
      if (fIdx >= 0) flowerGuests[fIdx].push(bb);
    }
    var hiderCounts = [];
    for (var fj = 0; fj < flowerGuests.length; fj++) {
      var fl = hideSpots[fj];
      flowerGuests[fj].sort(function (p, q) {
        return Math.hypot(p.x - fl.x, p.y - fl.y) - Math.hypot(q.x - fl.x, q.y - fl.y);
      });
      for (var gI = 0; gI < flowerGuests[fj].length && gI < HIDE_CAP; gI++) {
        flowerGuests[fj][gI].hidden = true;
      }
      hiderCounts.push(Math.min(flowerGuests[fj].length, HIDE_CAP));
    }

    // each bug thinks and moves
    for (var i = bugs.length - 1; i >= 0; i--) {
      var bug = bugs[i];
      var g = getSpecies(bug.speciesId).genes;
      bug.age += dt;
      bug.phase += dt;

      // --- decide where to go ---
      var targetAngle = null;
      var urgency = 1;
      var frozen = false;
      var biome = Render.biomeAt(bug.x, bug.y);

      if (bug.rest > 0) bug.rest -= dt; // hunters nap after a big meal

      // 1) danger! run from bigger hunters
      var fleeRange = g.shy ? 150 : 105;
      var nearestHunter = null, hunterDist = fleeRange;
      for (var j = 0; j < bugs.length; j++) {
        var other = bugs[j];
        if (other === bug) continue;
        var og = getSpecies(other.speciesId).genes;
        if (og.diet === "bugs" && g.size < og.size * 0.85) {
          var d = Math.hypot(other.x - bug.x, other.y - bug.y);
          if (d < hunterDist) { hunterDist = d; nearestHunter = other; }
        }
      }
      if (nearestHunter) {
        var wingBoost = g.wings * 0.25;  // wings make great escape gear
        var cover = null;
        if (g.size <= HIDE_SIZE && !bug.hidden) {
          // find the nearest hideout that still has a free spot
          var coverD = 140;
          for (var fc = 0; fc < hideSpots.length; fc++) {
            if (hiderCounts[fc] >= HIDE_CAP) continue;
            var fd = Math.hypot(hideSpots[fc].x - bug.x, hideSpots[fc].y - bug.y);
            if (fd < coverD) { coverD = fd; cover = hideSpots[fc]; }
          }
        }
        if (bug.hidden) {
          frozen = true; // safely under a flower — hold veeery still
        } else if (cover) {
          // run for the nearest flower!
          targetAngle = Math.atan2(cover.y - bug.y, cover.x - bug.x);
          urgency = 1.5 + wingBoost;
        } else {
          // no cover in reach — just run away fast
          targetAngle = Math.atan2(bug.y - nearestHunter.y, bug.x - nearestHunter.x);
          urgency = 1.8 + wingBoost;
        }
      }

      // 2) hunters chase snack-sized bugs when hungry (hidden bugs are invisible!)
      // in the forest, the trees block a hunter's view — prey is much safer there
      if (targetAngle === null && !frozen && g.diet === "bugs" && bug.energy < 80 && bug.rest <= 0) {
        var prey = null, preyDist = biome === "forest" ? 95 : 320;
        for (var k = 0; k < bugs.length; k++) {
          var cand = bugs[k];
          if (cand === bug) continue;
          var cg = getSpecies(cand.speciesId).genes;
          if (cg.size < g.size * 0.85 && !cand.hidden) {
            var pd = Math.hypot(cand.x - bug.x, cand.y - bug.y);
            if (pd < preyDist) { preyDist = pd; prey = cand; }
          }
        }
        if (prey) {
          targetAngle = Math.atan2(prey.y - bug.y, prey.x - bug.x);
          // POUNCE! hunters get a burst of speed at close range
          urgency = preyDist < 70 ? 2.0 : 1.2;
          // chomp!
          if (preyDist < 12 * g.size) {
            bug.energy = Math.min(100, bug.energy + 55);
            bug.rest = 4; // food coma
            kills++;
            poofs.push({ x: prey.x, y: prey.y, t: 0 });
            bugs.splice(bugs.indexOf(prey), 1);
            if (bugs.indexOf(bug) < 0) continue; // safety
          }
        }
      }

      // 3) leaf-eaters look for leaves when peckish
      // (fast bugs can spot leaves from farther away — speed has perks!)
      // Very hungry hunters will nibble leaves too, but get much less from them.
      var wantsLeaves = g.diet === "plants" ? bug.energy < 75 : bug.energy < 60;
      if (targetAngle === null && !frozen && wantsLeaves) {
        var leaf = null, leafDist = 120 + g.speed * 45, leafIdx = -1;
        for (var f = 0; f < food.length; f++) {
          var ld = Math.hypot(food[f].x - bug.x, food[f].y - bug.y);
          if (ld < leafDist) { leafDist = ld; leaf = food[f]; leafIdx = f; }
        }
        if (leaf) {
          targetAngle = Math.atan2(leaf.y - bug.y, leaf.x - bug.x);
          if (leafDist < 10 + 6 * g.size) {
            food.splice(leafIdx, 1);
            // slow bugs chew every last bite — more energy per leaf!
            var leafEnergy = g.diet === "plants" ? 28 + 18 / g.speed : 18;
            bug.energy = Math.min(100, bug.energy + leafEnergy);
          }
        }
      }

      // --- steer ---
      if (frozen) {
        // hiding under a flower: don't move a muscle
      } else if (targetAngle !== null) {
        // turn toward the target smoothly
        var diff = Math.atan2(Math.sin(targetAngle - bug.angle), Math.cos(targetAngle - bug.angle));
        bug.angle += diff * Math.min(1, dt * 6);
      } else {
        // just wandering
        bug.angle += rnd(-1, 1) * dt * 2.2;
      }

      // stay out of ponds — slide around the shore instead of
      // bouncing straight back, so bugs can walk AROUND the water
      var ponds2 = Render.PONDS();
      for (var pv = 0; pv < ponds2.length; pv++) {
        var pnd = ponds2[pv];
        if (Math.hypot(bug.x - pnd.x, bug.y - pnd.y) < pnd.r + 22) {
          var away = Math.atan2(bug.y - pnd.y, bug.x - pnd.x);
          var side = Math.sin(bug.angle - away) >= 0 ? 1 : -1;
          bug.angle = away + side * 1.1;
          break;
        }
      }

      // move
      var spd = 40 * g.speed * SETTINGS.bugSpeedMult * urgency;
      if (frozen) spd = 0;
      if (bug.rest > 0) spd *= 0.45; // sleepy after a big meal
      if (biome === "forest") spd *= 0.85;  // squeezing between trees
      else if (biome === "snow") spd *= 0.75; // trudging through snow
      bug.x += Math.cos(bug.angle) * spd * dt;
      bug.y += Math.sin(bug.angle) * spd * dt;

      // stay inside the terrarium
      var m = 18;
      if (bug.x < m) { bug.x = m; bug.angle = rnd(-1, 1); }
      if (bug.x > W - m) { bug.x = W - m; bug.angle = Math.PI + rnd(-1, 1); }
      if (bug.y < m) { bug.y = m; bug.angle = Math.PI / 2 + rnd(-1, 1); }
      if (bug.y > H - m) { bug.y = H - m; bug.angle = -Math.PI / 2 + rnd(-1, 1); }

      // --- energy and life ---
      // hot deserts and cold snow burn energy much faster
      var climate = biome === "desert" ? 1.35 : biome === "snow" ? 1.5 : 1;
      bug.energy -= (0.85 + g.speed * 0.45) * (frozen ? 0.4 : 1) * climate * dt;
      bug.eggCd -= dt;

      // well-fed bugs lay an egg — but not if their own family
      // is already crowding the garden (no species gets to hog it all)
      // hunters stay rare, like real ecosystems
      var popCap = worldMaxBugs();
      var familyCap = g.diet === "bugs"
        ? Math.max(2, popCap * 0.08)
        : Math.max(6, popCap * 0.25);
      // hunters lay after a good meal; grazers need a real energy surplus
      var eggAt = g.diet === "bugs" ? 75 : 85;
      if (bug.energy > eggAt && bug.eggCd <= 0 &&
          bugs.length + eggs.length < popCap &&
          aliveCount(bug.speciesId) < familyCap) {
        bug.energy -= 40;
        bug.eggCd = rnd(12, 20) / (g.babies || 1); // busy families lay much faster
        eggs.push({ x: bug.x + rnd(-10, 10), y: bug.y + rnd(-10, 10), speciesId: bug.speciesId, timer: 7 });
      }

      // starving or very old bugs poof away
      if (bug.energy <= 0 || bug.age > bug.lifespan) {
        poofs.push({ x: bug.x, y: bug.y, t: 0 });
        var sid = bug.speciesId;
        bugs.splice(i, 1);
        if (aliveCount(sid) === 0) {
          var spGone = getSpecies(sid);
          if (!spGone.starter) toast("The last " + spGone.name + " wandered off… make more in the Lab!");
        }
      }
    }
  }

  // ---------- drawing ----------
  function draw(ctx, time) {
    Render.drawBackground(ctx, W, H);

    for (var f = 0; f < food.length; f++) {
      Render.drawLeaf(ctx, food[f].x, food[f].y, food[f].wob);
    }
    for (var e = 0; e < eggs.length; e++) {
      Render.drawEgg(ctx, eggs[e].x, eggs[e].y, eggs[e].timer);
    }
    for (var i = 0; i < bugs.length; i++) {
      var bug = bugs[i];
      var sp = getSpecies(bug.speciesId);
      ctx.save();
      ctx.translate(bug.x, bug.y);
      ctx.rotate(bug.angle);
      if (bug.hidden) ctx.globalAlpha = 0.45; // peek-a-boo
      Render.drawBug(ctx, sp.genes, bug.phase);
      ctx.restore();
      if (sp.legendary) {
        Render.drawSparkles(ctx, bug.x, bug.y, bug.phase, 24 * sp.genes.size);
      }
    }
    for (var p = 0; p < poofs.length; p++) {
      Render.drawPoof(ctx, poofs[p].x, poofs[p].y, poofs[p].t);
    }
  }

  // ---------- save / load ----------
  var SAVE_KEY = "buglab-save-v1";
  var BACKUP_KEY = "buglab-backup-v1";

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        nextSpeciesId: nextSpeciesId,
        worldSeed: worldSeed,
        worldFlavor: worldFlavor,
        bestSpecies: bestSpecies,
        species: species,
        bugs: bugs.map(function (b) {
          return { speciesId: b.speciesId, x: b.x, y: b.y, energy: b.energy, age: b.age };
        }),
        eggs: eggs,
      }));
    } catch (err) { /* saving is a nice-to-have */ }
  }

  function spawnStarters() {
    for (var i = 0; i < species.length; i++) {
      var sp = species[i];
      if (!sp.starter) continue;
      releaseSpecies(sp.id, sp.genes.diet === "bugs" ? 2 : 4);
    }
    var starterFood = Math.round(45 * areaScale());
    for (var f = 0; f < starterFood; f++) {
      var spot = randomSpot(true);
      food.push({ x: spot.x, y: spot.y, wob: rnd(0, Math.PI * 2) });
    }
  }

  function freshWorld(flavorKey) {
    species = [];
    bugs = [];
    eggs = [];
    food = [];
    poofs = [];
    nextSpeciesId = 1;
    bestSpecies = 0; // progression starts over — the garden is small again
    worldSeed = newSeed();
    worldFlavor = flavorKey || "meadow";
    Render.generate(worldSeed, worldFlavor, bigUnlocked());
    syncSize();
    for (var i = 0; i < STARTER_BUGS.length; i++) {
      var s = STARTER_BUGS[i];
      addSpecies(s.name, s.flavor, s.genes, true);
    }
    spawnStarters();
  }

  // apply a parsed save; throws if the data is nonsense
  function applySave(data) {
    if (!data || !data.species || !data.species.length) throw new Error("empty save");
    species = data.species;
    nextSpeciesId = data.nextSpeciesId || species.length + 1;
    worldSeed = data.worldSeed || newSeed();
    worldFlavor = data.worldFlavor || "meadow";
    // unlocks never go backwards — count the save's species too
    bestSpecies = Math.max(data.bestSpecies || 0, species.length);
    Render.generate(worldSeed, worldFlavor, bigUnlocked());
    syncSize();
    eggs = data.eggs || [];
    bugs = [];
    food = [];
    poofs = [];
    (data.bugs || []).forEach(function (b) {
      var bug = spawnBug(b.speciesId, b.x, b.y);
      if (bug) { bug.energy = b.energy; bug.age = b.age; }
    });
    // if bugs.js gained new starter species since the save, add them in
    for (var i = 0; i < STARTER_BUGS.length; i++) {
      var s = STARTER_BUGS[i];
      var known = species.some(function (sp) { return sp.starter && sp.name === s.name; });
      if (!known) {
        var sp2 = addSpecies(s.name, s.flavor, s.genes, true);
        releaseSpecies(sp2.id, s.genes.diet === "bugs" ? 2 : 4);
      } else {
        // keep starter genes in sync with bugs.js so edits show up
        for (var q = 0; q < species.length; q++) {
          if (species[q].starter && species[q].name === s.name) {
            species[q].genes = s.genes;
            species[q].flavor = s.flavor;
          }
        }
      }
    }
    var loadFood = Math.round(25 * areaScale());
    for (var f = 0; f < loadFood && food.length < loadFood; f++) {
      var spot = randomSpot(true);
      food.push({ x: spot.x, y: spot.y, wob: rnd(0, Math.PI * 2) });
    }
    // empty garden but a full journal? repopulate, don't wipe!
    if (bugs.length === 0 && eggs.length === 0) spawnStarters();
  }

  function load() {
    var raw = null, backupRaw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
      backupRaw = localStorage.getItem(BACKUP_KEY);
    } catch (err) {}

    // try the main save first
    if (raw) {
      try {
        applySave(JSON.parse(raw));
        // it loaded cleanly — this is now the known-good backup
        try { localStorage.setItem(BACKUP_KEY, raw); } catch (e2) {}
        return;
      } catch (err) {
        // stash the broken save instead of destroying it
        try { localStorage.setItem("buglab-broken-v1", raw); } catch (e3) {}
      }
    }
    // main save missing or broken — try the backup
    if (backupRaw) {
      try {
        applySave(JSON.parse(backupRaw));
        toast("Restored your world from a backup! 🛟");
        return;
      } catch (err) {}
    }
    freshWorld();
  }

  function reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(BACKUP_KEY);
    } catch (err) {}
    freshWorld();
  }

  // set a species free: it leaves the garden and the journal
  function removeSpecies(id) {
    for (var i = bugs.length - 1; i >= 0; i--) {
      if (bugs[i].speciesId === id) {
        poofs.push({ x: bugs[i].x, y: bugs[i].y, t: 0 });
        bugs.splice(i, 1);
      }
    }
    for (var e = eggs.length - 1; e >= 0; e--) {
      if (eggs[e].speciesId === id) eggs.splice(e, 1);
    }
    for (var s = 0; s < species.length; s++) {
      if (species[s].id === id) { species.splice(s, 1); break; }
    }
  }

  // soft reset: grow a whole new world (new seed, chosen flavor),
  // but every discovered species stays safe in the journal
  function freshGarden(flavorKey) {
    bugs = [];
    eggs = [];
    food = [];
    poofs = [];
    worldSeed = newSeed();
    if (flavorKey && flavorUnlocked(flavorKey)) worldFlavor = flavorKey;
    Render.generate(worldSeed, worldFlavor, bigUnlocked());
    syncSize();
    spawnStarters();
  }

  return {
    W: function () { return W; },
    H: function () { return H; },
    update: update,
    draw: draw,
    load: load,
    save: save,
    reset: reset,
    freshGarden: freshGarden,
    addSpecies: addSpecies,
    removeSpecies: removeSpecies,
    getSpecies: getSpecies,
    releaseSpecies: releaseSpecies,
    aliveCount: aliveCount,
    dropFood: dropFood,
    speciesList: function () { return species; },
    bugCount: function () { return bugs.length; },
    bugList: function () { return bugs; },
    foodList: function () { return food; },
    killCount: function () { return kills; },
    worldInfo: function () { return { seed: worldSeed, flavor: worldFlavor }; },
    progress: function () {
      var cfg = unlocksCfg();
      return { species: bestSpecies, bigWorld: bigUnlocked(), bigWorldAt: cfg.bigWorld, flavors: cfg.flavors };
    },
    flavorUnlocked: flavorUnlocked,
    setToast: function (fn) { toast = fn; },
  };
})();
