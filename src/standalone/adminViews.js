import { riderNicknamesForPartner, riderWorkBadge } from "./riders.js";

export function riderWorkBoardMarkup(rows, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  if (!rows.length) return '<div class="line-item"><span>등록된 기사가 없습니다</span><strong>확인 필요</strong></div>';
  return rows.map((row) => {
    const badge = riderWorkBadge(row);
    return `
      <div class="vendor-product-row admin-order-row">
        <div>
          <strong>${row.riderName} <span class="admin-status-badge ${badge.cls}">${badge.label}</span></strong>
          <span>${row.partnerName}</span>
          <span>배정 ${row.assigned}건 · 픽업필요 ${row.pickupMissing}건 · 배송시작 ${row.deliveryStartReady}건 · 도착필요 ${row.arrivalMissing}건</span>
          <span>완료 ${row.done}건 · 정산 예정 ${formatKRW(row.payout)}</span>
        </div>
        <div class="mini-actions">
          <button type="button" onclick="focusRiderOrders('${row.riderName}', 'all')">전체</button>
          <button type="button" ${row.pickupMissing ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'pickup_proof')">픽업 인증</button>
          <button type="button" ${row.deliveryStartReady ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'delivery_start')">배송 시작</button>
          <button type="button" ${row.arrivalMissing ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'arrival_proof')">도착 인증</button>
          <button type="button" ${row.completionReady ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'delivery_finish')">완료 처리</button>
          <button type="button" ${row.done ? "" : "disabled"} onclick="focusRiderOrders('${row.riderName}', 'done')">완료</button>
        </div>
      </div>
    `;
  }).join("");
}

export function riderNicknameManagerMarkup(visiblePartners) {
  return visiblePartners.map((partner) => {
    const nicknames = riderNicknamesForPartner(partner);
    return `
      <details class="admin-store-group" open>
        <summary>${partner.name} <span>${nicknames.length}명</span></summary>
        <div class="vendor-form size-stock-grid" style="margin-top: 9px;">
          ${nicknames.map((name, index) => `
            <label>기사 ${index + 1}
              <input type="text" value="${name}" onchange="updateRiderNickname('${partner.name}', ${index}, this.value)" />
            </label>
          `).join("")}
        </div>
      </details>
    `;
  }).join("");
}

export function adminModeBannerMarkup(diagnostic, retentionLabel) {
  return `
    <div class="admin-mode-banner ${diagnostic.hasTestState ? "test" : "live"}">
      <div>
        <span>${diagnostic.hasTestState ? "TEST MODE" : "OPERATING MODE"}</span>
        <strong>${diagnostic.hasTestState ? "테스트 데이터가 남아 있습니다" : "운영 데이터 기준 화면입니다"}</strong>
        <p>${diagnostic.hasTestState ? "테스트 주문 " + diagnostic.orders + "건 · 테스트 상태 " + diagnostic.statuses + "건 · 점검 로그 " + diagnostic.logs + "건 · " + retentionLabel + " 초과 자동 정리" : "점검 로그와 테스트 주문이 없는 상태입니다."}</p>
      </div>
      ${diagnostic.hasTestState ? '<button type="button" onclick="clearAdminTestData()">정리</button>' : '<em>정상</em>'}
    </div>
  `;
}

export function adminReleaseReadinessMarkup(data) {
  const itemMarkup = data.items.map((item) => `
    <div class="${item.ready ? "ready" : "pending"}">
      <span>${item.label}</span>
      <strong>${item.ready ? "OK" : "확인 필요"}</strong>
      <em>${item.detail}</em>
    </div>
  `).join("");
  return `
    <div class="admin-release-readiness ${data.allReady ? "ready" : "pending"}">
      <div class="admin-release-readiness-head">
        <div>
          <span>배포 준비 상태</span>
          <strong>${data.allReady ? "배포 전 필수 점검 완료" : "배포 전 확인 항목이 남아 있습니다"}</strong>
        </div>
        <em>${data.readyCount}/4</em>
      </div>
      <div class="admin-release-readiness-grid">${itemMarkup}</div>
      <div class="admin-release-actions">
        <button class="primary" type="button" onclick="openAdminPreReleaseCheck()">최종 점검 모드</button>
        <button class="neutral" type="button" onclick="openAdminQaChecklist()">QA 체크리스트</button>
        <button class="success" type="button" ${data.diagnostic.hasTestState ? "" : "disabled"} onclick="clearAdminTestData()">테스트 데이터 정리</button>
        <button class="warning" type="button" onclick="openSettlementStatement()">정산서 미리보기</button>
        <button class="primary" type="button" ${data.settlementExportCount ? "" : "disabled"} onclick="downloadSettlementCsv('all')">정산 CSV ${data.settlementExportCount}건</button>
      </div>
    </div>
  `;
}

