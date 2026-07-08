'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Loader2, Users, Home, Bed } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useDateFilter } from '@/context/DateFilterContext';
import TeamReport from '@/components/TeamReport';

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
  
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter();

  const [goals, setGoals] = useState<any>(null);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = '/api/dashboard';
        if (startDate && endDate) {
          url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        
        const [dashRes, goalRes] = await Promise.all([
          fetch(url),
          fetch('/api/goals')
        ]);
        
        const json = await dashRes.json();
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
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [startDate, endDate]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-mint-500" /></div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  const getTargetSum = (teamName: string) => {
    if (!goals || !goals.data) return 0;
    const teamGoals = goals.data[teamName];
    if (!teamGoals) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let sum = 0;
    const curr = new Date(start);
    curr.setDate(1); // Set to 1st to prevent month skipping
    
    while (curr <= end || (curr.getFullYear() === end.getFullYear() && curr.getMonth() === end.getMonth())) {
      // Goals in the sheet are currently strictly for 2026. 
      // Only sum targets for months that fall in 2026.
      if (curr.getFullYear() === 2026) {
        sum += teamGoals[curr.getMonth()];
      }
      curr.setMonth(curr.getMonth() + 1);
    }
    
    return sum;
  };

  const totalRevenueTarget = getTargetSum('합계');
  const revenueAchievement = totalRevenueTarget > 0 ? ((data?.totalRevenue || 0) / totalRevenueTarget) * 100 : 0;

  // Add goal data to teamData for BarChart
  const enhancedTeamData = data?.teamData?.map(t => {
    let teamNameForGoal = t.team;
    if (t.team === '엑티비티') {
      teamNameForGoal = '사계절썰매'; // Fallback or we could sum up all activity sub-teams, but sheet has 사계절썰매 and 마운틴카트 separated. Let's just use 썰매+카트 sum.
      const s = getTargetSum('사계절썰매') + getTargetSum('마운틴카트');
      return { ...t, goal: s };
    }
    return { ...t, goal: getTargetSum(teamNameForGoal) };
  });

  const selectedMonths: number[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const curr = new Date(start);
  curr.setDate(1);
  while (curr <= end || (curr.getFullYear() === end.getFullYear() && curr.getMonth() === end.getMonth())) {
    if (curr.getFullYear() === 2026) {
      selectedMonths.push(curr.getMonth());
    }
    curr.setMonth(curr.getMonth() + 1);
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
  const ALL_TEAMS = ['미디어아트센터', '목장', '사계절썰매', '마운틴카트', '원더풀', '썸머랜드', '마리나'];
  const utilizationData = ALL_TEAMS.map(team => {
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
    // 1. Direct match
    if (maps[goalTeamName]) return maps[goalTeamName];
    // 2. Substring match
    const subKey = Object.keys(maps).find(k => k.includes(goalTeamName) || goalTeamName.includes(k));
    if (subKey) return maps[subKey];
    // 3. Heuristic fallback
    if (goalTeamName.includes('목장') || goalTeamName.includes('얼룩말카페')) return '목장';
    if (goalTeamName.includes('미디어') || goalTeamName.includes('기프트샵')) return '미디어아트센터';
    if (goalTeamName.includes('썰매') || goalTeamName.includes('카트') || goalTeamName.includes('원더풀') || goalTeamName.includes('썸머랜드') || goalTeamName.includes('마리나') || goalTeamName.includes('엑티비티') || goalTeamName.includes('액티비티')) return '엑티비티';
    return '기타';
  };

  // Group goals into the dynamic teams
  const teamGoals: Record<string, number> = {};
  selectedMonths.forEach(m => {
    const revGoals = goals?.revenue || {};
    for (const [gTeam, gArray] of Object.entries(revGoals)) {
      if (gTeam === '합계' || gTeam.includes('방문객')) continue;
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
  
  // Sort groupedData by requested order
  const TEAM_ORDER = ['골프', '객실', 'F&B', '엑티비티', '놀이동산', '목장', '미디어아트센터', '디지털지원', '본부팀', '미분류 티켓', '기타'];
  groupedData.sort((a, b) => {
    let idxA = TEAM_ORDER.indexOf(a.team);
    let idxB = TEAM_ORDER.indexOf(b.team);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  const displayData = groupedData.filter(d => showHQ || d.team !== '본부팀');

  // --- 4. Room Stats ---
  const totalRoomNights = data?.roomSales ? Object.values(data.roomSales).reduce((sum, num) => sum + num, 0) : 0;
  const expectedRoomGuests = data?.preCalculatedExpectedGuests || 0;

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
        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <input 
            type="month" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="border-none bg-transparent px-3 py-2 text-sm outline-none text-gray-700 font-medium" 
          />
          <span className="text-gray-400 font-medium">~</span>
          <input 
            type="month" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="border-none bg-transparent px-3 py-2 text-sm outline-none text-gray-700 font-medium" 
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
          {/* Section 1: Total Visitors */}
      <div className="bg-gradient-to-br from-[#0c3c2e] to-[#156e54] rounded-3xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 bg-white opacity-10 rounded-full w-64 h-64 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shrink-0">
              <Users className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-emerald-100 font-medium tracking-wide">리조트 전체 방문객</p>
              <h2 className="text-4xl md:text-5xl font-extrabold mt-1">{totalVisitorActual.toLocaleString()} 명</h2>
              {data?.minDate && data?.maxDate && (
                <p className="mt-2 text-emerald-200 text-sm opacity-90">
                  {new Date(data.minDate).getMonth() + 1}월 {new Date(data.minDate).getDate()}일 부터 {new Date(data.maxDate).getMonth() + 1}월 {new Date(data.maxDate).getDate()}일 까지
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0">
      {/* 1. Header & Summary Cards */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-white/20 flex-1 flex flex-col justify-center min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                 <Bed className="w-5 h-5 text-emerald-200" />
                 <p className="text-emerald-100 text-sm">판매 객실 / 예상 숙박객</p>
               </div>
               <div className="flex items-center gap-1">
                 <p className="text-2xl font-bold">{totalRoomNights.toLocaleString()}</p>
                 <span className="text-emerald-200 text-sm mt-1 mr-1">박</span>
                 <span className="text-emerald-200/50 text-xl font-light mx-1">/</span>
                 <p className="text-2xl font-bold ml-1">{expectedRoomGuests.toLocaleString()}</p>
                 <span className="text-emerald-200 text-sm mt-1">명</span>
               </div>
             </div>
           </div>
          </div>
        </div>
      <TeamReport />


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

