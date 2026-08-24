'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, GripVertical, Trash2, AlertTriangle, ToggleRight, ToggleLeft } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { cleanNum } from '@/lib/utils';

export default function SettingsPage() {
  const [board, setBoard] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ term: string, fromCol: string } | null>(null);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [customTerm, setCustomTerm] = useState('');
  const [customTargetCol, setCustomTargetCol] = useState('기타');
  const [saveToast, setSaveToast] = useState(false);
  const [hideZeroAmounts, setHideZeroAmounts] = useState(false);
  const { startMonth, endMonth } = useDateFilter();
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [columns, setColumns] = useState<string[]>([]);
  const [newTeamName, setNewTeamName] = useState('');

  const [apiTeams, setApiTeams] = useState<string[]>([]);
  const [selectedLeisureTeams, setSelectedLeisureTeams] = useState<string[]>([]);

  useEffect(() => {
    fetchBoard();
    fetchCustomTeams();
    fetchLeisureSelection();
  }, []);

  // Sync board with columns: if a team was removed or renamed (like "외주" -> "외주 놀이공원"),
  // its mapped items should be moved to "기타" (미분류)
  useEffect(() => {
    if (Object.keys(board).length > 0 && columns.length > 0) {
      let needsUpdate = false;
      const newBoard = { ...board };
      
      Object.keys(newBoard).forEach(key => {
        if (!columns.includes(key)) {
          if (newBoard[key] && newBoard[key].length > 0) {
            newBoard['기타'] = [...(newBoard['기타'] || []), ...newBoard[key]];
            needsUpdate = true;
          }
          delete newBoard[key];
        }
      });
      
      if (needsUpdate) {
        setBoard(newBoard);
      }
    }
  }, [board, columns]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/dashboard?startMonth=${startMonth}&endMonth=${endMonth}`);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startMonth, endMonth]);

  const fetchLeisureSelection = async () => {
    try {
      const res = await fetch('/api/settings/leisure-selection');
      const data = await res.json();
      if (data.success && data.selectedTeams) {
        setSelectedLeisureTeams(data.selectedTeams);
      }
    } catch (err) {
      console.error('Failed to fetch leisure selection', err);
    }
  };

  const handleToggleLeisureTeam = async (teamName: string) => {

    let newSelection = [...selectedLeisureTeams];
    if (newSelection.includes(teamName)) {
      newSelection = newSelection.filter(t => t !== teamName);
    } else {
      newSelection.push(teamName);
    }

    setSelectedLeisureTeams(newSelection);

    try {
      const res = await fetch('/api/settings/leisure-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedTeams: newSelection })
      });
      if (!res.ok) throw new Error('저장 실패');
      showSaveToast();
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to save leisure selection', err);
      // Revert optimistic UI
      fetchLeisureSelection();
    }
  };

  const fetchCustomTeams = async () => {
    try {
      const res = await fetch('/api/settings/leisure-teams', { cache: 'no-store' });
      if (!res.ok) {
        console.error('API responded with status:', res.status);
      }
      const data = await res.json();
      if (data.success && data.teams) {
        // Leisure Division Teams from API
        const fetchedApiTeams: string[] = data.teams;
        setApiTeams(fetchedApiTeams);
        
        let initialCols = [...fetchedApiTeams];
        try {
          const savedOrder = localStorage.getItem('v6MappingColOrder');
          if (savedOrder) {
            const parsedOrder: string[] = JSON.parse(savedOrder);
            const validSaved = parsedOrder.filter((c: string) => fetchedApiTeams.includes(c));
            const newlyAdded = initialCols.filter((c: string) => !validSaved.includes(c));
            initialCols = [...validSaved, ...newlyAdded];
          }
        } catch (e) {
          console.error('Failed to parse v6MappingColOrder', e);
        }

        // Default end columns
        const endCols = ['기타', '제외'];
        
        // Merge them, preserving unique teams
        const allCols = Array.from(new Set([...initialCols, ...endCols]));
        setColumns(allCols);
      } else {
        console.error('API Success False:', data.error);
        alert('데이터 조회 실패: ' + data.error);
      }
    } catch (err) {
      console.error('fetchCustomTeams error:', err);
      alert('데이터를 불러오지 못했습니다: ' + String(err));
    }
  };

  const fetchBoard = async () => {
    try {
      const res = await fetch('/api/settings/board');
      const data = await res.json();
      setBoard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, term: string, fromCol: string) => {
    e.stopPropagation();
    setDraggedItem({ term, fromCol });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'card', term, fromCol })); 
  };

  const handleColDragStart = (e: React.DragEvent, colName: string) => {
    e.stopPropagation();
    setDraggedCol(colName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'column', colName })); 
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const showSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    let isColDrop = false;
    let isCardDrop = false;
    let term = '';
    let fromCol = '';
    let droppedColName = '';

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'column') {
        isColDrop = true;
        droppedColName = data.colName;
      } else {
        isCardDrop = true;
        term = data.term;
        fromCol = data.fromCol;
      }
    } catch (err) {
      if (draggedItem) {
        isCardDrop = true;
        term = draggedItem.term;
        fromCol = draggedItem.fromCol;
      } else if (draggedCol) {
        isColDrop = true;
        droppedColName = draggedCol;
      } else {
        return;
      }
    }

    if (isColDrop) {
      setDraggedCol(null);
      if (!droppedColName || droppedColName === targetCol) return;
      
      setColumns(prev => {
        const newCols = [...prev];
        const fromIdx = newCols.indexOf(droppedColName);
        const toIdx = newCols.indexOf(targetCol);
        if (fromIdx > -1 && toIdx > -1) {
          newCols.splice(fromIdx, 1);
          newCols.splice(toIdx, 0, droppedColName);
          localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));
        }
        return newCols;
      });
      return;
    }

    if (!isCardDrop || !term || !fromCol) return;
    setDraggedItem(null);

    if (fromCol === targetCol) return;

    // Optimistic UI update
    setBoard(prev => {
      const newBoard = { ...prev };
      Object.keys(newBoard).forEach(c => {
        newBoard[c] = (newBoard[c] || []).filter(t => t !== term);
      });
      if (!newBoard[targetCol]) newBoard[targetCol] = [];
      if (!newBoard[targetCol].includes(term)) {
        newBoard[targetCol].push(term);
      }
      return newBoard;
    });

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnName: term, teamName: targetCol })
      });
      if (!res.ok) throw new Error('저장 실패');
      showSaveToast();
      // Refetch dashboard data in background so amounts update smoothly
      fetchDashboardData().catch(console.error);
    } catch (err) {
      console.error('Failed to save mapping', err);
      // Revert on failure
      fetchBoard();
    }
  };

  const handleAddCustom = async () => {
    if (!customTerm.trim()) return;
    
    const term = customTerm.trim();
    setCustomTerm('');

    setBoard(prev => {
      const newBoard = { ...prev };
      if (!newBoard[customTargetCol]) newBoard[customTargetCol] = [];
      if (!newBoard[customTargetCol].includes(term)) {
        newBoard[customTargetCol].push(term);
      }
      return newBoard;
    });

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnName: term, teamName: customTargetCol })
      });
      if (!res.ok) throw new Error('저장 실패');
      showSaveToast();
      fetchDashboardData().catch(console.error);
    } catch (err) {
      console.error('Failed to add custom term', err);
      fetchBoard();
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || columns.includes(newTeamName.trim())) return;
    const team = newTeamName.trim();
    setNewTeamName('');
    
    const newCols = [...columns, team];
    setColumns(newCols);
    localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));
    
    try {
      const res = await fetch('/api/settings/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', teamName: team })
      });
      if (!res.ok) throw new Error('저장 실패');
      showSaveToast();
    } catch (err) {
      console.error(err);
      fetchCustomTeams();
    }
  };

  const handleRemoveTeam = async (team: string) => {
    if (!confirm(`'${team}' 팀을 삭제하시겠습니까?\n안에 있던 항목들은 모두 '기타'로 강제 이동됩니다.`)) return;
    
    const newCols = columns.filter(c => c !== team);
    setColumns(newCols);
    localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));
    
    try {
      const res = await fetch('/api/settings/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', teamName: team })
      });
      if (!res.ok) throw new Error('저장 실패');
      showSaveToast();
      
      // Optimistically update board locally (server already handled DB updates)
      if (board[team] && board[team].length > 0) {
        setBoard(prev => {
          const newBoard = { ...prev };
          newBoard['기타'] = [...(newBoard['기타'] || []), ...newBoard[team]];
          delete newBoard[team];
          return newBoard;
        });
      }
      fetchBoard();
    } catch (err) {
      console.error(err);
      fetchCustomTeams();
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-mint-500" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">비용 부서 배정 (칸반보드)</h1>
          <div className="text-slate-600 mt-3 space-y-1.5 bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs sm:text-sm">
            <p>
              <strong className="text-blue-800">1. 부서 기둥:</strong> 실적 집계에 연동된 <strong>'공식 운영 부서(팀)'</strong>입니다. (대시보드의 '부서별 영업 실적' 등에 동일하게 반영됩니다)
            </p>
            <p>
              <strong className="text-blue-800">2. 영업장 (파란색):</strong> 해당 부서에 소속된 공식 매출 발생 영업장 목록과 당월 매출액입니다. (참조용)
            </p>
            <p>
              <strong className="text-blue-800">3. 지출 항목 (빨간색):</strong> 엑셀에서 업로드된 비용 항목들입니다. (드래그 앤 드롭으로 소속 부서 변경 가능)
            </p>
            <p>
              <strong className="text-rose-600 font-semibold">※ 드래그 앤 드롭을 통해 지출 항목을 배정하면 즉시 전체 경영 대시보드 통계에 실시간 반영됩니다.</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <GlobalDateSelector />
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hideZeroAmounts} 
                onChange={(e) => setHideZeroAmounts(e.target.checked)}
                className="w-4 h-4 text-mint-600 border-gray-300 rounded focus:ring-mint-500"
              />
              <span className="text-sm font-medium text-gray-700">0원 내역 숨기기 (깔끔하게 보기)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4 mb-4">
          <div className="flex-1 max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">직접 입력 (항목이 없는 경우 추가)</label>
            <input 
              type="text" 
              value={customTerm}
              onChange={(e) => setCustomTerm(e.target.value)}
              placeholder="예: 새로운놀이기구"
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-mint-500 outline-none text-sm"
            />
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">배정할 팀</label>
            <select 
              value={customTargetCol}
              onChange={(e) => setCustomTargetCol(e.target.value)}
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-mint-500 outline-none bg-white text-sm"
            >
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <button 
            onClick={handleAddCustom}
            disabled={!customTerm.trim()}
            className="bg-mint-600 hover:bg-mint-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm h-10"
          >
            <Plus className="w-4 h-4 mr-1" /> 항목 강제 추가
          </button>
        </div>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-8 h-[calc(100vh-300px)]">
        {columns.map(colName => {
          const isOtherCol = colName === '기타';
          const hasUnmapped = isOtherCol && (board[colName]?.length || 0) > 0;
          
          let headerClass = 'bg-white';
          if (colName === '제외') headerClass = 'bg-red-50 text-red-800 border-red-200';
          else if (hasUnmapped) headerClass = 'bg-orange-50 text-orange-800 border-orange-200';

          return (
            <div 
              key={colName}
              draggable
              onDragStart={(e) => handleColDragStart(e, colName)}
              onDragEnter={(e) => e.preventDefault()}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colName)}
              className={`rounded-xl min-w-[280px] w-[280px] flex flex-col border relative h-full cursor-grab active:cursor-grabbing ${hasUnmapped ? 'bg-orange-50/30 border-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-gray-50 border-gray-200'}`}
            >
              <div className={`p-4 border-b font-semibold text-gray-800 rounded-t-xl flex flex-col justify-between ${headerClass}`}>
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center space-x-2">
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
                    {hasUnmapped && <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />}
                    <span className="truncate">{hasUnmapped ? '미분류(기타) - 처리 필요!' : colName}</span>
                    {!['기타', '제외'].includes(colName) && (!apiTeams.includes(colName) || columns.includes(colName)) && (
                      <button onClick={() => handleRemoveTeam(colName)} className="text-gray-400 hover:text-red-500 transition-colors focus:outline-none" title="팀 삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className={`text-xs font-normal px-2 py-1 rounded-full flex-shrink-0 ${hasUnmapped ? 'bg-orange-200 text-orange-900 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                    {board[colName]?.length || 0}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between bg-white/50 px-2 py-1.5 rounded-lg border border-gray-100/50">
                  <span className="text-xs text-gray-600 font-medium">대시보드 총합에 포함</span>
                  <button 
                    onClick={() => handleToggleLeisureTeam(colName)}
                    className={`focus:outline-none transition-colors ${selectedLeisureTeams.includes(colName) ? 'text-mint-500' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                    {selectedLeisureTeams.includes(colName) ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-4">
                
                {/* 🔵 영업장 (매출) 구역 */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-blue-800 border-b border-blue-200 pb-1 mb-2">영업장 (매출 발생처)</div>
                  {(() => {
                    const sourceList = dashboardData?.adminMappings || [];
                    const revFacilities = sourceList.filter((r: any) => {
                      const isSubtotal = !!r.isSubtotal;
                      if (isSubtotal) return false;
                      const partName = String(r.partName || '').trim();
                      
                      if (colName === '기타') {
                        return !partName || partName === '미분류';
                      }
                      if (colName === '제외') {
                        return false;
                      }
                      return partName === colName;
                    }).map((r: any) => {
                      const name = r.venueName || r.facilityName || r.shopName;
                      let amount = 0;

                      if (dashboardData?.matrixData) {
                        const targetName = String(name || '').trim();
                        const matches = dashboardData.matrixData.filter((m: any) => {
                          if (m.isSubtotal || m.isGrandTotal) return false;
                          const mShop = String(m.shopName || '').trim();
                          const mFac = String(m.facilityName || '').trim();
                          if (mShop === targetName || mFac === targetName) return true;
                          if (targetName === '놀이동산' && mShop.includes('놀이동산')) return true;
                          if (targetName === '모토아레나' && (mShop === '모토아레나' || m.categoryCode === 'MOTO')) return true;
                          if (targetName === '기획전' && (mShop === '기획전' || m.categoryCode === 'PROMOTION')) return true;
                          return false;
                        });

                        if (matches.length > 0) {
                          amount = matches.reduce((sum: number, m: any) => sum + cleanNum(m.todayActual !== undefined ? m.todayActual : (m.rangeActual !== undefined ? m.rangeActual : m.mtdActual)), 0);
                        }
                      }

                      return { name, amount };
                    });

                    // Deduplicate
                    const uniqueFacilities: any[] = [];
                    const seenNames = new Set();
                    for(const f of revFacilities) {
                      if(!seenNames.has(f.name)) {
                        seenNames.add(f.name);
                        uniqueFacilities.push(f);
                      }
                    }
                    
                    let finalRev = uniqueFacilities;
                    if (hideZeroAmounts && colName !== '기타') {
                      finalRev = finalRev.filter((f: any) => f.amount > 0);
                    }
                    
                    if (finalRev.length > 0) {
                      return finalRev.map((f: any) => (
                        <div key={`rev-${f.name}`} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 shadow-sm text-sm text-blue-900 flex justify-between items-center">
                          <span className="font-medium truncate mr-2" title={f.name}>{f.name}</span>
                          <span className="font-bold whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(Math.round(f.amount))}원</span>
                        </div>
                      ));
                    }
                    return <div className="text-xs text-blue-400 italic text-center py-2">매출 내역 없음</div>;
                  })()}
                </div>

                {/* 🔴 비용 발생처 (드래그 가능 구역) */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-red-800 border-b border-red-200 pb-1 mb-2 mt-4">매핑된 비용 항목 (드래그 가능)</div>
                  {(() => {
                    const items = board[colName] || [];
                    const mappedExpItems = items.map(term => {
                      let expAmount = 0;
                      if (dashboardData?.expenseData) {
                        Object.values(dashboardData.expenseData).forEach((teamData: any) => {
                          teamData.items?.forEach((f: any) => {
                            if (f.name === term) expAmount += f.amount;
                          });
                        });
                      }
                      return { term, expAmount };
                    });

                    const finalExp = mappedExpItems;

                    if (finalExp.length === 0) {
                      return (
                        <div className={`text-sm text-center py-8 italic border-2 border-dashed border-transparent ${hasUnmapped ? 'text-orange-400' : 'text-gray-400'}`}>
                          비어있음
                        </div>
                      );
                    }

                    return finalExp.map(({ term, expAmount }) => (
                      <div
                        key={`exp-${term}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, term, colName)}
                        className="bg-white p-3 rounded-lg border border-red-200 shadow-sm text-sm text-gray-800 cursor-grab active:cursor-grabbing hover:border-red-400 hover:shadow-md transition-all flex justify-between items-center"
                        onDragOver={(e) => { e.stopPropagation(); handleDragOver(e); }}
                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, colName); }}
                      >
                        <div className="flex items-center min-w-0 flex-1 mr-2">
                          <GripVertical className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
                          <span className="truncate font-medium" title={term}>{term}</span>
                        </div>
                        <span className="font-bold text-red-600 whitespace-nowrap flex-shrink-0">{new Intl.NumberFormat('ko-KR').format(expAmount)}원</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          );
        })}

        {/* 새 팀 추가 영역 */}
        <div className="bg-gray-50/50 rounded-xl min-w-[280px] w-[280px] flex flex-col border-2 border-dashed border-gray-300 relative justify-center items-center p-6 flex-shrink-0 mt-4 md:mt-0 h-fit">
          <div className="w-full flex flex-col space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 text-center mb-1">새로운 팀 기둥 만들기</h3>
            <input 
              type="text" 
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
              placeholder="예: 콘도, 골프장"
              className="w-full border-gray-300 border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-mint-500 outline-none text-sm text-center"
            />
            <button 
              onClick={handleAddTeam}
              disabled={!newTeamName.trim() || columns.includes(newTeamName.trim())}
              className="w-full bg-white hover:bg-mint-50 text-mint-600 border border-mint-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center text-sm shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> 추가하기
            </button>
          </div>
        </div>
      </div>

      {saveToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 animate-bounce z-50">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          <span className="font-medium">변경사항이 저장되었습니다!</span>
        </div>
      )}
    </div>
  );
}
