import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const getAuthToken = async (): Promise<string> => {
  if (typeof window === 'undefined' || !auth) return '';
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken(true);
  }
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken(true);
        resolve(token);
      } else {
        resolve(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') || '' : '');
      }
    });
  });
};

const validatePayloadIntegrity = (data: any, url: string, startTime: number, status: number) => {
    const duration = Date.now() - startTime;
    
    // 1. API 인터셉터 기반 전수 로깅 (Network Level)
    const arrayNodes = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : null);
    const rowCount = arrayNodes ? arrayNodes.length : 'N/A';
    
    console.log(`[API Validator] ${url.split('?')[0]} | Status: ${status} | Time: ${duration}ms | Rows: ${rowCount}`);

    // 2. 숫자(Number) 무결성 및 타입 강제 검증 (Data Level)
    const errors: string[] = [];
    
        const scanNode = (node: any, path: string, venueContext: string) => {
        if (!node || typeof node !== 'object') return;
        
        // 에러 식별자 추적 (venue_name 우선 탐색)
        const currentVenue = node.venue_name || node.shopName || node.team_name || node.teamName || venueContext;
        
        for (const key in node) {
            const value = node[key];

            if (typeof value === 'object' && value !== null) {
                scanNode(value, `${path}.${key}`, currentVenue);
                continue;
            }

            // 불리언(Boolean) 필드(isSubtotal, isStatisticallySignificant 등)는 숫자 검증 대상에서 제외
            if (typeof value === 'boolean' || key.startsWith('is') || key.startsWith('has')) {
                continue;
            }
            
            // 금액/지표 관련 필드명 매칭 (날씨 설명, 명칭, 텍스트 필드, 코드, 일자/연월 식별자 등 제외)
            const isMetricKey = (
                key.match(/(revenue|actual|growth|diff|amount|fee|ratio|trevpar|trevpor|revpar|occ|rooms|gross)/i) ||
                key.match(/(today|mtd|ytd|last|roomcap)ly/i) ||
                key.match(/^ly(?!month|year|period|date)([A-Z_]|$)/i)
            ) && 
            !key.toLowerCase().includes('date') && 
            !key.toLowerCase().includes('desc') && 
            !key.toLowerCase().includes('weather') && 
            !key.toLowerCase().includes('name') && 
            !key.toLowerCase().includes('code') && 
            !key.toLowerCase().includes('formatted') &&
            !key.match(/^(ly|target|base|year)?month$/i);

            if (isMetricKey) {
                if (typeof value !== 'number') {
                    // 문자열 숫자, null, undefined 전면 차단
                    errors.push(`[Type Error] 📍 ${currentVenue || 'Unknown'} ➔ Field '${key}' MUST be a strict Number. Received: ${value === null ? 'null' : typeof value} ('${value}')`);
                } else if (Number.isNaN(value)) {
                    // NaN 차단
                    errors.push(`[NaN Error] 📍 ${currentVenue || 'Unknown'} ➔ Field '${key}' is NaN.`);
                }
            }
        }
    };

    scanNode(data, 'root', 'Global');
    
    // 3. 자바스크립트 합산 오차 검증 거절 통보 (NO SLICE SUMMATION 원칙 강제)
    

    // 4. 검증 결과 텍스트 리포팅 (대량 오류 시 콘솔 폭주 및 브라우저 프리징 방지)
    if (errors.length > 0) {
        console.error(`❌ [Data Integrity FAILED] ${url.split('?')[0]} (총 ${errors.length}건 타입 위반 감지)`);
        // 상위 5개 대표 오류만 출력하여 브라우저 OOM/멈춤 방지
        errors.slice(0, 5).forEach(err => console.error(err));
        if (errors.length > 5) {
            console.warn(`⚠️ [Throttled] 나머지 ${errors.length - 5}건의 타입 오류는 브라우저 프리징 방지를 위해 생략되었습니다.`);
        }
    } else {
        console.log(`✅ [Data Integrity PASSED] ${url.split('?')[0]} - No type/number violations detected.`);
    }
};

/**
 * 백엔드 배포 전 과도기 또는 미정규화 문자열 숫자('1119093.00') 수신 시
 * UI 컴포넌트 크래시 및 문자열 연결 버그 방지를 위한 프론트엔드 방어적 정규화
 */
const sanitizePayloadNumbers = (node: any) => {
    if (!node || typeof node !== 'object') return;
    for (const key in node) {
        const value = node[key];
        if (typeof value === 'object' && value !== null) {
            sanitizePayloadNumbers(value);
            continue;
        }
        if (typeof value === 'boolean' || key.startsWith('is') || key.startsWith('has')) {
            continue;
        }
        const isMetricKey = (
            key.match(/(revenue|actual|growth|diff|amount|fee|ratio|trevpar|trevpor|revpar|occ|rooms|gross)/i) ||
            key.match(/(today|mtd|ytd|last|roomcap)ly/i) ||
            key.match(/^ly(?!month|year|period|date)([A-Z_]|$)/i)
        ) && 
        !key.toLowerCase().includes('date') && 
        !key.toLowerCase().includes('desc') && 
        !key.toLowerCase().includes('weather') && 
        !key.toLowerCase().includes('name') && 
        !key.toLowerCase().includes('code') && 
        !key.toLowerCase().includes('formatted') &&
        !key.match(/^(ly|target|base|year)?month$/i);

        if (typeof value === 'string' && isMetricKey) {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
                node[key] = parsed;
            }
        }
    }
};


