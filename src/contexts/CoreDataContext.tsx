"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useDate } from './DateContext';
import { secureFetcher } from '../lib/secureFetcher';
import { getLatestClosedDateStr } from '../lib/dateUtils';

export interface V6Payload {
  date: string;
  summary: Record<string, any>;
  salesByCategory: Array<{ categoryCode: string; categoryName: string; totalSales: number }>;
  salesByFacility: Array<{ categoryCode: string; shopName: string; totalSales: number; todayActual?: number; qty?: number; salesQty?: number; totalVisitors?: number; teamName?: string; partName?: string }>;
  dailyTrends: Array<{ date: string; revenue: number }>;
  weather?: { condition?: string; weatherDesc?: string; tempMax?: number; temp_max?: number; tempMin?: number; temp_min?: number; current?: any; lastYear?: any };
  roomSummaryByType?: Array<{ roomType: string; revenue: number; roomsSold: number }>;
  salesByChannel?: Array<{ channelGroup: string; revenue: number; roomsSold: number }>;
  dailyTrendsByCategory?: Array<{ date: string; category: string; revenue: number }>;
  advancedRoomStats?: { occRate?: number; mixPercent?: Record<string, number> };
  [key: string]: any; // Backward compatibility for legacy payloads
}

export interface CoreDataState {
  core: any | null;
  summary: any | null;
  matrix: any | null;
  isLoading: boolean;
  error: string | null;
}

const CoreDataContext = createContext<CoreDataState | undefined>(undefined);

