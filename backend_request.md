# 📢 [백엔드 API 신설 요청서] 레저본부 월별 방문객 목표 & 영업장별 이용률 목표 (`GET /api/v6/report/monthly-visitor-targets`)

## 1. 요청 배경 및 목적
프론트엔드(`Bell-operation`)에 **`/monthly-visitor-targets` ("월별 방문객 목표 & 레저본부 영업장별 이용률 목표 대조표")** 페이지가 신설되었습니다.
현재 프론트엔드는 Zero-Proxy / Fail-Stop 원칙에 따라 백엔드 V6 정규 마트(`/api/v6/report/venue-usage-rate` 및 `/api/v6/report/leisure-usage-rate`)에서 **연간 및 1월~12월 실적(`actual`, `actualRatePct`)**만 1:1 직결하여 표출하고 있으며, **월별 목표(`target`, `targetRatePct`)**와 **달성률(`achievementRatePct`)**은 백엔드 완제품 제공 전까지 `null`(`'-'`)로 비워두고 있습니다.

백엔드(`belleforet-data`)에서 아래 명세에 맞춰 **월별 방문객 목표 및 레저본부 영업장별 이용률 목표·실적·달성률 완제품 API**를 신설·배포해 주시면 프론트엔드 코드 수정 없이 즉시 100% 자동 바인딩됩니다.

---

## 2. 핵심 도메인 정의 및 SSOT 수식 (절대 준수)

1. **방문객 모수 등식 (`mat_v6_resort_visitors_daily` 기반)**:
   $$\text{숙박 방문객 (골프 중복 제외: roomGuestsExGolf)} + \text{나들이 방문객 (데일리 워크인: parkingWalkinVisitors)} = \text{레저본부 방문객 (targetPoolVisitors)}$$
   - **숙박 방문객 (`ROOM_VISITORS`)**: `room_total_guests - room_golf_synergy_guests` (순수 숙박 방문객)
   - **디지털지원 할당 (`WALKIN_DIGITAL`)**: **`= 나들이 방문객 (`parking_walkin_visitors`)`** (데일리 워크인 방문객)
   - **레저본부 방문객 (`LEISURE_TOTAL`)**: **`숙박 방문객 + 나들이 방문객`** (`targetPoolVisitors`)
   - **달성률 (`achievementRatePct`)**:
     $$\text{ROUND}\left(\frac{\text{actual}}{\text{target}} \times 100,\ 2\right)$$

2. **레저본부 영업장별 월별 이용률 및 달성률 공식**:
   - **대상 영업장 (레저본부 소속 격리, 타 본부 `놀이동산`·`모토아레나`·`골프장` 제외)**:
     - 시트 4대 핵심 영업장 (`isCoreSheetVenue: true`):
       1. **`미디어아트센터`** (`rawVenueName: "미디어아트센터"`)
       2. **`목장`** (`rawVenueName: "벨포레 목장"`)
       3. **`사계절썰매`** (`rawVenueName: "사계절썰매장"`)
       4. **`마운틴카트`** (`rawVenueName: "마운틴카트(전체)"`, 그랜드포렛 + 미니포렛 통합)
     - 그 외 레저본부 영업장 (`isCoreSheetVenue: false`):
       - `마운틴카트(그랜드포렛)`, `마운틴카트(미니포렛)`, `벨포레 목장(체험)`, `썸머랜드`, `마리나 클럽`, `원더풀`, `펫포레`
   - **월별 실적 이용률 (`actualRatePct`)**:
     $$\text{ROUND}\left(\frac{\text{해당 월 영업장 이용객 수 (visitors)}}{\text{해당 월 레저본부 방문객 모수 (targetPoolVisitors)}} \times 100,\ 2\right)$$
   - **이용률 달성률 (`achievementRatePct`)**:
     - 월별(`1`~`12`): $\text{ROUND}\left(\frac{\text{actualRatePct}}{\text{targetRatePct}} \times 100,\ 2\right)$ (소수점 둘째 자리, 예: `62.71%`)
     - 연간 전체(`annual`): $\text{ROUND}\left(\frac{\text{annual.actualRatePct}}{\text{annual.targetRatePct}} \times 100,\ 0\right)$ (또는 소수점 둘째 자리, 시트 표기 기준)

---

## 3. 시트 기준 목표치 참고 데이터 (2026년 기준 이미지 시트 실측치)

백엔드 DB(또는 구글 시트 SSOT 동기화 테이블)에 적재할 때 참고하실 수 있는 사용자 시트(`최종 업데이트 : 2026-11-02`) 기준 목표값입니다:

### 3-1. 월별 방문객 목표 (`visitorTargets`)
| 구분 (`rowKey`) | 전체 목표 | 1월 목표 | 2월 목표 | 3월 목표 | 4월 목표 | 5월 목표 | 6월 목표 | 비고 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **`LEISURE_TOTAL` (레저본부 방문객)** | `276,946` | `13,383` | `11,293` | `15,722` | `17,773` | `29,957` | `22,306` | `숙박 방문객 + 나들이 방문객` |
| **`ROOM_VISITORS` (숙박 방문객)** | `87,999` | `4,258` | `3,585` | `4,991` | `5,644` | `9,515` | `7,097` | `레저본부 방문객 - 디지털지원 할당` |
| **`WALKIN_DIGITAL` (디지털지원 할당 = 나들이 방문객)** | `188,947` | `9,125` | `7,708` | `10,731` | `12,129` | `20,442` | `15,209` | `나들이 방문객 (데일리 워크인)` |

