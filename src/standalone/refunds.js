import {
  RETURN_REFUND_PROCESS_MS,
  RETURN_REFUND_WINDOW_DAYS,
  RETURN_REFUND_WINDOW_MS,
} from "./config.js";
import { deliveryProofCompletedAt } from "./deliveryProof.js";

export function paymentLabelForOrder(order) {
  if (isOrderCancelled(order)) return refundLabelForOrder(order);
  if (!order || !order.paid) return "결제 대기";
  return order.paymentMethod ? order.paymentMethod + " 결제 완료" : "결제 완료";
}

export function refundLabelForOrder(order) {
  if (!order) return "주문 취소";
  if (order.refundStatus === "requested") return "반품/환불 요청";
  if (order.refundStatus === "approved") return "환불 승인";
  if (order.refundStatus === "rejected") return "환불 거절";
  if (order.refundStatus === "completed") return "환불 완료";
  if (order.refundStatus === "not_required") return "현장결제 취소";
  if (order.refundStatus === "pending") return "환불 대기";
  if (order.paymentMethod === "현장결제" || !order.paid) return "현장결제 취소";
  return "환불 대기";
}

export function customerRefundStatusLabel(order) {
  if (!isOrderCancelled(order) || (order && order.cancelReasonCode) !== "return_refund") return "";
  const status = refundStatusFromOrder(order);
  if (status === "requested") return "요청 접수";
  if (status === "approved") return "승인됨";
  if (status === "rejected") return "거절됨";
  if (status === "completed") return "환불 완료";
  if (status === "not_required") return "현장결제 취소";
  return "처리 중";
}

export function customerRefundStatusDetail(order) {
  if (!isOrderCancelled(order) || (order && order.cancelReasonCode) !== "return_refund") return "";
  const status = refundStatusFromOrder(order);
  if (status === "requested") return "입점업체 또는 관리자가 요청 내용을 확인하고 있습니다.";
  if (status === "approved") return "요청이 승인되었습니다. 환불 완료 처리를 기다리고 있습니다.";
  if (status === "rejected") return "요청이 거절되었습니다. 자세한 내용은 고객센터로 문의해 주세요.";
  if (status === "completed") return "환불 처리가 완료되었습니다.";
  if (status === "not_required") return "현장결제 주문으로 별도 카드 환불이 필요하지 않습니다.";
  return "환불 상태를 확인하고 있습니다.";
}

export function customerRefundMemoLabel(order) {
  if (!isOrderCancelled(order) || (order && order.cancelReasonCode) !== "return_refund" || !order.refundMemo) return "";
  return order.refundMemo;
}

export function customerRefundStatusClass(order) {
  const status = refundStatusFromOrder(order);
  if (status === "completed") return "done";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "requested") return "requested";
  if (status === "not_required") return "done";
  return "pending";
}

export function customerRefundStatusCard(order, compact = false) {
  const label = customerRefundStatusLabel(order);
  if (!label) return "";
  const detail = customerRefundStatusDetail(order);
  const memo = customerRefundMemoLabel(order);
  const process = isOpenRefundStatus(order) ? returnRefundProcessInfo(order).label : "처리 완료";
  return `
    <div class="customer-refund-card ${customerRefundStatusClass(order)} ${compact ? "compact" : ""}">
      <div>
        <span>반품/환불</span>
        <strong>${label}</strong>
      </div>
      <p>${detail}</p>
      <small>${process}${memo ? " · " + memo : ""}</small>
    </div>
  `;
}

export function refundStatusFromOrder(order) {
  if (!isOrderCancelled(order)) return "";
  if (order.refundStatus) return order.refundStatus;
  if (order.paymentMethod === "현장결제" || !order.paid) return "not_required";
  return "pending";
}

export function isOrderCancelled(order) {
  return !!(order && (order.cancelled || order.statusCode === "cancelled"));
}

export function canCancelOrder(order) {
  return !!(order && !isOrderCancelled(order) && (order.progressStep || 0) < 3);
}

export function returnRefundDeadline(order) {
  const completedAt = deliveryProofCompletedAt(order);
  if (!completedAt) return null;
  const time = new Date(completedAt).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + RETURN_REFUND_WINDOW_MS);
}

