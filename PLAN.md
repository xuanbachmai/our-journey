# Our Journey — Project Plan

A 2-player co-op pixel-art cooking and farming game. Grow ingredients, cook dishes
with hands-on mini-games, and run a small eatery whose economy keeps ticking while
you are away. Mobile-first, playable on desktop, always online with a server-hosted
shared world.

---

## 1. Requirements as understood

| # | Requirement | Interpretation used in this plan |
|---|-------------|----------------------------------|
| R1 | Cooking with real interaction | Every recipe step is a short touch/mouse mini-game (chop, stir, flip, season, heat control, plate). Performance sets dish quality and sale price. |
| R2 | Manage the growth | Two layers: **crop growth** (plant, water, wait real time, harvest) and **business growth** (reputation, upgrades, unlocked recipes, hired helper). |
| R3 | Pixel style like Mario / Stardew | 16×16 tiles, 320×180 internal resolution, integer scaling, nearest-neighbour filtering, limited palette, top-down Stardew-style world. |
| R4 | 2 players | One shared world per pair. Both can be online at once (see each other move in real time) or play at different times (actions persist). |
| R5 | Mobile first, also on computer | Progressive Web App. Touch controls (virtual stick + context action button). Keyboard/mouse on desktop. Landscape orientation. Installable to home screen. |
| R6 | No offline / LAN play, online with a world | **Assumption:** the game is online-only. The world lives on a server, not on either phone. No LAN hosting, no offline mode. |
| R7 | World runs while nobody plays | Server-authoritative simulation. Crops grow, customers buy stocked dishes, prices drift, stock spoils, all on server time. |

**Please confirm R6.** If you actually meant "should also work offline or over LAN", the
networking section changes a lot, so say so before the build starts.

### 1.1 Confirmed direction (added after review)
- **Players:** the two characters are **xb** (he, blue/green) and **qd** (she, purple). Each world has exactly these two members. Either can log in alone; nobody has to "host".
- **Gift context:** this is a birthday surprise for qd. The mailbox by the house holds a letter from xb on first visit (text lives in `packages/client/src/config/letter.ts`).
- **Art direction:** super cute, Stardew Valley feel, pixel art, bright and colourful.
  - Chibi characters with big heads, blush cheeks, eye shine. xb: blue hair, green overalls. qd: purple hair, lavender overalls, pink bow.
  - Saturated palette: candy greens for grass, coral roof, sky-blue pond, white picket fence, cherry-blossom trees mixed with green ones, flowers everywhere.
  - Soft dark-plum outlines instead of pure black so nothing looks harsh.
  - Juice: bounce on actions, sparkles on ripe crops, butterflies, "+1" pops, water droplets.
- All art is generated in code from pixel maps and a shared palette for now, so the style stays consistent. Hand-drawn Aseprite art can replace it later without touching game logic.

---

## 2. Game design

### 2.1 Core loop
1. **Farm** — till, plant seeds, water, harvest. Crops take real minutes/hours.
2. **Cook** — pick a recipe, play the mini-game steps, get a dish with a quality grade (C/B/A/S).
3. **Sell** — put dishes on the counter. Customers arrive over real time and buy them, even while you are away.
4. **Grow** — spend coins on seeds, tools, kitchen upgrades, more counter slots, decor that raises reputation, and eventually a helper who cooks simple dishes for you.

### 2.2 Cooking mini-games (R1)
Each recipe = ordered list of steps. Each step is one mini-game lasting 3–8 seconds.

| Step | Input on phone | Input on PC | Scored on |
|------|----------------|-------------|-----------|
| Chop | Swipe down across the ingredient in rhythm with a moving marker | Click / Space in rhythm | Timing accuracy, count |
| Stir | Drag in circles inside the pot | Mouse circles | Steady speed, staying inside the pot |
| Flip | Tap when the "sizzle" bar hits the green zone | Space at the right time | Timing |
| Season | Drag shaker, tap to shake; stop before overfilling | Same with mouse | Landing in the target range |
| Heat | Hold to raise flame, release to lower; keep a needle in a moving band | Hold Space | Time spent in band |
| Plate | Drag components onto the plate outline | Same | Placement accuracy |

