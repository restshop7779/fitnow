import { ORDER_STATUS_STORAGE_KEY } from "./config.js";
import {
  isOrderCancelled,
  paymentLabelForOrder,
  refundStatusFromOrder,
} from "./refunds.js";

export function stepFromStatus(status) {
  const stepsByStatus = {
    reserved: 0,
    stock_checked: 1,
    styled: 1,
    pickup: 2,
    arriving: 3,
    delivered: 4,
    cancelled: 0,
  };
  return stepsByStatus[status] || 0;
}

export function statusFromStep(step) {
  if (step >= 4) return "delivered";
  if (step >= 3) return "arriving";
  if (step >= 2) return "pickup";
  if (step >= 1) return "stock_checked";
  return "reserved";
}

export function labelFromStep(step) {
  const labels = ["예약 완료", "재고 확인", "픽업 요청", "배송 중", "배송 완료"];
  return labels[Math.max(0, Math.min(step, labels.length - 1))];
}

export function paymentLabelFromStep(step) {
  return step >= 1 ? "결제 완료" : "결제 대기";
}

export function readOrderStatusStore() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_STATUS_STORAGE_KEY) || "{}");
  } catch (error) {
    localStorage.removeItem(ORDER_STATUS_STORAGE_KEY);
    return {};
  }
}

export function saveOrderStatusOverride(order, options = {}) {
  if (!order || !order.id) return;
  const store = readOrderStatusStore();
  const currentStep = Math.max(0, order.progressStep || 0);
  const savedStep = store[order.id] ? store[order.id].progressStep || 0 : 0;
  if (!options.allowStepBack && !isOrderCancelled(order) && currentStep < savedStep) return;
  store[order.id] = {
    progressStep: currentStep,
    statusCode: isOrderCancelled(order) ? "cancelled" : statusFromStep(currentStep),
    cancelled: isOrderCancelled(order),
    forceStep: !!options.allowStepBack,
    cancelReasonCode: order.cancelReasonCode || "",
    cancelReason: order.cancelReason || "",
    refundStatus: order.refundStatus || "",
    refundRequestedAt: order.refundRequestedAt || "",
    refundMemo: order.refundMemo || "",
    refundHandledBy: order.refundHandledBy || "",
    refundHandledAt: order.refundHandledAt || "",
    stockReserved: !!order.stockReserved,
    stockRestored: !!order.stockRestored,
    deliveryPartnerName: order.deliveryPartnerName || "",
    riderName: order.riderName || "",
    pickupConfirmedAt: order.pickupConfirmedAt || "",
    arrivalConfirmedAt: order.arrivalConfirmedAt || "",
    pickupProofPhoto: order.pickupProofPhoto || null,
    arrivalProofPhoto: order.arrivalProofPhoto || null,
    settlementStatus: order.settlementStatus || "",
    settlementConfirmedAt: order.settlementConfirmedAt || "",
    settlementConfirmedBy: order.settlementConfirmedBy || "",
    settlementPaidAt: order.settlementPaidAt || "",
    settlementHoldReason: order.settlementHoldReason || "",
    settlementHeldAt: order.settlementHeldAt || "",
    settlementReleasedAt: order.settlementReleasedAt || "",
    settlementClosedAt: order.settlementClosedAt || "",
    settlementClosedBy: order.settlementClosedBy || "",
    settlementCloseLabel: order.settlementCloseLabel || "",
    deliveryLogs: order.deliveryLogs || [],
    paid: !!order.paid,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(ORDER_STATUS_STORAGE_KEY, JSON.stringify(store));
}

export function applyStoredOrderStatus(order, options = {}) {
  const applyStoredSettlementStatus = options.applyStoredSettlementStatus || ((item) => item);
  const stored = readOrderStatusStore()[order.id];
  if (!stored) return applyStoredSettlementStatus(order);
  if (stored.cancelled || stored.statusCode === "cancelled") {
    order.cancelled = true;
    order.cancelReasonCode = stored.cancelReasonCode || order.cancelReasonCode || "other";
    order.cancelReason = stored.cancelReason || order.cancelReason || "";
    order.refundStatus = stored.refundStatus || order.refundStatus || refundStatusFromOrder(order);
    order.refundRequestedAt = stored.refundRequestedAt || order.refundRequestedAt || "";
    order.refundMemo = stored.refundMemo || order.refundMemo || "";
    order.refundHandledBy = stored.refundHandledBy || order.refundHandledBy || "";
    order.refundHandledAt = stored.refundHandledAt || order.refundHandledAt || "";
    order.stockReserved = !!stored.stockReserved || !!order.stockReserved;
    order.stockRestored = !!stored.stockRestored || !!order.stockRestored;
    order.statusCode = "cancelled";
    order.statusLabel = "취소됨";
    order.paymentLabel = paymentLabelForOrder(order);
    return order;
  }
  const storedStep = stored.progressStep || stepFromStatus(stored.statusCode);
  if (stored.forceStep || storedStep > (order.progressStep || 0)) {
    order.progressStep = storedStep;
    order.statusCode = statusFromStep(storedStep);
    order.statusLabel = labelFromStep(storedStep);
  }
  if (stored.paid) order.paid = true;
  order.deliveryPartnerName = stored.deliveryPartnerName || order.deliveryPartnerName || "";
  order.riderName = stored.riderName || order.riderName || "";
  order.pickupConfirmedAt = stored.pickupConfirmedAt || order.pickupConfirmedAt || "";
  order.arrivalConfirmedAt = stored.arrivalConfirmedAt || order.arrivalConfirmedAt || "";
  order.pickupProofPhoto = stored.pickupProofPhoto || order.pickupProofPhoto || null;
  order.arrivalProofPhoto = stored.arrivalProofPhoto || order.arrivalProofPhoto || null;
  order.settlementStatus = stored.settlementStatus || order.settlementStatus || "";
  order.settlementConfirmedAt = stored.settlementConfirmedAt || order.settlementConfirmedAt || "";
  order.settlementConfirmedBy = stored.settlementConfirmedBy || order.settlementConfirmedBy || "";
  order.settlementPaidAt = stored.settlementPaidAt || order.settlementPaidAt || "";
  order.settlementHoldReason = stored.settlementHoldReason || order.settlementHoldReason || "";
  order.settlementHeldAt = stored.settlementHeldAt || order.settlementHeldAt || "";
  order.settlementReleasedAt = stored.settlementReleasedAt || order.settlementReleasedAt || "";
  order.settlementClosedAt = stored.settlementClosedAt || order.settlementClosedAt || "";
  order.settlementClosedBy = stored.settlementClosedBy || order.settlementClosedBy || "";
  order.settlementCloseLabel = stored.settlementCloseLabel || order.settlementCloseLabel || "";
  order.deliveryLogs = Array.isArray(stored.deliveryLogs) ? stored.deliveryLogs : (order.deliveryLogs || []);
  order.paymentLabel = paymentLabelForOrder(order);
  return applyStoredSettlementStatus(order);
}

export function mergeOrderLists(primary, secondary, applyStoredStatus = applyStoredOrderStatus) {
  const merged = [];
  [...primary, ...secondary].forEach((order) => {
    if (!order || !order.id) return;
    const existing = merged.find((item) => item.id === order.id);
    if (!existing) {
      merged.push(applyStoredStatus(order));
      return;
    }
    const stronger = (order.progressStep || 0) > (existing.progressStep || 0) ? order : existing;
    Object.assign(existing, applyStoredStatus({ ...existing, ...stronger }));
  });
  return merged
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 10);
}
