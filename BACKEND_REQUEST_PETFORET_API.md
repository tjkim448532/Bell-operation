# 📢 [공식 백엔드 개발 요청 명세서] 펫포레 예약·결제 현황 API (V6.3)

**수신:** 백엔드 엔지니어링 / 데이터 파이프라인 담당자  
**발신:** 프론트엔드 / 레저사업본부 디지털운영팀  
**요청 일자:** 2026-10-11  
**문서 버전:** v1.0 (SSOT)  
**목적:** 펫포레(반려견 파크/시설) 미결제 예약 식별 및 당일 아침 알림톡/문자 발송을 위한 실시간 예약·결제 데이터 연동

---

## 1. 개발 요청 개요

- **배경**: 펫포레 사전 예약 건 중 결제가 완료되지 않은 가예약 건에 대해, 현장 운영팀이 **당일 아침 알림톡/문자로 결제 안내를 발송**하여 노쇼(No-show)를 방지하고자 합니다.
- **요청 사항**:
  1. `GET /api/v6/petforet/reservations` (일자별 예약/결제 현황 및 상세 목록 조회)
  2. `PATCH /api/v6/petforet/sales-status` (현장 판매 가능 여부 On/Off 상태 제어 - 선택 사항)
- **응답 규격**: The Bible v4.2 표준 준수 (100% `camelCase`, 부가세 및 금액 정규화)

---

## 2. API 명세서 (상세)

### [API 1] 펫포레 일자별 예약 및 결제 현황 조회 (필수)

- **HTTP Method**: `GET`
- **Endpoint**: `/api/v6/petforet/reservations`
- **Query Parameters**:
  | 파라미터명 | 타입 | 필수 여부 | 기본값 | 설명 |
  | :--- | :---: | :---: | :---: | :--- |
  | `date` | `string` | **필수** | - | 조회 대상 방문 일자 (`YYYY-MM-DD`, 예: `2026-10-11`) |
  | `paymentStatus` | `string` | 선택 | `ALL` | 결제 상태 필터: `ALL` (전체), `UNPAID` (미결제), `PAID` (결제완료), `CANCELLED` (취소) |

- **Response Payload (JSON, 100% camelCase)**:
```json
{
  "status": "success",
  "data": {
    "summary": {
      "targetDate": "2026-10-11",
      "totalReservations": 42,
      "paidCount": 35,
      "unpaidCount": 7,
      "cancelledCount": 2,
      "totalAmount": 2850000,
      "paidAmount": 2410000,
      "unpaidAmount": 440000,
      "paymentRate": 83.3
    },
    "reservations": [
      {
        "reservationId": "PET-20261011-0012",
        "orderDate": "2026-10-09 14:22:10",
        "visitDate": "2026-10-11",
        "visitTime": "10:30",
        "customerName": "김철수",
        "customerPhone": "01098765432",
        "petType": "중형견 (15kg 미만)",
        "petCount": 1,
        "productName": "펫포레 플레이그라운드 종일권 + 쉼터 1개소",
        "quantity": 1,
        "totalPrice": 65000,
        "paymentStatus": "UNPAID",
        "paymentDueDate": "2026-10-11 09:00:00",
        "paymentUrl": "https://booking.belleforet.com/pay/PET-20261011-0012",
        "lastNotifiedAt": null
      },
      {
        "reservationId": "PET-20261011-0013",
        "orderDate": "2026-10-10 11:05:40",
        "visitDate": "2026-10-11",
        "visitTime": "11:00",
        "customerName": "이영희",
        "customerPhone": "01012345678",
        "petType": "소형견 (7kg 미만)",
        "petCount": 2,
        "productName": "펫포레 피크닉존 입장권",
        "quantity": 2,
        "totalPrice": 40000,
        "paymentStatus": "PAID",
        "paymentDueDate": null,
        "paymentUrl": "https://booking.belleforet.com/pay/PET-20261011-0013",
        "lastNotifiedAt": "2026-10-10 11:06:00"
      }
    ]
  }
}
```

---

### [API 2] 펫포레 현장 판매 가능 여부 On/Off 상태 제어 (선택)

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/v6/petforet/sales-status`
- **Request Body**:
```json
{
  "date": "2026-10-11",
  "isOpen": false,
  "reason": "우천으로 인한 그라운드 배수 작업 및 시설 정비",
  "updatedBy": "admin_leisure"
}
```
- **Response Payload**:
```json
{
  "status": "success",
  "message": "2026-10-11 펫포레 판매 상태가 변경되었습니다.",
  "data": {
    "date": "2026-10-11",
    "isOpen": false,
    "reason": "우천으로 인한 그라운드 배수 작업 및 시설 정비",
    "updatedAt": "2026-10-11T09:15:30Z"
  }
}
```

---

## 3. 주요 필드 및 비즈니스 정의

1. **`paymentStatus` (결제 상태)**:
   - `UNPAID`: 예약은 접수되었으나 결제 전인 상태 (당일 아침 알림톡 발송 대상)
   - `PAID`: 결제 완료 상태
   - `CANCELLED`: 고객 취소 또는 기한 만료 취소
2. **`paymentUrl` (모바일 결제 링크)**:
   - 고객이 카카오 알림톡의 [결제하기] 버튼을 눌렀을 때 즉시 모바일 결제창으로 랜딩될 수 있는 고유 링크.
3. **`lastNotifiedAt` (최근 알림 일시)**:
   - 당일 알림톡 중복 발송을 방지하고 현장에서 발송 이력을 확인할 수 있도록 마지막 발송 시각 반환 (미발송 시 `null`).
4. **전화번호 포맷**:
   - `customerPhone`은 하이픈(`-`) 포함 여부와 무관하게 숫자 10~11자리로 제공 (문자 발송 SDK에서 정규화 처리).

---

## 4. 백엔드 팀 협조 요청 사항

- 위 API가 준비되는 동안 프론트엔드는 Mock 데이터 없이 **정직한 '실측 데이터 대기 중' 상태**로 UI 개발을 완료해 둘 예정입니다.
- 엔드포인트 배포가 완료되면 프론트엔드 연동 테스트를 진행하겠습니다. 일정 확인 부탁드립니다!
