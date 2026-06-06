const formatter = new Intl.NumberFormat("ko-KR");
const state = { count: 0, total: 0, selectedProduct: null };

const countLabel = document.querySelector("#cart-count");
const totalLabel = document.querySelector("#cart-total");
const checkoutButton = document.querySelector("#checkout-button");
const detailSheet = document.querySelector("#detail-sheet");
const checkoutSheet = document.querySelector("#checkout-sheet");
const trackingView = document.querySelector("#tracking-view");

function renderCart() {
  countLabel.textContent = `${state.count}개 선택`;
  totalLabel.textContent = `${formatter.format(state.total)}원`;
  checkoutButton.disabled = state.count === 0;
}

function openLayer(element) {
  element.setAttribute("aria-hidden", "false");
}

function closeLayer(element) {
  element.setAttribute("aria-hidden", "true");
}

function addProduct(card, button) {
  state.count += 1;
  state.total += Number(card.dataset.price);
  state.selectedProduct = card.dataset.name;
  button.textContent = "셀렉 완료";
  button.classList.add("added");
  renderCart();
  window.setTimeout(() => {
    button.textContent = "추가 담기";
    button.classList.remove("added");
  }, 900);
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
}

document.querySelectorAll(".product-card").forEach((card) => {
  const addButton = card.querySelector(".add-button");
  const openButton = card.querySelector(".product-open");

  addButton.addEventListener("click", () => addProduct(card, addButton));
  openButton.addEventListener("click", () => {
    state.selectedProduct = card.dataset.name;
    document.querySelector("#detail-name").textContent = card.dataset.name;
    document.querySelector("#detail-tone").textContent = card.dataset.tone;
    document.querySelector("#detail-meta").textContent = card.dataset.meta;
    document.querySelector("#detail-material").textContent = card.dataset.material;
    document.querySelector("#detail-fit").textContent = card.dataset.fit;
    document.querySelector("#detail-match").textContent = `${card.dataset.match}점`;
    document.querySelector("#detail-visual").className = `product-visual ${card.dataset.key}`;
    openLayer(detailSheet);
  });
});

document.querySelectorAll(".size-row button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".size-row button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelector("#detail-add").addEventListener("click", () => {
  const card = Array.from(document.querySelectorAll(".product-card")).find((item) => item.dataset.name === state.selectedProduct);
  if (!card) return;
  addProduct(card, card.querySelector(".add-button"));
  closeLayer(detailSheet);
});

checkoutButton.addEventListener("click", () => openLayer(checkoutSheet));
document.querySelector("#confirm-order").addEventListener("click", () => {
  closeLayer(checkoutSheet);
  openLayer(trackingView);
});
document.querySelector("#show-track-demo").addEventListener("click", () => openLayer(trackingView));
document.querySelector("#track-tab").addEventListener("click", () => openLayer(trackingView));
document.querySelector("#close-tracking").addEventListener("click", () => closeLayer(trackingView));
document.querySelector("#open-ai").addEventListener("click", () => showView("stylist-view"));
document.querySelector("#filter-button").addEventListener("click", () => showView("stylist-view"));

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelector("#stylist-run").addEventListener("click", () => {
  document.querySelector("#ai-result").classList.add("active");
});

document.querySelector("#ai-add").addEventListener("click", () => {
  ["라이트 크롭 재킷", "실버 링 세트"].forEach((name) => {
    const card = Array.from(document.querySelectorAll(".product-card")).find((item) => item.dataset.name === name);
    if (card) addProduct(card, card.querySelector(".add-button"));
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => closeLayer(document.querySelector(`#${button.dataset.close}`)));
});

document.querySelectorAll(".sheet").forEach((sheet) => {
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) closeLayer(sheet);
  });
});

renderCart();
