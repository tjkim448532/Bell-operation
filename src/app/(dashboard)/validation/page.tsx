'use client';

import { useState, useEffect } from 'react';

export default function ValidationPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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
    fetchData();
  }, []);

  const filteredItems = items.filter(item => {
    if (filterTeam !== 'all' && item.team !== filterTeam) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        String(item.original_term || '').toLowerCase().includes(q) ||
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
        <h1 className="text-3xl font-bold text-gray-900">데이터 분류 검증 (전체)</h1>
        <p className="mt-2 text-sm text-gray-500">
          업로드된 모든 원본 데이터를 확인하고, 시스템이 어떤 사유로 특정 팀에 분류했는지 투명하게 검증합니다.
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
                placeholder="키워드로 검색 (적요, 업체명 등)"
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">분류된 팀</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">분류 사유 (규칙)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">날짜</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">계정과목명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">프로젝트명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">부서명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">적요</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">업체명</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">금액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.team === '기타' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.team}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={item.mapped_rule}>
                      {item.mapped_rule}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                      {new Date(item.date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-2 text-gray-900 whitespace-nowrap">{item.original_term}</td>
                    <td className="px-4 py-2 text-gray-900 whitespace-nowrap">{item.branch_name}</td>
                    <td className="px-4 py-2 text-gray-900 whitespace-nowrap">{item.dept_name}</td>
                    <td className="px-4 py-2 text-gray-500 min-w-[200px]">{item.description}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{item.vendor}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-gray-900">
                      {item.amount?.toLocaleString()}원
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
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
