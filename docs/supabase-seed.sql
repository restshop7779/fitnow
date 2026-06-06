insert into public.showrooms (slug, name, area, summary, average_delivery_minutes)
values
  ('urban-closet-seongsu', '어반클로젯 성수', 'SEONGSU', '아우터 12개 · 평균 32분', 32),
  ('grain-room', '그레인룸', 'TUKSEOM', '슈즈 8개 · 평균 38분', 38),
  ('beat-archive', '비트 아카이브', 'SEOUL FOREST', '가방 6개 · 평균 41분', 41)
on conflict (slug) do update set
  name = excluded.name,
  area = excluded.area,
  summary = excluded.summary,
  average_delivery_minutes = excluded.average_delivery_minutes;

insert into public.products (
  showroom_id,
  slug,
  name,
  price,
  category,
  meta,
  tone,
  material,
  fit,
  match_score,
  stock_quantity,
  delivery_minutes,
  visual_key
)
values
  (
    (select id from public.showrooms where slug = 'urban-closet-seongsu'),
    'jacket',
    '라이트 셔링 재킷',
    89000,
    'outer',
    '성수 · 1개 남음',
    '퇴근 후 약속에 가볍게 걸치기 좋은 뉴트럴 재킷',
    '나일론 62%, 코튼 38%',
    '여유 있는 세미 오버핏',
    92,
    1,
    32,
    'jacket'
  ),
  (
    (select id from public.showrooms where slug = 'grain-room'),
    'shoes',
    '스웨이드 러너',
    129000,
    'shoes',
    '뚝섬 · 오늘 도착',
    '캐주얼 룩을 단정하게 잡아주는 낮은 채도의 슈즈',
    '스웨이드, 러버 아웃솔',
    '정사이즈 추천',
    88,
    4,
    38,
    'shoes'
  ),
  (
    (select id from public.showrooms where slug = 'beat-archive'),
    'bag',
    '미니 호보백',
    54000,
    'bag',
    '서울숲 · 인기',
    '가볍지만 스타일링 포인트가 되는 데일리 백',
    '비건 레더',
    '스마트폰, 지갑 수납',
    84,
    6,
    41,
    'bag'
  ),
  (
    (select id from public.showrooms where slug = 'urban-closet-seongsu'),
    'ring',
    '실버 매트 링',
    26000,
    'accessory',
    '성수 · 40분',
    '마무리가 허전한 룩에 밀도를 더하는 매트 링 조합',
    '써지컬 스틸',
    '프리 사이즈',
    79,
    9,
    32,
    'ring'
  )
on conflict (slug) do update set
  showroom_id = excluded.showroom_id,
  name = excluded.name,
  price = excluded.price,
  category = excluded.category,
  meta = excluded.meta,
  tone = excluded.tone,
  material = excluded.material,
  fit = excluded.fit,
  match_score = excluded.match_score,
  stock_quantity = excluded.stock_quantity,
  delivery_minutes = excluded.delivery_minutes,
  visual_key = excluded.visual_key;
