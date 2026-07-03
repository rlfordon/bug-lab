// ================================================================
//  🐛 BUG LAB — THE MAGIC FILE 🐛
//
//  Everything about the bugs lives HERE. Change a number, save,
//  and refresh the game to see what happens. You cannot break
//  anything for real — if the game goes weird, just undo your
//  change (Ctrl+Z) and save again!
// ================================================================


// ----------------------------------------------------------------
//  GAME SETTINGS — the world's dials
// ----------------------------------------------------------------
var SETTINGS = {
  simSpeed: 1,        // how fast time flows (try 3... or 0!)
  mutationRate: 0.25, // chance a mixed bug gets a surprise twist (0 to 1)
  foodRate: 1,        // how many leaves sprout (try 3 for a feast)
  bugSpeedMult: 1,    // make EVERY bug faster or slower
  maxBugs: 120,       // how crowded the world can get
};


// ----------------------------------------------------------------
//  🤝 TEAMWORK — bugs of the same kind are stronger in a group!
//
//  When buddies of the SAME species huddle close together, they act
//  BIGGER than they really are. This means:
//    • a pack of tiny hunters can gang up to take down a huge bug!
//    • a swarm of little bugs is too much for a predator to eat!
//
//    packRadius: how close buddies must be to team up
//    strength:   how much bigger each extra buddy makes the group act
//    maxMates:   teamwork stops helping past this many buddies
// ----------------------------------------------------------------
var TEAMWORK = {
  packRadius: 78,
  strength: 0.28,
  maxMates: 4,
};


// ----------------------------------------------------------------
//  🌍 WORLD FLAVORS — what kind of world grows when you press
//  "Grow a new world". Make your own flavor!
//
//  base = what MOST of the world is made of.
//  The numbers = how many patches of OTHER biomes grow in it (0-4).
//  In harsh worlds, meadow patches become green oases around the
//  ponds — that's where life gathers!
//
//  What biomes do:
//    meadow: home sweet home — grassy and gentle.
//    forest: shady and safe — everyone walks slower, but hunters
//            can't see far in the trees. Mushrooms grow here.
//    desert: HOT. Bugs get hungry much faster. Few hiding spots.
//    snow:   freezing! Slow AND hungry. Only the toughest survive.
//    ponds:  how many ponds (bugs can't swim!)
// ----------------------------------------------------------------
// ----------------------------------------------------------------
//  🔓 UNLOCKS — discover species to grow your world!
//
//  bigWorld: how many species until your garden becomes a huge
//            scrolling world.
//  flavors:  how many species unlock each world type.
//  (You start with 5 bugs, so the counting starts there.)
// ----------------------------------------------------------------
var UNLOCKS = {
  bigWorld: 8,
  maker: 40,   // the Bug Maker: design bugs from scratch!
  flavors: { meadow: 0, forest: 12, desert: 16, snow: 20, wild: 25 },
};

var WORLD_FLAVORS = {
  meadow: { label: "🌼 Sunny Meadow", base: "meadow", forest: 1, desert: 1, snow: 0, ponds: 2 },
  forest: { label: "🌲 Deep Forest", base: "forest", meadow: 3, desert: 0, snow: 0, ponds: 2 },
  desert: { label: "🏜️ Dusty Desert", base: "desert", meadow: 2, forest: 1, snow: 0, ponds: 2 },
  snow: { label: "❄️ Frozen North", base: "snow", meadow: 2, forest: 1, desert: 0, ponds: 2 },
  wild: { label: "🎲 Total Surprise", random: true },
};


