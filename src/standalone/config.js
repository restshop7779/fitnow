export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const regions = [
{ key: "dongtan2", name: "동탄2", label: "동탄2 신도시", copy: "동탄2 기준 쇼룸 픽업과 라이더 동선을 계산 중입니다.", address: "동탄역 센트럴 상권 근처", offset: 0 },
{ key: "dongtan1", name: "동탄1", label: "동탄1 생활권", copy: "동탄1은 북광장과 메타폴리스 주변을 우선 배차합니다.", address: "동탄 북광장 근처", offset: 5 },
{ key: "osan", name: "오산", label: "오산 도심", copy: "오산은 오산역, 운암, 세교 방향을 묶어 배차합니다.", address: "오산역 로데오거리 근처", offset: 8 },
{ key: "segyeo", name: "세교", label: "오산 세교", copy: "세교는 아파트 단지 입구 픽업존 기준으로 안내합니다.", address: "세교 중심상가 근처", offset: 11 },
];
export const addressSuggestions = [
{ regionKey: "dongtan2", title: "동탄역 롯데백화점", address: "경기 화성시 동탄역로 160 동탄역 롯데백화점", hint: "동탄역 센트럴 상권" },
{ regionKey: "dongtan2", title: "동탄역 센트럴상권", address: "경기 화성시 오산동 동탄역 센트럴상권", hint: "쇼룸 픽업 최단 권역" },
{ regionKey: "dongtan2", title: "동탄호수공원", address: "경기 화성시 동탄순환대로 69 동탄호수공원", hint: "동탄2 남측 생활권" },
{ regionKey: "dongtan2", title: "동탄 카림애비뉴", address: "경기 화성시 동탄대로시범길 134 카림애비뉴", hint: "동탄2 시범단지" },
{ regionKey: "dongtan1", title: "동탄 북광장", address: "경기 화성시 반송동 동탄 북광장", hint: "동탄1 중심 상권" },
{ regionKey: "dongtan1", title: "메타폴리스", address: "경기 화성시 동탄중앙로 220 메타폴리스", hint: "동탄1 메인 권역" },
{ regionKey: "dongtan1", title: "동탄센트럴파크", address: "경기 화성시 반송동 동탄센트럴파크", hint: "동탄1 주거 밀집" },
{ regionKey: "osan", title: "오산역 로데오거리", address: "경기 오산시 오산로 212 오산역 로데오거리", hint: "오산 도심 픽업" },
{ regionKey: "osan", title: "오산 운암뜰", address: "경기 오산시 원동 운암뜰 상권", hint: "오산 동측 생활권" },
{ regionKey: "osan", title: "오산시청", address: "경기 오산시 성호대로 141 오산시청", hint: "오산 중앙권" },
{ regionKey: "segyeo", title: "세교 중심상가", address: "경기 오산시 세교동 세교 중심상가", hint: "세교 신도시" },
{ regionKey: "segyeo", title: "오산대역", address: "경기 오산시 청학로 45 오산대역", hint: "세교 인접 역세권" },
];
export const partnerStores = [
{ name: "어반클로젯 동탄", area: "동탄2", address: "동탄역 센트럴 상권", pickup: true, open: true, prep: 4 },
{ name: "동탄 그레인룸", area: "동탄1", address: "동탄 북광장", pickup: true, open: true, prep: 6 },
{ name: "오산 비트 아카이브", area: "오산", address: "오산역 로데오거리", pickup: true, open: true, prep: 8 },
];
export const vendorAccounts = [
{ store: "어반클로젯 동탄", pin: "1111", manager: "어반클로젯 매니저" },
{ store: "동탄 그레인룸", pin: "2222", manager: "그레인룸 매니저" },
{ store: "오산 비트 아카이브", pin: "3333", manager: "비트 아카이브 매니저" },
];
export const deliveryPartners = [
{ name: "지금배송 동탄센터", pin: "7701", areas: ["동탄"], riders: Array.from({ length: 10 }, (_, index) => "동탄 기사" + String(index + 1).padStart(2, "0")) },
{ name: "지금배송 오산센터", pin: "7702", areas: ["오산", "세교"], riders: Array.from({ length: 10 }, (_, index) => "오산 기사" + String(index + 1).padStart(2, "0")) },
];
export const products = [
{ key: "jacket", name: "라이트 셔링 재킷", price: 89000, discountRate: 12, showroom: "어반클로젯 동탄", stock: 1, minutes: 32, match: 92, material: "나일론 코튼", visual: "jacket", category: "상의", fit: "살짝 여유 있는 숏 기장", size: "Free / 44-66", garmentLength: 55, shoulderWidth: 43, chestWidth: 52, waistWidth: 49, modelHeight: 168, modelWeight: 53, note: "퇴근 후 약속에 바로 입기 좋은 가벼운 아우터예요. 링과 함께 담으면 깔끔한 원마일 룩으로 완성됩니다." },
{ key: "shoes", name: "스웨이드 러너 슈즈", price: 129000, discountRate: 8, showroom: "동탄 그레인룸", stock: 4, minutes: 38, match: 88, material: "스웨이드 러버", visual: "shoes", category: "신발", fit: "정사이즈 추천", size: "230-280", garmentLength: 0, shoulderWidth: 0, chestWidth: 0, waistWidth: 0, modelHeight: 176, modelWeight: 68, note: "부드러운 스웨이드 톤이라 재킷, 데님, 와이드 팬츠에 모두 잘 붙는 데일리 슈즈예요." },
{ key: "bag", name: "미니 호보백", price: 54000, discountRate: 15, showroom: "오산 비트 아카이브", stock: 6, minutes: 41, match: 84, material: "비건 레더", visual: "bag", category: "잡화", fit: "가벼운 데일리 수납", size: "One size", garmentLength: 18, shoulderWidth: 0, chestWidth: 0, waistWidth: 0, modelHeight: 165, modelWeight: 50, note: "핸드폰, 카드지갑, 립 제품 정도를 넣기 좋은 사이즈예요. 룩에 곡선 포인트를 더해줍니다." },
{ key: "ring", name: "실버 매트 링", price: 26000, discountRate: 5, showroom: "어반클로젯 동탄", stock: 9, minutes: 32, match: 79, material: "스테인리스 스틸", visual: "ring", category: "잡화", fit: "오픈 링 타입", size: "One size", garmentLength: 0, shoulderWidth: 0, chestWidth: 0, waistWidth: 0, modelHeight: 165, modelWeight: 50, note: "손이 허전해 보일 때 가장 빠르게 룩의 완성도를 올려주는 작은 포인트 아이템이에요." },
];
export const lookSets = [
{ key: "afterwork", title: "퇴근 후 약속룩", store: "어반클로젯 동탄", discountRate: 7, keys: ["jacket", "ring"], note: "입점 매장이 고른 의류와 잡화 조합으로 바로 약속 장소에 갈 수 있는 세트예요." },
{ key: "commute", title: "동탄 출근룩", store: "동탄 그레인룸", discountRate: 5, keys: ["shoes"], note: "출근길에 바로 받을 수 있는 신발 중심 세트예요. 업체가 상품을 더 추가하면 함께 구성됩니다." },
{ key: "one-mile", title: "오산 원마일룩", store: "오산 비트 아카이브", discountRate: 10, keys: ["bag"], note: "잠깐 외출, 카페, 장보기까지 부담 없이 들 수 있는 잡화 세트예요." },
];
export const steps = ["예약 접수", "재고 확인", "픽업 요청", "배송 중", "배송 완료"];

export const adminAccount = { name: "핏나우 운영자", pin: "0000" };
export const CUSTOMER_STORAGE_KEY = "fitnow-current-customer";
export const VENDOR_STORAGE_KEY = "fitnow-current-vendor";
export const ADMIN_STORAGE_KEY = "fitnow-current-admin";
export const ORDER_STATUS_STORAGE_KEY = "fitnow-order-status";
export const REVIEW_STORAGE_KEY = "fitnow-reviews";
export const WISHLIST_STORAGE_KEY = "fitnow-wishlist";
export const RECENT_VIEW_STORAGE_KEY = "fitnow-recent-views";
export const RIDER_NICKNAME_STORAGE_KEY = "fitnow-rider-nicknames";
export const SETTLEMENT_RATE_STORAGE_KEY = "fitnow-settlement-rates";
export const SETTLEMENT_STATUS_STORAGE_KEY = "fitnow-settlement-status";

