import { currencyFormatter } from "../utils/format.js";

export default function OrderCompleteSheet({ order, onClose, onOpenOrders, onOpenTracking }) {
  if (!order) return null;

  const items = order.orderItems ?? order.items ?? [];

  return (
    <section className="sheet" aria-hidden="false" onClick={onClose}>
      <div className="sheet-panel complete-panel" onClick={(event) => event.stopPropagation()}>
        <button className="sheet-close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <div className="complete-mark">✓</div>
        <p className="eyebrow">RESERVED</p>
        <h2>배송 예약이 완료됐어요.</h2>
        <p className="complete-copy">
          {order.showroom}에서 상품 확인 후 {order.destinationLabel}까지 약 {order.etaMinutes}분 안에 이동합니다.
        </p>

        <div className="receipt-card">
          <div className="receipt-head">
            <span>FITNOW RECEIPT</span>
            <strong>{order.id}</strong>
          </div>
          <div className="receipt-items">
            {items.map((item) => (
              <div key={`${getProductName(item)}-${item.size}-${item.quantity}`}>
                <span>{getProductName(item)}</span>
                <strong>
                  {item.size ?? "FREE"} · {item.quantity ?? 1}개
                </strong>
              </div>
            ))}
          </div>
          <div className="receipt-total">
            <div>
              <span>상품 금액</span>
              <strong>{currencyFormatter.format(order.itemTotal ?? order.total)}</strong>
            </div>
            <div>
              <span>즉시배송</span>
              <strong>{currencyFormatter.format(order.deliveryFee ?? 3500)}</strong>
            </div>
            <div className="receipt-grand-total">
              <span>총 결제</span>
              <strong>{currencyFormatter.format(order.total)}</strong>
            </div>
          </div>
        </div>

        <button className="primary-wide" onClick={() => onOpenTracking(order)}>
          실시간 추적 보기
        </button>
        <button className="secondary-wide" onClick={onOpenOrders}>
          주문 목록 보기
        </button>
      </div>
    </section>
  );
}

function getProductName(item) {
  return item?.product?.name ?? item?.product_name ?? item?.productName ?? "패션 아이템";
}
