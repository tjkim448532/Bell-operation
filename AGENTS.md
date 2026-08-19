<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🚨 [최우선 절대 원칙] 백엔드 접근 및 수정 엄격 금지 (Strict Backend Boundary)
- **백엔드 코드 변경 절대 금지**: 에이전트는 어떠한 상황에서도 백엔드 코드(DB 아키텍처, 프로시저, AWS 파이프라인, ETL 스크립트, 백엔드 API 핸들러 등)를 직접 열어 수정하거나 패치해서는 안 됩니다.
- **백엔드는 완전한 Read-Only 블랙박스**: 백엔드는 배포된 외부 API 엔드포인트로서만 바라보며, 데이터 계산 오류나 신규 필드 추가가 필요할 경우 **절대 직접 고치려 하지 말고, 즉시 공식 백엔드 요청 명세서(Spec)를 작성하여 백엔드 담당자/에이전트에 요청**해야 합니다.
- **프론트엔드 고유 R&R 집중**: 프론트엔드는 백엔드가 제공하는 SSOT API 응답 데이터를 100% 정직하고 안전하게 화면에 바인딩하고 시각화하는 작업에만 집중합니다.
