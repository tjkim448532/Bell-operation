'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight, Lock, Activity } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';

export default function TeamReport({ isShared = false, hideDatePicker = false }: { isShared?: boolean, hideDatePicker?: boolean }) {
  const { startMonth, endMonth } = useDateFilter();
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
        const queryParams = `?team=all&startMonth=${startMonth}&endMonth=${endMonth}`;
        const [expRes, revRes, goalRes, teamRes] = await Promise.all([
          fetch(`/api/analysis${queryParams}&type=expense`),
          fetch(`/api/revenue/leisure-range${queryParams}`),
          fetch(`/api/goals?startMonth=${startMonth}&endMonth=${endMonth}`),
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
            let teams = Array.isArray(teamDataRes.selectedTeams) ? teamDataRes.selectedTeams : [];
            
            // 1. 중복 부서명 통합 ('디지털지원'과 '디지털지원팀'이 둘 다 있으면 '디지털지원' 제거)
            if (teams.includes('디지털지원') && teams.includes('디지털지원팀')) {
                teams = teams.filter((t: string) => t !== '디지털지원');
            }

            // 2. 고유값(Unique)만 남기기
            teams = Array.from(new Set(teams));

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
  }, [startMonth, endMonth, isShared]);

  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Number(val.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (val: any) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(parseAmount(val));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR');

  const utilizationData = useMemo(() => {
    if (!goals) return [];
    
    const selectedMonths: number[] = [];
    if (startMonth && endMonth && startMonth.length === 7 && endMonth.length === 7) {
      let [sy, sm] = startMonth.split('-').map(Number);
      let [ey, em] = endMonth.split('-').map(Number);
      let current = new Date(sy, sm - 1, 1);
      const end = new Date(ey, em - 1, 1);
      while (current <= end) {
        if (current.getFullYear() === 2026) {
          selectedMonths.push(current.getMonth());
        }
        current.setMonth(current.getMonth() + 1);
      }
    }

    const dynamicTeams = Array.from(new Set([
      ...Object.keys(goals?.utilization?.target || {}),
      ...Object.keys(goals?.utilization?.actual || {})
    ])).filter(team => {
      if (isShared && ['디지털지원', '디지털지원팀', '본부팀'].includes(team)) return false;
      return true;
    });
    
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
  }, [startMonth, endMonth, goals, isShared]);

  const { teamExpenseData, grandTotalExpense, grandTotalRevenue, leisureTotalExpense, leisureTotalRevenue } = useMemo(() => {
    const teamGroups: Record<string, Record<string, any[]>> = {};
    const teamRevGroups: Record<string, Record<string, { items: any[], total: number }>> = {};
    const teamRevs: Record<string, number> = {};
    let grandTotalExpense = 0;
    let grandTotalRevenue = 0;
    
    revenues.forEach(rev => {
      const amount = parseAmount(rev.amount);
      if (rev.isGrandTotal) {
        grandTotalRevenue = amount;
        return;
      }

      let t = rev.team || '미분류(기타)';
      if (t === '기타') t = '미분류(기타)';
      if (t === '제외') return;
      if (isShared && (t === '미분류(기타)' || ['디지털지원', '디지털지원팀', '본부팀'].includes(t))) return;

      if (rev.isSubtotal) {
        if (rev.subtotalType === 'team') {
          teamRevs[t] = amount;
        } else if (rev.subtotalType === 'part') {
          // 백엔드가 제공하는 파트 소계를 팀 매출 총계에 병합 방어 (팀 소계가 없을시 대비)
          teamRevs[t] = (teamRevs[t] || 0) + amount;
          
          if (!teamRevGroups[t]) teamRevGroups[t] = {};
          const cat = rev.categoryName || rev.categoryCode || '미분류';
          if (!teamRevGroups[t][cat]) teamRevGroups[t][cat] = { items: [], total: 0 };
          teamRevGroups[t][cat].total += amount;
        } else if (rev.subtotalType === 'category') {
          // 독립 카테고리 (단독 소계): 모토아레나, 미사용 티켓, 주차관제, 기획전, 벨포레굿즈
          const code = rev.categoryCode;
          const independentMap: Record<string, string> = {
            'MOTO': '모토아레나',
            'UNEARNED': '미사용 티켓',
            'PARKING': '주차관제',
            'PROMOTION': '기획전',
            'GOODS': '벨포레굿즈'
          };
          if (code && independentMap[code]) {
            const catTeam = independentMap[code];
            teamRevs[catTeam] = (teamRevs[catTeam] || 0) + amount;
            if (!teamRevGroups[catTeam]) teamRevGroups[catTeam] = {};
            const cat = rev.categoryName || code;
            if (!teamRevGroups[catTeam][cat]) teamRevGroups[catTeam][cat] = { items: [], total: 0 };
            teamRevGroups[catTeam][cat].total += amount;
          }
        }
      } else {
        // 영업장(Shop) 레벨 일반 데이터는 하위 리스트 표출용으로만 담음 (절대 합산하지 않음)
        if (!teamRevGroups[t]) teamRevGroups[t] = {};
        const cat = rev.categoryName || rev.categoryCode || '미분류';
        if (!teamRevGroups[t][cat]) teamRevGroups[t][cat] = { items: [], total: 0 };
        rev.amount = amount;
        teamRevGroups[t][cat].items.push(rev);
      }
    });
    
    expenses.forEach(exp => {
      const amount = parseAmount(exp.amount);
      exp.amount = amount;
      grandTotalExpense += amount;
      let t = exp.team || '미분류(기타)';
      if (t === '기타') t = '미분류(기타)';
      if (t === '제외') return; 
      if (isShared && (t === '미분류(기타)' || ['디지털지원', '디지털지원팀', '본부팀'].includes(t))) return;

      if (!teamGroups[t]) teamGroups[t] = {};
      
      // Use macro_category if available, otherwise fallback to raw mapped_term
      let cat = exp.macro_category ? String(exp.macro_category) : String(exp.mapped_term || '미분류');
      
      if (!teamGroups[t][cat]) teamGroups[t][cat] = [];
      
      teamGroups[t][cat].push(exp);
    });

    // We should also include teams that only have revenue but no expense
    let allTeams = Array.from(new Set([...Object.keys(teamGroups), ...Object.keys(teamRevGroups)]));
    
    // Strict V4.2 Allowlist filtering (Boundary Rule)
    allTeams = allTeams.filter(t => {
      if (t === '레저본부') return false; // 본부 전체 총계이므로 개별 팀 카드 목록에서 제외
      if (t === '미분류' || t === '미분류(기타)' || t === '기타' || t === '제외' || t === '감가상각비') return true;
      return apiTeams.includes(t);
    });

    if (isShared) {
      const EXCLUDED_SHARED = ['기타', '제외', '미분류(기타)', '감가상각비', '레저본부', '디지털지원', '디지털지원팀', '본부팀'];
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
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0); // (Expense is row-level Firebase data without backend subtotals)
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

      let teamTotal = 0;
      categories.forEach(cat => teamTotal += cat.total);
      
      // NO SLICE SUMMATION 원칙: 프론트엔드가 합산하지 않고 백엔드의 소계 데이터를 직접 참조
      const teamRevenue = teamRevs[team] || 0;

      return { team, categories, revenueCategories, teamTotal, teamRevenue };
    });

    // 데이터가 없는 0원 빈 항목 및 미분류 제외
    const filteredSortedTeams = sortedTeams.filter(t => {
      if (t.team === '레저본부') return false;
      if (isShared && ['디지털지원', '디지털지원팀', '본부팀'].includes(t.team)) return false;
      if (!apiTeams.includes(t.team) && t.team !== '미분류' && t.team !== '미분류(기타)' && t.team !== '기타' && t.team !== '제외') return false;
      // 매출과 지출이 모두 0원인 빈 항목은 화면에서 제외
      if ((t.teamTotal || 0) === 0 && (t.teamRevenue || 0) === 0) return false;
      if (t.team === '미분류' || t.team === '미분류(기타)') return false;
      return true;
    });

    // NO SLICE SUMMATION: 배열을 모두 더하는 방식에서 제외하는 방식으로 변경 (마이너스 연산 원칙)
    let leisureTotalExpense = grandTotalExpense;
    let leisureTotalRevenue = grandTotalRevenue;
    
    // teamRevs에 존재하는 모든 부서 중에서, 화면에 필터링(노출)되지 않는 팀을 총합에서 차감
    Object.keys(teamRevs).forEach(team => {
      if (!filteredSortedTeams.some(ft => ft.team === team)) {
        leisureTotalRevenue -= (teamRevs[team] || 0);
      }
    });

    // expenses 배열 원본을 순회하며, 화면에 노출 안 되는 부서의 지출을 차감 (마이너스 연산 원칙)
    expenses.forEach(exp => {
      const team = exp.team || '미분류(기타)';
      if (!filteredSortedTeams.some(ft => ft.team === team)) {
        leisureTotalExpense -= (exp.amount || 0);
      }
    });

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
        expSum += (parseAmount(exp.amount) || 0);
      }
    });
    revenues.forEach(rev => {
      if (rev._unique_id && selectedIds.has(rev._unique_id)) {
        revSum += (parseAmount(rev.amount) || 0);
      }
    });
    return { revSum, expSum };
  }, [selectedIds, expenses, revenues]);

  const dateRangeText = startMonth && endMonth 
    ? `(${startMonth.split('-')[0]}년 ${Number(startMonth.split('-')[1])}월 ~ ${Number(endMonth.split('-')[1])}월 누적 기준)`
    : '';

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {isShared ? '팀별 비용 공유 리포트' : '팀별 비용 전체 리포트 (본부장 only)'}
            </h1>
            <span className="px-3 py-1 bg-mint-100 text-mint-800 text-sm font-semibold rounded-full shadow-sm">
              {dateRangeText}
            </span>
          </div>
          <p className="text-gray-500 mt-2">
            {isShared 
              ? '팀장님들과 비용 내역을 투명하게 공유할 수 있는 열람용 페이지입니다. (정직원 인건비 상세내역 자동 블라인드)'
              : '본부장 전용 비용 전체 리포트입니다. 모든 팀의 내역을 볼 수 있습니다.'}
          </p>
        </div>
        {!hideDatePicker && <GlobalDateSelector />}
      </div>

      {!isShared && teamExpenseData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">레저본부 총 실적 요약</h2>
            {teamExpenseData.length > 0 && (
              <p className="text-xs text-gray-500 mt-1 max-w-[500px] leading-relaxed" title={teamExpenseData.map(t => t.team).join(', ')}>
                포함 부서: {teamExpenseData.map(t => t.team).join(', ')}
              </p>
            )}
          </div>
          
          <div className="flex space-x-8 text-right shrink-0">
            <div>
              <p className="text-sm font-bold text-indigo-600 mb-1">레저본부 총 매출</p>
              <p className="text-2xl font-black text-indigo-900">{formatCurrency(leisureTotalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600 mb-1">레저본부 총 지출</p>
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
  const { startMonth, endMonth } = useDateFilter();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'expense' | 'revenue'>('expense');

  const teamItemIds = useMemo(() => {
    const ids: string[] = [];
    
    // Include expense items
    teamData.categories?.forEach((cat: any) => {
      cat.items?.forEach((item: any) => {
        if (item._unique_id) ids.push(item._unique_id);
      });
    });
    
    // Include revenue items
    teamData.revenueCategories?.forEach((cat: any) => {
      cat.items?.forEach((item: any) => {
        if (item._unique_id) ids.push(item._unique_id);
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
            <span className="text-sm font-semibold text-gray-500 mr-4">{startMonth !== endMonth ? '선택기간 매출' : '이번달 매출'}</span>
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
  const isLabor = isShared && category.name.includes('인건비');

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
