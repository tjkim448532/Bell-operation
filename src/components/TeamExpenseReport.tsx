'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';

const isExcludedInShared = (teamName: string) => {
  const name = String(teamName || '').trim();
  if (name.includes('디지털') || name.includes('디지탈')) return true;
  if (name.includes('본부팀') || name === '본부' || name === '레저본부') return true;
  if (['기타', '제외', '미분류', '미분류(기타)', '미분류 (기타)', '감가상각비'].includes(name)) return true;
  return false;
};

export default function TeamExpenseReport() {
  const { startDate, endDate, startMonth, endMonth } = useDateFilter();
  const [expenses, setExpenses] = useState<Record<string, any>>({});
  const [apiTeams, setApiTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, teamRes] = await Promise.all([
          fetch(`/api/dashboard?startDate=${startDate}&endDate=${endDate}&startMonth=${startMonth}&endMonth=${endMonth}`),
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
    if (startDate && endDate) {
      fetchData();
    }
    return () => { ignore = true; };
  }, [startDate, endDate]);

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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              부서별 세부 비용 분석
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
              {startDate} ~ {endDate}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            레저본부 각 부서별 발생 비용 합계 및 주요 지출 비목 TOP 3 점유율을 분석합니다.
          </p>
        </div>

        <GlobalDateSelector />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamExpenseData.map((data, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden flex flex-col h-full relative hover:border-slate-300 transition-all">
            <div className="p-5 flex flex-col h-full">
              <div className="mb-5 pb-3.5 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 truncate">{data.team}</h2>
                <div className="text-2xs font-semibold text-slate-400 mb-0.5">총 비용</div>
                <div className="text-lg sm:text-xl font-bold text-rose-600 tabular-nums truncate" title={formatCurrency(data.total)}>{formatCurrency(data.total)}</div>
              </div>

              <div className="text-xs font-semibold text-slate-500 mb-4 flex items-center justify-between">
                <span>주요 지출 비목 TOP 3</span>
                <span className="text-2xs text-slate-400 font-medium">비중</span>
              </div>

              <div className="space-y-4 flex-1">
                {data.top3.map((item, itemIdx) => {
                  const percentage = data.total > 0 ? Math.round((item.amount / data.total) * 100) : 0;
                  return (
                    <div key={itemIdx}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-100 text-slate-600 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                            {itemIdx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate max-w-[130px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 flex-1 relative overflow-hidden">
                          <div 
                            className="bg-rose-500 h-1.5 rounded-full absolute top-0 left-0" 
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-semibold w-8 text-right tabular-nums">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}

                {/* 기타 비용 */}
                {data.othersAmount > 0 && (
                  <div className="pt-2 border-t border-slate-100/80">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-7">기타 비용</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 tabular-nums">{formatCurrency(data.othersAmount)}</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 flex-1 relative overflow-hidden">
                        <div 
                          className="bg-slate-400 h-1.5 rounded-full absolute top-0 left-0" 
                          style={{ width: `${data.total > 0 ? Math.min(100, Math.round((data.othersAmount / data.total) * 100)) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-semibold w-8 text-right tabular-nums">
                        {data.total > 0 ? Math.round((data.othersAmount / data.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {teamExpenseData.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs sm:text-sm font-medium bg-white rounded-2xl border border-slate-200/80">
            해당 기간에 발생한 지출 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
