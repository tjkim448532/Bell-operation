# 📢 [백엔드 API 업데이트 요청서] 신규 목표 전용 구글시트(`1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA`) 기준 실적·달성률 완제품 산출 (`GET /api/v6/report/monthly-visitor-targets`)

## 1. 요청 배경 및 핵심 규칙
대표님께서 **순수 목표 전용 구글 스프레드시트**를 새로 정리해 주셨습니다:
* **신규 목표 전용 시트 URL**: `https://docs.google.com/spreadsheets/d/1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA/edit?usp=sharing`
* **백엔드 파싱용 JSON / CSV URL**:
  * JSON: `https://docs.google.com/spreadsheets/d/1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA/gviz/tq?tqx=out:json`
  * CSV: `https://docs.google.com/spreadsheets/d/1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA/gviz/tq?tqx=out:csv`

### 적용 원칙
1. **`목표(Target)`**: 위 구글 시트(`1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA`)의 4대 목표 테이블(`월별 방문객 목표`, `월별 이용율 목표`, `월별 매출 목표(부가세포함)`, `객단가`) 수치를 SSOT로 사용합니다.
2. **`실적(Actual)` 및 `달성률(Achievement Rate)`**: 백엔드(`belleforet-data`)의 실제 V6 정규 마트(`mat_v6_resort_visitors_daily`, `fact_v6_*`) 데이터와 비교하여 **1월~12월 및 연간 전체 `실적`과 `달성률(%)`을 100% 백엔드에서 사전 연산**하여 내려주십시오.

---

## 2. 신규 시트 4대 목표 테이블 전수 명세 및 백엔드 비교 규칙

### 2-1. [표 1] 월별 방문객 목표 (`visitorTargets`)
* **등식**: `숙박 방문객 (ROOM_VISITORS)` + `디지탈 지원 할당 (= 나들이 방문객, WALKIN_DIGITAL)` = `전체 방문객 (= 레저본부 방문객, LEISURE_TOTAL)`
* **실적 매핑**:
  * `LEISURE_TOTAL.actual`: `targetPoolVisitors` (`roomGuestsExGolf + parkingWalkinVisitors`)
  * `ROOM_VISITORS.actual`: `roomGuestsExGolf` (`room_total_guests - room_golf_synergy_guests`)
  * `WALKIN_DIGITAL.actual`: `parkingWalkinVisitors`
* **1월~12월 및 합계 목표치 (시트 원본)**:

| 구분 (`rowKey`) | 1월 | 2월 | 3월 | 4월 | 5월 | 6월 | 7월 | 8월 | 9월 | 10월 | 11월 | 12월 | 합계 (`annual.target`) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **`WALKIN_DIGITAL` (디지탈 지원 할당 = 나들이 방문객)** | `9,125` | `7,708` | `10,731` | `12,129` | `20,442` | `15,209` | `18,345` | `21,746` | `15,662` | `25,846` | `16,682` | `15,322` | **`188,930`** |
| **`ROOM_VISITORS` (숙박 방문객 = 전체 - 디지탈지원)** | `4,258` | `3,585` | `4,991` | `5,644` | `9,515` | `7,097` | `8,543` | `10,123` | `7,288` | `12,043` | `7,761` | `7,151` | **`88,016`** *(월별합 `87,999`)* |
| **`LEISURE_TOTAL` (전체 방문객 = 레저본부 방문객)** | `13,383` | `11,293` | `15,722` | `17,773` | `29,957` | `22,306` | `26,888` | `31,869` | `22,950` | `37,889` | `24,443` | `22,473` | **`276,946`** |

---

### 2-2. [표 2] 월별 이용율 목표 (`venueUsageTargets`, 단위: `%`)
* **실적 이용률(`actualRatePct`)**: `ROUND((해당 영업장 이용객 수 visitors / 해당 월 레저본부 방문객 모수 targetPoolVisitors) * 100, 2)`
* **달성률(`achievementRatePct`)**:
  * 월별(`1`~`12`): `ROUND((actualRatePct / targetRatePct) * 100, 2)`
  * 연간(`annual`): `ROUND((annual.actualRatePct / annual.targetRatePct) * 100, 0)` (또는 소수점 둘째 자리)
* **시트 원본 목표치 (연간 평균 목표가 신규 시트 기준으로 변경됨)**:

