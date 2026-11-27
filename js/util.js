// Fungsi kecil yang dipakai di banyak tempat
(function () {
  const pad2 = (n) => String(n).padStart(2, "0");

  const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const DAYS_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  function toDate(x) {
    return x instanceof Date ? x : new Date(x);
  }

  // "14:32:07" (jam lokal perangkat, 24 jam)
  function fmtTime(x) {
    const d = toDate(x);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }

  // "Jum, 27 Nov 2026"
  function fmtDateShort(x) {
    const d = toDate(x);
    return DAYS_SHORT[d.getDay()] + ", " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear();
  }

  // "Jumat, 27 November 2026"
  function fmtDateLong(x) {
    const d = toDate(x);
    return DAYS_LONG[d.getDay()] + ", " + d.getDate() + " " + MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
  }

  // "2026-11-27" -> Date lokal tengah hari (hindari geser zona waktu)
  function parseYMD(ymd) {
    const [y, m, d] = String(ymd).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  }

  function todayYMD() {
    const d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  // 18000 -> "Rp 18.000"
  function rupiah(n) {
    const v = Math.round(Number(n) || 0);
    const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (v < 0 ? "-" : "") + "Rp " + s;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  const nowISO = () => new Date().toISOString();

  // nama file aman: "Bazar UII Fest!" -> "Bazar_UII_Fest"
  function slug(s) {
    return String(s || "event").trim().replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "event";
  }

  window.DopaUtil = { pad2, fmtTime, fmtDateShort, fmtDateLong, parseYMD, todayYMD, rupiah, esc, uid, nowISO, slug };
})();
