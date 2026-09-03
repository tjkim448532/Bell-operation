'use client';
import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { ChevronDown, ChevronRight, TrendingUp, Building2, LayoutGrid, MapPin } from 'lucide-react';


export default function TeamReport() {
  const { startDate, endDate } = useDateFilter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!startDate || !endDate) return;
      
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/team-report?startDate=${startDate}&endDate=${endDate}`);
        const result = await res.json();
        
        if (!ignore) {
          if (result.success) {
            setData(result.data || []);
          } else {
            setError(result.error || '데이터를 불러오는 중 오류가 발생했습니다.');
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || '서버 통신 오류');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    return () => { ignore = true; };
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val || 0));

  const validationMaster = (data as any)?.validationMaster || (data as any)?.ValidationMaster || null;
  const treeData = Array.isArray(data) ? data : (data as any)?.tree || [];

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

  if (treeData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">데이터가 없습니다</h3>
        <p className="text-slate-500">선택한 기간에 해당하는 부서별 실적 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Validation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            부서별 영업 실적
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {startDate} ~ {endDate} 기간의 본부/파트/업장별 실적입니다.
          </p>
        </div>
        
      </div>

      {/* Tree Rendering */}
      <div className="space-y-4">
        {treeData.map((team: any, i: number) => (
          <TeamNode key={i} team={team} formatCurrency={formatCurrency} />
        ))}
      </div>
    </div>
  );
}

function TeamNode({ team, formatCurrency }: { team: any, formatCurrency: (v: number) => string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
          <LayoutGrid className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-slate-800 text-base">{team.teamName || '본부명 없음'}</span>
          {team.isSubtotal && (
            <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">본부 소계</span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">본부 총 실적</p>
            <p className="font-bold text-slate-900 text-lg tabular-nums">
              {formatCurrency(team.subtotalActual)}
            </p>
          </div>
        </div>
      </button>

      {isOpen && team.parts && team.parts.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {team.parts.map((part: any, idx: number) => (
            <PartNode key={idx} part={part} formatCurrency={formatCurrency} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartNode({ part, formatCurrency }: { part: any, formatCurrency: (v: number) => string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="pl-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="font-semibold text-slate-700 text-sm">{part.partName || '파트명 없음'}</span>
          {part.isSubtotal && (
            <span className="text-2xs font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">파트 소계</span>
          )}
        </div>
        <div className="font-bold text-slate-800 text-sm tabular-nums">
          {formatCurrency(part.subtotalActual)}
        </div>
      </button>

      {isOpen && part.venues && part.venues.length > 0 && (
        <div className="pl-8 pb-3 pr-4">
          <table className="w-full text-sm">
            <tbody>
              {part.venues.map((vStr: string, vIdx: number) => {
                let venueName = '-';
                let actual = 0;
                let visitors = 0;
                
                if (typeof vStr === 'string' && vStr.startsWith('@{')) {
                  const matchName = vStr.match(/venueName=([^;]+)/);
                  const matchActual = vStr.match(/actual=([\d.]+)/);
                  const matchVisitors = vStr.match(/visitors=([\d.]+)/);
                  
                  if (matchName) venueName = matchName[1].trim();
                  if (matchActual) actual = parseFloat(matchActual[1]);
                  if (matchVisitors) visitors = parseFloat(matchVisitors[1]);
                } else if (typeof vStr === 'object') {
                  const vObj = vStr as any;
                  venueName = vObj.venueName || '-';
                  actual = vObj.actual || 0;
                  visitors = vObj.visitors || 0;
                }

                return (
                  <tr key={vIdx} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-2 px-3 text-slate-600 border-l-2 border-slate-200 group-hover:border-indigo-300 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {venueName}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                      <span className="text-xs mr-2 opacity-70">방문객</span>
                      {new Intl.NumberFormat('ko-KR').format(visitors)}명
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700 tabular-nums w-1/3">
                      {formatCurrency(actual)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
