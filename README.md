# Our Journey

Our Journey is a cute pixel-art farm-and-kitchen game for two: **xb** and **qd**. See [PLAN.md](PLAN.md) for the full design and roadmap.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL. On a phone on the same Wi-Fi, open the `Network:` URL Vite prints
(for example `http://192.168.1.20:5174`) and turn the phone sideways.

Other scripts:

| Command | What it does |
|---------|--------------|
| `npm test` | Unit tests for the growth, customer and egg simulation (shared package) |
| `npm run typecheck` | TypeScript check of the client |
| `npm run build` | Production build into `packages/client/dist` |

## How to play

1. **Farm**: till a plot, plant a seed from the hotbar, water it, harvest when it sparkles.
2. **Cook** at the outdoor kitchen next to the house. Each recipe is 3 to 4 mini-games
   (chop, stir, flip, season, heat, plate). Your timing sets the dish grade: C, B, A or S.
3. **Sell** by putting dishes on the display counter by the road. Villagers walk up and buy
   them, and they keep buying while the game is closed.
4. **Grow**: reputation rises with every sale and unlocks recipes. Spend coins at the market
   on seeds and upgrades: fishing rod, chicken coop and hens, sprinkler, extra counter slots,
   a better stove, flower beds.
5. **Extras**: fish in the pond (wait for the "!"), collect eggs at the coop, follow the quest
   ticker in the top right, open the journal for quests, stats and sound settings.

## Controls

| Action | Phone | Computer |
|--------|-------|----------|
| Move | Hold and drag on the left half of the screen | WASD |
| Act (till / plant / water / harvest / cook / counter / fish / eggs / shop / mail) | Big round button, bottom right | SPACE or E |
| Pick seed | Tap a seed packet in the hotbar | 1 to 4 |
| Journal | Menu button, top right | J |
| Mini-games | Tap, hold or drag as the hint says | SPACE, ENTER, mouse |
| Move the other character (local test only) | not available | Arrow keys, ENTER to act |

## Personalise the letter

The mailbox next to the house holds a letter on the first visit.
Edit the lines in `packages/client/src/config/letter.ts`.

## Where things live

```
packages/shared/   pure game rules: crops, growth, recipes, upgrades, quests,
                   and the world simulation (customers, eggs) with unit tests
packages/client/   Phaser 3 game
  src/art/         palette, character pixel maps, tiles, objects, icons (all generated in code)
  src/cook/        the mini-games
  src/scenes/      Boot, Title, Farm, Hud, MiniGame
  src/game/        local save + state wrapper, world generation, synth audio
  src/entities/    player character, customers, chickens
```

## Current status

Milestones M0, M1, M2 and most of M4/M5 from the plan are done: the full single-device
loop of farming, cooking, selling, upgrades, quests and an economy that runs while you are away.
Everything is saved in the browser for now. The server-hosted shared world (M3) is the next
step, which is what lets xb and qd play the same farm from two phones.

Demo speeds: crops ripen in 40 to 90 seconds of watered time, a watering lasts 90 seconds,
hens lay an egg every 3 minutes, and customers arrive about every two minutes at zero
reputation (faster as it grows). These will be much slower once the server exists.
