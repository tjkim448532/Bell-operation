# 📋 [Backend Spec & Integration Complete] 매장별 이용률 계산 전용 SSOT API (`GET /api/v6/report/venue-usage-rate`)

## 1. 개요 및 연동 상태
- **백엔드 배포 커밋**: `belleforet-data` (`c1663fe1`)
- **엔드포인트**: `GET /api/v6/report/venue-usage-rate` (및 `/api/v6/dashboard/venue-usage-rate`)
- **프론트엔드 페이지**: `/venue-usage-rate` (`src/components/venue-usage/VenueUsageRateDashboard.tsx`)
- **연동 방식**: Zero-Proxy 1:1 완제품 필드 직결 바인딩 (`denominator`, `summary`, `venues`, `mountainCartCombined`, `fnbAndOtherVenues`, `dailyTrends`, `monthlyTrends`)

---

## 2. SSOT 모수(Denominator) 및 이용률 공식 (`mat_v6_resort_visitors_daily` 기반)
$$\text{모수 (targetPoolVisitors)} = \underbrace{(\text{room\_total\_guests} - \text{room\_golf\_synergy\_guests})}_{\text{숙박객 (골프 중복 제외: roomGuestsExGolf)}} + \underbrace{\text{parking\_walkin\_visitors}}_{\text{데일리 워크인 고객}}$$

$$\text{영업장 이용률 (usageRatePct)} = \text{ROUND}\left(\frac{\text{해당 영업장 이용객 수 (visitors)}}{\text{targetPoolVisitors}} \times 100,\ 1\right)$$

### 실측 검증 수치 (`2026-10-23` 기준)
- 전체 숙박객 (`roomTotalGuests`): `421명` (`104실`)
- 숙박·골프 중복 (`roomGolfSynergyGuests`): `-86명` (`20실`)
- **숙박객(골프 제외) (`roomGuestsExGolf`)**: **`335명`** (`51.8%`)
- **데일리 워크인 고객 (`parkingWalkinVisitors`)**: **`312명`** (`48.2%`)
- **최종 이용률 모수 (`targetPoolVisitors`)**: **`647명`** (전년 동기 `757명`, 증감 `-110명` / `-14.5%`)
- **영업장 총 이용객 (`totalVenueVisitors`)**: **`976명`** (전년 `1,147명`, `-14.9%`)
- **종합 이용률 (`overallUsageRatePct`)**: **`150.9%`** / **1인당 평균 이용 매장 (`avgVenuesPerGuest`)**: **`1.51개`**
- **최다 이용 영업장 (`topVenueName`)**: **`벨포레 목장`** (`263명`, 이용률 **`40.6%`**)
- **마운틴카트 통합 (`mountainCartCombined`)**: **`109명`** (전년 `36명`, 이용률 **`16.8%`**, `+12.0%p`)
