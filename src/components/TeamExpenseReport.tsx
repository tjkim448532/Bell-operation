'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function TeamExpenseReport() {
  const { startMonth, endMonth } = useDateFilter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [apiTeams, setApiTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = `?team=all&startMonth=${startMonth}&endMonth=${endMonth}`;
        const [dashRes, teamRes] = await Promise.all([
          fetch(`/api/dashboard?startMonth=${startMonth}&endMonth=${endMonth}`),
          fetch('/api/settings/leisure-selection')
        ]);
        
        const dashData = await dashRes.json();
        const teamDataRes = await teamRes.json();
        
        if (!ignore) {
          setExpenses(dashData.expenseData || {});
          if (teamDataRes.success && teamDataRes.selectedTeams) {
            setApiTeams(teamDataRes.selectedTeams);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    if (startMonth && endMonth) {
      fetchData();
    }
    return () => { ignore = true; };
  }, [startMonth, endMonth]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  const teamExpenseData = useMemo(() => {
    if (!expenses || Object.keys(expenses).length === 0) return [];

    // Dashboard expenseData is an object: { '팀명': { total: 0, items: [{name, amount}] } }
    return Object.keys(expenses)
      .filter(team => apiTeams.includes(team) || expenses[team].total > 0) // Strict boundary filtering
      .map(team => {
        const teamData = expenses[team];
        const itemsList = Array.isArray(teamData.items) ? teamData.items : [];
        
        // Sum duplicate category names if backend returns raw items instead of grouped
        const categoryMap: Record<string, number> = {};
        itemsList.forEach((item: any) => {
          categoryMap[item.name] = (categoryMap[item.name] || 0) + item.amount;
        });

        const sortedItems = Object.entries(categoryMap)
          .map(([name, amount]) => ({ name, amount: Number(amount) }))
          .sort((a, b) => b.amount - a.amount);
        
        const top3 = sortedItems.slice(0, 3);
        let top3Sum = 0;
        top3.forEach(item => top3Sum += item.amount); // Not a grand total, just finding top 3 sum for chart slice
        const othersAmount = teamData.total - top3Sum;
        
        return {
          team,
          total: teamData.total,
          top3,
          othersAmount
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [expenses, apiTeams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-mint-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        팀별 비용 분석
        <span className="ml-4 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          ({startMonth && endMonth && startMonth !== endMonth ? `${parseInt(startMonth.split('-')[1])}월~${parseInt(endMonth.split('-')[1])}월` : (endMonth ? `${parseInt(endMonth.split('-')[1])}월` : '현재월')})
        </span>
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {teamExpenseData.map((data, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border-2 border-mint-500/20 overflow-hidden flex flex-col h-full relative">
            <div className="p-6 flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-xl font-extrabold text-gray-900 mb-2">{data.team}</h2>
                <div className="text-xs font-semibold text-gray-400 mb-1">총 비용</div>
                <div className="text-2xl font-bold text-red-500">{formatCurrency(data.total)}</div>
              </div>

              <div className="text-xs font-semibold text-gray-400 mb-5">
                TOP 3 비용 및 기타
              </div>

              <div className="space-y-6 flex-1">
                {data.top3.map((item, itemIdx) => {
                  const percentage = data.total > 0 ? Math.round((item.amount / data.total) * 100) : 0;
                  return (
                    <div key={itemIdx}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="bg-gray-100 text-gray-500 w-5 h-5 rounded flex items-center justify-center text-xs font-bold">
                            {itemIdx + 1}
                          </span>
                          <span className="text-sm font-semibold text-gray-800 truncate max-w-[140px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 flex-1 relative">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full absolute top-0 left-0" 
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 font-bold w-8 text-right">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}

                {/* 기타 비용 */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-600 ml-7">기타 비용</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(data.othersAmount)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-full bg-gray-100 rounded-full h-1.5 flex-1 relative">
                      <div 
                        className="bg-gray-400 h-1.5 rounded-full absolute top-0 left-0" 
                        style={{ width: `${data.total > 0 ? Math.min(100, Math.round((data.othersAmount / data.total) * 100)) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 font-bold w-8 text-right">
                      {data.total > 0 ? Math.round((data.othersAmount / data.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {teamExpenseData.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            해당 월에 발생한 지출 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
