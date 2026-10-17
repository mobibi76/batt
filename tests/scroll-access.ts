import { expect, type Locator } from '@playwright/test';

/** Reveal through real scroll owners, without moving overflow:hidden ancestors. */
export async function revealScrollable(target: Locator) {
  await target.evaluate(element => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (!/^(auto|scroll)$/.test(getComputedStyle(parent).overflowY)) continue;
      const box = element.getBoundingClientRect(), frame = parent.getBoundingClientRect();
      const top = frame.top + parent.clientTop, bottom = top + parent.clientHeight;
      if (box.bottom > bottom) parent.scrollTop += box.bottom - bottom + 2;
      if (element.getBoundingClientRect().top < top) parent.scrollTop -= top - element.getBoundingClientRect().top + 2;
    }
  });
  await expect(target).toBeInViewport({ratio: 1});
  expect(await target.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return !!hit && (element.contains(hit) || hit.contains(element));
  }), 'Control must receive pointer input after scrolling').toBe(true);
}