export function deliveryWorkShortcutsMarkup(items, adminName) {
  const urgentCount = items.slice(0, 5).reduce((sum, item) => sum + item.count, 0);
  return `
    <div class="delivery-work-shortcuts ${urgentCount ? "pending" : "ready"}">
      <div class="delivery-work-shortcuts-head">
        <div>
          <span>배송 작업 바로가기</span>
          <strong>${urgentCount ? "지금 처리할 배송 작업 " + urgentCount + "건" : "현재 긴급 배송 작업 없음"}</strong>
        </div>
        <em>${adminName}</em>
      </div>
      <div class="delivery-work-shortcut-grid">
        ${items.map((item) => `
          <button type="button" ${item.count ? "" : "disabled"} onclick="focusDeliveryWorkShortcut('${item.key}')">
            <span>${item.label}</span>
            <strong>${item.count}건</strong>
            <em>${item.detail}</em>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function adminTodoBoardMarkup(items = []) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return `
    <div class="admin-todo-board">
      <div class="admin-todo-head">
        <strong>오늘 처리할 운영 TODO</strong>
        <span>${total ? total + "건 확인 필요" : "긴급 처리 항목 없음"}</span>
      </div>
      <div class="admin-todo-grid">
        ${items.map((item) => `
          <button type="button" class="admin-todo-card ${item.cls}" data-admin-todo="${item.key}" aria-label="${item.label} ${item.count}건 ${item.count ? item.action : "완료"}" ${item.count ? "" : "disabled"}>
            <span>${item.label}</span>
            <strong>${item.count}건</strong>
            <em>${item.detail}</em>
            <small>${item.count ? item.action : "완료"}</small>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function adminHomeBoardMarkup(data, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const todoBoardMarkup = options.todoBoardMarkup || "";
  const { alerts, diagnostic, retentionLabel, stats, totals } = data;
  const diagnosticNotice = diagnostic.hasTestState ? `
    <div class="admin-test-notice">
      <div>
        <span>운영 확인 전 정리 필요</span>
        <strong>테스트 데이터가 운영 TODO에 섞일 수 있습니다.</strong>
        <p>테스트 주문 ${diagnostic.orders}건 · 테스트 상태 ${diagnostic.statuses}건 · 점검 로그 ${diagnostic.logs}건 · ${retentionLabel} 초과 자동 정리</p>
      </div>
      <button type="button" onclick="clearAdminTestData()">테스트 데이터 정리</button>
    </div>
  ` : "";
  return `
    ${diagnosticNotice}
    ${todoBoardMarkup}
    <div class="vendor-home-grid">
      <div class="vendor-home-tile"><span>오늘 총주문</span><strong>${totals.todayOrders}건</strong></div>
      <div class="vendor-home-tile"><span>결제완료</span><strong>${totals.paidOrders}건</strong></div>
      <div class="vendor-home-tile"><span>배송중</span><strong>${totals.deliveringOrders}건</strong></div>
      <div class="vendor-home-tile"><span>환불대기</span><strong>${totals.refundPendingOrders}건</strong></div>
      <div class="vendor-home-tile"><span>오늘 총매출</span><strong>${formatKRW(totals.todaySales)}</strong></div>
      <div class="vendor-home-tile"><span>입점업체</span><strong>${stats.length}곳</strong></div>
    </div>
    <div class="vendor-alert-list">
      ${alerts.map((alert) => '<div class="vendor-alert-row ' + (alert.good ? 'good' : '') + '">' + alert.text + '</div>').join("")}
    </div>
    <div class="admin-tool-actions">
      <button class="admin-tool-action primary" type="button" onclick="openAdminFinalQaScenario()">QA 시나리오</button>
      <button class="admin-tool-action" type="button" data-admin-cleanup-check="true">DB 삭제권한 점검</button>
    </div>
    <div class="admin-utility-status" data-return-refund-visibility-status aria-live="polite">반품/환불 표시 점검 결과가 여기에 표시됩니다.</div>
    <div class="admin-utility-status" data-admin-cleanup-status aria-live="polite">DB 삭제권한 점검 결과가 여기에 표시됩니다.</div>
  `;
}

export function deliveryWarningsMarkup(items = [], options = {}) {
  const assignedRiderLabel = options.assignedRiderLabel || (() => "기사 미배정");
  if (!items.length) return '<div class="line-item"><span>주의 주문이 없습니다</span><strong>정상</strong></div>';
  return items.map(({ order, warning }) => {
    const storeNames = order.items.map((item) => item.showroom).filter((store, idx, stores) => stores.indexOf(store) === idx).join(", ");
    const timeText = warning.overdue > 0
      ? "기준 " + warning.limit + "분 초과 +" + warning.overdue + "분"
      : "기준 " + warning.limit + "분 · 남은 " + warning.remaining + "분";
    return `
      <div class="vendor-product-row admin-order-row">
        <div>
          <strong>${order.id} · ${warning.title} <span class="admin-status-badge ${warning.cls}">${warning.severity} ${warning.minutes}분</span></strong>
          <span>${warning.detail}</span>
          <span>필요 조치: ${warning.action} · ${timeText}</span>
          <span>${storeNames || "업체 미확인"} → ${order.address}</span>
          <span>${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</span>
        </div>
        <div class="mini-actions order-detail-action">
          <button type="button" onclick="openAdminOrderDetail('${order.id}')">상세보기</button>
        </div>
      </div>
    `;
  }).join("");
}

export function deliveryRiderGroupsMarkup(orders = [], emptyText, badge, actionLabel, actionStep, options = {}) {
  const assignedRiderLabel = options.assignedRiderLabel || (() => "기사 미배정");
  const canCurrentAdminManageOrder = options.canCurrentAdminManageOrder || (() => false);
  const deliveryAreaLabel = options.deliveryAreaLabel || (() => "오산/동탄");
  const deliveryNextActionState = options.deliveryNextActionState || (() => ({ label: "확인 필요", detail: "주문 상태를 확인해 주세요.", cls: "waiting" }));
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const hasDeliveryProof = options.hasDeliveryProof || (() => false);
  const riderLoadBadge = options.riderLoadBadge || (() => ({ label: "대기", cls: "ready" }));
  if (!orders.length) return '<div class="line-item"><span>' + emptyText + '</span><strong>대기</strong></div>';
  const grouped = orders.reduce((groups, order) => {
    const rider = assignedRiderLabel(order);
    groups[rider] = groups[rider] || [];
    groups[rider].push(order);
    return groups;
  }, {});
  return Object.entries(grouped).map(([rider, riderOrders], index) => {
    const riderAreas = riderOrders.map(deliveryAreaLabel).filter((area, idx, areas) => areas.indexOf(area) === idx).join(" / ");
    const riderFeeTotal = riderOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
    const loadBadge = riderLoadBadge(riderOrders, badge);
    return `
      <details class="admin-store-group" ${index === 0 ? "open" : ""}>
        <summary>${rider} <span class="admin-status-badge admin-store-risk ${loadBadge.cls}">${loadBadge.label}</span> <span>${badge.label} ${riderOrders.length}건 · ${riderAreas}</span></summary>
        <div class="rider-summary-grid">
          <div>
            <span>${badge.label}</span>
            <strong>${riderOrders.length}건</strong>
          </div>
          <div>
            <span>담당 지역</span>
            <strong>${riderAreas}</strong>
          </div>
          <div>
            <span>총 배송비</span>
            <strong>${formatKRW(riderFeeTotal)}</strong>
          </div>
          <div>
            <span>현재 상태</span>
            <strong>${loadBadge.label}</strong>
          </div>
        </div>
        <div class="admin-store-orders">
          ${riderOrders.map((order) => {
            const storeNames = order.items.map((item) => item.showroom).filter((store, idx, stores) => stores.indexOf(store) === idx).join(", ");
            const nextState = deliveryNextActionState(order);
            const canRunAction = actionLabel && (
              (actionStep === 3 && nextState.label === "배송중 처리 가능") ||
              (actionStep === 4 && nextState.label === "배송완료 가능")
            );
            let actionMarkup = "";
            if (actionLabel) {
              let buttonLabel = canRunAction ? actionLabel : nextState.label;
              let buttonAction = `adminAdvanceOrder('${order.id}', ${actionStep})`;
              let buttonEnabled = canRunAction;
              if (actionStep === 3 && nextState.label === "픽업 인증 필요") {
                buttonLabel = "픽업 인증";
                buttonAction = `startDeliveryProofCapture('${order.id}', 'pickup')`;
                buttonEnabled = canCurrentAdminManageOrder(order);
              } else if (actionStep === 4 && nextState.label === "도착 인증 필요") {
                buttonLabel = "도착 인증";
                buttonAction = `startDeliveryProofCapture('${order.id}', 'arrival')`;
                buttonEnabled = canCurrentAdminManageOrder(order);
              }
              actionMarkup = `<div class="mini-actions order-detail-action"><button type="button" ${buttonEnabled ? "" : "disabled"} onclick="${buttonAction}">${buttonLabel}</button></div>`;
            }
            return `
              <div class="vendor-product-row admin-order-row">
                <div>
                  <strong>${order.id} · ${badge.label} <span class="admin-status-badge ${nextState.cls}">${nextState.label}</span></strong>
                  <span>${storeNames || "업체 미확인"} · ${order.deliveryPartnerName || "지금배송 배정"}</span>
                  <span>${order.address}</span>
                  <span>다음 작업: ${nextState.detail}</span>
                  <span>픽업 ${hasDeliveryProof(order, "pickup") ? "인증완료" : "미인증"} · 도착 ${hasDeliveryProof(order, "arrival") ? "인증완료" : "미인증"}</span>
                </div>
                ${actionMarkup}
              </div>
            `;
          }).join("")}
        </div>
      </details>
    `;
  }).join("");
}

export function deliveryClaimOrdersMarkup(orders = [], options = {}) {
  const canCurrentDeliveryClaimOrder = options.canCurrentDeliveryClaimOrder || (() => false);
  const currentAdminName = options.currentAdminName || "";
  const deliveryNextActionState = options.deliveryNextActionState || (() => ({ label: "확인 필요", detail: "주문 상태를 확인해 주세요.", cls: "waiting" }));
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const riderOptionsForPartner = options.riderOptionsForPartner || (() => "");
  const totalAdminActions = !!options.totalAdminActions;
  if (!orders.length) return '<div class="line-item"><span>현재 배정 대기 주문이 없습니다</span><strong>대기</strong></div>';
  return orders.map((order) => {
    const storeNames = order.items.map((item) => item.showroom).filter((store, idx, stores) => stores.indexOf(store) === idx).join(", ");
    const pickupText = storeNames || "픽업지 확인 필요";
    const nextState = deliveryNextActionState(order);
    const canClaim = canCurrentDeliveryClaimOrder(order);
    const deliverySelectId = "claimRider-" + order.id;
    const dongtanSelectId = "claimDongtanRider-" + order.id;
    const osanSelectId = "claimOsanRider-" + order.id;
    return `
      <div class="vendor-product-row admin-order-row">
        <div>
          <strong>${order.id} · 오픈콜 <span class="admin-status-badge ${nextState.cls}">${nextState.label}</span></strong>
          <span>픽업지: ${pickupText}</span>
          <span>도착지: ${order.address}</span>
          <span>다음 작업: ${nextState.detail}</span>
          <span>상품 ${order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}개 · 배송비 ${order.deliveryFee ? formatKRW(order.deliveryFee) : "무료"}</span>
        </div>
        <div class="mini-actions order-detail-action">
          ${totalAdminActions ? `
            <select id="${dongtanSelectId}">${riderOptionsForPartner("지금배송 동탄센터")}</select>
            <button type="button" onclick="adminAssignDelivery('${order.id}', '지금배송 동탄센터', selectedValue('${dongtanSelectId}'))">동탄센터 배정</button>
            <select id="${osanSelectId}">${riderOptionsForPartner("지금배송 오산센터")}</select>
            <button type="button" onclick="adminAssignDelivery('${order.id}', '지금배송 오산센터', selectedValue('${osanSelectId}'))">오산센터 배정</button>
          ` : `
            ${canClaim ? `<select id="${deliverySelectId}">${riderOptionsForPartner(currentAdminName)}</select>` : ""}
            <button type="button" ${canClaim ? "" : "disabled"} onclick="claimDeliveryOrder('${order.id}', selectedValue('${deliverySelectId}'))">${canClaim ? "내가 배정받기" : "배송사 로그인 필요"}</button>
          `}
        </div>
      </div>
    `;
  }).join("");
}

export function adminOrderAssignmentActionsMarkup(state, options = {}) {
  const {
    order,
    adminRole,
    currentPartner,
    cancelled,
    readyForDelivery,
    selectIds = {},
  } = state;
  const assignedRiderLabel = options.assignedRiderLabel || (() => "기사 미배정");
  const isDeliveryOrderClaimed = options.isDeliveryOrderClaimed || (() => false);
  const riderOptionsForPartner = options.riderOptionsForPartner || (() => "");
  if (adminRole !== "total") return "";
  return `
    <div class="order-detail-block">
      <strong>지금배송 배정 운영</strong>
      <span>현재 배정: ${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</span>
      <span>총관리자는 배송사 사정에 따라 회수하거나 다른 센터로 변경할 수 있습니다.</span>
    </div>
    <div class="mini-actions">
      <select id="${selectIds.dongtanDetail}">${riderOptionsForPartner("지금배송 동탄센터", order.riderName)}</select>
      <button type="button" ${!cancelled && readyForDelivery ? "" : "disabled"} onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 동탄센터', selectedValue('${selectIds.dongtanDetail}'))">동탄센터 배정</button>
      <select id="${selectIds.osanDetail}">${riderOptionsForPartner("지금배송 오산센터", order.riderName)}</select>
      <button type="button" ${!cancelled && readyForDelivery ? "" : "disabled"} onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 오산센터', selectedValue('${selectIds.osanDetail}'))">오산센터 배정</button>
      ${currentPartner && order.deliveryPartnerName ? `<select id="${selectIds.currentRider}">${riderOptionsForPartner(currentPartner.name, order.riderName)}</select><button type="button" ${!cancelled ? "" : "disabled"} onclick="adminChangeRiderFromDetail('${order.id}', selectedValue('${selectIds.currentRider}'))">담당 기사 변경</button>` : ""}
      <button type="button" ${!cancelled && isDeliveryOrderClaimed(order) ? "" : "disabled"} onclick="adminReleaseDeliveryFromDetail('${order.id}')">다시 오픈콜</button>
      <button class="danger" type="button" ${!cancelled && isDeliveryOrderClaimed(order) ? "" : "disabled"} onclick="adminReleaseDeliveryFromDetail('${order.id}')">배정 회수</button>
    </div>
  `;
}

export function adminOrderPrimaryActionMarkup(state, options = {}) {
  const {
    order,
    adminRole,
    adminName,
    cancelled,
    readyForDelivery,
    pickupAuthed,
    arrivalAuthed,
    proofActionReady,
    deliveryActionReady,
    deliveryCompleteReady,
    canClaimDeliveryOrder,
    step,
    selectIds = {},
  } = state;
  const isDeliveryOrderClaimed = options.isDeliveryOrderClaimed || (() => false);
  const riderOptionsForPartner = options.riderOptionsForPartner || (() => "");
  if (cancelled) return '<div class="rider-primary-actions"><button type="button" disabled>취소된 주문</button></div>';
  if (!readyForDelivery) return '<div class="rider-primary-actions"><button type="button" disabled>업체 픽업 준비 대기</button></div>';
  if (!isDeliveryOrderClaimed(order)) {
    if (adminRole === "total") {
      return `
        <div class="rider-primary-actions">
          <select id="${selectIds.topDongtan}">${riderOptionsForPartner("지금배송 동탄센터")}</select>
          <button type="button" onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 동탄센터', selectedValue('${selectIds.topDongtan}'))">동탄센터 배정</button>
          <select id="${selectIds.topOsan}">${riderOptionsForPartner("지금배송 오산센터")}</select>
          <button type="button" onclick="adminAssignDeliveryFromDetail('${order.id}', '지금배송 오산센터', selectedValue('${selectIds.topOsan}'))">오산센터 배정</button>
        </div>
      `;
    }
    if (adminRole === "delivery" && canClaimDeliveryOrder) {
      return `
        <div class="rider-primary-actions">
          <select id="${selectIds.topClaim}">${riderOptionsForPartner(adminName)}</select>
          <button type="button" onclick="claimDeliveryOrderFromDetail('${order.id}', selectedValue('${selectIds.topClaim}'))">내가 배정받기</button>
        </div>
      `;
    }
    return '<div class="rider-primary-actions"><button type="button" disabled>배송사 배정 필요</button></div>';
  }
  if (!pickupAuthed) {
    return '<div class="rider-primary-actions"><button type="button" ' + (proofActionReady ? "" : "disabled") + ' onclick="startDeliveryProofCapture(\'' + order.id + '\', \'pickup\')">사진 찍고 픽업 인증</button></div>';
  }
  if (step < 3) {
    return '<div class="rider-primary-actions"><button type="button" ' + (deliveryActionReady ? "" : "disabled") + ' onclick="adminAdvanceOrderFromDetail(\'' + order.id + '\', 3)">배송 시작 처리</button></div>';
  }
  if (!arrivalAuthed) {
    return '<div class="rider-primary-actions"><button type="button" ' + (proofActionReady ? "" : "disabled") + ' onclick="startDeliveryProofCapture(\'' + order.id + '\', \'arrival\')">사진 찍고 도착 인증</button></div>';
  }
  if (step < 4) {
    return '<div class="rider-primary-actions"><button type="button" ' + (deliveryCompleteReady ? "" : "disabled") + ' onclick="adminAdvanceOrderFromDetail(\'' + order.id + '\', 4)">배송완료 처리</button></div>';
  }
  return '<div class="rider-primary-actions"><button type="button" disabled>배송완료됨</button></div>';
}

export function adminOrderDetailMarkup(state, options = {}) {
  const {
    order,
    step,
    cancelled,
    readyForDelivery,
    pickupAuthed,
    arrivalAuthed,
    deliveryActionReady,
    deliveryCompleteReady,
    proofActionReady,
    nextState,
    pickupSummary,
    itemSummary,
    itemCount,
    settlementSummary,
    primaryActionMarkup,
    assignmentActions,
    adminRole,
  } = state;
  const assignedRiderLabel = options.assignedRiderLabel || (() => "기사 미배정");
  const canCancelOrder = options.canCancelOrder || (() => false);
  const canCompleteRefund = options.canCompleteRefund || (() => false);
  const canReviewReturnRefund = options.canReviewReturnRefund || (() => false);
  const cancelReasonLabel = options.cancelReasonLabel || (() => "미확인");
  const customerRefundStatusLabel = options.customerRefundStatusLabel || (() => "");
  const deliveryProofLabel = options.deliveryProofLabel || (() => "확인 필요");
  const deliveryProofPhoto = options.deliveryProofPhoto || (() => null);
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const isDeliveryOrderClaimed = options.isDeliveryOrderClaimed || (() => false);
  const isOpenRefundStatus = options.isOpenRefundStatus || (() => false);
  const orderDisplayLabel = options.orderDisplayLabel || (() => "주문");
  const paymentLabelForOrder = options.paymentLabelForOrder || (() => "결제 확인 필요");
  const renderDeliveryLogs = options.renderDeliveryLogs || (() => "");
  const renderDeliveryProofPhoto = options.renderDeliveryProofPhoto || (() => "");
  const renderSettlementAuditTrail = options.renderSettlementAuditTrail || (() => "");
  const returnRefundProcessInfo = options.returnRefundProcessInfo || (() => ({ label: "처리 기한 확인 필요" }));
  const groupedItems = (order.items || []).reduce((groups, item) => {
    const store = item.showroom || "업체 미확인";
    groups[store] = groups[store] || [];
    groups[store].push(item);
    return groups;
  }, {});
  return `
    <div class="order-detail-grid">
      <div class="rider-task-panel">
        <div class="rider-task-head">
          <span class="admin-status-badge ${nextState.cls}">${nextState.label}</span>
          <strong>${order.id}</strong>
          <p>${nextState.detail}</p>
        </div>
        <div class="rider-task-grid">
          <div>
            <span>픽업지</span>
            <strong>${pickupSummary}</strong>
          </div>
          <div>
            <span>도착지</span>
            <strong>${order.address || "도착지 확인 필요"}</strong>
          </div>
          <div>
            <span>상품</span>
            <strong>${itemCount}개 · ${itemSummary}</strong>
          </div>
          <div>
            <span>고객 요청</span>
            <strong>${order.receiveType || "문앞 수령"} · ${order.riderRequest || "요청 없음"}</strong>
          </div>
          <div>
            <span>담당</span>
            <strong>${order.deliveryPartnerName || "오픈콜 대기"} · ${assignedRiderLabel(order)}</strong>
          </div>
          <div>
            <span>인증</span>
            <strong>픽업 ${pickupAuthed ? "완료" : "필요"} · 도착 ${arrivalAuthed ? "완료" : "필요"}</strong>
          </div>
          <div>
            <span>정산 상태</span>
            <strong>${settlementSummary.status} · 배송비 ${formatKRW(order.deliveryFee || 0)}</strong>
          </div>
          <div>
            <span>기사 정산</span>
            <strong>${settlementSummary.ready ? formatKRW(settlementSummary.payout) : "예정 " + formatKRW(settlementSummary.payout)} · ${settlementSummary.rate}%</strong>
          </div>
        </div>
        ${primaryActionMarkup}
      </div>
      <div class="order-detail-block">
        <strong>${orderDisplayLabel(order)} · ${formatKRW(order.total || order.subtotal || 0)}</strong>
        <span>운영 상태: ${cancelled ? "취소 완료" : readyForDelivery ? "배송 처리 가능" : "업체 픽업 준비 대기"}</span>
        <span>다음 작업: ${nextState.label} · ${nextState.detail}</span>
        <span>배송 담당: ${assignedRiderLabel(order)}</span>
      </div>
      <div class="order-detail-block">
        <strong>업체별 상품 구성</strong>
        ${Object.entries(groupedItems).map(([store, items]) => '<span>' + store + ' · ' + items.map((item) => item.name + ' ' + (item.size || 'One size') + ' x ' + (item.quantity || 0)).join(', ') + '</span>').join("")}
      </div>
      <div class="order-detail-block">
        <strong>수령 · 결제 정보</strong>
        <span>${order.address}</span>
        <span>${order.receiveType || "문앞 수령"} · 요청: ${order.riderRequest || "없음"}</span>
        <span>${order.paymentMethod || "카카오페이"} · ${paymentLabelForOrder(order)}</span>
      </div>
      <div class="order-detail-block">
        <strong>픽업 · 도착 인증</strong>
        <span>픽업 인증: ${deliveryProofLabel(order, "pickup")}</span>
        <span>도착 인증: ${deliveryProofLabel(order, "arrival")}</span>
        ${renderDeliveryProofPhoto(deliveryProofPhoto(order, "pickup"), "픽업 인증 사진")}
        ${renderDeliveryProofPhoto(deliveryProofPhoto(order, "arrival"), "도착 인증 사진")}
      </div>
      <div class="order-detail-block">
        <strong>정산 처리 이력</strong>
        <span>확정, 지급, 보류, 마감 기록을 시간순으로 확인합니다.</span>
        ${renderSettlementAuditTrail(order)}
      </div>
      <div class="mini-actions">
        <button type="button" ${proofActionReady && !pickupAuthed ? "" : "disabled"} onclick="startDeliveryProofCapture('${order.id}', 'pickup')">${pickupAuthed ? "픽업 인증됨" : "사진 픽업 인증"}</button>
        <button type="button" ${proofActionReady && step >= 3 && !arrivalAuthed ? "" : "disabled"} onclick="startDeliveryProofCapture('${order.id}', 'arrival')">${arrivalAuthed ? "도착 인증됨" : step < 3 ? "배송중 이후 가능" : "사진 도착 인증"}</button>
      </div>
      ${cancelled ? `
        <div class="order-detail-block">
          <strong>취소 · 환불</strong>
          <span>취소 분류: ${cancelReasonLabel(order)}</span>
          <span>취소 사유: ${order.cancelReason || "사유 미입력"}</span>
          <span>환불 상태: ${paymentLabelForOrder(order)}</span>
          ${order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) ? '<span>처리 기한: ' + returnRefundProcessInfo(order).label + '</span>' : ""}
          ${order.refundHandledBy ? '<span>처리자: ' + order.refundHandledBy + '</span>' : ""}
          ${order.refundMemo ? '<span>처리 메모: ' + order.refundMemo + '</span>' : ""}
        </div>
      ` : ""}
      <div class="vendor-detail-actions admin-detail-actions">
        <div class="vendor-detail-action-group">
          <strong>배송 처리</strong>
          ${cancelled ? '<span>취소된 주문이라 배송 중, 배송 완료, 주문 취소 처리는 닫혔습니다.</span>' : `
            <div class="mini-actions vendor-detail-action-buttons">
              <button type="button" ${deliveryActionReady ? "" : "disabled"} onclick="adminAdvanceOrderFromDetail('${order.id}', 3)">${!readyForDelivery ? "픽업 대기" : !isDeliveryOrderClaimed(order) ? "배정 대기" : !pickupAuthed ? "픽업 인증 필요" : step >= 3 ? "배송 중 처리됨" : "배송 중"}</button>
              <button type="button" ${deliveryCompleteReady ? "" : "disabled"} onclick="adminAdvanceOrderFromDetail('${order.id}', 4)">${step < 3 ? "배송 대기" : !arrivalAuthed ? "도착 인증 필요" : step >= 4 ? "배송 완료됨" : "배송 완료"}</button>
              <button class="danger" type="button" ${adminRole === "total" && canCancelOrder(order) ? "" : "disabled"} onclick="cancelAdminOrderFromDetail('${order.id}')">${adminRole === "total" ? "주문 취소" : "총관리자 전용"}</button>
            </div>
          `}
        </div>
        ${order.cancelReasonCode === "return_refund" ? `
          <div class="vendor-detail-action-group refund-action-group">
            <strong>반품/환불 처리</strong>
            <span>${customerRefundStatusLabel(order) || paymentLabelForOrder(order)} · ${isOpenRefundStatus(order) ? returnRefundProcessInfo(order).label : "처리 완료"}</span>
            <div class="refund-action-buttons">
              <button class="refund-approve" type="button" ${adminRole === "total" && canReviewReturnRefund(order) ? "" : "disabled"} onclick="approveReturnRefundFromDetail('${order.id}')">승인</button>
              <button class="refund-reject" type="button" ${adminRole === "total" && canReviewReturnRefund(order) ? "" : "disabled"} onclick="rejectReturnRefundFromDetail('${order.id}')">거절</button>
              <button class="refund-complete" type="button" ${adminRole === "total" && canCompleteRefund(order) ? "" : "disabled"} onclick="completeRefundFromDetail('${order.id}')">${adminRole === "total" && canCompleteRefund(order) ? "환불 완료" : adminRole === "total" ? paymentLabelForOrder(order) : "총관리자 전용"}</button>
            </div>
          </div>
        ` : ""}
      </div>
      ${assignmentActions}
      <div class="order-detail-block">
        <strong>배송 운영 로그</strong>
        <span>배정, 회수, 배송 상태 변경 이력이 시간순으로 기록됩니다.</span>
      </div>
      <div class="admin-store-orders">
        ${renderDeliveryLogs(order)}
      </div>
    </div>
  `;
}

