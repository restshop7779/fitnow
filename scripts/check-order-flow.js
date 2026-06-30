const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || (4300 + Math.floor(Math.random() * 1000)));
const baseUrl = `http://127.0.0.1:${port}/index.react.html?admin=1&order-flow-check=${Date.now()}`;

function fail(message) {
  throw new Error("[order-flow] " + message);
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("preview server did not start in time")), 15000);
    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      process.stdout.write(text);
      if (text.includes("FitNow preview:")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => process.stderr.write(String(chunk)));
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error("preview server exited with code " + code));
    });
  });
}

async function expectOpenModal(page, selector, label) {
  await page.waitForFunction((modalSelector) => {
    const modal = document.querySelector(modalSelector);
    return !!modal && modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false";
  }, selector, { timeout: 10000 });
  if (!(await page.locator(selector).isVisible())) fail(label + " modal is not visible");
}

async function visibleText(page, selector) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible", timeout: 10000 });
  return locator.innerText();
}

async function openWithSession(page, session) {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.evaluate((nextSession) => {
    localStorage.removeItem("fitnow-current-vendor");
    localStorage.removeItem("fitnow-current-admin");
    localStorage.removeItem("fitnow-current-customer");
    if (nextSession.vendor) {
      localStorage.setItem("fitnow-current-vendor", JSON.stringify(nextSession.vendor));
    }
    if (nextSession.admin) {
      localStorage.setItem("fitnow-current-admin", JSON.stringify(nextSession.admin));
    }
  }, session);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("body.admin-access-enabled", { timeout: 10000 });
}

async function createPickupReadyOrder(page) {
  await openWithSession(page, { admin: { name: "핏나우 운영자", role: "total" } });
  const order = await page.evaluate(() => {
    window.openVendorLogin();
    const store = document.querySelector("#loginStore")?.options[0]?.value || "";
    window.closeVendorLogin();
    const createdAt = new Date().toISOString();
    const orderData = {
      id: "FN-AUTO-FLOW-" + Date.now(),
      region: store,
      address: store,
      receiveType: "door",
      paymentMethod: "test",
      riderRequest: "order flow qa",
      items: [{ key: "order-flow-tee", name: "Order Flow QA Item", showroom: store, quantity: 1, size: "FREE", price: 39000, discountRate: 0 }],
      subtotal: 39000,
      deliveryFee: 0,
      total: 39000,
      fastest: 35,
      customerId: "order-flow-qa",
      customerName: "Order Flow QA",
      customerContact: "01000000000",
      progressStep: 2,
      statusCode: "pickup",
      statusLabel: "pickup ready",
      paid: true,
      paymentLabel: "paid",
      deliveryPartnerName: "",
      riderName: "",
      pickupConfirmedAt: "",
      arrivalConfirmedAt: "",
      pickupProofPhoto: null,
      arrivalProofPhoto: null,
      settlementStatus: "",
      settlementConfirmedAt: "",
      settlementPaidAt: "",
      settlementHoldReason: "",
      settlementHeldAt: "",
      settlementReleasedAt: "",
      settlementClosedAt: "",
      settlementClosedBy: "",
      settlementCloseLabel: "",
      createdAt,
      createdLabel: createdAt,
      deliveryLogs: [],
    };
    window.addDeliveryLog(orderData, "order flow qa", "created by automated order flow check");
    window.saveOrderHistory(orderData);
    return orderData;
  });
  if (!order || !order.id) fail("delivery flow test order was not created");
  if (!order.paid) fail("created order should be paid");
  if ((order.progressStep || 0) !== 2) fail("created order should start at pickup-ready step");
  console.log("[order-flow] created order " + order.id + " store=" + (order.items[0] && order.items[0].showroom));

  return order;
}

async function verifyVendorCanSeePickupReadyOrder(page, order) {
  await page.evaluate(() => {
    window.openVendor();
  });
  await expectOpenModal(page, "#vendorLoginModal", "vendor login");
  await page.locator("#loginStore").selectOption({ index: 0 });
  await page.locator("#loginPin").fill("1111");
  await Promise.all([
    page.waitForFunction(() => {
      const modal = document.querySelector("#vendorModal");
      return !!modal && modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false";
    }, { timeout: 10000 }),
    page.locator("#vendorLoginModal form").evaluate((form) => form.requestSubmit()),
  ]);
  await expectOpenModal(page, "#vendorModal", "vendor");
  await page.waitForTimeout(500);
  await page.evaluate(async (testOrder) => {
    await window.renderVendorOrders([testOrder]);
  }, order);
  const vendorText = await visibleText(page, "#vendorOrderList");
  console.log("[order-flow] vendor order sample=" + vendorText.slice(0, 500).replace(/\s+/g, " "));
  if (!vendorText.includes(order.id)) fail("vendor cannot see pickup-ready order");
  const vendorModalText = await visibleText(page, "#vendorModal");
  if (!vendorModalText.includes(order.items[0].showroom)) fail("vendor scope text is missing");
}

async function verifyDeliveryClaimFlow(page, order) {
  await page.evaluate(() => {
    window.logoutVendor();
    window.logoutAdmin();
    window.openAdmin("delivery");
  });
  await expectOpenModal(page, "#adminLoginModal", "delivery login");
  await page.locator("#adminPin").fill("7701");
  await Promise.all([
    page.waitForFunction(() => {
      const modal = document.querySelector("#adminModal");
      return !!modal && modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false";
    }, { timeout: 10000 }),
    page.locator("#adminLoginModal form").evaluate((form) => form.requestSubmit()),
  ]);
  await page.evaluate(async (testOrder) => {
    await window.renderAdminOrders([testOrder]);
  }, order);

  const beforeText = await visibleText(page, "#adminModal");
  if (!beforeText.includes(order.id)) fail("delivery admin cannot see open-call order");

  const claimed = await page.evaluate(async (orderId) => {
    if (typeof window.claimDeliveryOrder !== "function") return null;
    await window.claimDeliveryOrder(orderId);
    const list = JSON.parse(localStorage.getItem("fitnow-order-status") || "{}");
    return list[orderId] || null;
  }, order.id);

  if (!claimed) fail("claimed order status was not persisted");
  if (!claimed.deliveryPartnerName) fail("delivery partner was not assigned");
  if (!claimed.riderName) fail("rider was not assigned");

  await page.waitForFunction((orderId) => {
    const text = document.querySelector("#adminModal")?.innerText || "";
    return text.includes(orderId);
  }, order.id, { timeout: 10000 });

  const afterText = await visibleText(page, "#adminModal");
  if (!afterText.includes(order.id)) fail("claimed order disappeared from delivery admin");
}

async function main() {
  const server = spawn(process.execPath, [path.join(root, "scripts", "serve-dist.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const order = await createPickupReadyOrder(page);
    await verifyVendorCanSeePickupReadyOrder(page, order);
    await verifyDeliveryClaimFlow(page, order);

    const errors = pageErrors.filter((message) => !/favicon/i.test(message));
    if (errors.length) fail("page errors: " + errors.join(" | "));
    console.log("[order-flow] OK: pickup-ready order, vendor visibility, delivery open-call claim");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
