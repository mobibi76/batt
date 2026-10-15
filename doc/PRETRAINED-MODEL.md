# 공개 학습 모델 재사용 (2026-10-15)

## 허용 범위

- UConn: [공식 저장소 MIT 라이선스](https://github.com/REIL-UConn/SOC-Agnostic-Rapid-State-of-Health-Estimation-of-Lithium-Ion-Batteries/blob/10d7bd9ca6d39378406e406e43d2a083575b77ca/LICENSE)에 따라 공개 firmware의 학습 계수와 공개 특징값을 재사용한다. 저작권·허가 고지는 `public/research/UCONN-PROCESSED-LICENSE.txt`로 배포한다. 추가 모델 학습은 하지 않는다.
- Severson: 공식 데이터 요약은 기존 CC BY 4.0 출처 표시와 함께 활용한다. [모델 코드의 별도 학술 라이선스 안내](https://github.com/rdbraatz/data-driven-prediction-of-battery-cycle-life-before-capacity-degradation)는 무료 데이터 공개와 별개다. 향후 허가 예정이라는 이유로 미취득 허가를 취득한 것으로 간주하지 않는다. 현재 예측 모델은 포함하지 않는다.

## 구현과 해석

관제의 알고리즘 검증 안에 `공개 모델 추론`을 추가했다. 실행 버튼을 누르면 UConn SOC 가중 ElasticNet 3개 전문가의 기존 계수를 브라우저에서 평가한다. 비교 기록은 셀별 최초·마지막 RPT, 실측 SOC 50%에 가장 가까운 행이며 배치 1–3의 112개 기록이다. C++ 재계산 특징값에서 별도 추출했으므로 기존 매칭용 55셀 표본과 동일한 표본이라고 해석하지 않는다.

예측 대상은 `soh_Ah`인 현재 용량(Ah)이다. 화면은 mAh로 단위 변환하며 SOH 백분율이나 잔여 수명이라고 표시하지 않는다. 실측 라벨은 오차 계산에만 사용한다. 모델 입력은 R1/R2(Ω), C1/C2(F), R0_manual(Ω), residual_L1, volt_mean/max/min(V), volt_var(V²), volt_skew/kurtosis, 최종 ECM SOC(0–1)이다. 원시 파형 피팅은 구현하지 않았고 저자 공개 특징값을 그대로 재생한다. 현장 3변수 측정값으로 누락 입력을 만들어 넣지 않는다.

SOC 보정은 소스의 정확한 1.16459 × SOC(%) + 3.484를 사용하고 5–95%로 제한한다. README의 반올림 값 1.165를 사용하지 않는다. 원본 삼각 가중치와 경계의 균등 평균 fallback을 보존한다. 배치 5 전용 용량 출력 보정은 배치 1–3에 적용하지 않는다. 따라서 배치 5 기본 펌웨어 전체 파이프라인과 같다고 주장하지 않는다.

학습 표본과 중복될 수 있어 평균 절대 오차는 재생 비교 지표일 뿐 독립 검증 또는 현장 성능이 아니다. 연구 결과에서 실제 셀/팩 상태, 승인, 배정, 생산 매칭 입력으로의 쓰기 경로는 없다. 실측·추정·절대 오차를 우선 표시하며 기록 선택과 기술 정보는 펼쳐볼 수 있다.

## 재현과 검수

소스 버전: `10d7bd9ca6d39378406e406e43d2a083575b77ca`.

해당 커밋의 `platformio_tests/ecm_mcu_test/src/main.cpp`를 `.local/uconn-platformio_tests_ecm_mcu_test_src_main.cpp`, `data/cpp_recomputed_features.zip`을 `.local/cpp_recomputed_features.zip`에 내려받은 뒤 `python scripts/prepare_uconn_model.py`를 실행한다. 스크립트는 주석 처리된 과거 계수를 제외하고 활성 계수만 추출한다. 새 학습이나 계수 조정은 하지 않는다. 출력 JSON에 소스/압축 파일 SHA-256을 기록한다.

독립 Python 계산값 `oracle_ah`와 TypeScript 추론을 112개 기록 모두 비교한다(소수점 12자리). 이는 수식 이식 검증이며 원시 파형 MCU 실행 검증은 아니다. 누락·비유한 입력, SOC 범위, 모델 스키마, 경계 fallback, 라벨 입력 분리를 단위 검사한다. 브라우저에서는 명시적 실행, 결과/출처 다운로드, 기록 전환, 기존 Severson 화면, 작은 화면 레이아웃을 검사한다. 보고서는 모델 계수와 입력 출처·기록·추론 결과·범위 제한을 함께 포함한다.
