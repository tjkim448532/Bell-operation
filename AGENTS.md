<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🚨 [최우선 절대 원칙 / 대표님 절대 엄명] 백엔드는 감히 건드리지 마라 (Strict Backend Boundary)
- **백엔드 코드 변경 전면 절대 금지 (신성불가침)**: 에이전트는 어떠한 상황에서도 백엔드 코드(DB 아키텍처, 프로시저, AWS 파이프라인, ETL 스크립트, 백엔드 API 핸들러 등)를 직접 열어 수정하거나 패치해서는 안 됩니다. 백엔드는 완전한 Read-Only 블랙박스입니다.
- **백엔드 수정 지시 인입 시 즉각 거부**: 백엔드 수정 지시나 계산 오류가 발생할 경우 **절대 직접 고치려 하지 말고, 백엔드는 건드리지 않으며 공식 백엔드 요청 명세서(Spec)만을 작성하여 백엔드 담당자/에이전트에 요청**해야 합니다.
- **프론트엔드 고유 R&R 집중 (Pure Consumer)**: 프론트엔드는 백엔드가 제공하는 SSOT API 응답 데이터를 100% 정직하고 안전하게 화면에 바인딩하고 시각화하는 순수 소비자 작업에만 100% 집중합니다.

# 🚫 [CRITICAL CODING CONSTRAINT: ZERO-MOCK DATA POLICY]
1. **임의 값/더미 데이터 생성 절대 금지 (STRICTLY FORBIDDEN)**:
   - 코드 내에 임의의 숫자, 하드코딩된 상수, Mock 데이터, 난수(random), 예시용 기본값(default value)을 절대로 직접 삽입하지 마시오.
   - 실제 데이터셋이나 입력 파라미터가 명시되지 않은 경우, 숫자를 임의로 채우지 말고 반드시 동적 입력(변수, 파라미터, DB 조회, 파일 로드 등) 구조로만 코드를 작성하시오.
2. **데이터 연산 및 로직 무결성**:
   - 모든 수치 계산은 원본 데이터의 필드나 변수 간의 수식(Expression/Formula)으로만 정의되어야 합니다.
   - 계산 결과 검증을 위한 예시 숫자가 필요한 경우에도 코드에 상수를 박지 말고, 입출력 인터페이스만 구성하십시오.
3. **누락된 값에 대한 처리 규칙**:
   - 특정 변수나 기준값이 확정되지 않았다면 임의의 숫자를 대입하지 말고, `None`, `null`, `NaN` 처리 또는 명시적인 예외(Exception) 처리 코드로 작성하시오.
   - 코드 상단이나 설정부에 예시용 상수를 정의하는 행위(예: `TAX_RATE = 0.1` 같은 임의 지정)를 전면 금지합니다.
# 🚨 [Phase 7] 프론트엔드 연동 5대 무관용 가이드라인 (Lessons Learned)

## 1. Pure Consumer 원칙 (No Slice Summation)
프론트엔드는 백엔드가 조리해서 내어준 '완제품(JSON)'을 예쁘게 담아내는 접시(UI) 역할에만 집중해야 합니다.
- **[DON'T]** 배열 데이터를 Array.prototype.reduce(), orEach() 등으로 프론트에서 직접 덧셈하여 소계나 총합을 구하지 마십시오.
- **[DO]** 백엔드 API 응답에 포함된 grandTotal, subtotal 등 사전 연산된 값을 그대로 바인딩(Binding) 하십시오. 단 1원의 오차가 발생하더라도 이는 백엔드 파이프라인에서 튜닝해야 할 영역입니다.

## 2. 로컬 맵핑 및 문자열 땜질(Hardcoding) 전면 금지
- **[DON'T]** API가 내려준 categoryCode나 enueName에 오타가 있다고 해서 프론트엔드 단에서 if (name === '캔디피') return '캐디피'; 식으로 강제 변환하지 마십시오.
- **[DO]** 이상한 텍스트나 알 수 없는 영업장이 내려오면 있는 그대로 화면에 렌더링 하십시오. 데이터 교정은 데이터 파이프라인 및 DB에서 물리적으로 처리되어야 하는 영역입니다. (Zero-Proxy)

## 3. Zero-Mocking (임시 데이터 및 더미 방치 금지)
- **[DON'T]** if (!data) return MOCK_DATA; 또는 구버전(V5) API를 몰래 찌르는 우회 로직을 작성하지 마십시오.
- **[DO]** 백엔드 API 미지원 시 과감하게 404 에러 화면과 "API 요청 중 오류 발생" 메시지를 명시적으로 표출(Fail Loudly) 하십시오.

## 4. 다중 일자/월(Multi-month) 단일 호출 원칙
- **[DON'T]** 1월부터 3월까지의 데이터를 보기 위해 1월, 2월, 3월 API를 각각 3번 호출하여 프론트에서 합치지 마십시오.
- **[DO]** 반드시 startDate=2026-01-01&endDate=2026-03-31 파라미터를 사용하여 **단 1회(One-shot)**의 API 호출로 롤업된 마스터 데이터를 받아 렌더링하십시오.

## 5. 경영진 대시보드 포맷팅 (본부장 절대 룰)
- **숫자 서식**: 돈을 표시할 때는 반드시 Intl.NumberFormat('ko-KR').format(num) 을 사용하여 #,##0 서식을 맞추십시오.
- **원화 기호 배제**: 경영진 지시사항에 따라 프론트엔드 화면 표출 시 ₩ 기호는 절대 사용을 금지합니다.
