# Running Our Journey

Everything you can do as the person who owns the game: accounts, the farm,
the save, the database, and gift codes.

## Accounts — there aren't any, and that is on purpose

There is no sign-up, no password, no username. **The six-letter farm code is
the account.** One of you taps *New farm* and gets a code; the other taps
*Join a farm* and types it. Each of you then takes a seat, xb or qd, and a seat
can only be taken once — the second player sees the first one greyed out.

Email is optional and does one job: it ties your seat to you so a new phone can
pick it up again. *Journal → Setup → Keep my seat (email)* sends a magic link;
following it records your user id against your seat. Without it, the save lives
on the phone, and losing the phone means losing the seat (though not the farm —
see *Reset partner seat*).

Everything an owner can do is in **Journal → Setup**:

| | what it does |
|---|---|
| Farm code | shows the code, to read out to the other player |
| Keep my seat (email) | magic link so another phone can restore this seat |
| Reset partner seat | frees the *other* seat — use it if they lose their phone |
| Leave this farm | gives up your own seat; the farm and its contents stay |
| Erase this phone | wipes the local save, notes and pairing. The farm stays online |
| Redeem a code | see below |

## The world

One row in the `worlds` table per farm: the whole game state as JSON, a
`version` number, and the two seats. Both clients hold a copy, simulate it
independently, and the one with the higher `changeCounter` wins — so an action
taken on either phone reaches the other within a few seconds.

Nothing stops while nobody is playing: crops grow, animals produce, the counter
sells, machines finish, hired help does the morning round. All of it is caught
up by replaying the clock when a client next opens, which is why the maths lives
in `packages/shared` and is tested there.

## Gameplay

There is no admin console inside the game, by design — it is a two-person
world and a cheat menu would spoil it. If you want to give yourselves
something, use a **gift code**; that is what they are for.

## Gift codes

A code is a string you type into *Journal → Setup → Redeem a code*. One farm
can spend a given code once. The game shows a message above the loot, so a code
can be a present with a note on it.

**Making one.** Codes are written in the Supabase SQL editor, never from the
game:

```sql
insert into public.gift_codes (code, reward, message, uses_left) values
  ('HAPPYBIRTHDAY',
   '{"coins": 5000, "costume": "starlight", "bond": 200}'::jsonb,
   'Happy birthday. Wear it for me. — xb',
   1);
```

**What a reward may contain** (every field optional — see `Reward` in
`packages/shared/src/rewards.ts`):

| field | example | note |
|---|---|---|
| `coins` | `5000` | capped at a million |
| `reputation` | `10` | capped at 100 total |
| `items` | `{"seed:tomato": 10, "egg": 3}` | any item id |
| `clothing` | `["hat:crown", "accessory:necklace"]` | `kind:id` |
| `costume` | `"starlight"` | hands over all five pieces |
| `furniture` | `{"lovebench": 1}` | |
| `machines` | `{"mill": 1}` | up to three of each |
| `bond` | `200` | straight onto the couple bond |

Anything it does not recognise is skipped rather than breaking the code, so a
code written for a later version still gives what it can.

**Why a player cannot cheat it.** The game only ever holds the anon key, and
anything that key can read, a player can list. So `gift_codes` has *no* read
policy — selecting it from the game returns zero rows. Redeeming goes through
`redeem_gift()`, a `security definer` function that can see the table although
its caller cannot, and which refuses an unknown code with the same answer it
gives a wrong one. A player can spend a code they were told. They cannot go
looking for the ones they were not.

**Keeping track.**

```sql
-- what has been spent, and by whom
select code, farm_code, player, redeemed_at from gift_redemptions order by redeemed_at desc;

-- take one out of circulation
update gift_codes set uses_left = 0 where code = 'HAPPYBIRTHDAY';

-- an expiring one
insert into public.gift_codes (code, reward, message, expires_at) values
  ('VALENTINE', '{"bond": 500}'::jsonb, 'Today only', now() + interval '1 day');
```

## The database

Four tables plus the two for codes, all in `supabase/schema.sql` and
`supabase/gift-codes.sql`. Run those two files once in the SQL editor of a
fresh project and the backend exists.

| table | holds |
|---|---|
| `worlds` | one row per farm: the state, version, seats |
| `notes` | the letters you leave each other |
| `answers` | the daily question |
| `gift_codes` | codes and what they give (invisible to the game) |
| `gift_redemptions` | which farm spent which code |

Day to day you manage it from the Supabase dashboard — Table editor to look,
SQL editor to change. Useful ones:

```sql
-- every farm and whether both seats are taken
select code, created_at, seats, jsonb_extract_path_text(state, 'coins') as coins from worlds;

-- hand-edit a single farm's coins (the clients will pick it up)
update worlds
set state = jsonb_set(state, '{coins}', '9999'::jsonb),
    version = version + 1
where code = 'ABC123';

-- start a farm over without deleting the pairing
-- (easier from the game: Settings → Erase this phone)

-- delete a farm and everything attached to it
delete from worlds where code = 'ABC123';   -- notes, answers, redemptions cascade
```

A caution on hand-editing `state`: both clients keep their own copy and the
higher `changeCounter` wins, so bump `version` *and* `changeCounter` or an open
client may overwrite your edit with what it had. Doing it while nobody is
playing avoids the question.

The project sleeps if nothing touches it for a week; `api/keepalive.js` runs on
a Vercel cron each morning to prevent that.

## Where things live

| | |
|---|---|
| rules, prices, growth, rewards | `packages/shared/src` — pure, tested |
| the game itself | `packages/client/src` |
| backend schema | `supabase/*.sql` |
| hosting | Vercel, from `main` |
