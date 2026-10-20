# Ad-Spot Manager (사내 배너/현수막/포스터 거점 예약 및 자율 게시 관리 시스템)

사내 홍보 거점의 일정 중복을 원천 차단하고, 관리자 검토(HITL) 및 실무자 현장 자율 게시(스마트폰 카메라 인증)를 단일 진실 공급원(SSOT) 원칙으로 관리하는 반응형 웹 애플리케이션입니다.

---

## 🌐 라이브 배포 정보
- **Firebase 프로젝트:** `bell-operation`
- **호스팅 URL:** [https://bell-adspot.web.app](https://bell-adspot.web.app)
- **클라우드 데이터베이스:** Cloud Firestore (`ad_spots`, `ad_reservations`)

---

## 1. 주요 기능 및 아키텍처

### 🔄 6단계 단일 상태 머신 (State Machine SSOT)
1. **`PENDING` (승인대기):** 거점 선택, 기간, 목적, 디자인 시안 업로드 후 관리자 검토 대기열 등록.
2. **`APPROVED` (승인완료):** 관리자 검토 완료 후 신청자에게 발주 및 현장 설치 권한 부여.
3. **`REJECTED` (반려됨):** 사유와 함께 반려 처리 (해당 기간 점유 즉시 해제).
4. **`INSTALLED` (게시중):** 현장 설치 후 스마트폰 카메라로 실물 인증 사진을 촬영/등록하여 공식 게시 확정.
5. **`EXPIRED_OVERDUE` (기간만료/미철거):** 오늘 날짜 기준 `endDate`가 지났으나 미철거된 건을 적색 경고로 표출.
6. **`REMOVED` (철거완료):** 현장 철거 후 완료 확정하여 거점 점유 최종 종료.

### 🛡️ 기간 중복 원천 차단 (Fail-Fast Overlap Validation)
- 충돌 판정 공식: `existing.startDate <= newReq.endDate && existing.endDate >= newReq.startDate`
- `PENDING`, `APPROVED`, `INSTALLED`, `EXPIRED_OVERDUE` 상태의 기존 건과 단 하루라도 겹칠 시 입력 단계에서 즉시 경고 및 차단.
- 시작일 > 종료일 역전 방지 검증 포함.

### 📱 반응형 하이브리드 UX
- **Mobile (`< 768px`):** 현장 실무자를 위한 하단 탭바(Bottom Navigation Bar), 카드 뷰, 후면 카메라 direct trigger (`accept="image/*" capture="environment"`).
- **Desktop (`>= 768px`):** 관리자 및 사무실 실무자를 위한 좌측 사이드바, 다중 컬럼 거점 그리드, 접이식 타임라인 아코디언, 테이블형 승인 대기열 및 전체 거점 타임라인 현황판.

### 📋 원클릭 규격 정보 복사 (Spot Explorer)
- 각 거점 카드에서 가로×세로 치수(mm, `tabular-nums`) 및 마감 방식(`finishingGuide`)을 인쇄/출력소 전달 형식으로 원클릭 복사.

### 🔌 Firebase v10+ 및 Zero-Config 하이브리드 어댑터
- Cloud Firestore 및 Storage에 실시간 동기화.
- 오프라인/로컬 환경에서도 LocalStorage 폴백과 데모 시드 데이터(거점 8곳, 예약 6건)로 100% 정상 작동.
- 상단 헤더의 **[초기 데이터 복원]** 버튼으로 언제든지 초기 상태로 리셋 가능.

---

## 2. 배포 및 빌드 명령어

```bash
# 정적 최적화 빌드
npm run build

# Firebase 배포 (호스팅 & DB 룰 동시 반영)
npx firebase deploy --only hosting:adspot,firestore --project bell-operation
```
