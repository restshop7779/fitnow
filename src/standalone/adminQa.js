import { ADMIN_QA_CHECKLIST_KEY } from "./config.js";

export function adminQaChecklistSections() {
  return [
    {
      id: "admin-basics",
      title: "총관리자 기본 상태",
      items: [
        { id: "mode-banner", label: "운영/테스트 모드 배너 표시" },
        { id: "rider-board-collapsed", label: "기사별 업무판 기본 접힘" },
        { id: "nickname-board-collapsed", label: "기사 닉네임 관리 기본 접힘" },
        { id: "home-layout", label: "운영 홈 할 일 카드 겹침 없음" },
      ],
    },
    {
      id: "test-tools",
      title: "관리자 테스트 도구",
      items: [
        { id: "tools-collapsed", label: "테스트 도구 기본 접힘" },
        { id: "meta-visible", label: "마지막 점검/정리 시간 표시" },
        { id: "retention-controls", label: "보관 기간 1시간/24시간/7일 선택" },
        { id: "buttons-in-view", label: "테스트 도구 버튼이 화면 안에 표시" },
      ],
    },
    {
      id: "settlement-flow",
      title: "정산 플로우 점검",
      items: [
        { id: "test-order-created", label: "FN-SET001 생성" },
        { id: "paid", label: "정산 확정 후 지급완료 처리" },
        { id: "paid-tab", label: "지급완료 탭 활성화" },
        { id: "logs-updated", label: "점검 로그와 최근 점검 시간 갱신" },
      ],
    },
    {
      id: "settlement-report",
      title: "정산 점검 리포트",
      items: [
        { id: "modal-open", label: "최근 리포트/상세보기 모달 열림" },
        { id: "four-steps", label: "4단계 진행 내역 표시" },
        { id: "copy-button", label: "텍스트 복사 버튼 표시" },
        { id: "csv-button", label: "CSV 다운로드 버튼 표시" },
      ],
    },
    {
      id: "cleanup",
      title: "테스트 데이터 정리",
      items: [
        { id: "remove-diagnostics", label: "진단 주문과 로그 제거" },
        { id: "cleanup-time", label: "최근 정리 시간 갱신" },
        { id: "operating-mode", label: "OPERATING MODE 전환" },
        { id: "notice-hidden", label: "운영 홈 테스트 안내 제거" },
      ],
    },
    {
      id: "final-scenario",
      title: "최종 운영 시나리오",
      items: [
        { id: "delivery-order", label: "배송 테스트 주문 생성" },
        { id: "delivery-proof", label: "픽업/도착 인증 흐름 확인" },
        { id: "delivery-coverage", label: "배송권역 주소 키워드와 오픈콜 노출 자동 점검" },
        { id: "return-refund-visible", label: "반품/환불 표시 점검 4/4 통과" },
        { id: "vendor-refund-action", label: "입점업체 승인/거절 버튼 확인" },
        { id: "admin-refund-action", label: "총관리자 환불 완료 버튼 확인" },
        { id: "cleanup-zero", label: "정리 상태 점검 0건 확인" },
      ],
    },
    {
      id: "mobile-app",
      title: "설치형 앱 최종 점검",
      items: [
        { id: "bottom-tabs", label: "홈/룩/관리/마이 하단 탭 반응" },
        { id: "cart-bar", label: "예약/장바구니 버튼이 하단에 고정 표시" },
        { id: "checkout-entry", label: "고객 화면 결제하기 진입 가능" },
        { id: "vendor-flow", label: "입점업체 재고확인/픽업준비 처리 확인" },
        { id: "rider-open-call", label: "배송사 앱 오픈콜 노출 확인" },
        { id: "supabase-status", label: "핸드폰 앱 DB 연결 확인 정상" },
        { id: "cleanup-after-test", label: "모바일 테스트 후 테스트 데이터 정리 0건 확인" },
      ],
    },
    {
      id: "regression",
      title: "회귀 확인",
      items: [
        { id: "order-detail", label: "주문 상세/기사 배정 정상" },
        { id: "operation-actions", label: "정산 운영 버튼은 테스트 도구 밖에 유지" },
        { id: "mobile-layout", label: "모바일 폭에서 텍스트 겹침 없음" },
        { id: "build-pass", label: "배포 전 Vite 빌드 통과" },
      ],
    },
  ];
}

