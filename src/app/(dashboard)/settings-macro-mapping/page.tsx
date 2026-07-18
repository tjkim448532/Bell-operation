'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, GripVertical, Trash2 } from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';

export default function MacroMappingPage() {
  const [board, setBoard] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ term: string, fromCol: string } | null>(null);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [customTerm, setCustomTerm] = useState('');
  const [customTargetCol, setCustomTargetCol] = useState('미분류(기타)');
  const [saveToast, setSaveToast] = useState(false);
  
  const [columns, setColumns] = useState<string[]>([]);
  const [newMacroName, setNewMacroName] = useState('');

  useEffect(() => {
    fetchBoard();
  }, []);

  useEffect(() => {
    if (Object.keys(board).length > 0 && columns.length > 0) {
      let needsUpdate = false;
      const newBoard = { ...board };
      
      Object.keys(newBoard).forEach(key => {
        if (!columns.includes(key)) {
          if (newBoard[key] && newBoard[key].length > 0) {
            newBoard['미분류(기타)'] = [...(newBoard['미분류(기타)'] || []), ...newBoard[key]];
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

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings-macro-mapping/board');
      const data = await res.json();
      setBoard(data);
      setColumns(Object.keys(data).filter(col => col !== '미분류(기타)' && col !== '제외'));
    } catch (error) {
      console.error('Failed to fetch macro board', error);
    } finally {
      setLoading(false);
    }
  };

  const showSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleDragStart = (e: React.DragEvent, term: string, fromCol: string) => {
    setDraggedItem({ term, fromCol });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', term); // Firefox support
  };

  const handleDragOver = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    setDraggedCol(colName);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setDraggedCol(null);
    
    if (!draggedItem) return;
    const { term, fromCol } = draggedItem;
    if (fromCol === targetCol) return;

    // Optimistic UI update
    setBoard(prev => {
      const newBoard = { ...prev };
      newBoard[fromCol] = newBoard[fromCol].filter(t => t !== term);
      if (!newBoard[targetCol]) newBoard[targetCol] = [];
      newBoard[targetCol] = [...newBoard[targetCol], term];
      return newBoard;
    });

    try {
      await fetch('/api/settings-expense/macro-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawCategory: term, macroCategory: targetCol })
      });
      showSaveToast();
    } catch (err) {
      console.error(err);
      fetchBoard(); // Revert on failure
    }
    setDraggedItem(null);
  };

  const handleAddCustomTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTerm.trim()) return;

    const term = customTerm.trim();
    setBoard(prev => {
      const newBoard = { ...prev };
      if (!newBoard[customTargetCol]) newBoard[customTargetCol] = [];
      newBoard[customTargetCol] = [...newBoard[customTargetCol], term];
      return newBoard;
    });

    try {
      await fetch('/api/settings-expense/macro-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawCategory: term, macroCategory: customTargetCol })
      });
      setCustomTerm('');
      showSaveToast();
    } catch (err) {
      console.error(err);
      fetchBoard();
    }
  };

  const addNewMacroCol = () => {
    if (!newMacroName.trim()) return;
    const colName = newMacroName.trim();
    if (columns.includes(colName) || colName === '미분류(기타)' || colName === '제외') return;
    
    setColumns([...columns, colName]);
    setBoard(prev => ({ ...prev, [colName]: [] }));
    setNewMacroName('');
  };

  const removeColumn = (colToRemove: string) => {
    const itemsToMove = board[colToRemove] || [];
    setBoard(prev => {
      const newBoard = { ...prev };
      newBoard['미분류(기타)'] = [...(newBoard['미분류(기타)'] || []), ...itemsToMove];
      delete newBoard[colToRemove];
      return newBoard;
    });
    setColumns(columns.filter(c => c !== colToRemove));
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mint-500" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-8 relative min-h-screen">
      {saveToast && (
        <div className="fixed top-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in-up z-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="font-medium">저장 완료</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">지출 카테고리 그룹핑 설정</h1>
        <p className="text-gray-500 mt-2">원본 계정과목(예: [6030000]급여, [6040000]잡급)을 '인건비', '운영비' 등 상위 그룹으로 묶어 리포트에 표시합니다.</p>
      </div>

      {/* 새 그룹 추가 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-4">
        <h3 className="font-bold text-gray-700 whitespace-nowrap">새 그룹 만들기</h3>
        <div className="flex w-full md:w-auto">
          <input 
            type="text" 
            placeholder="예: 마케팅비, 운영비"
            className="flex-1 md:w-64 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-mint-500"
            value={newMacroName}
            onChange={e => setNewMacroName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNewMacroCol()}
          />
          <button 
            onClick={addNewMacroCol}
            className="bg-mint-600 hover:bg-mint-700 text-white px-4 py-2 rounded-r-lg font-medium transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left sidebar: 미분류 (기타) items */}
        <div className="w-full xl:w-80 flex-shrink-0">
          <div 
            className={`bg-white rounded-2xl border ${draggedCol === '미분류(기타)' ? 'border-mint-500 ring-2 ring-mint-200' : 'border-gray-200'} shadow-sm h-[calc(100vh-200px)] flex flex-col transition-all duration-200`}
            onDragOver={(e) => handleDragOver(e, '미분류(기타)')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, '미분류(기타)')}
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h2 className="font-bold text-gray-700 flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span>
                미분류 (매핑 대기)
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full font-medium">
                  {board['미분류(기타)']?.length || 0}
                </span>
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-gray-50/50">
              {board['미분류(기타)']?.map(term => (
                <div 
                  key={term}
                  draggable
                  onDragStart={(e) => handleDragStart(e, term, '미분류(기타)')}
                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-mint-300 hover:shadow-md transition-all group flex items-center"
                >
                  <GripVertical size={16} className="text-gray-400 mr-2 opacity-50 group-hover:opacity-100" />
                  <span className="text-sm text-gray-700 font-medium">{term}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right content: Kanban board for mapping */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-[calc(100vh-200px)] min-w-max">
            {columns.map(colName => (
              <div 
                key={colName}
                className={`w-72 bg-white rounded-2xl border ${draggedCol === colName ? 'border-mint-500 ring-2 ring-mint-200' : 'border-gray-200'} shadow-sm flex flex-col transition-all duration-200`}
                onDragOver={(e) => handleDragOver(e, colName)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, colName)}
              >
                <div className="p-4 border-b border-gray-100 flex items-center justify-between group rounded-t-2xl bg-white">
                  <h2 className="font-bold text-gray-800 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-mint-400 mr-2"></span>
                    {colName}
                    <span className="ml-2 bg-mint-50 text-mint-700 text-xs py-0.5 px-2 rounded-full font-medium">
                      {board[colName]?.length || 0}
                    </span>
                  </h2>
                  <button 
                    onClick={() => removeColumn(colName)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="그룹 삭제 (항목은 미분류로 이동)"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-2 bg-gray-50/30">
                  {board[colName]?.map(term => (
                    <div 
                      key={term}
                      draggable
                      onDragStart={(e) => handleDragStart(e, term, colName)}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-mint-300 hover:shadow-md transition-all group flex items-center"
                    >
                      <GripVertical size={16} className="text-gray-400 mr-2 opacity-50 group-hover:opacity-100" />
                      <span className="text-sm text-gray-700 font-medium truncate" title={term}>{term}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* 제외 column (hidden or separate) */}
            <div 
              className={`w-72 bg-gray-50 rounded-2xl border ${draggedCol === '제외' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 border-dashed'} flex flex-col transition-all duration-200 opacity-70 hover:opacity-100`}
              onDragOver={(e) => handleDragOver(e, '제외')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, '제외')}
            >
              <div className="p-4 border-b border-gray-200/50">
                <h2 className="font-bold text-gray-600 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                  제외 (통계 미포함)
                  <span className="ml-auto bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full font-medium">
                    {board['제외']?.length || 0}
                  </span>
                </h2>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {board['제외']?.map(term => (
                  <div 
                    key={term}
                    draggable
                    onDragStart={(e) => handleDragStart(e, term, '제외')}
                    className="bg-white/60 p-3 rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-all flex items-center"
                  >
                    <GripVertical size={16} className="text-gray-400 mr-2 opacity-50" />
                    <span className="text-sm text-gray-500 font-medium truncate line-through" title={term}>{term}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
