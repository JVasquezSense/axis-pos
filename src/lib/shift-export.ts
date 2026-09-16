import type { ShiftClose } from "@/store/history.store";
import { aggregateSold } from "@/components/shared/sold-products";
import { PAYMENT_LABEL } from "@/lib/payments";

/**
 * Exportación de un cierre de turno a Excel y PDF.
 *
 * Las librerías (xlsx, jspdf) pesan; se cargan solo al pulsar el botón para
 * no engordar el resto de la app.
 */

const fmtMoney = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function fileStem(shift: ShiftClose): string {
  const day = new Date(shift.ts).toISOString().slice(0, 10);
  return `turno-${shift.number ?? ""}-${day}`.replace("--", "-");
}

function methodLabel(m: string): string {
  return (PAYMENT_LABEL as Record<string, string>)[m] ?? m;
}

/** Filas comunes a los dos formatos. */
function sections(shift: ShiftClose) {
  const summary: [string, string][] = [
    ["Turno", shift.number ? `#${shift.number}` : "—"],
    ["Inicio", shift.startedAt ? fmtDateTime(shift.startedAt) : "—"],
    ["Cierre", fmtDateTime(shift.ts)],
    ["Cerrado por", shift.closedBy || "—"],
    ["Ventas", fmtMoney(shift.sales)],
    ["Transacciones", String(shift.orders)],
    ["Ticket promedio", fmtMoney(shift.avg)],
    ["Propinas", fmtMoney(shift.totalTips)],
    ["Total sin propinas", fmtMoney(shift.sales - shift.totalTips)],
  ];
  const byMethod = Object.entries(shift.byMethod ?? {}).map(([m, v]) => [methodLabel(m), Number(v)] as [string, number]);
  const byWaiter = Object.entries(shift.byWaiter ?? {}).sort(([, a], [, b]) => Number(b) - Number(a)).map(([w, v]) => [w, Number(v)] as [string, number]);
  const products = aggregateSold(shift.records ?? []).map((p) => [p.name, p.quantity, p.total] as [string, number, number]);
  const sales = (shift.records ?? []).map((r) => [
    r.invoiceNumber || String(r.id).slice(-6).toUpperCase(),
    fmtDateTime(r.ts),
    r.saleType + (r.table ? ` · Mesa ${r.table}` : ""),
    r.waiter || "",
    methodLabel(r.method),
    Number(r.tip || 0),
    Number(r.total),
  ] as [string, string, string, string, string, number, number]);
  return { summary, byMethod, byWaiter, products, sales };
}

export async function exportShiftXlsx(shift: ShiftClose, restaurant: string) {
  const XLSX = await import("xlsx");
  const s = sections(shift);
  const wb = XLSX.utils.book_new();

  const resumen = XLSX.utils.aoa_to_sheet([[restaurant], [`Cierre de turno ${shift.number ? `#${shift.number}` : ""}`], [], ...s.summary]);
  resumen["!cols"] = [{ wch: 22 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, resumen, "Resumen");

  const metodo = XLSX.utils.aoa_to_sheet([["Método de pago", "Monto"], ...s.byMethod, ["Total (sin propinas)", shift.sales - shift.totalTips]]);
  metodo["!cols"] = [{ wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, metodo, "Por método");

  const propinas = XLSX.utils.aoa_to_sheet([["Mesero", "Propinas"], ...s.byWaiter, ["Total", shift.totalTips]]);
  propinas["!cols"] = [{ wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, propinas, "Propinas");

  const productos = XLSX.utils.aoa_to_sheet([["Producto", "Unidades", "Ingreso"], ...s.products]);
  productos["!cols"] = [{ wch: 40 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, productos, "Productos");

  const ventas = XLSX.utils.aoa_to_sheet([["Factura", "Fecha", "Tipo", "Mesero", "Método", "Propina", "Total"], ...s.sales]);
  ventas["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ventas, "Ventas");

  XLSX.writeFile(wb, `${fileStem(shift)}.xlsx`);
}

export async function exportShiftPdf(shift: ShiftClose, restaurant: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const s = sections(shift);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const money = (n: number) => fmtMoney(n);

  doc.setFontSize(16);
  doc.text(restaurant, 14, 16);
  doc.setFontSize(12);
  doc.text(`Cierre de turno ${shift.number ? `#${shift.number}` : ""}`, 14, 23);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`${shift.startedAt ? fmtDateTime(shift.startedAt) + "  →  " : ""}${fmtDateTime(shift.ts)}  ·  Cerrado por ${shift.closedBy || "—"}`, 14, 29);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 34,
    head: [["Resumen", ""]],
    body: s.summary.slice(4),
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [226, 60, 47] },
    columnStyles: { 1: { halign: "right" } },
  });

  const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: y1,
    head: [["Método de pago", "Monto"]],
    body: [...s.byMethod.map(([m, v]) => [m, money(v)]), ["Total (sin propinas)", money(shift.sales - shift.totalTips)]],
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 48] },
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 90,
  });
  autoTable(doc, {
    startY: y1,
    margin: { left: 110 },
    head: [["Propinas por mesero", "Monto"]],
    body: [...s.byWaiter.map(([w, v]) => [w, money(v)]), ["Total", money(shift.totalTips)]],
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 48] },
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 86,
  });

  const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: y2,
    head: [["Producto", "Unidades", "Ingreso"]],
    body: s.products.length ? s.products.map(([n, q, t]) => [n, String(q), money(t)]) : [["Sin detalle de productos", "", ""]],
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 48] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });

  const y3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: y3,
    head: [["Factura", "Fecha", "Tipo", "Mesero", "Método", "Propina", "Total"]],
    body: s.sales.map((r) => [r[0], r[1], r[2], r[3], r[4], money(r[5]), money(r[6])]),
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 48] },
    columnStyles: { 5: { halign: "right" }, 6: { halign: "right" } },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Axis POS · ${restaurant} · página ${i} de ${pages}`, 14, 290);
  }
  doc.save(`${fileStem(shift)}.pdf`);
}
