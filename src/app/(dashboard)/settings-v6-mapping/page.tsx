'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, Save, AlertTriangle, ShieldAlert, Plus, Layers, 
  ListFilter, LayoutGrid, CheckSquare, Square, Search, X, 
  ArrowRight, Check, Sparkles, SlidersHorizontal 
} from 'lucide-react';
import GlobalDateSelector from '@/components/GlobalDateSelector';

interface VenueItem {
  id?: number;
  venueName: string;
  teamName: string;
  partName: string;
  categoryCode?: string;
  isUnclassified?: boolean;
}

export default function V6MappingPage() {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [allMasterVenues, setAllMasterVenues] = useState<VenueItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<VenueItem | null>(null);
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // 뷰 모드: 'kanban' (칸반보드) | 'list' (전체 리스트 테이블)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // 마스터 풀 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedVenueNames, setSelectedVenueNames] = useState<Set<string>>(new Set());
  const [targetColumnForSelection, setTargetColumnForSelection] = useState<string>('');
  const [customNewColumn, setCustomNewColumn] = useState<string>('');

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
          categoryCode: v.categoryCode || v.category_code || 'TICKET',
          isUnclassified: !!(v.isUnclassified || v.partName === '미분류' || !v.partName)
        }));

        setVenues(normalizedVenues);

        // 전사 마스터 영업장 목록 수합
        if (json.allVenues && Array.isArray(json.allVenues)) {
          setAllMasterVenues(json.allVenues.map((m: any) => ({
            venueName: m.venueName,
            categoryCode: m.categoryCode,
            teamName: m.teamName,
            partName: m.partName,
            isUnclassified: m.partName === '미분류' || m.teamName === '미분류' || !m.partName
          })));
        } else {
          setAllMasterVenues(normalizedVenues);
        }
        
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

        // Filter out unwanted standalone non-leisure columns from default initialCols
        const unwantedDefaultCols = new Set(['모토아레나', '기획전']);
        existingParts.forEach(p => {
          if (unwantedDefaultCols.has(p)) existingParts.delete(p);
        });

        let initialCols = Array.from(existingParts);
        try {
          const savedOrder = localStorage.getItem('v6MappingColOrder');
          if (savedOrder) {
            const parsedOrder: string[] = JSON.parse(savedOrder);
            const validSaved = parsedOrder.filter(c => existingParts.has(c) && !unwantedDefaultCols.has(c));
            const newlyAdded = initialCols.filter(c => !validSaved.includes(c));
            initialCols = [...validSaved, ...newlyAdded];
          }
        } catch (e) {
          console.error('Failed to parse saved column order', e);
        }
        
        setColumns(initialCols);
        if (initialCols.length > 0 && !targetColumnForSelection) {
          setTargetColumnForSelection(initialCols[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch v6 leisure mappings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async () => {
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
    showToast(`✅ 새 그룹 기둥 [${col}] 추가 완료`);

    try {
      await fetch('/api/settings/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', teamName: col })
      });
    } catch (err) {
      console.error('Failed to persist custom team to Firestore:', err);
    }
  };

  const handleDeleteColumn = async (colToDelete: string) => {
    if (!confirm(`[${colToDelete}] 그룹 기둥을 칸반보드에서 삭제하시겠습니까?\n(소속된 영업장은 '미분류'로 안전하게 이동됩니다.)`)) {
      return;
    }

    const itemsInCol = venues.filter(v => v.partName === colToDelete);
    
    // 1. Update local columns
    const newCols = columns.filter(c => c !== colToDelete);
    setColumns(newCols);
    localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));

    // Remove from Firestore customTeams
    fetch('/api/settings/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', teamName: colToDelete })
    }).catch(console.error);

    // 2. If there are items in this column, move them to '미분류' on the backend
    if (itemsInCol.length > 0) {
      setVenues(prev => prev.map(v => v.partName === colToDelete ? { ...v, partName: '미분류', isUnclassified: true } : v));

      const updates = itemsInCol.map(v => ({
        venueName: v.venueName,
        targetPart: '미분류',
        targetTeam: '레저본부'
      }));

      try {
        const res = await fetch('/api/admin/v6-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '저장 실패');
        showToast(`✅ [${colToDelete}] 기둥 삭제 완료 (${itemsInCol.length}개 영업장은 '미분류'로 이동)`);
      } catch (err: any) {
        console.error('Failed to move items to unclassified:', err);
      }
    } else {
      showToast(`✅ [${colToDelete}] 기둥이 삭제되었습니다.`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
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

    showToast(`⏳ [${updatedItem.venueName}] -> [${targetCol}] 저장 및 마트 갱신 중...`);

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

  // 모달에서 선택한 영업장들 일괄 배정
  const handleBulkAssign = async () => {
    const target = customNewColumn.trim() || targetColumnForSelection;
    if (!target) {
      alert('배정할 그룹(기둥)을 선택하거나 새 그룹명을 입력해 주세요.');
      return;
    }

    if (selectedVenueNames.size === 0) {
      alert('배정할 영업장을 최소 1개 이상 선택해 주세요.');
      return;
    }

    // 새 컬럼이면 컬럼 목록에 추가 및 Firestore 영구 저장
    if (customNewColumn.trim() && !columns.includes(customNewColumn.trim()) && customNewColumn.trim() !== '미분류') {
      const trimmedCol = customNewColumn.trim();
      const newCols = [...columns, trimmedCol];
      setColumns(newCols);
      localStorage.setItem('v6MappingColOrder', JSON.stringify(newCols));
      fetch('/api/settings/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', teamName: trimmedCol })
      }).catch(console.error);
    }

    const updates = Array.from(selectedVenueNames).map(vName => ({
      venueName: vName,
      targetPart: target,
      targetTeam: target === '모토아레나' ? '모토아레나' : target === '기획전' ? '기획전' : '레저본부'
    }));

    try {
      const res = await fetch('/api/admin/v6-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || '저장 실패');

      showToast(`✅ ${selectedVenueNames.size}개 영업장이 [${target}] 그룹으로 일괄 배정되었습니다!`);
      setSelectedVenueNames(new Set());
      setCustomNewColumn('');
      setIsModalOpen(false);
      fetchMappings();
    } catch (err: any) {
      alert('일괄 배정 실패: ' + err.message);
    }
  };

  const toggleSelectVenue = (venueName: string) => {
    setSelectedVenueNames(prev => {
      const next = new Set(prev);
      if (next.has(venueName)) next.delete(venueName);
      else next.add(venueName);
      return next;
    });
  };

  const toggleSelectAll = (filteredList: VenueItem[]) => {
    if (selectedVenueNames.size === filteredList.length) {
      setSelectedVenueNames(new Set());
    } else {
      setSelectedVenueNames(new Set(filteredList.map(v => v.venueName)));
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

  // 모달용 필터링된 마스터 영업장 목록
  const filteredMasterVenues = useMemo(() => {
    // 15대 레저 표준 영업장 + 전체 영업장 목록 병합 (중복 제거)
    const venueMap = new Map<string, VenueItem>();
    
    // 우선 현재 15대 표준 영업장 등록
    venues.forEach(v => venueMap.set(v.venueName, v));
    
    // 전사 마스터 영업장 중 누락된 것 보강
    allMasterVenues.forEach(m => {
      if (!venueMap.has(m.venueName)) {
        venueMap.set(m.venueName, m);
      }
    });

    return Array.from(venueMap.values()).filter(item => {
      const matchSearch = item.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.partName && item.partName.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      if (categoryFilter === 'ALL') return true;
      if (categoryFilter === 'UNCLASSIFIED') return item.isUnclassified || item.partName === '미분류';
      if (categoryFilter === 'TICKET' || categoryFilter === 'LEISURE') {
        return item.categoryCode === 'TICKET' || item.teamName === '레저본부' || item.categoryCode === 'MOTO';
      }
      if (categoryFilter === 'FNB') return item.categoryCode === 'FNB';
      if (categoryFilter === 'GOLF') return item.categoryCode === 'GOLF';
      if (categoryFilter === 'ROOM') return item.categoryCode === 'ROOM';
      return true;
    });
  }, [venues, allMasterVenues, searchTerm, categoryFilter]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-600 mr-2" size={32} />
        <span className="text-gray-600 font-medium">영업장 및 매핑 데이터를 불러오는 중...</span>
      </div>
    );
  }

  const unmappedItems = getColItems('미분류');

  return (
    <div className="p-6 max-w-full overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      {/* Top Header & Toolbar */}
      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="text-emerald-600" size={32} />
              레저본부 표준 영업장 칸반 매핑 관제 (V6)
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
              표준 영업장 {venues.length}개 연동
            </span>
          </div>
          <p className="text-gray-500 mt-2 text-sm">
            백엔드에서 정리된 영업장 목록을 확인하고, 원하는 <strong className="text-gray-800">그룹(팀/파트) 기둥으로 자유롭게 배치</strong>하여 매출과 비용을 일치시킵니다.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <GlobalDateSelector />

          {/* 뷰 모드 토글 */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutGrid size={15} />
              칸반보드 뷰
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ListFilter size={15} />
              전체 리스트 뷰
            </button>
          </div>

          {/* 영업장 마스터 풀 모달 열기 버튼 */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all flex items-center font-bold text-sm shadow-md hover:shadow-lg gap-2"
          >
            <Sparkles size={17} className="text-yellow-300" />
            📋 전체 영업장 목록에서 고르기
          </button>

          {/* 새 기둥 추가 컨트롤 */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="새 그룹명 (예: 힐링, 캠핑)"
              className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 text-xs w-44"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }}
            />
            <button
              onClick={handleAddColumn}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center font-bold text-xs shadow-sm"
            >
              <Plus size={15} className="mr-1" />
              분류 추가
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Kanban View vs List Table View */}
      {viewMode === 'kanban' ? (
        <div className="flex flex-1 overflow-x-auto overflow-y-hidden space-x-6 pb-4">
          {/* 1. Unmapped Column */}
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
                <div className="h-36 flex flex-col items-center justify-center text-red-400 text-xs border border-dashed border-red-200 rounded-xl bg-white/50 gap-1.5">
                  <span className="font-bold">모든 영업장이</span>
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
                    <div className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
                      그룹 배정 대기 중
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Dynamic Kanban Columns */}
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
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <h2 className="font-bold text-gray-800 text-lg flex items-center cursor-grab active:cursor-grabbing">
                    <span className="text-gray-400 mr-2 text-sm">⋮⋮</span>
                    {col}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      {items.length}
                    </span>
                    <button
                      onClick={() => handleDeleteColumn(col)}
                      title={`[${col}] 기둥 삭제 / 숨김`}
                      className="w-6 h-6 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {items.length === 0 ? (
                    <div className="h-36 flex items-center justify-center text-gray-400 text-xs border border-dashed border-gray-300 rounded-xl bg-white/40">
                      여기로 영업장 카드를 드래그하세요
                    </div>
                  ) : (
                    items.map((item) => (
                      <div 
                        key={item.venueName}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 cursor-grab hover:border-emerald-400 hover:shadow-md transition-all relative group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-bold text-gray-900 text-base">{item.venueName}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} } as any;
                              setDraggedItem(item);
                              handleDrop(fakeEvent, '미분류');
                            }}
                            title="미분류(제외)로 이동"
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-0.5 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100 text-[11px] flex items-center gap-1">
                            <Layers size={11} />
                            {col}
                          </span>
                          <span className="text-[11px] text-gray-400">{item.teamName || '레저본부'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. Entire List / Table View */
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="font-bold text-gray-800 text-base">
              전체 영업장 배정 현황 목록 ({venues.length}개)
            </div>
            <p className="text-xs text-gray-500">
              각 영업장의 소속 그룹 드롭다운을 변경하면 백엔드 DB 마트가 즉시 동기화됩니다.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-500">영업장 명칭</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-500">카테고리</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-500">현재 배정 그룹 (기둥)</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-500">상위 본부</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500">빠른 변경</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {venues.map((v) => (
                  <tr key={v.venueName} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{v.venueName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">
                        {v.categoryCode || 'TICKET'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        v.isUnclassified || v.partName === '미분류'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {v.partName || '미분류'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{v.teamName || '레저본부'}</td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={v.partName || '미분류'}
                        onChange={(e) => {
                          const targetCol = e.target.value;
                          const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} } as any;
                          setDraggedItem(v);
                          handleDrop(fakeEvent, targetCol);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold focus:outline-none focus:border-emerald-500 bg-white"
                      >
                        <option value="미분류">🚨 미분류</option>
                        {columns.map((c) => (
                          <option key={c} value={c}>📁 {c}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Master Venue Pool Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={22} className="text-yellow-300" />
                  <h2 className="text-2xl font-black">백엔드 정리 영업장 마스터 풀에서 고르기</h2>
                </div>
                <p className="text-emerald-100 text-xs mt-1">
                  정리된 전체 영업장 목록 중 원하는 항목들을 체크한 뒤, 배정할 그룹(기둥)을 선택하여 한 번에 등록합니다.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Toolbar (Search & Filters) */}
            <div className="p-5 bg-gray-50 border-b border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="영업장 명칭 또는 그룹 검색..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'ALL', label: '전체' },
                    { id: 'LEISURE', label: '레저/티켓' },
                    { id: 'FNB', label: '식음' },
                    { id: 'GOLF', label: '골프' },
                    { id: 'UNCLASSIFIED', label: '미분류만' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        categoryFilter === cat.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select All & Selection Count Bar */}
              <div className="flex justify-between items-center pt-1 text-xs text-gray-600">
                <button
                  onClick={() => toggleSelectAll(filteredMasterVenues)}
                  className="flex items-center gap-1.5 font-bold hover:text-emerald-700 text-gray-700"
                >
                  {selectedVenueNames.size > 0 && selectedVenueNames.size === filteredMasterVenues.length ? (
                    <CheckSquare size={16} className="text-emerald-600" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                  전체 선택 ({filteredMasterVenues.length}개 중 {selectedVenueNames.size}개 선택됨)
                </button>
                <span>검색 결과: 총 {filteredMasterVenues.length}개</span>
              </div>
            </div>

            {/* Modal Body: Venue Cards Grid */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[50vh] bg-gray-50/50">
              {filteredMasterVenues.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm">일치하는 영업장이 없습니다.</p>
                  <p className="text-xs mt-1">검색어나 카테고리 필터를 변경해 보세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMasterVenues.map((v) => {
                    const isSelected = selectedVenueNames.has(v.venueName);
                    return (
                      <div
                        key={v.venueName}
                        onClick={() => toggleSelectVenue(v.venueName)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-400/30' 
                            : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="mt-0.5 text-emerald-600">
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{v.venueName}</div>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                              {v.categoryCode || 'TICKET'}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              v.isUnclassified || v.partName === '미분류'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {v.partName || '미분류'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer: Target Group Assignment Actions */}
            <div className="p-5 bg-white border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">👉 이동할 그룹(기둥):</span>
                <select
                  value={targetColumnForSelection}
                  onChange={(e) => setTargetColumnForSelection(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="미분류">🚨 미분류 바구니</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>📁 {c}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customNewColumn}
                  onChange={(e) => setCustomNewColumn(e.target.value)}
                  placeholder="또는 새 그룹명 직접입력"
                  className="px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-44"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={selectedVenueNames.size === 0}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md ${
                    selectedVenueNames.size > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check size={16} />
                  선택한 {selectedVenueNames.size}개 영업장 일괄 배정하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in z-50 border border-emerald-700">
          <Save size={20} className="text-emerald-300" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