export function adminOrderListRowData(order, options = {}) {
  const assignedRiderLabel = options.assignedRiderLabel || (() => "기사 미배정");
  const cancelReasonLabel = options.cancelReasonLabel || (() => "미확인");
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const isOpenRefundStatus = options.isOpenRefundStatus || (() => false);
  const isOrderCancelled = options.isOrderCancelled || (() => false);
  const orderDisplayLabel = options.orderDisplayLabel || (() => "주문");
  const returnRefundProcessInfo = options.returnRefundProcessInfo || (() => ({ label: "처리 기한 확인 필요", overdue: false }));
  const adminOrderBadge = options.adminOrderBadge || (() => ({ cls: "ready", label: "확인" }));
  const step = order.progressStep || 0;
  const cancelled = isOrderCancelled(order);
  const readyForDelivery = !cancelled && step >= 2;
  const storeNames = order.items.map((item) => item.showroom).filter((store, index, stores) => stores.indexOf(store) === index).join(", ");
  const orderTotal = order.total || order.subtotal || 0;
  const actionStatus = cancelled ? "취소 완료" : readyForDelivery ? "배송 처리 가능" : "업체 픽업 준비 대기";
  const primaryStore = storeNames.split(", ")[0] || "업체 미확인";
  const badge = adminOrderBadge(order);
  return {
    store: primaryStore,
    cancelled,
    readyForDelivery,
    refundPending: isOpenRefundStatus(order),
    refundOverdue: order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) && returnRefundProcessInfo(order).overdue,
    completed: !cancelled && step >= 4,
    total: orderTotal,
    markup: `
      <div class="vendor-product-row admin-order-row">
        <div>
          <strong>${order.id} · ${orderDisplayLabel(order)} <span class="admin-status-badge ${badge.cls}">${badge.label}</span></strong>
          <span>${storeNames || "업체 미확인"} · ${formatKRW(orderTotal)}</span>
          <span>${order.address} · ${assignedRiderLabel(order)}</span>
          <span>${order.paymentMethod || "카카오페이"} · ${actionStatus}</span>
          ${cancelled ? '<span>취소 분류: ' + cancelReasonLabel(order) + '</span>' : ""}
          ${order.cancelReasonCode === "return_refund" && isOpenRefundStatus(order) ? '<span>처리 기한: ' + returnRefundProcessInfo(order).label + '</span>' : ""}
        </div>
        <div class="mini-actions order-detail-action">
          <button type="button" onclick="openAdminOrderDetail('${order.id}')">상세보기</button>
        </div>
      </div>
    `,
  };
}

