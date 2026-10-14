import {navigate} from './navigate';
﻿import { test, expect } from '@playwright/test';

for (const width of [1440, 900, 768, 390, 320]) {
  test(`shared controls and page layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/batt/');
    await expect(page.getByRole('heading', { name: '작업 공간에 로그인' })).toBeVisible();
    await page.getByRole('button', { name: '사용 권한 신청', exact: true }).click();
    await expect(page.getByLabel('이름', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '샘플 데이터로 체험하기' }).click();await page.getByRole('button',{name:'운영 지표'}).click();
    for (const name of ['운영 현황', '셀 데이터', '셀 매칭', '팩 · 검사이력', '품질 리포트', '알고리즘 검증', '공정 관리', '품질·공정 승인함', '사용자 관리']) {
      await navigate(page,name);
      await expect(page.locator('.page-heading h1')).toHaveText(name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const account = await page.locator('.user-card').boundingBox();
      expect(account!.y + account!.height).toBeLessThanOrEqual(720);
      expect(await page.locator('.sidebar > nav').evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
      if (name === '셀 데이터') {
        const boxes = await page.locator('.upload-actions > *').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          return { top: box.top, height: box.height };
        }));
        expect(boxes).toHaveLength(2);
        const searchBox = await page.locator('.search').boundingBox();
        expect(searchBox!.height).toBe(42);
        expect(boxes[0]).toEqual(boxes[1]);
        if (width < 800) {
          const heading = await page.getByRole('heading',{name:/셀 재고/}).boundingBox();
          const search = await page.locator('.search').boundingBox();
          expect(search!.y).toBeGreaterThan(heading!.y + heading!.height);
        }
      }
    }
  });
}
