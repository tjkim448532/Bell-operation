# 📖 [프론트엔드 연동용] 벨포레 데이터 통합 통제 API 바이블 (The Bible) v5.0 SSOT

> **대상 웹앱**: 벨포레 통합 운영 대시보드 (`https://bell-operation.web.app/`)  
> **백엔드 Base URL**: `https://belleforet-data.vercel.app` (또는 지정 백엔드 도메인)  
> **응답 규격**: 100% `camelCase` 통일 정규화 완료

---

## ⛔ 1. 프론트엔드 무관용 6대 연동 원칙 (Strict Rules)

대시보드 개발팀에서는 백엔드 데이터 정합성 보장을 위해 아래 6가지 규칙을 **반드시 엄수**해야 합니다.

1. **NO SLICE SUMMATION (프론트엔드 가산 절대 금지)**
   * 프론트엔드는 배열 데이터를 `reduce()`, `for` 문 등으로 직접 더해서 총합이나 소계를 구해서는 **절대 안 됩니다.**
   * 모든 카테고리 소계(`isSubtotal = true`)와 전체 총합(`isGrandTotal = true`)은 백엔드가 연산하여 내려주는 완성된 정산값만 그대로 렌더링하십시오.

2. **다중 월(Multi-month) 및 기간 조회 1회 호출 원칙**
   * 대시보드에서 긴 기간(예: 1개월, 1년)을 조회할 때 API를 루프 순회하며 여러 번 호출하여 더하지 마십시오.
   * 반드시 파라미터 `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`를 지정하여 **1회 호출**로 전달받은 통계값을 출력해야 합니다.

3. **동적 화면 제어(Team Toggle) 시 마이너스(-) 연산 원칙**
   * 화면에서 특정 팀/영업장을 토글 끄기(Toggle Off)할 때, 남은 팀들을 다시 더하지 말고 **백엔드가 준 전체 총합(Grand Total)에서 끈 팀의 소계(`isSubtotal`)를 빼는 방식**으로 구현해야 합니다.

4. **칸반보드 드래그 앤 드롭(Drag & Drop)의 역할**
   * 대시보드의 드래그 앤 드롭은 **시각적 시뮬레이션 전용**입니다.
   * 공식적인 데이터 재분배는 [통합 데이터 통제 센터(Admin)] 화면에서 저장하여 백엔드 DB를 업데이트한 후 새로고침해야 반영됩니다.

5. **오타(Typo) 스마트 매핑 시도 금지**
   * 프론트엔드 단에 정규표현식이나 `if`문으로 오타를 유추하는 로직을 넣지 마십시오. 오타는 데이터 엔지니어링 백엔드의 영역입니다.

6. **매출 누락 발생 시 조치 가이드**
   * 대시보드 특정 영업장 매출이 비어있다면 프론트엔드 코드를 수정하지 마십시오. 대부분 관리자 화면에서 '미분류' 바구니에 방치되었기 때문입니다. 운영팀이 드래그하여 배정하면 백엔드 연산이 복구됩니다.

7. **Bell-operation 특수 규칙 (절대 규정)**
   * 이 앱의 프론트엔드는 백엔드에서 전사 데이터를 내려주더라도, 오직 `team_name`이 '레저본부'이거나 '미분류'인 데이터만 통과시키고 화면에 렌더링해야 합니다. 타 본부 데이터는 무조건 100% 필터링하여 버려야 합니다.

---

## 📡 2. V5 핵심 API 전체 명세서

### [API 1] 대시보드 메인 요약 (전역 상태 및 최상단 KPI 지표용)
- **Endpoint**: `GET /api/v5/dashboard/revenue-summary`
- **Query Params**: `date=YYYY-MM-DD` (또는 `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`)
- **응답 구조**:
```json
{
  "success": true,
  "summary": {
    "totalRevenue": 112421760,
    "totalRooms": 131,
    "totalRoomCap": 524,
    "totalGolfTeams": 48
  },
  "salesByCategory": [
    { "categoryCode": "ROOM", "categoryName": "객실본부", "revenue": 32961935, "sharePct": 29.3 },
    { "categoryCode": "GOLF", "categoryName": "골프본부", "revenue": 19054542, "sharePct": 16.9 },
    { "categoryCode": "FNB", "categoryName": "식음본부", "revenue": 17373487, "sharePct": 15.5 },
    { "categoryCode": "TICKET", "categoryName": "레저본부", "revenue": 34062197, "sharePct": 30.3 },
    { "categoryCode": "GOODS", "categoryName": "기타/굿즈", "revenue": 8576000, "sharePct": 7.6 }
  ],
  "salesByFacility": [ ... ],
  "dailyTrends": [ ... ]
}
```

---

