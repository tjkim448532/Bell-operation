'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, CheckSquare, Square } from 'lucide-react';

type Mapping = {
  id: string;
  columnName: string;
  teamName: string;
};

const PREDEFINED_COLUMNS = [
  '목장', '미디어아트센터', '마운틴카트', '사계절썰매장', 
  '놀이동산', '놀이동산(2025)', '모토아레나', '승마', '식음료', '기타매출'
];

export default function SettingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [customColumn, setCustomColumn] = useState('');
  const [newTeam, setNewTeam] = useState('엑티비티');

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (Array.isArray(data)) setMappings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const addMapping = async () => {
    const columnsToAdd = [...selectedColumns];
    if (customColumn.trim()) {
      columnsToAdd.push(customColumn.trim());
    }

    if (columnsToAdd.length === 0) return;

    try {
      // Add one by one (could be optimized, but fine for settings)
      for (const col of columnsToAdd) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnName: col, teamName: newTeam }),
        });
      }
      setSelectedColumns([]);
      setCustomColumn('');
      fetchMappings();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const res = await fetch(`/api/settings?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMappings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">팀 분류 설정</h1>
        <p className="text-gray-500 mt-2">엑셀의 열(Column) 이름을 내부 팀과 연결합니다. 매출 파일을 업로드할 때 이 규칙에 따라 수입이 분류됩니다.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">새 규칙 추가</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">미리 정의된 열 이름 선택</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PREDEFINED_COLUMNS.map(col => {
              const isSelected = selectedColumns.includes(col);
              return (
                <div 
                  key={col} 
                  onClick={() => toggleColumn(col)}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                  {isSelected ? <CheckSquare className="w-5 h-5 mr-2 text-blue-600" /> : <Square className="w-5 h-5 mr-2 text-gray-400" />}
                  <span className="text-sm font-medium">{col}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4 pt-4 border-t border-gray-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">직접 입력 (목록에 없는 경우)</label>
            <input 
              type="text" 
              value={customColumn}
              onChange={(e) => setCustomColumn(e.target.value)}
              placeholder="예: 새로운놀이기구"
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">대상 팀 지정</label>
            <select 
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="목장">목장 (Farm)</option>
              <option value="미디어아트센터">미디어아트센터 (Media Art Center)</option>
              <option value="엑티비티">엑티비티 (Activity)</option>
            </select>
          </div>
          <button 
            onClick={addMapping}
            disabled={selectedColumns.length === 0 && !customColumn.trim()}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-1" /> 선택된 항목 규칙 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">엑셀 열(Column) 이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">매핑된 팀</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  설정된 규칙이 없습니다. 기본 규칙이 적용됩니다.
                </td>
              </tr>
            ) : (
              mappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mapping.columnName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {mapping.teamName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => deleteMapping(mapping.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5 inline-block" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