export function adminQaChecklistItemKey(sectionId, itemId) {
  return sectionId + "." + itemId;
}

export function adminQaChecklistLabelByKey(key) {
  for (const section of adminQaChecklistSections()) {
    for (const item of section.items) {
      if (adminQaChecklistItemKey(section.id, item.id) === key) {
        return section.title + " - " + item.label;
      }
    }
  }
  return key;
}

export function readAdminQaChecklistStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_QA_CHECKLIST_KEY) || "{}");
    return parsed && typeof parsed === "object" && parsed.checked && typeof parsed.checked === "object"
      ? parsed
      : { checked: {}, updatedAt: "" };
  } catch (error) {
    localStorage.removeItem(ADMIN_QA_CHECKLIST_KEY);
    return { checked: {}, updatedAt: "" };
  }
}

export function saveAdminQaChecklistStore(store) {
  localStorage.setItem(ADMIN_QA_CHECKLIST_KEY, JSON.stringify(store));
}

export function clearAdminQaChecklistStore() {
  localStorage.removeItem(ADMIN_QA_CHECKLIST_KEY);
}

export function adminQaChecklistProgress(store = readAdminQaChecklistStore()) {
  const sections = adminQaChecklistSections();
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const checked = sections.reduce((sum, section) => (
    sum + section.items.filter((item) => !!store.checked[adminQaChecklistItemKey(section.id, item.id)]).length
  ), 0);
  return { checked, total, done: total > 0 && checked === total };
}

export function updateAdminQaChecklistStore(updates = {}, now = new Date().toISOString()) {
  const store = readAdminQaChecklistStore();
  store.checked = { ...(store.checked || {}), ...updates };
  store.updatedAt = now;
  const progress = adminQaChecklistProgress(store);
  store.completedAt = progress.done ? store.updatedAt : "";
  saveAdminQaChecklistStore(store);
  return { store, progress };
}

export function adminQaChecklistReportRows(store = readAdminQaChecklistStore()) {
  return adminQaChecklistSections().flatMap((section, sectionIndex) => (
    section.items.map((item, itemIndex) => {
      const key = adminQaChecklistItemKey(section.id, item.id);
      return {
        sectionOrder: sectionIndex + 1,
        itemOrder: itemIndex + 1,
        section: section.title,
        item: item.label,
        status: store.checked[key] ? "완료" : "미완료",
      };
    })
  ));
}

export function adminQaChecklistRemainingRows(store = readAdminQaChecklistStore()) {
  return adminQaChecklistReportRows(store).filter((row) => row.status !== "완료");
}

export function adminQaChecklistReportText(store = readAdminQaChecklistStore(), options = {}) {
  const timeLabel = options.timeLabel || ((value) => value || "기록 없음");
  const progress = adminQaChecklistProgress(store);
  const rows = adminQaChecklistReportRows(store);
  return [
    "FitNow 관리자 QA 체크리스트 리포트",
    "결과: " + (progress.done ? "완료" : "진행 중"),
    "진행률: " + progress.checked + "/" + progress.total,
    "마지막 저장: " + timeLabel(store.updatedAt),
    "완료 시각: " + timeLabel(store.completedAt),
    "",
    "항목",
    ...rows.map((row) => row.sectionOrder + "-" + row.itemOrder + ". " + row.section + " / " + row.item + " - " + row.status),
  ].join("\n");
}

