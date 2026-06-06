import { currencyFormatter } from "../utils/format.js";

export default function OrdersView({ orders, onOpenTracking, onOpenDetail }) {
  return (
    <section className="view active">
      <section className="section-head page-title">
        <div>
          <p className="eyebrow">ORDERS</p>
          <h2>최근 예약 주문</h2>
        </div>
      </section>
      <section className="orders-list">
        {orders.length === 0 && <p className="inline-status">아직 예약된 배송이 없습니다.</p>}
        {orders.map((order) => {
          const items = getOrderItems(order);
          return (
            <article className="order-card" key={order.id}>
              <div className="order-card-head">
                <div>
                  <p className="eyebrow">{order.id}</p>
                  <h3>{order.showroom}</h3>
                  <span>{summarizeOrderItems(items)} · 도착까지 {order.etaMinutes}분</span>
                </div>
                <strong>{currencyFormatter.format(order.total)}</strong>
              </div>

              <div className="order-item-stack">
                {items.slice(0, 3).map((item) => (
                  <div className="order-item-row" key={`${getProductName(item)}-${item.size}-${item.quantity}`}>
                    <span>{getProductName(item)}</span>
                    <strong>
                      {item.size ?? "FREE"} · {item.quantity ?? 1}개
                    </strong>
                  </div>
                ))}
                {items.length > 3 && <p className="order-more">외 {items.length - 3}개 아이템</p>}
              </div>

              <div className="order-meta-row">
                <span>상품 {currencyFormatter.format(order.itemTotal ?? order.total)}</span>
                <span>배송 {currencyFormatter.format(order.deliveryFee ?? 3500)}</span>
              </div>
              <div className="order-destination">
                <span>{order.destinationLabel ?? "성수동 2가"}</span>
                {order.requestNote && <strong>{order.requestNote}</strong>}
              </div>

              <div className="order-actions">
                <button className="secondary-order-button" onClick={() => onOpenDetail(order)}>
                  상세
                </button>
                <button onClick={() => onOpenTracking(order)}>실시간 추적</button>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function getOrderItems(order) {
  return order.orderItems ?? order.items ?? [];
}

function getProductName(item) {
  return item?.product?.name ?? item?.product_name ?? item?.productName ?? "패션 아이템";
}

function summarizeOrderItems(items) {
  const firstName = getProductName(items[0]);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  if (items.length === 0) return "아이템 준비 중";
  if (items.length === 1) return `${firstName} ${totalQuantity}개`;
  return `${firstName} 외 ${items.length - 1}종`;
}
