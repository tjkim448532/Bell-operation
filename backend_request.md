# 📋 [Backend Request] 매장별 이용률 계산 전용 SSOT API 명세서

## 1. 개요 및 비즈니스 목적
- **요청일시**: 2026-10-24
- **요청 목적**: 숙박객(골프 제외) 및 데일리 워크인 고객을 합산한 통합 모수(Denominator)를 기준으로 각 영업장/매장별 실질 고객 이용률(Utilization Rate %)을 산출하는 전용 완제품 API 제공
- **적용 화면**: `매장별 이용률 계산` 대시보드 (`/venue-usage-rate`)

---

## 2. 모수(Denominator) 및 분자(Numerator) 정의 (SSOT)

### 2.1 통합 모수 (Base Population)
$$\text{총 기준 모수} = \text{숙박객(골프 제외)} + \text{데일리 워크인 고객}$$
- **숙박객 (`roomGuests` / `roomTotalGuests`)**: 객실 정규 체크인 실운영 투숙 인원 (골프 이용객 제외)
- **데일리 워크인 (`parkingWalkinVisitors`)**: 주차 게이트 기반 당일 비숙박 레저/식음 방문객
- **제외 대상**: 순수 골프 내장객(`golfTotalPlayers`)은 리조트 일반 영업장 모수에서 철저히 격리

### 2.2 영업장별 분자 (Facility Usage)
- **이용 고객수 (`visitors`)**: 각 매장별 실측 순수 이용객수 (F&B 잡화/생수 0명 처리 룰 적용 후 실질 발권/탑승 인원)

### 2.3 영업장별 이용률 산출식
$$\text{영업장 이용률(\%)} = \frac{\text{영업장 이용 고객수(명)}}{\text{숙박객(골프제외)} + \text{데일리 워크인 고객}} \times 100$$

---

## 3. 권장 신규 엔드포인트 명세
- **Endpoint**: `GET /api/v6/report/venue-usage-rate`
- **Query Parameters**:
  - `startDate` (YYYY-MM-DD): 조회 시작일
  - `endDate` (YYYY-MM-DD): 조회 종료일
  - `period` (optional): `monthly` | `yearly` | `custom`

### 3.1 Response JSON 구조 (권장 규격)
```json
{
  "success": true,
  "period": {
    "startDate": "2026-09-01",
    "endDate": "2026-09-30",
    "label": "2026년 9월"
  },
  "population": {
    "totalBase": 24613,
    "roomGuests": 10588,
    "roomGuestsShare": 43.0,
    "walkinGuests": 14025,
    "walkinGuestsShare": 57.0,
    "golfExcluded": 11335,
    "lyTotalBase": 22800,
    "baseGrowth": 7.95
  },
  "summary": {
    "totalFacilityVisitors": 32701,
    "totalRevenue": 2507051279,
    "topFacility": {
      "name": "벨포레 목장",
      "visitors": 9926,
      "usageRate": 40.3
    }
  },
  "facilities": [
    {
      "rank": 1,
      "facilityName": "벨포레 목장",
      "categoryName": "레저본부",
      "categoryCode": "TICKET",
      "visitors": 9926,
      "usageRate": 40.3,
      "lyVisitors": 6693,
      "lyUsageRate": 29.4,
      "rateDiff": 10.9,
      "visitorGrowth": 48.3,
      "revenue": 56192910,
      "unitPrice": 5661
    }
  ],
  "monthlyTrend": [
    {
      "month": "2026-07",
      "totalBase": 22878,
      "roomGuests": 12708,
      "walkinGuests": 10170
    }
  ]
}
```

---

## 4. 프론트엔드 임시 브릿지 현황
- 백엔드 배포 전까지 프론트엔드 SSR API 라우트(`src/app/api/venue-usage-rate/route.ts`)에서 백엔드 `revenue-summary`의 공식 V6 마트 데이터를 호출하여 동일한 완제품 규격으로 캐싱 및 서빙합니다.
- 백엔드에 본 엔드포인트가 정식 배포되면 즉시 1:1 교체 바인딩 가능하도록 설계되었습니다.
