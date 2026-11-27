// =====================================================================
// CLOUD - sinkron ke Supabase di belakang layar.
// Prinsip: aplikasi TIDAK PERNAH menunggu cloud. Semua data ditulis ke HP dulu
// (store.js), lalu dikirim saat ada sinyal. Kalau offline, antre dan terkirim otomatis.
// =====================================================================
(function () {
  const cfg = window.DOPA_CONFIG || {};
  const Store = window.DopaStore;
  const LS_LASTPULL = "dopa.lastpull.v1";
  const LS_EVERLOGIN = "dopa.everlogin.v1";
  const PAGE = 1000;
  const CHUNK = 200;

  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);
  let sb = null;
  let session = null;
  let pushing = false;
  let pulling = false;
  let lastError = null;
  let pushTimer = null;
  let channel = null;
  const subs = new Set();

  // ---------- status untuk indikator di layar ----------
  function getState() {
    const pending = Store.pendingCount();
    if (!enabled) return { code: "local", label: "Mode lokal", pending, detail: "Supabase belum diisi di js/config.js — data hanya tersimpan di HP ini." };
    if (!session) return { code: "signedout", label: "Login cloud", pending, detail: "Ketuk untuk login agar data masuk ke Supabase." };
    if (pending === 0 && !lastError) return { code: "synced", label: "Tersimpan di cloud", pending, detail: session.user && session.user.email };
    if (lastError || !navigator.onLine) {
      return { code: "offline", label: pending ? "Offline · " + pending + " belum terkirim" : "Offline", pending, detail: lastError ? String(lastError.message || lastError) : "Tidak ada sinyal. Data aman di HP dan terkirim otomatis nanti." };
    }
    return { code: "syncing", label: "Mengirim… (" + pending + ")", pending, detail: "" };
  }

  function notify() {
    const s = getState();
    subs.forEach((fn) => { try { fn(s); } catch (e) { console.error(e); } });
  }

  // ---------- login ----------
  async function init() {
    if (!enabled) { notify(); return; }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    sb.auth.onAuthStateChange((event, s) => {
      const had = !!session;
      session = s || null;
      if (session) localStorageSet(LS_EVERLOGIN, "1");
      if (session && !had) afterLogin();
      if (!session && had) { stopRealtime(); }
      notify();
    });
    try {
      const { data } = await sb.auth.getSession();
      session = data && data.session ? data.session : null;
    } catch (e) {
      session = null;
    }
    if (session) { localStorageSet(LS_EVERLOGIN, "1"); afterLogin(); }
    notify();
  }

  function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function localStorageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  async function signIn(email, password) {
    if (!sb) throw new Error("Supabase belum dikonfigurasi.");
    const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw error;
    session = data.session;
    localStorageSet(LS_EVERLOGIN, "1");
    notify();
    return session;
  }

  async function signOut() {
    if (!sb) return;
    stopRealtime();
    await sb.auth.signOut();
    session = null;
    notify();
  }

  function afterLogin() {
    startRealtime();
    syncNow();
  }

  // ---------- kirim (push) ----------
  const strip = (row) => { const r = Object.assign({}, row); delete r._dirty; return r; };

  async function pushKind(kind, table, rows) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const part = rows.slice(i, i + CHUNK);
      const snapshot = part.map((r) => ({ id: r.id, updated_at: r.updated_at }));
      const { data, error } = await sb.from(table).upsert(part.map(strip), { onConflict: "id" }).select();
      if (error) throw error;
      Store.applyPushResult(kind, snapshot, data || []);
    }
  }

  async function push() {
    if (!sb || !session || pushing) return;
    pushing = true;
    try {
      const { events, items } = Store.unsynced();
      if (events.length) await pushKind("event", "events", events);
      if (items.length) await pushKind("item", "order_items", items);
      lastError = null;
    } catch (e) {
      lastError = e;
    } finally {
      pushing = false;
      notify();
    }
    // ada perubahan baru selama pengiriman? kirim lagi
    if (!lastError && Store.pendingCount() > 0) schedulePush(400);
  }

  function schedulePush(delay) {
    if (!enabled) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, delay == null ? 300 : delay);
  }

  // ---------- ambil (pull) - hanya yang berubah sejak terakhir ----------
  async function pullTable(kind, table, since) {
    let from = 0;
    let maxSeen = null;
    for (;;) {
      const { data, error } = await sb.from(table).select("*").gt("updated_at", since).order("updated_at", { ascending: true }).range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || !data.length) break;
      Store.mergeRemoteMany(kind, data);
      maxSeen = data[data.length - 1].updated_at;
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return maxSeen;
  }

  async function pull() {
    if (!sb || !session || pulling) return;
    pulling = true;
    try {
      const since = localStorageGet(LS_LASTPULL) || "1970-01-01T00:00:00Z";
      const a = await pullTable("event", "events", since);
      const b = await pullTable("item", "order_items", since);
      const seen = [a, b].filter(Boolean).sort().pop();
      if (seen) {
        // mundur 5 detik sebagai pengaman
        localStorageSet(LS_LASTPULL, new Date(Date.parse(seen) - 5000).toISOString());
      }
      lastError = null;
    } catch (e) {
      lastError = e;
    } finally {
      pulling = false;
      notify();
    }
  }

  async function syncNow() {
    if (!enabled) return;
    if (!sb || !session) { notify(); return; }
    await push();
    await pull();
    await push();
  }

  // ---------- realtime (HP kasir lain langsung kelihatan) ----------
  function startRealtime() {
    if (!sb || channel) return;
    channel = sb
      .channel("dopa-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, (p) => p.new && p.new.id && Store.mergeRemote("item", p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (p) => p.new && p.new.id && Store.mergeRemote("event", p.new))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") pull(); // kejar yang terlewat saat koneksi putus
      });
  }

  function stopRealtime() {
    if (sb && channel) { try { sb.removeChannel(channel); } catch (e) {} }
    channel = null;
  }

  // ---------- pemicu otomatis ----------
  if (enabled) {
    window.addEventListener("online", () => { notify(); syncNow(); });
    window.addEventListener("offline", notify);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
    setInterval(() => { if (session && navigator.onLine && (Store.pendingCount() > 0 || lastError)) syncNow(); }, 20000);
    Store.onChange(() => { schedulePush(); notify(); });
  } else {
    Store.onChange(notify);
  }

  window.DopaCloud = {
    enabled,
    init,
    signIn,
    signOut,
    syncNow,
    getState,
    hasSession: () => !!session,
    everLoggedIn: () => localStorageGet(LS_EVERLOGIN) === "1",
    email: () => (session && session.user && session.user.email) || "",
    onState: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
})();
