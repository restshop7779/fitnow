const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || (4300 + Math.floor(Math.random() * 1000)));
const baseUrl = `http://127.0.0.1:${port}/index.react.html?e2e=${Date.now()}`;

function fail(message) {
  throw new Error("[home-clicks] " + message);
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

async function expectModal(page, selector, label) {
  await page.waitForSelector(selector + ".open", { timeout: 5000 });
  const ariaHidden = await page.locator(selector).getAttribute("aria-hidden");
  if (ariaHidden !== "false") fail(label + " modal did not become visible");
}

async function clickAndCheck(page, clickSelector, modalSelector, label, options = {}) {
  const target = page.locator(clickSelector);
  const count = await target.count();
  if (options.first && count > 0) {
    await target.first().click(options.position ? { position: options.position } : {});
  } else {
    if (count !== 1) fail(label + " click target count was " + count);
    await target.click();
  }
  await expectModal(page, modalSelector, label);
}

async function clickFirstProductAndCheck(page) {
  const productCards = page.locator("#productGrid .product-card");
  const count = await productCards.count();
  if (!count) fail("product detail click target count was 0");
  await productCards.first().scrollIntoViewIfNeeded();
  await productCards.first().press("Enter");
  await expectModal(page, "#detailModal", "product detail");
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
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(baseUrl, { waitUntil: "load" });
    await page.waitForSelector("#productGrid .product-card", { timeout: 10000 });

    await clickAndCheck(page, 'button[onclick="openLooks()"]', "#lookModal", "look");
    await page.locator('#lookModal button[onclick="closeLooks()"]').click();
    await page.waitForSelector("#lookModal.open", { state: "detached", timeout: 5000 }).catch(async () => {
      const hidden = await page.locator("#lookModal").getAttribute("aria-hidden");
      if (hidden !== "true") fail("look modal did not close");
    });

    await clickAndCheck(page, 'header button[onclick="openMyPage()"]', "#myModal", "my page");
    await page.locator('#myModal button[onclick="closeMyPage()"]').click();
    await page.waitForSelector("#myModal.open", { state: "detached", timeout: 5000 }).catch(async () => {
      const hidden = await page.locator("#myModal").getAttribute("aria-hidden");
      if (hidden !== "true") fail("my modal did not close");
    });

    await clickFirstProductAndCheck(page);
    await page.locator('#detailModal button[onclick="closeDetail()"]').click();
    await page.waitForSelector("#detailModal.open", { state: "detached", timeout: 5000 }).catch(async () => {
      const hidden = await page.locator("#detailModal").getAttribute("aria-hidden");
      if (hidden !== "true") fail("detail modal did not close");
    });

    await clickAndCheck(page, ".cart-bar", "#cartModal", "cart");

    const newPageErrors = pageErrors.filter((message) => !/favicon/i.test(message));
    const newConsoleErrors = consoleErrors.filter((message) => !/favicon/i.test(message));
    if (newPageErrors.length) fail("page errors: " + newPageErrors.join(" | "));
    if (newConsoleErrors.length) fail("console errors: " + newConsoleErrors.join(" | "));

    console.log("[home-clicks] OK: look, my page, product detail, cart");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
