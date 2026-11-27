// =====================================================================
// APP - semua logika layar
// =====================================================================
(function () {
  const U = window.DopaUtil;
  const Store = window.DopaStore;
  const Cloud = window.DopaCloud;
  const MENU = window.DOPA_MENU;
  const CFG = window.DOPA_CONFIG || {};
  const MENU_BY_ID = {};
  MENU.items.forEach((m) => { MENU_BY_ID[m.id] = m; });

  const $ = (id) => document.getElementById(id);
  const el = {
    header: $("header"), btnBack: $("btnBack"), tbTitle: $("tbTitle"), tbSub: $("tbSub"), syncPill: $("syncPill"),
    clockTime: $("clockTime"), clockDate: $("clockDate"),
    totals: $("totals"), totCups: $("totCups"), totRev: $("totRev"), paySum: $("paySum"), rkPay: $("rkPay"),
    viewEvents: $("viewEvents"), viewOrder: $("viewOrder"),
    inpName: $("inpEventName"), inpDate: $("inpEventDate"), btnCreate: $("btnCreate"),
    eventList: $("eventList"), eventEmpty: $("eventEmpty"), accountBox: $("accountBox"),
    closedBanner: $("closedBanner"), btnReopen: $("btnReopen"), menuGrid: $("menuGrid"),
    bottomBar: $("bottomBar"), btnHistory: $("btnHistory"), histBadge: $("histBadge"), btnRekap: $("btnRekap"),
    toast: $("toast"),
    sideList: $("sideList"), sideSummary: $("sideSummary"), chkSideVoided: $("chkSideVoided"), btnSideAll: $("btnSideAll"), btnSideRekap: $("btnSideRekap"),
    modalHistory: $("modalHistory"), histList: $("histList"), histSummary: $("histSummary"), chkVoided: $("chkVoided"),
    modalRekap: $("modalRekap"), rekapEvent: $("rekapEvent"), rkCups: $("rkCups"), rkRev: $("rkRev"), rkMeta: $("rkMeta"),
    rkBody: $("rkBody"), rkFoot: $("rkFoot"), btnPdf: $("btnPdf"), btnClose: $("btnClose"),
    modalLogin: $("modalLogin"), loginForm: $("loginForm"), inpEmail: $("inpEmail"), inpPass: $("inpPass"), loginErr: $("loginErr"), btnLogin: $("btnLogin"),
  };

  let currentId = null; // id event yang sedang dibuka (null = layar daftar event)
  let lastCups = null;
  let lastRev = null;

  // ---------------------------------------------------------------
  // Tinggi header -> variabel CSS (dipakai panel samping & kolom sticky)
  // ---------------------------------------------------------------
  function syncTopHeight() {
    const root = document.documentElement.style;
    root.setProperty("--top-h", el.header.offsetHeight + "px");
    root.setProperty("--bottom-h", el.bottomBar.offsetHeight + "px");
  }
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(syncTopHeight);
    ro.observe(el.header);
    ro.observe(el.bottomBar);
  }
  window.addEventListener("resize", syncTopHeight);
  syncTopHeight();

  // ---------------------------------------------------------------
  // Metode pembayaran aktif (diingat per perangkat). Tiap tap menu dicatat dengan
  // metode yang sedang aktif; bisa diganti per baris di Riwayat.
  // ---------------------------------------------------------------
  const PAY_LABEL = { cash: "Cash", qris: "QRIS" };
  const LS_PAY = "dopa.pay.v1";
  let payMode = "cash";
  try { payMode = localStorage.getItem(LS_PAY) === "qris" ? "qris" : "cash"; } catch (e) {}

  function renderPayToggle() {
    document.body.dataset.paymode = payMode;
    document.querySelectorAll(".pay-btn").forEach((b) => {
      const on = b.dataset.pay === payMode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".pay-btn");
    if (!b) return;
    payMode = b.dataset.pay === "qris" ? "qris" : "cash";
    try { localStorage.setItem(LS_PAY, payMode); } catch (err) {}
    renderPayToggle();
    vibrate(12);
  });
  renderPayToggle();

  // ---------------------------------------------------------------
  // Jam real-time
  // ---------------------------------------------------------------
  function tickClock() {
    const now = new Date();
    el.clockTime.textContent = U.fmtTime(now);
    const d = U.fmtDateShort(now);
    if (el.clockDate.textContent !== d) el.clockDate.textContent = d;
  }
  tickClock();
  setInterval(tickClock, 250);

  // ---------------------------------------------------------------
  // Toast (dengan tombol Batal)
  // ---------------------------------------------------------------
  let toastTimer = null;
  function showToast({ msg, sub, undo, isErr, ms }) {
    clearTimeout(toastTimer);
    el.toast.className = "toast" + (isErr ? " err" : "") + (el.bottomBar.classList.contains("hidden") ? " view-only" : "");
    el.toast.innerHTML = '<div class="t-msg">' + U.esc(msg) + (sub ? "<small>" + U.esc(sub) + "</small>" : "") + "</div>";
    if (undo) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = undo.label || "Batal";
      b.addEventListener("click", () => { hideToast(); undo.fn(); });
      el.toast.appendChild(b);
    }
    toastTimer = setTimeout(hideToast, ms || 4500);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    el.toast.classList.add("hidden");
  }

  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  // ---------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------
  function openModal(m) { m.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  function closeModal(m) {
    m.classList.add("hidden");
    if (document.querySelectorAll(".modal:not(.hidden)").length === 0) document.body.style.overflow = "";
  }
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
    });
  });

  // ---------------------------------------------------------------
  // Indikator sinkron cloud
  // ---------------------------------------------------------------
  function renderSync(s) {
    el.syncPill.className = "pill pill-" + s.code;
    el.syncPill.textContent = s.label;
    el.syncPill.title = s.detail || "";
    renderAccount();
  }
  el.syncPill.addEventListener("click", () => {
    const s = Cloud.getState();
    if (s.code === "signedout") { openLogin(); return; }
    if (s.code === "offline" || s.code === "syncing") {
      Cloud.syncNow();
      showToast({ msg: s.detail || "Mencoba mengirim…", isErr: s.code === "offline", ms: 3500 });
      return;
    }
    showToast({ msg: s.label, sub: s.detail, ms: 3500 });
  });
  Cloud.onState(renderSync);

  function renderAccount() {
    if (!Cloud.enabled) {
      el.accountBox.innerHTML = "Mode lokal: data tersimpan di HP ini. Isi <b>js/config.js</b> untuk menyalakan Supabase.";
    } else if (Cloud.hasSession()) {
      el.accountBox.innerHTML = "Cloud: " + U.esc(Cloud.email()) + ' · <button type="button" id="btnSignOut">Keluar</button>';
      const b = $("btnSignOut");
      if (b) b.addEventListener("click", async () => {
        const pend = Store.pendingCount();
        if (pend && !confirm(pend + " data belum terkirim ke cloud. Tetap keluar?")) return;
        await Cloud.signOut();
      });
    } else {
      el.accountBox.innerHTML = 'Cloud: belum login · <button type="button" id="btnShowLogin">Login</button>';
      const b = $("btnShowLogin");
      if (b) b.addEventListener("click", openLogin);
    }
    el.accountBox.classList.remove("hidden");
  }

  function openLogin() {
    el.loginErr.classList.add("hidden");
    openModal(el.modalLogin);
    setTimeout(() => el.inpEmail.focus(), 50);
  }
  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.btnLogin.disabled = true;
    el.btnLogin.textContent = "Masuk…";
    el.loginErr.classList.add("hidden");
    try {
      await Cloud.signIn(el.inpEmail.value, el.inpPass.value);
      el.inpPass.value = "";
      closeModal(el.modalLogin);
      showToast({ msg: "Login berhasil. Data disinkronkan.", ms: 2500 });
    } catch (err) {
      el.loginErr.textContent = /invalid login/i.test(err.message || "") ? "Email atau password salah." : "Gagal login: " + (err.message || err);
      el.loginErr.classList.remove("hidden");
    } finally {
      el.btnLogin.disabled = false;
      el.btnLogin.textContent = "Masuk";
    }
  });

  // ---------------------------------------------------------------
  // Layar daftar event
  // ---------------------------------------------------------------
  function showEvents() {
    currentId = null;
    Store.setActiveId(null);
    releaseWake();
    hideToast();
    el.viewEvents.classList.remove("hidden");
    el.viewOrder.classList.add("hidden");
    el.totals.classList.add("hidden");
    el.bottomBar.classList.add("hidden");
    el.btnBack.classList.add("hidden");
    el.tbTitle.textContent = "Automasi Pencatatan Event Dopa";
    el.tbTitle.classList.add("wrap");
    el.tbSub.textContent = "Pencatatan order tenant Dopamilk";
    closeModal(el.modalHistory);
    closeModal(el.modalRekap);
    if (!el.inpDate.value) el.inpDate.value = U.todayYMD();
    renderEventList();
    renderAccount();
    window.scrollTo(0, 0);
  }

  function renderEventList() {
    const list = Store.listEvents();
    el.eventEmpty.classList.toggle("hidden", list.length > 0);
    el.eventList.innerHTML = list
      .map((ev) => {
        const s = Store.stats(ev.id);
        const closed = ev.status === "closed";
        return (
          '<li class="ev" data-id="' + ev.id + '">' +
          '<div class="ev-top"><div><div class="ev-name">' + U.esc(ev.name) + '</div>' +
          '<div class="ev-date">' + U.esc(U.fmtDateLong(U.parseYMD(ev.event_date))) + "</div></div>" +
          '<span class="chip' + (closed ? " chip-closed" : "") + '">' + (closed ? "Selesai" : "Berjalan") + "</span></div>" +
          '<div class="ev-nums"><div><b>' + s.cups + "</b><span>cup</span></div><div><b>" + U.rupiah(s.revenue) + "</b><span>omset</span></div></div>" +
          '<div class="ev-actions">' +
          '<button class="btn btn-primary" data-ev="open" type="button">' + (closed ? "Lihat" : "Lanjut catat") + "</button>" +
          '<button class="btn btn-ghost" data-ev="pdf" type="button">PDF</button>' +
          '<button class="btn btn-danger" data-ev="del" type="button" aria-label="Hapus event">Hapus</button>' +
          "</div></li>"
        );
      })
      .join("");
  }

  el.eventList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ev]");
    const li = e.target.closest(".ev");
    if (!li) return;
    const id = li.dataset.id;
    const ev = Store.getEvent(id);
    if (!ev) return;
    const act = btn ? btn.dataset.ev : "open";
    if (act === "open") openEvent(id);
    else if (act === "pdf") downloadPdf(id);
    else if (act === "del") {
      const s = Store.stats(id);
      if (confirm('Hapus event "' + ev.name + '"?\n\nBerisi ' + s.cups + " cup / " + U.rupiah(s.revenue) + ". Event ini akan hilang dari daftar.")) {
        Store.deleteEvent(id);
      }
    }
  });

  el.btnCreate.addEventListener("click", () => {
    const name = el.inpName.value.trim();
    if (!name) {
      el.inpName.focus();
      showToast({ msg: "Isi dulu nama event / tenant-nya.", isErr: true, ms: 2500 });
      return;
    }
    const ev = Store.createEvent({ name, event_date: el.inpDate.value || U.todayYMD() });
    el.inpName.value = "";
    openEvent(ev.id);
  });
  el.inpName.addEventListener("keydown", (e) => { if (e.key === "Enter") el.btnCreate.click(); });

  // ---------------------------------------------------------------
  // Layar order
  // ---------------------------------------------------------------
  function buildMenu() {
    const extra = MENU.LARGE_EXTRA;
    let html = "";
    MENU.groups.forEach((g) => {
      const items = MENU.items.filter((i) => i.group === g.id);
      if (!items.length) return;
      html += '<div class="group-title">' + U.esc(g.title) + "</div><div class=\"grid\">";
      items.forEach((i) => {
        html +=
          '<div class="tile" data-id="' + i.id + '">' +
          '<button type="button" class="tile-main" data-act="add" data-size="R" aria-label="Tambah ' + U.esc(i.name) + ' Regular">' +
          (i.best ? '<span class="best">Best seller</span>' : "") +
          '<span class="tile-count zero" data-count>0</span>' +
          '<img src="' + U.esc(i.img) + '" alt="" draggable="false">' +
          '<span class="tile-name">' + U.esc(i.name) + "</span>" +
          '<span class="tile-price">' + U.rupiah(i.price) + "</span>" +
          '<span class="tile-split" data-split></span>' +
          "</button>" +
          '<div class="tile-actions">' +
          '<button type="button" class="btn-minus" data-act="minus" aria-label="Kurangi ' + U.esc(i.name) + '">&minus;</button>' +
          '<button type="button" class="btn-large" data-act="add" data-size="L" aria-label="Tambah ' + U.esc(i.name) + ' Large">+ Large <small>' + U.rupiah(i.price + extra) + "</small></button>" +
          "</div></div>";
      });
      html += "</div>";
    });
    el.menuGrid.innerHTML = html;
  }

  function openEvent(id) {
    const ev = Store.getEvent(id);
    if (!ev) return;
    currentId = id;
    Store.setActiveId(id);
    lastCups = lastRev = null;
    el.viewEvents.classList.add("hidden");
    el.viewOrder.classList.remove("hidden");
    el.totals.classList.remove("hidden");
    el.bottomBar.classList.remove("hidden");
    el.btnBack.classList.remove("hidden");
    el.tbTitle.textContent = ev.name;
    el.tbTitle.classList.remove("wrap");
    el.tbSub.textContent = U.fmtDateShort(U.parseYMD(ev.event_date));
    buildMenu();
    updateOrderView();
    requestWake();
    window.scrollTo(0, 0);
  }

  el.btnBack.addEventListener("click", showEvents);

  function isClosed() {
    const ev = currentId && Store.getEvent(currentId);
    return !ev || ev.status === "closed";
  }

  function updateOrderView() {
    if (!currentId) return;
    const ev = Store.getEvent(currentId);
    if (!ev || ev.deleted) { showEvents(); return; }
    const s = Store.stats(currentId);

    el.tbTitle.textContent = ev.name;
    // total (animasi kecil kalau berubah)
    el.totCups.textContent = s.cups;
    el.totRev.textContent = U.rupiah(s.revenue);
    if (lastCups !== null && lastCups !== s.cups) bump(el.totCups.parentNode);
    if (lastRev !== null && lastRev !== s.revenue) bump(el.totRev.parentNode);
    lastCups = s.cups;
    lastRev = s.revenue;
    el.paySum.innerHTML =
      '<span class="ps">Cash ' + U.rupiah(s.byPay.cash.revenue) + '</span>' +
      '<span class="ps">QRIS ' + U.rupiah(s.byPay.qris.revenue) + '</span>';

    // angka di tiap tile
    el.menuGrid.querySelectorAll(".tile").forEach((tile) => {
      const m = s.byMenu[tile.dataset.id];
      const cnt = tile.querySelector("[data-count]");
      cnt.textContent = m ? m.cups : 0;
      cnt.classList.toggle("zero", !m);
      tile.querySelector("[data-split]").textContent = m && m.l ? "R " + m.r + " · L " + m.l : "";
    });

    el.histBadge.textContent = s.cups;
    const closed = ev.status === "closed";
    el.closedBanner.classList.toggle("hidden", !closed);
    el.viewOrder.classList.toggle("readonly", closed);

    if (!el.modalHistory.classList.contains("hidden")) renderHistory();
    renderSide();
    if (!el.modalRekap.classList.contains("hidden")) renderRekap();
  }

  function bump(node) {
    node.classList.remove("bump");
    void node.offsetWidth;
    node.classList.add("bump");
  }

  function flashTile(tile) {
    tile.classList.remove("flash");
    void tile.offsetWidth;
    tile.classList.add("flash");
  }

  el.menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || !currentId || isClosed()) return;
    const tile = btn.closest(".tile");
    const menu = MENU_BY_ID[tile.dataset.id];
    if (!menu) return;

    if (btn.dataset.act === "add") {
      const size = btn.dataset.size === "L" ? "L" : "R";
      const it = Store.addItem(currentId, menu, size, payMode);
      flashTile(tile);
      vibrate(18);
      showToast({
        msg: "+1 " + menu.name + (size === "L" ? " (Large)" : "") + " · " + PAY_LABEL[payMode],
        sub: U.fmtTime(it.created_at) + " · " + U.rupiah(it.price),
        undo: { label: "Batal", fn: () => { Store.voidItem(it.id); vibrate(30); } },
      });
      if (Store.saveFailed()) showToast({ msg: "Penyimpanan HP penuh! Segera unduh PDF / sambungkan cloud.", isErr: true, ms: 8000 });
    } else if (btn.dataset.act === "minus") {
      const it = Store.voidLastOf(currentId, menu.id);
      if (it) {
        vibrate(30);
        showToast({
          msg: "−1 " + menu.name + (it.size === "L" ? " (Large)" : ""),
          sub: "Pesanan jam " + U.fmtTime(it.created_at) + " dibatalkan",
          undo: { label: "Kembalikan", fn: () => Store.restoreItem(it.id) },
        });
      } else {
        showToast({ msg: menu.name + " belum ada pesanan.", ms: 2000 });
      }
    }
  });

  el.btnReopen.addEventListener("click", () => {
    if (currentId) Store.updateEvent(currentId, { status: "active" });
  });

  // ---------------------------------------------------------------
  // Riwayat
  // ---------------------------------------------------------------
  // Dipakai dua tempat: popup "Riwayat" (HP/tablet) dan panel samping (laptop)
  function renderHistoryInto(listEl, summaryEl, showVoided, limit) {
    const all = Store.itemsOf(currentId);
    const warn = CFG.DOUBLE_TAP_WARN_SECONDS || 3;
    const closed = isClosed();

    let prev = null;
    const rows = all.map((it, idx) => {
      let dup = false;
      if (!it.voided) {
        if (prev && prev.menu_id === it.menu_id && prev.size === it.size &&
            (Date.parse(it.created_at) - Date.parse(prev.created_at)) / 1000 <= warn) dup = true;
        prev = it;
      }
      return { it, no: idx + 1, dup };
    });

    const s = Store.stats(currentId);
    summaryEl.textContent = s.cups + " cup aktif" + (s.voidedCount ? " · " + s.voidedCount + " dibatalkan" : "");

    let view = rows.filter((r) => showVoided || !r.it.voided).reverse();
    const total = view.length;
    if (limit && view.length > limit) view = view.slice(0, limit);
    if (!view.length) {
      listEl.innerHTML = '<li class="muted center" style="padding:18px">Belum ada pencatatan.</li>';
      return;
    }
    listEl.innerHTML = view
      .map(({ it, no, dup }) => {
        const act = closed ? "" : it.voided
          ? '<button type="button" class="h-btn restore" data-h="restore" data-id="' + it.id + '">Pulihkan</button>'
          : '<button type="button" class="h-btn" data-h="void" data-id="' + it.id + '">Hapus</button>';
        const pk = Store.payOf(it);
        const chip = closed || it.voided
          ? '<span class="pay-chip ' + pk + '">' + PAY_LABEL[pk] + "</span>"
          : '<button type="button" class="pay-chip ' + pk + '" data-h="pay" data-id="' + it.id + '" aria-label="Ganti metode pembayaran">' + PAY_LABEL[pk] + "</button>";
        return (
          '<li class="h-row' + (it.voided ? " voided" : "") + (dup ? " dup" : "") + '">' +
          '<div><span class="h-no">#' + no + '</span><span class="h-time">' + U.fmtTime(it.created_at) + "</span></div>" +
          '<div class="h-info"><b>' + U.esc(it.menu_name) + "</b><small>" + (it.size === "L" ? "Large" : "Regular") + ' · <span class="nw">' + U.rupiah(it.price) + "</span>" +
          (it.voided ? " · batal " + (it.voided_at ? U.fmtTime(it.voided_at) : "") : "") + "</small>" +
          '<div class="h-tags">' + chip + (dup ? '<span class="h-warn">⚠ mirip dobel</span>' : "") + "</div></div>" +
          act + "</li>"
        );
      })
      .join("") +
      (limit && total > limit ? '<li class="muted center" style="padding:10px">Menampilkan ' + limit + " terbaru dari " + total + ". Klik “Semua riwayat” untuk lengkapnya.</li>" : "");
  }

  function renderHistory() {
    renderHistoryInto(el.histList, el.histSummary, el.chkVoided.checked);
  }

  // Panel samping hanya digambar saat layar cukup lebar (hemat tenaga HP)
  const wideMQ = window.matchMedia("(min-width: 1024px)");
  function renderSide() {
    if (!currentId || !wideMQ.matches) return;
    renderHistoryInto(el.sideList, el.sideSummary, el.chkSideVoided.checked, 60);
  }
  if (wideMQ.addEventListener) wideMQ.addEventListener("change", renderSide);
  else if (wideMQ.addListener) wideMQ.addListener(renderSide);

  function histClick(e) {
    const b = e.target.closest("[data-h]");
    if (!b) return;
    if (b.dataset.h === "void") Store.voidItem(b.dataset.id);
    else if (b.dataset.h === "pay") Store.togglePayment(b.dataset.id);
    else Store.restoreItem(b.dataset.id);
  }

  el.btnHistory.addEventListener("click", () => { renderHistory(); openModal(el.modalHistory); });
  el.btnSideAll.addEventListener("click", () => { renderHistory(); openModal(el.modalHistory); });
  el.btnSideRekap.addEventListener("click", () => { renderRekap(); openModal(el.modalRekap); });
  el.chkVoided.addEventListener("change", renderHistory);
  el.chkSideVoided.addEventListener("change", renderSide);
  el.histList.addEventListener("click", histClick);
  el.sideList.addEventListener("click", histClick);

  // ---------------------------------------------------------------
  // Rekap & PDF
  // ---------------------------------------------------------------
  function renderRekap() {
    const ev = Store.getEvent(currentId);
    if (!ev) return;
    const s = Store.stats(currentId);
    el.rekapEvent.textContent = ev.name + " · " + U.fmtDateLong(U.parseYMD(ev.event_date));
    el.rkCups.textContent = s.cups;
    el.rkRev.textContent = U.rupiah(s.revenue);
    el.rkPay.innerHTML = ["cash", "qris"].map((k) =>
      '<div class="rk-pay ' + k + '"><span>' + PAY_LABEL[k].toUpperCase() + "</span><b>" + U.rupiah(s.byPay[k].revenue) + "</b><small>" + s.byPay[k].cups + " cup</small></div>"
    ).join("");
    el.rkMeta.textContent = s.first
      ? "Order pertama " + U.fmtTime(s.first) + " · terakhir " + U.fmtTime(s.last) + " · Regular " + s.regular + " / Large " + s.large
      : "Belum ada pesanan.";
    const rows = Object.values(s.byMenu).sort((a, b) => b.cups - a.cups || a.name.localeCompare(b.name));
    el.rkBody.innerHTML = rows.length
      ? rows.map((m) => "<tr><td>" + U.esc(m.name) + "</td><td>" + m.r + "</td><td>" + m.l + "</td><td><b>" + m.cups + "</b></td><td>" + U.rupiah(m.revenue) + "</td></tr>").join("")
      : '<tr><td colspan="5" class="muted" style="text-align:center;padding:14px">Belum ada penjualan</td></tr>';
    el.rkFoot.innerHTML = rows.length
      ? "<tr><td>TOTAL</td><td>" + s.regular + "</td><td>" + s.large + "</td><td>" + s.cups + "</td><td>" + U.rupiah(s.revenue) + "</td></tr>"
      : "";
    el.btnClose.classList.toggle("hidden", ev.status === "closed");
  }

  el.btnRekap.addEventListener("click", () => { renderRekap(); openModal(el.modalRekap); });
  el.btnPdf.addEventListener("click", () => downloadPdf(currentId));
  el.btnClose.addEventListener("click", () => {
    const s = Store.stats(currentId);
    if (!confirm("Akhiri event ini?\n\n" + s.cups + " cup · " + U.rupiah(s.revenue) + "\n\nEvent bisa dibuka lagi kapan saja.")) return;
    Store.updateEvent(currentId, { status: "closed" });
    closeModal(el.modalRekap);
    showEvents();
    showToast({ msg: "Event ditutup. Total " + s.cups + " cup · " + U.rupiah(s.revenue), ms: 5000 });
  });

  function downloadPdf(id) {
    const ev = Store.getEvent(id);
    if (!ev) return;
    try {
      const name = window.DopaPDF.download(ev, Store.itemsOf(id), Store.stats(id));
      showToast({ msg: "PDF diunduh", sub: name, ms: 4000 });
    } catch (err) {
      console.error(err);
      showToast({ msg: "Gagal membuat PDF: " + (err.message || err), isErr: true, ms: 7000 });
    }
  }

  // ---------------------------------------------------------------
  // Layar tetap menyala saat mencatat (kalau browser mendukung)
  // ---------------------------------------------------------------
  let wake = null;
  async function requestWake() {
    try {
      if ("wakeLock" in navigator && currentId && document.visibilityState === "visible" && !wake) {
        wake = await navigator.wakeLock.request("screen");
        wake.addEventListener("release", () => { wake = null; });
      }
    } catch (e) { wake = null; }
  }
  function releaseWake() {
    try { if (wake) wake.release(); } catch (e) {}
    wake = null;
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") requestWake(); });

  // ---------------------------------------------------------------
  // Reaksi terhadap perubahan data (termasuk dari HP kasir lain)
  // ---------------------------------------------------------------
  Store.onChange(() => {
    if (currentId) updateOrderView();
    else renderEventList();
  });

  // ---------------------------------------------------------------
  // Mulai
  // ---------------------------------------------------------------
  el.inpDate.value = U.todayYMD();
  renderSync(Cloud.getState());

  const resume = Store.getActiveId();
  if (resume && Store.getEvent(resume) && !Store.getEvent(resume).deleted) openEvent(resume);
  else showEvents();

  Cloud.init().then(() => {
    if (Cloud.enabled && !Cloud.hasSession() && navigator.onLine) openLogin();
  });

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
