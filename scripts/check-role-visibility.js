const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || (4300 + Math.floor(Math.random() * 1000)));
const baseUrl = `http://127.0.0.1:${port}/index.react.html?admin=1&role-check=${Date.now()}`;

function fail(message) {
  throw new Error("[role-visibility] " + message);
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

async function openPageWithSession(page, session) {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.evaluate((nextSession) => {
    localStorage.clear();
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

async function expectOpenModal(page, selector, label) {
  await page.waitForFunction((modalSelector) => {
    const modal = document.querySelector(modalSelector);
    return !!modal && modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false";
  }, selector, { timeout: 10000 });
  const visible = await page.locator(selector).isVisible();
  if (!visible) fail(label + " modal is not visible");
}

async function expectVisible(page, selector, label) {
  const target = page.locator(selector);
  if ((await target.count()) !== 1) fail(label + " target count mismatch");
  if (!(await target.isVisible())) fail(label + " should be visible");
}

async function expectHidden(page, selector, label) {
  const target = page.locator(selector);
  if ((await target.count()) !== 1) fail(label + " target count mismatch");
  if (await target.isVisible()) fail(label + " should be hidden");
}

async function verifyGuest(page) {
  await openPageWithSession(page, {});
  await page.evaluate(() => window.openManagement());
  await expectOpenModal(page, "#managementModal", "management");
  await expectVisible(page, "#managementModal", "guest management");

  const states = await page.locator("#managementModal").innerText();
  ["업체 로그인 필요", "배송사 로그인 필요", "총관리자 로그인 필요"].forEach((text) => {
    if (!states.includes(text)) fail("guest state missing: " + text);
  });

  await page.evaluate(() => window.openAdminFromManagement());
  await expectOpenModal(page, "#adminLoginModal", "delivery login");
  await expectHidden(page, "#adminModal", "guest delivery admin");
  await page.evaluate(() => window.closeAdminLogin());

  await page.evaluate(() => window.openTotalAdminFromManagement());
  await expectOpenModal(page, "#adminLoginModal", "total admin login");
  await expectHidden(page, "#adminModal", "guest total admin");
}

async function verifyVendor(page) {
  await openPageWithSession(page, { vendor: { store: "어반클로젯 동탄" } });
  await page.evaluate(() => window.openVendor());
  await expectOpenModal(page, "#vendorModal", "vendor");
  await expectVisible(page, "#vendorModal", "vendor panel");
  await expectHidden(page, "#adminModal", "vendor admin panel");

  const text = await page.locator("#vendorModal").innerText();
  if (!text.includes("어반클로젯 동탄")) fail("vendor store scope missing");
  ["총관리 권한", "입점업체/배송사 계정 관리", "전체 주문 처리"].forEach((forbidden) => {
    if (text.includes(forbidden)) fail("vendor can see forbidden text: " + forbidden);
  });
}

async function verifyDelivery(page) {
  await openPageWithSession(page, { admin: { name: "지금배송 동탄센터", role: "delivery" } });
  await page.evaluate(() => window.openAdmin("delivery"));
  await expectOpenModal(page, "#adminModal", "delivery admin");
  await expectVisible(page, "#adminDeliveryDashboardSection", "delivery dashboard");
  await expectVisible(page, "#adminPermissionDelivery", "delivery permission");

  await expectHidden(page, "#adminAccountManagementSection", "delivery account management");
  await expectHidden(page, "#adminReviewModerationSection", "delivery review moderation");
  await expectHidden(page, "#adminSettlementRateSection", "delivery settlement rate");
  await expectHidden(page, "#adminRiderWorkSection", "delivery rider work board");
  await expectHidden(page, "#adminRiderNicknameSection", "delivery rider nickname management");
  await expectHidden(page, "#adminSettlementSection", "delivery total settlement dashboard");
  await expectHidden(page, "#adminOrderControlSection", "delivery total order controls");
  await expectHidden(page, "#adminReleaseReadiness", "delivery release readiness");
  await expectHidden(page, "#adminHomeBoard", "delivery owner home board");
  await expectHidden(page, "#adminPermissionTotal", "delivery total permission pill");

  const text = await page.locator("#adminModal").innerText();
  ["입점업체/배송사 계정 관리", "리뷰 관리", "정산율 설정", "기사별 업무판", "기사 닉네임 관리", "전체 주문 처리"].forEach((forbidden) => {
    if (text.includes(forbidden)) fail("delivery can see forbidden text: " + forbidden);
  });
}

async function verifyTotalAdmin(page) {
  await openPageWithSession(page, { admin: { name: "핏나우 운영자", role: "total" } });
  await page.evaluate(() => window.openAdmin("total"));
  await expectOpenModal(page, "#adminModal", "total admin");
  await expectVisible(page, "#adminAccountManagementSection", "total account management");
  await expectVisible(page, "#adminReviewModerationSection", "total review moderation");
  await expectVisible(page, "#adminSettlementRateSection", "total settlement rate");
  await expectVisible(page, "#adminRiderWorkSection", "total rider work board");
  await expectVisible(page, "#adminRiderNicknameSection", "total rider nickname management");
  await expectVisible(page, "#adminSettlementSection", "total settlement dashboard");
  await expectVisible(page, "#adminOrderControlSection", "total order controls");
  await expectVisible(page, "#adminReleaseReadiness", "total release readiness");
  await expectVisible(page, "#adminHomeBoard", "total home board");
  await expectVisible(page, "#adminPermissionTotal", "total permission pill");
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

    await verifyGuest(page);
    await verifyVendor(page);
    await verifyDelivery(page);
    await verifyTotalAdmin(page);

    const errors = pageErrors.filter((message) => !/favicon/i.test(message));
    if (errors.length) fail("page errors: " + errors.join(" | "));
    console.log("[role-visibility] OK: guest, vendor, delivery, total admin visibility");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