// ----------------------------------------------------------------
//  STARTER BUGS — the first bugs in your world
//
//  What the genes mean:
//    size:     0.6 = tiny,  1 = normal,  2 = HUGE
//              (1.15 and under can HIDE under flowers!
//               big bugs are too tough for hunters to eat —
//               unless the hunter is even BIGGER…)
//    speed:    0.5 = slowpoke,  1 = normal,  2.5 = zoomer
//    babies:   0.6 = rare, precious eggs,  1 = normal,
//              1.6 = eggs EVERYWHERE (a busy family bounces
//              back fast, but spends lots of energy on eggs!)
//    hue:      body color as a number from 0 to 360
//              (0=red, 40=orange, 60=yellow, 120=green,
//               200=blue, 280=purple, 330=pink)
//    hue2:     the color of its spots or stripes
//    segments: how many body blobs (1, 2, or 3)
//    legPairs: pairs of legs (2, 3, or 4)
//    wings:    0 = none,  1 = little wings,  2 = BIG wings
//              (wings help you zoom away from hunters!)
//    eyes:     1 = one big eye,  2 = two eyes,  3 = three eyes!
//    antennae: 0, 1, or 2 feelers on its head
//    pattern:  "plain", "spots", or "stripes"
//    diet:     "plants" = eats leaves,  "bugs" = hunts smaller bugs!
//    shy:      true = runs away easily,  false = brave
// ----------------------------------------------------------------
var STARTER_BUGS = [
  {
    name: "Dotty",
    flavor: "Loves napping on warm rocks.",
    genes: {
      size: 0.9, speed: 0.8, babies: 1.6, hue: 0, hue2: 20,
      segments: 2, legPairs: 3, wings: 1, eyes: 2,
      antennae: 2, pattern: "spots", diet: "plants", shy: true,
    },
  },
  {
    name: "Hopper",
    flavor: "Once jumped over a whole flower. Probably.",
    genes: {
      size: 1.0, speed: 2.0, babies: 1.0, hue: 110, hue2: 90,
      segments: 3, legPairs: 3, wings: 0, eyes: 2,
      antennae: 2, pattern: "plain", diet: "plants", shy: true,
    },
  },
  {
    name: "Flutter",
    flavor: "Thinks every flower is talking to her.",
    genes: {
      size: 1.1, speed: 1.2, babies: 1.2, hue: 280, hue2: 330,
      segments: 2, legPairs: 2, wings: 2, eyes: 2,
      antennae: 2, pattern: "spots", diet: "plants", shy: true,
    },
  },
  {
    name: "Crunch",
    flavor: "Chews leaves VERY loudly.",
    genes: {
      size: 1.4, speed: 0.6, babies: 0.7, hue: 210, hue2: 240,
      segments: 2, legPairs: 3, wings: 0, eyes: 2,
      antennae: 1, pattern: "stripes", diet: "plants", shy: false,
    },
  },
  {
    name: "Snapper",
    flavor: "The terrarium's tiny troublemaker. Watch out, little bugs!",
    genes: {
      size: 1.6, speed: 1.4, babies: 0.9, hue: 35, hue2: 0,
      segments: 3, legPairs: 4, wings: 0, eyes: 3,
      antennae: 1, pattern: "stripes", diet: "bugs", shy: false,
    },
  },
];


// ----------------------------------------------------------------
//  NAME PARTS — new species get names built from these.
//  Add your own words! (Keep them short and silly.)
// ----------------------------------------------------------------
var NAME_STARTS = [
  "Zip", "Bop", "Fuzz", "Glim", "Snor", "Twee", "Bum", "Skit",
  "Wig", "Pip", "Zaz", "Doodle", "Munch", "Squib", "Flap", "Nib",
];
var NAME_ENDS = [
  "by", "bug", "wing", "hop", "zoom", "pod", "ster", "kin",
  "let", "boop", "worm", "chomp", "fly", "dot", "puff", "leg",
];

