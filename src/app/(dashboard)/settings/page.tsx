'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, CheckSquare, Square, Upload } from 'lucide-react';
import * as xlsx from 'xlsx';

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
        
        let headerRowIdx = -1;
        // 매출/비용 엑셀 등에서 헤더 찾기 (대략 처음 10줄 이내)
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          if (jsonData[i].includes('영업일자') || jsonData[i].includes('작성일') || jsonData[i].includes('Sales Date')) {
            headerRowIdx = i;
            break;
          }
        }
        
        // 못찾으면 1번째 줄(인덱스0)이나 3번째 줄(인덱스2)을 헤더로 추정
        if (headerRowIdx === -1) {
          headerRowIdx = jsonData.length > 2 ? 2 : 0;
        }

        const headers = jsonData[headerRowIdx];
        let newDynamicCols: string[] = [];

        if (headers.includes('계정과목명') && headers.includes('프로젝트명')) {
          // 비용 엑셀 처리 로직: 프로젝트명 컬럼의 값들을 추출
          const projectIdx = headers.indexOf('프로젝트명');
          const projects = new Set<string>();
          for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            const projName = row[projectIdx];
            if (projName && typeof projName === 'string' && projName.trim().length > 0) {
              projects.add(projName.trim());
            }
          }
          newDynamicCols = Array.from(projects);
        } else {
          // 매출 엑셀 처리 로직: 헤더 이름을 추출
          newDynamicCols = headers
            .map((h: any) => h ? String(h).trim() : '')
            .filter((h: string) => h.length > 0 && h !== '영업일자' && h !== 'Date' && h !== '작성일');
        }

        const uniqueCols = Array.from(new Set([...dynamicColumns, ...newDynamicCols]));
        setDynamicColumns(uniqueCols);
        localStorage.setItem('dynamicColumns', JSON.stringify(uniqueCols));
        
        // 파일 입력 초기화
        e.target.value = '';
        alert(`성공적으로 ${newDynamicCols.length}개의 항목을 추출했습니다!`);
      } catch (err) {
        console.error(err);
        alert('엑셀 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsBinaryString(file);
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
        <p className="text-gray-500 mt-2">엑셀을 업로드하거나 텍스트를 붙여넣어 영업장 리스트를 추가하고, 마우스 클릭만으로 팀에 분류하세요.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">1. 영업장 리스트 불러오기</h2>
        
        <div className="mb-6 p-4 border border-blue-100 bg-blue-50 rounded-lg flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">원본 엑셀 파일 올리기 (추천)</h3>
            <p className="text-sm text-blue-700 mt-1">매출 엑셀 파일을 올리면 시스템이 자동으로 영업장(열 이름) 리스트만 쏙 뽑아줍니다.</p>
          </div>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            엑셀 업로드
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-4 text-sm text-gray-400">또는 직접 텍스트 붙여넣기</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="flex items-end space-x-2 mb-6">
          <div className="flex-1">
            <textarea 
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="엑셀에서 영업장 이름들을 직접 복사해서 여기에 붙여넣으셔도 됩니다."
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-16 text-sm"
            />
          </div>
          <button 
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
            className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white px-4 py-2 h-16 rounded-lg font-medium transition-colors"
          >
            붙여넣기<br/>등록
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-t border-gray-100 pt-6">2. 등록된 영업장 팀 분류하기</h2>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">추출된 영업장 리스트</label>
            {dynamicColumns.length > 0 && (
              <button onClick={clearDynamicColumns} className="text-xs text-red-500 hover:text-red-700">리스트 전체 초기화</button>
            )}
          </div>
          
          {dynamicColumns.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500 text-sm">
              위에서 엑셀을 업로드하거나 리스트를 붙여넣어 영업장 목록을 추가해주세요.
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