export function adminOrderGroupedListMarkup(orderRows, options = {}) {
  const adminOrderSearchQuery = options.adminOrderSearchQuery || "";
  const adminStoreRiskBadge = options.adminStoreRiskBadge || (() => ({ cls: "ready", label: "정상" }));
  const adminStoreRiskMetrics = options.adminStoreRiskMetrics || (() => ({
    pickupWaiting: 0,
    refundWaiting: 0,
    refundOverdue: 0,
    cancelRate: 0,
    stoppedItems: 0,
    payout: 0,
  }));
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const grouped = orderRows.reduce((groups, row) => {
    groups[row.store] = groups[row.store] || [];
    groups[row.store].push(row);
    return groups;
  }, {});
  return orderRows.length ? Object.entries(grouped).map(([store, rows], index) => {
    const readyCount = rows.filter((row) => row.readyForDelivery).length;
    const cancelledCount = rows.filter((row) => row.cancelled).length;
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const risk = adminStoreRiskBadge(store, rows);
    const metrics = adminStoreRiskMetrics(store, rows);
    const reportStatus = metrics.refundWaiting || metrics.pickupWaiting || metrics.cancelRate >= 30 || metrics.stoppedItems
      ? "확인 필요"
      : "현재 운영 상태 정상";
    return `
      <details class="admin-store-group" ${index === 0 ? "open" : ""}>
        <summary>${store} <span class="admin-status-badge admin-store-risk ${risk.cls}">${risk.label}</span> <span>${rows.length}건 · 배송가능 ${readyCount}건 · 취소 ${cancelledCount}건 · ${formatKRW(total)}</span></summary>
        <div class="admin-store-report">
          <div><span>리스크 요약</span><strong>${reportStatus}</strong></div>
          <div><span>픽업대기</span><strong>${metrics.pickupWaiting}건</strong></div>
          <div><span>환불대기</span><strong>${metrics.refundWaiting}건</strong></div>
          <div><span>처리지연</span><strong>${metrics.refundOverdue}건</strong></div>
          <div><span>취소율</span><strong>${metrics.cancelRate}%</strong></div>
          <div><span>품절/숨김</span><strong>${metrics.stoppedItems}개</strong></div>
          <div><span>정산 예정</span><strong>${formatKRW(metrics.payout)}</strong></div>
        </div>
        <div class="admin-store-orders">
          ${rows.map((row) => row.markup).join("")}
        </div>
      </details>
    `;
  }).join("") : '<div class="line-item"><span>' + (adminOrderSearchQuery ? "검색 결과가 없습니다" : "이 조건에 맞는 주문이 없습니다") + '</span><strong>' + (adminOrderSearchQuery ? "검색어 확인" : "필터 변경") + '</strong></div>';
}

