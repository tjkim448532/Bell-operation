# 📖 Belleforet Data Platform API 명세서 (V6.0 SSOT)

본 문서는 벨포레 리조트 데이터 플랫폼의 통합 대시보드 및 리포트 연동을 위한 **공식 단일 API 명세서(Single Source of Truth)**입니다. 프론트엔드 팀은 이 문서 하나만으로 모든 화면 연동을 수행할 수 있으며, 규정된 무관용 원칙을 100% 준수해야 합니다.

---

## 🚨 제1장: 프론트엔드 무관용 원칙 (Zero-Computation Policy)

프론트엔드(Client)에서 매출 데이터를 조작하거나 연산하는 행위는 재무 무결성을 파괴하므로 **절대 엄수**해야 합니다.

1.  **NO SLICE SUMMATION (자체 연산 금지):**
    *   배열 데이터를 `reduce`, `for` 문 등으로 직접 더해서 총합(Grand Total)이나 소계(Subtotal)를 구해서는 안 됩니다.
    *   **모든 총합과 소계는 백엔드 API가 계산해서 내려주는 완성된 값만 화면에 렌더링(Print)하십시오.**
2.  **다중 월(Multi-month) 단일 호출 원칙:**
    *   대시보드에서 3개월 치 데이터를 볼 때, API를 일별로 N번 반복 호출하여 프론트엔드에서 누적(가산)하지 마십시오.
    *   반드시 파라미터(`startDate`, `endDate`)를 던져 백엔드 단에서 합산된 1개의 응답을 받아야 합니다.
3.  **동적 화면 제어(Toggle) 시 뺄셈(Minus) 연산:**
    *   칸반보드에서 특정 팀을 끌(Toggle Off) 때, 남은 팀들의 값을 프론트엔드에서 다시 더하지 마십시오.
    *   백엔드가 준 전체 총합(Grand Total)에서, 토글 오프한 팀의 소계(`isSubtotal: true`) 값을 **빼는 방식(Minus)**으로 UI를 렌더링해야 오차가 발생하지 않습니다.
4.  **카멜케이스(camelCase) 강제:**
    *   모든 API 응답 Key는 100% `camelCase`로 정규화되어 서빙됩니다. (예: `green_fee` ❌ ➔ `greenFeeRevenue` ⭕)

---

## 📡 제2장: 핵심 API 명세 (Endpoints)

### [API 1] 대시보드 메인 요약 (전역 상태 및 최상단 지표용)
*   **Method / URL:** `GET /api/v5/dashboard/revenue-summary`
*   **Query Params:** `date=YYYY-MM-DD` (또는 `startDate`, `endDate`)
*   **Description:** 대시보드 최상단의 전체 매출, 객실 가동률, 골프 내장객 요약 지표를 제공합니다.
*   **Response (200 OK):**
    ``json
    {
      "summary": {
        "totalRevenue": 245000000.00,
        "totalRooms": 150,
        "totalRoomCapacity": 300,
        "totalGolfTeams": 85
      },
      "salesByCategory": [ ... ],
      "salesByFacility": [ ... ],
      "dailyTrends": [ ... ]
    }
    ``

### [API 2] 요일비교 매트릭스 (표/칸반보드 렌더링용)
*   **Method / URL:** `GET /api/v5/dashboard/matrix-weekly`
*   **Query Params:** `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
*   **Description:** 정해진 13개 대분류 정렬 순서(ROOM ➔ GOLF ➔ FNB ➔ ... ➔ TOTAL)가 강제된 매트릭스 데이터를 반환합니다.
*   **Response (200 OK):**
    ``json
    [
      {
        "isSubtotal": true,
        "isGrandTotal": false,
        "subtotalType": "CATEGORY",
        "categoryCode": "GOLF",
        "categoryName": "골프",
        "todayActual": 88970000.00,
        "todayLy": 85000000.00,
        "todayGrowth": 4.67
      }
    ]
    ``
    *   *주의:* `isSubtotal`과 `isGrandTotal` 플래그를 활용하여 굵은 글씨 및 하이라이트 UI 처리를 수행하십시오.

### [API 3] 신규 V6 골프 전용 대시보드 (Zero-Variance 적용본)
*   **Method / URL:** `GET /api/v6/dashboard/golf-sales`
*   **Query Params:** `date=YYYY-MM-DD`
*   **Description:** V6 마트 뷰(`vw_mart_golf_sales_dashboard`)를 직접 조회하여, 이중 계상이 완전히 차단된 순수 골프 본매출을 서빙합니다.
*   **Response (200 OK):**
    ``json
    [
      {
        "facilityName": "골프클럽",
        "greenFeeRevenue": 88970000.00,
        "cartFeeRevenue": 8454545.00,
        "extraRevenue": 0.00,
        "caddieFeeRevenue": 0.00,
        "visitors": 617
      }
    ]
    ``

### [API 4 & 5] 관리자(Admin) 웹 매핑 API (HITL 적용본)
*   **Facility Groups:** `GET, POST /api/v5/admin/mapping/facility-groups?mode={카테고리명}`
*   **Team Mapping:** `GET, POST /api/v5/admin/mapping/team`
*   **Approve Rules (V6):** `POST /api/v6/admin/mapping/approve`
    *   *Description:* 미분류 데이터에 대한 매핑 룰을 관리자가 승인합니다. 승인 즉시 백엔드에서 SQS DLQ 자동 재처리(Redrive)가 백그라운드에서 실행됩니다.

### [API 6 & 7] 객실 상세 리포트
*   **세그먼트(상품) 중심:** `GET /api/v5/report/room-channel-sales?date=YYYY-MM-DD` (segmentName 기준 1-depth)
*   **판매채널(OTA) 중심:** `GET /api/v5/report/room-sales-by-channel?date=YYYY-MM-DD` (channelName 기준 1-depth)

---

## 📝 제3장: 신규 API 및 데이터 수정 요청 프로토콜

프론트엔드 팀이 기획 요구사항으로 인해 새로운 데이터나 차트가 필요할 경우, **반드시 아래의 양식에 맞추어 백엔드(데이터 엔지니어링) 파트에 요청**해야 합니다. 
프론트엔드에서 데이터를 직접 필터링하거나 변환하는 우회 개발은 전면 금지됩니다.

### ❌ 잘못된 요청 (Reject 대상)
> "대시보드에 파트별 점유율 파이 차트를 넣어야 합니다. 전체 매출 Array 데이터를 주시면 저희가 프론트에서 reduce 돌려서 % 계산해서 렌더링하겠습니다."

### ⭕ 올바른 요청 양식
> **[신규 API 요청서]**
> *   **목적:** 대시보드 파트별 점유율 파이 차트 렌더링
> *   **필요한 응답 구조:** 프론트엔드가 연산 없이 바로 그릴 수 있도록 백엔드에서 % 단위로 사전 계산된 `[{ "partName": "FNB", "sharePercent": 34.5 }]` 형태의 API 엔드포인트 신설을 요청합니다.
> *   **검토 요청:** 0-Variance 아키텍처에 맞추어 백엔드 마트 뷰(Mart View) 쿼리에 해당 로직을 추가해 주십시오.

