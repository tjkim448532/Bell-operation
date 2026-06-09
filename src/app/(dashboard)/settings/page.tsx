'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, CheckSquare, Square } from 'lucide-react';

type Mapping = {
  id: string;
  columnName: string;
  teamName: string;
};


export default function SettingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [customColumn, setCustomColumn] = useState('');
  const [newTeam, setNewTeam] = useState('엑티비티');
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    fetchMappings();
    const savedCols = localStorage.getItem('dynamicColumns');
    if (savedCols) {
      setDynamicColumns(JSON.parse(savedCols));
    }
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

  const handlePasteSubmit = () => {
    const cols = pasteText.split(/\r?\n|\t|,/).map(s => s.trim()).filter(s => s.length > 0);
    const uniqueCols = Array.from(new Set([...dynamicColumns, ...cols]));
    setDynamicColumns(uniqueCols);
    localStorage.setItem('dynamicColumns', JSON.stringify(uniqueCols));
    setPasteText('');
  };

  const clearDynamicColumns = () => {
    setDynamicColumns([]);
    setSelectedColumns([]);
    localStorage.removeItem('dynamicColumns');
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
        <p className="text-gray-500 mt-2">엑셀의 영업장(원본) 리스트를 등록해두고, 마우스 클릭만으로 팀에 분류하세요.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">1. 영업장(원본) 리스트 등록하기</h2>
        <div className="flex items-end space-x-2 mb-6">
          <div className="flex-1">
            <textarea 
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="엑셀에서 열 이름(영업장)들을 쭉 복사해서 여기에 붙여넣으세요. (엔터 또는 쉼표로 구분)"
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 text-sm"
            />
          </div>
          <button 
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
            className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white px-4 py-2 h-20 rounded-lg font-medium transition-colors"
          >
            리스트<br/>등록
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-t border-gray-100 pt-6">2. 등록된 영업장 팀 분류하기</h2>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">등록된 영업장 리스트 선택</label>
            {dynamicColumns.length > 0 && (
              <button onClick={clearDynamicColumns} className="text-xs text-red-500 hover:text-red-700">리스트 전체 초기화</button>
            )}
          </div>
          
          {dynamicColumns.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500 text-sm">
              위의 입력칸에 엑셀 데이터를 붙여넣어 리스트를 먼저 등록해 주세요.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
              {dynamicColumns.map(col => {
                const isSelected = selectedColumns.includes(col);
                return (
                  <div 
                    key={col} 
                    onClick={() => toggleColumn(col)}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50 border-gray-200 text-gray-700'}`}
                  >
                    {isSelected ? <CheckSquare className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" /> : <Square className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0" />}
                    <span className="text-sm font-medium truncate">{col}</span>
                  </div>
                );
              })}
            </div>
          )}
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
