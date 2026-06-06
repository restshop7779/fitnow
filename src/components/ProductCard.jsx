import { useState } from "react";
import { currencyFormatter } from "../utils/format.js";
import ProductVisual from "./ProductVisual.jsx";

export default function ProductCard({ product, onAdd, onOpenDetail }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd(product, { size: "FREE" });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
  }

  return (
    <article className="product-card">
      <button className="product-open" aria-label={`${product.name} 상세 보기`} onClick={() => onOpenDetail(product)}>
        <ProductVisual type={product.visualKey ?? product.key} />
        <div className="live-stock-badge">
          <span />
          {product.deliveryMinutes ?? 45}분 도착
        </div>
        <p>{product.name}</p>
        <strong>{currencyFormatter.format(product.price)}</strong>
        <small>{product.showroom ?? product.meta}</small>
        <div className="stock-line">
          <span>{stockLabel(product.stockQuantity)}</span>
          <span>{product.match}% 매치</span>
        </div>
      </button>
      <button className={`add-button ${added ? "added" : ""}`} onClick={handleAdd}>
        {added ? "담기 완료" : "담기"}
      </button>
    </article>
  );
}

function stockLabel(stockQuantity) {
  if (stockQuantity === undefined || stockQuantity === null) return "재고 확인";
  if (stockQuantity === 0) return "품절 임박";
  if (stockQuantity <= 2) return `${stockQuantity}개 남음`;
  return `재고 ${stockQuantity}개`;
}
