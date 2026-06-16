'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function TeamReport({ isShared = false }: { isShared?: boolean }) {
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = `?team=all&startDate=${startDate}&endDate=${endDate}`;
        const [expRes, revRes] = await Promise.all([
          fetch(`/api/analysis${queryParams}&type=expense`),
          fetch(`/api/analysis${queryParams}&type=revenue`)
        ]);
        
        const expData = await expRes.json();
        const revData = await revRes.json();
        
        setExpenses(Array.isArray(expData) ? expData : []);
        setRevenues(Array.isArray(revData) ? revData : []);
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

  const { teamExpenseData, grandTotalExpense, grandTotalRevenue } = useMemo(() => {
    const teamGroups: Record<string, Record<string, any[]>> = {};
    const teamRevs: Record<string, number> = {};
    let grandTotalExpense = 0;
    let grandTotalRevenue = 0;
    
    revenues.forEach(rev => {
      grandTotalRevenue += rev.amount || 0;
      let t = rev.team || '미분류(기타)';
      if (t === '기타') t = '미분류(기타)';
      if (t === '제외') return;
      if (isShared && t === '미분류(기타)') return;
      teamRevs[t] = (teamRevs[t] || 0) + (rev.amount || 0);
    });
    
    expenses.forEach(exp => {
      grandTotalExpense += exp.amount || 0;
      let t = exp.team || '미분류(기타)';
      if (t === '기타') t = '미분류(기타)';
      if (t === '제외') return; 
      if (isShared && t === '미분류(기타)') return;

      if (!teamGroups[t]) teamGroups[t] = {};
      
      const cat = exp.mapped_term || '미분류';
      if (!teamGroups[t][cat]) teamGroups[t][cat] = [];
      
      teamGroups[t][cat].push(exp);
    });

    // We should also include teams that only have revenue but no expense
    let allTeams = Array.from(new Set([...Object.keys(teamGroups), ...Object.keys(teamRevs)]));

    if (isShared) {
      const allowedSharedTeams = ['목장', '엑티비티', '미디어아트센터'];
      allTeams = allTeams.filter(t => allowedSharedTeams.includes(t));
    }

    return allTeams.map(team => {
      const teamGroup = teamGroups[team] || {};
      const categories = Object.keys(teamGroup).map(cat => {
        const items = teamGroup[cat];
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        return { name: cat, items, total };
      }).sort((a, b) => b.total - a.total);

      const teamTotal = categories.reduce((sum, cat) => sum + cat.total, 0);
      const teamRevenue = teamRevs[team] || 0;

      return { team, categories, teamTotal, teamRevenue };
    }).sort((a, b) => b.teamTotal - a.teamTotal);

    return { teamExpenseData: sortedTeams, grandTotalExpense, grandTotalRevenue };
  }, [expenses, revenues, isShared]);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isShared ? '팀별 비용 공유 리포트' : '팀별 비용 전체 리포트 (사내용)'}</h1>
          <p className="text-gray-500 mt-2">
            {isShared 
              ? '팀장님들과 비용 내역을 투명하게 공유할 수 있는 열람용 페이지입니다. (정직원 인건비 상세내역 자동 블라인드)'
              : '사내 관리자 전용 비용 전체 리포트입니다. 모든 팀의 내역을 볼 수 있습니다. (정직원 인건비 상세내역 자동 블라인드)'}
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

      {!isShared && teamExpenseData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-blue-900">전체 합계 (검증용)</h2>
            <p className="text-sm text-blue-700 mt-1">업로드된 엑셀 데이터의 총합입니다. (제외 처리된 항목 제외)</p>
          </div>
          <div className="flex space-x-8 text-right">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">총 매출</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(grandTotalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">총 지출</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(grandTotalExpense)}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : teamExpenseData.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500">
          선택한 기간에 해당하는 지출 데이터가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {teamExpenseData.map((teamData) => (
            <TeamAccordionItem 
              key={teamData.team} 
              teamData={teamData} 
              formatCurrency={formatCurrency} 
              formatDate={formatDate} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamAccordionItem({ teamData, formatCurrency, formatDate }: { teamData: any, formatCurrency: any, formatDate: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          {isOpen ? <ChevronDown className="w-6 h-6 text-gray-500" /> : <ChevronRight className="w-6 h-6 text-gray-500" />}
          <h2 className="text-xl font-bold text-gray-800">{teamData.team}</h2>
        </div>
        <div className="flex items-center space-x-6 text-right">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-500">이번달 매출</span>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(teamData.teamRevenue)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-500">총 지출</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(teamData.teamTotal)}</span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="divide-y divide-gray-100">
          {teamData.categories.map((cat: any) => (
            <AccordionItem 
              key={cat.name} 
              category={cat} 
              formatCurrency={formatCurrency} 
              formatDate={formatDate} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
            <div className="bg-white rounded-lg border border-red-100 p-6 text-center">
              <Lock className="w-8 h-8 text-red-200 mx-auto mb-3" />
              <p className="text-gray-800 font-medium mb-1">정직원 등 개인 급여 세부 내역은 보안상 비공개 처리되었습니다.</p>
              <p className="text-gray-500 text-sm">해당 월의 인건비 총합은 {formatCurrency(category.total)} 입니다.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
