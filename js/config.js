// =====================================================================
// KONFIGURASI - isi dua baris ini dengan data dari Supabase kamu
// Supabase Dashboard > Project Settings > API
//   - Project URL            -> SUPABASE_URL
//   - anon / public key      -> SUPABASE_ANON_KEY
// (anon key memang boleh ada di GitHub, karena data dilindungi login + RLS.
//  JANGAN pernah taruh "service_role" key di sini.)
//
// Kalau dibiarkan kosong, aplikasi tetap jalan dalam MODE LOKAL
// (data tersimpan di HP saja, belum masuk cloud).
// =====================================================================
window.DOPA_CONFIG = {
  SUPABASE_URL: "https://lmanfilexprnrhdxbucn.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_C4pu8ZSQfwRZat_44oI79Q_LCTK78sk",

  // Nama brand yang muncul di aplikasi & PDF
  BRAND: "Dopamilk",

  // Kalau dua tap menu yang sama masuk dalam selang waktu ini (detik),
  // di Riwayat diberi tanda ⚠ "kemungkinan dobel" supaya gampang dicek.
  DOUBLE_TAP_WARN_SECONDS: 3,
};
