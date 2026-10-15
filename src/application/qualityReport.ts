import { metricCohort, metricScopeNames, qualitySummary, download, type Pack, type Inspection, type MetricScope } from '../lib';
import { firstPassSummary } from '../workflow';
import type { Cell } from '../../supabase/functions/_shared/matching';
export function exportQualityReport({ packs, tests, cells, demo, metricScope }: {
    packs: Pack[];
    tests: Inspection[];
    cells: Cell[];
    demo: boolean;
    metricScope: MetricScope;
}) { const scoped = metricCohort(packs, tests, metricScope); const summary = qualitySummary(scoped.packs, scoped.tests); const first = firstPassSummary(scoped.packs, scoped.tests); download(`JSI_품질리포트_${new Date().toISOString().slice(0, 10)}.txt`, [`JSI Battery Workbench · ${demo ? '합성 데이터 체험' : '등록 데이터'} 리포트`, `작성: ${new Date().toLocaleString('ko-KR')}`, `등록 셀: ${cells.length}`, `검사 출처: 실측 ${tests.filter(t => t.evidence_kind === 'measured').length} / 시험 ${tests.filter(t => t.evidence_kind === 'test').length} / 미확인 ${tests.filter(t => !t.evidence_kind || t.evidence_kind === 'unknown').length}`, `지표 집계 대상: ${metricScopeNames[metricScope]} · 선택 범위 팩 ${scoped.packs.length}개 / 검사 ${scoped.tests.length}건`, `구성 팩: ${packs.length}`, `최종검사 완료 팩: ${summary.tested}`, `최신 최종검사 불량 팩: ${summary.failed}`, `불량률: ${summary.rate === null ? '미집계' : summary.rate.toFixed(2) + '%'}`, `검사이력 연결률: ${summary.linkRate === null ? '미집계' : summary.linkRate.toFixed(1) + '%'}`, `초도 최종검사 불량률: ${first.rate === null ? '미집계' : first.rate.toFixed(2) + '%'} (${first.failed}/${first.tested}팩)`, '최신 결과의 개선은 재검사 효과일 수 있으며 조합 알고리즘의 개선으로 단정하지 않습니다.', '제안서 추정 기준 2.08%와 목표 1.0%의 성과 비교는 동일 조건의 현장 전후 검증이 필요합니다.', '연결률 = 선택 범위의 셀 8개+에이징+최종검사 연결 팩 / 선택 범위 등록 팩', '불량률 = 선택 범위 최신 최종검사 Fail 팩 / 선택 범위 최종검사 완료 팩', '재검사 결과가 반영되므로 초도 불량률과 다릅니다.', '매칭 방식: SOP 기반 휴리스틱 추천. 학습된 불량 예측 모델이 아닙니다.', '합성 데이터 결과로 실제 품질 개선 효과를 주장할 수 없습니다.'].join('\n'), 'text/plain;charset=utf-8'); }