export function adminReviewModerationSummaryMarkup(reviews = []) {
  const hiddenCount = reviews.filter((review) => review.isHidden).length;
  const visibleCount = reviews.length - hiddenCount;
  return `
    <div class="admin-review-summary">
      <div><span>공개 리뷰</span><strong>${visibleCount}건</strong></div>
      <div><span>숨김 리뷰</span><strong>${hiddenCount}건</strong></div>
      <div><span>전체 리뷰</span><strong>${reviews.length}건</strong></div>
    </div>
  `;
}

export function adminReviewModerationListMarkup(reviews = [], options = {}) {
  const renderReviewPhoto = options.renderReviewPhoto || (() => "");
  const reviewModerationKey = options.reviewModerationKey || (() => "");
  const items = [...reviews]
    .sort((a, b) => Number(!!b.isHidden) - Number(!!a.isHidden) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 30);
  if (!items.length) return '<div class="line-item"><span>등록된 리뷰가 없습니다</span><strong>리뷰 대기</strong></div>';
  return items.map((review) => {
    const key = reviewModerationKey(review);
    const status = review.isHidden ? "숨김" : "공개";
    const dateLabel = review.createdAt ? new Date(review.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "날짜 없음";
    return `
      <div class="admin-review-card${review.isHidden ? " hidden" : ""}">
        <div>
          <div class="admin-review-card-head">
            <strong>${review.productName || review.productKey} · 별점 ${review.rating || 0}</strong>
            <span class="admin-status-badge ${review.isHidden ? "cancelled" : "done"}">${status}</span>
          </div>
          <p>${review.comment || "리뷰 내용 없음"}</p>
          <div class="admin-review-meta">
            <span>${review.showroom || "입점업체"} · ${review.customerName || "고객"} · ${review.size || "FREE"}</span>
            <span>${dateLabel}</span>
          </div>
          ${review.fit ? '<div class="admin-review-meta"><span>핏감 ' + review.fit + '</span></div>' : ""}
          ${review.isHidden ? '<div class="admin-review-hidden-reason">사유: ' + (review.hiddenReason || "사유 없음") + (review.hiddenBy ? " · 처리 " + review.hiddenBy : "") + '</div>' : ""}
          ${renderReviewPhoto(review)}
        </div>
        <div class="admin-review-actions">
          ${review.isHidden
            ? `<button type="button" onclick="restoreReviewVisibility('${key}')">다시 노출</button>`
            : `<button type="button" onclick="hideReviewFromAdmin('${key}')">숨김</button>`}
        </div>
      </div>
    `;
  }).join("");
}

export function settlementRateManagerMarkup(visiblePartners = [], options = {}) {
  const canEditPartnerRate = !!options.canEditPartnerRate;
  const defaultPartnerRate = options.defaultPartnerRate || (() => 0);
  const riderNicknamesForPartner = options.riderNicknamesForPartner || (() => []);
  const riderSettlementRate = options.riderSettlementRate || (() => 0);
  return visiblePartners.map((partner) => {
    const nicknames = riderNicknamesForPartner(partner);
    const partnerRate = defaultPartnerRate(partner.name);
    return `
      <details class="admin-store-group" open>
        <summary>${partner.name} <span>기본 ${partnerRate}%</span></summary>
        <div class="vendor-form" style="margin-top: 9px;">
          <label>배송사 기본 정산율
            <input type="number" min="0" max="100" value="${partnerRate}" ${canEditPartnerRate ? "" : "disabled"} onchange="updatePartnerSettlementRate('${partner.name}', this.value)" />
          </label>
        </div>
        <div class="vendor-form size-stock-grid" style="margin-top: 9px;">
          ${nicknames.map((name) => `
            <label>${name}
              <input type="number" min="0" max="100" value="${riderSettlementRate(partner.name, name)}" onchange="updateRiderSettlementRate('${partner.name}', '${name}', this.value)" />
            </label>
          `).join("")}
        </div>
      </details>
    `;
  }).join("");
}

export function settlementExportActionsMarkup(counts, options = {}) {
  const canCloseSettlement = !!options.canCloseSettlement;
  return `
    <button type="button" onclick="openSettlementStatement()">정산서 미리보기</button>
    <button type="button" onclick="downloadSettlementCsv('all')">전체 ${counts.all}건</button>
    <button type="button" onclick="downloadSettlementCsv('open')">정산예정 ${counts.open}건</button>
    <button type="button" onclick="downloadSettlementCsv('paid')">지급완료 ${counts.paid}건</button>
    <button type="button" onclick="downloadSettlementCsv('held')">보류 ${counts.held}건</button>
    <button type="button" onclick="downloadSettlementCsv('closed')">마감완료 ${counts.closed}건</button>
    ${canCloseSettlement ? '<button type="button" onclick="closeSettlementPeriod()">이번 기간 마감 ' + counts.closable + '건</button>' : ""}
  `;
}

export function settlementStatementMarkup(data, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const { issuedAt, periodLabel, rows, scope, totals } = data;
  return `
    <div class="settlement-statement">
      <div class="statement-title">
        <strong>FITNOW 지금배송 정산서</strong>
        <span>${scope} · ${periodLabel} · 발행 ${issuedAt}</span>
      </div>
      <div class="mini-actions settlement-export-actions">
        <button type="button" onclick="window.print()">인쇄 / PDF 저장</button>
        <button type="button" onclick="downloadSettlementCsv('all')">CSV 다운로드</button>
      </div>
      <div class="statement-grid">
        <div class="statement-tile"><span>정산 대상</span><strong>${totals.count}건</strong></div>
        <div class="statement-tile"><span>총 배송비</span><strong>${formatKRW(totals.feeTotal)}</strong></div>
        <div class="statement-tile"><span>지급 예정액</span><strong>${formatKRW(totals.payout)}</strong></div>
        <div class="statement-tile"><span>상태</span><strong>예정 ${totals.open} · 대기 ${totals.confirmed} · 완료 ${totals.paid} · 보류 ${totals.held} · 마감 ${totals.closed}</strong></div>
      </div>
      <table class="statement-table">
        <thead>
          <tr>
            <th>배송사</th>
            <th>기사</th>
            <th>건수</th>
            <th>상태</th>
            <th>배송비</th>
            <th>지급액</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((row) => `
            <tr>
              <td>${row.partnerName}</td>
              <td>${row.riderName}</td>
              <td>${row.count}건</td>
              <td>예정 ${row.open} · 대기 ${row.confirmed} · 완료 ${row.paid} · 보류 ${row.held} · 마감 ${row.closed}</td>
              <td>${formatKRW(row.feeTotal)}</td>
              <td>${formatKRW(row.payout)}</td>
            </tr>
          `).join("") : `
            <tr>
              <td colspan="6">현재 기간에 출력할 정산 데이터가 없습니다.</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

export function deliverySettlementListMarkup(rows, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const riderSettlementRate = options.riderSettlementRate || (() => 0);
  const activeAdminTodoFocus = options.activeAdminTodoFocus || "";
  const canManageSettlement = !!options.canManageSettlement;
  const demoButton = canManageSettlement
    ? '<div class="mini-actions order-detail-action"><button type="button" onclick="createSettlementDemoOrders()">정산 테스트 3건 생성</button></div>'
    : "";
  if (!rows.length) return '<div class="line-item"><span>도착 인증 완료된 배송이 없습니다</span><strong>정산 대기</strong></div>' + demoButton;
  return demoButton + rows.map((row) => {
    const encodedPartner = encodeURIComponent(row.partnerName);
    const encodedRider = encodeURIComponent(row.riderName);
    const status = row.confirmedCount && !row.pendingCount
      ? { label: "지급대기", cls: "moving" }
      : row.confirmedCount
        ? { label: "부분확정", cls: "ready" }
        : { label: "확정대기", cls: "ready" };
    const focusConfirm = activeAdminTodoFocus === "settlement_pending" && row.pendingCount;
    const focusPaid = activeAdminTodoFocus === "payment_pending" && row.confirmedCount;
    const focusClass = focusConfirm || focusPaid ? " settlement-action-focus" : "";
    const focusNote = focusConfirm
      ? '<div class="settlement-next-action"><span>다음 처리</span><strong>확정대기 ' + row.pendingCount + '건을 정산 확정하세요.</strong></div>'
      : focusPaid
        ? '<div class="settlement-next-action"><span>다음 처리</span><strong>지급대기 ' + row.confirmedCount + '건을 지급 완료하세요.</strong></div>'
        : "";
    return `
      <div class="vendor-product-row admin-order-row${focusClass}">
        <div>
          <strong>${row.partnerName} · ${row.riderName} <span class="admin-status-badge ${status.cls}">${status.label}</span></strong>
          <span>정산 대상 ${row.count}건 · 확정대기 ${row.pendingCount}건 · 지급대기 ${row.confirmedCount}건</span>
          <span>기사 정산 예정액 ${formatKRW(row.payout)} · 적용 정산율 ${riderSettlementRate(row.partnerName, row.riderName)}%</span>
          ${focusNote}
        </div>
        <div class="mini-actions order-detail-action">
          <button type="button" onclick="openSettlementDetail(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'), 'open')">상세보기</button>
          <button class="settlement-waiting" type="button" ${canManageSettlement ? "" : "disabled"} onclick="holdSettlementBatch(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'))">보류</button>
          <button class="${row.pendingCount ? "settlement-confirm" : "settlement-waiting"}${focusConfirm ? " primary-settlement-action" : ""}" type="button" ${canManageSettlement && row.pendingCount ? "" : "disabled"} onclick="confirmSettlementBatch(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'))">${row.pendingCount ? "정산 확정" : "확정 완료"}</button>
          <button class="${row.confirmedCount ? "settlement-paid" : "settlement-waiting"}${focusPaid ? " primary-settlement-action" : ""}" type="button" ${canManageSettlement && row.confirmedCount ? "" : "disabled"} onclick="paySettlementBatch(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'))">${row.confirmedCount ? "지급 완료" : "지급 대기"}</button>
        </div>
      </div>
    `;
  }).join("");
}

export function paidSettlementListMarkup(rows, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const lastSettlementResult = options.lastSettlementResult || null;
  if (!rows.length) return '<div class="line-item"><span>아직 지급 완료된 정산이 없습니다</span><strong>완료 대기</strong></div>';
  return rows.map((row) => {
    const encodedPartner = encodeURIComponent(row.partnerName);
    const encodedRider = encodeURIComponent(row.riderName);
    const recentPaid = lastSettlementResult &&
      lastSettlementResult.afterStatus === "지급완료" &&
      lastSettlementResult.partnerName === row.partnerName &&
      lastSettlementResult.riderName === row.riderName;
    return `
      <div class="vendor-product-row admin-order-row${recentPaid ? " settlement-paid-focus" : ""}">
        <div>
          <strong>${row.partnerName} · ${row.riderName} <span class="admin-status-badge done">지급완료</span></strong>
          <span>완료 ${row.count}건 · 총 배송비 ${formatKRW(row.feeTotal)}</span>
          <span>지급액 ${formatKRW(row.payout)} · ${row.paidDate}</span>
          ${recentPaid ? '<div class="settlement-next-action"><span>방금 처리됨</span><strong>지급완료 처리 결과가 완료 내역에 반영됐습니다.</strong></div>' : ""}
        </div>
        <div class="mini-actions order-detail-action">
          <button type="button" onclick="openSettlementDetail(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'), 'paid')">상세보기</button>
        </div>
      </div>
    `;
  }).join("");
}

export function heldSettlementListMarkup(rows, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const canManageSettlement = !!options.canManageSettlement;
  if (!rows.length) return '<div class="line-item"><span>보류 중인 정산이 없습니다</span><strong>정상</strong></div>';
  return rows.map((row) => {
    const encodedPartner = encodeURIComponent(row.partnerName);
    const encodedRider = encodeURIComponent(row.riderName);
    const encodedReason = encodeURIComponent(row.reason);
    return `
      <div class="vendor-product-row admin-order-row">
        <div>
          <strong>${row.partnerName} · ${row.riderName} <span class="admin-status-badge waiting">보류</span></strong>
          <span>보류 ${row.count}건 · 배송비 ${formatKRW(row.feeTotal)} · 예정 정산 ${formatKRW(row.payout)}</span>
          <span>사유: ${row.reason} · ${row.heldDate}</span>
        </div>
        <div class="mini-actions order-detail-action">
          <button type="button" onclick="openSettlementDetail(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'), 'held')">상세보기</button>
          <button class="settlement-confirm" type="button" ${canManageSettlement ? "" : "disabled"} onclick="releaseSettlementHold(decodeURIComponent('${encodedPartner}'), decodeURIComponent('${encodedRider}'), decodeURIComponent('${encodedReason}'))">보류 해제</button>
        </div>
      </div>
    `;
  }).join("");
}

export function settlementFlowCheckLogsMarkup(logs = [], options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const settlementTimeLabel = options.settlementTimeLabel || ((value) => value || "미처리");
  if (!logs.length) {
    return `
      <div class="settlement-check-log settlement-check-log-empty">
        <div>
          <span>정산 플로우 점검 로그</span>
          <strong>아직 실행된 점검이 없습니다.</strong>
          <p>정산 플로우 점검을 실행하면 생성, 확정, 지급 결과가 여기에 남습니다.</p>
        </div>
      </div>
    `;
  }
  return `
    <div class="settlement-check-log">
      <div class="settlement-check-log-head">
        <div>
          <span>정산 플로우 점검 로그</span>
          <strong>최근 ${logs.length}건</strong>
        </div>
        <div class="settlement-check-log-head-actions">
          <button type="button" onclick="openLatestSettlementFlowCheckReport()">최근 리포트</button>
          <button type="button" onclick="clearSettlementFlowCheckLogs()">초기화</button>
        </div>
      </div>
      <div class="settlement-check-log-list">
        ${logs.map((log, index) => `
          <div class="settlement-check-log-item">
            <div class="settlement-audit-step">${logs.length - index}</div>
            <div>
              <span class="admin-status-badge ${log.ok ? "done" : "waiting"}">${log.ok ? "통과" : "확인 필요"}</span>
              <strong>${log.orderId} · ${log.partnerName} · ${log.riderName}</strong>
              <p>${log.steps.join(" → ")} · ${formatKRW(log.payoutTotal)} · ${settlementTimeLabel(log.createdAt)}</p>
              <em>${log.message}</em>
              <div class="mini-actions settlement-check-log-actions">
                <button type="button" onclick="openSettlementFlowCheckReport('${log.orderId}')">상세보기</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function settlementFlowCheckReportMarkup(data, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const settlementTimeLabel = options.settlementTimeLabel || ((value) => value || "미처리");
  const { log, orderStatus, orderTotal } = data;
  return `
    <div class="settlement-check-report">
      <div class="order-detail-block">
        <strong>${log.orderId}</strong>
        <span>${log.partnerName} · ${log.riderName}</span>
        <span>${settlementTimeLabel(log.createdAt)} · ${log.ok ? "자동 점검 통과" : "확인 필요"}</span>
      </div>
      <div class="settlement-detail-progress">
        <div><span>정산 상태</span><strong>${orderStatus}</strong></div>
        <div><span>배송비</span><strong>${orderTotal}</strong></div>
        <div><span>지급액</span><strong>${formatKRW(log.payoutTotal)}</strong></div>
      </div>
      <div class="settlement-check-report-steps">
        ${log.steps.map((step, index) => `
          <div class="settlement-check-report-step">
            <div class="settlement-audit-step">${index + 1}</div>
            <div>
              <span class="admin-status-badge done">완료</span>
              <strong>${step}</strong>
              <p>${index === 0 ? "테스트 주문과 정산 상태를 준비했습니다." : index === 1 ? "확정대기 항목을 지급대기로 전환했습니다." : index === 2 ? "지급대기 항목을 지급완료로 처리했습니다." : "지급 완료 탭과 결과 요약에 반영했습니다."}</p>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="line-item"><span>점검 메시지</span><strong>${log.message}</strong></div>
      <div class="mini-actions settlement-check-report-actions">
        <button type="button" onclick="copySettlementFlowCheckReport('${log.orderId}')">텍스트 복사</button>
        <button type="button" onclick="downloadSettlementFlowCheckReportCsv('${log.orderId}')">CSV 다운로드</button>
      </div>
    </div>
  `;
}

export function settlementResultSummaryMarkup(result, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const statusClass = result.saved ? "done" : "ready";
  return `
    <div class="settlement-result-summary">
      <div>
        <span>최근 정산 처리</span>
        <strong>${result.message}</strong>
        <p>${result.beforeStatus} → ${result.afterStatus} · ${result.count}건 · ${formatKRW(result.payoutTotal)}</p>
      </div>
      <em class="admin-status-badge ${statusClass}">${result.saved ? "저장 완료" : "화면 반영"}</em>
    </div>
  `;
}

export function settlementConfirmMarkup(data, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const {
    afterStatus,
    beforeStatus,
    nextStatus,
    reason,
    summary,
    transitionRows,
  } = data;
  return `
    <div class="settlement-confirm-panel">
      <div class="settlement-confirm-alert">
        <strong>${nextStatus || "정산 상태 변경"}</strong>
        <span>아래 정산 내용을 확인한 뒤 처리하세요. 확인 후에는 주문 이력과 정산 상태가 함께 저장됩니다.</span>
      </div>
      <div class="settlement-confirm-grid">
        <div><span>배송사</span><strong>${summary.partnerName}</strong></div>
        <div><span>기사</span><strong>${summary.riderName}</strong></div>
        <div><span>처리 주문</span><strong>${summary.count}건</strong></div>
        <div><span>총 배송비</span><strong>${formatKRW(summary.feeTotal)}</strong></div>
        <div><span>기사 지급액</span><strong>${formatKRW(summary.payoutTotal)}</strong></div>
        <div><span>처리 후 상태</span><strong>${afterStatus}</strong></div>
      </div>
      <div class="settlement-transition-panel">
        <div class="settlement-transition-status">
          <div><span>처리 전</span><strong>${beforeStatus}</strong></div>
          <i></i>
          <div><span>처리 후</span><strong>${afterStatus}</strong></div>
        </div>
        <div class="settlement-transition-list">
          ${transitionRows.map((row) => `
            <div class="settlement-transition-row">
              <strong>${row.id}</strong>
              <span>${row.currentStatus} → ${afterStatus}</span>
              <small>${formatKRW(row.amount)}</small>
            </div>
          `).join("")}
          ${summary.count > 4 ? `<p>외 ${summary.count - 4}건도 같은 상태로 처리됩니다.</p>` : ""}
        </div>
      </div>
      <div class="settlement-confirm-orders">
        <span>대상 주문</span>
        <strong>${summary.orderIds.join(", ")}${summary.count > summary.orderIds.length ? " 외 " + (summary.count - summary.orderIds.length) + "건" : ""}</strong>
      </div>
      ${reason ? `<div class="settlement-confirm-orders"><span>처리 사유</span><strong>${reason}</strong></div>` : ""}
    </div>
  `;
}

export function settlementDetailMarkup({ partnerName, riderName, mode, rows, totalFee, totalPayout }, options = {}) {
  const formatKRW = options.formatKRW || ((value) => String(value || 0));
  const renderSettlementAuditTrail = options.renderSettlementAuditTrail || (() => "");
  const riderSettlementRate = options.riderSettlementRate || (() => 0);
  const settlementAuditEvents = options.settlementAuditEvents || (() => []);
  const settlementPayout = options.settlementPayout || ((deliveryFee) => deliveryFee || 0);
  const settlementTimeLabel = options.settlementTimeLabel || ((value) => value || "미처리");
  const canConfirmOpenOrder = options.canConfirmOpenOrder || (() => false);
  return `
    <div class="order-detail-grid">
      <div class="order-detail-block">
        <strong>${partnerName} · ${riderName}</strong>
        <span>${mode === "paid" ? "지급 완료 내역" : mode === "held" ? "보류 내역" : "주문별 정산 예정/지급 대기 내역"} · ${rows.length}건</span>
        <span>총 배송비 ${formatKRW(totalFee)} · 지급액 ${formatKRW(totalPayout)}</span>
      </div>
      <div class="admin-store-orders">
        ${rows.length ? rows.map((order) => {
          const rate = riderSettlementRate(partnerName, riderName);
          const payout = settlementPayout(order.deliveryFee || 0, partnerName, riderName);
          const statusLabel = order.settlementStatus === "paid" ? "지급완료" : order.settlementStatus === "held" ? "보류" : order.settlementStatus === "confirmed" ? "지급대기" : "확정대기";
          const statusClass = order.settlementStatus === "paid" ? "done" : order.settlementStatus === "held" ? "waiting" : order.settlementStatus === "confirmed" ? "moving" : "ready";
          const confirmer = order.settlementConfirmedBy || (order.settlementConfirmedAt ? "총관리자" : "미확정");
          const confirmDisabled = canConfirmOpenOrder(order) ? "" : "disabled";
          const auditEvents = settlementAuditEvents(order);
          const latestAudit = auditEvents[0];
          return `
            <div class="vendor-product-row admin-order-row">
              <div>
                <strong>${order.id} <span class="admin-status-badge ${statusClass}">${statusLabel}</span></strong>
                <div class="settlement-detail-progress">
                  <div><span>현재 상태</span><strong>${statusLabel}</strong></div>
                  <div><span>최근 처리</span><strong>${latestAudit ? latestAudit.label : "처리 대기"}</strong></div>
                  <div><span>최근 시각</span><strong>${latestAudit ? settlementTimeLabel(latestAudit.at) : "미처리"}</strong></div>
                </div>
                <span>배송비 ${formatKRW(order.deliveryFee || 0)} · 정산율 ${rate}% · 지급액 ${formatKRW(payout)}</span>
                <span>정산확정 ${settlementTimeLabel(order.settlementConfirmedAt)} · 확정자 ${confirmer}</span>
                <span>지급완료 ${settlementTimeLabel(order.settlementPaidAt)}</span>
                ${order.settlementClosedAt ? `<span>정산마감 ${settlementTimeLabel(order.settlementClosedAt)} · ${order.settlementCloseLabel || "마감명 없음"}</span>` : ""}
                ${order.settlementStatus === "held" ? `<span>보류 사유: ${order.settlementHoldReason || "사유 미입력"} · 보류일 ${settlementTimeLabel(order.settlementHeldAt)}</span>` : ""}
                ${renderSettlementAuditTrail(order, { compact: true })}
              </div>
              <div class="mini-actions order-detail-action">
                ${mode === "open" ? `<button class="${order.settlementStatus ? "settlement-waiting" : "settlement-confirm"}" type="button" ${confirmDisabled} onclick="confirmSettlementOrder('${order.id}', true)">${order.settlementStatus === "confirmed" ? "확정됨" : "정산 확정"}</button>` : ""}
                <button type="button" onclick="openAdminOrderDetail('${order.id}')">주문 상세</button>
              </div>
            </div>
          `;
        }).join("") : '<div class="line-item"><span>표시할 정산 주문이 없습니다</span><strong>비어있음</strong></div>'}
      </div>
    </div>
  `;
}
