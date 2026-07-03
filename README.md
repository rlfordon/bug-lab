# 🐛 Bug Lab

A creature-mixing terrarium game. Splice two bugs together in the Lab, release
the hybrid into a living garden, and watch what happens to the ecosystem.

**▶️ Play it now: https://rlfordon.github.io/bug-lab/**

## How to run it

Easiest: play online at the link above.

Or run it locally: double-click `index.html` — it opens in the browser and
just works. No installs, no internet needed. (If the browser ever complains,
you can also run a tiny local server: `python -m http.server 8123` in this
folder, then open http://localhost:8123)

Remember: your saved world lives per-address, so pick one way to play and
stick with it — or move worlds around with 💾 export / 📂 import in the
Designer Panel.

## How to play

- **🌿 Terrarium** — a big scrolling world. **Drag, use arrow keys/WASD, or
  the scroll wheel to explore; click the minimap to jump.** Bugs eat leaves,
  run from hunters, and lay eggs when well-fed. **Click anywhere to drop
  leaves** and feed them.
- **🌍 Worlds & biomes** — every world is grown from a random seed. Forests
  are slow but safe (hunters can't see far in the trees); deserts are hot
  and hungry; snow is brutal. The **🌍 Grow a new world** button lets him
  pick a world type — Sunny Meadow, Deep Forest, Dusty Desert, Frozen
  North, or Total Surprise. His Journal always survives. World flavors are
  defined in `bugs.js`, so he can eventually invent his own.
- **🧪 The Lab** — pick two bugs, hit MIX, and release your new species.
  Mutations happen sometimes… ✨
- **🛠️ Bug Maker** (unlocks at 10 species) — design a bug from scratch:
  pick its stats, colors, and parts with sliders and buttons, or switch to
  **✏️ Draw it myself** and hand-draw your bug with a paint canvas. Drawn
  bugs walk around the garden wearing your art.
- **📖 Journal** — a page for every species ever discovered or invented.
- **🌟 Legendaries** — six secret bugs with hidden recipes. If a mix produces
  the right combination of genes, it *becomes* the legendary (golden card,
  sparkles in the garden). Undiscovered ones show as dark "? ? ?" mystery
  cards in the Journal with a riddle hint. Recipes are in `bugs.js` — easiest
  first find: try mixing Hopper with Snapper a few times.

The world saves itself automatically (in the browser), so his creations
survive closing the tab — refreshing continues the same world, it does
not start over. **Important: the save lives per-address**, so always open
the game the same way (bookmark it!). A known-good backup is kept
automatically and restores itself if the save ever breaks. The Designer
Panel also has **💾 Save world to a file / 📂 Load world from a file** —
use these for real backups or to move his world to another browser or
computer. A full wipe (journal included) is the red button in the panel.

After a code update, press **Ctrl+F5** once (script files are versioned
with `?v=N` in `index.html` — bump them together when editing the code).

## The secret (parents only!)

There are three secret ways to open the **Designer Panel**: press
**`` ` ``** (the backtick key, if your keyboard has one), **type the word
`magic`**, or **click the 🐛 Bug Lab title five times fast**. Inside:
live sliders for sim speed, mutation rate, food, and more, plus a
"rain leaves" button and a world reset.

**The reveal plan:** once he's hooked on playing, "discover" the secret key
together and let him break the game with the sliders. When he wants more
power than the sliders give, show him `bugs.js` — every starter bug, every
gene, the name generator, and the game settings live there in plain text
with instructions written for him. Editing that file *is* his first
programming. When he outgrows it, the rest of the code is in `js/`,
written to be readable.

## Files

| File | What it is |
|---|---|
| `index.html` | the page |
| `style.css` | how everything looks |
| `bugs.js` | ⭐ THE KID FILE — starter bugs, genes, settings, name parts |
| `js/genes.js` | how DNA mixes and mutates |
| `js/render.js` | draws bugs from their genes |
| `js/sim.js` | the living ecosystem |
| `js/ui.js` | buttons, cards, screens |
| `js/main.js` | starts the game |
