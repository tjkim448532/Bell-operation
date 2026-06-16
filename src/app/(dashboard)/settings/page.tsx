'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, GripVertical } from 'lucide-react';

const COLUMNS = ['미디어아트센터', '목장', '엑티비티', '디지털지원', '레져본부', '놀이동산', '감가상각비', '기타', '제외'];

export default function SettingsPage() {
  const [board, setBoard] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ term: string, fromCol: string } | null>(null);
  const [customTerm, setCustomTerm] = useState('');
  const [customTargetCol, setCustomTargetCol] = useState('목장');
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    fetchBoard();
  }, []);

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
    setDraggedItem({ term, fromCol });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', term); 
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const showSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { term, fromCol } = draggedItem;
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
        body: JSON.stringify({ columnName: term, teamName: targetCol }),
      });
      showSaveToast();
    } catch (err) {
      console.error('Failed to update mapping', err);
      fetchBoard(); // Revert on failure
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
        body: JSON.stringify({ columnName: term, teamName: customTargetCol }),
      });
      showSaveToast();
    } catch (err) {
      console.error(err);
      fetchBoard();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">영업장 팀 연결 규칙 (Kanban 보드)</h1>
        <p className="text-gray-500 mt-2">
          데이터베이스에 등록된 모든 영업장/프로젝트 항목들이 현재 지정된 팀 아래에 분류되어 있습니다.<br/>
          팀을 변경하려면 항목을 마우스로 드래그해서 원하는 컬럼으로 옮기세요. 변경사항은 즉시 저장됩니다.
        </p>
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
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">배정할 팀</label>
            <select 
              value={customTargetCol}
              onChange={(e) => setCustomTargetCol(e.target.value)}
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            >
              {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <button 
            onClick={handleAddCustom}
            disabled={!customTerm.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm h-10"
          >
            <Plus className="w-4 h-4 mr-1" /> 항목 강제 추가
          </button>
        </div>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-8 h-[calc(100vh-300px)]">
        {COLUMNS.map(colName => (
          <div 
            key={colName}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colName)}
            className="bg-gray-50 rounded-xl min-w-[280px] w-[280px] flex flex-col border border-gray-200 relative"
          >
            <div className={`p-4 border-b border-gray-200 font-semibold text-gray-800 rounded-t-xl flex justify-between items-center ${colName === '제외' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-white'}`}>
              {colName}
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {board[colName]?.length || 0}
              </span>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {(!board[colName] || board[colName].length === 0) ? (
                <div className="text-sm text-gray-400 text-center py-8 italic border-2 border-dashed border-transparent">
                  비어있음
                </div>
              ) : (
                board[colName].map(term => (
                  <div
                    key={term}
                    draggable
                    onDragStart={(e) => handleDragStart(e, term, colName)}
                    className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm text-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all flex items-center"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate" title={term}>{term}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
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