| 업장 (`venueName` / `rawVenueName`) | 1월 | 2월 | 3월 | 4월 | 5월 | 6월 | 7월 | 8월 | 9월 | 10월 | 11월 | 12월 | 평균 (`annual.targetRatePct`) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **`미디어아트센터`** (`미디어아트센터`) | `31.15` | `28.21` | `24.47` | `19.61` | `20.78` | `20.81` | `14.78` | `14.44` | `21.46` | `18.33` | `28.46` | `23.86` | **`21.06`** |
| **`목장`** (`벨포레 목장`) | `28.35` | `35.96` | `45.45` | `39.03` | `44.16` | `45.39` | `17.28` | `14.88` | `24.60` | `36.07` | `44.18` | `25.79` | **`32.71`** |
| **`사계절썰매`** (`사계절썰매장`) | `17.48` | `15.23` | `12.91` | `11.38` | `15.55` | `15.16` | `5.00` | `4.58` | `10.41` | `13.53` | `23.21` | `17.16` | **`13.00`** |
| **`마운틴카트`** (`마운틴카트(전체)`) | `8.47` | `8.00` | `10.29` | `11.28` | `19.34` | `16.77` | `7.69` | `10.70` | `14.83` | `18.30` | `22.95` | `6.49` | **`13.75`** |

---

### 2-3. [표 3] 월별 매출 목표(부가세포함) (`venueRevenueTargets`, 단위: `원`)
* **🚨 핵심 집계 기준 (시트 하단 주석 필수 준수)**:
  1. **부가세 포함(VAT-inclusive) 총매출액** 기준으로 실제 백엔드 매출(`actual`)을 집계해야 합니다.
  2. **`미디어아트센터` 총 매출 합**: **`미디어아트센터` + `미디어-뮤지엄카페`(카페) + `미디어-기프트샵`(기념품)** 합산 매출
  3. **`목장` 총 매출 합**: **`벨포레 목장`(입장) + `벨포레 목장(체험)`(목장체험) + `얼룩말카페`** 합산 매출
  4. **`마운틴카트` 총 매출 합**: **`마운틴카트(그랜드포렛)` + `마운틴카트(미니포렛)`** 합산 매출
  5. **`합계` (`venueKey: "TOTAL"`, `isSummaryRow: true`)**: 위 7개 레저본부 업장(`미디어아트센터`, `목장`, `사계절썰매`, `마운틴카트`, `원더풀`, `썸머랜드`, `마리나`)의 월별/연간 매출 합계 및 달성률

| 업장 (`venueKey` / `venueName`) | 1월 | 2월 | 3월 | 4월 | 5월 | 6월 | 7월 | 8월 | 9월 | 10월 | 11월 | 12월 | 합계 (`annual.target`) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **`MEDIA_ART` (`미디어아트센터`)** | `40,662,519` | `31,073,857` | `37,525,329` | `33,995,473` | `60,719,280` | `45,276,884` | `38,762,849` | `44,886,773` | `48,039,133` | `67,742,054` | `67,853,484` | `52,301,512` | **`568,839,146`** |
| **`RANCH` (`목장`)** | `43,821,630` | `46,904,120` | `82,532,246` | `80,120,062` | `152,795,079` | `116,940,209` | `53,664,146` | `54,771,338` | `65,207,835` | `157,848,795` | `124,727,496` | `66,941,336` | **`1,046,274,292`** |
| **`SLED` (`사계절썰매`)** | `22,303,348` | `16,397,754` | `19,351,257` | `19,283,158` | `44,412,361` | `32,240,075` | `12,817,510` | `13,915,828` | `22,777,632` | `48,874,923` | `54,088,482` | `36,766,601` | **`343,228,929`** |
| **`MOUNTAIN_CART` (`마운틴카트`)** | `5,098,762` | `4,064,311` | `17,890,500` | `22,157,147` | `64,067,223` | `41,366,236` | `22,859,458` | `37,716,275` | `37,637,050` | `76,669,316` | `62,016,712` | `6,561,318` | **`398,104,308`** |
| **`WONDERPOOL` (`원더풀`)** | `null` | `null` | `null` | `null` | `null` | `3,843,000` | `41,283,000` | `40,968,000` | `3,906,000` | `null` | `null` | `null` | **`90,000,000`** |
| **`SUMMERLAND` (`썸머랜드`)** | `null` | `null` | `null` | `null` | `null` | `29,619,000` | `159,173,000` | `169,106,000` | `4,676,000` | `109,000` | `null` | `null` | **`362,683,000`** |
| **`MARINA_CLUB` (`마리나`)** | `null` | `null` | `2,760,000` | `4,140,000` | `6,900,000` | `13,800,000` | `41,400,000` | `41,400,000` | `16,560,000` | `8,280,000` | `2,760,000` | `null` | **`138,000,000`** |
| **`TOTAL` (`합계`, `isSummaryRow: true`)** | `111,886,259` | `98,440,042` | `160,059,332` | `159,695,840` | `328,893,943` | `283,085,404` | `369,959,963` | `402,764,214` | `198,803,650` | `359,524,088` | `311,446,174` | `162,570,767` | **`2,947,129,676`** |

