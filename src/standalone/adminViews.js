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
