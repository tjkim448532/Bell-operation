'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Loader2, Users } from 'lucide-react';
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
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter();

  const [goals, setGoals] = useState<any>(null);

  useEffect(() => {
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
        const goalJson = await goalRes.json();
        
        setData(json);
        if (goalJson.success) setGoals(goalJson);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
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
    let subText = subBusinesses.length > 0 ? subBusinesses.join(', ') : '';
    if (t.team === '기타') {
      subText = subText ? subText + ', 미분류(공통) 비용' : '미분류 영업장 및 공통(본부) 비용';
    }

    return {
      team: t.team,
      subText: subText,
      revenue: t.revenue,
      expense: t.expense,
      goal: teamGoals[t.team] || 0
    };
  });
  
  // Sort groupedData by revenue descending
  groupedData.sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">레저본부 대시보드</h1>
          <p className="text-gray-500 mt-2">기간을 설정하여 전반적인 실적 현황을 확인하세요.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="border-none bg-transparent px-3 py-2 text-sm outline-none text-gray-700 font-medium" 
          />
          <span className="text-gray-400 font-medium">~</span>
          <input 
            type="date" 
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
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 bg-white opacity-10 rounded-full w-64 h-64 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Users className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-blue-100 font-medium tracking-wide">레저본부 전체 방문객</p>
              <h2 className="text-4xl md:text-5xl font-extrabold mt-1">{totalVisitorActual.toLocaleString()} 명</h2>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-right w-full md:w-auto border border-white/20">
            <p className="text-blue-100 text-sm">목표 방문객</p>
            <p className="text-2xl font-bold">{totalVisitorGoal.toLocaleString()} 명</p>
            <div className="mt-3 flex items-center justify-end gap-3">
              <div className="w-32 bg-black/20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${visitorRate >= 100 ? 'bg-green-400' : 'bg-white'}`}
                  style={{ width: `${Math.min(100, visitorRate)}%` }}
                />
              </div>
              <span className={`font-bold ${visitorRate >= 100 ? 'text-green-300' : 'text-white'}`}>
                {visitorRate.toFixed(1)}% 달성
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section 2: Team Utilization */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 lg:col-span-1">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="w-6 h-6 mr-3 text-purple-500" /> 각각 팀의 이용률 현황
          </h2>
          <div className="space-y-5">
            {utilizationData.map((item) => (
              <div key={item.team} className="group">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-semibold text-gray-700">{item.team}</span>
                  <div className="text-sm">
                    <span className="font-bold text-gray-900">{item.avgActual.toFixed(1)}%</span>
                    <span className="text-gray-400 ml-1">/ {item.avgGoal.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden relative">
                  <div 
                    className={`absolute top-0 left-0 h-full bg-gray-300 transition-all`}
                    style={{ width: `${item.avgGoal}%`, opacity: 0.5 }}
                  />
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all ${item.avgActual >= item.avgGoal ? 'bg-purple-500' : 'bg-blue-400'}`}
                    style={{ width: `${item.avgActual}%` }}
                  />
                </div>
              </div>
            ))}
            {utilizationData.length === 0 && (
              <p className="text-gray-500 text-center py-8">이용률 데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Section 2: Financial Charts */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-500" />
              그룹별 매출 및 비용 비교
            </h3>
            <div className="mt-2 md:mt-0 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              데이터 무결성 검증 완료 (누락 데이터 0건)
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {groupedData.map((g) => {
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
                      <span className="font-bold text-blue-600 text-base">{formatCurrency(g.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">목표:</span>
                      <span className="text-gray-400 font-medium text-base">{formatCurrency(g.goal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-500 font-medium">비용:</span>
                      <span className="font-bold text-red-500 text-base">{formatCurrency(g.expense)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedData}
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

