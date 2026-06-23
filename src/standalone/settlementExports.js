import { hasDeliveryProof } from "./deliveryProof.js";
import { isOrderCancelled } from "./refunds.js";
import {
  applyStoredSettlementStatus,
  settlementStatusLabel,
} from "./settlementStatus.js";

export function settlementExportModeLabel(mode) {
  if (mode === "closed") return "마감완료";
  if (mode === "open") return "정산예정";
  if (mode === "paid") return "지급완료";
  if (mode === "held") return "보류";
  return "전체";
}

export function csvCell(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function settlementExportOrders(sourceOrders, mode = "all", options = {}) {
  const matchesSettlementPeriod = options.matchesSettlementPeriod || (() => true);
  return sourceOrders.map(applyStoredSettlementStatus).filter((order) => {
    if (isOrderCancelled(order) || (order.progressStep || 0) < 4 || !hasDeliveryProof(order, "arrival")) return false;
    if (mode === "open") return order.settlementStatus !== "paid" && order.settlementStatus !== "held" && matchesSettlementPeriod(order, "open");
    if (mode === "paid") return order.settlementStatus === "paid" && matchesSettlementPeriod(order, "paid");
    if (mode === "held") return order.settlementStatus === "held" && matchesSettlementPeriod(order, "held");
    if (mode === "closed") return !!order.settlementClosedAt && matchesSettlementPeriod(order, "paid");
    return matchesSettlementPeriod(order, order.settlementStatus === "paid" ? "paid" : order.settlementStatus === "held" ? "held" : "open");
  });
}

export function settlementClosableOrders(sourceOrders, options = {}) {
  return settlementExportOrders(sourceOrders, "paid", options).filter((order) => !order.settlementClosedAt);
}

export function settlementCsvRows(orders, mode = "all", options = {}) {
  const assignedRiderLabel = options.assignedRiderLabel || ((order) => order.riderName || (order.deliveryPartnerName ? "담당 기사 확인 중" : "배정 대기"));
  const currentCustomerName = options.currentCustomerName || "";
  const orderDisplayLabel = options.orderDisplayLabel || (() => "");
  const riderSettlementRate = options.riderSettlementRate || (() => 0);
  const settlementPayout = options.settlementPayout || ((deliveryFee) => deliveryFee || 0);
  const settlementPeriodLabel = options.settlementPeriodLabel || (() => "전체");
  const settlementTimeLabel = options.settlementTimeLabel || ((value) => value || "미처리");

  return orders.map((order) => {
    const partnerName = order.deliveryPartnerName || "미배정";
    const riderName = assignedRiderLabel(order);
    const rate = riderSettlementRate(partnerName, riderName);
    const payout = settlementPayout(order.deliveryFee || 0, partnerName, riderName);
    const stores = order.items.map((item) => item.showroom).filter((store, index, list) => store && list.indexOf(store) === index).join(" / ");
    const productsText = order.items.map((item) => item.name + " " + (item.size || "One size") + " x" + (item.quantity || 1)).join(" / ");
    return [
      settlementExportModeLabel(mode),
      order.id,
      partnerName,
      riderName,
      orderDisplayLabel(order),
      settlementStatusLabel(order),
      settlementPeriodLabel(),
      settlementTimeLabel(order.arrivalConfirmedAt),
      settlementTimeLabel(order.settlementConfirmedAt),
      order.settlementConfirmedBy || "",
      settlementTimeLabel(order.settlementPaidAt),
      settlementTimeLabel(order.settlementHeldAt),
      order.settlementHoldReason || "",
      settlementTimeLabel(order.settlementClosedAt),
      order.settlementClosedBy || "",
      order.settlementCloseLabel || "",
      order.deliveryFee || 0,
      rate + "%",
      payout,
      stores,
      order.address || order.region || "",
      order.customerName || currentCustomerName,
      productsText,
    ];
  });
}

export function settlementCsvText(orders, mode = "all", options = {}) {
  const headers = ["구분", "주문번호", "배송사", "기사", "주문상태", "정산상태", "기간필터", "도착인증일", "정산확정일", "정산확정자", "지급완료일", "보류일", "보류사유", "마감일", "마감자", "마감명", "배송비", "정산율", "지급액", "픽업지/매장", "도착지", "고객", "상품"];
  const rows = settlementCsvRows(orders, mode, options);
  const totals = rows.reduce((sum, row) => {
    sum.fee += Number(row[16]) || 0;
    sum.payout += Number(row[18]) || 0;
    return sum;
  }, { fee: 0, payout: 0 });
  const periodLabel = (options.settlementPeriodLabel || (() => "전체"))();
  const footer = ["합계", orders.length + "건", "", "", "", "", periodLabel, "", "", "", "", "", "", "", "", "", totals.fee, "", totals.payout, "", "", "", ""];
  return [headers, ...rows, footer].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function settlementStatementRows(orders, options = {}) {
  const assignedRiderLabel = options.assignedRiderLabel || ((order) => order.riderName || (order.deliveryPartnerName ? "담당 기사 확인 중" : "배정 대기"));
  const settlementPayout = options.settlementPayout || ((deliveryFee) => deliveryFee || 0);
  const rows = [];
  orders.forEach((order) => {
    const partnerName = order.deliveryPartnerName || "미배정";
    const riderName = assignedRiderLabel(order);
    let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName);
    if (!row) {
      row = { partnerName, riderName, count: 0, open: 0, confirmed: 0, paid: 0, held: 0, closed: 0, feeTotal: 0, payout: 0 };
      rows.push(row);
    }
    row.count += 1;
    if (order.settlementStatus === "paid") row.paid += 1;
    else if (order.settlementStatus === "held") row.held += 1;
    else if (order.settlementStatus === "confirmed") row.confirmed += 1;
    else row.open += 1;
    if (order.settlementClosedAt) row.closed += 1;
    row.feeTotal += order.deliveryFee || 0;
    row.payout += settlementPayout(order.deliveryFee || 0, partnerName, riderName);
  });
  return rows.sort((a, b) => a.partnerName.localeCompare(b.partnerName) || a.riderName.localeCompare(b.riderName));
}

export function settlementStatementTotals(rows) {
  return rows.reduce((sum, row) => {
    sum.count += row.count;
    sum.open += row.open;
    sum.confirmed += row.confirmed;
    sum.paid += row.paid;
    sum.held += row.held;
    sum.closed += row.closed;
    sum.feeTotal += row.feeTotal;
    sum.payout += row.payout;
    return sum;
  }, { count: 0, open: 0, confirmed: 0, paid: 0, held: 0, closed: 0, feeTotal: 0, payout: 0 });
}
