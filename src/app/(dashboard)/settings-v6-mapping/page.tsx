'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, AlertTriangle, ShieldAlert, Plus, Layers } from 'lucide-react';
import GlobalDateSelector from '@/components/GlobalDateSelector';

interface VenueItem {
  id?: number;
  venueName: string;
  teamName: string;
  partName: string;
  isUnclassified?: boolean;
}

export default function V6MappingPage() {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<VenueItem | null>(null);
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // 사용자 정의 기둥 목록
  const [columns, setColumns] = useState<string[]>([]);
  const [newColName, setNewColName] = useState('');

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const res = await fetch('/api/admin/v6-mapping');
      const json = await res.json();
      
      if (json && json.data) {
        const rawVenues = json.data.venues || (Array.isArray(json.data) ? json.data : []);
        
        const normalizedVenues: VenueItem[] = rawVenues.map((v: any) => ({
          id: v.id,
          venueName: v.venueName || v.facilityName || v.facility_name || '',
          teamName: v.teamName || v.team_name || '레저본부',
          partName: v.partName || v.part_name || (v.isUnclassified ? '미분류' : '미분류'),
          isUnclassified: !!(v.isUnclassified || v.partName === '미분류' || !v.partName)
        }));

        setVenues(normalizedVenues);
        
        // 백엔드가 내려준 parts 목록 또는 배정된 partName 기반 기둥 추출 (미분류 제외)
        const partsFromBackend = json.data.parts || [];
        const existingParts = new Set<string>();
        
        partsFromBackend.forEach((p: string) => {
          if (p && p !== '미분류') existingParts.add(p);
        });

        normalizedVenues.forEach((v: VenueItem) => {
          if (v.partName && v.partName !== '미분류') {
            existingParts.add(v.partName);
          }
        });
        
        let initialCols = Array.from(existingParts);
        try {
          const savedOrder = localStorage.getItem('v6MappingColOrder');
          if (savedOrder) {
            const parsedOrder: string[] = JSON.parse(savedOrder);
            const validSaved = parsedOrder.filter(c => existingParts.has(c));
            const newlyAdded = initialCols.filter(c => !validSaved.includes(c));
            initialCols = [...validSaved, ...newlyAdded];
          }
        } catch (e) {
          console.error('Failed to parse saved column order', e);
        }
        
        setColumns(initialCols);
      }
    } catch (err) {
      console.error('Failed to fetch v6 leisure mappings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    const col = newColName.trim();
    if (!col) return;
    if (columns.includes(col) || col === '미분류') {
      alert('이미 존재하는 부서명입니다.');
      return;
    }
    const newCols = [...columns, col];
    setColumns(newCols);
    localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));
    setNewColName('');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDragStart = (e: React.DragEvent, item: VenueItem) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'column');
  };

  const handleColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem || draggedColIndex === null) return;
    
    if (draggedColIndex === targetIndex) {
      setDraggedColIndex(null);
      return;
    }
    
    const newCols = [...columns];
    const [movedCol] = newCols.splice(draggedColIndex, 1);
    newCols.splice(targetIndex, 0, movedCol);
    
    setColumns(newCols);
    localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));
    setDraggedColIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;
    
    const currentCol = draggedItem.partName || '미분류';

    if (currentCol === targetCol) {
      setDraggedItem(null);
      return;
    }

    const updatedItem: VenueItem = { ...draggedItem };
    if (targetCol === '미분류') {
      updatedItem.partName = '미분류';
      updatedItem.teamName = '레저본부';
      updatedItem.isUnclassified = true;
    } else {
      updatedItem.partName = targetCol;
      updatedItem.teamName = targetCol === '모토아레나' ? '모토아레나' : targetCol === '기획전' ? '기획전' : '레저본부';
      updatedItem.isUnclassified = false;
    }

    setVenues(prev => prev.map(m => m.venueName === updatedItem.venueName ? updatedItem : m));
    setDraggedItem(null);

    try {
      const updatePayload = {
        updates: [
          {
            venueName: updatedItem.venueName,
            targetPart: targetCol,
            targetTeam: updatedItem.teamName
          }
        ]
      };
      
      const res = await fetch('/api/admin/v6-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || '저장 실패');
      showToast(`✅ [${updatedItem.venueName}] -> [${targetCol}] 배정 및 마트 갱신 완료`);
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
      fetchMappings(); 
    }
  };

  const getColItems = (colName: string) => {
    return venues.filter(v => {
      if (colName === '미분류') {
        return v.isUnclassified || !v.partName || v.partName === '미분류';
      }
      return v.partName === colName && !v.isUnclassified;
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500 mr-2" size={32} />
        <span className="text-gray-600 font-medium">15개 레저 표준 영업장 매핑 데이터를 불러오는 중...</span>
      </div>
    );
  }

  const unmappedItems = getColItems('미분류');

  return (
    <div className="p-6 max-w-full overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-emerald-600" size={32} />
            레저본부 표준 영업장 칸반 매핑 관제 (V6)
          </h1>
          <p className="text-gray-500 mt-2">
            대시보드 실적표와 1:1 직결되는 <strong className="text-gray-800">15대 공식 표준 영업장(Venue)</strong>을 부서/팀 기둥으로 배치합니다. 드래그 앤 드롭 시 백엔드 DB 마트가 0-Variance로 실시간 재계산됩니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <GlobalDateSelector />
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="새 부서명 (예: 캠핑, 힐링)"
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm w-48"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }}
            />
            <button
              onClick={handleAddColumn}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center font-bold text-sm"
            >
              <Plus size={16} className="mr-1" />
              분류 추가
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-x-auto overflow-y-hidden space-x-6 pb-4">
        {/* Unmapped Column */}
        <div 
          className="flex-shrink-0 w-80 bg-red-50/80 border-2 border-red-200 rounded-2xl p-4 flex flex-col shadow-sm"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, '미분류')}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-red-800 text-lg flex items-center">
              <AlertTriangle className="mr-2 text-red-500" size={20} />
              미분류 영업장
            </h2>
            <span className="bg-red-200 text-red-800 px-2.5 py-1 rounded-full text-xs font-bold">
              {unmappedItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {unmappedItems.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-red-400 text-xs border border-dashed border-red-200 rounded-xl bg-white/50">
                <span>모든 레저 영업장이</span>
                <span>정상 배정되었습니다 👍</span>
              </div>
            ) : (
              unmappedItems.map((item) => (
                <div 
                  key={item.venueName}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className="bg-white p-3.5 rounded-xl shadow-sm border border-red-200 cursor-grab hover:shadow-md hover:border-red-400 transition-all"
                >
                  <div className="font-bold text-gray-900 text-base">{item.venueName}</div>
                  <div className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
                    부서 배정 대기 중
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Columns */}
        {columns.map((col, index) => {
          const items = getColItems(col);
          return (
            <div 
              key={col}
              draggable
              onDragStart={(e) => handleColDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                if (draggedItem) {
                  handleDrop(e, col);
                } else if (draggedColIndex !== null) {
                  handleColDrop(e, index);
                }
              }}
              className={`flex-shrink-0 w-80 rounded-2xl p-4 flex flex-col border shadow-sm transition-all ${
                draggedColIndex === index ? 'opacity-50 border-emerald-400 bg-emerald-50' : 'bg-gray-50/90 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-4 cursor-grab active:cursor-grabbing pb-2 border-b border-gray-200">
                <h2 className="font-bold text-gray-800 text-lg flex items-center">
                  <span className="text-gray-400 mr-2 text-sm">⋮⋮</span>
                  {col}
                </h2>
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {items.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-gray-400 text-xs border border-dashed border-gray-300 rounded-xl bg-white/40">
                    여기로 영업장 카드를 드래그하세요
                  </div>
                ) : (
                  items.map((item) => (
                    <div 
                      key={item.venueName}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 cursor-grab hover:border-emerald-400 hover:shadow-md transition-all"
                    >
                      <div className="font-bold text-gray-900 text-base">{item.venueName}</div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100 text-[11px] flex items-center gap-1">
                          <Layers size={11} />
                          {col}
                        </span>
                        <span className="text-[11px] text-gray-400">레저본부</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-900 text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in z-50">
          <Save size={20} className="text-emerald-300" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
