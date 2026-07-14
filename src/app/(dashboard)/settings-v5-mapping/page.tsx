'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, AlertTriangle, ShieldAlert, Plus } from 'lucide-react';

interface MappingItem {
  facility_name: string;
  category_code: string;
  team_name: string;
  part_name: string;
}

export default function V5MappingPage() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<MappingItem | null>(null);
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
        setMappings(json.data);
        
        // V5 DB에 실제로 존재하는 부서(part_name)만 추출하여 기둥 생성
        const existingParts = new Set<string>();
        json.data.forEach((m: MappingItem) => {
          if (m.part_name && m.part_name !== '미분류') existingParts.add(m.part_name);
        });
        setColumns(Array.from(existingParts));
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

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;
    
    const currentCol = draggedItem.part_name !== '미분류' && draggedItem.part_name ? draggedItem.part_name : 
                       (draggedItem.team_name !== '미분류' && draggedItem.team_name ? draggedItem.team_name : '미분류');

    if (currentCol === targetCol) {
      setDraggedItem(null);
      return;
    }

    // 🛑 SMART GUARDRAIL SYSTEM 🛑
    if (draggedItem.category_code === '객실' && !['객실', '미분류'].includes(targetCol)) {
      if (!confirm(`🚨 경고: [객실] 매출인 '${draggedItem.facility_name}' 영업장을 [${targetCol}] 팀으로 배정하려고 합니다.\n\n이는 대시보드 통계에 심각한 왜곡을 유발할 수 있습니다.\n정말로 변경하시겠습니까?`)) {
        setDraggedItem(null);
        return;
      }
    }

    if (draggedItem.category_code === '골프' && !['골프', '미분류'].includes(targetCol)) {
      if (!confirm(`🚨 경고: [골프] 매출인 '${draggedItem.facility_name}' 영업장을 [${targetCol}] 팀으로 배정하려고 합니다.\n\n이는 대시보드 통계에 심각한 왜곡을 유발할 수 있습니다.\n정말로 변경하시겠습니까?`)) {
        setDraggedItem(null);
        return;
      }
    }

    const updatedItem = { ...draggedItem };
    if (targetCol === '미분류') {
      updatedItem.team_name = '미분류';
      updatedItem.part_name = '미분류';
    } else {
      updatedItem.team_name = '레저본부'; 
      updatedItem.part_name = targetCol;
    }

    setMappings(prev => prev.map(m => m.facility_name === updatedItem.facility_name ? updatedItem : m));
    setDraggedItem(null);

    try {
      const res = await fetch('/api/admin/v5-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: [updatedItem] })
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
        return (!m.part_name || m.part_name === '미분류') && (!m.team_name || m.team_name === '미분류');
      }
      return m.part_name === colName || (m.part_name === '미분류' && m.team_name === colName);
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
                key={item.facility_name}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="bg-white p-3 rounded-lg shadow-sm border border-red-100 cursor-grab hover:shadow-md transition-shadow"
              >
                <div className="font-bold text-gray-800">{item.facility_name}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">카테고리: {item.category_code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Columns */}
        {columns.map(col => {
          const items = getColItems(col);
          return (
            <div 
              key={col}
              className="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-4 flex flex-col border border-gray-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                <h2 className="font-bold text-gray-700 text-lg">{col}</h2>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {items.map((item) => (
                  <div 
                    key={item.facility_name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:border-blue-300 transition-colors"
                  >
                    <div className="font-bold text-gray-800">{item.facility_name}</div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                        {item.category_code}
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
