// Service worker: bikin aplikasi tetap bisa dibuka walau tidak ada sinyal di lokasi event.
// Strategi: tampilkan dari cache dulu (cepat), perbarui cache di belakang layar.
// Catatan: setelah kamu deploy versi baru, perubahan muncul pada pembukaan KEDUA.
const CACHE = "dopa-pos-v3";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "css/style.css",
  "js/config.js", "js/menu.js", "js/util.js", "js/store.js", "js/cloud.js", "js/pdf.js", "js/app.js",
  "js/vendor/jspdf.umd.min.js", "js/vendor/jspdf.plugin.autotable.min.js", "js/vendor/supabase.js",
  "img/icon-192.png", "img/icon-512.png",
  "img/matcha-soft.jpg", "img/matcha-mild.jpg", "img/red-velvet.jpg", "img/taro-frost.jpg", "img/palm-sugar.jpg",
  "img/mango-mood.jpg", "img/grape-joy.jpg", "img/strawberry-crush.jpg", "img/green-glee.jpg", "img/lychee-lush.jpg",
  "img/coco-delight.jpg", "img/orange-splash.jpg", "img/guava-bliss.jpg", "img/milky-orange.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, Google Fonts: biarkan lewat jaringan biasa
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || (req.mode === "navigate" ? caches.match("index.html") : undefined));
      return cached || net;
    })
  );
});
