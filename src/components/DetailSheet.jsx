import { useState } from "react";
import ProductVisual from "./ProductVisual.jsx";

export default function DetailSheet({ product, onClose, onAdd }) {
  const [size, setSize] = useState("S");
  if (!product) return null;

  return (
    <section className="sheet" aria-hidden="false" onClick={onClose}>
      <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
        <button className="sheet-close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <ProductVisual type={product.visualKey ?? product.key} />
        <p className="eyebrow">STYLE DETAIL</p>
        <h2>{product.name}</h2>
        <p>{product.tone}</p>
        <div className="detail-live-row">
          <span>{product.showroom ?? "근처 쇼룸"}</span>
          <strong>{product.deliveryMinutes ?? 45}분 도착</strong>
        </div>
        <div className="size-row" aria-label="사이즈 선택">
          {["S", "M", "L"].map((item) => (
            <button key={item} className={size === item ? "active" : ""} onClick={() => setSize(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="detail-grid">
          <span>어울림</span>
          <strong>{product.match}%</strong>
          <span>소재</span>
          <strong>{product.material}</strong>
          <span>핏</span>
          <strong>{product.fit}</strong>
          <span>재고</span>
          <strong>{stockText(product.stockQuantity)}</strong>
        </div>
        <button className="primary-wide" onClick={() => onAdd(product, { size })}>
          {size} 사이즈 담기
        </button>
      </div>
    </section>
  );
}

function stockText(stockQuantity) {
  if (stockQuantity === undefined || stockQuantity === null) return "확인 중";
  if (stockQuantity <= 0) return "품절 임박";
  return `${stockQuantity}개`;
}
