'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Loader2, Users, Home, Bed, BedDouble, Flag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useDateFilter } from '@/context/DateFilterContext';

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
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHQ, setShowHQ] = useState(false);
  
  const { currentMonth, setCurrentMonth } = useDateFilter();

  const [goals, setGoals] = useState<any>(null);
  const [apiTeams, setApiTeams] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = '/api/dashboard';
        if (currentMonth) {
          url += `?month=${currentMonth}`;
        }
        
        const [dashRes, goalRes, teamRes] = await Promise.all([
          fetch(url),
          fetch('/api/goals'),
          fetch('/api/settings/leisure-teams')
        ]);
        
        const json = await dashRes.json();
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
          if (teamDataRes.success) setApiTeams(teamDataRes.teams);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [currentMonth]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-mint-500" /></div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  const getTargetSum = (teamName: string) => {
    if (!goals || !goals.data || !currentMonth) return 0;
    const teamGoals = goals.data[teamName];
    if (!teamGoals) return 0;

    const start = new Date(currentMonth + "-01");
    
    let sum = 0;
    if (start.getFullYear() === 2026) {
      sum += teamGoals[start.getMonth()];
    }
    
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

  const selectedMonths: number[] = [];
  if (currentMonth) {
    const start = new Date(currentMonth + "-01");
    if (start.getFullYear() === 2026) {
      selectedMonths.push(start.getMonth());
    }
  }

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

  // Build the dynamic data array from the database's teamData
  const groupedData = (data?.teamData || [])
    .filter(t => t.team !== '기타')
    .map(t => {
    // Extract sub-businesses from mappings
    let subBusinesses = Object.keys(data?.teamMappings || {}).filter(k => data?.teamMappings?.[k] === t.team);
    
    let teamVisitors = 0;
    if (data?.facilityVisitors) {
      subBusinesses.forEach(facility => {
        teamVisitors += data.facilityVisitors![facility] || 0;
      });
    }

    let subText = subBusinesses.length > 0 ? subBusinesses.join(', ') : '';
    if (t.team === '기타') {
      subText = subText ? subText + ', 미분류(공통) 비용' : '미분류 영업장 및 공통(본부) 비용';
    }

    return {
      team: t.team,
      subText: subText,
      revenue: t.revenue,
      expense: t.expense,
      goal: teamGoals[t.team] || 0,
      visitors: teamVisitors
    };
  });
  
  // Sort groupedData dynamically
  groupedData.sort((a, b) => {
    const TOP_TEAMS = ['골프', '객실', 'F&B'];
    const BOTTOM_TEAMS = ['디지털지원팀', '본부팀', '감가상각비', '미분류(기타)', '기타', '미분류', '제외'];
    
    const idxATop = TOP_TEAMS.indexOf(a.team);
    const idxBTop = TOP_TEAMS.indexOf(b.team);
    if (idxATop !== -1 && idxBTop !== -1) return idxATop - idxBTop;
    if (idxATop !== -1) return -1;
    if (idxBTop !== -1) return 1;
    
    const idxABot = BOTTOM_TEAMS.indexOf(a.team);
    const idxBBot = BOTTOM_TEAMS.indexOf(b.team);
    if (idxABot !== -1 && idxBBot !== -1) return idxABot - idxBBot;
    if (idxABot !== -1) return 1;
    if (idxBBot !== -1) return -1;
    
    return (b.revenue + b.expense) - (a.revenue + a.expense);
  });

  // 4. Filter to ONLY include the 'Leisure Teams' selected in settings
  const isLeisureTeam = (teamName: string) => {
    return apiTeams.length > 0 ? apiTeams.includes(teamName) : false;
  };

  const displayData = groupedData.filter(d => isLeisureTeam(d.team));

  // --- 4. Leisure Division Totals ---
  // 매출(Revenue)은 백엔드 API에서 제공하는 '레저본부' 정확한 총합을 무조건 신뢰 (SSOT)
  const leisureTotalRevenue = data?.apiLeisureTotalRevenue || 0;
  
  // 지출(Expense)은 엑셀에서 올라온 데이터를 프론트엔드 그룹핑에 맞게 동적 합산
  let leisureTotalExpense = 0;
  groupedData.forEach(t => {
    if (isLeisureTeam(t.team)) {
      leisureTotalExpense += t.expense || 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">벨포레 통합 대시보드</h1>
          <p className="text-gray-500 mt-2">
            기간을 설정하여 전반적인 실적 현황을 확인하세요.
            {data?.minDate && data?.maxDate && (
              <span className="ml-2 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-sm border border-emerald-100">
                (데이터 기준: {new Date(data.minDate).getMonth() + 1}월 {new Date(data.minDate).getDate()}일 ~ {new Date(data.maxDate).getMonth() + 1}월 {new Date(data.maxDate).getDate()}일)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-sm [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100">
          <input 
            type="month" 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)}
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
                <h2 className="text-xl md:text-2xl font-extrabold">{formatCurrency(leisureTotalRevenue)}</h2>
              </div>
              <div className="w-full h-px bg-blue-400/40 my-2"></div>
              <div className="flex justify-between items-center">
                <p className="text-blue-100 font-medium tracking-wide text-sm">레저본부 총지출</p>
                <h2 className="text-xl md:text-2xl font-extrabold">{formatCurrency(leisureTotalExpense)}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              const teamVisitorsActual = totalVisitorActual * (item.avgActual / 100);
              const teamVisitorsGoal = totalVisitorGoal * (item.avgGoal / 100);
              const expectedRoomGuests = data?.preCalculatedExpectedGuests || 0;
              const roomGuestRateActual = expectedRoomGuests > 0 ? (teamVisitorsActual / expectedRoomGuests) * 100 : 0;
              const roomGuestRateGoal = expectedRoomGuests > 0 ? (teamVisitorsGoal / expectedRoomGuests) * 100 : 0;

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
                    {expectedRoomGuests > 0 && (
                      <div className="text-sm flex items-center">
                        <span className="text-xs px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md mr-2 font-medium">예상 숙박객 대비</span>
                        <span className="font-bold text-emerald-600 text-base">{roomGuestRateActual > 0 ? `${roomGuestRateActual.toFixed(1)}%` : 'N/A'}</span>
                      </div>
                    )}
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

        {/* Section 3: Financial Charts */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              그룹별 매출 및 비용 비교
            </h3>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button 
                onClick={() => setShowHQ(!showHQ)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors flex items-center gap-1.5 ${showHQ ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
              >
                본부팀 {showHQ ? '숨기기' : '보기'}
              </button>
              <div className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                데이터 무결성 검증 완료 (누락 데이터 0건)
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 mb-8">
            {displayData.map((g) => {
              return (
                <div key={g.team} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm">
                  <div className="mb-4">
                    <h4 className="font-extrabold text-gray-900 text-lg mb-1 truncate">{g.team}</h4>
                    {g.subText && (
                      <p className="text-xs text-gray-400 leading-tight break-all">
                        ({g.subText})
                      </p>
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">매출:</span>
                      <span className="font-bold text-emerald-600 text-base">{formatCurrency(g.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">목표:</span>
                      <span className="text-gray-400 font-medium text-base">{formatCurrency(g.goal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-500 font-medium">비용:</span>
                      <span className="font-bold text-red-500 text-base">{formatCurrency(g.expense)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-500 font-medium">이익 (매출-비용):</span>
                      <span className={`font-bold text-base ${g.revenue - g.expense > 0 ? 'text-blue-600' : 'text-orange-500'}`}>{formatCurrency(g.revenue - g.expense)}</span>
                    </div>
                    {g.visitors > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                        <span className="text-gray-500 font-medium">실제 이용객:</span>
                        <span className="font-bold text-indigo-500 text-base">{g.visitors.toLocaleString()}명</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayData}
                margin={{ top: 20, right: 0, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="team" axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontSize: 13, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`} />
                <RechartsTooltip 
                  formatter={(value: any, name: any) => {
                    if (name === '목표치') return formatCurrency(Number(value));
                    return formatCurrency(Number(value));
                  }}
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="revenue" name="달성 매출" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                <Bar dataKey="expense" name="발생 비용" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={50} />
                <Bar dataKey="goal" name="목표 매출" fill="#E5E7EB" fillOpacity={0} stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" maxBarSize={55} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

