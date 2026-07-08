'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight, Lock, Activity } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function TeamReport({ isShared = false }: { isShared?: boolean }) {
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [goals, setGoals] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = `?team=all&startDate=${startDate}&endDate=${endDate}`;
        const [expRes, revRes, goalRes] = await Promise.all([
          fetch(`/api/analysis${queryParams}&type=expense`),
          fetch(`/api/analysis${queryParams}&type=revenue`),
          fetch('/api/goals')
        ]);
        
        const expData = await expRes.json();
        const revData = await revRes.json();
        const goalData = await goalRes.json();
        
        if (!ignore) {
          setExpenses(Array.isArray(expData) ? expData : []);
          setRevenues(Array.isArray(revData) ? revData : []);
          if (goalData.success) setGoals(goalData);
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR');

  const utilizationData = useMemo(() => {
    if (!goals) return [];
    
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

    const ALL_TEAMS = ['미디어아트센터', '목장', '사계절썰매', '마운틴카트', '원더풀', '썸머랜드', '마리나'];
    return ALL_TEAMS.map(team => {
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
  }, [startDate, endDate, goals]);

  const { teamExpenseData, grandTotalExpense, grandTotalRevenue, leisureTotalExpense, leisureTotalRevenue } = useMemo(() => {
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

    let globalIdCounter = 0;
    const sortedTeams = allTeams.map(team => {
      const teamGroup = teamGroups[team] || {};
      const categories = Object.keys(teamGroup).map(cat => {
        const items = teamGroup[cat].map(item => {
          if (!item._unique_id) {
            item._unique_id = `exp-${globalIdCounter++}`;
          }
          return item;
        });
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        return { name: cat, items, total };
      }).sort((a, b) => b.total - a.total);

      const teamTotal = categories.reduce((sum, cat) => sum + cat.total, 0);
      const teamRevenue = teamRevs[team] || 0;

      return { team, categories, teamTotal, teamRevenue };
    }).sort((a, b) => {
      // 1. Fixed order for the 6 core teams
      const TEAM_ORDER = ['엑티비티', '디지털지원', '목장', '미디어아트센터', '놀이동산', '본부팀'];
      
      const idxA = TEAM_ORDER.indexOf(a.team);
      const idxB = TEAM_ORDER.indexOf(b.team);
      
      if (idxA !== -1 && idxB !== -1) {
        return idxA - idxB; // Sort by the exact fixed order
      }
      
      if (idxA !== -1 && idxB === -1) return -1;
      if (idxA === -1 && idxB !== -1) return 1;
      
      // 2. For non-core teams
      if (idxA === -1 && idxB === -1) {
        if (a.team === '감가상각비') return 1;
        if (b.team === '감가상각비') return -1;
        if (a.team === '미분류(기타)' || a.team === '제외') return 1;
        if (b.team === '미분류(기타)' || b.team === '제외') return -1;
        return b.teamTotal - a.teamTotal;
      }
      
      return b.teamTotal - a.teamTotal;
    });

    const mainTeams = ['미디어아트센터', '목장', '엑티비티', '디지털지원', '본부팀'];
    const leisureTotalExpense = sortedTeams
      .filter(t => mainTeams.includes(t.team))
      .reduce((sum, t) => sum + t.teamTotal, 0);
      
    const leisureTotalRevenue = sortedTeams
      .filter(t => mainTeams.includes(t.team))
      .reduce((sum, t) => sum + t.teamRevenue, 0);

    return { teamExpenseData: sortedTeams, grandTotalExpense, grandTotalRevenue, leisureTotalExpense, leisureTotalRevenue };
  }, [expenses, revenues, isShared]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleGlobalSelection = (ids: string[], isSelected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => {
        if (isSelected) newSet.add(id);
        else newSet.delete(id);
      });
      return newSet;
    });
  };

  const clearGlobalSelection = () => setSelectedIds(new Set());

  const globalSelectedSum = useMemo(() => {
    let sum = 0;
    expenses.forEach(exp => {
      if (exp._unique_id && selectedIds.has(exp._unique_id)) {
        sum += (exp.amount || 0);
      }
    });
    return sum;
  }, [selectedIds, expenses]);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isShared ? '팀별 비용 공유 리포트' : '팀별 비용 전체 리포트 (본부장 only)'}</h1>
          <p className="text-gray-500 mt-2">
            {isShared 
              ? '팀장님들과 비용 내역을 투명하게 공유할 수 있는 열람용 페이지입니다. (정직원 인건비 상세내역 자동 블라인드)'
              : '본부장 전용 비용 전체 리포트입니다. 모든 팀의 내역을 볼 수 있습니다.'}
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
        <div className="bg-mint-50 border border-mint-200 rounded-2xl p-6 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-sm gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-mint-900">전체 합계 (검증용)</h2>
            <p className="text-sm text-mint-700 mt-1">업로드된 전체 데이터의 총합과, 5대 핵심 팀의 총합을 비교합니다.</p>
            
            <div className="flex space-x-8 mt-4 pt-4 border-t border-mint-100">
              <div>
                <p className="text-xs font-semibold text-mint-600 mb-1">전체 업로드 총 매출 (기타 포함)</p>
                <p className="text-lg font-bold text-mint-800">{formatCurrency(grandTotalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-mint-600 mb-1">전체 업로드 총 지출 (기타 포함)</p>
                <p className="text-lg font-bold text-mint-800">{formatCurrency(grandTotalExpense)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-mint-100 shadow-sm flex space-x-8 text-right shrink-0">
            <div>
              <p className="text-sm font-bold text-indigo-600 mb-1">레져 본부 전체 매출 (5대팀)</p>
              <p className="text-2xl font-black text-indigo-900">{formatCurrency(leisureTotalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600 mb-1">레져 본부 총 지출 (5대팀)</p>
              <p className="text-2xl font-black text-rose-600">{formatCurrency(leisureTotalExpense)}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-3 text-purple-500" /> 각각 팀의 이용률 현황
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {utilizationData.map((item) => (
                <div key={item.team} className="group bg-gray-50/50 p-4 rounded-xl border border-gray-50 flex flex-col justify-between h-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-3 gap-2 sm:gap-0">
                    <span className="font-semibold text-gray-700 break-keep">{item.team}</span>
                    <div className="text-sm whitespace-nowrap">
                      <span className="font-bold text-gray-900">{item.avgActual.toFixed(1)}%</span>
                      <span className="text-gray-400 ml-1">/ {item.avgGoal.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden relative mt-auto">
                    <div 
                      className={`absolute top-0 left-0 h-full bg-gray-400 transition-all`}
                      style={{ width: `${item.avgGoal}%`, opacity: 0.3 }}
                    />
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all ${item.avgActual >= item.avgGoal ? 'bg-purple-500' : 'bg-blue-400'}`}
                      style={{ width: `${item.avgActual}%` }}
                    />
                  </div>
                </div>
              ))}
              {utilizationData.length === 0 && (
                <p className="text-gray-500 text-center py-8 col-span-full">이용률 데이터가 없습니다.</p>
              )}
            </div>
          </div>
          
          <div className="w-full space-y-4">
            {teamExpenseData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500">
                선택한 기간에 해당하는 지출 데이터가 없습니다.
              </div>
            ) : (
              teamExpenseData.map((teamData) => (
                <TeamAccordionItem 
                  key={teamData.team} 
                  teamData={teamData} 
                  formatCurrency={formatCurrency} 
                  formatDate={formatDate} 
                  isShared={isShared}
                  selectedIds={selectedIds}
                  toggleGlobalSelection={toggleGlobalSelection}
                />
              ))
            )}
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-indigo-600 text-white px-6 py-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
          <div className="flex items-center space-x-6 max-w-5xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 flex-1">
              <span className="font-semibold text-indigo-100 mb-1 sm:mb-0">총 {selectedIds.size}건 선택됨</span>
              <span className="text-2xl font-bold">선택 합계: {formatCurrency(globalSelectedSum)}</span>
            </div>
            <button 
              onClick={clearGlobalSelection} 
              className="ml-4 text-sm font-semibold bg-indigo-800 hover:bg-indigo-900 px-4 py-2 rounded-lg transition-colors"
            >
              선택 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamAccordionItem({ teamData, formatCurrency, formatDate, isShared, selectedIds, toggleGlobalSelection }: any) {
  const [isOpen, setIsOpen] = useState(false);

  const teamItemIds = useMemo(() => {
    const ids: string[] = [];
    teamData.categories.forEach((cat: any) => {
      cat.items.forEach((item: any) => {
        ids.push(item._unique_id);
      });
    });
    return ids;
  }, [teamData]);

  const selectedCount = teamItemIds.filter((id: string) => selectedIds.has(id)).length;
  const allSelected = selectedCount === teamItemIds.length && teamItemIds.length > 0;

  const toggleTeamSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGlobalSelection(teamItemIds, !allSelected);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          <input 
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {}}
            onClick={toggleTeamSelection}
            className="w-6 h-6 rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer mr-2"
          />
          {isOpen ? <ChevronDown className="w-6 h-6 text-gray-500" /> : <ChevronRight className="w-6 h-6 text-gray-500" />}
          <h2 className="text-xl font-bold text-gray-800">{teamData.team}</h2>
        </div>
        <div className="flex items-center space-x-6 text-right">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-500">이번달 매출</span>
            <span className="text-lg font-bold text-mint-600">{formatCurrency(teamData.teamRevenue)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-500">총 지출</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(teamData.teamTotal)}</span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="divide-y divide-gray-100">
          {teamData.categories.length > 0 ? (
            teamData.categories.map((cat: any) => (
              <AccordionItem 
                key={cat.name} 
                category={cat} 
                formatCurrency={formatCurrency} 
                formatDate={formatDate}
                isShared={isShared} 
                selectedIds={selectedIds}
                toggleGlobalSelection={toggleGlobalSelection}
              />
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500 flex flex-col items-center">
              <span className="text-gray-400 mb-2">📄</span>
              <p>해당 부서(또는 미분류 항목)에 등록된 지출 내역이 없습니다.</p>
              {teamData.teamRevenue > 0 && (
                <p className="text-sm mt-1 text-mint-600">※ 매출 내역만 존재하는 항목입니다.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccordionItem({ category, formatCurrency, formatDate, isShared, selectedIds, toggleGlobalSelection }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const isLabor = isShared && category.name === '인건비-정직원';

  const sortedItems = useMemo(() => {
    return [...category.items].sort((a: any, b: any) => {
      const branchA = a.branch_name || '';
      const branchB = b.branch_name || '';
      if (branchA !== branchB) {
        return branchA.localeCompare(branchB);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [category.items]);

  const categoryIds = useMemo(() => sortedItems.map((item: any) => item._unique_id), [sortedItems]);
  const selectedCount = categoryIds.filter((id: string) => selectedIds.has(id)).length;
  const allSelected = selectedCount === categoryIds.length && categoryIds.length > 0;

  const toggleCategorySelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGlobalSelection(categoryIds, !allSelected);
  };

  const toggleItemSelection = (id: string) => {
    toggleGlobalSelection([id], !selectedIds.has(id));
  };

  return (
    <div>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          <input 
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {}}
            onClick={toggleCategorySelection}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer mr-2"
          />
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
                      <th className="px-4 py-3 text-left w-10">
                        <input 
                          type="checkbox" 
                          checked={allSelected}
                          onChange={(e) => {}}
                          onClick={toggleCategorySelection}
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">날짜</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">영업장(프로젝트)</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">업체명</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 w-1/2 whitespace-nowrap">적요(상세)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 whitespace-nowrap">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedItems.map((item: any, i: number) => {
                      const isSelected = selectedIds.has(item._unique_id);
                      return (
                        <tr key={i} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(item._unique_id)}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap" onClick={() => toggleItemSelection(item._unique_id)}>{formatDate(item.date)}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap" onClick={() => toggleItemSelection(item._unique_id)}>{item.branch_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap" onClick={() => toggleItemSelection(item._unique_id)}>{item.vendor || '-'}</td>
                          <td className="px-4 py-3 text-gray-600" onClick={() => toggleItemSelection(item._unique_id)}>{item.description || '-'}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium text-right whitespace-nowrap" onClick={() => toggleItemSelection(item._unique_id)}>{formatCurrency(item.amount)}</td>
                        </tr>
                      );
                    })}
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
