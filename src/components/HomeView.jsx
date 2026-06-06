import { useMemo, useState } from "react";
import ProductCard from "./ProductCard.jsx";

const sortOptions = [
  { key: "fastest", label: "빠른 도착" },
  { key: "match", label: "매치율" },
  { key: "stock", label: "재고순" },
];

export default function HomeView({ products, isLoading, onAdd, onOpenDetail, onOpenTracking, onOpenAI }) {
  const [selectedShowroom, setSelectedShowroom] = useState("all");
  const [sortMode, setSortMode] = useState("fastest");
  const [onlyFastDelivery, setOnlyFastDelivery] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const showroomNames = useMemo(() => {
    return [...new Set(products.map((product) => product.showroom).filter(Boolean))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const searchableText = [product.name, product.showroom, product.meta, product.tone, product.material]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesShowroom = selectedShowroom === "all" || product.showroom === selectedShowroom;
      const matchesDelivery = !onlyFastDelivery || (product.deliveryMinutes ?? 99) <= 45;
      return matchesSearch && matchesShowroom && matchesDelivery;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "match") return (b.match ?? 0) - (a.match ?? 0);
      if (sortMode === "stock") return (b.stockQuantity ?? 0) - (a.stockQuantity ?? 0);
      return (a.deliveryMinutes ?? 99) - (b.deliveryMinutes ?? 99);
    });
  }, [normalizedSearch, onlyFastDelivery, products, selectedShowroom, sortMode]);

  const fastestProduct = visibleProducts[0] ?? products[0] ?? null;

  function resetCatalogControls() {
    setSearchTerm("");
    setSelectedShowroom("all");
    setOnlyFastDelivery(false);
    setSortMode("fastest");
  }

  return (
    <section className="view active">
      <section className="onboarding-card">
        <div>
          <p className="eyebrow">STYLE DELIVERY</p>
          <h2>쇼룸 재고, 스타일러 검수, 라이더 픽업까지 한 번에.</h2>
        </div>
        <button onClick={onOpenTracking}>흐름 보기</button>
      </section>

      <section className="hero">
        <img src="./assets/fashion-delivery-hero.png" alt="빠른 배송을 준비 중인 패션 아이템" />
        <div className="hero-copy">
          <p>CURATED IN 45 MIN</p>
          <h1>
            룩의 온도를
            <br />
            지금 맞춰요
          </h1>
          <span>근처 편집숍의 재고만 모아, 오늘 약속 전에 도착.</span>
          <button className="primary-action" onClick={onOpenAI}>
            AI 스타일러에게 묻기
          </button>
        </div>
      </section>

      <section className="moment-panel" aria-label="오늘의 스타일 상황">
        <button className="moment active">
          <strong>퇴근 후 약속</strong>
          <span>18:30 전 도착</span>
        </button>
        <button className="moment">
          <strong>주말 전시</strong>
          <span>미니멀 룩</span>
        </button>
        <button className="moment">
          <strong>비 오는 날</strong>
          <span>방수 소재</span>
        </button>
      </section>

      <section className="editor-pick">
        <div>
          <p className="eyebrow">EDITOR'S ROUTE</p>
          <h2>성수에서 바로 출발하는 감도 높은 아이템</h2>
        </div>
        <span>LIVE STOCK</span>
      </section>

      <section className="store-card">
        <div className="store-head">
          <div>
            <p className="eyebrow">FASTEST SHOWROOM</p>
            <h2>{fastestProduct?.showroom ?? "어반클로젯 성수"}</h2>
          </div>
          <strong>{fastestProduct?.deliveryMinutes ?? 32}분</strong>
        </div>
        <div className="delivery-status">
          <span />
          <p>
            {fastestProduct?.name ?? "라이트 셔링 재킷"} 재고 {fastestProduct?.stockQuantity ?? 1}개 확인 중 · 예상 도착 18:42
          </p>
        </div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">READY TO WEAR</p>
          <h2>지금 받을 수 있는 룩</h2>
        </div>
        <button onClick={() => setOnlyFastDelivery((value) => !value)}>{onlyFastDelivery ? "전체 보기" : "45분 안"}</button>
      </section>

      <section className="catalog-controls" aria-label="상품 필터와 정렬">
        <label className="catalog-search">
          <span>검색</span>
          <input
            type="search"
            value={searchTerm}
            placeholder="상품명, 쇼룸, 소재 검색"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button type="button" aria-label="검색어 지우기" onClick={() => setSearchTerm("")}>
              ×
            </button>
          )}
        </label>

        <div className="showroom-filter">
          <button className={selectedShowroom === "all" ? "active" : ""} onClick={() => setSelectedShowroom("all")}>
            전체
          </button>
          {showroomNames.map((name) => (
            <button key={name} className={selectedShowroom === name ? "active" : ""} onClick={() => setSelectedShowroom(name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="sort-control" role="group" aria-label="상품 정렬">
          {sortOptions.map((option) => (
            <button key={option.key} className={sortMode === option.key ? "active" : ""} onClick={() => setSortMode(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="result-summary">
          <span>{visibleProducts.length}개 아이템</span>
          {(normalizedSearch || selectedShowroom !== "all" || onlyFastDelivery || sortMode !== "fastest") && (
            <button type="button" onClick={resetCatalogControls}>
              초기화
            </button>
          )}
        </div>
      </section>

      <section className="product-grid" aria-label="지금 배송 가능한 상품">
        {isLoading && <p className="inline-status">쇼룸 재고를 불러오는 중입니다.</p>}
        {!isLoading && visibleProducts.length === 0 && <p className="inline-status">조건에 맞는 아이템이 없습니다.</p>}
        {!isLoading &&
          visibleProducts.map((product) => (
            <ProductCard key={product.key} product={product} onAdd={onAdd} onOpenDetail={onOpenDetail} />
          ))}
      </section>
    </section>
  );
}
