-- Gift codes. Run this once in the Supabase SQL editor, after schema.sql.
--
-- The point of the shape below: the game holds only the anon key, so anything
-- the anon role can SELECT, a player can list. Codes therefore have NO anon
-- policy at all — the table is invisible to the game. Redeeming goes through
-- redeem_gift(), a security-definer function, which can see the table even
-- though its caller cannot. A player can spend a code they were told; they
-- cannot go fishing for the ones they were not.

create table if not exists public.gift_codes (
  code text primary key,
  -- what it hands over; see Reward in packages/shared/src/rewards.ts
  reward jsonb not null,
  -- shown above the loot, e.g. "Happy birthday, love xb"
  message text,
  -- how many farms may still redeem it; null means no limit
  uses_left int,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_redemptions (
  code text not null references public.gift_codes(code) on delete cascade,
  farm_code text not null references public.worlds(code) on delete cascade,
  player text not null check (player in ('xb', 'qd')),
  redeemed_at timestamptz not null default now(),
  -- one farm, one go: the other player cannot spend the same code again
  primary key (code, farm_code)
);

alter table public.gift_codes enable row level security;
alter table public.gift_redemptions enable row level security;
-- deliberately no policies: only the function below reaches these tables

/**
 * Spend a code for a farm. Returns, as jsonb, either
 *   { ok: true, reward: {...}, message: text }
 * or { ok: false, why: 'unknown' | 'expired' | 'used up' | 'already' }.
 * Never says whether an unknown code exists, so the result cannot be used to
 * probe for valid codes.
 */
create or replace function public.redeem_gift(p_code text, p_farm text, p_player text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.gift_codes%rowtype;
begin
  p_code := upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  if p_code = '' or p_player not in ('xb', 'qd') then
    return jsonb_build_object('ok', false, 'why', 'unknown');
  end if;

  select * into g from public.gift_codes where code = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'why', 'unknown');
  end if;
  if g.expires_at is not null and g.expires_at < now() then
    return jsonb_build_object('ok', false, 'why', 'expired');
  end if;
  if g.uses_left is not null and g.uses_left <= 0 then
    return jsonb_build_object('ok', false, 'why', 'used up');
  end if;
  if not exists (select 1 from public.worlds where code = p_farm) then
    return jsonb_build_object('ok', false, 'why', 'unknown');
  end if;

  begin
    insert into public.gift_redemptions (code, farm_code, player)
    values (p_code, p_farm, p_player);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'why', 'already');
  end;

  if g.uses_left is not null then
    update public.gift_codes set uses_left = uses_left - 1 where code = p_code;
  end if;

  return jsonb_build_object('ok', true, 'reward', g.reward, 'message', g.message);
end;
$$;

revoke all on function public.redeem_gift(text, text, text) from public;
grant execute on function public.redeem_gift(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- writing codes
-- Codes are made here, in the SQL editor, never from the game.
--
-- insert into public.gift_codes (code, reward, message, uses_left) values
--   ('HAPPYBIRTHDAY',
--    '{"coins": 5000, "costume": "starlight", "bond": 200}'::jsonb,
--    'Happy birthday. Wear it for me. — xb',
--    1);
--
-- A starter hand for a new farm, good for both of you, no expiry:
--   ('WELCOME', '{"coins": 500, "items": {"seed:tomato": 10}}'::jsonb, 'A little something to start with', 2);
--
-- What has been spent:
--   select r.code, r.farm_code, r.player, r.redeemed_at from gift_redemptions r order by redeemed_at desc;
--
-- Take a code out of circulation:
--   update gift_codes set uses_left = 0 where code = 'HAPPYBIRTHDAY';
