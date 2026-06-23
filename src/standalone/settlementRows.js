import { hasDeliveryProof } from "./deliveryProof.js";
import { isOrderCancelled } from "./refunds.js";
import { applyStoredSettlementStatus } from "./settlementStatus.js";

function defaultAssignedRiderLabel(order) {
  return order.riderName || (order.deliveryPartnerName ? "담당 기사 확인 중" : "배정 대기");
}

function settlementRowTools(options = {}) {
  return {
    assignedRiderLabel: options.assignedRiderLabel || defaultAssignedRiderLabel,
    matchesSettlementPeriod: options.matchesSettlementPeriod || (() => true),
    settlementPayout: options.settlementPayout || ((deliveryFee) => deliveryFee || 0),
  };
}

function settlementDateTimeLabel(value, fallback) {
  return value ? new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : fallback;
}

export function deliverySettlementRows(orders, options = {}) {
  const tools = settlementRowTools(options);
  const rows = [];
  orders.map(applyStoredSettlementStatus)
    .filter((order) => (
      !isOrderCancelled(order) &&
      (order.progressStep || 0) >= 4 &&
      hasDeliveryProof(order, "arrival") &&
      order.settlementStatus !== "paid" &&
      order.settlementStatus !== "held" &&
      tools.matchesSettlementPeriod(order, "open")
    ))
    .forEach((order) => {
      const partnerName = order.deliveryPartnerName || "미배정";
      const riderName = tools.assignedRiderLabel(order);
      let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName);
      if (!row) {
        row = { partnerName, riderName, count: 0, pendingCount: 0, confirmedCount: 0, feeTotal: 0, payout: 0, orderIds: [] };
        rows.push(row);
      }
      row.count += 1;
      row.orderIds.push(order.id);
      if (order.settlementStatus === "confirmed") row.confirmedCount += 1;
      else row.pendingCount += 1;
      row.feeTotal += order.deliveryFee || 0;
      row.payout += tools.settlementPayout(order.deliveryFee || 0, partnerName, riderName);
    });
  return rows.sort((a, b) => b.payout - a.payout || a.partnerName.localeCompare(b.partnerName));
}

export function paidSettlementRows(orders, options = {}) {
  const tools = settlementRowTools(options);
  const rows = [];
  orders.map(applyStoredSettlementStatus)
    .filter((order) => !isOrderCancelled(order) && order.settlementStatus === "paid" && tools.matchesSettlementPeriod(order, "paid"))
    .forEach((order) => {
      const partnerName = order.deliveryPartnerName || "미배정";
      const riderName = tools.assignedRiderLabel(order);
      const paidDate = settlementDateTimeLabel(order.settlementPaidAt, "지급일 미기록");
      let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName && item.paidDate === paidDate);
      if (!row) {
        row = { partnerName, riderName, paidDate, count: 0, feeTotal: 0, payout: 0 };
        rows.push(row);
      }
      row.count += 1;
      row.feeTotal += order.deliveryFee || 0;
      row.payout += tools.settlementPayout(order.deliveryFee || 0, partnerName, riderName);
    });
  return rows.sort((a, b) => b.paidDate.localeCompare(a.paidDate));
}

export function heldSettlementRows(orders, options = {}) {
  const tools = settlementRowTools(options);
  const rows = [];
  orders.map(applyStoredSettlementStatus)
    .filter((order) => !isOrderCancelled(order) && order.settlementStatus === "held" && tools.matchesSettlementPeriod(order, "held"))
    .forEach((order) => {
      const partnerName = order.deliveryPartnerName || "미배정";
      const riderName = tools.assignedRiderLabel(order);
      const reason = order.settlementHoldReason || "사유 미입력";
      const heldDate = settlementDateTimeLabel(order.settlementHeldAt, "보류일 미기록");
      let row = rows.find((item) => item.partnerName === partnerName && item.riderName === riderName && item.reason === reason);
      if (!row) {
        row = { partnerName, riderName, reason, heldDate, count: 0, feeTotal: 0, payout: 0 };
        rows.push(row);
      }
      row.count += 1;
      row.feeTotal += order.deliveryFee || 0;
      row.payout += tools.settlementPayout(order.deliveryFee || 0, partnerName, riderName);
    });
  return rows.sort((a, b) => b.heldDate.localeCompare(a.heldDate) || b.payout - a.payout);
}
