import { test, expect } from '@playwright/test';

for (const width of [1440, 900, 390]) {
  test(`shared controls and page layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/batt/');
    await expect(page.getByRole('heading', { name: '작업 공간에 로그인' })).toBeVisible();
    await page.getByRole('button', { name: '사용 권한 신청', exact: true }).click();
    await expect(page.getByLabel('이름', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '샘플 데이터로 체험하기' }).click();
    for (const name of ['운영 현황', '셀 데이터', '셀 매칭', '팩 · 검사이력', '품질 리포트', '사용자 관리']) {
      await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
      await expect(page.locator('.page-heading h1')).toHaveText(name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (name === '셀 데이터') {
        const boxes = await page.locator('.upload-actions > *').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          return { top: box.top, height: box.height };
        }));
        expect(boxes).toHaveLength(2);
        expect(boxes[0]).toEqual(boxes[1]);
        if (width < 800) {
          const heading = await page.locator('.panel .section-head h2').boundingBox();
          const search = await page.locator('.search').boundingBox();
          expect(search!.y).toBeGreaterThan(heading!.y + heading!.height);
        }
      }
    }
  });
}
