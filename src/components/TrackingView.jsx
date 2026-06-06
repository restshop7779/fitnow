import { deliverySteps } from "../data.js";

export default function TrackingView({ order, onClose }) {
  const activeIndex = order?.statusIndex ?? 2;
  const items = getOrderItems(order);

  return (
    <section className="tracking-view" aria-hidden="false">
      <div className="tracking-panel">
        <header>
          <button className="icon-button back-button" aria-label="돌아가기" onClick={onClose}>
            ←
          </button>
          <div>
            <p className="eyebrow">LIVE DELIVERY</p>
            <h2>도착까지 {order?.etaMinutes ?? 32}분</h2>
          </div>
        </header>
        <div className="tracking-summary">
          <span>{order?.id ?? "DEMO"}</span>
          <strong>{summarizeOrder(items)}</strong>
        </div>
        {items.length > 0 && (
          <div className="tracking-items">
            {items.slice(0, 3).map((item) => (
              <div key={`${getProductName(item)}-${item.size}-${item.quantity}`}>
                <span>{getProductName(item)}</span>
                <strong>
                  {item.size ?? "FREE"} · {item.quantity ?? 1}개
                </strong>
              </div>
            ))}
          </div>
        )}
        <div className="route-card">
          <div className="route-map">
            <span className="pin showroom" />
            <span className="route-line" />
            <span className="pin home" />
          </div>
          <p>{order?.showroom ?? "어반클로젯 성수"}에서 출발해 {order?.destinationLabel ?? "성수동 2가"}로 이동합니다.</p>
          {order?.requestNote && <small>{order.requestNote}</small>}
        </div>
        <ol className="timeline">
          {deliverySteps.map((step, index) => (
            <li key={step.key} className={index < activeIndex ? "done" : index === activeIndex ? "active" : ""}>
              <strong>{step.title}</strong>
              <span>{step.body}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function getOrderItems(order) {
  return order?.orderItems ?? order?.items ?? [];
}

function getProductName(item) {
  return item?.product?.name ?? item?.product_name ?? item?.productName ?? "패션 아이템";
}

function summarizeOrder(items) {
  if (items.length === 0) return "즉시배송 오더";

  const firstName = getProductName(items[0]);
  if (items.length === 1) return firstName;
  return `${firstName} 외 ${items.length - 1}종`;
}
