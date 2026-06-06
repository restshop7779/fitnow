export function mapProductFromRow(row) {
  const deliveryMinutes = row.delivery_minutes ?? row.showrooms?.average_delivery_minutes ?? 45;
  const stockQuantity = row.stock_quantity ?? 0;

  return {
    key: row.slug ?? row.visual_key,
    name: row.name,
    price: row.price,
    meta: row.meta ?? `${row.showrooms?.area ?? "근처 쇼룸"} · ${stockQuantity}개 남음`,
    tone: row.tone ?? "오늘 바로 입기 좋은 즉시배송 아이템",
    material: row.material ?? "소재 정보 준비 중",
    fit: row.fit ?? "기본 핏",
    match: row.match_score ?? 80,
    visualKey: row.visual_key ?? row.slug,
    showroom: row.showrooms?.name,
    stockQuantity,
    deliveryMinutes,
  };
}

export function mapShowroomFromRow(row) {
  return {
    cover: row.cover ?? "cover-one",
    area: row.area,
    name: row.name,
    summary: row.summary ?? `평균 ${row.average_delivery_minutes ?? 40}분`,
    averageDeliveryMinutes: row.average_delivery_minutes ?? 40,
  };
}
