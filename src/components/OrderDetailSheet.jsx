import { currencyFormatter } from "../utils/format.js";

export default function OrderDetailSheet({ order, onClose, onOpenTracking }) {
  if (!order) return null;

  const items = order.orderItems ?? order.items ?? [];

  return (
    <section className="sheet" aria-hidden="false" onClick={onClose}>
      <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
        <button className="sheet-close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">ORDER DETAIL</p>
        <h2>{order.id}</h2>
        <div className="detail-live-row">
          <span>{order.showroom}</span>
          <strong>{order.etaMinutes}분 도착</strong>
        </div>

        <div className="order-detail-items">
          {items.map((item) => (
            <div key={`${getProductName(item)}-${item.size}-${item.quantity}`}>
              <span>{getProductName(item)}</span>
              <strong>
                {item.size ?? "FREE"} · {item.quantity ?? 1}개
              </strong>
            </div>
          ))}
        </div>

        <div className="checkout-list">
          <div>
            <span>상품 금액</span>
            <strong>{currencyFormatter.format(order.itemTotal ?? order.total)}</strong>
          </div>
          <div>
            <span>배송비</span>
            <strong>{currencyFormatter.format(order.deliveryFee ?? 3500)}</strong>
          </div>
          <div>
            <span>총 결제</span>
            <strong>{currencyFormatter.format(order.total)}</strong>
          </div>
        </div>

        <div className="order-destination">
          <span>{order.destinationLabel ?? "성수동 2가"}</span>
          <strong>{order.requestNote || "요청사항 없음"}</strong>
        </div>

        <button className="primary-wide" onClick={() => onOpenTracking(order)}>
          실시간 추적 보기
        </button>
      </div>
    </section>
  );
}

function getProductName(item) {
  return item?.product?.name ?? item?.product_name ?? item?.productName ?? "패션 아이템";
}
