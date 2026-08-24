'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Loader2, Users, Home, Bed, BedDouble, Flag, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { useDateFilter } from '@/context/DateFilterContext';
import { dashboardV5Schema } from '@/lib/schemas/dashboard.schema';
import GlobalDateSelector from '@/components/GlobalDateSelector';

type DashboardData = {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  teamData: {
    team: string;
    revenue: number;
    expense: number;
  }[];
  venueSalesDetails?: {
    venueName: string;
    groupName: string;
    revenue: number;
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
  weather?: any;
  preCalculatedExpectedGuests?: number;
  leisureTeamVisitors?: Record<string, number>;
  utilizationMtdData?: any;
  v5Mapping?: Record<string, string>;
  totalRooms?: number;
  totalGolfTeams?: number;
  leisureRevenue?: number;
  leisureExpense?: number;
  leisureFacilityVisitors?: Record<string, number>;
  mtd?: any;
  ytd?: any;
  gridData?: any;
  rateTypeBreakdown?: any[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRevTeams, setExpandedRevTeams] = useState<Record<string, boolean>>({});
  const [expandedExpTeams, setExpandedExpTeams] = useState<Record<string, boolean>>({});

  const { startMonth, endMonth } = useDateFilter();

  const [goals, setGoals] = useState<any>(null);
  const [apiTeams, setApiTeams] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = '/api/dashboard';
        if (startMonth && endMonth) {
          url += `?startMonth=${startMonth}&endMonth=${endMonth}`;
        }
        
        const [dashRes, goalRes, teamRes, selRes] = await Promise.all([
          fetch(url, { signal: controller.signal }),
          fetch('/api/goals', { signal: controller.signal }),
          fetch('/api/settings/leisure-teams', { signal: controller.signal }),
          fetch('/api/settings/leisure-selection', { signal: controller.signal })
        ]);
        
        if (ignore) return;

        const json = await dashRes.json();
        if (ignore) return;

        if (!dashRes.ok || json.error) {
          throw new Error(json.error || json.details || `서버 오류가 발생했습니다 (${dashRes.status})`);
        }

        // Zod 방패(Shield) 가동: 백엔드 숫자가 무결한지 단속
        const parseResult = dashboardV5Schema.safeParse(json);
        if (!parseResult.success) {
          console.error('Zod Validation Error:', parseResult.error);
          throw new Error(json.error || '데이터를 불러오는데 실패했습니다.');
        }

        const teamDataRes = await teamRes.json();
        let goalJson: any = { success: false, data: null, error: null };
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
          setData({ ...json, ...parseResult.data } as DashboardData);
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
      } catch (err: any) {
        if (err.name === 'AbortError' || ignore) return;
        console.error(err);
        setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [startMonth, endMonth]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-mint-500" /></div>;
  }

  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Number(val.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (val: any) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(parseAmount(val));

  const selectedMonths: number[] = [];
  if (startMonth && endMonth && startMonth.length === 7 && endMonth.length === 7) {
    let [sy, sm] = startMonth.split('-').map(Number);
    let [ey, em] = endMonth.split('-').map(Number);
    let current = new Date(sy, sm - 1, 1);
    const end = new Date(ey, em - 1, 1);
    while (current <= end) {
      selectedMonths.push(current.getMonth());
      current.setMonth(current.getMonth() + 1);
    }
  }

  const getTargetSum = (teamName: string) => {
    if (!goals || !goals.data) return 0;
    const teamGoals = goals.data[teamName];
    if (teamGoals === undefined || teamGoals === null) return 0;
    return Number(teamGoals) || 0;
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
  const getVisitorSum = (targetOrActual: string) => {
    if (!goals?.visitors?.[targetOrActual]) return 0;
    const dataObj = goals.visitors[targetOrActual];
    const visitorKeysToTry = ['레저본부 방문객', '합계', '총계', '방문객', '전체 방문객'];
    for (const key of visitorKeysToTry) {
      if (dataObj[key] && Array.isArray(dataObj[key])) {
        return selectedMonths.reduce((sum, m) => sum + (dataObj[key][m] || 0), 0);
      }
    }
    return 0;
  };
  const totalVisitorGoal = getVisitorSum('target');
  const totalVisitorActual = getVisitorSum('actual');
  const visitorRate = totalVisitorGoal > 0 ? (totalVisitorActual / totalVisitorGoal) * 100 : 0;

  // --- 2. Team Utilization ---
  const dynamicTeams = Array.from(new Set([
    ...Object.keys(goals?.utilization?.target || {}),
    ...Object.keys(goals?.utilization?.actual || {})
  ]));
  
  const getAvgUtilization = (targetOrActual: string, team: string) => {
    if (!goals?.utilization?.[targetOrActual]?.[team]) return 0;
    const arr = goals.utilization[targetOrActual][team];
    let sum = 0, count = 0;
    selectedMonths.forEach(m => {
      if (arr[m] !== undefined && arr[m] !== null) {
        sum += arr[m]; count++;
      }
    });
    return count > 0 ? sum / count : 0;
  };
  
  const utilizationData = dynamicTeams.map(team => ({
    team,
    avgGoal: getAvgUtilization('target', team),
    avgActual: getAvgUtilization('actual', team)
  })).filter(d => d.avgGoal > 0 || d.avgActual > 0);

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

  // 4. Include ALL Leisure Division teams for full division analysis
  const isLeisureTeam = (teamName: string) => {
    // 엄격한 Allowlist: apiTeams에 포함되거나, 레저본부/미분류 계열인 경우만 통과
    if (teamName === '미분류' || teamName === '미분류 (기타)' || teamName === '기타' || teamName === '레저본부') return true;
    return apiTeams.includes(teamName);
  };

  // --- 4. Leisure Division Totals (NO SLICE SUMMATION) ---
  let leisureTotalRevenue = data?.leisureRevenue || data?.totalRevenue || 0;
  let leisureTotalExpense = data?.leisureExpense || data?.totalExpense || 0;
  let leisureTeamsDetails: { team: string, revenue: number, expense: number }[] = data?.teamData || [];

  const unmappedCount = data?.adminMappings?.filter((m: any) => 
    (!m.teamName || m.teamName === '미분류') && 
    (!m.partName || m.partName === '미분류')
  ).length || 0;
  const toggleRevTeam = (team: string) => {
    setExpandedRevTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  const toggleExpTeam = (team: string) => {
    setExpandedExpTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  const getGroupedExpenseItems = (teamName: string) => {
    const rawKey = teamName === '미분류 (기타)' ? '기타' : teamName;
    const raw = data?.expenseData?.[rawKey] || data?.expenseData?.[teamName];
    if (!raw || !raw.items || !Array.isArray(raw.items)) return [];
    
    const map = new Map<string, number>();
    raw.items.forEach((item: any) => {
      const name = String(item.name || '기타 항목').trim();
      const amount = Number(item.amount) || 0;
      map.set(name, (map.get(name) || 0) + amount);
    });
    
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .filter(i => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  };

  const getDepartmentVenues = (teamName: string) => {
    return (data?.venueSalesDetails || []).filter(v => v.groupName === teamName && v.revenue > 0);
  };

  const displayIncludedTeams = Array.from(new Set(
    leisureTeamsDetails
      .filter(t => t.revenue > 0)
      .map(t => t.team)
      .filter(t => !t.includes('디지털') && !t.includes('디지탈') && !t.includes('본부팀'))
  ));

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
          <Link href="/settings-v6-mapping" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap">
            매핑 센터로 이동
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">벨포레 통합 대시보드</h1>
          <div className="text-gray-500 mt-2 flex items-center flex-wrap gap-2">
            <span>기간을 설정하여 전반적인 실적 현황을 확인하세요.</span>
            {data?.weather && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-200 shadow-sm">
                <span>🌤️ 벨포레 기상: {data.weather.description || '맑음'}</span>
                {data.weather.tempMax !== undefined && <span>({data.weather.tempMin || 0}°C ~ {data.weather.tempMax || 0}°C)</span>}
              </span>
            )}
          </div>
        </div>
        <GlobalDateSelector />
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
              {displayIncludedTeams.length > 0 && (
                <div className="mt-3 text-xs text-blue-200/80 break-all leading-relaxed font-light">
                  <span className="font-medium opacity-70">포함 부서:</span> {displayIncludedTeams.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {((data?.venueSalesDetails && data.venueSalesDetails.length > 0) || leisureTeamsDetails.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
          {/* Revenue Breakdown by Department with Accordion */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mr-4 shrink-0">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">레저본부 총매출 포함 부서</h3>
                  <p className="text-xs text-gray-500 mt-0.5">부서 클릭 시 세부 영업장 매출 펼침</p>
                </div>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold">
                금액순 정렬
              </span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-96">
              {leisureTeamsDetails.filter(t => t.revenue > 0).sort((a,b) => b.revenue - a.revenue).map((t, idx) => {
                const subVenues = getDepartmentVenues(t.team);
                const isExpanded = !!expandedRevTeams[t.team];
                return (
                  <div key={idx} className="rounded-2xl border border-gray-100/90 overflow-hidden transition-all bg-gray-50/40 hover:bg-gray-50/80">
                    <button 
                      onClick={() => toggleRevTeam(t.team)}
                      className="w-full flex justify-between items-center p-3.5 text-left transition-colors focus:outline-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <span className="text-gray-800 font-bold text-sm truncate">{t.team}</span>
                        {subVenues.length > 0 && (
                          <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-semibold shrink-0">
                            {subVenues.length}개 매장
                          </span>
                        )}
                      </div>
                      <span className="text-gray-900 font-extrabold tracking-tight text-sm shrink-0 pl-2">
                        {formatCurrency(t.revenue)}
                      </span>
                    </button>

                    {isExpanded && subVenues.length > 0 && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-blue-100/60 bg-blue-50/20 space-y-1.5 animate-fadeIn">
                        {subVenues.map((v, vIdx) => (
                          <div key={vIdx} className="flex justify-between items-center text-xs py-2 px-3 rounded-xl bg-white border border-blue-100/60 shadow-2xs">
                            <span className="text-gray-700 font-medium truncate mr-2">📍 {v.venueName}</span>
                            <span className="text-blue-900 font-bold whitespace-nowrap">{formatCurrency(v.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {leisureTeamsDetails.filter(t => t.revenue > 0).length === 0 && (
                <div className="py-6 text-center text-gray-400 text-sm">매출 발생 부서가 없습니다.</div>
              )}
            </div>
          </div>
          
          {/* Expense Breakdown by Department with Accordion */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mr-4 shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">레저본부 총지출 포함 부서</h3>
                  <p className="text-xs text-gray-500 mt-0.5">부서 클릭 시 세부 지출 항목 펼침</p>
                </div>
              </div>
              <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-bold">
                금액순 정렬
              </span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-96">
              {leisureTeamsDetails.filter(t => t.expense > 0).sort((a,b) => b.expense - a.expense).map((t, idx) => {
                const subItems = getGroupedExpenseItems(t.team);
                const isExpanded = !!expandedExpTeams[t.team];
                return (
                  <div key={idx} className="rounded-2xl border border-gray-100/90 overflow-hidden transition-all bg-gray-50/40 hover:bg-gray-50/80">
                    <button 
                      onClick={() => toggleExpTeam(t.team)}
                      className="w-full flex justify-between items-center p-3.5 text-left transition-colors focus:outline-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-red-100/70 text-red-700 flex items-center justify-center shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <span className="text-gray-800 font-bold text-sm truncate">{t.team}</span>
                        {subItems.length > 0 && (
                          <span className="text-[11px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-semibold shrink-0">
                            {subItems.length}개 항목
                          </span>
                        )}
                      </div>
                      <span className="text-gray-900 font-extrabold tracking-tight text-sm shrink-0 pl-2">
                        {formatCurrency(t.expense)}
                      </span>
                    </button>

                    {isExpanded && subItems.length > 0 && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-red-100/60 bg-red-50/20 space-y-1.5 animate-fadeIn">
                        {subItems.map((item, iIdx) => (
                          <div key={iIdx} className="flex justify-between items-center text-xs py-2 px-3 rounded-xl bg-white border border-red-100/60 shadow-2xs">
                            <span className="text-gray-700 font-medium truncate mr-2">📋 {item.name}</span>
                            <span className="text-red-900 font-bold whitespace-nowrap">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
            <span className="ml-2 text-xs text-gray-400 font-normal">(구글 시트 연동)</span>
          </h2>
          <div className="space-y-6">
            {utilizationData.map((item) => {
              return (
              <div key={item.team} className="group">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-bold text-gray-800 text-lg">{item.team}</span>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="text-sm flex items-center">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md mr-2 font-medium">전체 방문객 대비 (실제 / 목표)</span>
                      <span className="font-bold text-gray-900 text-base">{typeof item.avgActual === 'number' && !isNaN(item.avgActual) ? `${item.avgActual.toFixed(1)}%` : 'N/A'}</span>
                      <span className="text-gray-400 ml-1 text-xs">/ {typeof item.avgGoal === 'number' && !isNaN(item.avgGoal) ? `${item.avgGoal.toFixed(1)}%` : 'N/A'}</span>
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
          {(() => {
            const ranchFacility = data?.utilizationMtdData?.facilities?.find((f: any) => {
              const name = String(f.facilityName || '').trim();
              return name.includes('목장') && !name.includes('체험');
            });
            const ranchVisitors = ranchFacility?.visitorsMtd || 0;
            const expectedRoomGuests = data?.preCalculatedExpectedGuests || 0;

            return data?.utilizationMtdData?.facilities?.filter((facilityItem: any) => {
              const facilityName = String(facilityItem.facilityName || '').trim();
              if (facilityName.includes('리조트') || facilityName === '소계' || facilityName.includes('미사용')) return false;
              const teamName = data?.v5Mapping?.[facilityName] || '미분류';
              // V5 바이블 원칙: 레저본부나 미분류가 아닌 타 본부 데이터는 화면 노출 원천 차단
              return isLeisureTeam(teamName) || isLeisureTeam(facilityName);
            }).map((facilityItem: any) => {
              const facilityName = facilityItem.facilityName || '';
              const isRanchExp = facilityName.includes('체험');
              const visitors = facilityItem.visitorsMtd || 0;
              
              const denominator = (isRanchExp && ranchVisitors > 0) ? ranchVisitors : expectedRoomGuests;
              const rate = denominator > 0 ? (visitors / denominator) * 100 : 0;
              const isSpecialRatio = isRanchExp && ranchVisitors > 0;
              
              return (
                <div key={facilityName} className={`rounded-2xl p-6 border transition-all group ${isSpecialRatio ? 'bg-emerald-50/40 border-emerald-100 shadow-2xs' : 'bg-blue-50/30 border-blue-50 hover:shadow-md'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-gray-700 text-sm font-bold">{String(facilityName).replace('벨포레 ', '')}</div>
                    {isSpecialRatio && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        목장 입장객 대비
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${isSpecialRatio ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {rate > 0 ? `${rate.toFixed(1)}%` : '0%'}
                    </div>
                    <div className="text-sm text-gray-500 mb-1 font-medium">{visitors.toLocaleString()}명 방문</div>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden ${isSpecialRatio ? 'bg-emerald-100/60' : 'bg-blue-100/50'}`}>
                    <div 
                      className={`h-full rounded-full transition-all ${isSpecialRatio ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                  {isSpecialRatio && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-2.5">
                      * 목장 입장객 {ranchVisitors.toLocaleString()}명 중 전환율
                    </p>
                  )}
                </div>
              );
            });
          })()}
        </div>
        {(!data?.utilizationMtdData?.facilities || data.utilizationMtdData.facilities.length === 0) && (
          <div className="text-center py-10 text-gray-400 text-sm">
            선택한 기간의 영업장별 방문객/이용률 데이터가 집계 대기 중입니다.
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

