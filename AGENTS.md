<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🚨 [최우선 절대 원칙] 백엔드 접근 및 수정 엄격 금지 (Strict Backend Boundary)
- **백엔드 코드 변경 절대 금지**: 에이전트는 어떠한 상황에서도 백엔드 코드(DB 아키텍처, 프로시저, AWS 파이프라인, ETL 스크립트, 백엔드 API 핸들러 등)를 직접 열어 수정하거나 패치해서는 안 됩니다.
- **백엔드는 완전한 Read-Only 블랙박스**: 백엔드는 배포된 외부 API 엔드포인트로서만 바라보며, 데이터 계산 오류나 신규 필드 추가가 필요할 경우 **절대 직접 고치려 하지 말고, 즉시 공식 백엔드 요청 명세서(Spec)를 작성하여 백엔드 담당자/에이전트에 요청**해야 합니다.
- **프론트엔드 고유 R&R 집중**: 프론트엔드는 백엔드가 제공하는 SSOT API 응답 데이터를 100% 정직하고 안전하게 화면에 바인딩하고 시각화하는 작업에만 집중합니다.

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
