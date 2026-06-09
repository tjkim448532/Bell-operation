'use client';

import { useState, useEffect } from 'react';
import { Trash2, Save, Loader2, CheckSquare, Square, EyeOff, Eye } from 'lucide-react';

type FilterItem = {
  id: string;
  term: string;
};

// Common expense categories
const PREDEFINED_EXPENSES = [
  '복리후생비', '소모품비', '지급수수료', '세금과공과금', 
  '보험료', '감가상각비', '외주비', '여비교통비', 
  '차량유지비', '접대비', '통신비', '도서인쇄비'
];

export default function SettingsExpensePage() {
  const [exclusions, setExclusions] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [customTerm, setCustomTerm] = useState('');

  useEffect(() => {
    fetchExclusions();
  }, []);

  const fetchExclusions = async () => {
    try {
      const res = await fetch('/api/settings-expense');
      const data = await res.json();
      if (Array.isArray(data)) setExclusions(data);
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
        await fetch('/api/settings-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term }),
        });
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
      const res = await fetch(`/api/settings-expense?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExclusions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const excludedTermSet = new Set(exclusions.map(e => e.term));

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">비용 필터 설정</h1>
        <p className="text-gray-500 mt-2">대시보드와 상세 분석 화면에서 통계에 포함시키지 않고 숨길 비용 항목(계정과목)을 선택하세요.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <EyeOff className="w-5 h-5 mr-2 text-gray-500" /> 숨길 비용 추가
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">미리 정의된 계정과목 선택</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PREDEFINED_EXPENSES.map(term => {
              const isSelected = selectedTerms.includes(term);
              const isAlreadyExcluded = excludedTermSet.has(term);
              
              if (isAlreadyExcluded) return null; // Don't show if already excluded

              return (
                <div 
                  key={term} 
                  onClick={() => toggleTerm(term)}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                  {isSelected ? <CheckSquare className="w-5 h-5 mr-2 text-red-600" /> : <Square className="w-5 h-5 mr-2 text-gray-400" />}
                  <span className="text-sm font-medium">{term}</span>
                </div>
              );
            })}
          </div>
          {PREDEFINED_EXPENSES.every(t => excludedTermSet.has(t)) && (
            <p className="text-sm text-gray-400 italic">미리 정의된 모든 항목이 이미 숨김 처리되어 있습니다.</p>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4 pt-4 border-t border-gray-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">직접 입력 (목록에 없는 경우)</label>
            <input 
              type="text" 
              value={customTerm}
              onChange={(e) => setCustomTerm(e.target.value)}
              placeholder="예: 기타특별비용"
              className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <button 
            onClick={addExclusion}
            disabled={selectedTerms.length === 0 && !customTerm.trim()}
            className="w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            선택된 항목 숨기기
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">숨김 처리된 계정과목</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exclusions.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                  현재 숨김 처리된 비용이 없습니다. 모든 비용이 통계에 포함됩니다.
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
                      className="text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-end w-full"
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
