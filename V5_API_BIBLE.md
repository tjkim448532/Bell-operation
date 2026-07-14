# 벨포레 데이터 통합 통제 API 명세서 (Frontend 연동 가이드)

본 문서는 프론트엔드 개발자가 **"어떤 화면에서, 어떤 목적일 때, 어떤 API를 호출해야 하는가?"**를 명확히 판단할 수 있도록 작성된 종합 명세서입니다. 
기존 데이터 바인딩 규칙(Bible)과 함께, 프론트엔드 연동의 유일한 참조 문서(SSOT)로 활용됩니다.

> [!WARNING]
> **기존(Legacy) API 사용 가능 여부 안내**
> 기존에 사용하시던 V3 / V4 API들도 하위 호환성을 위해 삭제하지 않고 유지해 두었습니다. 따라서 즉각적인 장애가 발생하지는 않습니다. 
> 하지만, V3/V4 API는 과거의 '통짜 합산' 방식의 쿼리를 사용하기 때문에, **UFO 회전그네, 미니골프, 모토아레나 렌탈샵 등 개별 영업장을 분리해서 보여주는 최신 매핑 로직이 반영되지 않습니다.** 
> 따라서, 정확하고 세분화된 데이터를 화면에 노출하기 위해서는 반드시 본 문서에 명시된 **V5 API**로 엔드포인트를 전면 교체(Migration)하셔야 합니다.

---

## 📊 1. 대시보드 (Dashboard) 화면용 API
대시보드 메인 화면을 구성하는 핵심 지표와 차트, 보드를 렌더링할 때 사용합니다.

### 1.1 메인 요약 지표 (Global KPI)
> 대시보드 최상단의 매출 총액, 전체 객실 수, 투숙 인원, 골프 팀 수 등을 렌더링할 때 호출합니다.
- **Endpoint**: `GET /api/v5/dashboard/revenue-summary`
- **Query Parameter**: `?date=YYYY-MM-DD` (선택 사항, 기본값: 오늘)
- **주요 응답 데이터**: 
  - `summary`: `totalRevenue`, `totalRooms`, `totalRoomCap`, `totalGolfTeams`
  - `dailyTrends`: 최근 7일간의 요일별 트렌드 배열 (그래프 렌더링용)
  - `salesByCategory`: 대분류별 매출 (파이 차트용)

### 1.2 요일비교 매트릭스 보드 (Matrix Weekly)
> 각 파트/팀별 개별 영업장 카드(예: UFO 회전그네, 마운틴카트 등)와 요일별 비교 표를 그릴 때 호출합니다. 
- **Endpoint**: `GET /api/v5/dashboard/matrix-weekly`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **주의사항**: 프론트엔드는 이 API가 내려주는 배열 순서를 **절대 임의로 정렬(Sort)하지 말고** 그대로 렌더링해야 합니다. 총합(Grand Total) 및 소계(Subtotal) 카드가 이미 정확한 위치에 삽입(`isSubtotal: true`)되어 내려옵니다.
- **주요 필드**: `teamName`, `partName`, `shopName`(영업장 이름), `todayActual`(오늘 매출), `todayLy`(전주 동일 요일 매출), `isSubtotal`

### 1.3 파트별 매출 비율 (Donut Chart)
> 부문별(예: 식음, 티켓) 하위 파트들의 매출 비율을 도넛 차트로 그릴 때 호출합니다.
- **Endpoint**: `GET /api/v5/dashboard/revenue-by-segment`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **응답**: `foodAndBeverage`(식음), `tickets`(티켓) 등 카테고리별로 분리된 배열.

### 1.4 주차장 요약 (Parking)
> 대시보드 하단의 차량 입출차 요약 정보를 렌더링할 때 호출합니다.
- **Endpoint**: `GET /api/v5/dashboard/parking-summary`
- **Query Parameter**: `?date=YYYY-MM-DD`

---

## 📈 2. 리포트 (Reports) 화면용 API
상세 엑셀 다운로드나 일일 영업보고서 등의 표(Table)를 렌더링할 때 사용합니다.

