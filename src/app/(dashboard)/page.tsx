'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Loader2, Users, Home, Bed, BedDouble, Flag, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { useDateFilter } from '@/context/DateFilterContext';
import { dashboardV5Schema } from '@/lib/schemas/dashboard.schema';

type DashboardData = {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  teamData: {
    team: string;
    revenue: number;
    expense: number;
  }[];
  monthlyTeamRev?: Record<number, Record<string, number>>;
  monthlyTeamExp?: Record<number, Record<string, number>>;
  teamMappings?: Record<string, string>;
  facilityVisitors?: Record<string, number>;
  roomSales?: Record<string, number>;
  minDate?: string | null;
  maxDate?: string | null;
  matrixData?: any[];
  adminMappings?: any[];
  expenseData?: any;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  const { startMonth, setStartMonth, endMonth, setEndMonth } = useDateFilter();

  const [goals, setGoals] = useState<any>(null);
  const [apiTeams, setApiTeams] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = '/api/dashboard';
        if (startMonth && endMonth) {
          url += `?startMonth=${startMonth}&endMonth=${endMonth}`;
        }
        
        const [dashRes, goalRes, teamRes, selRes] = await Promise.all([
          fetch(url),
          fetch('/api/goals'),
          fetch('/api/settings/leisure-teams'),
          fetch('/api/settings/leisure-selection')
        ]);
        
        const json = await dashRes.json();
        if (json.success) {
          // Zod 방패(Shield) 가동: 백엔드 숫자가 무결한지 단속
          const parseResult = dashboardV5Schema.safeParse(json.data);
          if (!parseResult.success) {
            console.error('Zod Validation Error:', parseResult.error);
            throw new Error('API 데이터 무결성 훼손 (Data Integrity Breach): 백엔드에서 전달된 핵심 숫자(총합) 형식이 잘못되었습니다. Zod 방어막이 렌더링을 차단했습니다.');
          }
          setData(parseResult.data);
        } else {
          throw new Error(json.error || '데이터를 불러오는데 실패했습니다.');
        }

        const teamDataRes = await teamRes.json();
        let goalJson = { success: false, data: null, error: null };
        try {
          if (goalRes.ok) {
            goalJson = await goalRes.json();
          } else {
            console.error('Goals API failed:', goalRes.status);
            goalJson.error = `HTTP ${goalRes.status}`;
          }
        } catch (e: any) {
          console.error('Failed to parse goals response', e);
          goalJson.error = e.message;
        }

        if (!ignore) {
          setData(json);
          // Always set goals even if it failed, so we can check goalJson.error
          setGoals(goalJson);
          
          let selectedTeams = null;
          if (selRes.ok) {
            const selData = await selRes.json();
            if (selData.success && selData.selectedTeams && selData.selectedTeams.length > 0) {
              selectedTeams = selData.selectedTeams;
            }
          }
          
          if (selectedTeams) {
            setApiTeams(selectedTeams); // Explicit selection overrides dynamic API teams
          } else if (teamDataRes.success) {
            setApiTeams(teamDataRes.teams); // Fallback to auto-detected if nothing is explicitly selected
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [startMonth, endMonth]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-mint-500" /></div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  const selectedMonths: number[] = [];
  if (startMonth && endMonth && startMonth.length === 7 && endMonth.length === 7) {
    let [sy, sm] = startMonth.split('-').map(Number);
    let [ey, em] = endMonth.split('-').map(Number);
    let current = new Date(sy, sm - 1, 1);
    const end = new Date(ey, em - 1, 1);
    while (current <= end) {
      if (current.getFullYear() === 2026) {
        selectedMonths.push(current.getMonth());
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  const getTargetSum = (teamName: string) => {
    if (!goals || !goals.data || selectedMonths.length === 0) return 0;
    const teamGoals = goals.data[teamName];
    if (!teamGoals) return 0;

    let sum = 0;
    selectedMonths.forEach(m => {
      sum += teamGoals[m] || 0;
    });
    
    return sum;
  };

  const totalRevenueTarget = getTargetSum('합계');
  const revenueAchievement = totalRevenueTarget > 0 ? ((data?.totalRevenue || 0) / totalRevenueTarget) * 100 : 0;

  // Add goal data to teamData for BarChart
  const enhancedTeamData = data?.teamData?.map(t => {
    let teamNameForGoal = t.team;
    let goalSum = getTargetSum(teamNameForGoal);
    
    // V4 legacy fallback removed to enforce SSOT. If '액티비티' goal is 0, user must update the Goal Sheet to map these to '액티비티' explicitly.
    
    return { ...t, goal: goalSum };
  });

  // --- 1. Total Visitors ---
  let totalVisitorGoal = 0;
  let totalVisitorActual = 0;
  selectedMonths.forEach(m => {
    totalVisitorGoal += goals?.visitors?.target?.['레저본부 방문객']?.[m] || 0;
    totalVisitorActual += goals?.visitors?.actual?.['레저본부 방문객']?.[m] || 0;
  });
  const visitorRate = totalVisitorGoal > 0 ? (totalVisitorActual / totalVisitorGoal) * 100 : 0;

  // --- 2. Team Utilization ---
  const dynamicTeams = Array.from(new Set([
    ...Object.keys(goals?.utilization?.target || {}),
    ...Object.keys(goals?.utilization?.actual || {})
  ]));
  
  const utilizationData = dynamicTeams.map(team => {
    let sumGoal = 0;
    let sumActual = 0;
    let count = 0;
    selectedMonths.forEach(m => {
      const g = goals?.utilization?.target?.[team]?.[m];
      const a = goals?.utilization?.actual?.[team]?.[m];
      if (g > 0 || a > 0) {
        sumGoal += g || 0;
        sumActual += a || 0;
        count++;
      }
    });
    return {
      team,
      avgGoal: count > 0 ? sumGoal / count : 0,
      avgActual: count > 0 ? sumActual / count : 0
    };
  }).filter(d => d.avgGoal > 0 || d.avgActual > 0);

  // --- 3. Dynamic Team Revenue & Expense ---
  // Create a mapping helper for goal teams
  const getMappedTeam = (goalTeamName: string) => {
    const maps = data?.teamMappings || {};
    // [규칙 3 적용] O(1) 1:1 매핑만 허용 (문자열 검색/includes/LIKE 절대 금지)
    // 매핑 사전에 없으면 무조건 '미분류' 처리하여 백엔드/관리자가 즉각 인지하도록 함
    return maps[goalTeamName] || '미분류';
  };

  // Group goals into the dynamic teams
  const teamGoals: Record<string, number> = {};
  selectedMonths.forEach(m => {
    const revGoals = goals?.revenue || {};
    for (const [gTeam, gArray] of Object.entries(revGoals)) {
      if (gTeam === '합계' || gTeam === '방문객') continue;
      const mapped = getMappedTeam(gTeam);
      teamGoals[mapped] = (teamGoals[mapped] || 0) + ((gArray as number[])[m] || 0);
    }
  });

  // 4. Filter to ONLY include the 'Leisure Teams' selected in settings
  const isLeisureTeam = (teamName: string) => {
    if (apiTeams.length === 0) return true; // Show all if nothing is explicitly set
    if (apiTeams.includes(teamName)) return true;
    
    // [매핑 렌더링 버그 수정] 칸반보드에 '외주'로 저장되었어도 '외주_놀이공원'을 표시함
    if (teamName === '외주_놀이공원' && (apiTeams.includes('외주') || apiTeams.includes('외주 놀이공원'))) {
      return true;
    }
    
    return false;
  };

  // --- 4. Leisure Division Totals (NO SLICE SUMMATION) ---
  let leisureTotalRevenue = data?.totalRevenue || 0;
  let leisureTotalExpense = data?.totalExpense || 0;
  let leisureTeamsDetails: { team: string, revenue: number, expense: number }[] = [];

  // Extract Revenue directly from Backend's matrixData (isSubtotal === true)
  const matrixData = data?.matrixData || [];
  matrixData.forEach((row: any) => {
    const isSubtotal = !!row.isSubtotal;
    const isGrandTotal = !!row.isGrandTotal;
    const subtotalType = row.subtotalType;
    const amount = row.mtdActual || 0;

    if (isGrandTotal) return;

    if (isSubtotal && subtotalType === 'part') {
      let team = '미분류';
      const partName = row.partName;
      const teamName = row.teamName;
      if (partName && partName !== '미분류' && partName !== '소계') team = partName;
      else if (teamName && teamName !== '미분류' && teamName !== '소계') team = teamName;

      if (team !== '총계' && team !== '미분류' && team !== '기타') {
        if (isLeisureTeam(team)) {
          const existing = leisureTeamsDetails.find(t => t.team === team);
          if (existing) {
            existing.revenue += amount;
          } else {
            leisureTeamsDetails.push({ team, revenue: amount, expense: 0 });
          }
        }
      }
    }
  });

  // Extract Expense from Expense Grouping
  const expenseData = data?.expenseData || {};
  Object.keys(expenseData).forEach(team => {
    if (team !== '기타' && isLeisureTeam(team)) {
      const amount = expenseData[team].total || 0;
      const existing = leisureTeamsDetails.find(t => t.team === team);
      if (existing) {
        existing.expense += amount;
      } else {
        leisureTeamsDetails.push({ team, revenue: 0, expense: amount });
      }
    }
  });

  const unmappedCount = data?.adminMappings?.filter((m: any) => 
    (!m.teamName || m.teamName === '미분류') && 
    (!m.partName || m.partName === '미분류')
  ).length || 0;
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {unmappedCount > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-sm flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-6 h-6" />
            <div>
              <p className="font-bold text-sm">⚠️ [긴급] 매핑되지 않은 영업장({unmappedCount}개)의 매출이 누락되고 있습니다.</p>
              <p className="text-xs text-red-600 mt-0.5">매출 통계가 부정확할 수 있으니 즉시 통합 매핑 센터에서 올바른 부서로 배정해주세요.</p>
            </div>
          </div>
          <Link href="/settings-v5-mapping" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap">
            매핑 센터로 이동
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">벨포레 통합 대시보드</h1>
          <p className="text-gray-500 mt-2">
            기간을 설정하여 전반적인 실적 현황을 확인하세요.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-sm [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100">
          <input 
            type="month" 
            value={startMonth} 
            onChange={(e) => setStartMonth(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="border-none bg-transparent px-3 py-2 text-sm outline-none text-white font-medium cursor-pointer" 
          />
          <span className="text-gray-400 font-medium">~</span>
          <input 
            type="month" 
            value={endMonth} 
            onChange={(e) => setEndMonth(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="border-none bg-transparent px-3 py-2 text-sm outline-none text-white font-medium cursor-pointer" 
          />
        </div>
      </div>

      {(!data || (data.totalRevenue === 0 && data.totalExpense === 0)) ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <PieChart className="w-16 h-16 mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">선택한 기간에 데이터가 없습니다</h2>
          <p>해당 월의 데이터가 아직 없거나, 데이터 관리 메뉴에서 업로드해 주세요.</p>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total Visitors */}
        <div className="bg-gradient-to-br from-[#0c3c2e] to-[#156e54] rounded-3xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col justify-center min-h-[140px]">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 bg-white opacity-10 rounded-full w-48 h-48 blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-emerald-100 font-medium tracking-wide text-sm">리조트 전체 방문객</p>
              <h2 className="text-3xl font-extrabold mt-1">{totalVisitorActual.toLocaleString()} <span className="text-xl font-bold">명</span></h2>
            </div>
          </div>
        </div>

        {/* Leisure Stats */}
        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] rounded-3xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col justify-center min-h-[140px]">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 bg-white opacity-10 rounded-full w-48 h-48 blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center gap-4 w-full">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-blue-100 font-medium tracking-wide text-sm">레저본부 총매출</p>
                <h2 className="text-xl md:text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(leisureTotalRevenue)}</h2>
              </div>
              <div className="w-full h-px bg-blue-400/40 my-2"></div>
              <div className="flex justify-between items-center">
                <p className="text-blue-100 font-medium tracking-wide text-sm">레저본부 총지출</p>
                <h2 className="text-xl md:text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(leisureTotalExpense)}</h2>
              </div>
              {apiTeams.length > 0 && (
                <div className="mt-3 text-xs text-blue-200/80 break-all leading-relaxed font-light">
                  <span className="font-medium opacity-70">포함 부서:</span> {apiTeams.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {leisureTeamsDetails.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center mb-5 pb-4 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mr-4 shrink-0">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">레저본부 총매출 포함 부서</h3>
                <p className="text-sm text-gray-500 mt-0.5">금액순 정렬</p>
              </div>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {leisureTeamsDetails.filter(t => t.revenue > 0).sort((a,b) => b.revenue - a.revenue).map((t, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 hover:bg-gray-50/80 rounded-2xl transition-all border border-transparent hover:border-gray-100">
                  <span className="text-gray-600 font-medium">{t.team}</span>
                  <span className="text-gray-900 font-bold tracking-tight">{formatCurrency(t.revenue)}</span>
                </div>
              ))}
              {leisureTeamsDetails.filter(t => t.revenue > 0).length === 0 && (
                <div className="py-6 text-center text-gray-400 text-sm">매출 발생 부서가 없습니다.</div>
              )}
            </div>
          </div>
          
          {/* Expense Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center mb-5 pb-4 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mr-4 shrink-0">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">레저본부 총지출 포함 부서</h3>
                <p className="text-sm text-gray-500 mt-0.5">금액순 정렬</p>
              </div>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {leisureTeamsDetails.filter(t => t.expense > 0).sort((a,b) => b.expense - a.expense).map((t, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 hover:bg-gray-50/80 rounded-2xl transition-all border border-transparent hover:border-gray-100">
                  <span className="text-gray-600 font-medium">{t.team}</span>
                  <span className="text-gray-900 font-bold tracking-tight">{formatCurrency(t.expense)}</span>
                </div>
              ))}
              {leisureTeamsDetails.filter(t => t.expense > 0).length === 0 && (
                <div className="py-6 text-center text-gray-400 text-sm">지출 발생 부서가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {goals?.error && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">목표치 연동 실패 (이용률/목표 달성 데이터 누락)</h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>에러: {goals.error}</p>
                <p className="mt-1 font-semibold">※ 운영 서버(Vercel 등)에 FIREBASE_SERVICE_ACCOUNT 환경 변수가 등록되지 않았을 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Section 2: Team Utilization */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="w-6 h-6 mr-3 text-emerald-600" /> 각각 팀의 이용률 현황
          </h2>
          <div className="space-y-6">
            {utilizationData.map((item) => {
              const expectedRoomGuests = data?.preCalculatedExpectedGuests || 0;
              const exactTeamVisitors = data?.leisureTeamVisitors?.[item.team] || 0;
              const roomGuestRateActual = expectedRoomGuests > 0 ? (exactTeamVisitors / expectedRoomGuests) * 100 : 0;

              return (
              <div key={item.team} className="group">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-bold text-gray-800 text-lg">{item.team}</span>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="text-sm flex items-center">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md mr-2 font-medium">전체 방문객 대비</span>
                      <span className="font-bold text-gray-900 text-base">{item.avgActual > 0 ? `${item.avgActual.toFixed(1)}%` : 'N/A'}</span>
                      <span className="text-gray-400 ml-1 text-xs">/ {item.avgGoal > 0 ? `${item.avgGoal.toFixed(1)}%` : 'N/A'}</span>
                    </div>

                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden relative">
                  <div 
                    className={`absolute top-0 left-0 h-full bg-gray-300 transition-all`}
                    style={{ width: `${item.avgGoal}%`, opacity: 0.5 }}
                  />
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all ${item.avgActual >= item.avgGoal ? 'bg-emerald-600' : 'bg-emerald-400'}`}
                    style={{ width: `${item.avgActual}%` }}
                  />
                </div>
              </div>
              );
            })}
            {utilizationData.length === 0 && (
              <p className="text-gray-500 text-center py-8">이용률 데이터가 없습니다.</p>
            )}
          </div>
        </div>

      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Activity className="w-6 h-6 mr-3 text-blue-600" /> 주요 영업장 숙박객 대비 이용률 
          <span className="ml-3 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            ({startMonth && endMonth && startMonth !== endMonth ? `${parseInt(startMonth.split('-')[1])}월~${parseInt(endMonth.split('-')[1])}월` : (endMonth ? `${parseInt(endMonth.split('-')[1])}월` : '현재월')} 숙박객 {(data?.preCalculatedExpectedGuests || 0).toLocaleString()}명)
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data?.utilizationMtdData?.facilities?.map((facilityItem: any) => {
            const expectedRoomGuests = data?.preCalculatedExpectedGuests || 0;
            const visitors = facilityItem.visitorsMtd || 0;
            const facilityName = facilityItem.facilityName || '';
            const rate = expectedRoomGuests > 0 ? (visitors / expectedRoomGuests) * 100 : 0;
            
            return (
              <div key={facilityName} className="bg-blue-50/30 rounded-2xl p-6 border border-blue-50 hover:shadow-md transition-all group">
                <div className="text-gray-600 text-sm font-medium mb-3">{String(facilityName).replace('벨포레 ', '')}</div>
                <div className="flex items-end justify-between mb-4">
                  <div className="text-3xl font-bold text-blue-600 group-hover:scale-105 transition-transform origin-left">{rate > 0 ? `${rate.toFixed(1)}%` : '0%'}</div>
                  <div className="text-sm text-gray-500 mb-1 font-medium">{visitors.toLocaleString()}명 방문</div>
                </div>
                <div className="w-full bg-blue-100/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