Overall score → quality grade → price multiplier and reputation gain.
Two players can cook together: player A does chop/season while player B does heat/stir on the same dish (co-op bonus).

### 2.3 Growth systems (R2)
- **Crops:** 8 crops at launch (tomato, wheat, potato, carrot, onion, mushroom, chili, rice). Each has grow time, water need, sell price. Seasons can come later.
- **Plot states:** untilled → tilled → planted → growing (n stages) → ready → harvested / wilted.
- **Watering rule:** an unwatered crop pauses growth; it does not die for the first 48 h, so being away is not punished harshly. A sprinkler upgrade removes the chore.
- **Business:** reputation (0–100) drives customer arrival rate and what they will pay. Upgrades: stove tiers, extra counter slots, fridge (slows spoilage), decor, helper NPC.

### 2.4 Persistent economy (R7)
Runs on the server for every world, whether or not anyone is connected.

- **Tick:** every 60 s for worlds with a connected player. On connect, a dormant world catches up in one deterministic pass over the elapsed time, capped at 7 days so a long absence cannot produce absurd results.
- **Simulated each tick:** crop growth, customer arrivals (Poisson rate from reputation × time of day), purchases from the counter, dish and ingredient spoilage, daily market price drift (±15 % random walk with mean reversion), helper NPC output if hired.
- **Player return summary:** "While you were away: 14 dishes sold for 310 coins, 3 tomatoes spoiled, wheat is ready."
- **Anti-exploit:** all economy math is server-side. The client only sends intents (plant here, sell this, mini-game result). Mini-game scores are checked for plausibility (max score per step, minimum duration).

### 2.5 Multiplayer (R4)
- A **world** is created by one player and comes with a 6-character invite code. The second player joins with the code. Max 2 members per world.
- Both online: positions, animations and actions broadcast at 10–15 Hz through the room. Interpolation on the client.
- One online: normal play. The other's last position is shown as a sleeping avatar.
- Shared chest + personal hotbar, shared wallet, shared reputation.
- Later: emotes, a "ping" marker.

### 2.6 Controls
- **Phone:** left thumb virtual joystick, right thumb one context-sensitive action button (Till / Plant / Water / Harvest / Cook / Interact) plus a small inventory button. Mini-games use full-screen single-finger gestures.
- **PC:** WASD/arrows, Space/E action, number keys for hotbar, mouse for mini-games.
- Base canvas 320×180 scaled to the largest integer that fits, letterboxed. Landscape, with a rotate-your-phone overlay in portrait.

---

## 3. Technical plan

### 3.1 Stack (recommended)

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript everywhere | One language, shared types between client and server. |
| Client engine | **Phaser 3** | Mature 2D engine: tilemaps, sprite animation, pointer/touch input, WebGL with canvas fallback, easy pixel-perfect config. |
| Build | Vite + vite-plugin-pwa | Fast dev server, PWA manifest and service worker for install-to-home-screen. The service worker caches assets only; gameplay still requires the server. |
| Server | Node.js + **Colyseus** | Room-based authoritative multiplayer with automatic state sync, reconnection tokens and a schema system. Saves a lot of custom WebSocket code. |
| Database | **PostgreSQL** in production, SQLite in local dev, via Drizzle ORM | Worlds must survive server restarts and deploys. The ORM keeps the two databases swappable. |
| Auth | Device token + display name, world invite code | No passwords or e-mail needed for two friends. Token stored in localStorage. A "link this device" code lets you move to another phone. |
| Hosting | Fly.io or Railway for server + Postgres, Cloudflare Pages for the client | Cheap, WebSocket-friendly. A single region is fine for 2 players. |
| Art tools | Aseprite (or free Piskel) for custom sprites; CC0 packs (Kenney, Sprout Lands basic) as placeholders | Ship early with placeholders, replace with a consistent custom set later. |
| Audio | Phaser audio, chiptune SFX from a jsfxr-style generator | Small files, pixel-game feel. |
| Testing | Vitest for economy/simulation logic; one Playwright smoke test per milestone | The economy must be deterministic and tested. The rest is judged visually. |

