'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

type DashboardData = {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  teamData: {
    team: string;
    revenue: number;
    expense: number;
  }[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to current month
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  });

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

  if (!data || data.totalRevenue === 0 && data.totalExpense === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <PieChart className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">데이터가 없습니다</h2>
        <p>데이터 업로드 메뉴에서 PMS 및 재경 비용 파일을 업로드해 주세요.</p>
      </div>
    );
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
  const revenueAchievement = totalRevenueTarget > 0 ? (data.totalRevenue / totalRevenueTarget) * 100 : 0;

  // Add goal data to teamData for BarChart
  const enhancedTeamData = data.teamData.map(t => {
    let teamNameForGoal = t.team;
    if (t.team === '엑티비티') {
      teamNameForGoal = '사계절썰매'; // Fallback or we could sum up all activity sub-teams, but sheet has 사계절썰매 and 마운틴카트 separated. Let's just use 썰매+카트 sum.
      const s = getTargetSum('사계절썰매') + getTargetSum('마운틴카트');
      return { ...t, goal: s };
    }
    return { ...t, goal: getTargetSum(teamNameForGoal) };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">재무 요약</h1>
          <p className="text-gray-500 mt-2">기간을 설정하여 레저본부 실적 현황을 확인하세요.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">총 매출 (목표 대비)</p>
              <div className="flex items-end space-x-2">
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</h3>
                {totalRevenueTarget > 0 && (
                  <span className={`text-sm font-bold mb-1 ${revenueAchievement >= 100 ? 'text-green-500' : 'text-blue-500'}`}>
                    ({revenueAchievement.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
          {totalRevenueTarget > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2 overflow-hidden relative">
              <div 
                className={`h-2.5 rounded-full ${revenueAchievement >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min(100, revenueAchievement)}%` }}
              ></div>
              {revenueAchievement > 100 && (
                <div className="absolute top-0 right-0 h-full bg-white bg-opacity-30" style={{ width: `${100 - (100 / (revenueAchievement/100))}%` }}></div>
              )}
            </div>
          )}
          {totalRevenueTarget > 0 && (
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0원</span>
              <span>목표: {formatCurrency(totalRevenueTarget)}</span>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-red-50 rounded-xl">
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">총 비용</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalExpense)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className={`p-4 rounded-xl ${data.netProfit >= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
            <DollarSign className={`w-8 h-8 ${data.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">순이익</p>
            <h3 className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {formatCurrency(data.netProfit)}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-500" /> 팀별 매출 및 비용 비교
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enhancedTeamData}
              margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="team" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 14, fontWeight: 500}} dy={10} />
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
              <Bar dataKey="revenue" name="매출" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={60} />
              <Bar dataKey="expense" name="비용" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={60} />
              <Bar dataKey="goal" name="목표치" fill="#E5E7EB" fillOpacity={0} stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" maxBarSize={65} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