### [API 2] 요일비교 매트릭스 & 표/칸반보드 렌더링용
- **Endpoint**: `GET /api/v5/dashboard/matrix-weekly`
- **Query Params**: `date=YYYY-MM-DD` (기간 조회 시 `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`)
- **백엔드 강제 정렬 순서**:
  `ROOM` ➔ `GOLF` ➔ `FNB` ➔ `BANQUET` ➔ `TICKET` ➔ `MOTO` ➔ `PROMOTION` ➔ `PARKING` ➔ `GOODS` ➔ `UNEARNED` ➔ `OTHER` ➔ `ETC` ➔ `TOTAL`
- **주요 응답 항목**:
```json
{
  "success": true,
  "data": [
    {
      "categoryCode": "ROOM",
      "categoryName": "객실본부",
      "teamName": "객실팀",
      "partName": "객실파트",
      "shopName": "ROOM (객실)",
      "isSubtotal": false,
      "isGrandTotal": false,
      "todayActual": 32690116,
      "todayLy": 31200000,
      "todayGrowth": 4.78
    },
    {
      "categoryCode": "ROOM",
      "categoryName": "객실본부",
      "teamName": "객실팀",
      "partName": "객실파트",
      "shopName": "ROOM OTHER (객실부대)",
      "isSubtotal": false,
      "isGrandTotal": false,
      "todayActual": 271819,
      "todayLy": 250000,
      "todayGrowth": 8.73
    },
    {
      "categoryCode": "ROOM",
      "categoryName": "객실본부 소계",
      "teamName": "객실팀",
      "partName": "-",
      "shopName": "[객실본부 소계]",
      "isSubtotal": true,
      "isGrandTotal": false,
      "subtotalType": "CATEGORY",
      "todayActual": 32961935,
      "todayLy": 31450000,
      "todayGrowth": 4.81
    }
  ]
}
```

---

### [API 3] 일일 영업 실적 리포트
- **Endpoint**: `GET /api/v5/report/daily-sales`
- **Query Params**: `date=YYYY-MM-DD`
- **응답 구조**: 영업장별 실적(당일, 전년, 전월, 목표 대비 달성률%) 통계 제공.

---

### [API 4, 5] 관리자 웹 매핑 통제 API
- **영업장 그룹 매핑**: `GET, POST /api/v5/admin/mapping/facility-groups?mode={카테고리명}`
- **팀/파트 매핑**: `GET, POST /api/v5/admin/mapping/team`

---

### [API 6] 객실 세그먼트 상세 실적 리포트
- **Endpoint**: `GET /api/v5/report/room-channel-sales`
- **Query Params**: `date=YYYY-MM-DD`
- **특징**: `segmentName` 단위로 1-depth 그룹핑 제공.

---

### [API 7] 상세 판매 채널 중심 객실 실적 리포트
- **Endpoint**: `GET /api/v5/report/room-sales-by-channel`
- **Query Params**: `date=YYYY-MM-DD` (또는 `startDate`, `endDate`)
- **특징**: `channelName` 단위로 1-depth 그룹핑 제공 (예: OTA 온라인 여행사, 자사몰, 전화/메신저 등).

---

### [API 8] 교차 영업장 시너지 연관 분석 [NEW]
- **Endpoint**: `GET /api/v5/report/synergy-store-correlation`
- **Query Params**: `date=YYYY-MM-DD` (또는 `startDate`, `endDate`)
- **주요 응답 항목**: 피어슨 상관계수($r$), 리프트 지수($Lift$), 전방/후방 파급효과(`forwardSpillover`, `reverseSpillover`), 시너지 등급(`HIGH_SYNERGY`, `MODERATE_SYNERGY`, `INDEPENDENT`).

---

### [API 9] 고객 이용 묶음(Bundle) 클러스터링 분석 [NEW]
- **Endpoint**: `GET /api/v5/report/customer-journey-bundles`
- **Query Params**: `date=YYYY-MM-DD` (또는 `startDate`, `endDate`)
- **주요 응답 항목**:
  * `totalUniqueCustomers`: 전체 식별 고객 수
  * `multiFacilityRatioPct`: 복수 영업장 이용 고객 비율(%)
  * `bundleClusters`: 고액 [숙박+골프+식음] 묶음, 가족 [숙박+워터파크+카페] 묶음, 당일 [골프+식음] 묶음 클러스터 통계.

---

## 📐 3. 핵심 지표 연산 및 명칭 정규화 규칙

1. **순매출 (Net Revenue)**:
   * 모든 매출 지표는 부가세(VAT 10%)가 제외된 순수 매출입니다: `Net Revenue = Gross Sales / 1.1`.
2. **독립 카테고리 명칭 규칙**:
   * `벨포레굿즈`, `기획전`, `주차관제`, `모토아레나`, `미사용 티켓`은 단독 소계 1개로 생성됩니다.
   * 기존 `티켓` 카테고리의 대시보드 화면 표기명은 **`레저본부`**로 출력합니다 (`[레저본부 소계]`).
3. **독립 영업장 분리 규칙**:
   * **`'썸머랜드'`**: 레저본부 워터파크 입장/대여 티켓 영업장
   * **`'썸머랜드 푸드트럭'`**: 식음본부 독립 F&B 영업장
