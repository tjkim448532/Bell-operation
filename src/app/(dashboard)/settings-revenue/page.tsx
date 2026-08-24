'use client';

import { useState, useEffect } from 'react';
import { Trash2, Save, Loader2, CheckSquare, Square, EyeOff, Eye } from 'lucide-react';

type FilterItem = {
  id: string;
  term: string;
};

export default function SettingsRevenuePage() {
  const [exclusions, setExclusions] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [customTerm, setCustomTerm] = useState('');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);

  useEffect(() => {
    fetchExclusions();
  }, []);

  const fetchExclusions = async () => {
    try {
      const [exRes, termsRes] = await Promise.all([
        fetch('/api/settings-revenue'),
        fetch('/api/settings-revenue/terms')
      ]);
      const exData = await exRes.json();
      const termsData = await termsRes.json();
      if (Array.isArray(exData)) setExclusions(exData);
      if (Array.isArray(termsData)) setAvailableTerms(termsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTerm = (term: string) => {
    if (selectedTerms.includes(term)) {
      setSelectedTerms(selectedTerms.filter(t => t !== term));
    } else {
      setSelectedTerms([...selectedTerms, term]);
    }
  };

  const addExclusion = async () => {
    const termsToAdd = [...selectedTerms];
    if (customTerm.trim()) {
      termsToAdd.push(customTerm.trim());
    }

    if (termsToAdd.length === 0) return;

    try {
      for (const term of termsToAdd) {
        const res = await fetch('/api/settings-revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term }),
        });
        if (!res.ok) throw new Error(`Failed to add exclusion: ${term}`);
      }
      setSelectedTerms([]);
      setCustomTerm('');
      fetchExclusions();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExclusion = async (id: string) => {
    try {
      const res = await fetch(`/api/settings-revenue?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExclusions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const excludedTermSet = new Set(exclusions.map(e => e.term));

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-mint-500" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">매출 통계 제외 항목 설정 (소계, 합계 등)</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5">대시보드와 통계에서 포함시키지 않고 숨길 매출 항목(예: 액티비티 합계 등)을 선택하세요.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
          <EyeOff className="w-5 h-5 mr-2 text-slate-500" /> 숨길 매출 항목 추가
        </h2>
        
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2.5">매출 항목 선택</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {availableTerms.map(term => {
              const isSelected = selectedTerms.includes(term);
              const isAlreadyExcluded = excludedTermSet.has(term);
              
              if (isAlreadyExcluded) return null; // Don't show if already excluded

              return (
                <div 
                  key={term} 
                  onClick={() => toggleTerm(term)}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-rose-50 border-rose-200 text-rose-700' : 'hover:bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  {isSelected ? <CheckSquare className="w-4 h-4 mr-2 text-rose-600 shrink-0" /> : <Square className="w-4 h-4 mr-2 text-slate-400 shrink-0" />}
                  <span className="text-xs sm:text-sm font-medium truncate">{term}</span>
                </div>
              );
            })}
          </div>
          {availableTerms.every(t => excludedTermSet.has(t)) && availableTerms.length > 0 && (
            <p className="text-xs text-slate-400 italic mt-2">모든 항목이 이미 숨김 처리되어 있습니다.</p>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4 pt-4 border-t border-slate-100">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">직접 입력 (목록에 없는 경우)</label>
            <input 
              type="text" 
              value={customTerm}
              onChange={(e) => setCustomTerm(e.target.value)}
              placeholder="예: 액티비티 총합"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
          <button 
            onClick={addExclusion}
            disabled={selectedTerms.length === 0 && !customTerm.trim()}
            className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center cursor-pointer shadow-xs"
          >
            선택된 항목 숨기기
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">숨김 처리된 매출 항목</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exclusions.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                  현재 숨김 처리된 매출이 없습니다. 모든 항목이 통계에 포함됩니다.
                </td>
              </tr>
            ) : (
              exclusions.map((exclusion) => (
                <tr key={exclusion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 line-through text-gray-400">
                    {exclusion.term}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => deleteExclusion(exclusion.id)}
                      className="text-mint-600 hover:text-mint-800 transition-colors flex items-center justify-end w-full"
                    >
                      <Eye className="w-4 h-4 mr-1" /> 다시 포함하기
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
