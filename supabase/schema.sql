-- Our Journey 1.0 backend. Run this once in the Supabase SQL editor.
-- The 6-letter farm code is the secret that scopes everything; there are no user
-- accounts required. Version 2.0 will move the rules server-side and add real auth.

create table if not exists public.worlds (
  code text primary key,
  state jsonb not null,
  version bigint not null default 1,
  seats jsonb not null default '{"xb": null, "qd": null}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id bigserial primary key,
  code text not null references public.worlds(code) on delete cascade,
  from_player text not null check (from_player in ('xb', 'qd')),
  to_player text not null check (to_player in ('xb', 'qd')),
  body text not null check (char_length(body) <= 500),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notes_code_idx on public.notes(code, created_at desc);

create table if not exists public.answers (
  code text not null references public.worlds(code) on delete cascade,
  day text not null,
  player text not null check (player in ('xb', 'qd')),
  answer text not null check (char_length(answer) <= 300),
  created_at timestamptz not null default now(),
  primary key (code, day, player)
);

-- Row level security: anyone holding the anon key may read/write rows they know the code of.
alter table public.worlds enable row level security;
alter table public.notes enable row level security;
alter table public.answers enable row level security;

drop policy if exists "worlds anon" on public.worlds;
create policy "worlds anon" on public.worlds for all to anon, authenticated using (true) with check (true);
drop policy if exists "notes anon" on public.notes;
create policy "notes anon" on public.notes for all to anon, authenticated using (true) with check (true);
drop policy if exists "answers anon" on public.answers;
create policy "answers anon" on public.answers for all to anon, authenticated using (true) with check (true);

-- Realtime for new notes
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notes') then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
