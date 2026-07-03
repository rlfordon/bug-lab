// ===== genes.js — how bug DNA mixes, mutates, and gets named =====

var Genes = (function () {

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Blend a number gene from two parents (leans toward one side randomly).
  // A dash of "hybrid vigor": babies can land a little beyond both
  // parents, so patient breeders can push past any ceiling.
  function blendNum(a, b) {
    var t = rand(0.25, 0.75);
    return (a + (b - a) * t) * rand(0.85, 1.15);
  }

  // Pick one parent's version of a gene
  function pickGene(a, b) { return Math.random() < 0.5 ? a : b; }

  // Mix two parents' genes into a child, with a chance of mutation.
  // Returns { genes, mutated }
  function mix(gA, gB) {
    var child = {
      size: clamp(blendNum(gA.size, gB.size), 0.5, 2.2),
      speed: clamp(blendNum(gA.speed, gB.speed), 0.4, 2.8),
      babies: clamp(blendNum(gA.babies || 1, gB.babies || 1), 0.4, 2),
      hue: Math.round(pickGene(gA.hue, gB.hue) + rand(-20, 20) + 360) % 360,
      hue2: Math.round(pickGene(gA.hue2, gB.hue2) + rand(-20, 20) + 360) % 360,
      segments: pickGene(gA.segments, gB.segments),
      legPairs: pickGene(gA.legPairs, gB.legPairs),
      wings: pickGene(gA.wings, gB.wings),
      eyes: pickGene(gA.eyes, gB.eyes),
      antennae: pickGene(gA.antennae, gB.antennae),
      pattern: pickGene(gA.pattern, gB.pattern),
      diet: pickGene(gA.diet, gB.diet),
      shy: pickGene(gA.shy, gB.shy),
    };

    var mutated = false;
    if (Math.random() < SETTINGS.mutationRate) {
      mutated = true;
      var twist = pick(["size", "speed", "babies", "color", "segments", "legs", "wings", "eyes", "antennae", "pattern"]);
      switch (twist) {
        case "size": child.size = clamp(child.size * pick([0.5, 1.8]), 0.5, 2.2); break;
        case "speed": child.speed = clamp(child.speed * pick([0.5, 1.9]), 0.4, 2.8); break;
        case "babies": child.babies = clamp(child.babies * pick([0.5, 1.8]), 0.4, 2); break;
        case "color": child.hue = Math.floor(rand(0, 360)); child.hue2 = (child.hue + 180) % 360; break;
        case "segments": child.segments = pick([1, 2, 3]); break;
        case "legs": child.legPairs = pick([2, 3, 4]); break;
        case "wings": child.wings = pick([0, 1, 2]); break;
        case "eyes": child.eyes = pick([1, 2, 3]); break;
        case "antennae": child.antennae = pick([0, 1, 2]); break;
        case "pattern": child.pattern = pick(["plain", "spots", "stripes"]); break;
      }
    }
    return { genes: child, mutated: mutated };
  }

  // Does this freshly-mixed bug match a legendary recipe?
  // Recipes are checked top to bottom; first match wins.
  function checkLegendary(g) {
    for (var i = 0; i < LEGENDARY_BUGS.length; i++) {
      var leg = LEGENDARY_BUGS[i];
      var matches = true;
      for (var key in leg.recipe) {
        var rule = leg.recipe[key];
        var val = g[key];
        if (rule.exactly !== undefined && val !== rule.exactly) matches = false;
        if (rule.atLeast !== undefined && val < rule.atLeast) matches = false;
        if (rule.atMost !== undefined && val > rule.atMost) matches = false;
      }
      if (matches) return leg;
    }
    return null;
  }

  // Build a silly name from the name-part lists in bugs.js
  function makeName(existingNames) {
    for (var tries = 0; tries < 30; tries++) {
      var name = pick(NAME_STARTS) + pick(NAME_ENDS);
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (existingNames.indexOf(name) === -1) return name;
    }
    // crowded name book: number them until one is free (always succeeds)
    var base = pick(NAME_STARTS) + pick(NAME_ENDS);
    base = base.charAt(0).toUpperCase() + base.slice(1);
    var n = 2;
    while (existingNames.indexOf(base + " " + n) !== -1) n++;
    return base + " " + n;
  }

  // Short trait words for the little chips on cards
  function traitChips(g) {
    var chips = [];
    if (g.speed >= 1.8) chips.push("⚡ super fast");
    else if (g.speed <= 0.6) chips.push("🐌 slowpoke");
    if (g.size >= 1.6) chips.push("🐘 giant");
    else if (g.size <= 0.7) chips.push("🐜 teeny");
    if (g.size <= 1.15) chips.push(g.diet === "bugs" ? "🌸 can ambush" : "🌸 can hide");
    if (g.size <= 1.0) chips.push("🤝 team power");
    if ((g.babies || 1) >= 1.4) chips.push("🥚 eggs everywhere");
    else if ((g.babies || 1) <= 0.7) chips.push("🥚 rare eggs");
    if (g.wings === 2) chips.push("🦋 big wings");
    else if (g.wings === 1) chips.push("🪽 little wings");
    if (g.eyes === 3) chips.push("👀 three eyes");
    if (g.eyes === 1) chips.push("👁️ one eye");
    if (g.legPairs === 4) chips.push("🦵 extra legs");
    if (g.diet === "bugs") chips.push("😈 hunter");
    else chips.push("🍃 leaf-eater");
    if (g.shy) chips.push("🙈 shy");
    else chips.push("💪 brave");
    return chips;
  }

  return { mix: mix, makeName: makeName, traitChips: traitChips, checkLegendary: checkLegendary, pick: pick, rand: rand, clamp: clamp };
})();
