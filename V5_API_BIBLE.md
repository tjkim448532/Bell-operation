# 벨포레 데이터 통합 통제 API 명세서 (Frontend 연동 가이드)

본 문서는 프론트엔드 개발자가 **"어떤 화면에서, 어떤 목적일 때, 어떤 API를 호출해야 하는가?"**를 명확히 판단할 수 있도록 작성된 종합 명세서입니다. 
기존 데이터 바인딩 규칙(Bible)과 함께, 프론트엔드 연동의 유일한 참조 문서(SSOT)로 활용됩니다.

> [!WARNING]
> **기존(Legacy) API 사용 가능 여부 안내**
> 기존에 사용하시던 V3 / V4 API들도 하위 호환성을 위해 삭제하지 않고 유지해 두었습니다. 따라서 즉각적인 장애가 발생하지는 않습니다. 
> 하지만, V3/V4 API는 과거의 '통짜 합산' 방식의 쿼리를 사용하기 때문에, **개별 영업장을 분리해서 보여주는 최신 매핑 로직이 반영되지 않습니다.** 
> 따라서, 정확하고 세분화된 데이터를 화면에 노출하기 위해서는 반드시 본 문서에 명시된 **V5 API**로 엔드포인트를 전면 교체(Migration)하셔야 합니다.

---

## 🛑 0. 무관용 원칙 (프론트엔드 절대 엄수 사항)
- **NO SLICE SUMMATION**: 프론트엔드는 배열 데이터를 `reduce`, `for` 문 등으로 직접 더해서 총합이나 소계를 구해서는 **절대 안 됩니다.** 모든 총합(Grand Total)과 소계(Subtotal)는 백엔드가 내려주는 완성된 값만 사용합니다.
- **동적 화면 제어(Toggle) 시 마이너스(Minus) 연산**: 칸반보드 등에서 특정 팀을 끌(Toggle Off) 때, 남은 팀들을 다시 더하지 말고, 백엔드가 준 전체 총합에서 끈 팀의 백엔드 소계(`isSubtotal`)를 빼는 방식으로 구현해야 합니다.
- **칸반보드 드래그 앤 드롭의 규칙**: 대시보드의 드래그 앤 드롭은 시각적 시뮬레이션 용도입니다. 공식적인 데이터 재분배는 오직 [통합 데이터 통제 센터(Admin)] 화면에서 저장하여 백엔드 DB를 업데이트한 후 새로고침해야 반영됩니다.
- **오타(Typo) 스마트 매핑 시도 금지**: 프론트엔드 단에 정규표현식이나 `if`문으로 텍스트 오타를 유추하는 로직을 넣지 마십시오. 오타는 데이터 엔지니어링(원천 데이터 및 백엔드)의 영역입니다.
- **매출 누락 원인 파악**: 대시보드 매출이 비어있다면 코드를 수정하지 마십시오. 대부분 매핑 화면에서 '미분류' 바구니에 방치되었기 때문입니다. 운영팀이 드래그하여 배정하면 백엔드 연산이 복구됩니다.
- **Bell-operation 특수 규칙 (절대 규정)**: 이 앱의 프론트엔드는 백엔드에서 전사 데이터를 내려주더라도, 오직 `team_name`이 '레저본부'이거나 '미분류'인 데이터만 통과시키고 화면에 렌더링해야 합니다. 타 본부 데이터는 무조건 100% 필터링하여 버려야 합니다.

---

## 📊 1. 대시보드 (Dashboard) 화면용 API
백엔드의 모든 V5 API 응답 키워드는 `camelCase`로 100% 정규화 통일되었습니다.

### 1.1 메인 요약 지표 (Global KPI)
> 대시보드 최상단의 매출 총액, 전체 객실 수, 투숙 인원, 골프 팀 수 등을 렌더링할 때 호출합니다.
- **Endpoint**: `GET /api/v5/dashboard/revenue-summary`
- **Query Parameter**: `?date=YYYY-MM-DD` (선택 사항, 기본값: 오늘)
- **주요 응답 데이터**: 
  - `summary`: `totalRevenue`, `totalRooms`, `totalRoomCap`, `totalGolfTeams`
  - `dailyTrends`: 최근 7일간의 요일별 트렌드 배열
  - `salesByCategory`: 대분류별 매출

