'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, GripVertical, Trash2, AlertTriangle, ToggleRight, ToggleLeft } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function SettingsPage() {
  const [board, setBoard] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ term: string, fromCol: string } | null>(null);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [customTerm, setCustomTerm] = useState('');
  const [customTargetCol, setCustomTargetCol] = useState('목장'); // This default doesn't matter much
  const [saveToast, setSaveToast] = useState(false);
  const { currentMonth, setCurrentMonth } = useDateFilter();
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

  useEffect(() => {
    fetchDashboardData();
  }, [currentMonth]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/dashboard?month=${currentMonth}`);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

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
      await fetch('/api/settings/leisure-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedTeams: newSelection })
      });
      showSaveToast();
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
        const fetchedApiTeams = data.teams;
        setApiTeams(fetchedApiTeams);
        // Expense-only teams to always include
        const expenseTeams = ['본부팀', '디지털지원팀'];
        // Default end columns
        const endCols = ['기타', '제외'];
        
        // Merge them, preserving unique teams
        const allCols = Array.from(new Set([...fetchedApiTeams, ...expenseTeams, ...endCols]));
        setColumns(allCols);
      } else {
        console.error('API Success False:', data.error);
        alert('백엔드 연결 실패: ' + data.error);
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
      newBoard[fromCol] = newBoard[fromCol].filter(t => t !== term);
      if (!newBoard[targetCol]) newBoard[targetCol] = [];
      newBoard[targetCol].push(term);
      return newBoard;
    });

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnName: term, teamName: targetCol })
      });
      // Optionally re-fetch to ensure sync
      // fetchBoard(); 
    } catch (err) {
      console.error('Failed to save mapping', err);
      fetchBoard(); // revert optimistic update
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
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnName: term, teamName: customTargetCol })
      });
    } catch (err) {
      console.error('Failed to add custom term', err);
      fetchBoard();
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || columns.includes(newTeamName.trim())) return;
    const team = newTeamName.trim();
    setNewTeamName('');
    
    setColumns(prev => [...prev, team]);
    
    try {
      await fetch('/api/settings/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', teamName: team })
      });
    } catch (err) {
      console.error(err);
      fetchCustomTeams();
    }
  };

  const handleRemoveTeam = async (team: string) => {
    if (!confirm(`'${team}' 팀을 삭제하시겠습니까?\n안에 있던 항목들은 모두 '기타'로 강제 이동됩니다.`)) return;
    
    setColumns(prev => prev.filter(c => c !== team));
    
    try {
      await fetch('/api/settings/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', teamName: team })
      });
      
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">매출/비용 데이터 매핑 (Kanban 보드)</h1>
          <div className="text-gray-600 mt-3 space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm md:text-base">
            <p>
              <strong className="text-blue-800">1. 기둥(그룹):</strong> 백엔드 V5에서 구축된 <strong>'조직도(부서/팀 그룹)'</strong>입니다. (대시보드의 '팀별 실적 현황' 등에 동일하게 그룹핑됩니다)
            </p>
            <p>
              <strong className="text-blue-800">2. 영업장 (파란색):</strong> V5 기준 해당 기둥에 소속된 실제 매출 발생 영업장 목록과 당월 매출액입니다. (읽기 전용)
            </p>
            <p>
              <strong className="text-blue-800">3. 지출 항목 (빨간색):</strong> 엑셀에서 업로드된 비용 항목들입니다. 당월 지출 합계액이 카드에 표시됩니다. (드래그 앤 드롭으로 소속 변경 가능)
            </p>
            <p>
              <strong className="text-red-600">※ 드래그 앤 드롭을 통해 지출 항목을 배정하면 즉시 전체 대시보드 통계에 반영됩니다. (항목 오타 수정은 [설정 - 지출 매핑] 메뉴를 이용하세요)</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-sm [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100">
          <input 
            type="month" 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="border-none bg-transparent px-3 py-2 text-sm outline-none text-white font-medium cursor-pointer" 
          />
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
                    {!['본부팀', '디지털지원팀', '기타', '제외'].includes(colName) && (!apiTeams.includes(colName) || columns.includes(colName)) && (
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
                  {dashboardData?.teamData?.find((t: any) => t.team === colName)?.facilities?.filter((f: any) => f.type === 'revenue').length > 0 ? (
                    dashboardData.teamData.find((t: any) => t.team === colName).facilities
                      .filter((f: any) => f.type === 'revenue')
                      .map((f: any) => (
                        <div key={`rev-${f.name}`} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 shadow-sm text-sm text-blue-900 flex justify-between items-center">
                          <span className="font-medium truncate mr-2" title={f.name}>{f.name}</span>
                          <span className="font-bold whitespace-nowrap">{new Intl.NumberFormat('ko-KR').format(f.amount)}원</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-xs text-blue-400 italic text-center py-2">매출 내역 없음</div>
                  )}
                </div>

                {/* 🔴 비용 발생처 (드래그 가능 구역) */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-red-800 border-b border-red-200 pb-1 mb-2 mt-4">매핑된 비용 항목 (드래그 가능)</div>
                  {(!board[colName] || board[colName].length === 0) ? (
                    <div className={`text-sm text-center py-8 italic border-2 border-dashed border-transparent ${hasUnmapped ? 'text-orange-400' : 'text-gray-400'}`}>
                      비어있음
                    </div>
                  ) : (
                    board[colName].map(term => {
                      const expAmount = dashboardData?.teamData?.find((t: any) => t.team === colName)?.facilities?.find((f: any) => f.type === 'expense' && f.name === term)?.amount || 0;
                      return (
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
                      );
                    })
                  )}
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
