// =====================================================================
// MENU & HARGA - ubah di sini kalau ada menu baru / harga promo event.
// price  = harga Regular (rupiah)
// Large  = price + LARGE_EXTRA
// group  = pengelompokan tampilan di layar
// img    = thumbnail di folder img/
// =====================================================================
window.DOPA_MENU = {
  LARGE_EXTRA: 2000,
  groups: [
    { id: "creamy",    title: "Creamy" },
    { id: "coffee",    title: "Coffee" },
    { id: "signature", title: "Signature" },
  ],
  items: [
    // --- Creamy ---
    { id: "matcha-soft",  name: "Matcha Fusion Soft", short: "Matcha Soft", group: "creamy", price: 15000, img: "img/matcha-soft.jpg" },
    { id: "matcha-mild",  name: "Matcha Fusion Mild", short: "Matcha Mild", group: "creamy", price: 18000, img: "img/matcha-mild.jpg" },
    { id: "red-velvet",   name: "Red Velvet",         short: "Red Velvet",  group: "creamy", price: 18000, img: "img/red-velvet.jpg" },
    { id: "taro-frost",   name: "Taro Frost",         short: "Taro Frost",  group: "creamy", price: 18000, img: "img/taro-frost.jpg" },
    // --- Coffee ---
    { id: "palm-sugar",   name: "Palm Sugar Latte",   short: "Palm Sugar",  group: "coffee", price: 18000, img: "img/palm-sugar.jpg" },
    // --- Signature (Regular 10k / Large 12k) ---
    { id: "mango-mood",       name: "Mango Mood",       short: "Mango Mood",       group: "signature", price: 10000, img: "img/mango-mood.jpg",       best: true },
    { id: "grape-joy",        name: "Grape Joy",        short: "Grape Joy",        group: "signature", price: 10000, img: "img/grape-joy.jpg",        best: true },
    { id: "strawberry-crush", name: "Strawberry Crush", short: "Strawberry Crush", group: "signature", price: 10000, img: "img/strawberry-crush.jpg", best: true },
    { id: "green-glee",       name: "Green Glee",       short: "Green Glee",       group: "signature", price: 10000, img: "img/green-glee.jpg" },
    { id: "lychee-lush",      name: "Lychee Lush",      short: "Lychee Lush",      group: "signature", price: 10000, img: "img/lychee-lush.jpg" },
    { id: "coco-delight",     name: "Coco Delight",     short: "Coco Delight",     group: "signature", price: 10000, img: "img/coco-delight.jpg" },
    { id: "orange-splash",    name: "Orange Splash",    short: "Orange Splash",    group: "signature", price: 10000, img: "img/orange-splash.jpg" },
    { id: "guava-bliss",      name: "Guava Bliss",      short: "Guava Bliss",      group: "signature", price: 10000, img: "img/guava-bliss.jpg" },
    { id: "milky-orange",     name: "Milky Orange",     short: "Milky Orange",     group: "signature", price: 10000, img: "img/milky-orange.jpg" },
  ],
};