export function canRequestReturnRefund(order, now = Date.now()) {
  if (!order || isOrderCancelled(order) || (order.progressStep || 0) < 4) return false;
  const deadline = returnRefundDeadline(order);
  return !!(deadline && now <= deadline.getTime());
}

export function returnRefundWindowLabel(order) {
  const deadline = returnRefundDeadline(order);
  if (!deadline) return "배송완료 후 " + RETURN_REFUND_WINDOW_DAYS + "일";
  const expired = Date.now() > deadline.getTime();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const dateLabel = deadline.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  return expired ? "반품/환불 기간 만료" : "반품/환불 " + daysLeft + "일 남음 · " + dateLabel + "까지";
}

export function customerCancelActionLabel(order) {
  if (isOrderCancelled(order)) return "취소됨";
  if ((order && order.progressStep || 0) >= 4) return canRequestReturnRefund(order) ? "반품/환불 요청" : "반품/환불 기간 만료";
  return "주문 취소";
}

export function canCustomerCancelOrReturn(order) {
  return canCancelOrder(order) || canRequestReturnRefund(order);
}

export function canCompleteRefund(order) {
  const status = refundStatusFromOrder(order);
  return isOrderCancelled(order) && (status === "pending" || status === "approved");
}

export function canReviewReturnRefund(order) {
  return isOrderCancelled(order) && order.cancelReasonCode === "return_refund" && refundStatusFromOrder(order) === "requested";
}

export function isOpenRefundStatus(order) {
  return ["pending", "requested", "approved"].includes(refundStatusFromOrder(order));
}

export function returnRefundRequestedAt(order) {
  if (!order || order.cancelReasonCode !== "return_refund") return "";
  return order.refundRequestedAt || order.refundHandledAt || order.updatedAt || order.createdAt || "";
}

export function returnRefundProcessInfo(order, now = Date.now()) {
  const requestedAt = returnRefundRequestedAt(order);
  const time = new Date(requestedAt || "").getTime();
  if (!Number.isFinite(time)) return { label: "처리기한 미확인", cls: "ready", overdue: false, hoursLeft: null };
  const deadline = time + RETURN_REFUND_PROCESS_MS;
  const hoursLeft = Math.ceil((deadline - now) / (60 * 60 * 1000));
  if (hoursLeft <= 0) return { label: "처리 지연", cls: "refund", overdue: true, hoursLeft };
  if (hoursLeft <= 6) return { label: "마감 " + hoursLeft + "시간 전", cls: "refund", overdue: false, hoursLeft };
  return { label: "처리기한 " + hoursLeft + "시간", cls: "ready", overdue: false, hoursLeft };
}

export const cancelReasonOptions = [
  { key: "customer", label: "고객 요청" },
  { key: "return_refund", label: "반품/환불 요청" },
  { key: "stock", label: "재고 부족" },
  { key: "delay", label: "배송 지연" },
  { key: "operator", label: "운영자 취소" },
  { key: "other", label: "기타" },
];

export function cancelReasonLabel(order) {
  const option = cancelReasonOptions.find((item) => item.key === (order && order.cancelReasonCode));
  return option ? option.label : "기타";
}

export function defaultCancelReasonCode(source) {
  if (source === "vendor") return "stock";
  if (source === "admin") return "operator";
  return "customer";
}

export function normalizeCancelReasonCode(value, fallback = "other") {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return fallback;
  if (["1", "customer", "고객", "고객 요청", "고객요청"].includes(text)) return "customer";
  if (["return_refund", "return", "refund", "반품", "환불", "반품/환불", "반품환불", "반품/환불 요청", "반품환불요청"].includes(text)) return "return_refund";
  if (["2", "stock", "재고", "재고 부족", "재고부족"].includes(text)) return "stock";
  if (["3", "delay", "배송", "배송 지연", "배송지연"].includes(text)) return "delay";
  if (["4", "operator", "운영", "운영자", "운영자 취소", "운영자취소"].includes(text)) return "operator";
  if (["5", "other", "기타"].includes(text)) return "other";
  const matched = cancelReasonOptions.find((item) => item.key === text || item.label.toLowerCase() === text);
  return matched ? matched.key : fallback;
}
