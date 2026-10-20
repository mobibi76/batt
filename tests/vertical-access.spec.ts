// Regression: never use scrollIntoView here: it also moves overflow:hidden ancestors.
// Only actual scroll owners may reveal controls; clipping and hit targets are checked afterward.
import { test, expect } from '@playwright/test';
import { navigate, step, researchSide } from './workspace';
import fs from 'node:fs';
import { choose } from './chips';
import { prepareInspection } from './inspection';
for (const [width, height] of [[800, 360], [800, 480], [900, 360], [1366, 600], [1366, 768]])
    test('vertical access ' + width + 'x' + height, async ({ page }, testInfo) => {
        test.setTimeout(90000);
        page.setDefaultTimeout(10000);
        await page.setViewportSize({ width, height });
        const findings: any[] = [];
        async function audit(name: string) { const dismiss = page.getByRole('button', { name: '알림 닫기', exact: true }); if (await dismiss.isVisible())
            await dismiss.click(); const bad = await page.evaluate(() => { const scope = document.querySelector<HTMLElement>('[aria-modal=true]') || document; const targets = [...scope.querySelectorAll<HTMLElement>('button,input:not([type=radio]):not([type=checkbox]):not([type=file]),select,textarea,summary,a,.choice-chip>span')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.pointerEvents !== 'none' && e.checkVisibility({ checkVisibilityCSS: true }) && !e.closest('.scene-label.quiet'); }); const failed: any[] = []; for (const e of targets) {
            // Start each reachability check at the scroll owners' top; a prior control
            // may leave this control underneath a sticky navigation bar.
            for (let owner = e.parentElement; owner; owner = owner.parentElement) {
                if (/^(auto|scroll)$/.test(getComputedStyle(owner).overflowY))
                    owner.scrollTo({ top: 0, behavior: 'instant' });
            }
            let p = e.parentElement;
            while (p) {
                const s = getComputedStyle(p);
                if (/^(auto|scroll)$/.test(s.overflowY) && p.scrollHeight > p.clientHeight) {
                    let r = e.getBoundingClientRect(), q = p.getBoundingClientRect();
                    if (r.bottom > q.top + p.clientTop + p.clientHeight)
                        p.scrollTo({ top: p.scrollTop + r.bottom - (q.top + p.clientTop + p.clientHeight) + 2, behavior: 'instant' });
                    if (r.top < q.top + p.clientTop)
                        p.scrollTo({ top: p.scrollTop - (q.top + p.clientTop - r.top + 2), behavior: 'instant' });
                }
                p = p.parentElement;
            }
            const root = document.scrollingElement as HTMLElement;
            if (root && root.scrollHeight > innerHeight && !/^(hidden|clip)$/.test(getComputedStyle(root).overflowY)) {
                const r = e.getBoundingClientRect();
                if (r.bottom > innerHeight)
                    window.scrollTo({ top: scrollY + r.bottom - innerHeight + 2, behavior: 'instant' });
                if (r.top < 0)
                    window.scrollTo({ top: scrollY + r.top - 2, behavior: 'instant' });
            }
            const r = e.getBoundingClientRect();
            let top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom), clip = 'viewport';
            p = e.parentElement;
            while (p) {
                const s = getComputedStyle(p), q = p.getBoundingClientRect();
                if (/^(auto|scroll|hidden|clip)$/.test(s.overflowY)) {
                    const b = q.top + p.clientTop + p.clientHeight;
                    if (b < bottom || q.top + p.clientTop > top)
                        clip = p.className;
                    top = Math.max(top, q.top + p.clientTop);
                    bottom = Math.min(bottom, b);
                }
                p = p.parentElement;
            }
            const ratio = Math.max(0, bottom - top) / r.height;
            const x = Math.min(innerWidth - 1, Math.max(1, r.x + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(1, (top + bottom) / 2));
            const hit = document.elementFromPoint(x, y);
            const hitOk = hit && (e.contains(hit) || hit.contains(e));
            if (ratio < .94 || !hitOk)
                failed.push({ text: (e.textContent || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.tagName).trim().slice(0, 80), ratio: Math.round(ratio * 100), clip, hit: hit?.className, rect: { y: r.y, h: r.height }, scroll: (() => { const a = []; let q = e.parentElement; while (q) {
                        a.push({ class: q.className, overflow: getComputedStyle(q).overflowY, sh: q.scrollHeight, ch: q.clientHeight, st: q.scrollTop });
                        q = q.parentElement;
                    } return a; })() });
        } return failed; }); if (bad.length) {
            findings.push({ screen: name, bad });
            fs.writeFileSync(testInfo.outputPath('vertical-access.json'), JSON.stringify(findings, null, 2));
            await page.screenshot({ path: testInfo.outputPath(name.replaceAll(' ', '-') + '.png') });
        } }
        await page.goto('/batt/');
        await audit('login');
        await page.getByRole('button', { name: '사용 권한 신청', exact: true }).click();
        await audit('가입');
        await page.getByRole('button', { name: '가상 데이터로 공정 체험', exact: true }).click();
        await page.getByRole('button', { name: '셀 검사·재고', exact: true }).click();
        await page.getByRole('button', { name: '예시 셀로 다음 단계' }).click();
        await page.getByRole('button', { name: '생산 홈', exact: true }).click();
        for (const mode of ['생산', '품질', '연구']) {
            await page.getByRole('button', { name: mode, exact: true }).click();
            await audit(mode + '홈');
        }
        for (const task of ['운영 현황', '셀 데이터', '셀 매칭', '팩 · 검사이력', '품질 리포트', '알고리즘 검증', '공정 관리', '품질·공정 승인함', '사용자 관리']) {
            await navigate(page, task);
            if (task === '셀 매칭' && (width <= 800 || height <= 450)) {
                const body = page.locator('.console-task-body');
                await body.hover();
                await page.mouse.wheel(0, 1000);
                await expect.poll(() => body.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
            }
            await audit(task);
            if (task === '셀 매칭') {
                await page.getByRole('button', { name: '조합 추천', exact: true }).click();
                await step(page, '8셀 추천 조합');
                await audit('조합후보');
                await page.getByRole('button', { name: '조합 검토 · 확정', exact: true }).first().click();
                await audit('팩구성모달');
                await page.getByLabel('팩 일련번호').fill('VERTICAL-001');
                await page.getByLabel('조합 검토 사유', { exact: true }).fill('합성 자료의 세로 접근성 검증');
                await page.getByRole('button', { name: '확인 및 팩 구성', exact: true }).click();
            }
            if (task === '팩 · 검사이력') {
                await page.getByRole('button', { name: '상세 조회', exact: true }).click();
                await audit('팩상세');
                for (const kind of ['module', 'casing', 'final']) {
                    await prepareInspection(page);
                    await choose(page, '검사 구분', kind);
                    await audit('검사판정-' + kind);
                    await prepareInspection(page, true);
                    await audit('검사메모-' + kind);
                    await page.getByRole('button', { name: '검사 결과 저장', exact: true }).click();
                }
                await page.getByRole('button', { name: '닫기', exact: true }).click();
            }
            if (task === '품질·공정 승인함') {
                await step(page, '새 검토 요청');
                await audit('품질요청');
                await choose(page, '품질 검토 대상 팩', { label: 'VERTICAL-001' });
                await page.getByLabel('검토 요청 사유', { exact: true }).fill('접근성 검토');
                await page.getByRole('button', { name: '팩 품질 검토 요청', exact: true }).click();
                await choose(page, '체험 역할', 'demo-reviewer');
                await audit('승인근거');
                const final = page.getByRole('button', { name: '최종 판단', exact: true });
                if (await final.isVisible())
                    await final.click();
                await audit('승인판단');
                await page.getByLabel('검토 의견').fill('근거 확인');
                await page.getByRole('button', { name: '제출본 승인', exact: true }).click();
                await audit('승인완료');
                await choose(page, '체험 역할', 'demo-admin');
            }
            if (task === '셀 데이터') {
                for (const s of ['셀 재고', '측정값 분포 확인']) {
                    await step(page, s);
                    await audit(task + '-' + s);
                }
            }
            if (task === '알고리즘 검증') {
                await researchSide(page, 'controls');
                await page.getByRole('button', { name: '현재 측정·판정 자료 가져오기', exact: true }).click();
                for (const s of ['1. 연구 데이터', '2. 비교 조건', '3. 검증 결과', '4. 운영 적용 검토', '최근 실험']) {
                    await step(page, s);
                    await audit('연구-' + s);
                    await researchSide(page, 'controls');
                    await audit('연구입력-' + s);
                    if (s === '2. 비교 조건') {
                        await page.getByRole('button', { name: '알고리즘 비교 실행', exact: true }).click();
                        // The worker opens results on completion; wait before auditing later stages.
                        await expect(page.getByRole('heading', { name: '비교 후보 선택', exact: true, includeHidden: true })).toBeAttached();
                        await expect(page.getByRole('navigation', { name: '작업 단계', exact: true }).getByRole('button', { name: '3. 검증 결과', exact: true })).toHaveAttribute('aria-pressed', 'true');
                    }
                }
                await step(page, '연구 문헌');
                await audit('문헌');
                await page.getByRole('button', { name: '직접 등록', exact: true }).click();
                await audit('문헌등록');
                await page.getByRole('button', { name: '취소', exact: true }).click();
            }
            if (task === '공정 관리') {
                for (const s of ['확보 데이터', '저장·승인', '장비·공정']) {
                    await page.getByRole('button', { name: s, exact: true }).click();
                    await audit('공정-' + s);
                }
                await page.getByRole('button', { name: /^작업 순서 \d+$/ }).click();
                await audit('작업순서');
                await page.getByRole('button', {name:'장비 편집',exact:true}).click();
                await audit('편집복귀');
                const nameInput=page.getByLabel('장비 이름',{exact:true});
                await nameInput.fill('하단 접근 검증 장비');
                await page.getByRole('button',{name:'이 장비 삭제',exact:true}).click();
                await page.getByRole('button',{name:'삭제 취소',exact:true}).click();
                await expect(nameInput).toHaveValue('하단 접근 검증 장비');
                await page.getByRole('button', { name: '시뮬레이션 · 작업 효율', exact: true }).click();
                await audit('공정효율');
            }
        }
        fs.writeFileSync(testInfo.outputPath('vertical-access.json'), JSON.stringify(findings, null, 2));
        await testInfo.attach('vertical-access', { path: testInfo.outputPath('vertical-access.json'), contentType: 'application/json' });
        expect(findings, 'All active controls must be reachable through user-scrollable ancestors').toEqual([]);
    });
