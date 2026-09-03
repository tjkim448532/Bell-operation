'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserPlus, Briefcase } from 'lucide-react';


export default function OrganizationView({ isShared = false }: { isShared?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [validationMaster, setValidationMaster] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    const fetchHeadcount = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/organization');
        const json = await res.json();
        if (!ignore) {
          if (json.success) {
            setData(json.data?.data || json.data || null);
            setValidationMaster(json.data?.ValidationMaster || json.data?.validationMaster || null);
          } else {
            setError(json.error || '데이터를 불러오는 중 오류가 발생했습니다.');
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || '서버 통신 오류');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchHeadcount();
    return () => { ignore = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm">
        <span className="font-semibold">{error}</span>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0 || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">데이터가 없습니다</h3>
        <p className="text-slate-500">조직 및 인력 현황 데이터가 존재하지 않습니다.</p>
      </div>
    );
  }

  const list = Array.isArray(data) ? data : [data];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            조직 및 인력 현황
          </h2>
          <p className="text-sm text-slate-500 mt-1">고용 형태별 총 인원 집계 (Zero-Proxy)</p>
        </div>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left">조직명</th>
                <th className="py-3 px-4 text-right">총 인원</th>
                <th className="py-3 px-4 text-right">정규직</th>
                <th className="py-3 px-4 text-right">계약직</th>
                <th className="py-3 px-4 text-right">아르바이트</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-left text-slate-800 font-bold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500 opacity-70" />
                    {row.teamName || row.name || '알 수 없음'}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-600 font-bold tabular-nums">
                    {row.total || 0}명
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 font-semibold tabular-nums">
                    {row.regular || 0}명
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 font-medium tabular-nums">
                    {row.contract || 0}명
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                    {row.partTime || 0}명
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
