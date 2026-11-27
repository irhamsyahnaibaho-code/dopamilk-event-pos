-- =====================================================================
-- MIGRASI: menambah pilihan pembayaran (Cash / QRIS)
-- Jalankan SEKALI di Supabase > SQL Editor > New query > Run.
-- Pesanan lama otomatis dianggap 'cash'. Aman dijalankan berulang.
-- =====================================================================
alter table public.order_items
  add column if not exists payment text not null default 'cash' check (payment in ('cash', 'qris'));
