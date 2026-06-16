'use client';

import { useState, useEffect } from 'react';

export default function ValidationPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/validation');
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Failed to load validation data', err);
    } finally {
      setLoading(false);
    }
  }

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setEditValue(item.assigned_project);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/validation/update-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, assigned_project: editValue.trim() }),
      });
      const json = await res.json();

      if (json.success) {
        // Update local state to reflect the new team and rule
        setItems(prev => prev.map(item => 
          item.id === id 
            ? { 
                ...item, 
                assigned_project: json.data.assigned_project,
                team: json.data.team,
                mapped_rule: json.data.mapped_rule
              } 
            : item
        ));
      } else {
        alert('업데이트 실패: ' + json.error);
      }
    } catch (err) {
      console.error('Failed to update', err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
      setEditingId(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (filterTeam !== 'all' && item.team !== filterTeam) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        String(item.original_term || '').toLowerCase().includes(q) ||
        String(item.assigned_project || '').toLowerCase().includes(q) ||
        String(item.branch_name || '').toLowerCase().includes(q) ||
        String(item.dept_name || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q) ||
        String(item.vendor || '').toLowerCase().includes(q) ||
        String(item.mapped_rule || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const uniqueTeams = Array.from(new Set(items.map(i => i.team))).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">데이터 분류 검증 및 프로젝트 교정</h1>
        <p className="mt-2 text-sm text-gray-500">
          모든 비용 항목에 1차적으로 프로젝트명을 할당합니다. 프로젝트명이 잘못 지정되었다면 칸을 클릭하여 직접 수정해 보세요! (수정 시 팀 분류가 즉시 자동 업데이트됩니다)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">통합 검색</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="키워드로 검색"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">팀 필터</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 팀 보기</option>
                <option value="기타">⚠️ 미분류(기타)만 보기</option>
                <optgroup label="분류된 팀">
                  {uniqueTeams.filter(t => t !== '기타' && t !== '제외').map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500 pb-2">
            검색 결과: {filteredItems.length}건
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">데이터를 불러오는 중입니다...</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border-r border-gray-200 w-1/6">
                    할당된 프로젝트명 (수정가능)
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">분류된 팀</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">날짜</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">적요 및 업체명</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">원본 부서/프로젝트</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">분류 사유 (규칙)</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">금액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td 
                      className={`px-2 py-2 font-bold border-r border-gray-200 cursor-pointer group ${
                        item.assigned_project === '미분류 프로젝트' ? 'text-red-600 bg-red-50' : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                      }`}
                      onClick={() => editingId !== item.id && handleEditClick(item)}
                    >
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full px-1 py-1 text-xs border-2 border-blue-500 rounded outline-none text-gray-900"
                            disabled={isUpdating}
                          />
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSaveEdit(item.id); }}
                            className="text-[10px] bg-blue-600 text-white px-1.5 py-1 rounded hover:bg-blue-700"
                            disabled={isUpdating}
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{item.assigned_project}</span>
                          <span className="text-gray-400 opacity-0 group-hover:opacity-100 text-[10px]">✏️ 수정</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.team === '기타' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.team}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-gray-500 text-xs">
                      {item.date && item.date !== 'Invalid Date' ? new Date(item.date).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-2 py-2 text-gray-900 text-xs">
                      <div className="font-medium truncate max-w-xs" title={item.description}>{item.description}</div>
                      <div className="text-gray-500 truncate max-w-xs" title={item.vendor}>{item.vendor}</div>
                    </td>
                    <td className="px-2 py-2 text-gray-500 text-xs">
                      <div className="truncate max-w-[120px]" title={item.dept_name}>{item.dept_name || '-'}</div>
                      <div className="truncate max-w-[120px] text-gray-400" title={item.branch_name}>{item.branch_name || '-'}</div>
                    </td>
                    <td className="px-2 py-2 text-gray-400 text-[10px] max-w-xs leading-tight" title={item.mapped_rule}>
                      <div className="line-clamp-2">{item.mapped_rule}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right font-medium text-gray-900 text-xs">
                      {item.amount?.toLocaleString()}원
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      검색 조건에 맞는 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