export const CoreDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { startDate, endDate } = useDate();
  
  const [state, setState] = useState<CoreDataState>({
    core: null,
    summary: null,
    matrix: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const abortController = new AbortController();

    const fetchCoreData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_API_URL || 'https://belleforet-data.vercel.app';
      
      let validStart = startDate;
      let validEnd = endDate;
      if (validStart && validEnd && validStart > validEnd) {
        const temp = validStart;
        validStart = validEnd;
        validEnd = temp;
      }

      const todayStr = getLatestClosedDateStr();
      const queryParams = validEnd && validStart !== validEnd
        ? `startDate=${validStart}&endDate=${validEnd}&_t=${Date.now()}`
        : `date=${validStart || todayStr}&_t=${Date.now()}`;

      try {
        // [V6 SSOT Direct Call] 1. Fetch primary SSOT revenue-summary first (~400ms fast path)
        const res = await secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-summary?${queryParams}`, {
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;

        const payload = (res?.summary ? res : res?.data) || res || {};

        const buildCoreSummary = (payloadSummary: any, gs: any = {}, channels: any[] = [], isGolfLoaded: boolean = false, pm: any = null) => {
          // 100% SSOT Direct Binding: 프론트엔드 임의 키워드 필터링 및 reduce 클라이언트 합산 전면 철거
          const directAvg = Number(payloadSummary?.golfDirectAvgGreenFee || gs.golfDirectAvgGreenFee || 0);
          const otaAvg = Number(payloadSummary?.golfOtaAvgGreenFee || gs.golfOtaAvgGreenFee || 0);
          const memberAvg = Number(payloadSummary?.golfMemberAvgGreenFee || gs.golfMemberAvgGreenFee || 0);

          const physicalOccRate = pm?.metrics?.physicalOccupancyRate !== undefined && pm?.metrics?.physicalOccupancyRate !== null
            ? Number(pm.metrics.physicalOccupancyRate.toFixed(1))
            : undefined;

          return {
            ...payloadSummary,
            totalOcc: physicalOccRate ?? payloadSummary?.totalOcc,
            physicalOccRate: physicalOccRate ?? payloadSummary?.physicalOccRate,
            physicalOccupiedUnits: pm?.metrics?.physicalOccupiedUnits ?? payloadSummary?.occupiedRooms,
            // TrevPAR 대소문자 호환성 (trevPar vs trevPAR)
            trevPAR: payloadSummary?.trevPar ?? payloadSummary?.trevPAR,
            trevPar: payloadSummary?.trevPar ?? payloadSummary?.trevPAR,
            // 골프 예약/내장/취소 팀수
            totalGolfReservedTeams: Number(payloadSummary?.totalGolfReservedTeams || gs.totalGolfReservedTeams || gs.totalReservedTeams || 0),
            totalGolfTeams: Number(payloadSummary?.totalGolfTeams || gs.totalGolfTeams || gs.totalVisitedTeams || 0),
            totalGolfVisitedTeams: Number(payloadSummary?.totalGolfVisitedTeams || gs.totalGolfVisitedTeams || gs.totalVisitedTeams || 0),
            totalGolfCanceledTeams: Number(payloadSummary?.totalGolfCanceledTeams || gs.totalGolfCanceledTeams || gs.totalCanceledTeams || 0),
            totalGolfPendingTeams: Number(payloadSummary?.totalGolfPendingTeams || gs.totalPendingTeams || 0),
            totalGolfVisitors: Number(payloadSummary?.totalGolfVisitors || gs.totalGolfVisitors || gs.totalPlayers || 0),
            // 골프 채널별 평균 그린피 및 전체 순수 평균 그린피 (카트비/프로샵 혼입 방지)
            golfAvgGreenFee: Number(payloadSummary?.golfAvgGreenFee || gs.avgGreenFeePerPlayer || 0),
            golfDirectAvgGreenFee: directAvg,
            golfOtaAvgGreenFee: otaAvg,
            golfMemberAvgGreenFee: memberAvg,
            isGolfChannelsLoading: !isGolfLoaded,
            golfRankedChannels: channels.length > 0 ? channels.map((ch: any) => ({
              name: ch.channelName,
              avgGreenFee: ch.avgGreenFeePerPlayer,
              players: ch.visitedPlayers || 0
            })) : (payloadSummary?.golfRankedChannels || [])
          };
        };

        const hasFullGolfMetrics = payload.summary?.golfDirectAvgGreenFee !== undefined && 
                                   payload.summary?.golfOtaAvgGreenFee !== undefined && 
                                   payload.summary?.golfMemberAvgGreenFee !== undefined;

        const initialSummary = buildCoreSummary(payload.summary, {}, [], hasFullGolfMetrics, null);
        const corePayload = {
          ...payload,
          physicalRoomMaster: null,
          date: payload.targetDate || validStart || todayStr,
          salesByCategory: payload.salesByCategory || [],
          salesByFacility: payload.salesByFacility || [],
          leisureVisitors: payload.summary?.leisureVisitors || payload.leisureVisitors || {},
          gridData: payload.gridData || [],
          weather: payload.weather || {},
          summary: initialSummary
        };

        // Render dashboard immediately with SSOT master payload
        setState({
          core: corePayload,
          summary: initialSummary,
          matrix: payload.gridData || [],
          isLoading: false,
          error: null
        });

        // 2. Fetch secondary revenue-by-org asynchronously in background (doesn't block screen render or spike concurrent DB pool)
        secureFetcher(`${API_BASE}/api/v6/dashboard/revenue-by-org?${queryParams}`, {
          signal: abortController.signal
        })
          .then((orgRes) => {
            if (abortController.signal.aborted || !orgRes) return;
            const pm = orgRes?.data?.physicalRoomMaster || orgRes?.physicalRoomMaster || null;
            if (!pm) return;

            setState(prev => {
              if (!prev.core) return prev;
              const pOccRate = pm?.metrics?.physicalOccupancyRate !== undefined && pm?.metrics?.physicalOccupancyRate !== null
                ? Number(pm.metrics.physicalOccupancyRate.toFixed(1))
                : undefined;

              const updatedSummary = {
                ...prev.summary,
                totalOcc: pOccRate ?? prev.summary?.totalOcc,
                physicalOccRate: pOccRate ?? prev.summary?.physicalOccRate,
                physicalOccupiedUnits: pm?.metrics?.physicalOccupiedUnits ?? prev.summary?.occupiedRooms,
              };

              return {
                ...prev,
                core: {
                  ...prev.core,
                  physicalRoomMaster: pm,
                  summary: updatedSummary
                },
                summary: updatedSummary
              };
            });
          })
          .catch(() => {
            // Secondary physical room master fetch failure ignored safely
          });

        // 3. If master API already returned complete golf metrics via mat_v6_golf_daily, skip redundant 20s background fetch
        if (!hasFullGolfMetrics) {
          secureFetcher(`${API_BASE}/api/v6/report/golf-channel-teetime-analysis-v2?${queryParams}`, {
            signal: abortController.signal
          })
            .then((golfTeetimeRes) => {
              if (abortController.signal.aborted || !golfTeetimeRes) return;
              const gs = golfTeetimeRes?.meta?.summary || golfTeetimeRes?.golfSummary || golfTeetimeRes?.summary || {};
              const channels = golfTeetimeRes?.channels || golfTeetimeRes?.salesByChannel || [];
              if (channels.length > 0 || Object.keys(gs).length > 0) {
                setState(prev => {
                  if (!prev.core) return prev;
                  const updatedSummary = buildCoreSummary(payload.summary, gs, channels, true, prev.core?.physicalRoomMaster);
                  return {
                    ...prev,
                    core: {
                      ...prev.core,
                      summary: updatedSummary
                    },
                    summary: updatedSummary
                  };
                });
              }
            })
            .catch(() => {
              if (abortController.signal.aborted) return;
              setState(prev => {
                if (!prev.core?.summary) return prev;
                const nonLoadingSummary = { ...prev.core.summary, isGolfChannelsLoading: false };
                return {
                  ...prev,
                  core: { ...prev.core, summary: nonLoadingSummary },
                  summary: nonLoadingSummary
                };
              });
            });
        }

      } catch (error: any) {
        if (abortController.signal.aborted || error?.name === 'AbortError') return;
        console.error("[V6 Dashboard API Fetch Error]", error);
        setState(prev => ({ ...prev, isLoading: false, error: '데이터를 불러오는 데 실패했습니다.' }));
      }
    };

    fetchCoreData();

    return () => {
      abortController.abort();
    };
  }, [startDate, endDate]);

  return (
    <CoreDataContext.Provider value={state}>
      {children}
    </CoreDataContext.Provider>
  );
};

export const useCoreData = () => {
  const context = useContext(CoreDataContext);
  if (context === undefined) {
    throw new Error('useCoreData must be used within a CoreDataProvider');
  }
  return context;
};