export function adminPreReleaseQuickActions(qaStore, diagnostic, testMeta, options = {}) {
  const isToday = options.isToday || (() => false);
  const checked = qaStore.checked || {};
  const actions = [];
  const addAction = (action, label, detail, variant = "primary") => {
    if (!actions.some((item) => item.action === action)) {
      actions.push({ action, label, detail, variant });
    }
  };
  const hasDeliveryOrder = !!checked[adminQaChecklistItemKey("final-scenario", "delivery-order")];
  const hasDeliveryProof = !!checked[adminQaChecklistItemKey("final-scenario", "delivery-proof")];
  const hasDeliveryCoverage = !!checked[adminQaChecklistItemKey("final-scenario", "delivery-coverage")];
  const hasReturnVisible = !!checked[adminQaChecklistItemKey("final-scenario", "return-refund-visible")];
  const hasCleanupZero = !!checked[adminQaChecklistItemKey("final-scenario", "cleanup-zero")];
  const hasReturnOrdersToday = testMeta.lastCheckType === "return_refund" && isToday(testMeta.lastCheckAt);
  const settlementReady = ["test-order-created", "paid", "paid-tab", "logs-updated"].every((itemId) =>
    !!checked[adminQaChecklistItemKey("settlement-flow", itemId)]
  );
  if (!hasDeliveryOrder) addAction("deliveryOrder", "배송 테스트 주문 생성", "배송 QA 시작용 주문을 만듭니다");
  if (!hasDeliveryProof) addAction("deliveryFlow", "배송 플로우 자동 점검", "배정, 픽업, 도착 인증까지 자동 확인합니다");
  if (!hasDeliveryCoverage) addAction("deliveryCoverage", "배송권역/오픈콜 자동 점검", "주소 키워드, 주문 생성, 배송사 오픈콜 노출을 확인합니다");
  if (!hasReturnVisible) {
    if (!hasReturnOrdersToday) addAction("returnOrders", "반품/환불 테스트 4건 생성", "표시 점검용 고객/업체 주문을 준비합니다", "neutral");
    addAction("returnVisibility", "반품/환불 표시 점검", "고객, 업체, 관리자 화면 노출을 확인합니다");
  }
  if (!settlementReady) addAction("settlementFlow", "정산 플로우 점검", "정산 주문, 지급 상태, 로그를 확인합니다");
  if (diagnostic.hasTestState) addAction("cleanup", "테스트 데이터 정리", "진단 주문과 테스트 로그를 정리합니다", "warning");
  if (!hasCleanupZero || !isToday(testMeta.lastCleanupAt)) addAction("cleanupState", "정리 상태 점검", "남은 테스트 데이터 0건 여부를 확인합니다");
  if (!isToday(testMeta.lastCheckAt)) addAction("dbCleanup", "DB 삭제권한 점검", "정리 버튼 실행 권한을 확인합니다", "neutral");
  return actions.slice(0, 6);
}

export function adminPreReleaseManualActions(qaStore) {
  const checked = qaStore.checked || {};
  const actions = [];
  const mobileItems = [
    ["bottom-tabs", "홈/룩/관리/마이 하단 탭 반응"],
    ["cart-bar", "예약/장바구니 버튼 하단 고정"],
    ["checkout-entry", "고객 결제하기 진입"],
    ["vendor-flow", "입점업체 재고확인/픽업준비"],
    ["rider-open-call", "배송사 오픈콜 노출"],
    ["supabase-status", "핸드폰 앱 DB 연결 확인"],
    ["cleanup-after-test", "모바일 테스트 후 정리 0건"],
  ];
  const remainingMobile = mobileItems.filter(([itemId]) => !checked[adminQaChecklistItemKey("mobile-app", itemId)]);
  if (remainingMobile.length) {
    actions.push({
      itemId: "mobile-app",
      label: "설치형 앱 최종 점검",
      detail: remainingMobile.slice(0, 3).map(([, label]) => label).join(", ") + (remainingMobile.length > 3 ? " 외 " + (remainingMobile.length - 3) + "개" : ""),
      actionLabel: "모바일 앱 QA 열기",
    });
  }
  if (!checked[adminQaChecklistItemKey("final-scenario", "vendor-refund-action")]) {
    actions.push({
      itemId: "vendor-refund-action",
      label: "입점업체 승인/거절 버튼 확인",
      detail: "입점업체 주문 상세의 반품/환불 승인·거절 버튼을 확인합니다.",
      actionLabel: "입점업체 화면 열기",
    });
  }
  if (!checked[adminQaChecklistItemKey("final-scenario", "admin-refund-action")]) {
    actions.push({
      itemId: "admin-refund-action",
      label: "총관리자 환불 완료 버튼 확인",
      detail: "총관리자 반품환불 주문 상세의 환불 완료 버튼을 확인합니다.",
      actionLabel: "총관리자 주문 필터",
    });
  }
  return actions;
}