### 1.2 요일비교 매트릭스 보드 (Matrix Weekly)
> 각 파트/팀별 개별 영업장 카드와 요일별 비교 표를 그릴 때 호출합니다. 
- **Endpoint**: `GET /api/v5/dashboard/matrix-weekly`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **주의사항**: 프론트엔드는 API가 내려주는 배열 순서를 **절대 정렬(Sort)하지 말고** 그대로 렌더링해야 합니다. 총합 및 소계가 이미 정확한 위치에 삽입되어 내려옵니다.
- **주요 필드**: `teamName`, `partName`, `shopName`, `todayActual`, `todayLy`, `isSubtotal`, `isGrandTotal`

### 1.3 파트별 매출 비율 (Donut Chart)
- **Endpoint**: `GET /api/v5/dashboard/revenue-by-segment`
- **Query Parameter**: `?date=YYYY-MM-DD`

### 1.4 주차장 요약 (Parking)
- **Endpoint**: `GET /api/v5/dashboard/parking-summary`
- **Query Parameter**: `?date=YYYY-MM-DD`

### 1.5 주요 영업장 당월 누적(MTD) 이용률 데이터 [NEW]
> 프론트엔드에서 1일 치 API를 30번 병렬 호출하는 방식을 대체하기 위해 만들어진 전용 API입니다. 단 1회 호출로 당월 1일부터 조회 당일까지의 누적 합계를 내려줍니다.
- **Endpoint**: `GET /api/v5/dashboard/utilization-mtd`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **주요 응답 데이터**: 
  - `totalRoomGuestsMtd`: 해당 기간 누적 총 숙박객 수 (이용률 분모)
  - `facilities`: 영업장별(미디어아트센터, 사계절썰매, 마운틴카트, 목장 등) 누적 이용객 배열

---

## 📈 2. 리포트 (Reports) 화면용 API

### 2.1 일일 영업 실적 리포트 (Daily Sales)
> '영업일보' 엑셀과 동일한 표를 그릴 때 호출합니다.
- **Endpoint**: `GET /api/v5/report/daily-sales`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **특징**: 프론트엔드 연산 부하 방지를 위해 1차원 배열(Flat Array) 형태로 반환. `totalInventory`와 `weather` 최상단 제공.

### 2.2 객실 채널별 상세 실적 (Room Channel Sales)
> 객실 부문의 상세 판매 현황을 볼 때 호출합니다.
- **Endpoint**: `GET /api/v5/report/room-channel-sales`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **특징**: 3-Depth (세그먼트 ➔ 상세채널 ➔ 평수타입) 구성 및 뎁스별 소계(`isSegmentSubtotal`, `isChannelSubtotal`) 자동 산출.

### 2.3 팀/조직별 통합 실적 (Team Revenue)
- **Endpoint**: `GET /api/v5/reports/team-revenue`
- **Query Parameter**: `?date=YYYY-MM-DD`

---

## ⚙️ 3. 어드민 통제 센터 (Admin Mapping) API

### 3.1 영업장(POS) 바구니 매핑 조회 및 저장
> 현장 POS 원천 메뉴(`source_name`, `product_name`)를 묶을 목표 바구니(`sub_group_name`)를 반환 및 저장합니다.
- **Endpoint**: `GET, POST /api/v3/admin/facility-groups?mode={카테고리명}`

### 3.2 팀/조직도 본부 매핑 조회 및 저장
> 바구니 영업장(`facility_name`)을 상위 조직인 본부(`team_name`)와 소그룹(`part_name`)으로 묶을 때 호출합니다.
- **Endpoint**: `GET, POST /api/v5/admin/mapping/team`

### 3.3 객실 투숙 정원 (Capacity) 매핑
- **Endpoint**: `GET, POST /api/v5/admin/mapping/room-capacity`

### 3.4 다올 매출 재분배 룰 (Daol Rules)
- **Endpoint**: `GET, POST, DELETE /api/v3/admin/daol-rules`

---

## 📐 4. 주요 지표(Metrics)의 정의
- **매출 (Revenue)**: 순수 판매 결제 금액 (발생 매출, Gross Sales). `summary.totalRevenue`
- **객실 (Room / Check-ins)**: 체크인/점유된 객실 수량. `summary.totalRooms`
- **숙박객 인원 (Room Guests / Capacity)**: 객실에 머무는 실제 사람 수. `summary.totalRoomCap`
- **골프 팀 수 (Golf Teams)**: 라운딩을 진행한 예약 팀 수. `summary.totalGolfTeams`

> **[요약 가이드]**
> 프론트엔드는 화면을 그리기 전, 데이터 가공(합산/정렬/그룹핑)이 필요한 상황이라면 무조건 로직 작성을 멈추고 백엔드 API 명세서를 확인해야 합니다. 필요한 모든 가공 데이터는 이미 API가 완성하여 내려줍니다.