*(※ 7월~12월 목표치도 원본 구글 시트에서 함께 추출하여 DB/시트 SSOT에 반영 요망)*

### 3-2. 월별 이용률 목표 (`venueUsageTargets`)
| 업장 (`venueName`) | 전체 목표(평균) | 1월 목표 | 2월 목표 | 3월 목표 | 4월 목표 | 5월 목표 | 6월 목표 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **`미디어아트센터`** | `22.20%` | `31.15%` | `28.21%` | `24.47%` | `19.61%` | `20.78%` | `20.81%` |
| **`목장` (`벨포레 목장`)** | `33.43%` | `28.35%` | `35.96%` | `45.45%` | `39.03%` | `44.16%` | `45.39%` |
| **`사계절썰매` (`사계절썰매장`)** | `13.47%` | `17.48%` | `15.23%` | `12.91%` | `11.38%` | `15.55%` | `15.16%` |
| **`마운틴카트` (`마운틴카트(전체)`)** | `12.93%` | `8.47%` | `8.00%` | `10.29%` | `11.28%` | `19.34%` | `16.77%` |

---

## 4. 요청 API 엔드포인트 및 응답 JSON 규격

* **Endpoint**: `GET /api/v6/report/monthly-visitor-targets` *(또는 `/api/v6/dashboard/monthly-visitor-targets`)*
* **Query Parameters**:
  * `year=YYYY` (조회 연도, 기본값: 최신 영업일 기준 연도 `2026`)

### 응답 JSON 스키마 (`MonthlyVisitorTargetsResponse`)
```json
{
  "success": true,
  "year": 2026,
  "lastUpdated": "2026-11-02",
  "isTargetEndpointReady": true,
  "ssotFormula": "숙박 방문객(골프제외) + 나들이 방문객(디지털지원 할당) = 레저본부 방문객",
  "visitorTargets": [
    {
      "rowKey": "LEISURE_TOTAL",
      "label": "레저본부 방문객",
      "subLabel": "숙박 방문객 + 나들이 방문객 (통합 모수)",
      "badgeText": "숙박 + 나들이 = 레저본부 방문객",
      "annual": {
        "target": 276946,
        "actual": 402353,
        "achievementRatePct": 145.28
      },
      "monthly": {
        "1": { "target": 13383, "actual": 20411, "achievementRatePct": 152.51 },
        "2": { "target": 11293, "actual": 27022, "achievementRatePct": 239.28 },
        "3": { "target": 15722, "actual": 31730, "achievementRatePct": 201.82 },
        "4": { "target": 17773, "actual": 41610, "achievementRatePct": 234.12 },
        "5": { "target": 29957, "actual": 45866, "achievementRatePct": 153.11 },
        "6": { "target": 22306, "actual": null, "achievementRatePct": null },
        "7": { "target": null, "actual": null, "achievementRatePct": null },
        "8": { "target": null, "actual": null, "achievementRatePct": null },
        "9": { "target": null, "actual": null, "achievementRatePct": null },
        "10": { "target": null, "actual": null, "achievementRatePct": null },
        "11": { "target": null, "actual": null, "achievementRatePct": null },
        "12": { "target": null, "actual": null, "achievementRatePct": null }
      }
    },
    {
      "rowKey": "ROOM_VISITORS",
      "label": "숙박 방문객",
      "subLabel": "순수 숙박객 (골프 중복 숙박객 제외)",
      "badgeText": "숙박객 (골프제외)",
      "annual": {
        "target": 87999,
        "actual": 128414,
        "achievementRatePct": 145.93
      },
      "monthly": {
        "1": { "target": 4258, "actual": 7831, "achievementRatePct": 183.91 }
      }
    },
    {
      "rowKey": "WALKIN_DIGITAL",
      "label": "디지털지원 할당",
      "subLabel": "나들이 방문객 (= 데일리 워크인 고객)",
      "badgeText": "디지털지원 할당 = 나들이 방문객",
      "annual": {
        "target": 188947,
        "actual": 273939,
        "achievementRatePct": 144.98
      },
      "monthly": {
        "1": { "target": 9125, "actual": 12580, "achievementRatePct": 137.86 }
      }
    }
  ],
  "venueUsageTargets": [
    {
      "venueKey": "MEDIA_ART",
      "venueName": "미디어아트센터",
      "rawVenueName": "미디어아트센터",
      "partName": "미디어아트",
      "isCoreSheetVenue": true,
      "annual": {
        "targetRatePct": 22.2,
        "actualRatePct": 14.17,
        "achievementRatePct": 64,
        "visitors": 52359,
        "denominator": 223878
      },
      "monthly": {
        "1": {
          "targetRatePct": 31.15,
          "actualRatePct": 19.53,
          "achievementRatePct": 62.71,
          "visitors": 3594,
          "denominator": 13531
        }
      }
    }
  ]
}
```