---

### 2-4. [표 4] 목표 객단가 (`venueUnitPriceTargets`, 단위: `원`)
* **실적 객단가(`actual`)**: `ROUND(해당 업장 총매출(부가세포함) / 해당 업장 입장객 수(visitors), 0)`
* **달성률(`achievementRatePct`)**: `ROUND((actual / target) * 100, 2)`
* **목표 객단가 (시트 원본)**:
  * `미디어아트센터`: 전월 `9,754원`
  * `목장`: 전월 `11,550원`
  * `사계절썰매`: 전월 `9,534원`
  * `마운틴카트`: 3월~11월 및 연간 기본 `11,056원` / **`12월, 1월, 2월` 동계 객단가 `4,500원`**
  * `원더풀`: `45,000원` (운영월 6~9월 및 연간)
  * `썸머랜드`: `25,000원` (운영월 6~10월 및 연간)
  * `마리나`: `23,000원` (운영월 3~11월 및 연간)

---

## 3. 응답 JSON 추가 스키마 (`venueRevenueTargets` & `venueUnitPriceTargets`)
기존 `/api/v6/report/monthly-visitor-targets` 응답에 아래 두 배열을 함께 포함하여 내려주시면 프론트엔드에서 4개 테이블 모두 1:1 직결 렌더링됩니다:

```json
{
  "success": true,
  "year": 2026,
  "lastUpdated": "2026-11-05",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA/edit?usp=sharing",
  "isTargetEndpointReady": true,
  "visitorTargets": [ ... ],
  "venueUsageTargets": [ ... ],
  "venueRevenueTargets": [
    {
      "venueKey": "MEDIA_ART",
      "venueName": "미디어아트센터",
      "rawVenueName": "미디어아트센터",
      "isSummaryRow": false,
      "annual": { "target": 568839146, "actual": 569153172, "achievementRatePct": 100.06 },
      "monthly": {
        "1": { "target": 40662519, "actual": 45530514, "achievementRatePct": 111.97 }
      }
    }
  ],
  "venueUnitPriceTargets": [
    {
      "venueKey": "MOUNTAIN_CART",
      "venueName": "마운틴카트",
      "rawVenueName": "마운틴카트(전체)",
      "isSummaryRow": false,
      "annual": { "target": 11056, "actual": 10769, "achievementRatePct": 97.4 },
      "monthly": {
        "1": { "target": 4500, "actual": 4857, "achievementRatePct": 107.93 },
        "2": { "target": 4500, "actual": 7258, "achievementRatePct": 161.29 },
        "3": { "target": 11056, "actual": 10694, "achievementRatePct": 96.73 },
        "12": { "target": 4500, "actual": null, "achievementRatePct": null }
      }
    }
  ]
}
```


---

## 3. [신규 요청] 영업장별 이용률 API 내 '전사대비 이용률(usageRateTotalResortPct)' 모수 SSOT 통일

### 3-1. 요청 배경
- **현상**: 현재 `/api/v6/report/venue-usage-rate`의 `usageRateTotalResortPct`가 골프를 포함한 전사 물리 방문객(`netPhysicalResortGuests`, 약 4,354명)을 분모로 사용하여, 레저 미이용 고객인 골프 내장객으로 인해 레저 시설의 이용률이 왜곡/희석되고 있었습니다.
- **대표님/사용자 지시사항**:
  > **"전사대비도 공식이용율과 똑같은 모수를 이용하고 화면에도 표시해"**

### 3-2. 백엔드 산출 규칙 수정 요청 (`GET /api/v6/report/venue-usage-rate`)
1. **`usageRateTotalResortPct` 분모 통일**:
   - 기존 분모: `netPhysicalResortGuests` (골프 100% 포함)
   - **변경 분모**: `targetPoolVisitors` (골프 제외 순수 숙박객 `roomGuestsExGolf` + 데일리 워크인 `parkingWalkinVisitors`)
   - **산식**: `ROUND((visitors / targetPoolVisitors) * 100, 1)`
2. **`denominator.totalResortDenominator` 필드 제공**:
   - `totalResortDenominator`: `targetPoolVisitors` 수치와 100% 동일하게 일치시켜 반환.
