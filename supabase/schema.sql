-- =====================================================================
-- DOPAMILK EVENT POS - schema Supabase
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste semua > Run
-- Aman dijalankan ulang (pakai "if not exists" / "drop policy if exists").
-- =====================================================================

-- 1) Tabel event (satu baris = satu kali tenant di sebuah event)
create table if not exists public.events (
  id          uuid primary key,
  name        text        not null,
  event_date  date        not null,
  status      text        not null default 'active' check (status in ('active', 'closed')),
  deleted     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) Tabel pesanan (satu baris = satu cup yang di-tap). Tidak pernah dihapus
--    permanen: kalau dibatalkan, voided = true, jadi jejak jamnya tetap ada.
create table if not exists public.order_items (
  id          uuid primary key,
  event_id    uuid        not null references public.events(id) on delete cascade,
  menu_id     text        not null,
  menu_name   text        not null,
  size        text        not null check (size in ('R', 'L')),
  price       integer     not null check (price >= 0),
  payment     text        not null default 'cash' check (payment in ('cash', 'qris')),
  created_at  timestamptz not null default now(),
  voided      boolean     not null default false,
  voided_at   timestamptz,
  updated_at  timestamptz not null default now()
);

-- 2a) Untuk database yang SUDAH dibuat sebelum ada fitur pembayaran:
--     menambahkan kolom payment (aman dijalankan berulang; data lama jadi 'cash').
alter table public.order_items
  add column if not exists payment text not null default 'cash' check (payment in ('cash', 'qris'));

create index if not exists order_items_event_idx on public.order_items (event_id, created_at);
create index if not exists events_created_idx    on public.events (created_at desc);

-- 2b) updated_at selalu diisi jam SERVER (bukan jam HP) supaya sinkron antar-HP
--     tidak kacau kalau jam salah satu HP meleset.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_set_updated      on public.events;
drop trigger if exists order_items_set_updated on public.order_items;

create trigger events_set_updated
  before insert or update on public.events
  for each row execute function public.set_updated_at();

create trigger order_items_set_updated
  before insert or update on public.order_items
  for each row execute function public.set_updated_at();

-- 3) Keamanan (RLS): hanya user yang sudah LOGIN yang boleh baca/tulis.
--    Anon key yang kelihatan di GitHub jadi tidak bisa dipakai orang asing.
alter table public.events      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "events_all_authenticated"      on public.events;
drop policy if exists "order_items_all_authenticated" on public.order_items;

create policy "events_all_authenticated" on public.events
  for all to authenticated using (true) with check (true);

create policy "order_items_all_authenticated" on public.order_items
  for all to authenticated using (true) with check (true);

-- 3b) Izin akses Data API: hanya user yang sudah login (bukan anon / orang asing).
--     Ini wajib kalau saat membuat project opsi "Grant API access to new tables
--     automatically" tidak dicentang; kalau dicentang pun tetap aman.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.events      to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
revoke all on public.events      from anon;
revoke all on public.order_items from anon;

-- 4) Realtime: supaya kalau 2 HP kasir dipakai bareng, angkanya muncul di keduanya.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;