export const secureFetcher = async (rawUrl: string, options: RequestInit = {}, maxRetries: number = 2): Promise<any> => {
  if (rawUrl.includes('/api/v5/')) { throw new Error('[Zero-Proxy] V5 구버전 API 호출이 감지되었습니다. V6 엔드포인트로 즉시 교체하십시오.'); }

  // URL 단위 타임스탬프 쿼리 자동 부착 (CORS 헤더 간섭 없이 100% 캐시 무효화)
  const separator = rawUrl.includes('?') ? '&' : '?';
  const url = rawUrl.includes('_t=') ? rawUrl : `${rawUrl}${separator}_t=${Date.now()}`;

  const isV6Api = url.includes('/api/v6/');
  const token = isV6Api ? 'belleforet-m2m-secret' : await getAuthToken();

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const executeFetch = async (retriesLeft: number): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    // Link caller's abort signal if provided
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    const startTime = Date.now();
    let response;
    
    try {
      response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers,
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (options.signal?.aborted) {
          throw err;
        }
        throw new Error('API 응답 시간이 초과되었습니다 (25초). 백엔드 서버 상태를 확인해주세요.', { cause: err });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const details = errorData.details || errorData.message || errorData.error || '';

      const isConnectionExhaustion =
        response.status === 500 && (
          String(details).includes('ER_CON_COUNT_ERROR') ||
          String(details).includes('Too many connections') ||
          String(errorData.error).includes('ER_CON_COUNT_ERROR') ||
          String(errorData.message).includes('ER_CON_COUNT_ERROR')
        );

      if (isConnectionExhaustion && retriesLeft > 0 && !options.signal?.aborted) {
        const backoffMs = 1200 + (2 - retriesLeft) * 600;
        console.warn(`⚠️ [DB Connection Saturation] ER_CON_COUNT_ERROR 감지됨 (${url.split('?')[0]}). ${backoffMs}ms 후 자동 재시도합니다... (남은 재시도: ${retriesLeft}회)`);
        await new Promise(r => setTimeout(r, backoffMs));
        if (options.signal?.aborted) {
          throw new Error('요청이 취소되었습니다.');
        }
        return executeFetch(retriesLeft - 1);
      }

      if (typeof details === 'string' && (
        details.includes('심야 절전 운영') || 
        details.includes('수면 모드') || 
        details.includes('절전') || 
        details.includes('중지') || 
        details.includes('STOPPED') || 
        details.includes('데이터베이스')
      )) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('belleforet:sleep-mode', { detail: details }));
        }
      }
      const error = new Error(errorData.error || errorData.message || 'API 요청 중 오류가 발생했습니다.') as Error & { status?: number; details?: string };
      error.status = response.status;
      error.details = details;
      throw error;
    }

    const data = await response.json();
    
    // 백엔드 내부 로직 크래시 (HTTP 200 이지만 error 인 경우) 방어
    if (data && (data.status === 'error' || data.success === false)) {
      const details = data.details || data.message || data.error || '';

      const isConnectionExhaustion =
        String(details).includes('ER_CON_COUNT_ERROR') ||
        String(details).includes('Too many connections');

      if (isConnectionExhaustion && retriesLeft > 0 && !options.signal?.aborted) {
        const backoffMs = 1200 + (2 - retriesLeft) * 600;
        console.warn(`⚠️ [DB Connection Saturation] ER_CON_COUNT_ERROR 감지됨 (${url.split('?')[0]}). ${backoffMs}ms 후 자동 재시도합니다... (남은 재시도: ${retriesLeft}회)`);
        await new Promise(r => setTimeout(r, backoffMs));
        if (options.signal?.aborted) {
          throw new Error('요청이 취소되었습니다.');
        }
        return executeFetch(retriesLeft - 1);
      }

      if (typeof details === 'string' && (
        details.includes('심야 절전 운영') || 
        details.includes('수면 모드') || 
        details.includes('절전') || 
        details.includes('중지') || 
        details.includes('STOPPED') || 
        details.includes('데이터베이스')
      )) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('belleforet:sleep-mode', { detail: details }));
        }
      }
      const errorMsg = details || data.message || data.error || '백엔드 처리 중 치명적인 오류가 발생했습니다.';
      const error = new Error(errorMsg) as Error & { status?: number; details?: string };
      error.status = 200;
      error.details = details;
      throw error;
    }
    
    // 데이터 정합성 QA 전수 검증 인터셉터 호출 (백엔드 계약 위반 감지)
    validatePayloadIntegrity(data, url, startTime, response.status);
    
    // UI 런타임 안정성을 위한 방어적 정규화 (문자열 숫자를 안전한 Number로 보정)
    sanitizePayloadNumbers(data);
    
    return data;
  };

  return executeFetch(maxRetries);
};


