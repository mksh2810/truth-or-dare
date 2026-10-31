import { chromium } from 'playwright';
import { createServer } from 'vite';

const VIEWPORTS = [
  { width: 360, height: 740, name: '360px (Small Android)' },
  { width: 390, height: 844, name: '390px (iPhone 13/14)' },
  { width: 430, height: 932, name: '430px (iPhone 14/15 Pro Max)' },
];

async function runOverflowCheck() {
  console.log('🚀 Starting Vite test server on port 5199...');
  const server = await createServer({
    server: { port: 5199 },
  });
  await server.listen();
  const baseUrl = 'http://localhost:5199';

  const browser = await chromium.launch({ headless: true });
  let hasOverflow = false;

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n========================================`);
      console.log(`📱 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`========================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // Test 1: /home
      await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const homeCheck = await page.evaluate((vpWidth) => {
        const scrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;
        const protruding: { tag: string; id: string; className: string; right: number }[] = [];

        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > windowWidth + 1) {
            protruding.push({
              tag: el.tagName.toLowerCase(),
              id: el.id,
              className: (el.className || '').toString().slice(0, 60),
              right: Math.round(rect.right),
            });
          }
        });

        return {
          scrollWidth,
          windowWidth,
          isOverflowing: scrollWidth > windowWidth,
          protruding,
        };
      }, vp.width);

      if (homeCheck.isOverflowing || homeCheck.protruding.length > 0) {
        console.error(`❌ Overflow on /home at ${vp.width}px!`);
        console.error(`   scrollWidth: ${homeCheck.scrollWidth}px vs windowWidth: ${homeCheck.windowWidth}px`);
        console.error(`   Protruding elements:`, homeCheck.protruding.slice(0, 5));
        hasOverflow = true;
      } else {
        console.log(`✅ /home: No overflow at ${vp.width}px (scrollWidth: ${homeCheck.scrollWidth}px)`);
      }

      // Test 2: /dev/screens - test each screen in the selector
      await page.goto(`${baseUrl}/dev/screens`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      // Get all screen options
      const screenOptions = await page.evaluate(() => {
        const select = document.querySelector('select');
        if (!select) return [];
        return Array.from(select.options).map((opt) => opt.value);
      });

      console.log(`   Auditing ${screenOptions.length} screens in /dev/screens at ${vp.width}px...`);

      for (const screenId of screenOptions) {
        await page.selectOption('select', screenId);
        await page.waitForTimeout(80);

        const check = await page.evaluate((vpWidth) => {
          const scrollWidth = document.documentElement.scrollWidth;
          const windowWidth = window.innerWidth;
          const protruding: { tag: string; id: string; className: string; right: number }[] = [];

          document.querySelectorAll('*').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 1.5) {
              protruding.push({
                tag: el.tagName.toLowerCase(),
                id: el.id,
                className: (el.className || '').toString().slice(0, 60),
                right: Math.round(rect.right),
              });
            }
          });

          return {
            scrollWidth,
            windowWidth,
            isOverflowing: scrollWidth > windowWidth,
            protruding,
          };
        }, vp.width);

        if (check.isOverflowing || check.protruding.length > 0) {
          console.error(`❌ Overflow on screen [${screenId}] at ${vp.width}px!`);
          console.error(`   scrollWidth: ${check.scrollWidth}px vs windowWidth: ${check.windowWidth}px`);
          console.error(`   Protruding:`, check.protruding.slice(0, 3));
          hasOverflow = true;
        }
      }

      console.log(`✅ All ${screenOptions.length} static screens clean at ${vp.width}px!`);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (hasOverflow) {
    console.error('\n🚨 Overflow check FAILED. Fix protruding elements.');
    process.exit(1);
  } else {
    console.log('\n🎉 Overflow check PASSED across all screens and viewports (360px, 390px, 430px)!');
  }
}

runOverflowCheck().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
