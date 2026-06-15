'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, Loader2, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function TeamReportPage() {
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = `?team=all&startDate=${startDate}&endDate=${endDate}`;
        const expRes = await fetch(`/api/analysis${queryParams}&type=expense`);
        const expData = await expRes.json();
        setExpenses(Array.isArray(expData) ? expData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR');

  // Group data by team, then by mapped_term
  const teamExpenseData = useMemo(() => {
    const teamGroups: Record<string, Record<string, any[]>> = {};
    
    expenses.forEach(exp => {
      const t = exp.team || '기타';
      if (t === '기타' || t === '제외') return; // Hide non-core teams from team leaders

      if (!teamGroups[t]) teamGroups[t] = {};
      
      const cat = exp.mapped_term || '미분류';
      if (!teamGroups[t][cat]) teamGroups[t][cat] = [];
      
      teamGroups[t][cat].push(exp);
    });

    // Convert to sorted array
    return Object.keys(teamGroups).map(team => {
      const categories = Object.keys(teamGroups[team]).map(cat => {
        const items = teamGroups[team][cat];
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        return { name: cat, items, total };
      }).sort((a, b) => b.total - a.total); // Sort categories by amount desc

      const teamTotal = categories.reduce((sum, cat) => sum + cat.total, 0);

      return { team, categories, teamTotal };
    }).sort((a, b) => b.teamTotal - a.teamTotal); // Sort teams by amount desc
  }, [expenses]);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">팀별 비용 공유 리포트</h1>
          <p className="text-gray-500 mt-2">팀장님들과 비용 내역을 투명하게 공유할 수 있는 열람용 페이지입니다. (정직원 인건비 상세내역 자동 블라인드)</p>
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

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : teamExpenseData.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500">
          선택한 기간에 해당하는 지출 데이터가 없습니다.
        </div>
      ) : (
        <div className="space-y-8">
          {teamExpenseData.map((teamData) => (
            <div key={teamData.team} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Team Header */}
              <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">{teamData.team}</h2>
                <div className="text-lg font-bold text-gray-900">총 지출: {formatCurrency(teamData.teamTotal)}</div>
              </div>

              {/* Categories */}
              <div className="divide-y divide-gray-100">
                {teamData.categories.map((cat) => (
                  <AccordionItem 
                    key={cat.name} 
                    category={cat} 
                    formatCurrency={formatCurrency} 
                    formatDate={formatDate} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Accordion Component
function AccordionItem({ category, formatCurrency, formatDate }: { category: any, formatCurrency: any, formatDate: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const isLabor = category.name === '인건비-정직원';

  return (
    <div>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          <span className="font-semibold text-gray-700">{category.name}</span>
          {isLabor && <span className="flex items-center text-xs font-medium bg-red-50 text-red-600 px-2 py-1 rounded-md ml-2"><Lock className="w-3 h-3 mr-1" />보안 적용됨</span>}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{category.items.length}건</span>
          <span className="font-bold text-gray-900">{formatCurrency(category.total)}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 bg-gray-50/50">
          {isLabor ? (
            // Labor Protection: Show only summary
            <div className="bg-white rounded-lg border border-red-100 p-6 text-center">
              <Lock className="w-8 h-8 text-red-200 mx-auto mb-3" />
              <p className="text-gray-800 font-medium mb-1">정직원 등 개인 급여 세부 내역은 보안상 비공개 처리되었습니다.</p>
              <p className="text-gray-500 text-sm">해당 월의 인건비 총합은 {formatCurrency(category.total)} 입니다.</p>
            </div>
          ) : (
            // Normal Expenses: Show full table
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">날짜</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">영업장(프로젝트)</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">업체명</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 w-1/2 whitespace-nowrap">적요(상세)</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-500 whitespace-nowrap">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {category.items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.branch_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.vendor || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium text-right whitespace-nowrap">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
