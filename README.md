# JSI Battery Workbench

주성산업 사내 배터리 셀 매칭·품질이력 관리 MVP.

## 운영 구조

- 웹: React / TypeScript / Vite → GitHub Pages (`/batt/`)
- 인증·DB: Supabase Auth / PostgreSQL + RLS
- 매칭: Supabase Edge Function (`match-cells`), TypeScript
- 추가 Python 서버, Docker, GPU는 필요하지 않습니다.

## 구현 범위

가입 신청 → 관리자 승인, 작업자/조회자 역할, CSV/XLSX 표준 양식 업로드,
SOP 기반 8셀 추천, 원자적 팩 승인과 셀 중복 사용 방지, 에이징/최종검사 기록,
공정 관제 대시보드, 팩 추적, 텍스트 품질 리포트, 합성 데이터 체험.

비밀번호나 서버 비밀키는 저장소에 포함하지 않습니다. 프런트의 Supabase publishable key는 공개 클라이언트 식별자입니다. 데이터 보안은 RLS 및 인증·승인 검증에 의해 적용됩니다.

## 개발 및 배포

Node.js 24 이상:

```sh
npm ci
npm run dev
npm test
npm run build
```

GitHub Pages는 Settings → Pages → Source를 GitHub Actions로 설정합니다.
main 브랜치 push 시 테스트·빌드 후 배포합니다.

```sh
npx supabase login
npx supabase link --project-ref asfrsorbzmqhnwnxlxar
npx supabase db push
npx supabase functions deploy match-cells --use-api
```

`supabase/migrations`를 순서대로 적용합니다. `tests/security.sql`은 ROLLBACK하는 DB 권한 통합 테스트입니다.
초기 관리자는 신뢰된 관리자 세션에서 Auth 사용자를 만들고 해당 profiles 행의 role='admin', status='approved'를 설정합니다. 이메일이나 가입 metadata만으로 자동 관리자 승격하지 않습니다.

이 MVP는 이메일 발송 없이 가입 신청을 접수하고 관리자가 사내 구성원 여부를 확인해 승인하는 방식입니다. Auth 계정 생성/로그인만으로 업무 데이터에 접근할 수 없습니다. 운영 단계에서 SMTP와 이메일 소유 확인을 추가할 수 있습니다.

## 데이터 양식

첫 시트/CSV 헤더: `id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at`.
전압 mV/용량 mAh는 소수 3자리, 내부저항 mΩ는 소수 5자리까지 지원합니다.
measured_at은 `2026-10-14T09:00:00+09:00` 같은 시간대 포함 ISO 문자열입니다.
파일당 5MB / 5,000행. 매칭 요청은 500셀 / 10팩까지입니다.
중복 ID는 덮어쓰지 않고 전체 업로드를 거절합니다. 원본 파일은 전송·저장하지 않고 브라우저에서 읽은 표준 행만 DB로 전송합니다.

## 해석과 한계

- 매칭은 여러 정렬 순서의 greedy 탐색이며 전역 최적해, 최대 생산 팩 수를 보장하지 않습니다. 추천이 없다는 것은 불가능 판정이 아닙니다.
- 승인 시 DB가 정확한 numeric 값으로 SOP(10mV / 0.01mΩ / 500mAh)를 재검증하고 셀 행을 잠급니다.
- ML 기반 불량 확률, 수명 예측, 보증등급, 자연어 LLM 보고서는 아직 구현하지 않았습니다.
- 대시보드는 등록 데이터의 현재 스냅샷입니다. 센서 실시간 상태가 아닙니다. ‘조합 추천’은 현재 브라우저 실행 결과입니다.
- 불량률은 팩별 최신 최종검사 결과 기준으로, 초도 불량률과 다릅니다. 미검사 상태는 0%로 표시하지 않습니다.
- 공정 연결률 분모는 전체 등록 팩이며, 8개 셀 + 에이징 + 최종검사 연결을 요구합니다.
- 초기 검증은 합성 데이터로 진행합니다. 실제 원본 생산데이터의 클라우드 운영 허용 범위는 사업 요구사항에 따라 별도로 확정해야 합니다.
- 등록된 측정값·검사이력은 불변입니다. 재작업 셀 재사용과 측정 이력 정정 워크플로는 다음 단계입니다.
- 브라우저 체험 데이터는 새로고침하면 초기화됩니다. 실제 사용자 데이터와 혼합하지 않습니다.

알고리즘 검증 모드: 메뉴의 **알고리즘 검증**에서 UConn 실측 표본을 불러온 뒤 비교를 실행합니다. 출처·재현 방법·평가 한계·운영 이관 범위는 [RESEARCH.md](RESEARCH.md)를 참고하세요. 현재 55개 연구 셀의 배치별 조합 비교를 제공하며 운영 SOP와 DB는 변경하지 않습니다.

가상 디지털 트윈: 메뉴의 **가상 디지털 트윈**에서 장비 블록을 격자에 배치·회전·연결하고, 태그를 정의한 뒤 가상 작업 흐름과 센서 경보를 관제합니다. 개인 공정 JSON 저장·가져오기와 관제 스냅샷 내보내기를 제공합니다. 실제 장비는 미연결이며 모든 수치는 합성 데이터입니다. 장비 참고 자료·데이터 계약·실제 IoT 연결 후속 범위는 [DIGITAL_TWIN.md](DIGITAL_TWIN.md)를 참고하세요.