**Alternatives considered:** Godot 4 web export (great pixel tooling, but heavy web builds on phones and more custom multiplayer work). Unity (overkill, large web builds). Phaser keeps the mobile bundle small.

### 3.2 Repository layout (monorepo, npm workspaces)

```
game-two-player/
  package.json              # workspaces
  packages/
    shared/                 # types, recipe/crop data, economy simulation (pure functions)
    client/                 # Phaser + Vite PWA
    server/                 # Colyseus rooms, HTTP API, DB, world scheduler
  assets/                   # source art (aseprite), exported spritesheets, Tiled maps
  docs/                     # design docs
```

The economy simulation lives in `shared` as pure functions: `simulate(world, fromTime, toTime, rng) → world`.
The server runs it for real. The client runs the same code to predict and show timers. Same code, no drift.

### 3.3 Data model (initial)

- **World**: id, inviteCode, createdAt, lastSimulatedAt, coins, reputation, marketPrices, upgrades, rngSeed
- **Member**: id, worldId, deviceToken, name, spriteVariant, lastPosition, lastSeenAt
- **Plot**: worldId, x, y, state, cropId, plantedAt, wateredUntil, growthProgress
- **InventoryItem**: worldId, ownerMemberId or null for shared, itemId, quantity, quality, expiresAt
- **CounterSlot**: worldId, index, dishId, quality, price, listedAt
- **EventLog**: worldId, time, type, payload (feeds the "while you were away" summary and debugging)

### 3.4 Network protocol (Colyseus room `WorldRoom`)

Client → server intents: `move`, `till`, `plant`, `water`, `harvest`, `startCook`, `cookStepResult`, `listDish`, `buyUpgrade`, `takeFromChest`, `putInChest`.

Server → client: synced state schema (players, plots, counter, wallet, reputation, clock) plus events: `awaySummary`, `customerBought`, `cropReady`, `error`.

The server validates every intent (distance to tile, item ownership, cooldown, plausible mini-game score) before applying it.

### 3.5 Pixel-art rendering rules
- `pixelArt: true`, `roundPixels: true`, integer zoom.
- Tiles 16×16, characters 16×24, bitmap UI font (m5x7 or a custom 5×7).
- Palette: 32 colours max, shared across all sheets.
- Maps authored in Tiled, exported as JSON. Layers: ground, farm, objects, collision, above-player.

---

## 4. Milestones

Each milestone ends with something playable. Effort assumes one developer with AI assistance.

| # | Milestone | Deliverable | Est. |
|---|-----------|-------------|------|
| M0 | Scaffold | Monorepo, Phaser hello-world at 320×180 with a walking character, touch joystick + keyboard, deployed preview URL. | 1–2 days |
| M1 | Farm (single-player, local state) | Tilemap of farm + kitchen. Till/plant/water/harvest with placeholder crops growing on a local timer. Inventory + hotbar UI. | 3–4 days |
| M2 | Cooking mini-games | The 6 mini-games, a recipe runner, quality grading, 5 recipes. Tuned for thumbs first, then mouse. | 4–5 days |
| M3 | Server + 2-player sync | Colyseus room, world create/join by code, both players moving and farming in the same world live, Postgres persistence, reconnection. | 4–5 days |
| M4 | Living economy | Server tick + catch-up simulation, customers, counter sales, spoilage, price drift, "while you were away" summary. Unit tests for the simulator. | 3–4 days |
| M5 | Growth & content | Reputation, upgrade shop, helper NPC, 8 crops / 15 recipes, co-op cooking bonus, day/night tint. | 4–5 days |
| M6 | Polish & ship | Custom pixel-art pass, SFX/music, PWA install flow, orientation overlay, performance pass on a low-end Android phone, error reporting, production deploy. | 3–5 days |