### 2.1 일일 영업 실적 리포트 (Daily Sales)
> '영업일보' 화면의 엑셀과 동일한 길고 상세한 표를 그릴 때 호출합니다.
- **Endpoint**: `GET /api/v5/report/daily-sales`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **특징**: 프론트엔드 연산 부하를 없애기 위해, 백엔드에서 1차원 배열(Flat Array)로 소계/합계를 모두 끼워 넣어 반환합니다.
- **추가 정보**: 객실 분모인 `totalInventory`와 당일 기상 정보 `weather`가 최상단에 포함됩니다.

### 2.2 객실 채널별 상세 실적 (Room Channel Sales)
> 객실 부문의 OTA/회원사 등 채널별 상세 판매 현황을 뎁스(Depth)별로 보고자 할 때 호출합니다.
- **Endpoint**: `GET /api/v5/report/room-channel-sales`
- **Query Parameter**: `?date=YYYY-MM-DD`
- **특징**: 세그먼트 ➔ 채널 ➔ 평수 타입의 3-Depth로 구성되며, 각 뎁스별 소계(`isSegmentSubtotal`, `isChannelSubtotal`)가 미리 계산되어 내려옵니다.

### 2.3 팀/조직별 통합 실적 (Team Revenue)
> 본부(Team) 및 하위 파트(Part)별로 그룹핑된 매출을 볼 때 호출합니다.
- **Endpoint**: `GET /api/v5/reports/team-revenue`
- **Query Parameter**: `?date=YYYY-MM-DD`

---

## ⚙️ 3. 어드민 통제 센터 (Admin Mapping) API
관리자 화면에서 영업장과 카테고리를 묶거나 분배 룰을 설정할 때 사용하는 CUD API입니다.

### 3.1 POS 트랜잭션 ➔ 표준 영업장 매핑
> 현장 POS 기기에 새로 생긴 결제 메뉴를 발견하고, 이를 어떤 카테고리(식음, 티켓 등)와 어떤 '표준 영업장(카드명)'으로 확정할지 저장할 때 호출합니다.
- **Endpoint**: `GET, POST /api/v3/admin/mapping`
- **Payload (POST)**: `facility_name`, `product_name`, `revenue_category`, `is_visitor_ticket`, `standard_facility_name`
- **역할**: 이 API로 확정된 `standard_facility_name`이 향후 `matrix-weekly`의 개별 카드 이름(`shopName`)이 됩니다.

### 3.2 조직도 (본부/파트) 매핑
> 3.1에서 개별 분리된 수많은 영업장 카드들을 "놀이동산 본부 - 기구 파트" 처럼 조직도로 그룹핑할 때 호출합니다.
- **Endpoint**: `GET, POST /api/v5/admin/mapping/team`
- **Payload (POST)**: `mappings` 배열 (`facility_name`, `team_name`, `part_name`)

### 3.3 객실 투숙 정원 (Capacity) 매핑
> 객실 요금제(Rate Code)별로 기본 투숙 정원(성인/아동 수)을 설정할 때 호출합니다.
- **Endpoint**: `GET, POST /api/v5/admin/mapping/room-capacity`
- **Payload (POST)**: `rate_code`, `adults_count`, `children_count`

### 3.4 다올 매출 재분배 룰 (Daol Rules)
> 다올(패키지)에서 발생한 매출 중 일부를 골프나 식음 파트로 떼어주는 정산 룰을 관리합니다.
- **Endpoint**: `GET, POST, DELETE /api/v3/admin/daol-rules`
- **Payload (POST)**: `rule_type`, `original_account_name`, `target_category`, `allocation_value`

---
> **[요약 가이드]**
> 프론트엔드는 화면을 그리기 전, 데이터 가공(합산/정렬/그룹핑)이 필요한 상황이라면 무조건 로직 작성을 멈추고 백엔드 API 명세서를 확인해야 합니다. 필요한 모든 가공 데이터는 이미 API가 완성하여 내려줍니다.
