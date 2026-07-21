import { z } from 'zod';

// 핵심 데이터만 엄격하게 검증하는 가벼운 방패(안전망)
export const dashboardV5Schema = z.object({
  totalRevenue: z.number({ required_error: "총매출 데이터가 누락되었습니다." }).nonnegative("총매출은 음수일 수 없습니다."),
  totalExpense: z.number({ required_error: "총지출 데이터가 누락되었습니다." }).nonnegative("총지출은 음수일 수 없습니다."),
  matrixData: z.array(z.any()).optional(),
  expenseData: z.record(z.any()).optional(),
  adminMappings: z.array(z.any()).optional(),
}).passthrough(); // 정의되지 않은 기타 필드는 통과시킴

export const businessPlanV5Schema = z.object({
  summary: z.object({
    totalRevenue: z.number({ required_error: "True P&L 총매출 데이터 누락" }),
    totalOperationalExpense: z.number({ required_error: "True P&L 운영지출 데이터 누락" }),
  }).passthrough(),
}).passthrough();