Total: roughly 4–6 weeks of focused work. M0–M2 can be shown to a second person on a phone before any server exists.

---

## 5. Risks and mitigations

- **Mini-games feel bad on touch.** Prototype each one in isolation on a real phone during M2 before wiring into recipes. Keep every gesture single-finger.
- **Simulation drift or exploits.** Simulator is pure and seeded. The server is the only writer. Tests assert that one big catch-up equals many small ticks.
- **Mobile performance.** Cap sprites on screen, one texture atlas, no per-frame allocations, test on a mid/low-tier Android from M0 onward.
- **Hosting cost.** Idle worlds cost nothing: dormant worlds are not ticked, they catch up on connect. One small instance serves many pairs.
- **Art consistency.** Fix palette and tile size in M0. Placeholders get replaced, never mixed.

---

## 6. Progress log

- **2026-09-17** — M0 and M1 done. Monorepo, Phaser client with generated pixel art, title screen with character pick, farm with till/plant/water/harvest, hotbar, market (sell crops, buy seeds), mailbox letter, touch joystick + keyboard, local save with catch-up growth and a "while you were away" toast. Verified in the browser at desktop and phone sizes. WebGL falls back to Canvas automatically on browsers whose WebGL boot fails.
- **2026-09-17 (later)** — Complete single-device gameplay loop. Six cooking mini-games (chop, stir, flip, season, heat, plate) with C/B/A/S grades, 8 recipes unlocked by reputation, outdoor kitchen, display counter with villager customers who buy on a deterministic per-minute schedule (also while away), reputation, market upgrades (rod, counter slots, coop + hens with eggs, sprinkler, stove, flower beds), fishing mini-game at the pond, 20 sequential quests with a HUD ticker and reward banners, journal (quests, stats, settings), synth sound effects and a soft music loop, day/night tint with fireflies, welcome-back summary panel. The whole simulation lives in `packages/shared` as pure functions with tests, ready to move to the server.
- **2026-09-17 (1.0 build)** — Decisions from the grill session: Supabase now, game server in 2.0; pairing by 6-letter code (two seats, sticky until "Leave this farm", invite link, optional email to keep a seat); live positions; one shared wallet/bag/reputation/house, personal characters, clothes and pets; four outdoor areas + five interiors with a map and fast travel; restaurant with seated diners plus the passive counter; mixed pacing (minutes to hours), never punishing absence; coins only, cosmetic packs in 2.0; all eight couple features; solo fallback without a backend.
  Implemented: areas (Farm, Maple Town, Whisper Forest, Sunny Ranch; Home, Restaurant, General Store, Rosa's Tailor, Pet & Barn Shop), 8 crops with countdowns, 17 recipes with reputation and book unlocks, restaurant service, orders board, daily prices, foraging, cows/sheep/bees/hens, pets that follow and dig gifts, furniture with coziness, hats/accessories/dyes/hair, wardrobe, map, how-to-play book, 38 quests, journal with album and settings, notes, daily question, Love Tree, special days with balloons and fireworks, weather with rain, emotes and together hearts, co-op cooking over the network, Supabase pairing + realtime sync, schema in `supabase/schema.sql`.
- **2026-09-17 (family homes)** — Family Lane east of Maple Town with two enterable homes: Nha ba Hanh (ba Hanh, me Phuong, em Vy, em Sang) and Nha ba Thai (ba Thai, me Mai, chi Nhi). Visiting only, no economy. Each family member greets xb and qd with different lines (config/family.ts). Villager dialogue now uses a bottom text box with a name tag; name tags show only near the player.
- **2026-09-17 (bag)** — Bag button replaces the row of loose item icons: pockets for Food, Seeds, Dishes and Home furniture, a 10x3 slot grid, and details for the selected item (today's price, recipes that use it, grow time, dish value, coziness) with Hold (seed in hand) and Place (furniture at home). HUD button taps no longer start the joystick. Fixed the title screen restarting behind the game on every phone rotation.
- **2026-09-17 (music)** — New background song: a slow lo-fi lullaby (C major, 76 bpm, 16 bars, about 50 s per loop) with soft pad chords, a music-box melody and echo, warm bass, brush and a soft kick, all through a low-pass filter. After 9 pm it plays darker without percussion. Level sits just under the sound effects.
- **2026-09-17 (journey)** — Step-by-step progression: 11 story chapters (A new start, Our first meal, Maple Town, Open for dinner, Home sweet home, Little friends, Wild places, Family, Together, Famous farm, Our journey) of up to 5 tasks with hints, per-task and chapter rewards (seeds, furniture, chef hat, crown). A bouncing guide arrow points to the next task, following doors across areas, with an edge arrow when off screen (toggle in Setup). Three daily tasks per day with an all-done bonus. Banners are queued. Journal tabs: Story, Today, Album, Stats, Setup.
- **2026-09-17 (friends and fish)** — Villager friendship: talking once a day and one gift a day raise hearts (0 to 5); each villager has loved, liked and disliked gifts (produce or dishes), rewards at 2 and 4 hearts, and loved gifts are revealed by gifting or by hearts. The dialog box shows hearts and a Gift button with a gift picker. Fishing now catches one of 10 species by pond, time of day and rain, with rarity, sizes, first-catch bonuses and harder reeling for rare fish; a catch card shows new species and records. The Journal Album became the Book (Cards, Fish, Dishes, Friends). New chapter "Good neighbours", a daily gift task, two help pages, and shared tests for fish and friends (29 tests).
- **2026-09-18 (shops, ranch, tools)** — Cozy Corner furniture shop in town (12 new pieces, category tabs, real sprite previews, a daily 30% sale); the General Store keeps seeds, books and selling. Rosa's tailor became a card grid with a try-on mannequin (tap to turn), new outfit styles (tee, hoodie, sundress), 6 hats, 4 extras and a daily sale; the wardrobe uses the same view. New animals: ducks (coop), goats and pigs (ranch pens from the Pasture upgrade), a horse (Stable upgrade) you ride outdoors; 3 recipes use their products. Tools: hoe, watering can and sickle upgrade to Copper (row of 3) and Gold (3x3) with a reach preview; seed maker; Tools pocket in the bag. 37 shared tests.
- **2026-09-19 (us two, bug sweep)** — Couple bond (10 levels, daily-capped sources, rewards: picnic blanket, heart headband, couple bench, couple tee, golden rings, up to +10% dish prices). Wrapped gifts for each other at the mailbox with a note and an unwrap reveal. Five camera spots; photos show both of you when together, saved to a Photos page in the Book. Matching outfits bonus. Partner news on login and hugging the partner's resting avatar. Journal Us tab with last-seen. New chapter "Just us two". Bug sweep: automated checks of all areas, doors, NPCs, task guides and every panel; fixed villagers stealing the action from signs and cameras, watering tasks stuck on rainy days (rain now counts), the water daily task with a sprinkler, gift popups stacking, text overflow. 39 shared tests.
- **2026-09-21 (live)** — Imported to Vercel from the repo root and deployed: https://our-journey-client.vercel.app. The GitHub repo is public. Solo mode runs; pairing waits on the Supabase env vars.
- **Next:** create the Supabase project and add the two env vars in Vercel, then test pairing on two phones. 2.0: accounts, server-side rules, Capacitor store builds, cosmetic packs.

## 7. Open questions

1. Confirm R6: online-only with a server-hosted world, no LAN/offline. (Plan assumes yes.)
2. Landscape only, or portrait too? (Plan assumes landscape.)
3. Accounts beyond "device token + invite code", e.g. Google sign-in? (Plan assumes no for v1.)
4. Theme: cosy farm eatery (assumed), street-food cart, fantasy tavern, other?
5. In-game text: English only, or English + Vietnamese?
6. A hosting provider you already use? Otherwise Fly.io or Railway hobby tier is the default.

Once these are answered, or you say "go with the assumptions", the next step is M0: scaffold the monorepo and get a walking pixel character onto a phone screen.