export function adminPreReleaseReportText(report, options = {}) {
  const timeLabel = options.timeLabel || ((value) => value || "기록 없음");
  return [
    "FitNow 운영 전 최종 점검 리포트",
    "결과: " + (report.allReady ? "배포 가능" : "확인 필요"),
    "준비 상태: " + report.readyCount + "/" + report.checks.length,
    "작성 시각: " + timeLabel(new Date().toISOString()),
    "최종 완료 시각: " + timeLabel(report.testMeta.lastPreReleaseReadyAt),
    "리포트 다운로드: " + timeLabel(report.testMeta.lastPreReleaseReportDownloadedAt),
    "",
    "준비 항목",
    ...report.checks.map((item) => "- " + item.label + ": " + (item.ready ? "OK" : "확인 필요") + " (" + item.detail + ")"),
    "",
    "남은 QA 항목",
    ...(report.remainingRows.length
      ? report.remainingRows.map((row) => "- " + row.sectionOrder + "-" + row.itemOrder + ". " + row.section + " / " + row.item)
      : ["- 없음"]),
    "",
    "추천 바로 실행",
    ...(report.quickActions.length
      ? report.quickActions.map((item) => "- " + item.label + ": " + item.detail)
      : ["- 없음"]),
    "",
    "수동 확인",
    ...(report.manualActions.length
      ? report.manualActions.map((item) => "- " + item.label + ": " + item.detail)
      : ["- 없음"]),
  ].join("\n");
}

export function qaScenarioActionLabel(action) {
  const labels = {
    deliveryOrder: "배송 테스트 주문 생성",
    deliveryFlow: "배송 플로우 자동 점검",
    deliveryCoverage: "배송권역/오픈콜 자동 점검",
    settlementFlow: "정산 플로우 점검",
    returnOrders: "반품/환불 테스트 4건 생성",
    returnVisibility: "반품/환불 표시 점검",
    excelDemo: "엑셀 테스트 6건 생성",
    cleanup: "테스트 데이터 정리",
    cleanupState: "정리 상태 점검",
    dbCleanup: "DB 삭제권한 점검",
  };
  return labels[action] || "QA 작업";
}

export function qaScenarioActionManualItems(action) {
  if (action === "returnOrders") {
    return ["고객/입점업체/관리자 화면에서 생성된 4건 노출 확인"];
  }
  if (action === "settlementFlow") {
    return ["정산 플로우 체크리스트 항목은 자동 체크됨", "최종 QA 시나리오 버튼 완료 표시는 수동 확인"];
  }
  if (action === "cleanup") {
    return ["정리 완료 메시지의 정리 후 자동검증 결과가 0건 정상인지 확인"];
  }
  if (action === "excelDemo") {
    return ["엑셀 다운로드 파일 열림/금액/상태값 수동 확인"];
  }
  if (action === "dbCleanup") {
    return ["권한 점검 결과 메시지가 성공인지 확인"];
  }
  return [];
}

export function qaScenarioActionSuccessUpdates(action) {
  const updates = {};
  if (action === "deliveryOrder") {
    updates[adminQaChecklistItemKey("final-scenario", "delivery-order")] = true;
  } else if (action === "deliveryFlow") {
    updates[adminQaChecklistItemKey("final-scenario", "delivery-order")] = true;
    updates[adminQaChecklistItemKey("final-scenario", "delivery-proof")] = true;
  } else if (action === "deliveryCoverage") {
    updates[adminQaChecklistItemKey("final-scenario", "delivery-order")] = true;
    updates[adminQaChecklistItemKey("final-scenario", "delivery-coverage")] = true;
  } else if (action === "settlementFlow") {
    ["test-order-created", "paid", "paid-tab", "logs-updated"].forEach((itemId) => {
      updates[adminQaChecklistItemKey("settlement-flow", itemId)] = true;
    });
  } else if (action === "returnVisibility") {
    updates[adminQaChecklistItemKey("final-scenario", "return-refund-visible")] = true;
  }
  return updates;
}