// ----------------------------------------------------------------
//  🌟 LEGENDARY BUGS 🌟
//
//  If a freshly-mixed bug matches a recipe, it BECOMES that
//  legendary! Recipes are checked top to bottom — first match wins.
//
//  Recipe words you can use for any gene:
//    exactly: 2     the gene must be exactly this
//    atLeast: 2.2   the gene must be this or more
//    atMost: 0.5    the gene must be this or less
//
//  The "hint" is the riddle shown on its mystery card in the
//  Journal before anyone discovers it. Try adding your own!
// ----------------------------------------------------------------
var LEGENDARY_BUGS = [
  {
    name: "Jetwing",
    flavor: "Broke the bug speed record. Then broke it again on the way back.",
    hint: "Something super speedy… with GREAT BIG wings…",
    recipe: { speed: { atLeast: 2.2 }, wings: { exactly: 2 } },
    genes: {
      size: 1.0, speed: 2.6, babies: 1.0, hue: 195, hue2: 45,
      segments: 2, legPairs: 2, wings: 2, eyes: 2,
      antennae: 1, pattern: "stripes", diet: "plants", shy: false,
    },
  },
  {
    name: "Discoball",
    flavor: "It only knows one dance move. It's a good one.",
    hint: "One big eye… covered in dots… loves to boogie…",
    recipe: { eyes: { exactly: 1 }, pattern: { exactly: "spots" } },
    genes: {
      size: 1.1, speed: 1.3, babies: 1.2, hue: 315, hue2: 55,
      segments: 1, legPairs: 3, wings: 1, eyes: 1,
      antennae: 2, pattern: "spots", diet: "plants", shy: false,
    },
  },
  {
    name: "The Watcher",
    flavor: "Sees everything. Tells no one.",
    hint: "Three eyes… but oh so shy…",
    recipe: { eyes: { exactly: 3 }, shy: { exactly: true } },
    genes: {
      size: 0.9, speed: 1.0, babies: 0.8, hue: 260, hue2: 120,
      segments: 2, legPairs: 3, wings: 0, eyes: 3,
      antennae: 2, pattern: "plain", diet: "plants", shy: true,
    },
  },
  {
    name: "Sir Snoozalot",
    flavor: "Has never been on time for anything. Ever.",
    hint: "The sloooooowest bug in the whole wide world…",
    recipe: { speed: { atMost: 0.5 } },
    genes: {
      size: 1.3, speed: 0.45, babies: 0.6, hue: 30, hue2: 200,
      segments: 3, legPairs: 3, wings: 0, eyes: 2,
      antennae: 0, pattern: "plain", diet: "plants", shy: true,
    },
  },
  {
    name: "Mount Crunchmore",
    flavor: "When it walks, the flowers hold their breath.",
    hint: "They say a bug can grow as big as a MOUNTAIN…",
    recipe: { size: { atLeast: 1.9 } },
    genes: {
      size: 2.1, speed: 0.7, babies: 0.5, hue: 145, hue2: 30,
      segments: 3, legPairs: 4, wings: 0, eyes: 2,
      antennae: 1, pattern: "stripes", diet: "plants", shy: false,
    },
  },
  {
    name: "Centipuff",
    flavor: "So many legs it sometimes forgets which one goes first.",
    hint: "Lots and lots of body parts… even more legs… and no wings at all…",
    recipe: { segments: { exactly: 3 }, legPairs: { exactly: 4 }, wings: { exactly: 0 } },
    genes: {
      size: 1.2, speed: 1.1, babies: 1.4, hue: 340, hue2: 180,
      segments: 3, legPairs: 4, wings: 0, eyes: 2,
      antennae: 2, pattern: "spots", diet: "plants", shy: false,
    },
  },
];


//  Baby flavor text for brand-new species:
var FLAVOR_LINES = [
  "Nobody has ever seen one of these before. YOU made it!",
  "It squeaks when it's happy.",
  "Its favorite food is whatever it just ate.",
  "Scientists are very confused by this one.",
  "It dreams about clouds shaped like leaves.",
  "Warning: may be too adorable.",
  "It hums a little song while it walks.",
  "This bug has no idea how weird it looks. Don't tell it.",
];
