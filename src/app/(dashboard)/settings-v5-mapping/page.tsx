'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, AlertTriangle, ShieldAlert, Plus } from 'lucide-react';

interface MappingItem {
  facilityName: string;
  categoryCode: string;
  teamName: string;
  partName: string;
}

export default function V5MappingPage() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<MappingItem | null>(null);
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
      const res = await fetch('/api/admin/v5-mapping');
      const json = await res.json();
      if (json && json.data) {
        // Convert snake_case from API to camelCase for frontend
        const normalizedData = (json.data || []).map((m: any) => ({
          facilityName: m.facilityName || m.facility_name || '',
          categoryCode: m.categoryCode || m.category_code || '',
          teamName: m.teamName || m.team_name || '',
          partName: m.partName || m.part_name || ''
        }));

        // [앱 유일 목적 적용] "중분류 레져본부만 받아오라고 했잔아"
        // 다른 본부(FNB, 놀이동산 등)로 매핑된 데이터는 아예 화면에서 제외 (미분류와 레저본부만 남김)
        const leisureData = normalizedData.filter((m: MappingItem) => {
          const t = m.teamName ? m.teamName.trim() : '';
          return t === '레저본부' || t === '미분류' || !t;
        });
        
        setMappings(leisureData);
        
        // V5 DB에 존재하는 부서(part_name) 추출 시, 오직 '레저본부' 소속인 파트만 기둥으로 만듦
        const existingParts = new Set<string>();
        leisureData.forEach((m: MappingItem) => {
          const t = m.teamName ? m.teamName.trim() : '';
          if (t === '레저본부' && m.partName && m.partName !== '미분류') {
            existingParts.add(m.partName);
          }
        });
        
        let initialCols = Array.from(existingParts);
        try {
          const savedOrder = localStorage.getItem('v5MappingColOrder');
          if (savedOrder) {
            const parsedOrder: string[] = JSON.parse(savedOrder);
            // 저장된 순서 중 현재 존재하는 기둥만 유지
            const validSaved = parsedOrder.filter(c => existingParts.has(c));
            // 새로 생긴 기둥은 뒤에 추가
            const newlyAdded = initialCols.filter(c => !validSaved.includes(c));
            initialCols = [...validSaved, ...newlyAdded];
          }
        } catch (e) {
          console.error('Failed to parse saved column order', e);
        }
        
        setColumns(initialCols);
      }
    } catch (err) {
      console.error('Failed to fetch v5 mappings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    const col = newColName.trim();
    if (!col) return;
    if (columns.includes(col)) {
      alert('이미 존재하는 부서명입니다.');
      return;
    }
    setColumns([...columns, col]);
    setNewColName('');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDragStart = (e: React.DragEvent, item: MappingItem) => {
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
    e.dataTransfer.setData('text/plain', 'column'); // 기둥 이동 표식
  };

  const handleColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 아이템 드롭인 경우 무시 (handleDrop에서 처리)
    if (draggedItem || draggedColIndex === null) return;
    
    if (draggedColIndex === targetIndex) {
      setDraggedColIndex(null);
      return;
    }
    
    const newCols = [...columns];
    const [movedCol] = newCols.splice(draggedColIndex, 1);
    newCols.splice(targetIndex, 0, movedCol);
    
    setColumns(newCols);
    localStorage.setItem('v5MappingColOrder', JSON.stringify(newCols));
    setDraggedColIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;
    
    const currentCol = draggedItem.partName !== '미분류' && draggedItem.partName ? draggedItem.partName : 
                       (draggedItem.teamName !== '미분류' && draggedItem.teamName ? draggedItem.teamName : '미분류');

    if (currentCol === targetCol) {
      setDraggedItem(null);
      return;
    }

    // 🛑 SMART GUARDRAIL SYSTEM 🛑
    if (draggedItem.categoryCode === '객실' && !['객실', '미분류'].includes(targetCol)) {
      if (!confirm(`🚨 경고: [객실] 매출인 '${draggedItem.facilityName}' 영업장을 [${targetCol}] 팀으로 배정하려고 합니다.\n\n이는 대시보드 통계에 심각한 왜곡을 유발할 수 있습니다.\n정말로 변경하시겠습니까?`)) {
        setDraggedItem(null);
        return;
      }
    }

    if (draggedItem.categoryCode === '골프' && !['골프', '미분류'].includes(targetCol)) {
      if (!confirm(`🚨 경고: [골프] 매출인 '${draggedItem.facilityName}' 영업장을 [${targetCol}] 팀으로 배정하려고 합니다.\n\n이는 대시보드 통계에 심각한 왜곡을 유발할 수 있습니다.\n정말로 변경하시겠습니까?`)) {
        setDraggedItem(null);
        return;
      }
    }

    const updatedItem = { ...draggedItem };
    if (targetCol === '미분류') {
      updatedItem.teamName = '미분류';
      updatedItem.partName = '미분류';
    } else {
      updatedItem.teamName = '레저본부'; 
      updatedItem.partName = targetCol;
    }

    setMappings(prev => prev.map(m => m.facilityName === updatedItem.facilityName ? updatedItem : m));
    setDraggedItem(null);

    try {
      // Send snake_case to backend API
      const apiItem = {
        facility_name: updatedItem.facilityName,
        category_code: updatedItem.categoryCode,
        team_name: updatedItem.teamName,
        part_name: updatedItem.partName
      };
      const res = await fetch('/api/admin/v5-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([apiItem])
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('✅ 매핑이 성공적으로 저장되었습니다.');
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
      fetchMappings(); 
    }
  };

  const getColItems = (colName: string) => {
    return mappings.filter(m => {
      if (colName === '미분류') {
        return (!m.partName || m.partName === '미분류') && (!m.teamName || m.teamName === '미분류');
      }
      return m.partName === colName || (m.partName === '미분류' && m.teamName === colName);
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 mr-2" size={32} />
        <span className="text-gray-600 font-medium">매핑 데이터를 불러오는 중...</span>
      </div>
    );
  }

  const unmappedItems = getColItems('미분류');

  return (
    <div className="p-6 max-w-full overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={32} />
            매출/조직도 통합 매핑 센터 (V5)
          </h1>
          <p className="text-gray-500 mt-2">
            백엔드 매출 통계(Matrix)의 그룹핑을 담당하는 메인 컨트롤 타워입니다. 임의로 만든 분류가 아닌, 백엔드 원천 부서명만 사용합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="새 부서명 (예: 식음, 객실)"
            className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm w-48"
          />
          <button
            onClick={handleAddColumn}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center font-bold text-sm"
          >
            <Plus size={16} className="mr-1" />
            분류 추가
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-x-auto overflow-y-hidden space-x-6 pb-4">
        {/* Unmapped Column */}
        <div 
          className="flex-shrink-0 w-80 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, '미분류')}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-red-800 text-lg flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              미분류 영업장
            </h2>
            <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs font-bold">
              {unmappedItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {unmappedItems.map((item) => (
              <div 
                key={item.facilityName}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="bg-white p-3 rounded-lg shadow-sm border border-red-100 cursor-grab hover:shadow-md transition-shadow"
              >
                <div className="font-bold text-gray-800">{item.facilityName}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">카테고리: {item.categoryCode}</span>
                </div>
              </div>
            ))}
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
                // Determine what is being dropped
                if (draggedItem) {
                  handleDrop(e, col);
                } else if (draggedColIndex !== null) {
                  handleColDrop(e, index);
                }
              }}
              className={`flex-shrink-0 w-80 rounded-xl p-4 flex flex-col border transition-all ${
                draggedColIndex === index ? 'opacity-50 border-blue-400 bg-blue-50' : 'bg-gray-100 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-4 cursor-grab active:cursor-grabbing">
                <h2 className="font-bold text-gray-800 text-lg flex items-center">
                  <span className="text-gray-400 mr-2 text-sm">⋮⋮</span>
                  {col}
                </h2>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {items.map((item) => (
                  <div 
                    key={item.facilityName}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:border-blue-300 transition-colors"
                  >
                    <div className="font-bold text-gray-800">{item.facilityName}</div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                        {item.categoryCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-800 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
          <Save size={20} />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
