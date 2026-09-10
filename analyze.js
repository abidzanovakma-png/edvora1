import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- Desktop View ---');
  await page.goto('https://asia-pathfinder-ai.lovable.app');
  await page.waitForTimeout(2000); // Wait for animations
  await page.screenshot({ path: '/mnt/documents/desktop.png', fullPage: true });

  const title = await page.title();
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
  });
  const cards = await page.evaluate(() => {
    // Look for common card patterns
    return Array.from(document.querySelectorAll('.card, [class*="card"], [class*="Card"]')).length;
  });

  console.log('Title:', title);
  console.log('Links count:', links.length);
  console.log('Possible cards found:', cards);

  console.log('\n--- Mobile View ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('https://asia-pathfinder-ai.lovable.app');
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: '/mnt/documents/mobile.png', fullPage: true });

  await browser.close();
})();
