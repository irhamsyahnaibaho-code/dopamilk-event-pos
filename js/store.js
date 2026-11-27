// =====================================================================
// STORE - penyimpanan lokal (localStorage). SEMUA aksi tulis ke sini dulu,
// jadi tap menu selalu instan walau sinyal jelek. Cloud (cloud.js) yang
// mengirim data ke Supabase di belakang layar.
//
// _dirty = true  -> belum terkirim ke cloud
// voided = true  -> pesanan dibatalkan (tidak dihitung, tapi jejaknya tetap ada)
// =====================================================================
(function () {
  const U = window.DopaUtil;
  const K = { events: "dopa.events.v1", items: "dopa.items.v1", active: "dopa.active.v1" };

  function load(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  let events = load(K.events);
  let items = load(K.items);
  const listeners = new Set();
  let saveFailed = false;

  function persist() {
    try {
      localStorage.setItem(K.events, JSON.stringify(events));
      localStorage.setItem(K.items, JSON.stringify(items));
      saveFailed = false;
    } catch (e) {
      saveFailed = true; // penyimpanan penuh / diblokir; data tetap ada di memori
    }
  }

  function emit(kind) {
    listeners.forEach((fn) => {
      try { fn(kind); } catch (e) { console.error(e); }
    });
  }

  function commit(kind) {
    persist();
    emit(kind);
  }

  const t = (x) => Date.parse(x) || 0;

  // ---------- Event ----------
  function listEvents() {
    return events
      .filter((e) => !e.deleted)
      .sort((a, b) => t(b.created_at) - t(a.created_at));
  }

  function getEvent(id) {
    return events.find((e) => e.id === id) || null;
  }

  function createEvent({ name, event_date }) {
    const now = U.nowISO();
    const ev = {
      id: U.uid(),
      name: String(name || "").trim() || "Event tanpa nama",
      event_date: event_date || U.todayYMD(),
      status: "active",
      deleted: false,
      created_at: now,
      updated_at: now,
      _dirty: true,
    };
    events.push(ev);
    commit("event");
    return ev;
  }

  function updateEvent(id, patch) {
    const ev = getEvent(id);
    if (!ev) return null;
    Object.assign(ev, patch, { updated_at: U.nowISO(), _dirty: true });
    commit("event");
    return ev;
  }

  const deleteEvent = (id) => updateEvent(id, { deleted: true });

  // ---------- Pesanan ----------
  function itemsOf(eventId) {
    return items
      .filter((i) => i.event_id === eventId)
      .sort((a, b) => t(a.created_at) - t(b.created_at) || (a.id < b.id ? -1 : 1));
  }

  // metode pembayaran: "cash" | "qris" (data lama tanpa kolom ini dianggap cash)
  const payOf = (it) => (it && it.payment === "qris" ? "qris" : "cash");

  // menu: objek dari DOPA_MENU.items ; size: "R" | "L" ; payment: "cash" | "qris"
  function addItem(eventId, menu, size, payment) {
    const extra = size === "L" ? window.DOPA_MENU.LARGE_EXTRA : 0;
    const now = U.nowISO();
    const it = {
      id: U.uid(),
      event_id: eventId,
      menu_id: menu.id,
      menu_name: menu.name,
      size: size === "L" ? "L" : "R",
      price: menu.price + extra,
      payment: payment === "qris" ? "qris" : "cash",
      created_at: now,
      voided: false,
      voided_at: null,
      updated_at: now,
      _dirty: true,
    };
    items.push(it);
    commit("item");
    return it;
  }

  function setVoided(id, voided) {
    const it = items.find((i) => i.id === id);
    if (!it || it.voided === voided) return it || null;
    const now = U.nowISO();
    it.voided = voided;
    it.voided_at = voided ? now : null;
    it.updated_at = now;
    it._dirty = true;
    commit("item");
    return it;
  }

  function setPayment(id, payment) {
    const it = items.find((i) => i.id === id);
    const pay = payment === "qris" ? "qris" : "cash";
    if (!it || payOf(it) === pay) return it || null;
    it.payment = pay;
    it.updated_at = U.nowISO();
    it._dirty = true;
    commit("item");
    return it;
  }

  const togglePayment = (id) => {
    const it = items.find((i) => i.id === id);
    return it ? setPayment(id, payOf(it) === "cash" ? "qris" : "cash") : null;
  };

  const voidItem = (id) => setVoided(id, true);
  const restoreItem = (id) => setVoided(id, false);

  // tombol "−" di tile: batalkan pesanan TERAKHIR dari menu itu
  function voidLastOf(eventId, menuId) {
    const list = itemsOf(eventId).filter((i) => i.menu_id === menuId && !i.voided);
    if (!list.length) return null;
    return voidItem(list[list.length - 1].id);
  }

  // ---------- Statistik ----------
  function stats(eventId) {
    const all = itemsOf(eventId);
    const byMenu = {};
    const byPay = { cash: { cups: 0, revenue: 0 }, qris: { cups: 0, revenue: 0 } };
    let cups = 0, revenue = 0, regular = 0, large = 0, voidedCount = 0;
    let first = null, last = null;
    all.forEach((i) => {
      if (i.voided) { voidedCount++; return; }
      cups++;
      revenue += i.price;
      const pk = payOf(i);
      byPay[pk].cups++;
      byPay[pk].revenue += i.price;
      if (i.size === "L") large++; else regular++;
      if (!first) first = i.created_at;
      last = i.created_at;
      const m = byMenu[i.menu_id] || (byMenu[i.menu_id] = { id: i.menu_id, name: i.menu_name, r: 0, l: 0, cups: 0, revenue: 0 });
      if (i.size === "L") m.l++; else m.r++;
      m.cups++;
      m.revenue += i.price;
    });
    return { cups, revenue, regular, large, voidedCount, first, last, byMenu, byPay, total: all.length };
  }

  // ---------- Dipakai cloud.js ----------
  function unsynced() {
    return { events: events.filter((e) => e._dirty), items: items.filter((i) => i._dirty) };
  }

  const pendingCount = () => events.filter((e) => e._dirty).length + items.filter((i) => i._dirty).length;

  function normalizeRow(row) {
    const r = Object.assign({}, row);
    ["created_at", "updated_at", "voided_at"].forEach((k) => {
      if (r[k]) r[k] = new Date(r[k]).toISOString();
    });
    if (r.event_date) r.event_date = String(r.event_date).slice(0, 10);
    r._dirty = false;
    return r;
  }

  // Gabungkan baris dari cloud. Aturan: perubahan lokal yang belum terkirim SELALU menang;
  // selain itu, ambil yang updated_at-nya lebih baru.
  function mergeRemote(kind, row, silent) {
    const arr = kind === "event" ? events : items;
    const r = normalizeRow(row);
    const i = arr.findIndex((x) => x.id === r.id);
    if (i < 0) {
      arr.push(r);
    } else {
      const l = arr[i];
      if (l._dirty) return false;
      if (t(r.updated_at) <= t(l.updated_at)) return false; // lokal sama/lebih baru
      arr[i] = r;
    }
    if (!silent) commit(kind);
    return true;
  }

  function mergeRemoteMany(kind, rows) {
    let changed = false;
    rows.forEach((r) => { if (mergeRemote(kind, r, true)) changed = true; });
    if (changed) commit(kind);
    return changed;
  }

  // Setelah push sukses: ganti baris lokal dengan versi server, KECUALI user sudah
  // mengubahnya lagi selama pengiriman berlangsung (updated_at lokal berbeda).
  function applyPushResult(kind, pushedSnapshot, serverRows) {
    const arr = kind === "event" ? events : items;
    const byId = {};
    serverRows.forEach((r) => { byId[r.id] = r; });
    pushedSnapshot.forEach((snap) => {
      const i = arr.findIndex((x) => x.id === snap.id);
      if (i < 0) return;
      if (arr[i].updated_at !== snap.updated_at) return; // diubah lagi -> tetap dirty
      arr[i] = byId[snap.id] ? normalizeRow(byId[snap.id]) : Object.assign(arr[i], { _dirty: false });
    });
    commit(kind);
  }

  // ---------- Event aktif (yang terakhir dibuka) ----------
  const getActiveId = () => { try { return localStorage.getItem(K.active) || null; } catch (e) { return null; } };
  const setActiveId = (id) => {
    try { id ? localStorage.setItem(K.active, id) : localStorage.removeItem(K.active); } catch (e) {}
  };

  window.DopaStore = {
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    listEvents, getEvent, createEvent, updateEvent, deleteEvent,
    itemsOf, addItem, voidItem, restoreItem, voidLastOf, stats, payOf, setPayment, togglePayment,
    unsynced, pendingCount, mergeRemote, mergeRemoteMany, applyPushResult,
    getActiveId, setActiveId,
    saveFailed: () => saveFailed,
  };
})();
