// =====================================================================
// PDF - laporan penjualan event (dibuat di HP/laptop, tanpa server)
// Isi: info event, total cup & omset, rekap per menu, rincian jam per pencatatan.
// =====================================================================
(function () {
  const U = window.DopaUtil;
  const BLUE = [30, 77, 161];
  const ORANGE = [247, 162, 27];
  const CREAM = [250, 243, 234];
  const GREY = [140, 140, 140];

  function build(event, items, stats) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("Library PDF belum termuat (js/vendor/jspdf.umd.min.js).");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const M = 14;
    const brand = (window.DOPA_CONFIG && window.DOPA_CONFIG.BRAND) || "Dopamilk";

    // ----- Header -----
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, W, 34, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(0, 34, W, 1.6, "F");
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(brand.toUpperCase(), M, 17);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Laporan Penjualan Event", M, 25);

    // ----- Info event -----
    let y = 46;
    const infoRows = [
      ["Event / Tenant", event.name],
      ["Tanggal event", U.fmtDateLong(U.parseYMD(event.event_date))],
      ["Order pertama", stats.first ? U.fmtTime(stats.first) : "-"],
      ["Order terakhir", stats.last ? U.fmtTime(stats.last) : "-"],
      ["Laporan dibuat", U.fmtDateLong(new Date()) + ", " + U.fmtTime(new Date())],
    ];
    doc.setFontSize(10);
    infoRows.forEach(([k, v]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREY);
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(String(v), W - M - 56);
      doc.text(lines, M + 40, y);
      y += 6 * lines.length;
    });

    // ----- Kotak ringkasan -----
    y += 3;
    const bw = (W - 2 * M - 8) / 3;
    const boxes = [
      ["TOTAL CUP", String(stats.cups)],
      ["TOTAL OMSET", U.rupiah(stats.revenue)],
      ["REGULAR / LARGE", stats.regular + " / " + stats.large],
    ];
    boxes.forEach(([label, val], i) => {
      const x = M + i * (bw + 4);
      doc.setFillColor(...(i === 1 ? BLUE : CREAM));
      doc.setDrawColor(...BLUE);
      doc.roundedRect(x, y, bw, 22, 3, 3, i === 1 ? "F" : "FD");
      doc.setTextColor(...(i === 1 ? [255, 255, 255] : BLUE));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(label, x + bw / 2, y + 7, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(i === 1 ? 14 : 17);
      doc.text(val, x + bw / 2, y + 16.5, { align: "center" });
    });
    y += 30;

    // ----- Rekap per menu -----
    const menuRows = Object.values(stats.byMenu).sort((a, b) => b.cups - a.cups || a.name.localeCompare(b.name));
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rekap per menu", M, y);
    doc.autoTable({
      startY: y + 3,
      margin: { left: M, right: M },
      head: [["Menu", "Regular", "Large", "Total cup", "Omset"]],
      body: menuRows.length
        ? menuRows.map((m) => [m.name, m.r, m.l, m.cups, U.rupiah(m.revenue)])
        : [[{ content: "Belum ada penjualan", colSpan: 5, styles: { halign: "center", textColor: GREY } }]],
      foot: menuRows.length ? [[
        "TOTAL",
        { content: String(stats.regular), styles: { halign: "center" } },
        { content: String(stats.large), styles: { halign: "center" } },
        { content: String(stats.cups), styles: { halign: "center" } },
        { content: U.rupiah(stats.revenue), styles: { halign: "right" } },
      ]] : undefined,
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 2.2, lineColor: [220, 214, 204], lineWidth: 0.2 },
      headStyles: { fillColor: BLUE, textColor: 255, halign: "center" },
      footStyles: { fillColor: ORANGE, textColor: [30, 30, 30], fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "right" } },
      showFoot: "lastPage",
    });

    // ----- Rincian pencatatan -----
    const warn = (window.DOPA_CONFIG && window.DOPA_CONFIG.DOUBLE_TAP_WARN_SECONDS) || 3;
    let prevActive = null;
    const logRows = items.map((it, idx) => {
      let status = "OK";
      if (it.voided) {
        status = "BATAL " + (it.voided_at ? U.fmtTime(it.voided_at) : "");
      } else {
        if (prevActive && prevActive.menu_id === it.menu_id && prevActive.size === it.size &&
            (Date.parse(it.created_at) - Date.parse(prevActive.created_at)) / 1000 <= warn) {
          status = "OK (cek: mirip dobel)";
        }
        prevActive = it;
      }
      return [idx + 1, U.fmtTime(it.created_at), it.menu_name, it.size === "L" ? "Large" : "Regular", U.rupiah(it.price), status];
    });

    const afterY = doc.lastAutoTable.finalY + 10;
    const needNewPage = afterY > doc.internal.pageSize.getHeight() - 40;
    if (needNewPage) doc.addPage();
    const startY = needNewPage ? 20 : afterY;
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rincian pencatatan (urut jam)", M, startY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("Jam dicatat otomatis saat menu di-tap. Baris BATAL tidak dihitung ke total.", M, startY + 5);

    doc.autoTable({
      startY: startY + 8,
      margin: { left: M, right: M, bottom: 18 },
      head: [["No", "Jam", "Menu", "Ukuran", "Harga", "Status"]],
      body: logRows.length ? logRows : [[{ content: "Belum ada pencatatan", colSpan: 6, styles: { halign: "center", textColor: GREY } }]],
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: BLUE, textColor: 255 },
      alternateRowStyles: { fillColor: [252, 249, 244] },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 1: { cellWidth: 22, fontStyle: "bold" }, 3: { cellWidth: 20 }, 4: { halign: "right", cellWidth: 26 }, 5: { cellWidth: 38 } },
      didParseCell: (d) => {
        if (d.section === "head" && d.column.index === 4) d.cell.styles.halign = "right";
        if (d.section === "body" && d.row.raw && String(d.row.raw[5] || "").startsWith("BATAL")) {
          d.cell.styles.textColor = [170, 170, 170];
          d.cell.styles.fontStyle = "italic";
        }
      },
    });

    // ----- Footer tiap halaman -----
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      const H = doc.internal.pageSize.getHeight();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text(brand + " Event POS  |  " + event.name, M, H - 8);
      doc.text("Halaman " + p + " / " + pages, W - M, H - 8, { align: "right" });
    }
    return doc;
  }

  function filename(event) {
    return "Laporan_" + U.slug(event.name) + "_" + String(event.event_date) + ".pdf";
  }

  function download(event, items, stats) {
    const doc = build(event, items, stats);
    doc.save(filename(event));
    return filename(event);
  }

  window.DopaPDF = { build, download, filename };
})();
