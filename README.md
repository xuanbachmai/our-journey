# Our Journey

Our Journey is a cute pixel-art farm, kitchen and little world for two: **xb** and **qd**.
Version 1.0 is the private couple's version. See [PLAN.md](PLAN.md) for the design and roadmap.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL. On a phone on the same Wi-Fi, open the `Network:` URL and turn the phone sideways.

| Command | What it does |
|---------|--------------|
| `npm test` | Unit tests for the shared rules (growth, customers, animals, rain, orders, love tree) |
| `npm run typecheck` | TypeScript check of the client |
| `npm run build` | Production build into `packages/client/dist` |

Without a backend the game runs in **solo mode**, saved on the device.

## Play together (pairing)

The two of you share one farm through a small hosted backend (Supabase, free tier).

1. Create a project at [supabase.com](https://supabase.com) (free).
2. In the Supabase dashboard open **SQL Editor**, paste the contents of `supabase/schema.sql`, run it once.
3. In **Project Settings → API** copy the *Project URL* and the *anon public* key.
4. In Vercel (Project → Settings → Environment Variables) add:
   - `VITE_SUPABASE_URL` = the project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon key
   Then redeploy. For local play, put the same two lines in `packages/client/.env.local`.
5. Open the game. Tap **New farm**, pick your character, and the title shows a 6-letter code.
   Send the other person the invite link from Journal → Settings → Farm code (it copies
   `.../?join=CODE`), or let them tap **Join a farm** and type the code.

Pairing is sticky: each phone stays attached to the farm until Journal → Settings → *Leave this farm*.
A farm has exactly two seats. *Keep my seat (email)* lets you restore your seat on a new phone.

## How to play

0. **Follow the journey**: the bar at the top shows the next task and a yellow arrow points to where it happens, even in another area. Tap the bar to open the Story: 12 chapters of short checklists with rewards (coins, seeds, furniture, a chef hat, a crown). The Today page has 3 small tasks that change every day, with a bonus for finishing all of them.
1. **Farm**: till, plant, water, harvest. Cheap crops take minutes, premium ones hours. Rain and the sprinkler water for you. Dry soil pauses growth, nothing dies.
2. **Cook** at the outdoor kitchen or inside the restaurant. Each recipe is a chain of mini-games; timing decides the grade C, B, A or S. Reputation and recipe books from the store unlock more.
3. **Sell** three ways: the counter by the road sells while you are away; the **restaurant** has diners who sit and order (serve fast for a tip); the **orders board** in town pays extra for specific requests. Store prices change daily.
4. **Explore**: road east to Maple Town (store, tailor, pet shop), north of town to Whisper Forest (foraging, hidden pond), west to Sunny Ranch (barn, cows, sheep), east of town to Family Lane with both family homes: Nha ba Hanh (qd's family) and Nha ba Thai (xb's family). Every building has an inside. The map lets you travel to discovered places.
5. **Home**: buy furniture, place it with Decorate, raise coziness for better dish prices. The wardrobe holds hats, dyes and hair colours from the tailor.
6. **Animals**: hens at the coop, cows and sheep at the ranch, bees in the garden. Adopt a pet; it follows you and digs up gifts.
7. **Neighbours**: talk to the seven villagers each day and give one gift each. Loved gifts give the most hearts; you discover what each one loves as you go. Hearts 2 and 4 bring rewards (coins, furniture, clothes, a recipe book).
8. **Fishing**: 10 kinds of fish across the farm and forest ponds. Some bite only in daytime, at night or in the rain, and rarer fish fight harder in the reel mini-game. The first of each kind pays a bonus, and size records are kept.
9. **The Book** (Journal): postcards, a fish collection, every recipe with its best grade, and friendship hearts.
10. **Together**: the Love Tree grows on days you both play. Leave notes in the mailbox, answer the daily question, cook a dish together when both online, set special days for fireworks, collect postcards in the Book.

## Controls

| Action | Phone | Computer |
|--------|-------|----------|
| Move | Drag on the left half of the screen | WASD |
| Act | Big round button | SPACE or E |
| Seeds | Tap the hotbar | 1 to 8 |
| Bag (food, seeds, dishes, furniture) | Bag button, top left | B or I |
| Journal / Map / Help | Top-right buttons | J / M / top-right buttons |
| Decorate | Decorate button at home; tap the floor, then Place | Arrow keys move, ENTER places, ESC stops |
| Emotes | Heart button (when your partner is online) | same |

## Personalise

- The mailbox letter: `packages/client/src/config/letter.ts`
- Family names, colours and what each person says to xb or qd: `packages/client/src/config/family.ts`
- Special days (birthdays, anniversary): Journal → Settings → Special days

## Project layout

```
packages/shared/   pure game rules with tests: crops, recipes, animals, furniture, clothing,
                   pets, orders, prices, restaurant, couple features, weather, world simulation
packages/client/   Phaser 3 game
  src/art/         palette, characters (hats, dyes), tiles, objects, icons (all generated in code)
  src/areas/       farm, town, forest, ranch and the interiors, with doors between them
  src/entities/    player character, partner, npcs, diners, animals, pets
  src/scenes/      Boot, Title (pairing), World, Hud (panels), MiniGame
  src/game/        state + save, Supabase net layer, synth audio
  src/ui/          pixel panels and DOM text prompts
supabase/          schema.sql for the backend
```

## Notes for 2.0

Coins are the only currency and every item is earned in game. The public version will add
sign-in, server-side rules, store packaging (Capacitor) and cosmetic-only packs.
