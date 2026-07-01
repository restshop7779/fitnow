const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "play-store-assets");
const port = Number(process.env.PORT || (5400 + Math.floor(Math.random() * 1000)));
const baseUrl = `http://127.0.0.1:${port}/index.react.html?store-assets=${Date.now()}`;

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

async function capture(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(outDir, name),
    fullPage: false,
  });
  console.log("[store-assets] wrote " + name);
}

async function clickIfVisible(page, selector, label) {
  const target = page.locator(selector);
  const count = await target.count();
  if (!count) {
    console.log("[store-assets] skipped " + label + ": not found");
    return false;
  }
  await target.first().click();
  await page.waitForTimeout(350);
  return true;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const server = spawn(process.execPath, [path.join(root, "scripts", "serve-dist.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 780 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "load" });
    await page.waitForSelector("#productGrid .product-card", { timeout: 10000 });
    await capture(page, "fitnow-phone-01-home.png");

    await page.locator("#productGrid .product-card").first().click({ position: { x: 32, y: 32 } });
    await page.waitForSelector("#detailModal.open", { timeout: 10000 });
    await capture(page, "fitnow-phone-02-product-detail.png");

    await clickIfVisible(page, '#detailModal button:has-text("장바구니")', "add to cart");
    await page.locator('#detailModal button[onclick="closeDetail()"]').click().catch(() => {});
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      if (typeof window.openCartDetail === "function") window.openCartDetail();
    });
    await page.waitForSelector("#cartModal.open", { timeout: 10000 }).catch(() => {});
    await capture(page, "fitnow-phone-03-cart.png");
    await page.locator('#cartModal button[onclick="closeCartDetail()"]').click().catch(() => {});

    await page.evaluate(() => {
      if (typeof window.openLooks === "function") window.openLooks();
    });
    await page.waitForSelector("#lookModal.open", { timeout: 10000 }).catch(() => {});
    await capture(page, "fitnow-phone-04-looks.png");
    await page.locator('#lookModal button[onclick="closeLooks()"]').click().catch(() => {});

    await page.evaluate(() => {
      if (typeof window.openMyPage === "function") window.openMyPage();
    });
    await page.waitForSelector("#myModal.open", { timeout: 10000 }).catch(() => {});
    await capture(page, "fitnow-phone-05-my-page.png");

    const riderPage = await context.newPage();
    await riderPage.goto(baseUrl + "&rider=1", { waitUntil: "load" });
    await riderPage.waitForTimeout(1000);
    await capture(riderPage, "fitnow-rider-phone-01-home.png");

    const featureContext = await browser.newContext({
      viewport: { width: 1024, height: 500 },
      deviceScaleFactor: 1,
    });
    const featurePage = await featureContext.newPage();
    await featurePage.setContent(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            html, body { margin: 0; width: 1024px; height: 500px; font-family: Arial, sans-serif; background: #111827; color: white; }
            .wrap { width: 1024px; height: 500px; display: flex; align-items: center; justify-content: space-between; padding: 58px 72px; box-sizing: border-box; background: linear-gradient(135deg, #111827 0%, #1f2937 54%, #f97316 100%); }
            .copy { max-width: 540px; }
            .eyebrow { font-size: 22px; font-weight: 700; color: #fed7aa; margin-bottom: 18px; }
            h1 { font-size: 74px; line-height: 0.95; margin: 0 0 22px; letter-spacing: 0; }
            p { font-size: 27px; line-height: 1.35; margin: 0; color: #f9fafb; }
            .phone { width: 230px; height: 390px; border-radius: 34px; background: #fff; color: #111827; padding: 22px; box-sizing: border-box; box-shadow: 0 24px 70px rgba(0,0,0,.35); }
            .bar { height: 9px; width: 82px; border-radius: 99px; background: #111827; margin: 0 auto 28px; }
            .card { border: 2px solid #e5e7eb; border-radius: 18px; padding: 16px; margin-bottom: 14px; }
            .pill { display: inline-block; border-radius: 99px; background: #ffedd5; color: #9a3412; font-weight: 700; padding: 7px 11px; font-size: 14px; margin-bottom: 10px; }
            .line { height: 12px; border-radius: 99px; background: #d1d5db; margin: 9px 0; }
            .line.short { width: 60%; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="copy">
              <div class="eyebrow">FITNOW</div>
              <h1>오늘 고른 옷을<br />오늘 받는 쇼핑</h1>
              <p>동네 패션 매장 상품을 예약하고 배송 진행상태까지 한 번에 확인합니다.</p>
            </div>
            <div class="phone">
              <div class="bar"></div>
              <div class="card"><span class="pill">오늘도착</span><div class="line"></div><div class="line short"></div></div>
              <div class="card"><span class="pill">픽업준비</span><div class="line"></div><div class="line short"></div></div>
              <div class="card"><span class="pill">배송추적</span><div class="line"></div><div class="line short"></div></div>
            </div>
          </div>
        </body>
      </html>
    `);
    await featurePage.screenshot({ path: path.join(outDir, "fitnow-feature-graphic.png"), fullPage: false });
    await featureContext.close();
    console.log("[store-assets] wrote fitnow-feature-graphic.png");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
