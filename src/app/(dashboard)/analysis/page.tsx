'use client';

import { useState, useEffect } from 'react';
import { Filter, Search, Loader2 } from 'lucide-react';

export default function AnalysisPage() {
  const [type, setType] = useState<'expense' | 'revenue'>('expense');
  const [team, setTeam] = useState('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analysis?type=${type}&team=${team}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, team]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">상세 분석</h1>
          <p className="text-gray-500 mt-2">매출 및 비용의 세부 내역을 확인하세요.</p>
        </div>
        
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <button 
            onClick={() => setType('expense')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${type === 'expense' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
          >
            비용 내역
          </button>
          <button 
            onClick={() => setType('revenue')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${type === 'revenue' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}
          >
            매출 내역
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <Filter className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium mr-3">팀별 필터:</span>
          <select 
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="bg-transparent border-none outline-none text-gray-800 font-semibold cursor-pointer"
          >
            <option value="all">전체 팀</option>
            <option value="목장">목장 (Farm)</option>
            <option value="미디어아트센터">미디어아트센터 (Media Art Center)</option>
            <option value="엑티비티">엑티비티 (Activity)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-gray-500 font-medium">데이터가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">날짜</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">팀명</th>
                  {type === 'expense' && (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">변환된 용어</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">원본 계정과목</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">적요</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">금액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(row.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {row.team}
                      </span>
                    </td>
                    {type === 'expense' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{row.mapped_term}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">{row.original_term}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate" title={row.description}>{row.description || '-'}</td>
                      </>
                    )}
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {type === 'revenue' ? '+' : '-'}{formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
