'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight, Lock, Activity } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function TeamReport({ isShared = false, hideDatePicker = false }: { isShared?: boolean, hideDatePicker?: boolean }) {
  const { currentMonth } = useDateFilter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [goals, setGoals] = useState<any>(null);
  const [apiTeams, setApiTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = `?team=all&month=${currentMonth}`;
        const [expRes, revRes, goalRes, teamRes] = await Promise.all([
          fetch(`/api/analysis${queryParams}&type=expense`),
          fetch(`/api/revenue/leisure-range${queryParams}`),
          fetch('/api/goals'),
          fetch('/api/settings/leisure-selection')
        ]);
        
        const expData = await expRes.json();
        const revData = await revRes.json();
        const goalData = await goalRes.json();
        const teamDataRes = await teamRes.json();
        
        if (!ignore) {
          setExpenses(Array.isArray(expData) ? expData : []);
          setRevenues(Array.isArray(revData) ? revData : []);
          if (goalData.success) setGoals(goalData);
          if (teamDataRes.success && teamDataRes.selectedTeams) {
            let teams = teamDataRes.selectedTeams;
            if (isShared) {
              teams = teams.filter((t: string) => !['디지털지원', '디지털지원팀', '본부팀'].includes(t));
            }
            setApiTeams(teams);
          }
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR');

  const utilizationData = useMemo(() => {
    if (!goals) return [];
    
    const selectedMonths: number[] = [];
    if (currentMonth) {
      const start = new Date(currentMonth + "-01");
      if (start.getFullYear() === 2026) {
        selectedMonths.push(start.getMonth());
      }
    }

    const dynamicTeams = Array.from(new Set([
      ...Object.keys(goals?.utilization?.target || {}),
      ...Object.keys(goals?.utilization?.actual || {})
    ]));
    
    return dynamicTeams.map(team => {
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
  }, [currentMonth, goals]);

  const { teamExpenseData, grandTotalExpense, grandTotalRevenue, leisureTotalExpense, leisureTotalRevenue } = useMemo(() => {
    const teamGroups: Record<string, Record<string, any[]>> = {};
    const teamRevGroups: Record<string, Record<string, { items: any[], total: number }>> = {};
    const teamRevs: Record<string, number> = {};
    let grandTotalExpense = 0;
    let grandTotalRevenue = 0;
    
    revenues.forEach(rev => {
      if (rev.isGrandTotal) {
        grandTotalRevenue = rev.amount || 0;
        return;
      }

      let t = rev.team || '미분류(기타)';
      if (t === '기타') t = '미분류(기타)';
      if (t === '제외') return;
      if (isShared && t === '미분류(기타)') return;

      if (rev.isSubtotal) {
        if (rev.subtotalType === 'part') {
          // 백엔드가 제공하는 파트 소계를 팀 매출 총계에 합산 (V5는 여러 chunk로 쪼개질 수 있음)
          teamRevs[t] = (teamRevs[t] || 0) + (rev.amount || 0);
          
          // [NO SLICE SUMMATION] 카테고리별(티켓, 식음 등) 소계도 파트 소계들을 더해서 표시
          if (!teamRevGroups[t]) teamRevGroups[t] = {};
          const cat = rev.categoryName || rev.categoryCode || '미분류';
          if (!teamRevGroups[t][cat]) teamRevGroups[t][cat] = { items: [], total: 0 };
          teamRevGroups[t][cat].total += (rev.amount || 0);
        } else if (rev.subtotalType === 'team') {
          // 팀(본부) 소계 데이터는 이미 파트 소계가 합산되므로 teamRevs에는 더하지 않음 
          // (단, '소계'라는 partName 때문에 팀 이름이 '레저본부' 등으로 넘어오는 경우를 대비)
          // 여기서는 아무것도 하지 않아도 part 소계의 합산으로 충분함
        }
      } else {
        // 영업장(Shop) 레벨 일반 데이터는 하위 리스트 표출용으로만 담음 (절대 합산하지 않음)
        if (!teamRevGroups[t]) teamRevGroups[t] = {};
        const cat = rev.categoryName || rev.categoryCode || '미분류';
        if (!teamRevGroups[t][cat]) teamRevGroups[t][cat] = { items: [], total: 0 };
        teamRevGroups[t][cat].items.push(rev);
      }
    });
    
    expenses.forEach(exp => {
      grandTotalExpense += exp.amount || 0;
      let t = exp.team || '미분류(기타)';
      if (t === '기타') t = '미분류(기타)';
      if (t === '제외') return; 
      if (isShared && t === '미분류(기타)') return;

      if (!teamGroups[t]) teamGroups[t] = {};
      
      let cat = exp.mapped_term || '미분류';
      // 인건비는 종합이지만 인건비(급여,복리후생비,고용보험료) 이렇게 표기
      if (cat.includes('인건비')) {
        cat = '인건비(급여,복리후생비,고용보험료)';
      }
      
      if (!teamGroups[t][cat]) teamGroups[t][cat] = [];
      
      teamGroups[t][cat].push(exp);
    });

    // We should also include teams that only have revenue but no expense
    let allTeams = Array.from(new Set([...Object.keys(teamGroups), ...Object.keys(teamRevGroups)]));
    
    // 글로벌 레저본부 기준 적용 (선택된 팀만 표시)
    if (apiTeams.length > 0) {
      allTeams = allTeams.filter(t => apiTeams.includes(t));
    }

    if (isShared) {
      const EXCLUDED_SHARED = ['기타', '제외', '미분류(기타)', '감가상각비'];
      allTeams = allTeams.filter(t => !EXCLUDED_SHARED.includes(t));
    }

    let globalIdCounter = 0;
    const sortedTeams = allTeams.map(team => {
      const teamGroup = teamGroups[team] || {};
      const teamRevGroup = teamRevGroups[team] || {};
      
      const categories = Object.keys(teamGroup).map(cat => {
        const items = teamGroup[cat].map(item => {
          if (!item._unique_id) {
            item._unique_id = `exp-${globalIdCounter++}`;
          }
          return item;
        });
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        return { name: cat, items, total };
      });

      const revenueCategories = Object.keys(teamRevGroup).map(cat => {
        const group = teamRevGroup[cat];
        const items = group.items.map(item => {
          if (!item._unique_id) {
            item._unique_id = `rev-${globalIdCounter++}`;
          }
          return item;
        });
        
        // NO SLICE SUMMATION 원칙: reduce 합산 절대 금지. 백엔드 category 소계를 그대로 표출.
        return { name: cat, items, total: group.total };
      });

      const teamTotal = categories.reduce((sum, cat) => sum + cat.total, 0);
      
      // NO SLICE SUMMATION 원칙: 프론트엔드가 합산하지 않고 백엔드의 소계 데이터를 직접 참조
      const teamRevenue = teamRevs[team] || 0;

      return { team, categories, revenueCategories, teamTotal, teamRevenue };
    });


    // Only display teams that are configured as "Leisure Teams" (apiTeams)
    const filteredSortedTeams = sortedTeams.filter(t => apiTeams.length > 0 ? apiTeams.includes(t.team) : true);

    const leisureTotalExpense = filteredSortedTeams.reduce((sum, t) => sum + t.teamTotal, 0);
      
    // NO SLICE SUMMATION 원칙: 백엔드 총합(Grand Total)에서 제외된 파트의 소계를 차감
    let excludedRevenue = 0;
    revenues.forEach(rev => {
      if (rev.isSubtotal && rev.subtotalType === 'part') {
        let t = rev.team || '미분류(기타)';
        if (t === '기타') t = '미분류(기타)';
        
        // 카드(UI)에 실제로 렌더링되지 않는 파트라면 총매출 합산에서도 무조건 제외(Minus)
        const isExcluded = !filteredSortedTeams.some(ft => ft.team === t);

        if (isExcluded) {
          excludedRevenue += rev.amount || 0;
        }
      }
    });

    const leisureTotalRevenue = grandTotalRevenue - excludedRevenue;

    return { teamExpenseData: filteredSortedTeams, grandTotalExpense, grandTotalRevenue, leisureTotalExpense, leisureTotalRevenue };
  }, [expenses, revenues, isShared, apiTeams]);

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

  const globalSelectedSums = useMemo(() => {
    let revSum = 0;
    let expSum = 0;
    expenses.forEach(exp => {
      if (exp._unique_id && selectedIds.has(exp._unique_id)) {
        expSum += (exp.amount || 0);
      }
    });
    revenues.forEach(rev => {
      if (rev._unique_id && selectedIds.has(rev._unique_id)) {
        revSum += (rev.amount || 0);
      }
    });
    return { revSum, expSum };
  }, [selectedIds, expenses, revenues]);

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
      </div>

      {!isShared && teamExpenseData.length > 0 && (
        <div className="bg-mint-50 border border-mint-200 rounded-2xl p-6 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-sm gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-mint-900">전체 합계 (검증용)</h2>
            <p className="text-sm text-mint-700 mt-1">업로드된 전체 데이터의 총합과, 주요 사업팀의 총합을 비교합니다.</p>
            
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
              <p className="text-sm font-bold text-indigo-600 mb-1">선택된 영업장 전체 매출</p>
              <p className="text-2xl font-black text-indigo-900">{formatCurrency(leisureTotalRevenue)}</p>
              {apiTeams.length > 0 && (
                <p className="text-[10px] text-indigo-400 mt-2 max-w-[150px] leading-tight break-keep" title={apiTeams.join(', ')}>
                  포함: {apiTeams.join(', ')}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600 mb-1">선택된 영업장 총 지출</p>
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
              <div className="flex space-x-6">
                <span className="text-xl font-bold text-mint-200">선택 매출: {formatCurrency(globalSelectedSums.revSum)}</span>
                <span className="text-xl font-bold text-rose-200">선택 지출: {formatCurrency(globalSelectedSums.expSum)}</span>
              </div>
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
  const [viewMode, setViewMode] = useState<'expense' | 'revenue'>('expense');

  const teamItemIds = useMemo(() => {
    const ids: string[] = [];
    const activeCategories = viewMode === 'expense' ? teamData.categories : teamData.revenueCategories;
    activeCategories.forEach((cat: any) => {
      cat.items.forEach((item: any) => {
        ids.push(item._unique_id);
      });
    });
    return ids;
  }, [teamData, viewMode]);

  const selectedCount = teamItemIds.filter((id: string) => selectedIds.has(id)).length;
  const allSelected = selectedCount === teamItemIds.length && teamItemIds.length > 0;

  const toggleTeamSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGlobalSelection(teamItemIds, !allSelected);
  };

  const handleToggleViewMode = (e: React.MouseEvent, mode: 'expense' | 'revenue') => {
    e.stopPropagation();
    setViewMode(mode);
    if (!isOpen) setIsOpen(true);
  };

  const activeCategories = viewMode === 'expense' ? teamData.categories : teamData.revenueCategories;

  // Flatten revenue items to show directly under the team
  const revenueItems = useMemo(() => {
    return teamData.revenueCategories.reduce((acc: any[], cat: any) => [...acc, ...cat.items], []);
  }, [teamData.revenueCategories]);

  const toggleAllRevenueItems = () => {
    const ids = revenueItems.map((item: any) => item._unique_id);
    const count = ids.filter((id: string) => selectedIds.has(id)).length;
    toggleGlobalSelection(ids, count !== ids.length);
  };

  const toggleRevenueItem = (id: string) => {
    toggleGlobalSelection([id], !selectedIds.has(id));
  };

  const revenueAllSelected = revenueItems.length > 0 && revenueItems.every((item: any) => selectedIds.has(item._unique_id));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none"
      >
        <div className="flex items-center space-x-3 w-full sm:w-1/4 mb-4 sm:mb-0">
          <input 
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {}}
            onClick={toggleTeamSelection}
            className="w-6 h-6 rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer shrink-0"
          />
          {isOpen ? <ChevronDown className="w-6 h-6 text-gray-500 shrink-0" /> : <ChevronRight className="w-6 h-6 text-gray-500 shrink-0" />}
          <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{teamData.team}</h2>
        </div>
        
        <div className="w-full sm:w-1/3 flex justify-start sm:px-4 mb-4 sm:mb-0">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={(e) => handleToggleViewMode(e, 'revenue')}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'revenue' 
                  ? 'bg-white text-mint-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              매출 상세
            </button>
            <button
              onClick={(e) => handleToggleViewMode(e, 'expense')}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'expense' 
                  ? 'bg-white text-rose-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              지출 상세
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1 w-full sm:w-auto shrink-0">
          <div className="flex items-center justify-end w-full">
            <span className="text-sm font-semibold text-gray-500 mr-4">이번달 매출</span>
            <span className="text-lg font-bold text-mint-600 w-36 text-right">{formatCurrency(teamData.teamRevenue)}</span>
          </div>
          <div className="flex items-center justify-end w-full">
            <span className="text-sm font-semibold text-gray-500 mr-4">총 지출</span>
            <span className="text-lg font-bold text-gray-900 w-36 text-right">{formatCurrency(teamData.teamTotal)}</span>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-gray-100">
          {viewMode === 'revenue' ? (
            revenueItems.length > 0 ? (
              <div className="bg-white overflow-hidden p-0 m-0 border-t border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input 
                            type="checkbox" 
                            checked={revenueAllSelected}
                            onChange={(e) => {}}
                            onClick={(e) => { e.stopPropagation(); toggleAllRevenueItems(); }}
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
                      {revenueItems.map((item: any, i: number) => {
                        const isSelected = selectedIds.has(item._unique_id);
                        return (
                          <tr key={item._unique_id || i} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRevenueItem(item._unique_id)}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap" onClick={() => toggleRevenueItem(item._unique_id)}>{formatDate(item.date)}</td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap" onClick={() => toggleRevenueItem(item._unique_id)}>{item.branchName || item.branch_name || '-'}</td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap" onClick={() => toggleRevenueItem(item._unique_id)}>{item.vendor || '-'}</td>
                            <td className="px-4 py-3 text-gray-600" onClick={() => toggleRevenueItem(item._unique_id)}>{item.description || item.mappedTerm || '-'}</td>
                            <td className="px-4 py-3 text-gray-900 font-medium text-right whitespace-nowrap" onClick={() => toggleRevenueItem(item._unique_id)}>{formatCurrency(item.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500 flex flex-col items-center">
                <span className="text-gray-400 mb-2">📄</span>
                <p>해당 부서(또는 미분류 항목)에 등록된 매출 내역이 없습니다.</p>
              </div>
            )
          ) : (
            activeCategories.length > 0 ? (
              activeCategories.map((cat: any) => (
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
            )
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
    return category.items;
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
