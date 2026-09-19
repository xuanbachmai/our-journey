# Our Journey: feature list

A cute pixel farm, kitchen and little world for two players, **xb** and **qd**. Version 1.0.

## Players and the shared world
- Two seats only (xb and qd). Pair with a 6-letter farm code or an invite link; the seat sticks until "Leave this farm". An email magic link restores a seat on a new phone.
- Either player can play alone; the world is shared (wallet, bag, reputation, house) while characters, outfits and pets are personal.
- Live sync of positions, emotes and co-op cooking over Supabase realtime. Solo mode works with no backend (switch between xb and qd on the title screen).
- The world keeps running while nobody plays: crops grow, the counter sells, animals produce, rain waters. A "Welcome back" summary shows what happened.

## Places (13 areas)
- Outdoors: Our Farm, Maple Town, Whisper Forest, Sunny Ranch, Family Lane.
- Indoors: Our Home, Our Restaurant, General Store, Rosa's Tailor, Cozy Corner (furniture), Pet & Barn Shop, Nha ba Hanh (qd's family), Nha ba Thai (xb's family).
- Map with fast travel to discovered places; every building can be entered.

## Farming and tools
- 8 crops, from wheat (2 minutes) to pumpkin (6 hours). Till, plant, water, harvest. Dry soil pauses growth; nothing dies.
- Rain waters the field (and counts for watering tasks); the Sprinkler waters it for you.
- Tools: hoe, watering can and sickle, each Basic (1 tile), Copper (a row of 3) or Gold (3x3), with a reach preview.
- Seed maker: 1 crop into 2 seeds. Seeds at the farm stall and the store; prices change daily.

## Cooking
- 20 recipes, each a chain of mini-games: chop, stir, flip, season, heat, plate. Grades C, B, A, S.
- Reputation and recipe books (Bakery, Seafood) unlock more. Better stove makes timing easier.
- Co-op cooking: both online split the steps of one dish.

## Selling and the economy
- Display counter by the road sells dishes to passers-by, even offline.
- Restaurant: diners sit, order and tip for fast service; more tables and decor as upgrades.
- Town orders board with daily requests that pay extra. Farm stall and store buy produce at daily prices.
- Coziness and the couple bond raise dish prices.

## Animals and the ranch
- Chickens and ducks (coop), bee hives (garden), cows, sheep, goats and pigs (ranch), a horse.
- Products: eggs, duck eggs, milk, goat milk, wool, honey, truffles; cook with them or sell them.
- Build at the pet shop: coop, bigger coop, bee garden, pasture (pig and goat pens, then more room), stable.
- Ride the horse outdoors at 1.7x speed.
- Pets: puppy, kitten or bunny. They follow you, love being petted and dig up gifts.

## Exploring and friends
- Fishing: 10 species by pond, time of day and rain, with rarity, sizes, records and first-catch bonuses; rare fish pull harder.
- Foraging in the forest: mushrooms, berries, herbs.
- 7 villagers with 5 hearts each: talk daily, give one gift a day, learn what they love; rewards at 2 and 4 hearts.
- Family Lane: both families to visit, each with their own lines for xb and qd.

## Home and style
- Cozy Corner: 26 furniture pieces in Living, Bedroom, Decor and Wall, real previews and a daily 30% sale. Place with Decorate; coziness raises dish prices.
- Rosa's Tailor: outfits (overalls, tee, hoodie, sundress), 14 hats, 8 extras, 10 dyes, 9 hair colours, a try-on mannequin and a daily sale. The home wardrobe swaps what you own.

## Just for the two of you
- Bond level (1 to 10) from both playing the same day, notes, the daily question, co-op cooking, hugs, matching outfits, photos and gifts, with daily caps.
- Bond rewards: picnic blanket, heart headbands, couple bench, couple tees, golden rings, and up to +10% dish prices.
- Wrapped gifts for each other at the mailbox, with a note and an unwrap reveal.
- Five camera spots; together, both of you appear in the photo. Photos live in the Book.
- Matching outfits bonus, emotes (wave, heart, hug), "Send love".
- Notes in the mailbox and a daily question whose answers reveal when both answer.
- Love Tree that grows on days you both play; special days with fireworks; postcards for milestones.
- Partner news on login ("qd harvested 12 crops"), hugging your partner's resting avatar, and "last here 2h ago".
- A letter for qd in the mailbox.

## Progression
- The Story: 13 chapters of step-by-step tasks with rewards and a guide arrow that follows doors.
- Today: 3 daily tasks from a pool of 14, with a bonus for finishing all.
- The Book: postcards, photos, fish, dishes and friends. Stats page.

## Look, sound and controls
- All pixel art is drawn in code (characters, outfits, buildings, furniture, animals, icons).
- Chill lo-fi music with a night variant; synth sound effects.
- Phone: drag to move, big act button, bag and menus at the top. PC: WASD, SPACE, 1-8, B, J, M.

## Tech
- TypeScript monorepo: `packages/shared` (pure rules, 44 tests) and `packages/client` (Phaser 3 + Vite).
- Deterministic simulation, so a dormant world catches up in one pass.
- Supabase for pairing, saves, notes and realtime; Vercel for hosting.
