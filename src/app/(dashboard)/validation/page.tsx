'use client';

import { useState, useEffect } from 'react';

export default function ValidationPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
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
      setDataError(null);
      const res = await fetch('/api/validation');
      const json = await res.json();
      
      if (json.success) {
        if (!json.data || json.data.length === 0) {
          setDataError('데이터 동기화 실패: 안분 룰 데이터가 유실(또는 미응답)되었습니다');
        } else {
          setItems(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load validation data', err);
      setDataError('데이터 로딩 중 에러가 발생했습니다.');
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
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">비용 데이터 정합성 검증</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          모든 비용 항목에 1차적으로 프로젝트명을 할당하고 검증합니다. 프로젝트명이 잘못 지정되었다면 칸을 클릭하여 직접 수정할 수 있습니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-end pb-4 border-b border-slate-100">
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <label className="block text-xs font-semibold text-slate-700 mb-1">통합 검색</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="키워드로 검색"
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex-1 sm:w-48">
              <label className="block text-xs font-semibold text-slate-700 mb-1">팀 필터</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
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
          <div className="text-xs font-semibold text-slate-500 pb-1">
            검색 결과: <span className="text-slate-900 font-bold tabular-nums">{filteredItems.length}</span>건
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs sm:text-sm font-medium">데이터를 불러오는 중입니다...</div>
        ) : dataError ? (
          <div className="flex justify-center items-center h-64">
            <div className="bg-red-50 text-red-600 p-8 rounded-2xl border border-red-200 shadow-sm text-center max-w-lg">
              <h3 className="text-xl font-bold mb-3">[API Server Error: 시스템 정지 및 원인]</h3>
              <p className="text-red-700/90">{dataError}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100 text-xs sm:text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3.5 py-3 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50/60 border-r border-slate-200/80 w-1/6">
                    할당된 프로젝트명 (수정가능)
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">분류된 팀</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">날짜</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/4">적요 및 업체명</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">원본 부서/프로젝트</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/5">분류 사유</th>
                  <th className="px-3.5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">금액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td 
                      className={`px-3.5 py-2.5 font-bold border-r border-slate-200/80 cursor-pointer group ${
                        item.assigned_project === '미분류 프로젝트' ? 'text-rose-600 bg-rose-50/50' : 'text-emerald-700 bg-emerald-50/40 hover:bg-emerald-100/60'
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
                            className="w-full px-2 py-1 text-xs border border-emerald-500 rounded-lg outline-none text-slate-900"
                            disabled={isUpdating}
                          />
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSaveEdit(item.id); }}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 font-semibold cursor-pointer"
                            disabled={isUpdating}
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{item.assigned_project}</span>
                          <span className="text-slate-400 opacity-0 group-hover:opacity-100 text-2xs">✏️ 수정</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.team === '기타' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}>
                        {item.team}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 text-xs tabular-nums">
                      {item.date && item.date !== 'Invalid Date' ? new Date(item.date).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-900 text-xs">
                      <div className="font-semibold truncate max-w-xs text-slate-800" title={item.description}>{item.description}</div>
                      <div className="text-slate-500 truncate max-w-xs text-2xs mt-0.5" title={item.vendor}>{item.vendor}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">
                      <div className="truncate max-w-[130px] font-medium" title={item.dept_name}>{item.dept_name || '-'}</div>
                      <div className="truncate max-w-[130px] text-slate-400 text-2xs mt-0.5" title={item.branch_name}>{item.branch_name || '-'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-2xs max-w-xs leading-relaxed" title={item.mapped_rule}>
                      <div className="line-clamp-2">{item.mapped_rule}</div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                      {item.amount?.toLocaleString()}원
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm font-medium">
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
