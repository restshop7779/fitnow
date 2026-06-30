const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || (4300 + Math.floor(Math.random() * 1000)));
const baseUrl = `http://127.0.0.1:${port}/index.react.html?rider=1&rider-mode-check=${Date.now()}`;

function fail(message) {
  throw new Error("[rider-mode] " + message);
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

async function expectOpenModal(page, selector, label) {
  await page.waitForFunction((modalSelector) => {
    const modal = document.querySelector(modalSelector);
    return !!modal && modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false";
  }, selector, { timeout: 10000 });
  await expectVisible(page, selector, label);
}

async function verifyRiderShell(page) {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.evaluate(() => {
    localStorage.removeItem("fitnow-current-admin");
    localStorage.removeItem("fitnow-current-vendor");
    localStorage.removeItem("fitnow-current-customer");
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("body.rider-app-shell", { timeout: 10000 });

  await expectVisible(page, "#riderAppHome", "rider home");
  await expectHidden(page, "#productGrid", "customer product grid");
  await expectHidden(page, ".bottom-tabs", "customer bottom tabs");
  await expectHidden(page, ".cart-bar", "customer cart bar");
  await expectHidden(page, ".shopping-hero", "customer shopping hero");

  const brand = await page.locator(".top-bar .brand").innerText();
  if (!brand.includes("RIDER")) fail("rider brand label missing");

  await expectOpenModal(page, "#adminLoginModal", "rider delivery login");
  const loginText = await page.locator("#adminLoginModal").innerText();
  if (!loginText.includes("배송")) fail("rider login should be delivery-scoped");
}

async function verifyRiderDeliveryDashboard(page) {
  await page.locator("#adminPin").fill("7701");
  await Promise.all([
    page.waitForFunction(() => {
      const modal = document.querySelector("#adminModal");
      return !!modal && modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false";
    }, { timeout: 10000 }),
    page.locator("#adminLoginModal form").evaluate((form) => form.requestSubmit()),
  ]);

  await expectVisible(page, "#adminModal", "rider delivery admin modal");
  await expectVisible(page, "#adminDeliveryDashboardSection", "rider delivery dashboard");
  await expectVisible(page, "#adminPermissionDelivery", "rider delivery permission");

  const riderEyebrow = await page.locator("#adminEyebrow").innerText();
  const riderTitle = await page.locator("#adminTitle").innerText();
  if (riderEyebrow !== "FITNOW RIDER") fail("rider dashboard eyebrow should be FITNOW RIDER");
  if (!riderTitle.includes("배송 대시보드")) fail("rider dashboard title should use delivery dashboard wording");

  await expectHidden(page, "#adminPermissionTotal", "rider total permission");
  await expectHidden(page, "#adminAccountManagementSection", "rider account management");
  await expectHidden(page, "#adminReviewModerationSection", "rider review moderation");
  await expectHidden(page, "#adminSettlementRateSection", "rider settlement rate");
  await expectHidden(page, "#adminRiderWorkSection", "rider work board");
  await expectHidden(page, "#adminRiderNicknameSection", "rider nickname management");
  await expectHidden(page, "#adminOrderControlSection", "rider total order controls");

  const text = await page.locator("#adminModal").innerText();
  ["입점업체/배송사 계정 관리", "리뷰 관리", "정산율 설정", "기사별 업무판", "기사 닉네임 관리", "전체 주문 처리"].forEach((forbidden) => {
    if (text.includes(forbidden)) fail("rider mode can see forbidden admin text: " + forbidden);
  });
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

    await verifyRiderShell(page);
    await verifyRiderDeliveryDashboard(page);

    const errors = pageErrors.filter((message) => !/favicon/i.test(message));
    if (errors.length) fail("page errors: " + errors.join(" | "));
    console.log("[rider-mode] OK: rider shell, delivery login, delivery-only dashboard");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
