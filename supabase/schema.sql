-- JomiJachai land register · PostgreSQL schema for Supabase
-- Run once in Supabase → SQL Editor → New query → paste this file → Run.
-- Safe to run again: it only creates what is missing and replaces the functions.
-- All data is fictional demo data; the app fills it in on first start.

-- ---------- Tables ----------
create table if not exists people (
  id         text primary key,
  bn         text not null,               -- name in Bangla
  en         text not null,               -- name in English
  created_at timestamptz not null default now()
);

create table if not exists plots (
  id   text primary key,                  -- dag key, e.g. '245'
  data jsonb not null                     -- dag, mouza, JL, khatian, total decimals, land class, flags
);

-- Share register: how many decimals each owner still holds in each dag (exact fraction as text, e.g. '1/3').
create table if not exists shares (
  plot   text not null references plots(id),
  person text not null references people(id),
  share  text not null,
  primary key (plot, person)
);

create table if not exists deeds (
  no          text primary key,           -- e.g. '2026-0147'
  plot        text not null references plots(id),
  seller      text not null references people(id),
  buyer       text not null references people(id),
  decimals    text not null,
  date        text not null,              -- YYYY-MM-DD, kept as text so the fingerprint stays exact
  officer     text not null,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now()
);

-- Append-only activity log; each line stores the previous line's hash (a hash chain).
create table if not exists activity_log (
  seq        integer primary key,
  time       text not null,               -- ISO time as written by the app (part of the hash)
  actor      text not null,
  kind       text not null,
  result     text not null,
  plot       text,
  deed       text,
  text       jsonb,
  prev       text not null,
  hash       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- Land services records. kind is one of:
--   tax (land tax paid up to), notice (advance acquisition notice), erosion (river erosion case),
--   khas (khas land settlement), borga (sharecropping agreement), card (Krishak Card).
-- Records can change (e.g. a tax payment or the next erosion step); every change is also a line in activity_log.
create table if not exists records (
  kind text not null check (kind in ('tax', 'notice', 'erosion', 'khas', 'borga', 'card')),
  id   text not null,
  data jsonb not null,
  primary key (kind, id)
);

-- ---------- Integrity enforced by the database ----------
-- Deeds and log lines can be added, never edited or deleted.
create or replace function forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only: rows can be added, never edited or deleted', tg_table_name;
end $$;

drop trigger if exists deeds_append_only on deeds;
create trigger deeds_append_only before update or delete on deeds
  for each row execute function forbid_change();

drop trigger if exists activity_log_append_only on activity_log;
create trigger activity_log_append_only before update or delete on activity_log
  for each row execute function forbid_change();

-- Each new log line must come right after the last one and point at its hash.
create or replace function check_log_chain() returns trigger
language plpgsql as $$
declare
  last_row record;
begin
  select seq, hash into last_row from activity_log order by seq desc limit 1;
  if last_row is null then
    if new.seq <> 1 or new.prev <> repeat('0', 64) then
      raise exception 'log chain: the first line must be number 1 with an all-zero previous hash';
    end if;
  elsif new.seq <> last_row.seq + 1 or new.prev <> last_row.hash then
    raise exception 'log chain broken: line % must follow line % and point at its hash', new.seq, last_row.seq;
  end if;
  return new;
end $$;

drop trigger if exists activity_log_chain on activity_log;
create trigger activity_log_chain before insert on activity_log
  for each row execute function check_log_chain();

-- "Reset demo" button. TRUNCATE skips the row triggers above, so only this function can clear the log.
create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  truncate activity_log, deeds, shares, records, people, plots, settings;
end $$;

-- ---------- Access (sample-data level: anyone with the public key) ----------
-- Anyone with the app can read the register and add to it. Nobody can edit or delete deeds or log lines.
-- For real use: officer accounts (Supabase Auth) and the eight checks moved into a database function.
alter table people       enable row level security;
alter table plots        enable row level security;
alter table shares       enable row level security;
alter table deeds        enable row level security;
alter table activity_log enable row level security;
alter table settings     enable row level security;
alter table records      enable row level security;

drop policy if exists "read register" on people;       create policy "read register" on people       for select using (true);
drop policy if exists "read register" on plots;        create policy "read register" on plots        for select using (true);
drop policy if exists "read register" on shares;       create policy "read register" on shares       for select using (true);
drop policy if exists "read register" on deeds;        create policy "read register" on deeds        for select using (true);
drop policy if exists "read register" on activity_log; create policy "read register" on activity_log for select using (true);
drop policy if exists "read register" on settings;     create policy "read register" on settings     for select using (true);

drop policy if exists "add people" on people;          create policy "add people" on people          for insert with check (true);
drop policy if exists "add plots" on plots;            create policy "add plots" on plots            for insert with check (true);
drop policy if exists "add deeds" on deeds;            create policy "add deeds" on deeds            for insert with check (true);
drop policy if exists "add log lines" on activity_log; create policy "add log lines" on activity_log for insert with check (true);
drop policy if exists "add shares" on shares;          create policy "add shares" on shares          for insert with check (true);
drop policy if exists "change shares" on shares;       create policy "change shares" on shares       for update using (true) with check (true);
drop policy if exists "remove shares" on shares;       create policy "remove shares" on shares       for delete using (true);
drop policy if exists "add settings" on settings;      create policy "add settings" on settings      for insert with check (true);
drop policy if exists "change settings" on settings;   create policy "change settings" on settings   for update using (true) with check (true);
drop policy if exists "read register" on records;      create policy "read register" on records      for select using (true);
drop policy if exists "add records" on records;        create policy "add records" on records        for insert with check (true);
drop policy if exists "change records" on records;     create policy "change records" on records     for update using (true) with check (true);

-- ---------- Live updates (phone sees new deeds without a refresh) ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table people, plots, shares, deeds, activity_log, settings;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table records;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
